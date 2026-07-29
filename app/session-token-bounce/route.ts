/**
 * Session token bounce page — required by Shopify embedded app spec.
 * Returns bare HTML with App Bridge meta tag + script.
 * App Bridge uses shopify-reload param to redirect back after getting session token.
 */
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = process.env.SHOPIFY_API_KEY || "";
  const shopifyReload = req.nextUrl.searchParams.get("shopify-reload") || "";
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="shopify-api-key" content="${apiKey}" />
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
</head>
<body>
  <p style="font-family:sans-serif;padding:20px;color:#666;">Authenticating...</p>
  ${shopifyReload ? `<script>
    document.addEventListener('DOMContentLoaded', function() {
      if (window.shopify) {
        window.location.href = ${JSON.stringify(shopifyReload)};
      }
    });
  </script>` : ''}
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}
