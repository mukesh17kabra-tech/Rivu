import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/db";
import { runAutoMigrations } from "@/lib/db-migrate";

/**
 * Reviews across the whole store, for blocks that are not on a product page.
 *
 * Everything Rivu could show lived on /api/reviews/list, which requires a
 * product id — so a carousel on the home page, a testimonial strip in a
 * footer, or a wall of photos on an About page had nothing to call. That is
 * the reason Rivu shipped three theme blocks while the competition ships
 * fifteen: not fifteen renderers, one missing endpoint.
 *
 * Public and CORS-open like the other storefront routes. It returns only
 * approved reviews and no customer email, so there is nothing here a shopper
 * could not already read on the product page.
 */

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  // Storefront traffic hits this on every page view, and a review section is
  // not worth a database round trip per visitor. Stale-while-revalidate keeps
  // it instant while still picking up new reviews within the minute.
  res.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

/** Bounded so a hand-made request cannot ask for the entire table. */
function clampLimit(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 12;
  return Math.max(1, Math.min(50, Math.trunc(n)));
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const shop = params.get("shop")?.trim().toLowerCase();
  if (!shop) {
    return withCors(NextResponse.json({ error: "Missing shop" }, { status: 400 }));
  }

  await withDbRetry(() => runAutoMigrations());

  const shopRecord = await db.shop.findUnique({
    where: { shopDomain: shop },
    select: { id: true },
  });
  if (!shopRecord) {
    return withCors(NextResponse.json({ error: "Shop not found" }, { status: 404 }));
  }

  const limit = clampLimit(params.get("limit"));
  const minRating = Math.max(1, Math.min(5, Number(params.get("minRating")) || 1));
  const withMedia = params.get("withMedia") === "1";

  const reviews = await db.review.findMany({
    where: {
      shopId: shopRecord.id,
      approved: true,
      rating: { gte: minRating },
      // A photo wall with text-only reviews in it is not a photo wall.
      ...(withMedia
        ? { OR: [{ photoUrl: { not: null } }, { videoUrl: { not: null } }] }
        : {}),
    },
    // Pinned first, matching the product widget — a merchant who pins a review
    // means it everywhere, not only on the product page.
    orderBy: [{ pinnedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      productId: true,
      productTitle: true,
      rating: true,
      reviewTitle: true,
      body: true,
      customerName: true,
      photoUrl: true,
      videoUrl: true,
      createdAt: true,
      pinnedAt: true,
      ownerReply: true,
      // Deliberately absent: customerEmail. Nothing on a storefront needs it.
    },
  });

  // Store-wide totals, for a trust badge or a heading above a carousel.
  const [total, aggregate] = await Promise.all([
    db.review.count({ where: { shopId: shopRecord.id, approved: true } }),
    db.review.aggregate({
      where: { shopId: shopRecord.id, approved: true },
      _avg: { rating: true },
    }),
  ]);

  return withCors(
    NextResponse.json({
      reviews,
      summary: {
        total,
        average: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
      },
    })
  );
}
