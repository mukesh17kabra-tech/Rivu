const API_VERSION = "2024-10";

export function getInstallUrl(shop: string, state: string) {
  // read_orders is needed so the QR review flow can look up what a
  // customer bought using just their email — no per-product QR needed.
  const scopes = "read_products,read_orders,write_discounts";
  const redirectUri = `${process.env.HOST}/api/auth/callback`;
  const clientId = process.env.SHOPIFY_API_KEY;
  return (
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${clientId}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(redirectUri!)}` +
    `&state=${state}`
  );
}

export async function exchangeCodeForToken(shop: string, code: string) {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json() as Promise<{ access_token: string; scope: string }>;
}

// Used by the QR code generator page so merchants can pick a product
// without needing to know its raw Shopify product ID.
export async function getProducts(shop: string, accessToken: string) {
  const res = await fetch(
    `https://${shop}/admin/api/${API_VERSION}/products.json?limit=100&fields=id,title,image`,
    { headers: { "X-Shopify-Access-Token": accessToken } }
  );
  if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
  const data = await res.json();
  return data.products as { id: number; title: string; image?: { src: string } }[];
}

// Powers the generic (non-per-product) QR flow: customer scans one QR,
// enters their email, and this looks up which product(s) they actually
// bought so the review form knows what to ask about — no per-product QR
// codes needed at all.
export async function getProductsFromOrdersByEmail(
  shop: string,
  accessToken: string,
  email: string
) {
  const res = await fetch(
    `https://${shop}/admin/api/${API_VERSION}/orders.json?email=${encodeURIComponent(email)}&status=any&limit=10`,
    { headers: { "X-Shopify-Access-Token": accessToken } }
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
  accessToken: string,
  params: { type: "percentage" | "fixed_amount"; value: number }
) {
  const code = `REVIEW-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const priceRuleRes = await fetch(`https://${shop}/admin/api/${API_VERSION}/price_rules.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
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

  const discountRes = await fetch(
    `https://${shop}/admin/api/${API_VERSION}/price_rules/${priceRuleId}/discount_codes.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ discount_code: { code } }),
    }
  );

  if (!discountRes.ok) {
    throw new Error(`Failed to create discount code: ${discountRes.status} ${await discountRes.text()}`);
  }

  return code;
}
