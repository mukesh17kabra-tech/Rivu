import { NextRequest, NextResponse } from "next/server";
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
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { shop, message, imageUrl } = parsed.data;

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
