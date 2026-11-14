/**
 * Ready-made looks for the review widget.
 *
 * The design page offers about sixty individual controls. That is the right
 * number for a merchant who knows exactly which shade of grey the sort button
 * border should be, and far too many for one who just wants the widget to
 * stop looking out of place on their store. A theme answers the second
 * merchant: one click sets the twenty-odd values below at once, and the
 * Advanced view is still there for anyone who wants to go further.
 *
 * Every value here is one a Free shop is allowed to have, so applying a theme
 * never silently reverts on save. Deliberately absent: fontFamily (reset to
 * the store theme's face on Free), gradients, and the Pro-only summary
 * layouts, card designs and form templates — a theme must not be the thing
 * that quietly puts a Free shop into a locked state.
 *
 * Imports nothing, so client components can use it.
 */

export type DesignTheme = {
  key: string;
  label: string;
  description: string;
  /** The two colours shown in the picker's swatch. */
  swatch: [string, string];
  values: Record<string, string | number | boolean>;
};

export const DESIGN_THEMES: readonly DesignTheme[] = [
  {
    key: "clean",
    label: "Clean",
    description: "White, black text, amber stars. Suits most stores.",
    swatch: ["#ffffff", "#f5b400"],
    values: {
      primaryColor: "#111111",
      starColor: "#f5b400",
      rangeColor: "#f5b400",
      backgroundColor: "#ffffff",
      textColor: "#333333",
      arrowColor: "#111111",
      borderRadius: 8,
      showBorder: false,
      borderColor: "#e0e0e0",
      summaryLayout: "modern",
      cardDesign: "standard",
      summaryBgColor: "#f8f8f8",
      summaryTextColor: "#333333",
      reviewTitleColor: "#111111",
      reviewBodyColor: "#333333",
      reviewMetaColor: "#999999",
      filterTextColor: "#999999",
      sortBgColor: "#ffffff",
      sortTextColor: "#333333",
      sortBorderColor: "#dddddd",
      formBgColor: "#ffffff",
      formTextColor: "#1a1a2e",
    },
  },
  {
    key: "minimal",
    label: "Minimal",
    description: "No boxes, no bars, square corners. Gets out of the way.",
    swatch: ["#ffffff", "#111111"],
    values: {
      primaryColor: "#111111",
      starColor: "#111111",
      rangeColor: "#111111",
      backgroundColor: "#ffffff",
      textColor: "#111111",
      arrowColor: "#111111",
      borderRadius: 0,
      showBorder: false,
      borderColor: "#eeeeee",
      summaryLayout: "minimal",
      cardDesign: "compact",
      summaryBgColor: "#ffffff",
      summaryTextColor: "#111111",
      reviewTitleColor: "#111111",
      reviewBodyColor: "#444444",
      reviewMetaColor: "#aaaaaa",
      filterTextColor: "#aaaaaa",
      sortBgColor: "#ffffff",
      sortTextColor: "#111111",
      sortBorderColor: "#eeeeee",
      formBgColor: "#ffffff",
      formTextColor: "#111111",
    },
  },
  {
    key: "soft",
    label: "Soft",
    description: "Rounded cards on a light grey panel. Friendly.",
    swatch: ["#f4f4f6", "#6366f1"],
    values: {
      primaryColor: "#4f46e5",
      starColor: "#f5b400",
      rangeColor: "#6366f1",
      backgroundColor: "#ffffff",
      textColor: "#1f2937",
      arrowColor: "#4f46e5",
      borderRadius: 16,
      showBorder: true,
      borderColor: "#e9e9ef",
      summaryLayout: "modern",
      cardDesign: "boxed",
      summaryBgColor: "#f4f4f6",
      summaryTextColor: "#1f2937",
      reviewTitleColor: "#111827",
      reviewBodyColor: "#374151",
      reviewMetaColor: "#9ca3af",
      filterTextColor: "#9ca3af",
      sortBgColor: "#ffffff",
      sortTextColor: "#1f2937",
      sortBorderColor: "#e9e9ef",
      formBgColor: "#ffffff",
      formTextColor: "#1f2937",
    },
  },
  {
    key: "bold",
    label: "Bold",
    description: "Heavy contrast, tight corners. Stands out on the page.",
    swatch: ["#111111", "#ffd400"],
    values: {
      primaryColor: "#000000",
      starColor: "#ffd400",
      rangeColor: "#000000",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      arrowColor: "#000000",
      borderRadius: 2,
      showBorder: true,
      borderColor: "#000000",
      summaryLayout: "modern",
      cardDesign: "boxed",
      summaryBgColor: "#111111",
      summaryTextColor: "#ffffff",
      reviewTitleColor: "#000000",
      reviewBodyColor: "#222222",
      reviewMetaColor: "#777777",
      filterTextColor: "#777777",
      sortBgColor: "#ffffff",
      sortTextColor: "#000000",
      sortBorderColor: "#000000",
      formBgColor: "#ffffff",
      formTextColor: "#000000",
    },
  },
  {
    key: "warm",
    label: "Warm",
    description: "Cream and brown. Suits clothing, beauty and food stores.",
    swatch: ["#faf6f0", "#8b5e34"],
    values: {
      primaryColor: "#8b5e34",
      starColor: "#c9872f",
      rangeColor: "#c9872f",
      backgroundColor: "#fffdfa",
      textColor: "#4a3b2c",
      arrowColor: "#8b5e34",
      borderRadius: 12,
      showBorder: true,
      borderColor: "#ece2d4",
      summaryLayout: "modern",
      cardDesign: "standard",
      summaryBgColor: "#faf6f0",
      summaryTextColor: "#4a3b2c",
      reviewTitleColor: "#3b2f23",
      reviewBodyColor: "#5b4a39",
      reviewMetaColor: "#a89683",
      filterTextColor: "#a89683",
      sortBgColor: "#fffdfa",
      sortTextColor: "#4a3b2c",
      sortBorderColor: "#ece2d4",
      formBgColor: "#fffdfa",
      formTextColor: "#4a3b2c",
    },
  },
];

/**
 * Which theme the current settings match, or null when a merchant has since
 * changed something. Compared on the theme's own keys only, so a changed
 * heading or width does not stop a theme reading as selected.
 */
export function matchTheme(
  settings: Record<string, unknown>,
): string | null {
  for (const theme of DESIGN_THEMES) {
    const same = Object.entries(theme.values).every(
      ([k, v]) => settings[k] === v,
    );
    if (same) return theme.key;
  }
  return null;
}
