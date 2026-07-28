/**
 * GDPR: customers/redact
 * Shopify calls this when a customer requests deletion of their data.
 * We must delete or anonymize all personal data for this customer.
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
    const customerEmail = body.customer?.email as string | undefined;

    if (shopDomain && customerEmail) {
      // Anonymize reviews by this customer (keep star rating for aggregate stats)
      await db.review.updateMany({
        where: {
          shop: { shopDomain },
          customerEmail,
        },
        data: {
          customerName: "Anonymous",
          customerEmail: null,
        },
      });
    }

    console.log("[rivu/webhook] customers/redact processed for:", shopDomain, customerEmail);
  } catch (err) {
    console.error("[rivu/webhook] customers/redact error:", err);
  }

  return NextResponse.json({ acknowledged: true });
}
