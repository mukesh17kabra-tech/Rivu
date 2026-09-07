import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  DISPLAY_STYLES,
  DISPLAY_STYLE_KEYS,
  displayStylesFor,
} from "@/lib/design-options";
import { clampDesignToPlan } from "@/lib/plan-gating";
import { FREE_PLAN_DESIGN_DEFAULTS } from "@/lib/design-defaults";

/**
 * Review-list designs, chosen in Widget Settings.
 *
 * The merchant asked for box and photo-gallery designs *in the app*, alongside
 * the theme blocks — so the product-page widget can be told to render its
 * review list that way, the same way the summary style is chosen.
 *
 * The picker used to keep its own copy of the four styles and its own copy of
 * the locking rules. That is how the Minimal summary style once shipped
 * invisible: the widget rendered it, no picker offered it, and the API
 * validator rejected it.
 */

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const widgets: [string, string][] = [
  ["public widget", "public/widget.js"],
  ["theme extension widget", "extensions/rivu-reviews/assets/rivu-widget.js"],
];

describe("the new designs exist and are tiered", () => {
  it("offers boxed, compact and a photo gallery", () => {
    for (const key of ["boxed", "compact", "photos"]) {
      expect(DISPLAY_STYLE_KEYS, key).toContain(key);
    }
  });

  it("gives Free two more designs than before", () => {
    // Free had list and grid only. More choice on Free is the point — it is
    // what a merchant comparing apps sees before they pay anything.
    const free = displayStylesFor("free");
    expect(free).toContain("boxed");
    expect(free).toContain("compact");
    expect(free).not.toContain("photos");
  });

  it("keeps the photo gallery on Pro", () => {
    expect(displayStylesFor("pro")).toContain("photos");
  });

  it("describes every design, since the picker shows the description", () => {
    for (const option of DISPLAY_STYLES) {
      expect(option.description, option.key).toBeTruthy();
      expect(option.label, option.key).toBeTruthy();
    }
  });
});

describe("the gate is enforced on save, not just hidden in the picker", () => {
  const base = {
    ...FREE_PLAN_DESIGN_DEFAULTS,
    enabledLanguages: ["en"],
  } as unknown as Parameters<typeof clampDesignToPlan>[1];

  it("resets a Free shop that asks for the photo gallery", () => {
    const { clamped, lockedFields } = clampDesignToPlan("free", {
      ...base,
      displayStyle: "photos",
    });
    expect(clamped.displayStyle).not.toBe("photos");
    expect(lockedFields).toContain("displayStyle");
  });

  it("lets a Free shop keep boxed and compact", () => {
    for (const style of ["boxed", "compact"]) {
      const { clamped } = clampDesignToPlan("free", { ...base, displayStyle: style });
      expect(clamped.displayStyle, style).toBe(style);
    }
  });

  it("lets Pro use every design", () => {
    for (const key of DISPLAY_STYLE_KEYS) {
      const { clamped } = clampDesignToPlan("pro", { ...base, displayStyle: key });
      expect(clamped.displayStyle, key).toBe(key);
    }
  });
});

describe("the picker is derived, not restated", () => {
  const form = read("components/DesignForm.tsx");

  it("maps over the shared list", () => {
    expect(form).toContain("DISPLAY_STYLES.map(");
    expect(form).toContain("displayStylesFor(plan)");
  });

  it("keeps no hand-written copy of the styles or their locks", () => {
    // The old version listed ["list", "grid", "carousel", "masonry"] with its
    // own lock conditions, so a new design reached the widget and never the
    // picker.
    expect(form).not.toContain('["list", "grid", "carousel", "masonry"]');
    expect(form).not.toContain('style === "masonry" || style === "carousel"');
  });

  it("offers the column control to the photo gallery too", () => {
    expect(form).toContain('settings.displayStyle === "photos"');
  });
});

describe.each(widgets)("%s renders the new designs", (_name, rel) => {
  const src = read(rel);

  it("has chrome for each of them", () => {
    const chrome = src.slice(src.indexOf("const styleChrome = {"));
    for (const key of ["boxed:", "compact:", "photos:"]) {
      expect(chrome.slice(0, 900), key).toContain(key);
    }
  });

  it("falls back to the standard card for an unknown style", () => {
    // A style saved before this change, or one removed later, must still
    // render rather than produce a card with no styling at all.
    expect(src).toContain("styleChrome[design.displayStyle] ||");
  });

  it("lays the photo gallery out in columns", () => {
    expect(src).toContain('design.displayStyle === "photos"');
    expect(src).toContain("column-count:${design.gridColumns}");
  });

  it("leads the gallery card with the photo at full width", () => {
    expect(src).toContain("rv-card-lead");
    expect(src).toContain("const isGallery =");
  });

  it("does not also show the small thumbnail in the gallery", () => {
    // The same photo twice in one card is the obvious mistake here.
    expect(src).toContain('${isGallery ? "" : (rev.videoUrl');
    expect(src).toContain('${isGallery ? "" : (!rev.videoUrl && rev.photoUrl');
  });

  it("keeps the lead photo clickable, so it opens the lightbox", () => {
    // rv-media-thumb is what the existing lightbox is wired to.
    const lead = src.slice(src.indexOf("rv-card-lead") - 200);
    expect(lead.slice(0, 400)).toContain("rv-media-thumb");
  });

  it("tags the card with its style, for merchant CSS", () => {
    expect(src).toContain("rv-card rv-card--${design.displayStyle}");
  });
});

describe("the API accepts the new designs", () => {
  it("validates against the shared key list", () => {
    // Hand-written validators are how choosing a style once saved as another.
    const route = read("app/api/shop/design/route.ts");
    expect(route).toContain("DISPLAY_STYLE_KEYS");
  });
});
