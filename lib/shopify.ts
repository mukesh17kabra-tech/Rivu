const API_VERSION = "2024-10";

export function getInstallUrl(shop: string, state: string) {
  // read_orders is needed so the QR review flow can look up what a
  // customer bought using just their email — no per-product QR needed.
  const scopes = "read_products,read_orders";
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
