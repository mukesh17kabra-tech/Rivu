import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/shopify";
import { db } from "@/lib/db";
import { runAutoMigrations } from "@/lib/db-migrate";

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const host = req.nextUrl.searchParams.get("host");
  const storedState = req.cookies.get("shopify_oauth_state")?.value;

  if (!shop || !code) {
    return NextResponse.json({ error: "Missing shop or code" }, { status: 400 });
  }
  if (!state || state !== storedState) {
    return NextResponse.json({ error: "Invalid state, possible CSRF" }, { status: 403 });
  }

  const { access_token } = await exchangeCodeForToken(shop, code);
  await runAutoMigrations();
  await db.shop.upsert({
    where: { shopDomain: shop },
    update: { accessToken: access_token },
    create: { shopDomain: shop, accessToken: access_token },
  });

  const params = new URLSearchParams({ shop });
  if (host) params.set("host", host);
  const target = `/dashboard/home?${params.toString()}`;

  // Embedded apps must break OUT of the OAuth popup/iframe and reload the
  // app inside Shopify Admin. A plain server redirect keeps us in the iframe
  // with no session token. Use App Bridge to redirect to the app's admin URL.
  const apiKey = process.env.SHOPIFY_API_KEY || "2135e06e19ed7ba1e0303c3a1f48116a";
  const shopName = shop.replace(".myshopify.com", "");
  const adminAppUrl = `https://admin.shopify.com/store/${shopName}/apps/${apiKey}${target.replace("/dashboard/home", "/dashboard/home")}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="shopify-api-key" content="${apiKey}" />
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
</head>
<body>
  <script>
    // If loaded inside Shopify's iframe, use App Bridge to redirect to the
    // embedded app URL. Otherwise do a top-level redirect to Admin.
    (function() {
      var target = ${JSON.stringify(target)};
      if (window.top === window.self) {
        // Not embedded — redirect to the Admin app URL to load embedded
        window.location.href = ${JSON.stringify(adminAppUrl)};
      } else {
        // Embedded — App Bridge handles navigation
        window.location.href = target;
      }
    })();
  </script>
  <p style="font-family:sans-serif;padding:20px;color:#666;">Loading Rivu...</p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}
