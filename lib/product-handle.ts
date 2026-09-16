import { adminFetch } from "./shopify";

/**
 * A product's storefront handle, looked up from its Shopify id.
 *
 * Every "View product" link in Rivu is built as /products/<handle>, and
 * Shopify offers no equivalent route by numeric id — so a review without a
 * handle can never link to the thing it is about, in the gallery, the
 * lightbox, the spotlight card or the review popup. It just shows the product
 * name as dead text.
 *
 * That is most reviews, because only the product-page widget ever sent one.
 * A review left through a QR code, a review-request email, or imported from
 * another app arrived with an id and a title and nothing else.
 *
 * So the handle is resolved here at write time, rather than being required
 * from whatever happened to submit the review.
 *
 * Every failure is soft. A review must be saved even if Shopify is slow, the
 * product was deleted, or the token needs refreshing — a missing link is a
 * small loss, a dropped review is somebody's lost writing.
 */

/**
 * Handles already looked up, keyed by shop and product.
 *
 * A review-request email going out to a hundred customers for one product
 * would otherwise make a hundred identical Admin API calls. Process-local and
 * deliberately unbounded-but-small: serverless instances are short-lived, and
 * a store has far fewer products than the memory this could ever cost.
 */
const cache = new Map<string, string | null>();

/** Strips the gid:// wrapper Shopify uses in GraphQL responses. */
export function numericProductId(productId: string): string | null {
  const raw = String(productId || "").trim();
  if (/^\d+$/.test(raw)) return raw;
  const gid = raw.match(/^gid:\/\/shopify\/Product\/(\d+)$/);
  if (gid) return gid[1];
  return null;
}

/**
 * True when this value is already a usable storefront handle.
 *
 * Imports from Judge.me and Loox often put the handle in the product id
 * column, which is worth recognising rather than throwing an Admin API call
 * at a value that is already the answer.
 */
export function looksLikeHandle(value: string): boolean {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 255) return false;
  // Shopify handles are lowercase alphanumerics and hyphens.
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw) && !/^\d+$/.test(raw);
}

export async function resolveProductHandle(
  shop: string,
  productId: string,
  fetchHandle: (shop: string, id: string) => Promise<string | null> = fetchFromShopify
): Promise<string | null> {
  if (!shop || !productId) return null;

  if (looksLikeHandle(productId)) return productId.trim();

  const id = numericProductId(productId);
  if (!id) return null;

  const key = `${shop}:${id}`;
  // `has`, not a truthiness check: a previous lookup that found nothing is
  // cached as null and must not be retried on every review.
  if (cache.has(key)) return cache.get(key) ?? null;

  let handle: string | null = null;
  try {
    handle = await fetchHandle(shop, id);
  } catch {
    // Soft by design — see the note at the top. Not cached, so a transient
    // failure can be retried by the next review rather than being remembered
    // as "this product has no handle".
    return null;
  }

  cache.set(key, handle);
  return handle;
}

async function fetchFromShopify(shop: string, id: string): Promise<string | null> {
  const res = await adminFetch(shop, `products/${id}.json?fields=handle`);
  if (!res.ok) return null;
  const data = await res.json();
  const handle = data?.product?.handle;
  return typeof handle === "string" && handle ? handle : null;
}

/** Test seam: lets a suite start from a known cache. */
export function __clearHandleCache() {
  cache.clear();
}
