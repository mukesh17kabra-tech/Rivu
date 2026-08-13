import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getInstallUrl } from "@/lib/shopify";
import { verifyQueryHmac } from "@/lib/session-token";
import { isValidShopDomain } from "@/lib/shop-context";

/**
 * Authorization-code grant entry point.
 *
 * With Shopify managed installation this is now a *fallback* — the normal
 * path is token exchange on the first embedded load (see app/page.tsx). It
 * still matters for merchant-initiated installs from the landing page and
 * for recovering a shop whose access token went stale.
 */
export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop")?.trim().toLowerCase();
  const host = req.nextUrl.searchParams.get("host");

  if (!isValidShopDomain(shop)) {
    // Send the merchant to the landing page — which has a domain field —
    // rather than returning raw JSON they can't do anything with.
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  // Shopify signs the requests it initiates. Verify when `hmac` is present;
  // merchant-initiated installs (typing the app URL, or our own landing
  // form) legitimately have no signature to check.
  if (req.nextUrl.searchParams.has("hmac")) {
    if (!verifyQueryHmac(req.nextUrl.searchParams)) {
      return NextResponse.json(
        { error: "Request signature verification failed" },
        { status: 401 }
      );
    }
  }

  const state = crypto.randomBytes(16).toString("hex");
  const installUrl = getInstallUrl(shop!, state);

  // The OAuth grant screen sets X-Frame-Options and cannot render inside
  // Shopify's iframe, so we have to escape to the top-level window.
  //
  // `window.top.location.href = url` — what this route used to do — is
  // blocked by Chrome when initiated by a cross-origin iframe without a
  // user gesture, which left the app stuck on this page forever inside
  // Admin. `window.open(url, "_top")` is the mechanism Shopify's own
  // App Bridge helpers use, and App Bridge (loaded here via data-api-key)
  // grants it the permission it needs.
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Connecting Rivu…</title>
  <script data-api-key="${escapeAttribute(
    process.env.SHOPIFY_API_KEY || ""
  )}" src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
</head>
<body style="margin:0;background:#0B0D0F;color:#E7E9EA;font-family:system-ui,sans-serif">
  <p style="padding:20px">Redirecting to Shopify to authorize Rivu…</p>
  <p style="padding:0 20px">
    <a href="${escapeAttribute(installUrl)}" target="_top" style="color:#34d399">
      Continue manually
    </a>
  </p>
  <script>
    (function () {
      var url = ${JSON.stringify(installUrl)};
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
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const, // so the cookie survives the iframe→top hop
    path: "/",
    maxAge: 60 * 10,
  };
  res.cookies.set("shopify_oauth_state", state, cookieOptions);
  // Shopify's redirect_uri must match the whitelisted URL exactly, so `host`
  // can't ride along as a query param. Stash it for the callback instead.
  if (host) res.cookies.set("shopify_oauth_host", host, cookieOptions);
  return res;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
