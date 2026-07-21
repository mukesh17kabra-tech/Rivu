import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  shop: z.string().min(1),
  reminderEnabled: z.boolean(),
  reminderDelayDays: z.number().int().min(1).max(90),
  fromEmail: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().email().nullable()
  ),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { shop, ...reminder } = parsed.data;

  await db.shop.update({
    where: { shopDomain: shop },
    data: reminder,
  });

  return NextResponse.json({ success: true });
}
