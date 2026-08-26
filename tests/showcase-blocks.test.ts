import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";

/**
 * Store-wide review blocks.
 *
 * Rivu shipped three theme blocks against a competitor's fifteen, and the
 * reason was one missing endpoint rather than fifteen missing renderers:
 * everything went through /api/reviews/list, which needs a product id, so a
 * carousel on the home page or a testimonial strip in a footer had nothing to
 * call.
 */

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const showcase = read("public/rivu-showcase.js");
const blocksDir = path.join(repoRoot, "extensions/rivu-reviews/blocks");

const REVIEWS = [1, 2, 3].map((n) => ({
  id: `r${n}`,
  productId: "1",
  productTitle: "The Board",
  rating: n === 2 ? 4.5 : 5,
  reviewTitle: n === 1 ? "Superb" : null,
  body: `Review number ${n}, genuinely good.`,
  customerName: `Reviewer ${n}`,
  photoUrl: n === 3 ? "https://img.test/a.jpg" : null,
  videoUrl: null,
  createdAt: new Date().toISOString(),
  pinnedAt: null,
  ownerReply: null,
}));

/** Runs the showcase script against a stub DOM and returns what it rendered. */
async function render(dataset: Record<string, string>, payload?: unknown) {
  const el: Record<string, unknown> = {
    dataset,
    innerHTML: "",
    style: {},
  };

  const g = globalThis as unknown as Record<string, unknown>;
  g.document = {
    currentScript: { src: "https://rivu.test/rivu-showcase.js" },
    readyState: "complete",
    querySelectorAll: (sel: string) =>
      sel.includes("rivu-showcase") ? [el] : [],
    addEventListener: () => {},
  };
  g.fetch = vi.fn(async () => ({
    ok: true,
    json: async () =>
      payload ?? { reviews: REVIEWS, summary: { total: 3, average: 4.8 } },
  }));

  new Function(showcase)();
  await new Promise((r) => setTimeout(r, 50));
  return { html: el.innerHTML as string, el, fetch: g.fetch as ReturnType<typeof vi.fn> };
}

afterEach(() => vi.restoreAllMocks());

describe("the store-wide endpoint", () => {
  const route = read("app/api/reviews/showcase/route.ts");

  it("does not require a product id", () => {
    // The whole reason the home-page blocks could not exist.
    expect(route).not.toContain('params.get("productId")');
    expect(route).toContain('params.get("shop")');
  });

  it("returns only approved reviews", () => {
    // Scoped to the reviews query. Searching the whole file passed with this
    // removed, because the count and average queries carry the same clause —
    // so an unmoderated review could have gone out to every storefront block
    // while the test stayed green.
    const query = route.slice(
      route.indexOf("db.review.findMany("),
      route.indexOf("orderBy:")
    );
    expect(query).toContain("approved: true");

    // And on the totals, or a trust badge would count held-back reviews.
    const counts = route.slice(route.indexOf("const [total, aggregate]"));
    expect((counts.match(/approved: true/g) || []).length).toBe(2);
  });

  it("never sends a customer email to a storefront", () => {
    const select = route.slice(route.indexOf("select: {"), route.indexOf("// Deliberately absent"));
    expect(select).not.toContain("customerEmail");
  });

  it("bounds the limit so a request cannot ask for the whole table", () => {
    expect(route).toContain("Math.min(50");
  });

  it("puts pinned reviews first here too", () => {
    // A merchant who pins a review means it everywhere, not just on the
    // product page.
    expect(route).toContain('orderBy: [{ pinnedAt: "desc" }, { createdAt: "desc" }]');
  });

  it("is cached, since it runs on every storefront page view", () => {
    expect(route).toContain("stale-while-revalidate");
  });
});

describe("the showcase script renders each layout", () => {
  const base = { rivuShowcase: "", shop: "example.myshopify.com", apiBase: "https://rivu.test" };

  it("renders a grid", async () => {
    const { html } = await render({ ...base, layout: "grid" });
    expect(html).toContain("rivu-sc-grid");
    expect(html).toContain("Review number 1");
    expect(html).toContain("Reviewer 1");
  });

  it("renders a carousel that scrolls horizontally", async () => {
    const { html } = await render({ ...base, layout: "carousel" });
    expect(html).toContain("rivu-sc-scroll");
    expect(html).toContain("overflow-x:auto");
  });

  it("renders a wall in columns", async () => {
    const { html } = await render({ ...base, layout: "wall", columns: "4" });
    expect(html).toContain("column-count:4");
  });

  it("renders quotes for a testimonial strip", async () => {
    const { html } = await render({ ...base, layout: "quotes" });
    expect(html).toContain("rivu-sc-quote");
    expect(html).toContain("font-style:italic");
  });

  it("renders a trust badge from the summary alone", async () => {
    const { html } = await render({ ...base, layout: "trust" });
    expect(html).toContain("rivu-sc-trust");
    expect(html).toContain("4.8");
    expect(html).toContain("3 reviews");
  });

  it("draws a half star for a 4.5 rating", async () => {
    const { html } = await render({ ...base, layout: "grid" });
    expect(html).toContain("position:relative");
  });

  it("uses no SVG ids, so several blocks can share a page", async () => {
    const { html } = await render({ ...base, layout: "grid" });
    expect(html).not.toMatch(/\bid=/);
  });
});

describe("the showcase script fails quietly", () => {
  const base = { rivuShowcase: "", shop: "example.myshopify.com", apiBase: "https://rivu.test" };

  it("hides itself when there are no reviews", async () => {
    // An empty strip on a home page reads as a broken section.
    const { html, el } = await render(
      { ...base, layout: "grid" },
      { reviews: [], summary: { total: 0, average: 0 } }
    );
    expect(html).toBe("");
    expect((el.style as Record<string, string>).display).toBe("none");
  });

  it("escapes review text", async () => {
    const { html } = await render({ ...base, layout: "grid" }, {
      reviews: [{ ...REVIEWS[0], body: '<script>window.pwned=1</script>' }],
      summary: { total: 1, average: 5 },
    });
    expect(html).not.toContain("<script>window.pwned");
    expect(html).toContain("&lt;script&gt;");
  });

  it("does nothing without a shop", async () => {
    const { html, fetch } = await render({ rivuShowcase: "", layout: "grid" });
    expect(html).toBe("");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("passes the block's filters to the endpoint", async () => {
    const { fetch } = await render({
      ...base,
      layout: "wall",
      limit: "8",
      minRating: "4",
      withMedia: "true",
    });
    const url = String(fetch.mock.calls[0][0]);
    expect(url).toContain("limit=8");
    expect(url).toContain("minRating=4");
    expect(url).toContain("withMedia=1");
  });
});

describe("the theme blocks", () => {
  const files = readdirSync(blocksDir).filter((f) => f.endsWith(".liquid"));

  it("ships more than the original three", () => {
    // Blocks are how a merchant actually puts reviews on a page; one section
    // on the product page was the whole surface area.
    expect(files.length).toBeGreaterThanOrEqual(9);
  });

  it.each(files)("%s has a valid schema", (file) => {
    // A malformed schema makes the block vanish from the theme editor with no
    // error a merchant would ever see.
    const src = readFileSync(path.join(blocksDir, file), "utf8");
    const match = src.match(/{% schema %}([\s\S]*?){% endschema %}/);
    expect(match, `${file}: no schema block`).not.toBeNull();
    const schema = JSON.parse(match![1]);
    expect(schema.name, `${file}: unnamed`).toBeTruthy();
    expect(schema.target, `${file}: no target`).toBeTruthy();
  });

  it("gives every block a distinct name in the theme editor", () => {
    const names = files.map((f) => {
      const src = readFileSync(path.join(blocksDir, f), "utf8");
      return JSON.parse(src.match(/{% schema %}([\s\S]*?){% endschema %}/)![1]).name;
    });
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(
    readdirSync(blocksDir).filter((f) => readFileSync(path.join(blocksDir, f), "utf8").includes("data-rivu-showcase"))
  )("%s passes the shop through", (file) => {
    const src = readFileSync(path.join(blocksDir, file), "utf8");
    expect(src).toContain('data-shop="{{ shop.permanent_domain }}"');
    expect(src).toContain("rivu-showcase.js");
  });

  it("ships the script as a theme asset, not only in public/", () => {
    // Liquid loads it via asset_url; a block pointing at a missing asset
    // renders an empty div and nothing else.
    const asset = read("extensions/rivu-reviews/assets/rivu-showcase.js");
    expect(asset).toBe(showcase);
  });
});
