import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

import {
  SUMMARY_LAYOUTS,
  SUMMARY_LAYOUT_KEYS,
  FORM_TEMPLATE_KEYS,
  DISPLAY_STYLE_KEYS,
  summaryLayoutsFor,
  formTemplatesFor,
} from "@/lib/design-options";
import { FREE_PLAN_DESIGN_DEFAULTS } from "@/lib/design-defaults";

/**
 * These are the regression tests for the bug that shipped: Minimal was added
 * to the picker, the plan gating and the widget, but not to the API's
 * validator, so choosing it silently saved as Modern. Nothing failed, nothing
 * warned — the merchant's choice just vanished.
 *
 * Rather than assert the lists match in four places, the code now derives
 * them from lib/design-options.ts. These tests hold that arrangement in
 * place: if anyone reintroduces a hand-written copy, they fail.
 */

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

describe("every layout is wired through the whole stack", () => {
  const designRoute = read("app/api/shop/design/route.ts");
  const widget = read("public/widget.js");
  const extensionWidget = read("extensions/rivu-reviews/assets/rivu-widget.js");

  it("the API validator derives its list instead of restating it", () => {
    // A literal array here is what caused the original bug.
    expect(designRoute).toContain('oneOf("summaryLayout", SUMMARY_LAYOUT_KEYS');
    expect(designRoute).toContain('oneOf("formTemplate", FORM_TEMPLATE_KEYS');
    expect(designRoute).toContain('oneOf("displayStyle", DISPLAY_STYLE_KEYS');
  });

  it.each(SUMMARY_LAYOUTS.map((l) => l.key))(
    "widget can actually render %s",
    (key) => {
      // "modern" is the fallback branch, so it has no explicit comparison.
      if (key === "modern") {
        expect(widget).toContain(": summaryModern;");
        return;
      }
      expect(widget).toContain(`sl === '${key}'`);
      expect(extensionWidget).toContain(`sl === '${key}'`);
    }
  );

  it("both widget copies know the same layouts", () => {
    for (const { key } of SUMMARY_LAYOUTS) {
      expect(widget.includes(`sl === '${key}'`)).toBe(
        extensionWidget.includes(`sl === '${key}'`)
      );
    }
  });

  it("keys are unique", () => {
    expect(new Set(SUMMARY_LAYOUT_KEYS).size).toBe(SUMMARY_LAYOUT_KEYS.length);
    expect(new Set(FORM_TEMPLATE_KEYS).size).toBe(FORM_TEMPLATE_KEYS.length);
    expect(new Set(DISPLAY_STYLE_KEYS).size).toBe(DISPLAY_STYLE_KEYS.length);
  });
});

describe("plan tiers expand downward", () => {
  it("free is a subset of pro", () => {
    const free = summaryLayoutsFor("free");
    const pro = summaryLayoutsFor("pro");

    expect(free.every((k) => pro.includes(k))).toBe(true);
    expect(pro).toEqual(SUMMARY_LAYOUT_KEYS);
  });

  it("free gets more than one summary style", () => {
    // A single option makes the free tier feel broken rather than limited.
    expect(summaryLayoutsFor("free").length).toBeGreaterThan(1);
  });

  it("every plan has at least one form template", () => {
    for (const plan of ["free", "pro"] as const) {
      expect(formTemplatesFor(plan).length).toBeGreaterThan(0);
    }
  });
});

describe("the free defaults are themselves valid on the free plan", () => {
  // The defaults are written straight into the database by resetToFreePlan,
  // bypassing validation — so if they ever drift out of the allowed set, a
  // downgraded shop lands in a state it cannot save from.
  it("default summary layout is allowed on free", () => {
    expect(summaryLayoutsFor("free")).toContain(
      FREE_PLAN_DESIGN_DEFAULTS.summaryLayout
    );
  });

  it("default form template is allowed on free", () => {
    expect(formTemplatesFor("free")).toContain(
      FREE_PLAN_DESIGN_DEFAULTS.formTemplate
    );
  });

  it("default display style is allowed on free", () => {
    expect(DISPLAY_STYLE_KEYS).toContain(FREE_PLAN_DESIGN_DEFAULTS.displayStyle);
  });
});

/**
 * The picker must read its gating from this module rather than restating it.
 *
 * The same list used to be written out by hand in four places, and the API
 * validator was the one that got missed — so choosing a locked layout saved
 * silently as another, with no error anywhere. A hand-kept copy in the form is
 * how that returns.
 */
describe("DesignForm derives its locking from here", () => {
  const form = readFileSync(
    path.resolve(__dirname, "../components/DesignForm.tsx"),
    "utf8"
  );

  it("asks this module which options the plan allows", () => {
    expect(form).toContain("summaryLayoutsFor(plan)");
    expect(form).toContain("formTemplatesFor(plan)");
  });

  it("keeps no hand-written copy of the tier lists", () => {
    expect(form).not.toMatch(/const\s+\w*[Ll]ayouts\s*:\s*string\[\]\s*=/);
    expect(form).not.toMatch(/growth/i);
  });
});
