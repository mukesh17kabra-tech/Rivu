import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activateCharge, getCharge, PLANS, PlanKey } from "@/lib/billing";
import { ReauthRequiredError } from "@/lib/access-token";
import { isValidShopDomain, shopQuery } from "@/lib/shop-context";
import { appUrl } from "@/lib/app-url";

/**
 * Return URL for Shopify's hosted charge-confirmation page. Activates the
 * charge and records the new plan.
 *
 * Guarded the same way as the upgrade route: the Admin API calls here can
 * fail on a token problem, and letting them throw produced a 500 at the very
 * end of a payment flow — the worst possible place for one.
 */
export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop")?.trim().toLowerCase();
  const host = req.nextUrl.searchParams.get("host") ?? undefined;
  const chargeId = req.nextUrl.searchParams.get("charge_id");
  const planParam = req.nextUrl.searchParams.get("plan") as PlanKey | null;

  const base = appUrl(req);

  if (!isValidShopDomain(shop) || !chargeId) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
  if (!planParam || !(planParam in PLANS) || planParam === "free") {
    return NextResponse.redirect(
      `${base}/dashboard/plans?${shopQuery(shop!, host)}&billing=invalid_plan`
    );
  }

  const plansUrl = (status: string) =>
    `${base}/dashboard/plans?${shopQuery(shop!, host)}&billing=${status}`;

  try {
    const charge = await getCharge(shop!, chargeId);
    if (!charge || charge.status !== "accepted") {
      return NextResponse.redirect(plansUrl("declined"));
    }

    await activateCharge(shop!, chargeId);

    // Only record the plan once Shopify has actually activated the charge,
    // so a failed activation can't leave a merchant on a plan they aren't
    // being billed for.
    await db.shop.update({
      where: { shopDomain: shop! },
      data: { plan: planParam },
    });

    return NextResponse.redirect(
      `${plansUrl("success")}&plan=${encodeURIComponent(planParam)}`
    );
  } catch (err) {
    if (err instanceof ReauthRequiredError) {
      console.error(`[billing/callback] re-auth required for ${shop}:`, err.message);
      return NextResponse.redirect(`${base}/api/auth?${shopQuery(shop!, host)}`);
    }

    console.error(`[billing/callback] activation failed for ${shop}:`, err);
    return NextResponse.redirect(plansUrl("error"));
  }
}
