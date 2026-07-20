import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  shop: z.string().min(1),
  rewardEnabled: z.boolean(),
  rewardType: z.enum(["percentage", "fixed_amount"]),
  rewardValue: z.number().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { shop, ...reward } = parsed.data;

  await db.shop.update({
    where: { shopDomain: shop },
    data: reward,
  });

  return NextResponse.json({ success: true });
}
