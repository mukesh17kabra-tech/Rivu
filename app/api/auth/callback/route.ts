import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/shopify";
import { saveShopToken } from "@/lib/install";
import { verifyQueryHmac } from "@/lib/session-token";
import { isValidShopDomain } from "@/lib/shop-context";
import { appUrl } from "@/lib/app-url";

/**
 * OAuth callback for the authorization-code grant.
 *
 * Three things this route used to get wrong, each of which showed the
 * merchant a web error instead of the app:
 *   - the token exchange and the database write were unguarded, so any
 *     failure surfaced as a raw 500;
 *   - it never verified Shopify's `hmac` signature;
 *   - it redirected to `admin.shopify.com/store/{shop}/apps/{api_key}`,
 *     ignoring the `host` param Shopify hands back. That guessed URL can
 *     404 in the current Admin, which is exactly the "fails to redirect to
 *     UI after OAuth" symptom.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const shop = params.get("shop")?.trim().toLowerCase();
  const code = params.get("code");
  const state = params.get("state");
  const hostParam = params.get("host") || req.cookies.get("shopify_oauth_host")?.value;
  const storedState = req.cookies.get("shopify_oauth_state")?.value;

  if (!isValidShopDomain(shop) || !code) {
    return errorPage(
      "That install link is incomplete",
      "Open Rivu from your Shopify admin's Apps menu to start again.",
      appUrl(req) || "/"
    );
  }

  // Shopify always signs this callback, so a missing or bad signature is a
  // genuine rejection rather than a merchant-initiated request.
  if (!verifyQueryHmac(params)) {
    return errorPage(
      "We couldn't verify that request came from Shopify",
      "For your security Rivu stopped the install. Please try again from your Shopify admin.",
      appUrl(req) || "/"
    );
  }

  if (state && storedState && state !== storedState) {
    return errorPage(
      "That install link has expired",
      "Please start the installation again from your Shopify admin.",
      `${appUrl(req)}/api/auth?shop=${encodeURIComponent(shop!)}`
    );
  }

  try {
    // Stores the whole payload, not just access_token: expiring tokens come
    // with expires_in and a refresh_token that lib/access-token.ts needs.
    const token = await exchangeCodeForToken(shop!, code);
    await saveShopToken(shop!, token);
  } catch (err) {
    console.error(`[auth/callback] install failed for ${shop}:`, err);
    return errorPage(
      "We couldn't finish installing Rivu",
      "Shopify accepted the authorization but we couldn't save it. This is usually temporary — please try again.",
      `${appUrl(req)}/api/auth?shop=${encodeURIComponent(shop!)}`,
      "Try again"
    );
  }

  // Back into the embedded app. Prefer the `host` Shopify gave us, which is
  // the authoritative Admin URL for this shop, and only fall back to a
  // reconstructed one if it's absent.
  const embeddedUrl = adminAppUrl(shop!, hostParam);

  // This document runs top-level (we escaped the iframe for the grant
  // screen), so `window.location` is the right move; `window.open(_top)`
  // covers the case where a browser kept us framed.
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Rivu installed</title>
</head>
<body style="margin:0;background:#0B0D0F;color:#E7E9EA;font-family:system-ui,sans-serif">
  <p style="padding:20px">Install complete. Opening Rivu…</p>
  <p style="padding:0 20px">
    <a href="${escapeAttribute(embeddedUrl)}" target="_top" style="color:#34d399">
      Open Rivu
    </a>
  </p>
  <script>
    (function () {
      var url = ${JSON.stringify(embeddedUrl)};
      if (window.top === window.self) {
        window.location.href = url;
      } else {
        window.open(url, "_top");
      }
    })();
  </script>
</body>
</html>`;

  const res = new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
  res.cookies.delete("shopify_oauth_state");
  res.cookies.delete("shopify_oauth_host");
  return res;
}

/**
 * Builds the Admin URL that loads this app embedded. `host` is base64url of
 * e.g. "admin.shopify.com/store/my-store", which is exactly the prefix the
 * app path hangs off.
 */
function adminAppUrl(shop: string, host?: string | null): string {
  const apiKey = process.env.SHOPIFY_API_KEY || "";

  if (host) {
    try {
      const decoded = Buffer.from(
        host.replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
      ).toString("utf-8");
      if (/^[a-zA-Z0-9.\-/]+$/.test(decoded)) {
        return `https://${decoded.replace(/\/+$/, "")}/apps/${apiKey}`;
      }
    } catch {
      // fall through to the reconstructed URL
    }
  }

  const shopName = shop.replace(/\.myshopify\.com$/, "");
  return `https://admin.shopify.com/store/${shopName}/apps/${apiKey}`;
}

/**
 * Operational errors render as a real page with a way forward. Status stays
 * 200 deliberately: a 4xx/5xx HTML response inside the Admin iframe reads as
 * a broken app, and there is nothing the merchant could do with it.
 */
function errorPage(
  title: string,
  body: string,
  href: string,
  linkLabel = "Back to Rivu"
) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeAttribute(title)}</title>
</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0B0D0F;color:#E7E9EA;font-family:system-ui,sans-serif">
  <div style="max-width:28rem;padding:24px;text-align:center">
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:rgba(251,191,36,.9)">Rivu</p>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:600">${escapeAttribute(title)}</h1>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:rgba(255,255,255,.6)">${escapeAttribute(body)}</p>
    <a href="${escapeAttribute(href)}" target="_top"
       style="display:inline-block;padding:8px 16px;border-radius:6px;background:#34d399;color:#000;font-size:14px;font-weight:500;text-decoration:none">
      ${escapeAttribute(linkLabel)}
    </a>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
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
