import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * The spotlight card, and the paste-anywhere snippet builder.
 *
 * Two separate answers to the same complaint: a merchant could only put
 * reviews where a theme offered an "Add block" slot, and once a shopper was
 * persuaded by a review there was nothing to click.
 *
 * The spotlight card carries the product through to a buy button. The snippet
 * builder produces inert HTML for the places blocks cannot reach — beside a
 * price, in a header, inside a page builder.
 */

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");
const showcase = read("public/rivu-showcase.js");
const builder = read("components/EmbedCodeBuilder.tsx");

const REVIEWS = [
  {
    id: "r1",
    productId: "1",
    productTitle: "Al Hoor Perfume",
    productHandle: "al-hoor-perfume",
    productImageUrl: "https://img.test/hoor.jpg",
    rating: 5,
    reviewTitle: null,
    body: "Luxury feel and premium packaging. Highly satisfied.",
    customerName: "Mariam Khan",
    photoUrl: null,
    videoUrl: null,
    createdAt: "2026-09-01T10:00:00Z",
    pinnedAt: null,
    ownerReply: null,
    verified: true,
  },
  {
    id: "r2",
    productId: "2",
    productTitle: "Automatic Massage Gun",
    // Written before the handle column existed.
    productHandle: null,
    productImageUrl: null,
    rating: 4,
    reviewTitle: null,
    body: "Brilliant quality and the delivery was faster than I expected.",
    customerName: "Reem Abdullah",
    photoUrl: null,
    videoUrl: null,
    createdAt: "2026-08-20T10:00:00Z",
    pinnedAt: null,
    ownerReply: null,
    verified: false,
  },
];

async function render(dataset: Record<string, string>, reviews = REVIEWS) {
  const el: Record<string, unknown> = {
    // Copied, never the caller's object: the script writes `rvRendered` into
    // the dataset to guard against rendering twice. Passing a shared BASE by
    // reference meant the first test stamped it and every later render bailed
    // out immediately, returning empty HTML.
    dataset: { ...dataset },
    innerHTML: "",
    style: {},
    querySelector: () => null,
  };
  const g = globalThis as unknown as Record<string, unknown>;
  g.document = {
    currentScript: { src: "https://rivu.test/rivu-showcase.js" },
    readyState: "complete",
    querySelectorAll: (sel: string) => (sel.includes("rivu-showcase") ? [el] : []),
    addEventListener: () => {},
  };
  g.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ reviews, summary: { total: 128, average: 4.9 }, plan: "pro" }),
  }));

  new Function(showcase)();
  await new Promise((r) => setTimeout(r, 50));
  return el.innerHTML as string;
}

const BASE = {
  shop: "s.myshopify.com",
  apiBase: "https://rivu.test",
  layout: "grid",
  cardStyle: "spotlight",
};

afterEach(() => vi.restoreAllMocks());

describe("the spotlight card", () => {
  it("renders one card per review", async () => {
    const html = await render(BASE);
    expect([...html.matchAll(/rivu-sc-spotlight/g)]).toHaveLength(2);
  });

  it("shows the review and who wrote it", async () => {
    const html = await render(BASE);
    expect(html).toContain("Luxury feel and premium packaging");
    expect(html).toContain("Mariam K.");
  });

  it("names the product in its own panel", async () => {
    // The point of this card style: the other three end at the reviewer's
    // name, and a shopper who has just been persuaded has nothing to click.
    const html = await render(BASE);
    expect(html).toContain("rivu-sc-spot-product");
    expect(html).toContain("Al Hoor Perfume");
    expect(html).toContain("https://img.test/hoor.jpg");
  });

  it("links the button to the product", async () => {
    const html = await render({ ...BASE, viewProductText: "Shop this" });
    expect(html).toContain('href="/products/al-hoor-perfume"');
    expect(html).toContain("Shop this");
  });

  it("omits the button when there is no handle, rather than linking nowhere", async () => {
    const html = await render(BASE);
    expect([...html.matchAll(/rivu-sc-spot-btn/g)]).toHaveLength(1);
    // The product is still named on that card.
    expect(html).toContain("Automatic Massage Gun");
  });

  it("keeps a product panel even when the product has no image", async () => {
    // Otherwise one card in a row is shorter than the rest and the buttons
    // stop lining up.
    const html = await render(BASE);
    const cards = html.split("rivu-sc-spotlight").slice(1);
    for (const card of cards) expect(card).toContain("rivu-sc-spot-product");
  });

  it("clamps the body so every card in a row is the same height", async () => {
    const html = await render(BASE);
    expect(html).toContain("-webkit-line-clamp");
  });

  it("escapes review, reviewer and product text", async () => {
    const html = await render(BASE, [
      {
        ...REVIEWS[0],
        body: "<script>window.pwned=1</script>",
        customerName: "<img onerror=x>",
        productTitle: "<b>Bold</b>",
      },
    ]);
    expect(html).not.toContain("<script>window.pwned");
    expect(html).not.toContain("<img onerror");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes the button text, which a merchant types", async () => {
    const html = await render({ ...BASE, viewProductText: '"><script>x</script>' });
    expect(html).not.toContain("<script>x</script>");
  });
});

describe("what the spotlight card refuses to claim", () => {
  it("never says \"Verified Purchase\"", async () => {
    // `verified` means the reviewer left an email address. It is not proof
    // they bought anything, and printing that on a merchant's storefront
    // would be a claim neither they nor we can stand behind.
    // Checked on the rendered output, not the source — the source explains
    // the decision and so necessarily contains the phrase.
    const html = await render(BASE);
    expect(html).toContain("Verified");
    expect(html).not.toContain("Verified Purchase");
    expect(html).not.toMatch(/verified\s+(purchase|buyer|customer)/i);
  });

  it("invents no location for the reviewer", async () => {
    // The reference design shows a city ("Sharjah, UAE"). Rivu never collects
    // one, so there is nothing truthful to print. Asserted against the
    // rendered output rather than the source, which discusses the decision.
    const html = await render(BASE);
    expect(html).not.toMatch(/UAE|, [A-Z]{2,3}\b/);
    expect(html).not.toContain("rivu-sc-location");
  });

  it("shows no verified badge on a review without one", async () => {
    const html = await render(BASE, [REVIEWS[1]]);
    expect(html).not.toContain("rivu-sc-verified");
  });
});

describe("the accent colour", () => {
  it("tints the product panel from the button colour, rather than a second setting", async () => {
    const html = await render({ ...BASE, accentColor: "#6d28d9" });
    expect(html).toContain("#6d28d9");
    expect(html).toContain("rgba(109,40,217,");
  });

  it("falls back to neutral grey for a colour it cannot parse", async () => {
    // A CSS variable or a named colour must not produce "rgba(NaN,NaN,NaN)".
    const html = await render({ ...BASE, accentColor: "var(--brand)" });
    expect(html).not.toContain("NaN");
    expect(html).toContain("rgba(0,0,0,");
  });

  it("handles three-digit hex", async () => {
    const html = await render({ ...BASE, accentColor: "#f0a" });
    expect(html).toContain("rgba(255,0,170,");
  });
});

describe("the two copies of the script stay identical", () => {
  it("ships the spotlight card as a theme asset too", () => {
    // A storefront using the theme block loads the asset copy; a merchant
    // pasting the snippet loads public/. A card in one and not the other is
    // the same bug reported twice.
    const asset = read("extensions/rivu-reviews/assets/rivu-showcase.js");
    expect(asset).toBe(showcase);
    expect(asset).toContain("spotlightCard");
  });
});

describe("the theme blocks offer the new style", () => {
  const blocks = ["reviews-carousel", "reviews-grid", "reviews-wall"];

  it.each(blocks)("%s lists it and passes its settings through", (name) => {
    const src = read(`extensions/rivu-reviews/blocks/${name}.liquid`);
    expect(src).toContain('"value": "spotlight"');
    // A setting the schema offers but the markup never forwards is a control
    // that silently does nothing.
    expect(src).toContain("data-accent-color=");
    expect(src).toContain("data-view-product-text=");
    expect(src).toContain('"id": "accent_color"');
    expect(src).toContain('"id": "view_product_text"');
  });

  it.each(blocks)("%s keeps a schema Shopify will accept", (name) => {
    // `shopify app deploy` has failed on this before: valid JSON is not
    // enough, and the rules below are the ones that broke it.
    const src = read(`extensions/rivu-reviews/blocks/${name}.liquid`);
    const schema = JSON.parse(
      src.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/)![1]
    );
    for (const setting of schema.settings) {
      expect(setting.default, `${setting.id} has an empty default`).not.toBe("");
      if (setting.type === "select") {
        const values = setting.options.map((o: { value: string }) => o.value);
        expect(values, `${setting.id} default is not an option`).toContain(setting.default);
        expect(new Set(values).size, `${setting.id} has a duplicate option`).toBe(values.length);
      }
    }
  });
});

describe("the paste-anywhere snippet builder", () => {
  it("builds a self-contained snippet, not one that needs the App Embed", () => {
    // The embed only loads the rating-badge script. A snippet that silently
    // does nothing unless an unrelated setting is on is a support ticket.
    expect(builder).toContain("/rivu-showcase.js");
    const embed = read("extensions/rivu-reviews/blocks/app-embed.liquid");
    expect(embed).not.toContain("rivu-showcase.js");
  });

  it("escapes the merchant's wording into the attribute", () => {
    // It goes straight into a double-quoted attribute in HTML they paste into
    // their own theme.
    expect(builder).toContain("function escapeAttr");
    for (const ch of ['/&/g', '/"/g', "/</g", "/>/g"]) {
      expect(builder, `escapeAttr does not handle ${ch}`).toContain(ch);
    }
  });

  it("documents exactly the tokens the script substitutes", () => {
    // The script replaces {average}, {count} and {total}. Offering a token it
    // does not know prints the braces on the storefront.
    // The literal source text is `/\{(average|count|total)\}/g`, backslashes
    // and all, so they have to be matched rather than treated as escapes.
    const tokens = showcase.match(/\\\{\(average\|count\|total\)\\\}/);
    expect(tokens, "the script's token list changed").toBeTruthy();
    for (const t of ["{count}", "{total}", "{average}"]) {
      expect(builder, `${t} is not explained to the merchant`).toContain(t);
    }
  });

  it("offers only layouts and card styles the script implements", () => {
    const offered = [
      ...builder.matchAll(/data-(?:layout|card-style)="([a-z]+)"/g),
    ].map((m) => m[1]);
    expect(offered.length).toBeGreaterThan(0);
    for (const value of offered) {
      expect(showcase, `the script has no "${value}"`).toContain(`"${value}"`);
    }
  });

  it("tells the merchant where to paste it", () => {
    // The code alone is useless to someone who has never opened Custom Liquid.
    expect(builder).toContain("Custom Liquid");
    expect(builder).toContain("Online Store → Themes");
  });
});
