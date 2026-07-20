import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  shop: z.string().min(1),
  displayStyle: z.enum(["list", "grid", "carousel"]),
  gridColumns: z.number().int().min(2).max(5),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  starColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  borderRadius: z.number().int().min(0).max(24),
  fontFamily: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { shop, ...design } = parsed.data;

  await db.shop.update({
    where: { shopDomain: shop },
    data: design,
  });

  return NextResponse.json({ success: true });
}
