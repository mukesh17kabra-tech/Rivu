import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * The product-page blocks, placed on a page with no product.
 *
 * "Rivu: missing config." was printed into the storefront in red for every
 * visitor to read, because a merchant had added the review block to a home
 * page. A merchant's placement mistake is not something a shopper should see.
 *
 * The two widget copies had diverged here: the extension copy printed the
 * error, and the public copy had no guard at all — it fetched with an empty
 * product id and sat on "Loading reviews…" indefinitely.
 */

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const widgets: [string, string][] = [
  ["public widget", "public/widget.js"],
  ["theme extension widget", "extensions/rivu-reviews/assets/rivu-widget.js"],
];

describe.each(widgets)("%s without a product", (_name, rel) => {
  const src = read(rel);

  it("no longer prints an error into the storefront", () => {
    expect(src).not.toContain("Rivu: missing config.");
  });

  it("guards before fetching", () => {
    // The public copy had none, so it requested reviews for an empty product
    // id and left the loading message on screen.
    const render = src.slice(src.indexOf("async function render(el)"));
    const guardAt = render.indexOf("!shop || !productId");
    const fetchAt = render.indexOf("/api/reviews/list");
    expect(guardAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(fetchAt);
  });

  it("explains itself in the theme editor", () => {
    // Where the mistake can actually be corrected.
    expect(src).toContain("window.Shopify.designMode");
    expect(src).toContain("only works on a product page");
  });

  it("points the merchant at the blocks that do work there", () => {
    expect(src).toMatch(/Rivu Reviews Grid|Rivu Trust Badge/);
  });

  it("stays invisible on a live storefront", () => {
    const guard = src.slice(src.indexOf("!shop || !productId"));
    expect(guard.slice(0, 1400)).toContain('el.style.display = "none"');
  });
});

describe("the rating badge without a product", () => {
  const src = read("extensions/rivu-reviews/assets/rivu-rating-badge.js");

  it("explains itself in the theme editor rather than rendering nothing", () => {
    // It returned silently, so a merchant saw an empty block and no reason.
    expect(src).toContain("designMode");
    expect(src).toContain("only works on a product page");
  });

  it("suggests the store-wide badge instead", () => {
    expect(src).toContain("Rivu Trust Badge");
  });
});
