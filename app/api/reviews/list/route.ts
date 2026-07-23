import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SUPPORTED_LANGUAGES } from "@/lib/review-suggestions";

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  const productIdRaw = req.nextUrl.searchParams.get("productId");

  if (!shop || !productIdRaw) {
    return withCors(NextResponse.json({ error: "Missing shop or productId" }, { status: 400 }));
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return withCors(NextResponse.json({ reviews: [] }));
  }

  // Build OR query to match both GID format ("gid://shopify/Product/123")
  // and plain numeric format ("123") — Liquid {{ product.id }} gives numeric,
  // while the QR/app flow may have stored GID format.
  const numericId = productIdRaw.replace(/^gid:\/\/shopify\/Product\//, "");
  const gidId = productIdRaw.startsWith("gid://") ? productIdRaw : `gid://shopify/Product/${productIdRaw}`;
  const productIdFilter = numericId === gidId.replace("gid://shopify/Product/", "")
    ? { productId: { in: [numericId, gidId] } }
    : { productId: productIdRaw };

  const reviews = await db.review.findMany({
    where: { shopId: shopRecord.id, ...productIdFilter, approved: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      reviewTitle: true,
      recommends: true,
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
  // show a small badge next to repeat reviewers. Uses a plain findMany +
  // manual count instead of Prisma's groupBy — groupBy's TypeScript
  // overloads are finicky about matching an explicit return-type
  // annotation, and this is simple/cheap enough at this scale anyway.
  const emails = [
    ...new Set(reviews.map((r: { customerEmail: string | null }) => r.customerEmail).filter(Boolean)),
  ] as string[];

  const countByEmail = new Map<string, number>();
  if (emails.length) {
    const allReviewsByThoseEmails = await db.review.findMany({
      where: { shopId: shopRecord.id, approved: true, customerEmail: { in: emails } },
      select: { customerEmail: true },
    });
    for (const r of allReviewsByThoseEmails as { customerEmail: string | null }[]) {
      if (!r.customerEmail) continue;
      countByEmail.set(r.customerEmail, (countByEmail.get(r.customerEmail) || 0) + 1);
    }
  }

  const reviewsWithBadge = reviews.map((r: { customerEmail: string | null }) => ({
    ...r,
    isTopReviewer: r.customerEmail ? (countByEmail.get(r.customerEmail) || 0) >= 3 : false,
  }));

  // Rating breakdown for the percentage bar — computed over ALL approved
  // reviews for this product, not just the 50 returned above.
  const allRatings: { rating: number }[] = await db.review.findMany({
    where: { shopId: shopRecord.id, ...productIdFilter, approved: true },
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
      plan: shopRecord.plan,
      availableLanguages: SUPPORTED_LANGUAGES.filter((l) =>
        (shopRecord.enabledLanguages.length ? shopRecord.enabledLanguages : ["en"]).includes(l.code)
      ),
      design: {
        displayStyle: shopRecord.displayStyle ?? "list",
        splitSummary: shopRecord.splitSummary ?? false,
        gridColumns: shopRecord.gridColumns ?? 3,
        carouselVisible: shopRecord.carouselVisible ?? 1,
        arrowColor: shopRecord.arrowColor ?? "#111111",
        primaryColor: shopRecord.primaryColor ?? "#111111",
        starColor: shopRecord.starColor ?? "#f5b400",
        rangeColor: shopRecord.rangeColor ?? "#f5b400",
        backgroundColor: shopRecord.backgroundColor ?? "#ffffff",
        textColor: shopRecord.textColor ?? "#333333",
        borderRadius: shopRecord.borderRadius ?? 8,
        fontFamily: shopRecord.fontFamily ?? "inherit",
        reviewTextSize: shopRecord.reviewTextSize ?? 14,
        reviewTextAlign: shopRecord.reviewTextAlign ?? "left",
        formAlign: shopRecord.formAlign ?? "center",
        formMaxWidth: shopRecord.formMaxWidth ?? 540,
        widgetMaxWidth: shopRecord.widgetMaxWidth ?? 900,
        widgetTitle: shopRecord.widgetTitle ?? "Customer Reviews",
        headingFontSize: shopRecord.headingFontSize ?? 13,
        headingBold: shopRecord.headingBold ?? true,
        headingAlign: shopRecord.headingAlign ?? "left",
        topSpacing: shopRecord.topSpacing ?? 24,
        showBorder: shopRecord.showBorder ?? false,
        borderColor: shopRecord.borderColor ?? "#e0e0e0",
        borderWidth: shopRecord.borderWidth ?? 1,
        borderStyle: shopRecord.borderStyle ?? "solid",
        backgroundGradient: shopRecord.backgroundGradient ?? null,
        primaryGradient: shopRecord.primaryGradient ?? null,
        letCustomerPickLanguage: shopRecord.letCustomerPickLanguage ?? false,
        formTemplate: shopRecord.formTemplate ?? "basic",
        summaryLayout: shopRecord.summaryLayout ?? "modern",
        showSuggestionsOnWebsite: shopRecord.showSuggestionsOnWebsite ?? true,
      },
    })
  );
}
