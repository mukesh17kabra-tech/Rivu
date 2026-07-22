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
      customerEmail: true,
      photoUrl: true,
      videoUrl: true,
      createdAt: true,
    },
    take: 50,
  });

  // Streak/"Top Reviewer" badge: count how many approved reviews (across
  // any product in this shop) each reviewer's email has, so the widget can
  // show a small badge next to repeat reviewers. Cheap enough to compute
  // per-request at this scale (small per-shop review volumes).
  const emails = [
    ...new Set(reviews.map((r: { customerEmail: string | null }) => r.customerEmail).filter(Boolean)),
  ] as string[];
  const reviewCounts: { customerEmail: string | null; _count: { customerEmail: number } }[] = emails.length
    ? await db.review.groupBy({
        by: ["customerEmail"],
        where: { shopId: shopRecord.id, approved: true, customerEmail: { in: emails } },
        _count: { customerEmail: true },
      })
    : [];
  const countByEmail = new Map(reviewCounts.map((r) => [r.customerEmail, r._count.customerEmail]));
  const reviewsWithBadge = reviews.map((r: { customerEmail: string | null }) => ({
    ...r,
    isTopReviewer: r.customerEmail ? (countByEmail.get(r.customerEmail) || 0) >= 3 : false,
  }));

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
      reviews: reviewsWithBadge,
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
        widgetTitle: shopRecord.widgetTitle,
        topSpacing: shopRecord.topSpacing,
        showSuggestionsOnWebsite: shopRecord.showSuggestionsOnWebsite,
      },
    })
  );
}
