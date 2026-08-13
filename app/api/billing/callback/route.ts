import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncPlanFromShopify } from "@/lib/billing";
import { ReauthRequiredError } from "@/lib/access-token";
import { isValidShopDomain, shopQuery } from "@/lib/shop-context";
import { appUrl } from "@/lib/app-url";

/**
 * Landing point after the merchant picks a plan on Shopify's managed-pricing
 * page. Shopify appends `shop` and `plan_handle`.
 *
 * We don't trust `plan_handle` — the plan is read back from Shopify's own
 * active subscription, so a hand-edited URL can't grant a paid plan. Nothing
 * is activated here either; under managed pricing Shopify has already done
 * that by the time the merchant arrives.
 */
export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop")?.trim().toLowerCase();
  const host = req.nextUrl.searchParams.get("host") ?? undefined;

  const base = appUrl(req);

  if (!isValidShopDomain(shop)) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  const plansUrl = (status: string) =>
    `${base}/dashboard/plans?${shopQuery(shop!, host)}&billing=${status}`;

  try {
    const record = await db.shop.findUnique({ where: { shopDomain: shop! } });
    if (!record) {
      // Not installed (or uninstalled mid-flow) — the entry point will
      // re-register the shop rather than erroring here.
      return NextResponse.redirect(`${base}/?${shopQuery(shop!, host)}`);
    }

    const plan = await syncPlanFromShopify(shop!, record.plan);
    return NextResponse.redirect(
      `${plansUrl(plan === "free" ? "declined" : "success")}&plan=${encodeURIComponent(plan)}`
    );
  } catch (err) {
    if (err instanceof ReauthRequiredError) {
      console.error(`[billing/callback] re-auth required for ${shop}:`, err.message);
      return NextResponse.redirect(`${base}/api/auth?${shopQuery(shop!, host)}`);
    }

    console.error(`[billing/callback] plan sync failed for ${shop}:`, err);
    return NextResponse.redirect(plansUrl("error"));
  }
}
