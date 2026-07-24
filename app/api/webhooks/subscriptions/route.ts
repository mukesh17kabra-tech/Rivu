/**
 * Shopify app_subscriptions/update webhook — fires when a merchant's
 * subscription status changes (cancelled, expired, declined).
 * When status is NOT "active", we reset their design to Free defaults.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resetToFreePlan } from "@/lib/free-plan-defaults";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const shopDomain = req.headers.get("x-shopify-shop-domain");

    if (!shopDomain) return NextResponse.json({ ok: true });

    const status = body?.app_subscription?.status;

    // If subscription is no longer active — reset to Free
    if (status && status !== "ACTIVE") {
      const shop = await db.shop.findUnique({ where: { shopDomain } });
      if (shop && shop.plan !== "free") {
        await resetToFreePlan(shopDomain);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
