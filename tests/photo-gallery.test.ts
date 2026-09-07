// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";

/**
 * The Pro photo gallery and its lightbox.
 *
 * Modelled on the Loox layout the merchant asked for: a wall of customer
 * photos, and clicking one opens the full review beside the picture with a
 * link back to the product.
 *
 * Run in a real DOM, because the lightbox is entirely interaction — opening,
 * closing, focus, the page behind not scrolling. None of that can be checked
 * by looking at a string of HTML.
 */

const repoRoot = path.resolve(__dirname, "..");
const script = readFileSync(path.join(repoRoot, "public/rivu-showcase.js"), "utf8");

const REVIEWS = [
  {
    id: "r1",
    productId: "1",
    productTitle: "3.2Ct Princess D's Oval Solitaire Silver Ring",
    productHandle: "princess-oval-ring",
    productImageUrl: "https://img.test/ring.jpg",
    rating: 5,
    reviewTitle: null,
    body: "Very nice, authentic product. Stones shine.",
    customerName: "Archana Kumari",
    photoUrl: "https://img.test/hand.jpg",
    videoUrl: null,
    createdAt: "2026-09-02T10:00:00Z",
    pinnedAt: null,
    ownerReply: null,
    verified: true,
  },
  {
    id: "r2",
    productId: "2",
    productTitle: "5Ct Cushion 3-Stone Solitaire Silver Ring",
    // No handle: written before the column existed.
    productHandle: null,
    productImageUrl: null,
    rating: 4,
    reviewTitle: null,
    body: "The product is excellent but communication is a little delayed.",
    customerName: "Hemamrutha P",
    photoUrl: "https://img.test/hand2.jpg",
    videoUrl: null,
    createdAt: "2026-08-23T10:00:00Z",
    pinnedAt: null,
    ownerReply: "Sorry about the delay — we've fixed our process since.",
    verified: false,
  },
];

function setUp(dataset: Record<string, string>, plan = "pro") {
  document.body.innerHTML = "";
  const el = document.createElement("div");
  el.setAttribute("data-rivu-showcase", "");
  for (const [k, v] of Object.entries(dataset)) {
    el.setAttribute("data-" + k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()), v);
  }
  document.body.appendChild(el);

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        reviews: REVIEWS,
        summary: { total: 2, average: 4.5 },
        plan,
      }),
    }))
  );
  return el;
}

async function run(el: Element) {
  new Function(script)();
  for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 10));
  return el;
}

const BASE = {
  shop: "s.myshopify.com",
  apiBase: "https://rivu.test",
  layout: "gallery",
  columns: "4",
};

beforeEach(() => {
  document.body.innerHTML = "";
  document.documentElement.style.overflow = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.querySelectorAll(".rivu-sc-lightbox").forEach((n) => n.remove());
});

describe("the gallery wall", () => {
  it("renders a tile per review, in columns", async () => {
    const el = await run(setUp(BASE));
    expect(el.querySelector(".rivu-sc-gallery")).toBeTruthy();
    expect(el.querySelectorAll(".rivu-sc-tile").length).toBe(2);
    expect((el.innerHTML as string)).toContain("column-count:4");
  });

  it("leads with the photo", async () => {
    // A photo-led wall works because the picture is the claim; leading with
    // text makes it a list that happens to have images.
    const el = await run(setUp(BASE));
    const tile = el.querySelector(".rivu-sc-tile");
    expect(tile?.firstElementChild?.tagName.toLowerCase()).toBe("img");
  });

  it("shows who wrote it, when, and the rating", async () => {
    const el = await run(setUp(BASE));
    const html = el.innerHTML;
    expect(html).toContain("Archana K.");
    expect(html).toContain("02/09/2026");
    expect(html).toContain("rivu-sc-verified");
  });

  it("links the product strip only when a handle exists", async () => {
    // A review written before productHandle existed has none, and a dead link
    // is worse than no link.
    const el = await run(setUp(BASE));
    const tiles = el.querySelectorAll(".rivu-sc-tile");
    expect(tiles[0].querySelector('a[href="/products/princess-oval-ring"]')).toBeTruthy();
    expect(tiles[1].querySelector("a")).toBeNull();
    // The product is still named, just not linked.
    expect(tiles[1].innerHTML).toContain("5Ct Cushion");
  });

  it("escapes review and product text", async () => {
    document.body.innerHTML = "";
    const el = document.createElement("div");
    el.setAttribute("data-rivu-showcase", "");
    for (const [k, v] of Object.entries(BASE)) {
      el.setAttribute("data-" + k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()), v);
    }
    document.body.appendChild(el);
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        reviews: [{ ...REVIEWS[0], body: "<script>window.pwned=1</script>" }],
        summary: { total: 1, average: 5 },
        plan: "pro",
      }),
    })));
    await run(el);
    expect(el.innerHTML).not.toContain("<script>window.pwned");
    expect(el.innerHTML).toContain("&lt;script&gt;");
  });
});

describe("the lightbox", () => {
  async function openFirstTile() {
    const el = await run(setUp(BASE));
    const tile = el.querySelector(".rivu-sc-tile") as HTMLElement;
    tile.click();
    return { el, tile, box: document.querySelector(".rivu-sc-lightbox") as HTMLElement };
  }

  it("opens when a tile is clicked", async () => {
    const { box } = await openFirstTile();
    expect(box).toBeTruthy();
    expect(box.hidden).toBe(false);
    expect(box.innerHTML).toContain("Very nice, authentic product");
  });

  it("shows the photo large and the review beside it", async () => {
    const { box } = await openFirstTile();
    expect(box.querySelector("img")?.getAttribute("src")).toBe("https://img.test/hand.jpg");
    expect(box.innerHTML).toContain("Archana K.");
  });

  it("offers a link to the product", async () => {
    const { box } = await openFirstTile();
    const link = box.querySelector('a[href="/products/princess-oval-ring"]');
    expect(link).toBeTruthy();
    expect(box.innerHTML).toContain("View product");
  });

  it("omits the product button when there is no handle", async () => {
    const el = await run(setUp(BASE));
    (el.querySelectorAll(".rivu-sc-tile")[1] as HTMLElement).click();
    const box = document.querySelector(".rivu-sc-lightbox") as HTMLElement;
    expect(box.innerHTML).not.toContain("View product");
  });

  it("includes the store owner's reply", async () => {
    const el = await run(setUp(BASE));
    (el.querySelectorAll(".rivu-sc-tile")[1] as HTMLElement).click();
    const box = document.querySelector(".rivu-sc-lightbox") as HTMLElement;
    expect(box.innerHTML).toContain("Store owner reply");
    expect(box.innerHTML).toContain("fixed our process");
  });

  it("closes on Escape", async () => {
    // A modal that traps a keyboard user is worse than no modal.
    const { box } = await openFirstTile();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(box.hidden).toBe(true);
  });

  it("closes on a backdrop click but not a click inside the panel", async () => {
    const { box } = await openFirstTile();
    (box.querySelector(".rivu-sc-lightbox-panel") as HTMLElement).click();
    expect(box.hidden).toBe(false);
    box.click();
    expect(box.hidden).toBe(true);
  });

  it("closes on the close button", async () => {
    const { box } = await openFirstTile();
    (box.querySelector(".rivu-sc-lightbox-close") as HTMLElement).click();
    expect(box.hidden).toBe(true);
  });

  it("stops the page behind it from scrolling, and restores it", async () => {
    const { box } = await openFirstTile();
    expect(document.documentElement.style.overflow).toBe("hidden");
    (box.querySelector(".rivu-sc-lightbox-close") as HTMLElement).click();
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("moves focus to the close button, and back on close", async () => {
    const { tile, box } = await openFirstTile();
    expect(document.activeElement?.className).toContain("rivu-sc-lightbox-close");
    (box.querySelector(".rivu-sc-lightbox-close") as HTMLElement).click();
    expect(document.activeElement).toBe(tile);
  });

  it("does not open when the product link inside a tile is clicked", async () => {
    // That click is a navigation, not a request to zoom.
    const el = await run(setUp(BASE));
    const link = el.querySelector(".rivu-sc-tile a") as HTMLElement;
    link.click();
    const box = document.querySelector(".rivu-sc-lightbox") as HTMLElement | null;
    expect(box === null || box.hidden).toBe(true);
  });

  it("mounts one dialog for the block, not one per tile", async () => {
    // Thirty reviews must not put thirty hidden dialogs in the page.
    await run(setUp(BASE));
    expect(document.querySelectorAll(".rivu-sc-lightbox").length).toBe(1);
  });

  it("mounts one dialog even if the block renders twice", async () => {
    // The rvRendered flag already stops a second render, so this guard is
    // belt-and-braces — but a theme editor reload or a future change that
    // allows re-rendering would otherwise leave a second dialog behind, and
    // Escape would then close only one of them.
    const el = await run(setUp(BASE));
    (el as HTMLElement).removeAttribute("data-rv-rendered");
    delete (el as HTMLElement).dataset.rvRendered;
    document.dispatchEvent(new Event("shopify:section:load"));
    for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 10));

    expect(document.querySelectorAll(".rivu-sc-lightbox").length).toBe(1);
  });
});

describe("the gallery is a paid layout", () => {
  it("renders nothing on a free plan storefront", async () => {
    const el = await run(setUp(BASE, "free"));
    expect(el.innerHTML).toBe("");
    expect((el as HTMLElement).style.display).toBe("none");
  });

  it("explains itself in the theme editor instead", async () => {
    vi.stubGlobal("Shopify", { designMode: true });
    const el = await run(setUp(BASE, "free"));
    expect(el.innerHTML).toContain("part of Pro");
    vi.unstubAllGlobals();
  });

  it("renders for pro", async () => {
    const el = await run(setUp(BASE, "pro"));
    expect(el.querySelectorAll(".rivu-sc-tile").length).toBe(2);
  });

  it("honours a legacy growth subscription", async () => {
    const el = await run(setUp(BASE, "growth"));
    expect(el.querySelectorAll(".rivu-sc-tile").length).toBe(2);
  });

  it("checks the plan the server reports, not a block setting", async () => {
    // Otherwise a merchant unlocks it by editing Liquid.
    expect(script).toContain('plan !== "pro" && plan !== "growth"');
    expect(script).toContain('var plan = data.plan || "free";');
  });

  it("does not gate the free layouts", async () => {
    const el = await run(setUp({ ...BASE, layout: "grid" }, "free"));
    expect(el.querySelectorAll(".rivu-sc-card").length).toBe(2);
  });
});

describe("the endpoint supports the gallery", () => {
  const route = readFileSync(
    path.join(repoRoot, "app/api/reviews/showcase/route.ts"),
    "utf8"
  );

  it("reports the plan", () => {
    expect(route).toContain("plan: shopRecord.plan");
  });

  it("sends the product handle and image", () => {
    expect(route).toContain("productHandle: true");
    expect(route).toContain("productImageUrl: true");
  });
});

describe("the Photo Gallery block", () => {
  const blocksDir = path.join(repoRoot, "extensions/rivu-reviews/blocks");

  it("exists and is a section", () => {
    const files = readdirSync(blocksDir);
    expect(files).toContain("photo-gallery.liquid");
  });

  it("says it is a Pro feature in the editor", () => {
    const src = readFileSync(path.join(blocksDir, "photo-gallery.liquid"), "utf8");
    expect(src).toContain("Pro plan");
  });

  it("defaults to photos only", () => {
    // A photo wall of text-only reviews is not a photo wall.
    const src = readFileSync(path.join(blocksDir, "photo-gallery.liquid"), "utf8");
    const schema = JSON.parse(src.match(/{% schema %}([\s\S]*?){% endschema %}/)![1]);
    const photosOnly = schema.settings.find((s: { id?: string }) => s.id === "photos_only");
    expect(photosOnly.default).toBe(true);
  });
});

describe("the product handle is captured when a review is written", () => {
  it("is accepted by the submit route", () => {
    const route = readFileSync(
      path.join(repoRoot, "app/api/reviews/submit/route.ts"),
      "utf8"
    );
    expect(route).toContain("productHandle:");
  });

  it("is read from the dataset and sent by both widget copies", () => {
    for (const rel of [
      "public/widget.js",
      "extensions/rivu-reviews/assets/rivu-widget.js",
    ]) {
      const src = readFileSync(path.join(repoRoot, rel), "utf8");
      // Destructured as well as sent: referencing it without destructuring is
      // a ReferenceError at submit time, which is how one copy shipped once.
      expect(src, `${rel} does not destructure it`).toMatch(
        /const \{[^}]*productHandle[^}]*\} = el\.dataset;/
      );
      expect(src, `${rel} does not send it`).toContain("productHandle: productHandle");
    }
  });

  it("is supplied by the product review block", () => {
    const src = readFileSync(
      path.join(repoRoot, "extensions/rivu-reviews/blocks/reviews.liquid"),
      "utf8"
    );
    expect(src).toContain('data-product-handle="{{ product.handle }}"');
  });
});
