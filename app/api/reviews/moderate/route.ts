import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { shop, reviewId, action } = body || {};

  if (!shop || !reviewId || !["approve", "reject", "unpublish"].includes(action)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  if (action === "approve") {
    await db.review.update({
      where: { id: reviewId, shopId: shopRecord.id },
      data: { approved: true },
    });
  } else if (action === "unpublish") {
    await db.review.update({
      where: { id: reviewId, shopId: shopRecord.id },
      data: { approved: false },
    });
  } else {
    await db.review.delete({ where: { id: reviewId, shopId: shopRecord.id } });
  }

  return NextResponse.json({ success: true });
}
