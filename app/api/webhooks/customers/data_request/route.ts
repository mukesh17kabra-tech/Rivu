/**
 * GDPR: customers/data_request
 * Shopify calls this when a customer requests their data.
 * We must respond within 30 days with what data we hold.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook } from "@/lib/verify-webhook";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyWebhook(rawBody, hmac)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rivu stores: customerName, customerEmail, star rating, review body, photos.
  // In production you would email this data to the customer.
  // For now we acknowledge receipt — manual fulfillment within 30 days.
  console.log("[rivu/webhook] customers/data_request received:", rawBody.slice(0, 200));

  return NextResponse.json({ acknowledged: true });
}
