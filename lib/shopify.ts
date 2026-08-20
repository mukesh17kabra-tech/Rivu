import { appUrl } from "./app-url";
import {
  getValidAccessToken,
  ReauthRequiredError,
  type TokenResponse,
} from "./access-token";

const API_VERSION = "2024-10";

export function getInstallUrl(shop: string, state: string) {
  // read_orders is needed so the QR review flow can look up what a
  // customer bought using just their email — no per-product QR needed.
  const scopes = "read_products,read_orders,write_discounts";
  // appUrl() rather than process.env.HOST directly: an unset env var used to
  // produce "undefined/api/auth/callback", which Shopify rejects outright
  // with an unrecoverable "redirect_uri is not whitelisted" error page.
  const redirectUri = `${appUrl()}/api/auth/callback`;
  const clientId = process.env.SHOPIFY_API_KEY;
  return (
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${clientId}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`
  );
}

export async function exchangeCodeForToken(shop: string, code: string) {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: process.env.SHOPIFY_API_KEY!,
      client_secret: process.env.SHOPIFY_API_SECRET!,
      code,
      // The Admin API rejects non-expiring offline tokens with a 403, so
      // ask for an expiring one here too — same as token exchange.
      expiring: "1",
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Token exchange failed: ${res.status} ${await res.text().catch(() => "")}`
    );
  }
  return res.json() as Promise<TokenResponse>;
}

const GRAPHQL_VERSION = "2025-01";

/**
 * Admin GraphQL request. Used for the things that have no usable REST
 * equivalent — notably reading the merchant's active app subscription, which
 * is how plan state is determined under Shopify Managed Pricing.
 */
export async function adminGraphQL<T>(
  shop: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const accessToken = await getValidAccessToken(shop);

  const res = await fetch(
    `https://${shop}/admin/api/${GRAPHQL_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  if (res.status === 401 || res.status === 403) {
    throw new ReauthRequiredError(shop, `Admin GraphQL returned ${res.status}`);
  }
  if (!res.ok) {
    throw new Error(
      `Admin GraphQL failed: ${res.status} ${await res.text().catch(() => "")}`
    );
  }

  const payload = (await res.json()) as { data?: T; errors?: unknown };
  if (payload.errors) {
    throw new Error(`Admin GraphQL errors: ${JSON.stringify(payload.errors)}`);
  }
  return payload.data as T;
}

/**
 * Every Admin API request goes through here so the access token is rotated
 * before use. A token rejection is surfaced as ReauthRequiredError, which
 * callers turn into a re-authorization redirect instead of an error page.
 */
export async function adminFetch(
  shop: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const accessToken = await getValidAccessToken(shop);

  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "X-Shopify-Access-Token": accessToken,
    },
  });

  if (res.status === 401 || res.status === 403) {
    const body = await res.text().catch(() => "");
    // Distinguish "this token is no good" from "this scope isn't granted".
    if (/access token|Non-expiring|Invalid API key|unauthorized/i.test(body)) {
      throw new ReauthRequiredError(shop, `Admin API returned ${res.status}`);
    }
    throw new Error(`Admin API ${path} failed: ${res.status} ${body}`);
  }

  return res;
}

// Used by the QR code generator page so merchants can pick a product
// without needing to know its raw Shopify product ID.
export async function getProducts(shop: string) {
  const res = await adminFetch(
    shop,
    `products.json?limit=100&fields=id,title,image`
  );
  if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
  const data = await res.json();
  return data.products as { id: number; title: string; image?: { src: string } }[];
}

// Powers the generic (non-per-product) QR flow: customer scans one QR,
// enters their email, and this looks up which product(s) they actually
// bought so the review form knows what to ask about — no per-product QR
// codes needed at all.
export async function getProductsFromOrdersByEmail(shop: string, email: string) {
  const res = await adminFetch(
    shop,
    `orders.json?email=${encodeURIComponent(email)}&status=any&limit=10`
  );
  if (!res.ok) throw new Error(`Failed to fetch orders: ${res.status}`);
  const data = await res.json();

  type LineItem = { product_id: number; title: string };
  type Order = { line_items: LineItem[] };

  const orders = data.orders as Order[];
  const seen = new Map<number, string>();
  for (const order of orders) {
    for (const item of order.line_items) {
      if (item.product_id && !seen.has(item.product_id)) {
        seen.set(item.product_id, item.title);
      }
    }
  }

  return Array.from(seen.entries()).map(([productId, productTitle]) => ({
    productId: String(productId),
    productTitle,
  }));
}

// Creates a one-time-use discount code as a thank-you for leaving a
// review. Uses the legacy Price Rule + Discount Code REST resources,
// which are simple and reliable for this single-code-at-a-time use case.
export async function createReviewRewardDiscount(
  shop: string,
  params: { type: "percentage" | "fixed_amount"; value: number }
) {
  const code = `REVIEW-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const priceRuleRes = await adminFetch(shop, `price_rules.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      price_rule: {
        title: `Review reward — ${code}`,
        target_type: "line_item",
        target_selection: "all",
        allocation_method: "across",
        value_type: params.type,
        value: params.type === "percentage" ? `-${params.value}` : `-${params.value}`,
        customer_selection: "all",
        usage_limit: 1,
        starts_at: new Date().toISOString(),
      },
    }),
  });

  if (!priceRuleRes.ok) {
    throw new Error(`Failed to create price rule: ${priceRuleRes.status} ${await priceRuleRes.text()}`);
  }

  const priceRuleData = await priceRuleRes.json();
  const priceRuleId = priceRuleData.price_rule.id;

  const discountRes = await adminFetch(
    shop,
    `price_rules/${priceRuleId}/discount_codes.json`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discount_code: { code } }),
    }
  );

  if (!discountRes.ok) {
    throw new Error(`Failed to create discount code: ${discountRes.status} ${await discountRes.text()}`);
  }

  return code;
}

/**
 * Recent orders, for queueing post-purchase review reminders.
 *
 * The orders/create webhook is the primary path; this is the backfill. It
 * covers two gaps a webhook cannot: orders placed before the webhook was
 * enabled — which is every existing merchant's history — and any delivery
 * Shopify fails to make.
 *
 * Reads customer email and name, which requires Protected Customer Data
 * access (approved 2026-08-20). Requests only the fields actually needed
 * rather than whole orders, so the app holds no more customer data than the
 * feature requires.
 */
export async function getRecentOrders(shop: string, sinceIso: string) {
  const fields = "id,email,contact_email,customer,created_at,line_items";
  const res = await adminFetch(
    shop,
    `orders.json?status=any&limit=250&created_at_min=${encodeURIComponent(sinceIso)}&fields=${fields}`
  );
  if (!res.ok) throw new Error(`Failed to fetch orders: ${res.status}`);
  const data = await res.json();

  type LineItem = { product_id: number | null; title: string };
  type Order = {
    id: number;
    email?: string | null;
    contact_email?: string | null;
    customer?: { first_name?: string; last_name?: string } | null;
    created_at?: string;
    line_items?: LineItem[];
  };

  return (data.orders ?? []) as Order[];
}
