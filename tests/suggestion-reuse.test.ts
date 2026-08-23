import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * A suggestion a shopper has already used must not be offered again.
 *
 * The AI pool retires a line the moment it is picked, but the ready-made
 * suggestions on the Free plan carry no id, so the claim call never fired for
 * them and the same sentence came back every time. Two reviews on one product
 * could read word for word identically — the exact thing suggestions are meant
 * to avoid.
 */

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const widgets: [string, string][] = [
  ["public widget", "public/widget.js"],
  ["theme extension widget", "extensions/rivu-reviews/assets/rivu-widget.js"],
];

/** The filter, lifted out of the route and run for real. */
function makeFilter() {
  const src = read("app/api/reviews/suggestions/route.ts");
  const start = src.indexOf("const normalise = (t: string)");
  const end = src.indexOf("offered = items.filter", start);
  expect(start, "normalise not found").toBeGreaterThan(-1);

  const body = src
    .slice(start, end)
    .replace(/: string/g, "")
    .replace("const used = new Set(existing.map((r) => normalise(r.body)));", "");

  return new Function(
    "items",
    "bodies",
    `${body}
     const used = new Set(bodies.map(normalise));
     return items.filter((i) => !used.has(normalise(i.text)));`
  ) as (items: { text: string }[], bodies: string[]) => { text: string }[];
}

describe("the used-suggestion filter", () => {
  const filter = makeFilter();
  const items = [
    { text: "Best purchase I've made in a while. The Board is fantastic!" },
    { text: "Absolutely love The Board! Exceeded my expectations." },
  ];

  it("drops a line that is already a review on this product", () => {
    // The reported case: the shopper picked line one, and it kept reappearing.
    const left = filter(items, [items[0].text]);
    expect(left.map((i) => i.text)).toEqual([items[1].text]);
  });

  it("ignores case and spacing differences", () => {
    // A review saved with a trailing space or a different capitalisation is
    // still the same sentence to a reader.
    const left = filter(items, ["  BEST PURCHASE I'VE MADE IN A WHILE.   The Board is fantastic!  "]);
    expect(left).toHaveLength(1);
  });

  it("keeps everything when no review matches", () => {
    expect(filter(items, ["Something a shopper wrote themselves."])).toHaveLength(2);
  });

  it("keeps everything when the product has no reviews yet", () => {
    expect(filter(items, [])).toHaveLength(2);
  });

  it("returns nothing once every line has been used", () => {
    // Deliberate: showing an empty list is better than offering a sentence
    // that already appears on the page. The widget hides the block.
    expect(filter(items, items.map((i) => i.text))).toHaveLength(0);
  });
});

describe("the suggestions route", () => {
  const route = read("app/api/reviews/suggestions/route.ts");

  it("filters both response shapes, not just the new one", () => {
    // Older cached widgets read `suggestions` as a plain string array; leaving
    // that unfiltered would keep serving used lines to them.
    expect(route).toContain("items: offered,");
    expect(route).toContain("suggestions: offered.map((i) => i.text)");
  });

  it("only queries when there is a product to match against", () => {
    // Without a product id the comparison would sweep the whole shop for no
    // benefit — the product name is substituted into every line.
    expect(route).toContain("if (productId) {");
  });

  it("scopes the lookup to the shop as well as the product", () => {
    const block = route.slice(route.indexOf("let offered = items;"));
    expect(block.slice(0, 600)).toContain("shopId: shopRecord.id");
  });
});

describe.each(widgets)("%s suggestion display", (_name, rel) => {
  const src = read(rel);

  it("hides the block when nothing is left to offer", () => {
    // Otherwise the shopper gets a "Suggestions" heading and a Refresh button
    // that cannot produce anything.
    const fn = src.slice(src.indexOf("function renderSuggestionBatch"));
    expect(fn.slice(0, 500)).toContain("if (!batch.length)");
    expect(fn.slice(0, 500)).toContain('suggestionsWrap.style.display = "none"');
  });

  it("still retires an AI suggestion when one is picked", () => {
    // The pool mechanism is unchanged; this fix covers the path that had none.
    expect(src).toContain("/api/reviews/suggestions/claim");
    expect(src).toContain("sPool = sPool.filter(s => s.id !== sugId)");
  });
});
