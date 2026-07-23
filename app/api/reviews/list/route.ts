import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SUPPORTED_LANGUAGES } from "@/lib/review-suggestions";
import { runAutoMigrations } from "@/lib/db-migrate";

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET(req: NextRequest) {
  try {
    await runAutoMigrations();
    const shop = req.nextUrl.searchParams.get("shop");
    const productIdRaw = req.nextUrl.searchParams.get("productId");

    if (!shop || !productIdRaw) {
      return withCors(NextResponse.json({ error: "Missing shop or productId" }, { status: 400 }));
    }

    const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
    if (!shopRecord) {
      return withCors(NextResponse.json({
        reviews: [],
        summary: { total: 0, average: 0, breakdown: [] },
        plan: "free",
        availableLanguages: [{ code: "en", label: "English" }],
        design: {},
      }));
    }

    // Match both GID ("gid://shopify/Product/123") and numeric ("123") formats.
    // Shopify Liquid gives numeric; QR/app flows may store GID.
    const numericId = productIdRaw.replace(/^gid:\/\/shopify\/Product\//, "");
    const gidId = `gid://shopify/Product/${numericId}`;

    const reviews = await db.review.findMany({
      where: {
        shopId: shopRecord.id,
        productId: { in: [numericId, gidId] },
        approved: true,
      },
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

    // Top Reviewer badge — 3+ reviews from same email
    const emails = [
      ...new Set(
        reviews
          .map((r: { customerEmail: string | null }) => r.customerEmail)
          .filter((e: string | null): e is string => Boolean(e))
      ),
    ];
    const countByEmail = new Map<string, number>();
    if (emails.length) {
      const allReviewsByThoseEmails = await db.review.findMany({
        where: { shopId: shopRecord.id, approved: true, customerEmail: { in: emails } },
        select: { customerEmail: true },
      });
      for (const r of allReviewsByThoseEmails as { customerEmail: string | null }[]) {
        if (r.customerEmail)
          countByEmail.set(r.customerEmail, (countByEmail.get(r.customerEmail) || 0) + 1);
      }
    }
    const reviewsWithBadge = reviews.map((r: { customerEmail: string | null }) => ({
      ...r,
      isTopReviewer: r.customerEmail ? (countByEmail.get(r.customerEmail) || 0) >= 3 : false,
    }));

    // Rating breakdown
    const allRatings: { rating: number }[] = await db.review.findMany({
      where: {
        shopId: shopRecord.id,
        productId: { in: [numericId, gidId] },
        approved: true,
      },
      select: { rating: true },
    });
    const total = allRatings.length;
    const counts = [5, 4, 3, 2, 1].map((star) => {
      const count = allRatings.filter((r: { rating: number }) => r.rating === star).length;
      return { star, count, percentage: total ? Math.round((count / total) * 100) : 0 };
    });
    const average = total
      ? Math.round(
          (allRatings.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / total) * 10
        ) / 10
      : 0;

    // enabledLanguages — safe access (column may not exist yet if migration pending)
    const enabledLangs: string[] =
      Array.isArray((shopRecord as Record<string, unknown>).enabledLanguages) &&
      ((shopRecord as Record<string, unknown>).enabledLanguages as string[]).length
        ? ((shopRecord as Record<string, unknown>).enabledLanguages as string[])
        : ["en"];

    const availableLanguages = SUPPORTED_LANGUAGES.filter((l) =>
      enabledLangs.includes(l.code)
    );

    // Safe-access helper for fields that may not exist in older DB schemas
    function safe<T>(val: T | undefined | null, fallback: T): T {
      return val === undefined || val === null ? fallback : val;
    }
    const s = shopRecord as Record<string, unknown>;

    return withCors(
      NextResponse.json({
        reviews: reviewsWithBadge,
        summary: { total, average, breakdown: counts },
        plan: safe(shopRecord.plan, "free"),
        availableLanguages,
        design: {
          displayStyle:          safe(s.displayStyle as string,           "list"),
          splitSummary:          safe(s.splitSummary as boolean,          false),
          gridColumns:           safe(s.gridColumns as number,            3),
          carouselVisible:       safe(s.carouselVisible as number,        1),
          arrowColor:            safe(s.arrowColor as string,             "#111111"),
          primaryColor:          safe(s.primaryColor as string,           "#111111"),
          starColor:             safe(s.starColor as string,              "#f5b400"),
          rangeColor:            safe(s.rangeColor as string,             "#f5b400"),
          backgroundColor:       safe(s.backgroundColor as string,       "#ffffff"),
          textColor:             safe(s.textColor as string,              "#333333"),
          borderRadius:          safe(s.borderRadius as number,           8),
          fontFamily:            safe(s.fontFamily as string,             "inherit"),
          reviewTextSize:        safe(s.reviewTextSize as number,         14),
          reviewTextAlign:       safe(s.reviewTextAlign as string,        "left"),
          formAlign:             safe(s.formAlign as string,              "center"),
          formMaxWidth:          safe(s.formMaxWidth as number,           540),
          widgetMaxWidth:        safe(s.widgetMaxWidth as number,         900),
          widgetTitle:           safe(s.widgetTitle as string,            "Customer Reviews"),
          headingFontSize:       safe(s.headingFontSize as number,        13),
          headingBold:           safe(s.headingBold as boolean,           true),
          headingAlign:          safe(s.headingAlign as string,           "left"),
          topSpacing:            safe(s.topSpacing as number,             24),
          showBorder:            safe(s.showBorder as boolean,            false),
          borderColor:           safe(s.borderColor as string,            "#e0e0e0"),
          borderWidth:           safe(s.borderWidth as number,            1),
          borderStyle:           safe(s.borderStyle as string,            "solid"),
          backgroundGradient:    safe(s.backgroundGradient as string,     null),
          primaryGradient:       safe(s.primaryGradient as string,        null),
          letCustomerPickLanguage: safe(s.letCustomerPickLanguage as boolean, false),
          formTemplate:          safe(s.formTemplate as string,           "basic"),
          summaryLayout:         safe(s.summaryLayout as string,          "modern"),
          summaryBgColor:        safe(s.summaryBgColor as string,         "#f8f8f8"),
          summaryTextColor:      safe(s.summaryTextColor as string,       "#333333"),
          summaryWidth:          safe(s.summaryWidth as number,           220),
          filterBgColor:         safe(s.filterBgColor as string,          "#ffffff"),
          filterTextColor:       safe(s.filterTextColor as string,        "#999999"),
          filterBorderColor:     safe(s.filterBorderColor as string,      "rgba(0,0,0,0.08)"),
          sortBgColor:           safe(s.sortBgColor as string,            "#ffffff"),
          sortTextColor:         safe(s.sortTextColor as string,          "#333333"),
          sortBorderColor:       safe(s.sortBorderColor as string,        "#dddddd"),
          reviewCountFontSize:   safe(s.reviewCountFontSize as number,    14),
          reviewTitleColor:      safe(s.reviewTitleColor as string,       "#111111"),
          reviewBodyColor:       safe(s.reviewBodyColor as string,        "#333333"),
          reviewMetaColor:       safe(s.reviewMetaColor as string,        "#999999"),
          formBgColor:           safe(s.formBgColor as string,            "#ffffff"),
          formTextColor:         safe(s.formTextColor as string,          "#1a1a2e"),
          formCloseColor:        safe(s.formCloseColor as string,         "#999999"),
          showSuggestionsOnWebsite: safe(s.showSuggestionsOnWebsite as boolean, true),
        },
      })
    );
  } catch (err) {
    // Return a valid empty response so the widget renders (empty state)
    // rather than getting stuck on "Loading reviews…"
    console.error("[rivu/reviews/list] error:", err);
    return withCors(
      NextResponse.json({
        reviews: [],
        summary: { total: 0, average: 0, breakdown: [] },
        plan: "free",
        availableLanguages: [{ code: "en", label: "English" }],
        design: {},
        _error: String(err),
      })
    );
  }
}
