/**
 * GDPR: shop/redact
 * Shopify calls this 48 hours after a shop uninstalls the app.
 * We must delete all data associated with this shop.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook } from "@/lib/verify-webhook";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyWebhook(rawBody, hmac)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody);
    const shopDomain = body.shop_domain as string;

    if (shopDomain) {
      const shop = await db.shop.findUnique({ where: { shopDomain } });
      if (shop) {
        // Delete all reviews for this shop
        await db.review.deleteMany({ where: { shopId: shop.id } });
        // Delete the shop record itself
        await db.shop.delete({ where: { shopDomain } });
      }
      console.log("[rivu/webhook] shop/redact: deleted all data for", shopDomain);
    }
  } catch (err) {
    console.error("[rivu/webhook] shop/redact error:", err);
  }

  return NextResponse.json({ acknowledged: true });
}
