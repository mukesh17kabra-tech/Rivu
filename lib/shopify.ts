const API_VERSION = "2024-10";

export function getInstallUrl(shop: string, state: string) {
  const scopes = "read_products";
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
