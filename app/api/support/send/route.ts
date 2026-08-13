import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/require-session";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  shop: z.string().min(1),
  message: z.string().max(2000).default(""),
  imageUrl: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().refine((v) => v.startsWith("data:image/"), "Must be an image data URI").nullable()
  ).optional(),
});

export async function POST(req: NextRequest) {
  // Merchant-only: requires a valid Shopify session token, which App Bridge
  // attaches automatically. A bare ?shop= param proves nothing.
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { shop, message, imageUrl } = parsed.data;
  if (String(shop).trim().toLowerCase() !== auth.shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }


  if (!message && !imageUrl) {
    return NextResponse.json({ error: "Message or image required" }, { status: 400 });
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  await db.supportMessage.create({
    data: { shopId: shopRecord.id, message: message || "", imageUrl: imageUrl ?? null, fromDeveloper: false },
  });

  return NextResponse.json({ success: true });
}
