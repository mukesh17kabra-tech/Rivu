import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * The two things the reference design had that Rivu could not honestly show.
 *
 * Both are now shown — because the data behind them exists, not because the
 * design asked for them. The reviewer's city is a field they fill in, and
 * "Verified Purchase" appears only where a review matches a real order.
 *
 * The important test in this file is the one asserting that an email address
 * alone never earns "Verified Purchase". That is a claim on a merchant's
 * storefront about whether someone actually bought something, and regulators
 * treat review claims as advertising.
 */

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");
const showcase = read("public/rivu-showcase.js");

const REVIEW = {
  id: "r1",
  productId: "1",
  productTitle: "Al Hoor Perfume",
  productHandle: "al-hoor-perfume",
  productImageUrl: null,
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
  verifiedPurchase: false,
  customerLocation: null as string | null,
};

async function render(dataset: Record<string, string>, review: Record<string, unknown>) {
  const el: Record<string, unknown> = {
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
    json: async () => ({
      reviews: [review],
      summary: { total: 1, average: 5 },
      plan: "pro",
    }),
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

describe("the location pill", () => {
  it("shows the city the reviewer typed", async () => {
    const html = await render(BASE, { ...REVIEW, customerLocation: "Abu Dhabi, UAE" });
    expect(html).toContain("rivu-sc-spot-location");
    expect(html).toContain("Abu Dhabi, UAE");
  });

  it("is absent entirely when nobody said where they are", async () => {
    // A card with no pill is fine. A card with a guessed city is not.
    const html = await render(BASE, REVIEW);
    expect(html).not.toContain("rivu-sc-spot-location");
  });

  it("escapes it, since a customer types it", async () => {
    const html = await render(BASE, {
      ...REVIEW,
      customerLocation: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });

  it("truncates rather than stretching the card", async () => {
    const html = await render(BASE, {
      ...REVIEW,
      customerLocation: "Somewhere with an extremely long name indeed",
    });
    expect(html).toContain("text-overflow:ellipsis");
  });
});

describe("\"Verified Purchase\" is only said when it is true", () => {
  it("says it for a review matched to an order", async () => {
    const html = await render(BASE, { ...REVIEW, verifiedPurchase: true });
    expect(html).toContain("Verified Purchase");
    expect(html).toContain("rivu-sc-verified-purchase");
  });

  it("says only \"Verified\" when all we have is an email address", async () => {
    /**
     * The claim that must never be made loosely.
     *
     * `verified` means the reviewer typed an email. Anyone can type an email.
     * Labelling that a verified purchase on a merchant's storefront is a
     * statement about their business that neither they nor we could defend.
     */
    const html = await render(BASE, { ...REVIEW, verified: true, verifiedPurchase: false });
    expect(html).toContain("Verified");
    expect(html).not.toContain("Verified Purchase");
  });

  it("says nothing at all for an anonymous review", async () => {
    const html = await render(BASE, { ...REVIEW, verified: false, verifiedPurchase: false });
    expect(html).not.toContain("rivu-sc-verified");
  });

  it("still honours the merchant switching badges off", async () => {
    const html = await render(
      { ...BASE, showVerified: "false" },
      { ...REVIEW, verifiedPurchase: true }
    );
    expect(html).not.toContain("Verified Purchase");
  });
});

describe("what sets verifiedPurchase in the first place", () => {
  const route = read("app/api/reviews/submit/route.ts");

  it("requires a match against a pending review request, which comes from an order", () => {
    expect(route).toContain("db.pendingReviewRequest.count");
    expect(route).toContain("verifiedPurchase");
  });

  it("scopes the match to this shop, product and email together", () => {
    const block = route.slice(route.indexOf("const verifiedPurchase"));
    const check = block.slice(0, 500);
    expect(check).toContain("shopId: shopRecord.id");
    expect(check).toContain("productId: data.productId");
    expect(check).toContain("customerEmail: data.customerEmail");
  });

  it("is false without an email, since there is nothing to match on", () => {
    /**
     * Pinned to the shape of the guard, not to the words in it.
     *
     * A looser version of this test passed when the condition was changed to
     * `true || data.customerEmail` — every mention it looked for was still
     * there, and every review would have been labelled a verified purchase.
     * The assertion below is that `data.customerEmail` is the whole condition.
     */
    expect(route).toMatch(
      /const verifiedPurchase\s*=\s*data\.customerEmail\s*\n?\s*\?/
    );
    const block = route.slice(route.indexOf("const verifiedPurchase"));
    expect(block.slice(0, 600)).toContain(": false");
  });
});

describe("the columns exist before anything reads them", () => {
  // Adding a Prisma field without a runtime migration is what took the live
  // app down once already: pages never run `prisma migrate`.
  const migrate = read("lib/db-migrate.ts");

  it("adds both columns at runtime", () => {
    expect(migrate).toContain('ADD COLUMN IF NOT EXISTS "customerLocation"');
    expect(migrate).toContain('ADD COLUMN IF NOT EXISTS "verifiedPurchase"');
  });

  it("gives verifiedPurchase a default, since the column is NOT NULL", () => {
    expect(migrate).toMatch(/"verifiedPurchase" BOOLEAN NOT NULL DEFAULT false/);
  });

  it("declares them in the Prisma schema as well", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toContain("customerLocation String?");
    expect(schema).toContain("verifiedPurchase Boolean @default(false)");
  });
});

describe("the data actually reaches the storefront", () => {
  it.each([
    ["app/api/reviews/showcase/route.ts", "the store-wide endpoint"],
    ["app/api/reviews/list/route.ts", "the product endpoint"],
  ])("%s selects both fields", (rel) => {
    // A field the widget renders but the route never selects is silently
    // always empty, with every other test still green.
    const route = read(rel);
    expect(route).toContain("customerLocation: true");
    expect(route).toContain("verifiedPurchase: true");
  });
});

describe("the review forms ask for a location", () => {
  it.each([
    ["public/widget.js", "the public widget"],
    ["extensions/rivu-reviews/assets/rivu-widget.js", "the theme extension widget"],
  ])("%s offers the field in every form template, and sends it", (rel) => {
    const src = read(rel);
    // Four form templates ship (basic, card, minimal, dark). A field missing
    // from one means the pill never appears for merchants using that one.
    const inputs = src.match(/name="customerLocation"/g) || [];
    expect(inputs).toHaveLength(4);
    expect(src).toContain("customerLocation: form.customerLocation?.value");
  });

  it("the QR review page asks too, and sends it", () => {
    const flow = read("components/ReviewFlow.tsx");
    expect(flow).toContain("setCustomerLocation");
    expect(flow).toContain("customerLocation: customerLocation.trim() || undefined");
  });

  it("keeps it optional everywhere", () => {
    // A required field on a review form costs more reviews than the pill is
    // worth.
    const flow = read("components/ReviewFlow.tsx");
    expect(flow).toMatch(/customerLocation[\s\S]{0,400}?placeholder="Optional/);
    for (const rel of ["public/widget.js", "extensions/rivu-reviews/assets/rivu-widget.js"]) {
      const src = read(rel);
      const field = src.slice(src.indexOf('name="customerLocation"'));
      expect(field.slice(0, 200)).not.toContain("required");
    }
  });

  it("caps the length the same way the API does", () => {
    // maxlength 60 in the form, .max(60) in the schema — a mismatch means a
    // shopper writes something and is rejected without being told why.
    const api = read("app/api/reviews/submit/route.ts");
    expect(api).toMatch(/customerLocation[\s\S]{0,300}?max\(60\)/);
    for (const rel of ["public/widget.js", "extensions/rivu-reviews/assets/rivu-widget.js"]) {
      expect(read(rel)).toContain('name="customerLocation" maxlength="60"');
    }
    expect(read("components/ReviewFlow.tsx")).toContain("maxLength={60}");
  });
});
