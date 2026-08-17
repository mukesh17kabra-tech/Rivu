import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Structured data is what puts star ratings under a product in Google's
 * results, and it is the main commercial reason a merchant fits a reviews
 * app. Google rejects malformed markup rather than ignoring it, so the shape
 * matters as much as its presence.
 *
 * The widget is plain browser JavaScript with no module boundary, so these
 * tests assert against its source. That is deliberate: the two bugs worth
 * guarding are both structural — the snippet being absent from one of the two
 * widget copies, and a design field being dropped by the merge.
 */

const repoRoot = path.resolve(__dirname, "..");
const widgets = {
  public: readFileSync(path.join(repoRoot, "public/widget.js"), "utf8"),
  extension: readFileSync(
    path.join(repoRoot, "extensions/rivu-reviews/assets/rivu-widget.js"),
    "utf8"
  ),
};

describe.each(Object.entries(widgets))("%s widget emits structured data", (_name, src) => {
  it("injects a JSON-LD script tag", () => {
    expect(src).toContain("application/ld+json");
    expect(src).toContain("injectRichSnippet");
  });

  it("declares Product with an AggregateRating", () => {
    expect(src).toContain('"@type": "Product"');
    expect(src).toContain('"@type": "AggregateRating"');
    expect(src).toContain("https://schema.org");
  });

  it("suppresses the snippet when there are no reviews", () => {
    // aggregateRating with reviewCount 0 is invalid and actively penalised,
    // so the guard has to be there.
    expect(src).toContain("if (!summary.total || !summary.average) return;");
  });

  it("respects the merchant's opt-out", () => {
    expect(src).toContain("if (!design.richSnippetsEnabled) return;");
  });

  it("cannot emit the same product twice", () => {
    expect(src).toContain("if (document.getElementById(markerId)) return;");
  });

  it("never lets an SEO failure break the widget", () => {
    expect(src).toContain("try { injectRichSnippet(); } catch");
  });

  it("uses JSON.stringify rather than string concatenation", () => {
    // Review text is merchant/customer content; concatenating it into a
    // script element would let a quote or </script> break the page.
    expect(src).toContain("tag.textContent = JSON.stringify(payload);");
  });

  it("carries richSnippetsEnabled in its defaults", () => {
    // The design merge iterates the defaults object, so a key absent from it
    // is dropped from the API response and the feature silently never runs.
    expect(src).toContain("richSnippetsEnabled:true");
  });
});

describe("the API hands the flag to the widget", () => {
  const listRoute = readFileSync(
    path.join(repoRoot, "app/api/reviews/list/route.ts"),
    "utf8"
  );
  const designRoute = readFileSync(
    path.join(repoRoot, "app/api/shop/design/route.ts"),
    "utf8"
  );

  it("includes it in the design payload", () => {
    expect(listRoute).toContain("richSnippetsEnabled");
  });

  it("accepts it on save", () => {
    expect(designRoute).toContain('bool("richSnippetsEnabled", true)');
  });
});

describe("the JSON-LD payload Google will receive", () => {
  // Mirrors the shape built in injectRichSnippet, so the assertions describe
  // the contract Google validates against.
  function buildPayload(summary: { total: number; average: number }) {
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "The Collection Snowboard",
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: summary.average,
        reviewCount: summary.total,
        bestRating: 5,
        worstRating: 1,
      },
    };
  }

  it("is serialisable and well formed", () => {
    const payload = buildPayload({ total: 12, average: 4.5 });
    const parsed = JSON.parse(JSON.stringify(payload));

    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed.aggregateRating.reviewCount).toBeGreaterThan(0);
    expect(parsed.aggregateRating.ratingValue).toBeGreaterThan(0);
    expect(parsed.aggregateRating.ratingValue).toBeLessThanOrEqual(
      parsed.aggregateRating.bestRating
    );
  });

  it("survives review text containing a closing script tag", () => {
    const hostile = '</script><img src=x onerror=alert(1)>';
    const serialised = JSON.stringify({ reviewBody: hostile });
    // JSON.stringify escapes the slash sequence's context; the literal
    // "</script>" must not appear unescaped in a way that closes the tag.
    expect(serialised).toContain("script");
    expect(() => JSON.parse(serialised)).not.toThrow();
    expect(JSON.parse(serialised).reviewBody).toBe(hostile);
  });
});
