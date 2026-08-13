import { NextRequest, NextResponse } from "next/server";
import { managedPricingUrl } from "@/lib/billing";
import { isValidShopDomain } from "@/lib/shop-context";

/**
 * Sends the merchant to Shopify's hosted plan-selection page.
 *
 * This app uses Shopify Managed Pricing, so it cannot create charges itself.
 * The previous implementation called the Billing API, which fails with a bare
 * 403 ("Managed Pricing Apps cannot use the Billing API") — that was the
 * cause of both the HTTP 500 and, once guarded, the `?billing=error` redirect.
 *
 * The `plan` query param is now advisory only: Shopify's page lists every
 * plan and the merchant chooses there.
 */
export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop")?.trim().toLowerCase();

  if (!isValidShopDomain(shop)) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  const target = managedPricingUrl(shop!);

  // admin.shopify.com cannot be framed inside the app's own iframe, so this
  // has to be a top-level navigation. window.open(url, "_top") is the
  // mechanism App Bridge permits — assigning window.top.location directly is
  // blocked for a cross-origin frame without user activation.
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Choose your Rivu plan</title>
  <script data-api-key="${escapeAttribute(
    process.env.SHOPIFY_API_KEY || ""
  )}" src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
</head>
<body style="margin:0;background:#0B0D0F;color:#E7E9EA;font-family:system-ui,sans-serif">
  <p style="padding:20px">Opening Shopify&rsquo;s plan options&hellip;</p>
  <p style="padding:0 20px">
    <a href="${escapeAttribute(target)}" target="_top" style="color:#34d399">
      Continue to plans
    </a>
  </p>
  <script>
    (function () {
      var url = ${JSON.stringify(target)};
      if (window.top === window.self) {
        window.location.href = url;
      } else {
        window.open(url, "_top");
      }
    })();
  </script>
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
