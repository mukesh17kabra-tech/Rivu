import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
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
