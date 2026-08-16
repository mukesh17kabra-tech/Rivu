import { describe, expect, it } from "vitest";

import { clampDesignToPlan, type DesignInput } from "@/lib/plan-gating";
import { FREE_PLAN_DESIGN_DEFAULTS } from "@/lib/design-defaults";
import { SUMMARY_LAYOUTS, summaryLayoutsFor } from "@/lib/design-options";

/**
 * clampDesignToPlan runs on every design save, so a mistake here silently
 * rewrites what the merchant chose. Two real bugs came from this file:
 * a Free shop's heading alignment being reset on every save because the
 * defaults had drifted, and Minimal being flattened to Modern.
 */

// Typed as DesignInput so the clamped result keeps its shape — casting to
// `never` made the assertions below compile against nothing.
const base = { ...FREE_PLAN_DESIGN_DEFAULTS } as unknown as DesignInput;

describe("summary layouts clamp to the plan", () => {
  it.each(SUMMARY_LAYOUTS.map((l) => [l.key, l.minPlan] as const))(
    "%s is kept on its own tier",
    (key, minPlan) => {
      const { clamped, lockedFields } = clampDesignToPlan(minPlan, {
        ...base,
        summaryLayout: key,
      });
      expect(clamped.summaryLayout).toBe(key);
      expect(lockedFields).not.toContain("summaryLayout");
    }
  );

  it.each(SUMMARY_LAYOUTS.filter((l) => l.minPlan !== "free").map((l) => l.key))(
    "%s is rejected on free and reported as locked",
    (key) => {
      const { clamped, lockedFields } = clampDesignToPlan("free", {
        ...base,
        summaryLayout: key,
      });
      expect(summaryLayoutsFor("free")).toContain(clamped.summaryLayout);
      // Silent rewriting is what made this hard to diagnose; the caller must
      // be told so the UI can say why the choice didn't stick.
      expect(lockedFields).toContain("summaryLayout");
    }
  );

  it("an unknown layout falls back to a valid one", () => {
    const { clamped } = clampDesignToPlan("pro", {
      ...base,
      summaryLayout: "not-a-real-layout",
    });
    expect(summaryLayoutsFor("pro")).toContain(clamped.summaryLayout);
  });
});

describe("the free defaults survive their own clamp", () => {
  // If clamping the defaults changes them, then saving on Free can never
  // reach a stable state — which is exactly how the heading alignment kept
  // reverting.
  it("clamping the free defaults is a no-op", () => {
    const { clamped, lockedFields } = clampDesignToPlan("free", {
      ...base,
    });

    expect(lockedFields).toEqual([]);
    for (const key of Object.keys(FREE_PLAN_DESIGN_DEFAULTS)) {
      expect(clamped[key as keyof typeof clamped]).toEqual(
        FREE_PLAN_DESIGN_DEFAULTS[key as keyof typeof FREE_PLAN_DESIGN_DEFAULTS]
      );
    }
  });

  it("keeps the heading centred on free rather than resetting it to left", () => {
    const { clamped } = clampDesignToPlan("free", {
      ...base,
      headingAlign: "center",
    });
    expect(clamped.headingAlign).toBe("center");
  });
});

describe("paid tiers are not clamped away", () => {
  it("pro keeps a fully customised heading", () => {
    const { clamped, lockedFields } = clampDesignToPlan("pro", {
      ...base,
      headingAlign: "right",
      headingBold: false,
      headingFontSize: 22,
    });

    expect(clamped.headingAlign).toBe("right");
    expect(clamped.headingFontSize).toBe(22);
    expect(lockedFields).not.toContain("heading customization");
  });

  it("free has heading customisation locked", () => {
    const { lockedFields } = clampDesignToPlan("free", {
      ...base,
      headingFontSize: 22,
    });
    expect(lockedFields).toContain("heading customization");
  });
});
