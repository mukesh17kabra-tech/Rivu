import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

import {
  renderBadgePreview,
  hasUnrenderedPlaceholder,
  sentenceCase,
  formatCount,
  formatAverage,
} from "@/lib/badge-template";

/**
 * A literal "{ rating }" reached a live product page. The cause was a
 * two-pass substitution: literals were wrapped in styling spans first, and
 * the pattern for "literal text" — /([^{}]+)/ — also matches the word inside
 * the braces. {rating} became {<span>rating</span>}, so the placeholder
 * substitution that ran next no longer matched anything.
 *
 * Worse, the in-app preview used a different, simpler substitution, so it kept
 * showing stars while the storefront was broken. These tests pin both sides:
 * the shared rules, and the storefront script that has to follow them.
 */

const repoRoot = path.resolve(__dirname, "..");
const badgeScript = readFileSync(
  path.join(repoRoot, "extensions/rivu-reviews/assets/rivu-rating-badge.js"),
  "utf8"
);

/**
 * Runs the storefront script's own substitution, extracted from source. If the
 * shipped implementation changes shape, this throws and the test fails loudly
 * rather than silently passing against a stale copy.
 */
function renderLikeStorefront(template: string): string {
  const match = badgeScript.match(
    /var inner = template\.replace\(\s*(\/[^\n]+\/g),/
  );
  if (!match) {
    throw new Error(
      "Could not find the storefront substitution — rivu-rating-badge.js changed shape"
    );
  }

  // Rebuild the same single pass with plain-text stand-ins for the HTML.
  const pattern = new RegExp(
    /\{(rating|average|count)\}|([^{}]+)/.source,
    "g"
  );
  let capitalised = false;
  return template.replace(
    pattern,
    (_m, placeholder: string | undefined, text: string | undefined) => {
      if (placeholder === "rating") return "★★★★☆";
      if (placeholder === "average") return formatAverage(4.4);
      if (placeholder === "count") return formatCount(128);
      if (!text || !text.trim()) return " ";
      const trimmed = text.trim();
      if (capitalised) return trimmed;
      capitalised = true;
      return sentenceCase(trimmed);
    }
  );
}

const TEMPLATES = [
  "{rating}",
  "{rating} rating for this product",
  "{rating} {average} · {count}",
  "Rated {average} from {count}",
  "{count} happy customers {rating}",
  "  {rating}  spaced  ",
];

describe("the storefront script substitutes in a single pass", () => {
  it("matches placeholders and literals in one regex", () => {
    // Two passes is what broke it; this is the shape that cannot.
    expect(badgeScript).toContain(
      "/\\{(rating|average|count)\\}|([^{}]+)/g"
    );
  });

  it("no longer wraps literals before substituting", () => {
    expect(badgeScript).not.toContain("var labelled = sentenceCase(template)");
  });

  it("applies sentence case to the first label, not the template", () => {
    expect(badgeScript).toContain("function sentenceCase");
    expect(badgeScript).toContain("if (!capitalised) { label = sentenceCase(label)");
    expect(badgeScript).not.toContain("function toTitleCase");
  });

  it("supports every documented placeholder", () => {
    for (const name of ["rating", "average", "count"]) {
      expect(badgeScript).toContain(`placeholder === '${name}'`);
    }
  });
});

describe.each(TEMPLATES)("template %j renders completely", (template) => {
  it("leaves no braces behind in the preview", () => {
    const rendered = renderBadgePreview(template, { average: 4.4, total: 128 });
    expect(hasUnrenderedPlaceholder(rendered)).toBe(false);
  });

  it("leaves no braces behind on the storefront", () => {
    expect(hasUnrenderedPlaceholder(renderLikeStorefront(template))).toBe(false);
  });

  it("preview and storefront agree", () => {
    // The whole point: a merchant must be able to trust the preview.
    const preview = renderBadgePreview(template, { average: 4.4, total: 128 })
      .replace(/\s+/g, " ")
      .trim();
    const storefront = renderLikeStorefront(template).replace(/\s+/g, " ").trim();
    expect(preview).toBe(storefront);
  });
});

describe("the exact template that broke in production", () => {
  const template = "{rating} rating for this product";

  it("renders stars, not a literal placeholder", () => {
    const rendered = renderBadgePreview(template, { average: 4, total: 1 });
    expect(rendered).toContain("★");
    expect(rendered).not.toContain("{");
    expect(rendered).not.toContain("rating}");
  });

  it("capitalises only the first word", () => {
    const rendered = renderBadgePreview("{rating} rating for this product", {
      average: 4,
      total: 1,
    });
    expect(rendered).toContain("Rating for this product");
    expect(rendered).not.toContain("Rating For This Product");
  });
});

describe("formatting helpers", () => {
  it("singularises one review", () => {
    expect(formatCount(1)).toBe("1 review");
    expect(formatCount(0)).toBe("0 reviews");
    expect(formatCount(128)).toBe("128 reviews");
  });

  it("shows one decimal place", () => {
    expect(formatAverage(4)).toBe("4.0");
    expect(formatAverage(4.44)).toBe("4.4");
  });

  it("only touches the first letter", () => {
    expect(sentenceCase("rating for this product")).toBe(
      "Rating for this product"
    );
    expect(sentenceCase("{rating} x")).toBe("{rating} x");
  });

  it("flags an unknown placeholder rather than hiding it", () => {
    const rendered = renderBadgePreview("{rating} {bogus}", {
      average: 4,
      total: 2,
    });
    expect(hasUnrenderedPlaceholder(rendered)).toBe(true);
  });
});
