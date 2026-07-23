// Central definition of which widget-design customizations are locked
// behind which plan. Used server-side (to actually enforce — not just to
// hide UI) in app/api/shop/design/route.ts, and mirrored in
// components/DesignForm.tsx to show locked controls with an upgrade hint
// before the user even tries to save.

export type PlanTier = "free" | "growth" | "pro";

export type DesignInput = {
  displayStyle: string;
  splitSummary: boolean;
  rangeColor: string;
  arrowColor: string;
  headingFontSize: number;
  headingBold: boolean;
  headingAlign: string;
  reviewTextSize: number;
  reviewTextAlign: string;
  letCustomerPickLanguage: boolean;
  enabledLanguages: string[];
  formTemplate: string;
  [key: string]: unknown;
};

const LANGUAGE_CAP_BY_PLAN: Record<PlanTier, number> = {
  free: 1,
  growth: 6,
  pro: 10,
};

const DEFAULTS = {
  displayStyle: "list",
  splitSummary: false,
  rangeColor: "#f5b400",
  arrowColor: "#111111",
  headingFontSize: 11,
  headingBold: false,
  headingAlign: "left",
  reviewTextSize: 14,
  reviewTextAlign: "left",
  letCustomerPickLanguage: false,
};

// Everything NOT listed here (colors like primary/star/background/text,
// font, border radius, widget/form width, form alignment, top spacing,
// border toggle, widget heading text itself) is available on every plan —
// only the items below are tiered.
export function clampDesignToPlan<T extends DesignInput>(
  plan: PlanTier,
  input: T
): { clamped: T; lockedFields: string[] } {
  const clamped: T = { ...input };
  const lockedFields: string[] = [];

  const isFree = plan === "free";
  const isCarouselAllowed = plan === "pro";

  if (isFree) {
    // Layout: Free only gets list/grid — no masonry, no split.
    if (clamped.displayStyle === "masonry" || clamped.displayStyle === "carousel") {
      clamped.displayStyle = DEFAULTS.displayStyle;
      lockedFields.push("displayStyle");
    }
    if (clamped.splitSummary) {
      clamped.splitSummary = DEFAULTS.splitSummary;
      lockedFields.push("splitSummary");
    }
    if (clamped.rangeColor !== DEFAULTS.rangeColor) {
      clamped.rangeColor = DEFAULTS.rangeColor;
      lockedFields.push("rangeColor");
    }
    if (clamped.arrowColor !== DEFAULTS.arrowColor) {
      clamped.arrowColor = DEFAULTS.arrowColor;
      lockedFields.push("arrowColor");
    }
    if (
      clamped.headingFontSize !== DEFAULTS.headingFontSize ||
      clamped.headingBold !== DEFAULTS.headingBold ||
      clamped.headingAlign !== DEFAULTS.headingAlign
    ) {
      clamped.headingFontSize = DEFAULTS.headingFontSize;
      clamped.headingBold = DEFAULTS.headingBold;
      clamped.headingAlign = DEFAULTS.headingAlign;
      lockedFields.push("heading customization");
    }
    if (clamped.reviewTextSize !== DEFAULTS.reviewTextSize || clamped.reviewTextAlign !== DEFAULTS.reviewTextAlign) {
      clamped.reviewTextSize = DEFAULTS.reviewTextSize;
      clamped.reviewTextAlign = DEFAULTS.reviewTextAlign;
      lockedFields.push("review text size/position");
    }
    if (clamped.letCustomerPickLanguage) {
      clamped.letCustomerPickLanguage = DEFAULTS.letCustomerPickLanguage;
      lockedFields.push("letCustomerPickLanguage");
    }
  }

  // Form template gating: Free=basic only, Growth=basic/card/minimal, Pro=all four
  const formTemplatesByPlan: Record<PlanTier, string[]> = {
    free: ["basic"],
    growth: ["basic", "card", "minimal"],
    pro: ["basic", "card", "minimal", "dark"],
  };
  if (!formTemplatesByPlan[plan].includes(clamped.formTemplate as string)) {
    clamped.formTemplate = "basic";
    lockedFields.push("formTemplate");
  }

  // Language count cap applies to every plan (not just Free) — Growth
  // can pick UP TO 6, Pro up to 10. "en" is always force-included so a
  // shop never ends up with zero languages (e.g. if a merchant somehow
  // unchecks everything).
  const cap = LANGUAGE_CAP_BY_PLAN[plan];
  const requestedLangs = Array.isArray(clamped.enabledLanguages) ? clamped.enabledLanguages : ["en"];
  const withEnglish = requestedLangs.includes("en") ? requestedLangs : ["en", ...requestedLangs];
  if (withEnglish.length > cap || withEnglish.length !== requestedLangs.length) {
    clamped.enabledLanguages = withEnglish.slice(0, cap);
    if (withEnglish.length > cap) lockedFields.push("enabledLanguages (too many for plan)");
  }

  // Carousel itself (regardless of Free/Growth) is Pro-only.
  if (!isCarouselAllowed && clamped.displayStyle === "carousel") {
    clamped.displayStyle = "grid";
    lockedFields.push("displayStyle (carousel)");
  }

  return { clamped, lockedFields };
}
