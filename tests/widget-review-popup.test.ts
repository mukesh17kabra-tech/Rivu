// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * The review popup on the product widget.
 *
 * Clicking a photo used to open the picture alone. That is fine for a
 * thumbnail and wrong for a photo gallery: a shopper clicks a customer photo
 * because they want the story behind it and the product it belongs to.
 *
 * Run in a real DOM — the popup is interaction, and none of opening, closing,
 * focus or the page behind not scrolling can be checked by reading HTML.
 */

const repoRoot = path.resolve(__dirname, "..");
const sources: [string, string][] = [
  ["public widget", "public/widget.js"],
  ["theme extension widget", "extensions/rivu-reviews/assets/rivu-widget.js"],
];

const REVIEW: Record<string, unknown> = {
  id: "r1",
  rating: 5,
  reviewTitle: "Beautiful ring",
  body: "Too good, love the quality, it shines. Will surely buy more.",
  customerName: "Tonitoli C",
  createdAt: "2026-06-18T10:00:00Z",
  photoUrl: "https://img.test/ring-photo.jpg",
  videoUrl: null,
  recommends: true,
  ownerReply: "Thank you so much!",
  productTitle: "CELINE SILVER STACKABLE DIAMOND BAND",
  productHandle: "celine-silver-band",
  productImageUrl: "https://img.test/product.jpg",
  helpfulCount: 0,
  unhelpfulCount: 0,
  pinnedAt: null,
};

function setUp(design: Record<string, unknown>, review = REVIEW) {
  document.body.innerHTML = "";
  const target = document.createElement("div");
  target.className = "rivu-review-widget";
  target.dataset.shop = "s.myshopify.com";
  target.dataset.productId = "1";
  target.dataset.productTitle = "Ring";
  target.dataset.apiBase = "https://rivu.test";
  document.body.appendChild(target);

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      text: async () => "",
      json: async () =>
        String(url).includes("/api/reviews/list")
          ? {
              reviews: [review],
              summary: {
                total: 1,
                average: 5,
                breakdown: [5, 4, 3, 2, 1].map((s) => ({
                  star: s,
                  count: s === 5 ? 1 : 0,
                  percentage: s === 5 ? 100 : 0,
                })),
                recommend: null,
              },
              plan: "pro",
              availableLanguages: [{ code: "en", label: "English" }],
              design,
            }
          : { items: [], suggestions: [] },
    }))
  );
  return target;
}

async function run(source: string, target: Element) {
  new Function(readFileSync(path.join(repoRoot, source), "utf8"))();
  for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 20));
  return target;
}

const GALLERY = {
  customTemplateEnabled: false,
  summaryLayout: "modern",
  displayStyle: "list",
  cardDesign: "gallery",
  richSnippetsEnabled: false,
  gridColumns: 3,
};

beforeEach(() => {
  document.body.innerHTML = "";
  document.documentElement.style.overflow = "";
});

afterEach(() => vi.unstubAllGlobals());

describe.each(sources)("%s review popup", (_name, source) => {
  async function openPhoto() {
    const target = setUp(GALLERY);
    await run(source, target);
    const thumb = target.querySelector(".rv-media-thumb") as HTMLElement;
    expect(thumb, "no photo to click").toBeTruthy();
    thumb.click();
    const back = target.querySelector(".rv-lightbox-back") as HTMLElement;
    return { target, thumb, back };
  }

  it("opens when the photo is clicked", async () => {
    const { back } = await openPhoto();
    expect(back.style.display).toBe("flex");
  });

  it("shows the photo large", async () => {
    const { back } = await openPhoto();
    const img = back.querySelector(".rv-lb-media img") as HTMLImageElement;
    expect(img?.getAttribute("src")).toBe("https://img.test/ring-photo.jpg");
  });

  it("shows the review beside it, not the photo alone", async () => {
    // The whole point of the change.
    const { back } = await openPhoto();
    const detail = back.querySelector(".rv-lb-detail") as HTMLElement;
    expect(detail.innerHTML).toContain("Tonitoli C");
    expect(detail.innerHTML).toContain("love the quality");
    expect(detail.innerHTML).toContain("Beautiful ring");
  });

  it("shows the store owner's reply", async () => {
    const { back } = await openPhoto();
    expect(back.innerHTML).toContain("Store owner reply");
    expect(back.innerHTML).toContain("Thank you so much");
  });

  it("names the product and links to it", async () => {
    const { back } = await openPhoto();
    expect(back.innerHTML).toContain("CELINE SILVER STACKABLE DIAMOND BAND");
    const link = back.querySelector('a[href="/products/celine-silver-band"]');
    expect(link).toBeTruthy();
    expect(link?.textContent).toContain("View product");
  });

  it("omits the product button when the handle is missing", async () => {
    // Reviews written before the handle column exists have none, and a dead
    // link is worse than no link.
    const target = setUp(GALLERY, { ...REVIEW, productHandle: null });
    await run(source, target);
    (target.querySelector(".rv-media-thumb") as HTMLElement).click();
    const back = target.querySelector(".rv-lightbox-back") as HTMLElement;
    expect(back.innerHTML).not.toContain("View product");
    // The product is still named.
    expect(back.innerHTML).toContain("CELINE SILVER");
  });

  it("escapes everything it renders", async () => {
    const target = setUp(GALLERY, {
      ...REVIEW,
      body: "<script>window.pwned=1</script>",
      customerName: "<img onerror=x>",
    });
    await run(source, target);
    (target.querySelector(".rv-media-thumb") as HTMLElement).click();
    const back = target.querySelector(".rv-lightbox-back") as HTMLElement;
    expect(back.innerHTML).not.toContain("<script>window.pwned");
    expect(back.innerHTML).toContain("&lt;script&gt;");
  });

  it("closes on Escape", async () => {
    const { back } = await openPhoto();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(back.style.display).toBe("none");
  });

  it("closes on the backdrop but not on a click inside the panel", async () => {
    const { back } = await openPhoto();
    (back.querySelector(".rv-lb-panel") as HTMLElement).click();
    expect(back.style.display).toBe("flex");
    back.click();
    expect(back.style.display).toBe("none");
  });

  it("stops the page behind scrolling, and restores it", async () => {
    const { back } = await openPhoto();
    expect(document.documentElement.style.overflow).toBe("hidden");
    (back.querySelector(".rv-lb-close") as HTMLElement).click();
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("returns focus to the photo it was opened from", async () => {
    const { thumb, back } = await openPhoto();
    expect(document.activeElement?.className).toContain("rv-lb-close");
    (back.querySelector(".rv-lb-close") as HTMLElement).click();
    expect(document.activeElement).toBe(thumb);
  });

  it("still works from a card in the standard design", async () => {
    // The popup is not gallery-only — any review photo opens it.
    const target = setUp({ ...GALLERY, cardDesign: "standard" });
    await run(source, target);
    (target.querySelector(".rv-media-thumb") as HTMLElement).click();
    const back = target.querySelector(".rv-lightbox-back") as HTMLElement;
    expect(back.style.display).toBe("flex");
    expect(back.innerHTML).toContain("Tonitoli C");
  });
});

describe("the list route sends what the popup needs", () => {
  const route = readFileSync(
    path.join(repoRoot, "app/api/reviews/list/route.ts"),
    "utf8"
  );

  it("selects the product fields", () => {
    // The popup tests stub the fetch, so they cannot see the route dropping
    // these — the product strip and View product button would simply vanish
    // with every test still green.
    for (const field of ["productTitle", "productHandle", "productImageUrl"]) {
      expect(route, `${field} is not selected`).toContain(`${field}: true`);
    }
  });

  it("sends the card design to the widget", () => {
    // Every key the widget's defaults object knows must actually arrive, or
    // the merchant's choice is silently ignored.
    expect(route).toContain("cardDesign:");
  });
});
