import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

function verifyHmac(rawBody: string, hmacHeader: string | null) {
  if (!hmacHeader) return false;
  const generated = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
    .update(rawBody, "utf8")
    .digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(generated), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
  const shopDomain = req.headers.get("x-shopify-shop-domain");

  if (!verifyHmac(rawBody, hmacHeader)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }
  if (!shopDomain) {
    return NextResponse.json({ error: "Missing shop domain" }, { status: 400 });
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain } });
  if (!shopRecord) {
    return NextResponse.json({ error: "Unknown shop" }, { status: 404 });
  }

  const order = JSON.parse(rawBody);
  const customerEmail: string | undefined = order.email || order.contact_email;
  const customerName: string | undefined = order.customer
    ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim()
    : undefined;

  if (!customerEmail) {
    // Can't send a reminder without an email — nothing useful to track.
    return NextResponse.json({ ok: true, skipped: "no email on order" });
  }

  type LineItem = { product_id: number; title: string };
  const lineItems: LineItem[] = order.line_items || [];

  for (const item of lineItems) {
    if (!item.product_id) continue;
    try {
      await db.pendingReviewRequest.upsert({
        where: {
          shopId_orderId_productId: {
            shopId: shopRecord.id,
            orderId: String(order.id),
            productId: String(item.product_id),
          },
        },
        update: {},
        create: {
          shopId: shopRecord.id,
          orderId: String(order.id),
          productId: String(item.product_id),
          productTitle: item.title,
          customerEmail,
          customerName,
          purchasedAt: new Date(order.created_at || Date.now()),
        },
      });
    } catch (err) {
      console.error(`[webhooks/orders] Failed to create pending review request:`, err);
    }
  }

  return NextResponse.json({ ok: true, tracked: lineItems.length });
}
