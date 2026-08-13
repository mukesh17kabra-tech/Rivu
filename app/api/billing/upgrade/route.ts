import { NextRequest, NextResponse } from "next/server";
import { createRecurringCharge, PLANS, PlanKey } from "@/lib/billing";
import { ReauthRequiredError } from "@/lib/access-token";
import { isValidShopDomain, shopQuery } from "@/lib/shop-context";
import { appUrl } from "@/lib/app-url";

/**
 * Starts a plan upgrade by creating a recurring application charge and
 * sending the merchant to Shopify's hosted confirmation page.
 *
 * This route used to let createRecurringCharge throw, which produced a raw
 * HTTP 500 in the browser. The underlying cause was the stored access token:
 * Shopify rejects non-expiring offline tokens on the Admin API, so the charge
 * call came back 403. Now a token problem sends the merchant through
 * re-authorization (which mints an expiring token) and any other failure
 * returns them to the Plans page with a reason instead of an error page.
 */
export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop")?.trim().toLowerCase();
  const host = req.nextUrl.searchParams.get("host") ?? undefined;
  const planParam = req.nextUrl.searchParams.get("plan") as PlanKey | null;

  const base = appUrl(req);

  if (!isValidShopDomain(shop)) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
  if (!planParam || planParam === "free" || !(planParam in PLANS)) {
    return NextResponse.redirect(
      `${base}/dashboard/plans?${shopQuery(shop!, host)}&billing=invalid_plan`
    );
  }

  try {
    const charge = await createRecurringCharge(shop!, planParam);
    return NextResponse.redirect(charge.confirmation_url);
  } catch (err) {
    if (err instanceof ReauthRequiredError) {
      // The access token can't be used or rotated — re-authorize, then the
      // merchant can retry the upgrade with a valid token.
      console.error(`[billing/upgrade] re-auth required for ${shop}:`, err.message);
      return NextResponse.redirect(`${base}/api/auth?${shopQuery(shop!, host)}`);
    }

    console.error(`[billing/upgrade] charge failed for ${shop}:`, err);
    return NextResponse.redirect(
      `${base}/dashboard/plans?${shopQuery(shop!, host)}&billing=error`
    );
  }
}
