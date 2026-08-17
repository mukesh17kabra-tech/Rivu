/**
 * Rating-badge template rendering.
 *
 * The badge is drawn twice: once as a live preview inside the app, and once on
 * the storefront by extensions/rivu-reviews/assets/rivu-rating-badge.js. That
 * script is plain browser JavaScript served straight to the theme, so it
 * cannot import this module — the two implementations have to agree by
 * discipline rather than by sharing code.
 *
 * This file therefore owns the *rules*, and tests/badge-template.test.ts
 * asserts the storefront script still follows them. The preview drifting from
 * the storefront is exactly how a merchant ends up trusting a preview that
 * lies to them.
 */

export const BADGE_PLACEHOLDERS = ["rating", "average", "count"] as const;

/** Matches a supported placeholder, or a run of literal text. */
export const BADGE_TOKEN_PATTERN = /\{(rating|average|count)\}|([^{}]+)/g;

/**
 * Capitalises the first letter only.
 *
 * Not Title Case: capitalising every word turned "rating for this product"
 * into "Rating For This Product", which reads like a bug rather than a label.
 *
 * Applied to the first *label* rather than to the whole template, because
 * templates usually open with a placeholder. Running it over
 * "{rating} rating for this product" changes nothing — the first character is
 * a brace — and the visible text stays stubbornly lowercase.
 */
export function sentenceCase(text: string): string {
  return text.replace(/^(\s*)([a-z])/, (_m, space: string, ch: string) =>
    space + ch.toUpperCase()
  );
}

/** How the review count reads — "1 review", "128 reviews". */
export function formatCount(total: number): string {
  return `${total} review${total === 1 ? "" : "s"}`;
}

/** One decimal place, matching the storefront's toFixed(1). */
export function formatAverage(average: number): string {
  return Number(average || 0).toFixed(1);
}

/**
 * Plain-text render of a badge template, used for the in-app preview.
 *
 * Substitutes every placeholder in a single pass over the template. Doing it
 * in two passes — wrapping literals, then replacing placeholders — is what
 * broke the storefront badge: the literal pattern also matches the word
 * *inside* the braces, so `{rating}` stopped matching and rendered verbatim.
 */
export function renderBadgePreview(
  template: string,
  data: { average: number; total: number; stars?: string }
): string {
  const stars = data.stars ?? "★★★★☆";
  let capitalised = false;

  return template.replace(
    BADGE_TOKEN_PATTERN,
    (_match, placeholder: string | undefined, text: string | undefined) => {
      if (placeholder === "rating") return stars;
      if (placeholder === "average") return formatAverage(data.average);
      if (placeholder === "count") return formatCount(data.total);
      if (!text || !text.trim()) return " ";

      const trimmed = text.trim();
      if (capitalised) return trimmed;
      capitalised = true;
      return sentenceCase(trimmed);
    }
  );
}

/**
 * True when a rendered badge still contains an unsubstituted placeholder —
 * the failure a merchant sees as a literal "{ rating }" on their product page.
 */
export function hasUnrenderedPlaceholder(rendered: string): boolean {
  return /\{|\}/.test(rendered);
}
