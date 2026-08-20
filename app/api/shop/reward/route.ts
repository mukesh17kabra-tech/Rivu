import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/require-session";
import { db } from "@/lib/db";
import { z } from "zod";
import { rewardCodesAllowed } from "@/lib/usage-limits";

const schema = z.object({
  shop: z.string().min(1),
  rewardEnabled: z.boolean(),
  rewardType: z.enum(["percentage", "fixed_amount"]),
  rewardValue: z.number().min(1).max(1000),
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

  const { shop, ...reward } = parsed.data;
  if (String(shop).trim().toLowerCase() !== auth.shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }


  // Checked server-side, not merely hidden: this endpoint is reachable by
  // anyone holding a valid session token for the shop.
  if (reward.rewardEnabled) {
    const record = await db.shop.findUnique({
      where: { shopDomain: shop },
      select: { plan: true },
    });
    if (!rewardCodesAllowed(record?.plan ?? "free")) {
      return NextResponse.json(
        { error: "Review-reward discount codes are available on the Pro plan." },
        { status: 403 }
      );
    }
  }

  await db.shop.update({
    where: { shopDomain: shop },
    data: reward,
  });

  return NextResponse.json({ success: true });
}
