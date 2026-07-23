import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  key: z.string().min(1),
  shop: z.string().min(1),
  message: z.string().max(2000).default(""),
  imageUrl: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { key, shop, message, imageUrl } = parsed.data;

  if (!process.env.SUPPORT_SECRET_KEY || key !== process.env.SUPPORT_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  await db.supportMessage.create({
    data: { shopId: shopRecord.id, message: message || "", imageUrl: imageUrl ?? null, fromDeveloper: true },
  });

  return NextResponse.json({ success: true });
}
