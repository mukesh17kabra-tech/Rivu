import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  DISPLAY_STYLES,
  DISPLAY_STYLE_KEYS,
  CARD_DESIGNS,
  CARD_DESIGN_KEYS,
  displayStylesFor,
  cardDesignsFor,
} from "@/lib/design-options";
import { clampDesignToPlan } from "@/lib/plan-gating";
import { FREE_PLAN_DESIGN_DEFAULTS } from "@/lib/design-defaults";

/**
 * Layout and card design are two separate settings.
 *
 * They were briefly one list, and that was wrong: "grid" answers where the
 * cards go, "boxed" answers what a card looks like, and a merchant reasonably
 * wants a boxed card in a grid. One list forced them to give up one to get the
 * other — four options instead of sixteen combinations.
 */

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const widgets: [string, string][] = [
  ["public widget", "public/widget.js"],
  ["theme extension widget", "extensions/rivu-reviews/assets/rivu-widget.js"],
];

describe("the two settings are separate", () => {
  it("layout holds only arrangements", () => {
    // Copied before sorting: .sort() mutates in place, and these are the real
    // exported arrays — sorting one here reordered the module for every later
    // test, which is exactly what broke the tier assertion below.
    expect([...DISPLAY_STYLE_KEYS].sort()).toEqual([
      "carousel", "grid", "list", "masonry",
    ]);
  });

  it("design holds only card looks", () => {
    expect([...CARD_DESIGN_KEYS].sort()).toEqual([
      "boxed", "compact", "gallery", "standard",
    ]);
  });

  it("shares no key between them, so neither can be mistaken for the other", () => {
    for (const key of CARD_DESIGN_KEYS) {
      expect(DISPLAY_STYLE_KEYS, key).not.toContain(key);
    }
  });

  it("describes and labels every option, since both pickers show them", () => {
    for (const option of [...DISPLAY_STYLES, ...CARD_DESIGNS]) {
      expect(option.label, option.key).toBeTruthy();
      expect(option.description, option.key).toBeTruthy();
    }
  });
});

describe("what each plan may choose", () => {
  it("gives Free three card designs", () => {
    // More choice on Free is the point: it is what a merchant comparing apps
    // sees before paying anything.
    const free = cardDesignsFor("free");
    expect(free).toEqual(["standard", "boxed", "compact"]);
  });

  it("keeps the photo gallery on Pro", () => {
    expect(cardDesignsFor("free")).not.toContain("gallery");
    expect(cardDesignsFor("pro")).toContain("gallery");
  });

  it("leaves the layout tiers as they were", () => {
    expect(displayStylesFor("free")).toEqual(["list", "grid"]);
    expect(displayStylesFor("pro")).toEqual(DISPLAY_STYLE_KEYS);
  });
});

describe("the gate is enforced on save, not just hidden in the picker", () => {
  const base = {
    ...FREE_PLAN_DESIGN_DEFAULTS,
    enabledLanguages: ["en"],
  } as unknown as Parameters<typeof clampDesignToPlan>[1];

  it("resets a Free shop that asks for the gallery design", () => {
    const { clamped, lockedFields } = clampDesignToPlan("free", {
      ...base,
      cardDesign: "gallery",
    });
    expect(clamped.cardDesign).toBe("standard");
    expect(lockedFields).toContain("cardDesign");
  });

  it("lets a Free shop keep boxed and compact", () => {
    for (const design of ["boxed", "compact"]) {
      const { clamped } = clampDesignToPlan("free", { ...base, cardDesign: design });
      expect(clamped.cardDesign, design).toBe(design);
    }
  });

  it("does not let a layout choice reset the design, or the reverse", () => {
    // The two settings are independent; clamping one must not touch the other.
    const { clamped } = clampDesignToPlan("free", {
      ...base,
      displayStyle: "carousel",
      cardDesign: "boxed",
    });
    expect(clamped.displayStyle).not.toBe("carousel");
    expect(clamped.cardDesign).toBe("boxed");
  });

  it("lets Pro use every combination", () => {
    for (const layout of DISPLAY_STYLE_KEYS) {
      for (const design of CARD_DESIGN_KEYS) {
        const { clamped } = clampDesignToPlan("pro", {
          ...base,
          displayStyle: layout,
          cardDesign: design,
        });
        expect(clamped.displayStyle, `${layout}/${design}`).toBe(layout);
        expect(clamped.cardDesign, `${layout}/${design}`).toBe(design);
      }
    }
  });
});

describe("both pickers are derived, not restated", () => {
  const form = read("components/DesignForm.tsx");

  it("maps over the shared lists", () => {
    expect(form).toContain("DISPLAY_STYLES.map(");
    expect(form).toContain("CARD_DESIGNS.map(");
    expect(form).toContain("displayStylesFor(plan)");
    expect(form).toContain("cardDesignsFor(plan)");
  });

  it("keeps no hand-written copy of the options or their locks", () => {
    expect(form).not.toContain('["list", "grid", "carousel", "masonry"]');
    expect(form).not.toContain('style === "masonry" || style === "carousel"');
  });

  it("offers the column control to the gallery design as well as grids", () => {
    expect(form).toContain('settings.cardDesign === "gallery"');
  });
});

describe("the API accepts and validates both", () => {
  const route = read("app/api/shop/design/route.ts");

  it("validates each against its own shared key list", () => {
    expect(route).toContain("DISPLAY_STYLE_KEYS");
    expect(route).toContain("CARD_DESIGN_KEYS");
  });

  it("defaults the design to standard", () => {
    expect(route).toContain('oneOf("cardDesign", CARD_DESIGN_KEYS, "standard")');
  });
});

describe.each(widgets)("%s renders by design, arranges by layout", (_name, rel) => {
  const src = read(rel);

  it("keys the card chrome off the design", () => {
    expect(src).toContain("styleChrome[design.cardDesign]");
    expect(src).not.toContain("styleChrome[design.displayStyle]");
  });

  it("has chrome for each design", () => {
    const chrome = src.slice(src.indexOf("const styleChrome = {"));
    for (const key of ["boxed:", "compact:", "gallery:"]) {
      expect(chrome.slice(0, 900), key).toContain(key);
    }
  });

  it("falls back to the standard card for an unknown design", () => {
    // A value saved before this change must still render rather than produce
    // a card with no styling at all.
    expect(src).toContain("styleChrome[design.cardDesign] ||");
  });

  it("only overrides the arrangement when the layout is left at its default", () => {
    // Choosing masonry and the gallery design together must give masonry, not
    // have the design quietly reimpose its own columns.
    expect(src).toContain('design.cardDesign === "gallery" && design.displayStyle === "list"');
    expect(src).toContain('design.cardDesign === "compact" && design.displayStyle === "list"');
  });

  it("leads the gallery card with the photo", () => {
    expect(src).toContain('const isGallery = design.cardDesign === "gallery"');
    expect(src).toContain("rv-card-lead");
  });

  it("tags the card with its design, for merchant CSS", () => {
    expect(src).toContain("rv-card rv-card--${design.cardDesign}");
  });

  it("defaults the design in the payload merge", () => {
    // Every key the API sends must appear in D, or the field is discarded.
    expect(src).toContain('cardDesign:"standard"');
  });
});
