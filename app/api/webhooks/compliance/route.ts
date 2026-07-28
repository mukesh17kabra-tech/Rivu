/**
 * Unified GDPR compliance webhook handler.
 * Handles: customers/data_request, customers/redact, shop/redact
 * Registered via compliance_topics in shopify.app.toml
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook } from "@/lib/verify-webhook";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const topic = req.headers.get("x-shopify-topic");

  if (!verifyShopifyWebhook(rawBody, hmac)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody);
    const shopDomain = body.shop_domain as string;

    switch (topic) {
      case "customers/data_request":
        // Customer requested their data — acknowledge receipt.
        // In production: email data to store owner within 30 days.
        console.log("[rivu/compliance] data_request for:", shopDomain, body.customer?.email);
        break;

      case "customers/redact":
        // Anonymize reviews by this customer
        if (shopDomain && body.customer?.email) {
          await db.review.updateMany({
            where: { shop: { shopDomain }, customerEmail: body.customer.email },
            data: { customerName: "Anonymous", customerEmail: null },
          });
        }
        console.log("[rivu/compliance] customer redacted:", shopDomain);
        break;

      case "shop/redact":
        // Delete all data for this shop (called 48h after uninstall)
        if (shopDomain) {
          const shop = await db.shop.findUnique({ where: { shopDomain } });
          if (shop) {
            await db.review.deleteMany({ where: { shopId: shop.id } });
            await db.shop.delete({ where: { shopDomain } });
          }
        }
        console.log("[rivu/compliance] shop redacted:", shopDomain);
        break;

      default:
        console.log("[rivu/compliance] unknown topic:", topic);
    }
  } catch (err) {
    console.error("[rivu/compliance] error:", err);
  }

  return NextResponse.json({ acknowledged: true });
}
