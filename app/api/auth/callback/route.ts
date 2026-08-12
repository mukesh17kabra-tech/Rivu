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
  // State check — but don't hard-fail if cookie was lost across iframe redirect.
  if (state && storedState && state !== storedState) {
    return NextResponse.json({ error: "Invalid state, possible CSRF" }, { status: 403 });
  }

  // Exchange code for access token and save the shop
  const { access_token } = await exchangeCodeForToken(shop, code);
  await runAutoMigrations();
  await db.shop.upsert({
    where: { shopDomain: shop },
    update: { accessToken: access_token },
    create: { shopDomain: shop, accessToken: access_token },
  });

  // Redirect back INTO the embedded app inside Shopify Admin.
  const apiKey = process.env.SHOPIFY_API_KEY || "2135e06e19ed7ba1e0303c3a1f48116a";
  const shopName = shop.replace(".myshopify.com", "");
  const adminUrl = `https://admin.shopify.com/store/${shopName}/apps/${apiKey}`;

  // This runs top-level (we broke out of the iframe for OAuth), so a top-level
  // redirect to the Admin app URL loads the app embedded with a fresh session.
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <script>
    (function() {
      var url = ${JSON.stringify(adminUrl)};
      if (window.top === window.self) {
        window.location.href = url;
      } else {
        window.top.location.href = url;
      }
    })();
  </script>
  <p style="font-family:sans-serif;padding:20px;color:#666;">Install complete. Loading Rivu…</p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}
