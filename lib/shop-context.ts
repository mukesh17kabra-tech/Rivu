import { redirect } from "next/navigation";
import { db } from "./db";

const SHOP_DOMAIN = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

export function isValidShopDomain(shop: string | undefined | null): boolean {
  return !!shop && SHOP_DOMAIN.test(shop);
}

// Shopify doesn't always pass a plain `shop` query param when opening an
// embedded app from Admin — sometimes just `host` (base64 of the shop's
// admin URL). Every page that needs the shop domain uses this helper.
export function resolveShop(shopParam?: string, host?: string): string | null {
  if (isValidShopDomain(shopParam)) return shopParam!;
  if (!host) return null;
  try {
    // `host` is base64url of e.g. "admin.shopify.com/store/my-store" (new
    // Admin) or "my-store.myshopify.com/admin" (legacy). Handle both.
    const decoded = Buffer.from(
      host.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf-8");

    const legacy = decoded.match(/^([a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com)/);
    if (legacy) return legacy[1];

    const modern = decoded.match(/\/store\/([a-zA-Z0-9][a-zA-Z0-9-]*)/);
    if (modern) return `${modern[1]}.myshopify.com`;

    return null;
  } catch {
    return null;
  }
}

/** Rebuilds the query string that every in-app link needs to carry. */
export function shopQuery(shop: string, host?: string): string {
  const params = new URLSearchParams({ shop });
  if (host) params.set("host", host);
  return params.toString();
}

export type ShopRecord = Awaited<ReturnType<typeof db.shop.findUnique>>;

/**
 * Guard used by every dashboard page.
 *
 * Pages used to print "Shop not found. Please reinstall the app." and stop
 * there, which left merchants (and App Store reviewers) staring at a
 * dead end with nothing to click. Instead we send them back to the app
 * entry point, which re-runs token exchange and registers the shop — the
 * app heals itself instead of demanding a reinstall.
 *
 * Database problems are deliberately allowed to throw so that
 * `app/error.tsx` renders a real in-app retry screen rather than each page
 * inventing its own error text.
 */
export async function requireShop(
  shopParam?: string,
  host?: string
): Promise<{ shop: string; host?: string; shopRecord: NonNullable<ShopRecord> }> {
  const shop = resolveShop(shopParam, host);

  if (!shop) {
    // No usable shop in the URL: bounce to the entry point, which can pick
    // the shop up from a session token instead.
    redirect("/");
  }

  // Transient connection failures are retried inside the Prisma client; a
  // genuine outage throws through to app/error.tsx.
  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord?.accessToken) {
    redirect(`/?${shopQuery(shop, host)}`);
  }

  return { shop, host, shopRecord };
}
