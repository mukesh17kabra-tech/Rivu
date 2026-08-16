/**
 * Free plan design defaults — these are the ONLY settings a Free plan
 * shop is allowed to have. When a shop downgrades to Free, we reset
 * their DB record to exactly these values.
 *
 * Kept in one place so widget.js, the API, and the reset function all
 * use the same source of truth.
 */
export const FREE_PLAN_DESIGN_DEFAULTS = {
  // Layout — Free: List and Grid only
  displayStyle:            "list",
  splitSummary:            false,
  gridColumns:             2,
  carouselVisible:         1,

  // Core colors — these ARE editable on Free
  primaryColor:            "#111111",
  starColor:               "#f5b400",
  rangeColor:              "#f5b400",
  backgroundColor:         "#ffffff",
  textColor:               "#333333",
  arrowColor:              "#111111",

  // Typography — reset to theme default on Free
  fontFamily:              "inherit",

  // Widget structure
  borderRadius:            8,
  reviewTextSize:          14,
  reviewTextAlign:         "left",
  formAlign:               "center",
  formMaxWidth:            540,
  widgetMaxWidth:          900,
  widgetTitle:             "Customer Reviews",
  headingFontSize:         13,
  headingBold:             true,
  headingAlign:            "center",
  topSpacing:              24,
  showBorder:              false,
  borderColor:             "#e0e0e0",
  borderWidth:             1,
  borderStyle:             "solid",

  // Gradients — none on Free
  backgroundGradient:      null,
  primaryGradient:         null,

  // Suggestions — English only on Free
  letCustomerPickLanguage: false,
  showSuggestionsOnWebsite: true,
  showSuggestionsOnQr:     false,
  suggestionLanguage:      "en",
  enabledLanguages:        ["en"],

  // Form template — Basic only on Free
  formTemplate:            "basic",

  // Summary layout — Modern only on Free
  summaryLayout:           "modern",  // Free: modern only; Growth: +compact +sidebar; Pro: +horizontal +iconpct

  // Summary colors — reset to neutral defaults
  summaryBgColor:          "#f8f8f8",
  summaryTextColor:        "#333333",
  summaryWidth:            220,
  summaryPosition:         "left",

  // Filter/sort — reset to neutral defaults
  filterBgColor:           "#ffffff",
  filterTextColor:         "#999999",
  filterBorderColor:       "rgba(0,0,0,0.08)",
  sortBgColor:             "#ffffff",
  sortTextColor:           "#333333",
  sortBorderColor:         "#dddddd",
  reviewCountFontSize:     14,

  // Review card text — reset to neutral defaults
  reviewTitleColor:        "#111111",
  reviewBodyColor:         "#333333",
  reviewMetaColor:         "#999999",

  // Form modal colors — reset to neutral defaults
  formBgColor:             "#ffffff",
  formTextColor:           "#1a1a2e",
  formCloseColor:          "#999999",
};

/**
 * Deliberately free of any database import so both lib/plan-gating.ts
 * (reached from the client through DesignForm) and lib/free-plan-defaults.ts
 * can share it. Two separate copies of these values had already drifted —
 * plan-gating said headingAlign "left" while this said "center", so every
 * save on a Free shop silently undid the centring.
 */
