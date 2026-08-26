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
    // The email IS read now, to derive the "Verified" badge — so checking the
    // select clause proves nothing any more. What matters is that the field is
    // dropped before the response is built, and an earlier version of this
    // test passed while the address went out to every storefront block.
    expect(route).toContain("const { customerEmail, ...rest } = r;");
    expect(route).toContain("return { ...rest, verified: !!customerEmail };");

    // And that the stripped list is what gets returned, not the raw rows.
    const response = route.slice(route.indexOf("return withCors("));
    expect(response).toContain("reviews: publicReviews,");
    expect(response).not.toMatch(/reviews,s*$/m);
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

describe("layout controls reach the rendered markup", () => {
  const base = {
    rivuShowcase: "",
    shop: "example.myshopify.com",
    apiBase: "https://rivu.test",
  };

  it("centres the heading when the block asks for it", async () => {
    // The heading had no alignment setting at all and was always left-aligned,
    // which looks wrong above a centred grid.
    const { html } = await render({ ...base, layout: "grid", heading: "Reviews", headingAlign: "center" });
    expect(html).toContain("text-align:center");
  });

  it("leaves the heading alone when there is no heading", async () => {
    const { html } = await render({ ...base, layout: "grid" });
    expect(html).not.toContain("<h2");
  });

  it("constrains and centres the block when a max width is set", async () => {
    const { el } = await render({ ...base, layout: "grid", maxWidth: "900" });
    const style = el.style as Record<string, string>;
    expect(style.maxWidth).toBe("900px");
    expect(style.marginLeft).toBe("auto");
    expect(style.marginRight).toBe("auto");
  });

  it("treats a max width of zero as full width", async () => {
    const { el } = await render({ ...base, layout: "grid", maxWidth: "0" });
    expect((el.style as Record<string, string>).maxWidth).toBeUndefined();
  });

  it("scales the trust badge", async () => {
    // At its default size it was too small to read as a trust signal in a
    // wide section, and there was no setting to change it.
    const small = await render({ ...base, layout: "trust", badgeScale: "1" });
    const large = await render({ ...base, layout: "trust", badgeScale: "2" });
    expect(small.html).toContain("font-size:23px");
    expect(large.html).toContain("font-size:46px");
  });

  it("clamps an absurd badge scale", async () => {
    const { html } = await render({ ...base, layout: "trust", badgeScale: "99" });
    // 2.5 is the ceiling: 23 * 2.5 rounds to 58.
    expect(html).toContain("font-size:58px");
  });

  it("hides the product name when the block turns it off", async () => {
    const off = await render({ ...base, layout: "grid", showProduct: "false" });
    const on = await render({ ...base, layout: "grid", showProduct: "true" });
    expect(on.html).toContain("The Board");
    expect(off.html).not.toContain("The Board");
  });
});

describe("the trust badge takes the merchant's own wording", () => {
  const base = {
    rivuShowcase: "",
    shop: "example.myshopify.com",
    apiBase: "https://rivu.test",
    layout: "trust",
  };

  it("falls back to the review count when no text is set", async () => {
    // Spread, never the shared object itself: the widget writes its
    // already-rendered marker into the dataset, so passing `base` by
    // reference poisons every later test in this block with it.
    const { html } = await render({ ...base });
    expect(html).toContain("3 reviews");
  });

  it("uses custom text instead", async () => {
    const { html } = await render({ ...base, badgeText: "Trusted by our customers" });
    expect(html).toContain("Trusted by our customers");
    expect(html).not.toContain("3 reviews");
  });

  it("substitutes the numbers into the text", async () => {
    const { html } = await render({
      ...base,
      badgeText: "Rated {average}/5 by {total} shoppers",
    });
    expect(html).toContain("Rated 4.8/5 by 3 shoppers");
  });

  it("substitutes {count} as the pluralised phrase", async () => {
    const { html } = await render({ ...base, badgeText: "Based on {count}" });
    expect(html).toContain("Based on 3 reviews");
  });

  it("pluralises correctly for a single review", async () => {
    const { html } = await render({ ...base, badgeText: "Based on {count}" }, {
      reviews: [],
      summary: { total: 1, average: 5 },
    });
    expect(html).toContain("Based on 1 review");
    expect(html).not.toContain("1 reviews");
  });

  it("substitutes in one pass", async () => {
    // Two passes is how the rating badge once printed a literal "{ rating }"
    // on a live storefront: the second pattern matched inside the first
    // pattern's output.
    const { html } = await render({ ...base, badgeText: "{average} {average} {count}" });
    expect(html).toContain("4.8 4.8 3 reviews");
    expect(html).not.toContain("{");
  });

  it("escapes anything the merchant types", async () => {
    const { html } = await render({ ...base, badgeText: '<script>x()</script>' });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("stacks by default", async () => {
    const { html } = await render({ ...base });
    expect(html).toContain("flex-direction:column");
  });

  it("puts everything on one line when asked", async () => {
    const { html } = await render({ ...base, badgeInline: "true" });
    expect(html).not.toContain("flex-direction:column");
    // Still wraps on a narrow screen, so a long sentence cannot push the
    // badge wider than the viewport.
    expect(html).toContain("flex-wrap:wrap");
  });
});

describe("the designs from the reference screenshots", () => {
  const base = {
    rivuShowcase: "",
    shop: "example.myshopify.com",
    apiBase: "https://rivu.test",
  };

  it("renders photo-first cards with the image on top", async () => {
    const { html } = await render({ ...base, layout: "carousel", cardStyle: "photo" });
    expect(html).toContain("rivu-sc-photo");
    // Square aspect so a row of cards keeps its rhythm.
    expect(html).toContain("aspect-ratio:1");
    expect(html).toContain("https://img.test/a.jpg");
  });

  it("gives a photo card without an image a panel, not a collapsed card", async () => {
    const { html } = await render({ ...base, layout: "grid", cardStyle: "photo" }, {
      reviews: [{ ...REVIEWS[0], photoUrl: null, videoUrl: null }],
      summary: { total: 1, average: 5 },
    });
    // Otherwise one card is half the height of its neighbours.
    expect(html).toContain("aspect-ratio:1");
  });

  it("renders the rating strip with a verdict word", async () => {
    const { html } = await render({ ...base, layout: "strip" });
    expect(html).toContain("rivu-sc-strip");
    // 4.8 average.
    expect(html).toContain("Excellent");
    expect(html).toContain("Based on 3 reviews");
  });

  it("lets the merchant override the verdict word", async () => {
    const { html } = await render({ ...base, layout: "strip", verdictText: "Loved" });
    expect(html).toContain("Loved");
    expect(html).not.toContain("Excellent");
  });

  it("picks a verdict that matches the rating", async () => {
    const good = await render({ ...base, layout: "strip" }, {
      reviews: [REVIEWS[0]],
      summary: { total: 1, average: 3.2 },
    });
    expect(good.html).toContain("Good");
    expect(good.html).not.toContain("Excellent");
  });

  it("renders solid square stars when asked", async () => {
    const square = await render({ ...base, layout: "grid", starStyle: "square" });
    const classic = await render({ ...base, layout: "grid", starStyle: "star" });
    expect(square.html).toContain("<rect");
    expect(classic.html).not.toContain("<rect");
  });

  it("still draws half stars in square style", async () => {
    // The 4.5 review must not round up to five solid squares.
    const { html } = await render({ ...base, layout: "grid", starStyle: "square" });
    expect(html).toContain("position:relative");
  });

  it("shows a verified badge only on reviews that have one", async () => {
    const { html } = await render({ ...base, layout: "carousel", cardStyle: "photo" }, {
      reviews: [
        { ...REVIEWS[0], verified: true },
        { ...REVIEWS[1], verified: false },
      ],
      summary: { total: 2, average: 5 },
    });
    expect((html.match(/rivu-sc-verified/g) || []).length).toBe(1);
  });

  it("hides the verified badge when the block turns it off", async () => {
    const { html } = await render(
      { ...base, layout: "carousel", cardStyle: "photo", showVerified: "false" },
      { reviews: [{ ...REVIEWS[0], verified: true }], summary: { total: 1, average: 5 } }
    );
    expect(html).not.toContain("rivu-sc-verified");
  });

  it("shortens the reviewer name the way review sites do", async () => {
    const { html } = await render({ ...base, layout: "strip" }, {
      reviews: [{ ...REVIEWS[0], customerName: "Gregory Sanderson" }],
      summary: { total: 1, average: 5 },
    });
    expect(html).toContain("Gregory S.");
  });

  it("adds carousel arrows, and can be told not to", async () => {
    const withArrows = await render({ ...base, layout: "carousel" });
    const without = await render({ ...base, layout: "carousel", showArrows: "false" });
    expect(withArrows.html).toContain("rivu-sc-next");
    expect(without.html).not.toContain("rivu-sc-next");
  });

  it("labels the arrows for assistive technology", async () => {
    const { html } = await render({ ...base, layout: "carousel" });
    expect(html).toContain('aria-label="Next reviews"');
    expect(html).toContain('aria-label="Previous reviews"');
  });
});

/**
 * Shopify's own schema rules, not just JSON validity.
 *
 * Every block schema parsed cleanly as JSON and the deploy still failed:
 * Shopify rejects `"default": ""` outright, so four optional text fields took
 * the whole release down. A malformed schema costs a full push-and-deploy
 * round trip to discover, which is the most expensive place to find a typo.
 */
describe("block schemas satisfy Shopify's validation", () => {
  const files = readdirSync(blocksDir).filter((f) => f.endsWith(".liquid"));

  const schemas = files.map((file) => {
    const src = readFileSync(path.join(blocksDir, file), "utf8");
    const match = src.match(/{% schema %}([\s\S]*?){% endschema %}/);
    return { file, schema: match ? JSON.parse(match[1]) : null };
  });

  it.each(schemas)("$file has no empty default", ({ file, schema }) => {
    // An optional field simply has no default. "" is invalid, not empty.
    for (const setting of schema?.settings ?? []) {
      if (!("default" in setting)) continue;
      expect(
        setting.default,
        `${file}: setting "${setting.id}" has an empty default — omit the key instead`
      ).not.toBe("");
    }
  });

  it.each(schemas)("$file gives every input an id and a label", ({ file, schema }) => {
    for (const setting of schema?.settings ?? []) {
      // A header is decoration and carries neither.
      if (setting.type === "header" || setting.type === "paragraph") continue;
      expect(setting.id, `${file}: a ${setting.type} setting has no id`).toBeTruthy();
      expect(setting.label, `${file}: setting "${setting.id}" has no label`).toBeTruthy();
    }
  });

  it.each(schemas)("$file keeps every select default among its options", ({ file, schema }) => {
    // A default outside the option list leaves the picker showing nothing.
    for (const setting of schema?.settings ?? []) {
      if (setting.type !== "select" || !("default" in setting)) continue;
      const values = (setting.options ?? []).map((o: { value: string }) => o.value);
      expect(
        values,
        `${file}: select "${setting.id}" defaults to a value it does not offer`
      ).toContain(setting.default);
    }
  });

  it.each(schemas)("$file keeps every range default within its bounds", ({ file, schema }) => {
    for (const setting of schema?.settings ?? []) {
      if (setting.type !== "range" || !("default" in setting)) continue;
      expect(setting.default, `${file}: range "${setting.id}" below min`).toBeGreaterThanOrEqual(setting.min);
      expect(setting.default, `${file}: range "${setting.id}" above max`).toBeLessThanOrEqual(setting.max);
      // Shopify requires the default to sit on a step boundary.
      const steps = (setting.default - setting.min) / setting.step;
      expect(
        Math.abs(steps - Math.round(steps)) < 1e-9,
        `${file}: range "${setting.id}" default ${setting.default} is not on a step boundary`
      ).toBe(true);
    }
  });
});
