import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  const productId = req.nextUrl.searchParams.get("productId");

  if (!shop || !productId) {
    return withCors(NextResponse.json({ error: "Missing shop or productId" }, { status: 400 }));
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return withCors(NextResponse.json({ total: 0, average: 0 }));
  }

  // Match both GID ("gid://shopify/Product/123") and numeric ("123") formats
  const numericId = productId.replace(/^gid:\/\/shopify\/Product\//, "");
  const gidId = productId.startsWith("gid://") ? productId : `gid://shopify/Product/${productId}`;

  const ratings: { rating: number }[] = await db.review.findMany({
    where: { shopId: shopRecord.id, productId: { in: [numericId, gidId] }, approved: true },
    select: { rating: true },
  });

  const total = ratings.length;
  const average = total
    ? Math.round((ratings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / total) * 10) / 10
    : 0;

  return withCors(
    NextResponse.json({
      total,
      average,
      starColor: shopRecord.starColor,
      textColor: shopRecord.textColor,
      ratingBadgeTemplate: shopRecord.ratingBadgeTemplate,
      ratingBadgeStarSize: shopRecord.ratingBadgeStarSize,
    })
  );
}
