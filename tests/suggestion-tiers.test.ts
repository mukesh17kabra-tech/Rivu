import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

import {
  aiSuggestionsAllowed,
  AI_SUGGESTIONS_MIN_PLAN,
  PLAN_ORDER,
} from "@/lib/design-options";
import { getSuggestions } from "@/lib/review-suggestions";

/**
 * AI suggestions are the one feature that costs real money per shop. If the
 * gate leaks, a Free store's shoppers spend the app's model quota — a bill
 * with no revenue behind it, and one that scales with how popular the free
 * tier is.
 *
 * Free is not left empty: it gets the hand-written templates, so the feature
 * degrades rather than disappearing.
 */

const repoRoot = path.resolve(__dirname, "..");
const pool = readFileSync(path.join(repoRoot, "lib/suggestion-pool.ts"), "utf8");

describe("who gets AI suggestions", () => {
  it("free does not", () => {
    expect(aiSuggestionsAllowed("free")).toBe(false);
  });

  it.each(["growth", "pro"])("%s does", (plan) => {
    expect(aiSuggestionsAllowed(plan)).toBe(true);
  });

  it("an unknown plan is treated as unpaid", () => {
    // Fail closed: a plan string we don't recognise must not unlock spend.
    for (const plan of ["", "trial", "enterprise", "FREE", "Growth"]) {
      expect(aiSuggestionsAllowed(plan)).toBe(false);
    }
  });

  it("the advertised minimum plan matches the gate", () => {
    // The upgrade prompt names this tier; if they disagree the prompt lies.
    expect(aiSuggestionsAllowed(AI_SUGGESTIONS_MIN_PLAN)).toBe(true);

    const belowMin = PLAN_ORDER.slice(0, PLAN_ORDER.indexOf(AI_SUGGESTIONS_MIN_PLAN));
    for (const plan of belowMin) {
      expect(aiSuggestionsAllowed(plan)).toBe(false);
    }
  });
});

describe("the gate is enforced where the money is spent", () => {
  it("serveSuggestions returns templates before touching the pool", () => {
    // The check has to come before the database query, not after.
    const serveBody = pool.slice(pool.indexOf("export async function serveSuggestions"));
    const gateAt = serveBody.indexOf("aiSuggestionsAllowed(plan)");
    const queryAt = serveBody.indexOf("db.reviewSuggestion.findMany");
    expect(gateAt).toBeGreaterThan(-1);
    expect(gateAt).toBeLessThan(queryAt);
  });

  it("refillPool refuses before calling a model", () => {
    const refillBody = pool.slice(
      pool.indexOf("export async function refillPool"),
      pool.indexOf("export async function serveSuggestions")
    );
    const gateAt = refillBody.indexOf("aiSuggestionsAllowed(plan)");
    const generateAt = refillBody.indexOf("generateSuggestions");
    expect(gateAt).toBeGreaterThan(-1);
    expect(gateAt).toBeLessThan(generateAt);
  });

  it("both entry points require a plan argument", () => {
    // Making it required means a new caller cannot omit it and default to
    // spending; TypeScript refuses to compile.
    expect(pool).toContain("export async function serveSuggestions(params: {\n  shopId: string;\n  plan: string;");
    expect(pool).toContain("export async function refillPool(params: {\n  shopId: string;\n  plan: string;");
  });
});

describe("free shops still get usable suggestions", () => {
  it.each([1, 2, 3, 4, 5])("rating %i returns templates", (rating) => {
    const suggestions = getSuggestions(rating, "Snowboard", 6, "en");
    expect(suggestions.length).toBeGreaterThan(0);
    for (const text of suggestions) {
      expect(text.length).toBeGreaterThan(8);
      // The product name is substituted, so no placeholder leaks through.
      expect(text).not.toContain("{product}");
    }
  });

  it("mentions the product being reviewed", () => {
    const suggestions = getSuggestions(5, "Hydrogen Snowboard", 6, "en");
    expect(suggestions.some((s) => s.includes("Hydrogen Snowboard"))).toBe(true);
  });
});

describe("the merchant is told what upgrading buys", () => {
  const form = readFileSync(path.join(repoRoot, "components/DesignForm.tsx"), "utf8");

  it("shows an upgrade prompt on free rather than hiding the feature", () => {
    expect(form).toContain("aiSuggestionsAllowed(plan)");
    expect(form).toContain("Upgrade to Growth");
  });

  it("links to the plans page", () => {
    expect(form).toContain("/dashboard/plans?shop=");
  });
});
