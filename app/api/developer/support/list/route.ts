import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!process.env.SUPPORT_SECRET_KEY || key !== process.env.SUPPORT_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shopParam = req.nextUrl.searchParams.get("shop");

  if (shopParam) {
    // Single shop's full conversation.
    const shopRecord = await db.shop.findUnique({ where: { shopDomain: shopParam } });
    if (!shopRecord) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }
    const messages = await db.supportMessage.findMany({
      where: { shopId: shopRecord.id },
      orderBy: { createdAt: "asc" },
    });
    // Mark merchant messages as read now that you've viewed them.
    await db.supportMessage.updateMany({
      where: { shopId: shopRecord.id, fromDeveloper: false, read: false },
      data: { read: true },
    });
    return NextResponse.json({ shop: shopRecord.shopDomain, messages });
  }

  // Overview: every shop with at least one message, most recent first,
  // with an unread count so you can see what needs a reply.
  const shopsWithMessages = await db.shop.findMany({
    where: { supportMessages: { some: {} } },
    select: {
      shopDomain: true,
      supportMessages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { message: true, createdAt: true, fromDeveloper: true },
      },
      _count: {
        select: { supportMessages: { where: { fromDeveloper: false, read: false } } },
      },
    },
  });

  type ShopWithMessages = {
    shopDomain: string;
    supportMessages: { message: string; createdAt: Date; fromDeveloper: boolean }[];
    _count: { supportMessages: number };
  };

  const overview = (shopsWithMessages as ShopWithMessages[])
    .map((s) => ({
      shop: s.shopDomain,
      lastMessage: s.supportMessages[0]?.message || "",
      lastMessageAt: s.supportMessages[0]?.createdAt,
      lastFromDeveloper: s.supportMessages[0]?.fromDeveloper || false,
      unreadCount: s._count.supportMessages,
    }))
    .sort((a, b) => (b.lastMessageAt?.getTime() || 0) - (a.lastMessageAt?.getTime() || 0));

  return NextResponse.json({ shops: overview });
}
