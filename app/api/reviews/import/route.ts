import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/require-session";
import { db } from "@/lib/db";
import { parseReviewCsv, dedupeKey } from "@/lib/review-import";

/**
 * Imports reviews exported from another app (Judge.me, Loox, Stamped, Yotpo).
 *
 * This works ONLY with data merchants export themselves from apps they already
 * use. There's no automated pulling from Amazon/Flipkart/etc: scraping reviews
 * from marketplaces without an official API violates their terms and risks the
 * merchant's seller account, so it is intentionally unsupported.
 *
 * Mapping rules live in lib/review-import.ts so they can be tested directly and
 * so `dryRun` can show the merchant exactly what will happen before anything is
 * written. Importing someone's review history is close to irreversible from
 * their point of view — a preview is the difference between a migration they
 * trust and one they abandon.
 */
export async function POST(req: NextRequest) {
  // Merchant-only: requires a valid Shopify session token, which App Bridge
  // attaches automatically. A bare ?shop= param proves nothing.
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const shop = body?.shop as string | undefined;
  if (String(shop).trim().toLowerCase() !== auth.shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csvText = body?.csv as string | undefined;
  const dryRun = body?.dryRun === true;

  if (!shop || !csvText) {
    return NextResponse.json({ error: "Missing shop or csv" }, { status: 400 });
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const plan = parseReviewCsv(csvText);
  if ("error" in plan) {
    return NextResponse.json({ error: plan.error }, { status: 400 });
  }

  // Reviews already held for this shop, so re-running an import — or retrying
  // after a timeout — tops up rather than doubling the merchant's history.
  const existing = await db.review.findMany({
    where: { shopId: shopRecord.id },
    select: { productId: true, customerName: true, body: true },
  });
  const existingKeys = new Set(existing.map(dedupeKey));

  const toCreate = plan.records.filter((r) => !existingKeys.has(dedupeKey(r)));
  const alreadyPresent = plan.records.length - toCreate.length;

  const summary = {
    totalRows: plan.totalRows,
    willImport: toCreate.length,
    alreadyPresent,
    skipped: plan.skipped,
    warnings: plan.warnings,
    /** Preview of the first few, so the merchant can eyeball the mapping. */
    sample: toCreate.slice(0, 5).map((r) => ({
      productTitle: r.productTitle,
      customerName: r.customerName,
      rating: r.rating,
      body: r.body.slice(0, 120),
      date: r.createdAt ? r.createdAt.toISOString().slice(0, 10) : null,
    })),
  };

  if (dryRun) {
    return NextResponse.json({ dryRun: true, ...summary });
  }

  // createMany in batches: the old row-at-a-time loop made one round trip per
  // review, which on a few thousand rows took long enough to hit the function
  // timeout — and a timeout halfway through is what made duplicates likely in
  // the first place.
  const BATCH = 500;
  let imported = 0;
  for (let i = 0; i < toCreate.length; i += BATCH) {
    const batch = toCreate.slice(i, i + BATCH).map((r) => ({
      shopId: shopRecord.id,
      productId: r.productId,
      productTitle: r.productTitle,
      rating: r.rating,
      reviewTitle: r.reviewTitle,
      body: r.body,
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      photoUrl: r.photoUrl,
      approved: r.approved,
      // Omitted rather than defaulted to now, so Prisma's own default applies
      // and the "no date" warning above stays truthful.
      ...(r.createdAt ? { createdAt: r.createdAt } : {}),
    }));
    const result = await db.review.createMany({ data: batch });
    imported += result.count;
  }

  return NextResponse.json({
    success: true,
    imported,
    // `skipped` here is the grouped array from the summary, not a count — the
    // wizard shows a reason per group rather than a bare number.
    ...summary,
  });
}
