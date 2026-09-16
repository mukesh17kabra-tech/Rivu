import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  resolveProductHandle,
  numericProductId,
  looksLikeHandle,
  __clearHandleCache,
} from "@/lib/product-handle";

/**
 * Making a review's product clickable.
 *
 * Rivu links products as /products/<handle> everywhere — the gallery tile, the
 * lightbox, the spotlight card, the review popup — and Shopify offers no
 * equivalent route by numeric id. Only the product-page widget ever sent a
 * handle, so a review left through a QR code or a review-request email, and
 * every imported review, showed its product's name as dead text. A shopper
 * persuaded by a photo had nothing to click.
 */

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

beforeEach(() => __clearHandleCache());

describe("recognising what we were given", () => {
  it("accepts a bare numeric id", () => {
    expect(numericProductId("8452934")).toBe("8452934");
  });

  it("unwraps a GraphQL gid", () => {
    expect(numericProductId("gid://shopify/Product/8452934")).toBe("8452934");
  });

  it("refuses anything else rather than guessing", () => {
    for (const value of ["", "  ", "the-complete-snowboard", "gid://shopify/Order/1"]) {
      expect(numericProductId(value), value).toBeNull();
    }
  });

  it("spots a handle that is already a handle", () => {
    // Judge.me and Loox exports often put the handle in the product id column.
    // Calling Shopify to look up a value that is already the answer is waste.
    expect(looksLikeHandle("the-complete-snowboard")).toBe(true);
    expect(looksLikeHandle("al-hoor-perfume")).toBe(true);
  });

  it("does not mistake an id, a title or a gid for a handle", () => {
    for (const value of ["8452934", "The Complete Snowboard", "gid://shopify/Product/1", ""]) {
      expect(looksLikeHandle(value), value).toBe(false);
    }
  });
});

describe("resolving a handle", () => {
  it("asks Shopify for the handle behind an id", async () => {
    const fetchHandle = vi.fn(async () => "the-complete-snowboard");
    const handle = await resolveProductHandle("s.myshopify.com", "8452934", fetchHandle);
    expect(handle).toBe("the-complete-snowboard");
    expect(fetchHandle).toHaveBeenCalledWith("s.myshopify.com", "8452934");
  });

  it("returns a handle it was already given without calling Shopify", async () => {
    const fetchHandle = vi.fn(async () => "wrong");
    expect(
      await resolveProductHandle("s.myshopify.com", "the-complete-snowboard", fetchHandle)
    ).toBe("the-complete-snowboard");
    expect(fetchHandle).not.toHaveBeenCalled();
  });

  it("asks once per product, however many reviews it has", async () => {
    // A review-request email to a hundred customers for one product must not
    // become a hundred identical Admin API calls.
    const fetchHandle = vi.fn(async () => "a-product");
    for (let i = 0; i < 25; i++) {
      await resolveProductHandle("s.myshopify.com", "99", fetchHandle);
    }
    expect(fetchHandle).toHaveBeenCalledTimes(1);
  });

  it("remembers that a product had no handle, so it is not asked again", async () => {
    const fetchHandle = vi.fn(async () => null);
    await resolveProductHandle("s.myshopify.com", "99", fetchHandle);
    await resolveProductHandle("s.myshopify.com", "99", fetchHandle);
    expect(fetchHandle).toHaveBeenCalledTimes(1);
  });

  it("keeps shops apart, since ids are per-store", async () => {
    const fetchHandle = vi.fn(async (shop: string) =>
      shop === "a.myshopify.com" ? "from-a" : "from-b"
    );
    expect(await resolveProductHandle("a.myshopify.com", "1", fetchHandle)).toBe("from-a");
    expect(await resolveProductHandle("b.myshopify.com", "1", fetchHandle)).toBe("from-b");
  });

  it("returns null instead of throwing when Shopify fails", async () => {
    // A review must save even if the lookup does not. A missing link is a
    // small loss; a dropped review is somebody's lost writing.
    const fetchHandle = vi.fn(async () => {
      throw new Error("502 from Shopify");
    });
    await expect(
      resolveProductHandle("s.myshopify.com", "99", fetchHandle)
    ).resolves.toBeNull();
  });

  it("retries after a failure rather than caching it as 'no handle'", async () => {
    const fetchHandle = vi
      .fn<(shop: string, id: string) => Promise<string | null>>()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce("recovered");
    expect(await resolveProductHandle("s.myshopify.com", "99", fetchHandle)).toBeNull();
    expect(await resolveProductHandle("s.myshopify.com", "99", fetchHandle)).toBe("recovered");
  });

  it("does not call Shopify for an unusable product id", async () => {
    const fetchHandle = vi.fn(async () => "nope");
    expect(await resolveProductHandle("s.myshopify.com", "", fetchHandle)).toBeNull();
    expect(await resolveProductHandle("", "1", fetchHandle)).toBeNull();
    expect(fetchHandle).not.toHaveBeenCalled();
  });
});

describe("new reviews record their own handle", () => {
  const route = read("app/api/reviews/submit/route.ts");

  it("resolves one when the submitter did not send it", () => {
    // The QR flow and the review-request email never send a handle, and that
    // is most reviews on a store that is actually collecting them.
    expect(route).toContain("resolveProductHandle");
    expect(route).toContain("data.productHandle ||");
  });

  it("prefers the handle it was given, since that needs no API call", () => {
    const line = route.slice(route.indexOf("const productHandle ="));
    expect(line.slice(0, 120)).toContain("data.productHandle ||");
  });
});

describe("the repair for reviews already saved", () => {
  const route = read("app/api/reviews/backfill-handles/route.ts");

  it("requires a merchant session, not just a shop parameter", () => {
    // It writes to their reviews. A ?shop= param proves nothing.
    //
    // Asserted on the call and the guard, not on the word: an earlier version
    // of this test matched the import line, so deleting the actual call left
    // the route wide open with the test still green.
    expect(route).toContain("requireSession(req)");
    expect(route).toContain("if (!auth.ok) return auth.response");
    expect(route).toContain('{ error: "Unauthorized" }');
    // And the body's shop must match the session's, or one merchant could
    // repair another's reviews.
    expect(route).toContain("!== auth.shop");
  });

  it("only touches reviews of the shop that asked", () => {
    expect(route).toContain("shopId: shopRecord.id");
  });

  it("only fills in handles that are missing", () => {
    // It must never overwrite a handle that is already correct.
    expect(route).toContain("productHandle: null");
    expect(route).not.toMatch(/productHandle:\s*\{\s*not:/);
  });

  it("looks each product up once, not once per review", () => {
    expect(route).toContain("byProduct");
  });

  it("is bounded, so a large store cannot time out mid-way", () => {
    expect(route).toContain("take: BATCH");
    expect(route).toContain("remaining");
  });

  it("leaves a product it cannot match alone rather than guessing", () => {
    expect(route).toContain("if (!handle)");
    expect(route).toContain("unresolved");
  });
});

describe("the merchant is asked before anything is written", () => {
  const ui = read("components/FixProductLinks.tsx");

  it("only appears when there is something to repair", () => {
    expect(ui).toContain("if (missing === 0");
  });

  it("runs on a click, never on render", () => {
    // It spends their Admin API budget and edits their reviews.
    expect(ui).toContain("onClick={run}");
    expect(ui).not.toContain("useEffect");
  });

  it("says what happened, including what it could not fix", () => {
    expect(ui).toContain("result.updated");
    expect(ui).toContain("result.unresolved");
    expect(ui).toContain("result.remaining");
  });
});

describe("every place a product is shown links to it when it can", () => {
  const showcase = read("public/rivu-showcase.js");

  it("links the gallery tile's product strip", () => {
    expect(showcase).toContain("'<a href=\"/products/' + encodeURIComponent(review.productHandle)");
  });

  it("lets a click on that link navigate instead of opening the lightbox", () => {
    // The tile opens the photo popup on click; the product link inside it has
    // to win, or the merchant's product page is unreachable from the gallery.
    expect(showcase).toContain('e.target.closest("a")');
  });

  it("offers a View product button in the lightbox too", () => {
    expect(showcase).toContain("View product");
  });

  it("shows the product name even with no handle, but does not fake a link", () => {
    const strip = showcase.slice(showcase.indexOf("function productStrip"));
    expect(strip.slice(0, 1200)).toContain("review.productHandle");
    expect(strip.slice(0, 1200)).toContain("<div style=");
  });
});
