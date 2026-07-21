import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  shop: z.string().min(1),
  logoUrl: z.preprocess(
    (val) => (val === "" ? null : val),
    z
      .string()
      .refine((val) => val.startsWith("data:image/"), { message: "Must be an image data URI" })
      .nullable()
  ),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { shop, logoUrl } = parsed.data;

  await db.shop.update({
    where: { shopDomain: shop },
    data: { logoUrl },
  });

  return NextResponse.json({ success: true });
}
