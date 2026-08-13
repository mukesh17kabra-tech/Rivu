import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/require-session";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  // Merchant-only: requires a valid Shopify session token, which App Bridge
  // attaches automatically. A bare ?shop= param proves nothing.
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;

  const shop = req.nextUrl.searchParams.get("shop");
  if (String(shop).trim().toLowerCase() !== auth.shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!shop) {
    return NextResponse.json({ error: "Missing shop" }, { status: 400 });
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return NextResponse.json({ messages: [] });
  }

  const messages = await db.supportMessage.findMany({
    where: { shopId: shopRecord.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, message: true, fromDeveloper: true, createdAt: true },
  });

  return NextResponse.json({ messages });
}
