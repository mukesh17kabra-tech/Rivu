import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  shop: z.string().min(1),
  productId: z.string().min(1),
  productTitle: z.string().min(1),
  productImageUrl: z.string().url().optional(),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(10).max(2000),
  customerName: z.string().min(1).max(100),
  // Either a real URL or a base64 data URI (data:image/...) from the
  // storefront's photo upload input.
  photoUrl: z
    .string()
    .refine((val) => val.startsWith("http") || val.startsWith("data:image/"), {
      message: "photoUrl must be a URL or an image data URI",
    })
    .optional(),
});

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return withCors(
      NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    );
  }

  const { shop, ...data } = parsed.data;

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return withCors(NextResponse.json({ error: "Shop not found / app not installed" }, { status: 404 }));
  }

  // New reviews always start unapproved — merchant must approve in the
  // dashboard before they show publicly or become eligible for UGC cards.
  await db.review.create({
    data: { shopId: shopRecord.id, approved: false, ...data },
  });

  return withCors(NextResponse.json({ success: true }));
}
