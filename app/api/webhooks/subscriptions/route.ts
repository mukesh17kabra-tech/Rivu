/**
 * Shopify app_subscriptions/update webhook — fires when a merchant's
 * subscription status changes (cancelled, expired, declined).
 * When status is NOT "active", we reset their design to Free defaults.
 *
 * This handler previously trusted the request outright: it read the shop from
 * the x-shopify-shop-domain header with no signature check, so anyone could
 * POST a fake "CANCELLED" event and wipe a merchant's paid settings back to
 * Free defaults. Every other webhook here verifies its HMAC; this one didn't.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resetToFreePlan } from "@/lib/free-plan-defaults";
import { verifyShopifyWebhook } from "@/lib/verify-webhook";

export async function POST(req: NextRequest) {
  try {
    // HMAC is computed over the exact bytes Shopify sent, so read the raw
    // body and verify before parsing it.
    const rawBody = await req.text();
    if (!verifyShopifyWebhook(rawBody, req.headers.get("x-shopify-hmac-sha256"))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const shopDomain = req.headers.get("x-shopify-shop-domain");
    if (!shopDomain) return NextResponse.json({ ok: true });

    const body = JSON.parse(rawBody);
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
    // Shopify retries on non-2xx; swallow parse errors so a malformed payload
    // isn't retried forever.
    return NextResponse.json({ ok: true });
  }
}
