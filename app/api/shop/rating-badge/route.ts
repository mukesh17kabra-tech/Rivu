import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/require-session";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  shop: z.string().min(1),
  ratingBadgeTemplate: z.string().min(1).max(150),
  ratingBadgeStarSize: z.number().int().min(12).max(28).optional(),
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

  const { shop, ratingBadgeTemplate, ratingBadgeStarSize } = parsed.data;
  if (String(shop).trim().toLowerCase() !== auth.shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }


  await db.shop.update({
    where: { shopDomain: shop },
    data: {
      ratingBadgeTemplate,
      ...(ratingBadgeStarSize !== undefined ? { ratingBadgeStarSize } : {}),
    },
  });

  return NextResponse.json({ success: true });
}
