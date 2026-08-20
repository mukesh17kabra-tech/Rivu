/**
 * The single definition of every widget-design choice and which plan it
 * belongs to.
 *
 * This exists because the same list used to be written out by hand in four
 * places — the picker in DesignForm, the plan gating, the API's validator,
 * and the widget's renderer. Adding the Minimal, Stacked and Split styles
 * updated three of them; the API validator was missed, so choosing Minimal
 * silently saved as Modern with no error anywhere. Deriving all of it from
 * here makes that class of bug impossible rather than merely unlikely.
 *
 * Imports nothing, so it is safe to use from client components as well as
 * from server routes.
 */

export type PlanTier = "free" | "growth" | "pro";

/** Plans ordered cheapest first — used to expand "available from this tier". */
export const PLAN_ORDER: PlanTier[] = ["free", "growth", "pro"];

export type DesignOption<K extends string> = {
  key: K;
  label: string;
  /** Lowest plan that may use this option. */
  minPlan: PlanTier;
  description: string;
};

export const SUMMARY_LAYOUTS = [
  { key: "modern", label: "Modern Card", minPlan: "free", description: "Rating box, bars, button" },
  { key: "minimal", label: "Minimal", minPlan: "free", description: "Just the score — no bars" },
  { key: "compact", label: "Compact", minPlan: "growth", description: "Circle rating, clean bars" },
  { key: "sidebar", label: "Left Sidebar", minPlan: "growth", description: "Sticky left, reviews right" },
  { key: "stacked", label: "Stacked", minPlan: "growth", description: "Score above full-width bars" },
  { key: "horizontal", label: "Horizontal Bar", minPlan: "pro", description: "All in one slim row" },
  { key: "iconpct", label: "Icon + Percentage", minPlan: "pro", description: "People icons per star with %" },
  { key: "split", label: "Split Panel", minPlan: "pro", description: "Colour-filled score beside bars" },
] as const satisfies readonly DesignOption<string>[];

export const FORM_TEMPLATES = [
  { key: "basic", label: "Basic", minPlan: "free", description: "Clean, plain form" },
  { key: "card", label: "Card", minPlan: "growth", description: "Elevated card style" },
  { key: "minimal", label: "Minimal", minPlan: "growth", description: "Stripped back" },
  { key: "dark", label: "Dark", minPlan: "pro", description: "Dark modal" },
] as const satisfies readonly DesignOption<string>[];

export const DISPLAY_STYLES = [
  { key: "list", label: "List", minPlan: "free", description: "One review per row" },
  { key: "grid", label: "Grid", minPlan: "free", description: "Cards in a grid" },
  { key: "masonry", label: "Masonry", minPlan: "growth", description: "Staggered columns" },
  { key: "carousel", label: "Carousel", minPlan: "pro", description: "Swipeable row" },
] as const satisfies readonly DesignOption<string>[];

/** Free-form enums with no plan tiering. */
export const ALIGNMENTS = ["left", "center", "right"] as const;
export const BORDER_STYLES = ["solid", "dashed", "dotted", "double"] as const;

export type SummaryLayout = (typeof SUMMARY_LAYOUTS)[number]["key"];
export type FormTemplate = (typeof FORM_TEMPLATES)[number]["key"];
export type DisplayStyle = (typeof DISPLAY_STYLES)[number]["key"];
export type Alignment = (typeof ALIGNMENTS)[number];
export type BorderStyle = (typeof BORDER_STYLES)[number];

function keysOf<T extends readonly DesignOption<string>[]>(options: T): string[] {
  return options.map((o) => o.key);
}

/** Every valid key, whatever the plan — this is what request validation allows. */
export const SUMMARY_LAYOUT_KEYS = keysOf(SUMMARY_LAYOUTS);
export const FORM_TEMPLATE_KEYS = keysOf(FORM_TEMPLATES);
export const DISPLAY_STYLE_KEYS = keysOf(DISPLAY_STYLES);

/** Keys a given plan is allowed to use, including everything below it. */
export function allowedFor(
  options: readonly DesignOption<string>[],
  plan: PlanTier
): string[] {
  const rank = PLAN_ORDER.indexOf(plan);
  return options
    .filter((o) => PLAN_ORDER.indexOf(o.minPlan) <= rank)
    .map((o) => o.key);
}

export function summaryLayoutsFor(plan: PlanTier): string[] {
  return allowedFor(SUMMARY_LAYOUTS, plan);
}
export function formTemplatesFor(plan: PlanTier): string[] {
  return allowedFor(FORM_TEMPLATES, plan);
}
export function displayStylesFor(plan: PlanTier): string[] {
  return allowedFor(DISPLAY_STYLES, plan);
}

/** Human-readable tier badge for the picker, e.g. "Growth+" or "Pro only". */
export function planBadge(minPlan: PlanTier): string {
  if (minPlan === "free") return "";
  return minPlan === "growth" ? "Growth+" : "Pro only";
}

/**
 * AI-written review suggestions are a paid feature.
 *
 * Free shops still get suggestions — the hand-written templates in
 * lib/review-suggestions.ts — so the feature never simply disappears. What
 * Growth and Pro buy is generation: a large, per-store pool where each line is
 * offered to one shopper only.
 *
 * Gated because generation costs real money per shop. Without this a Free
 * store's shoppers would spend the app's model quota.
 */
export function aiSuggestionsAllowed(plan: string): boolean {
  return plan === "growth" || plan === "pro";
}

/** Lowest plan that unlocks AI suggestions — drives the upgrade prompt. */
export const AI_SUGGESTIONS_MIN_PLAN: PlanTier = "growth";

/**
 * The custom widget template is a Pro feature.
 *
 * Checked on save *and* when serving the widget, so a merchant who downgrades
 * stops rendering their custom layout immediately rather than keeping a paid
 * feature until they next touch the settings.
 */
export function customTemplateAllowed(plan: string): boolean {
  return plan === "pro";
}

/** Named in the upgrade prompt — kept beside the gate so they can't disagree. */
export const CUSTOM_TEMPLATE_MIN_PLAN: PlanTier = "pro";
