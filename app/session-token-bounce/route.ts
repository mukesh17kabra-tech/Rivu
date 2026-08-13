/**
 * Session token bounce page — the App Bridge pattern for obtaining a fresh
 * session token when the app was loaded without one.
 *
 * The page must be *bare*: essentially just the App Bridge script tag
 * carrying `data-api-key`. App Bridge reads the `shopify-reload` param off
 * the current URL and redirects there with a fresh `id_token` appended, all
 * on its own. This mirrors `renderAppBridge` in Shopify's own
 * @shopify/shopify-app-remix.
 *
 * Two things this route used to get wrong, both of which caused the app to
 * never reach its UI:
 *   - it ran its own `window.location.href = shopifyReload` on
 *     DOMContentLoaded, navigating *without* an `id_token`, so the entry
 *     point had nothing to exchange and bounced straight back here;
 *   - `shopify-reload` must be an absolute URL on the app's own origin, not
 *     a bare path.
 */
import { NextRequest, NextResponse } from "next/server";
import { appUrl, isSameOrigin } from "@/lib/app-url";

export async function GET(req: NextRequest) {
  const apiKey =
    process.env.SHOPIFY_API_KEY || process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || "";
  const requested = req.nextUrl.searchParams.get("shopify-reload") || "";

  // Only ever bounce back into this app — never to an attacker-supplied host.
  const fallback = `${appUrl(req)}/`;
  const reload = isSameOrigin(requested, req) ? requested : fallback;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Loading Rivu…</title>
  <script data-api-key="${escapeAttribute(
    apiKey
  )}" src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
</head>
<body style="margin:0;background:#0B0D0F">
  <noscript>
    <p style="padding:20px;color:#E7E9EA;font-family:system-ui,sans-serif">
      Rivu needs JavaScript to authenticate with Shopify.
      <a href="${escapeAttribute(reload)}" style="color:#34d399">Continue</a>
    </p>
  </noscript>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Never cache — a cached bounce page would hand out a stale token.
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
