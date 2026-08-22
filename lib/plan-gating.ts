import { FREE_PLAN_DESIGN_DEFAULTS } from "./design-defaults";
import { formTemplatesFor, summaryLayoutsFor } from "./design-options";

// Central definition of which widget-design customizations are locked
// behind which plan. Used server-side (to actually enforce — not just to
// hide UI) in app/api/shop/design/route.ts, and mirrored in
// components/DesignForm.tsx to show locked controls with an upgrade hint
// before the user even tries to save.

export type PlanTier = "free" | "pro";

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
  summaryLayout: string;
  [key: string]: unknown;
};

const LANGUAGE_CAP_BY_PLAN: Record<PlanTier, number> = {
  free: 1,
  pro: 10,
};

// Derived from the single shared source rather than restated here. These
// were two hand-maintained copies and they had drifted: this file said
// headingAlign "left" while the Free defaults said "center", so
// clampDesignToPlan silently undid the centring on every save by a Free
// shop — the setting appeared to save and then reverted.
const DEFAULTS = {
  displayStyle: FREE_PLAN_DESIGN_DEFAULTS.displayStyle,
  splitSummary: FREE_PLAN_DESIGN_DEFAULTS.splitSummary,
  rangeColor: FREE_PLAN_DESIGN_DEFAULTS.rangeColor,
  arrowColor: FREE_PLAN_DESIGN_DEFAULTS.arrowColor,
  headingFontSize: FREE_PLAN_DESIGN_DEFAULTS.headingFontSize,
  headingBold: FREE_PLAN_DESIGN_DEFAULTS.headingBold,
  headingAlign: FREE_PLAN_DESIGN_DEFAULTS.headingAlign,
  reviewTextSize: FREE_PLAN_DESIGN_DEFAULTS.reviewTextSize,
  reviewTextAlign: FREE_PLAN_DESIGN_DEFAULTS.reviewTextAlign,
  letCustomerPickLanguage: FREE_PLAN_DESIGN_DEFAULTS.letCustomerPickLanguage,
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

  // Summary layout gating: Free=modern only, Pro=all
  if (!summaryLayoutsFor(plan).includes(clamped.summaryLayout as string)) {
    clamped.summaryLayout = FREE_PLAN_DESIGN_DEFAULTS.summaryLayout;
    lockedFields.push("summaryLayout");
  }

  // Form template gating: Free=basic only, Pro=all four
  if (!formTemplatesFor(plan).includes(clamped.formTemplate as string)) {
    clamped.formTemplate = "basic";
    lockedFields.push("formTemplate");
  }

  // Language count cap applies to every plan (not just Free) — Free gets
  // English only, Pro up to 10. "en" is always force-included so a
  // shop never ends up with zero languages (e.g. if a merchant somehow
  // unchecks everything).
  const cap = LANGUAGE_CAP_BY_PLAN[plan];
  const requestedLangs = Array.isArray(clamped.enabledLanguages) ? clamped.enabledLanguages : ["en"];
  const withEnglish = requestedLangs.includes("en") ? requestedLangs : ["en", ...requestedLangs];
  if (withEnglish.length > cap || withEnglish.length !== requestedLangs.length) {
    clamped.enabledLanguages = withEnglish.slice(0, cap);
    if (withEnglish.length > cap) lockedFields.push("enabledLanguages (too many for plan)");
  }

  // Carousel is Pro-only.
  if (!isCarouselAllowed && clamped.displayStyle === "carousel") {
    clamped.displayStyle = "grid";
    lockedFields.push("displayStyle (carousel)");
  }

  return { clamped, lockedFields };
}
