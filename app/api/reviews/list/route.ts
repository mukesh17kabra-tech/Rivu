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
    return withCors(NextResponse.json({ reviews: [] }));
  }

  const reviews = await db.review.findMany({
    where: { shopId: shopRecord.id, productId, approved: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      body: true,
      customerName: true,
      photoUrl: true,
      createdAt: true,
    },
    take: 50,
  });

  // Rating breakdown for the percentage bar — computed over ALL approved
  // reviews for this product, not just the 50 returned above.
  const allRatings: { rating: number }[] = await db.review.findMany({
    where: { shopId: shopRecord.id, productId, approved: true },
    select: { rating: true },
  });
  const total = allRatings.length;
  const counts = [5, 4, 3, 2, 1].map((star) => {
    const count = allRatings.filter((r: { rating: number }) => r.rating === star).length;
    return { star, count, percentage: total ? Math.round((count / total) * 100) : 0 };
  });
  const average = total
    ? Math.round(
        (allRatings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / total) * 10
      ) / 10
    : 0;

  return withCors(
    NextResponse.json({
      reviews,
      summary: { total, average, breakdown: counts },
      design: {
        displayStyle: shopRecord.displayStyle,
        gridColumns: shopRecord.gridColumns,
        carouselVisible: shopRecord.carouselVisible,
        arrowColor: shopRecord.arrowColor,
        primaryColor: shopRecord.primaryColor,
        starColor: shopRecord.starColor,
        backgroundColor: shopRecord.backgroundColor,
        textColor: shopRecord.textColor,
        borderRadius: shopRecord.borderRadius,
        fontFamily: shopRecord.fontFamily,
        formAlign: shopRecord.formAlign,
        formMaxWidth: shopRecord.formMaxWidth,
        widgetMaxWidth: shopRecord.widgetMaxWidth,
        showSuggestionsOnWebsite: shopRecord.showSuggestionsOnWebsite,
      },
    })
  );
}
