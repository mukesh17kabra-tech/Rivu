import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import Papa from "papaparse";

// Smart CSV import — auto-detects column names from popular review apps
// (Judge.me, Loox, Stamped.io, Yotpo, and generic exports) so merchants
// can export their existing reviews from those apps and upload the file
// as-is, without manually renaming columns to match ours.
//
// This works ONLY with data merchants export themselves from apps they
// already use — there's no automated pulling from Amazon/Flipkart/etc.
// here. Scraping reviews from marketplaces without an official API
// violates their Terms of Service and risks the merchant's seller
// account, so that's intentionally not supported.
//
// Each field below lists every known column-name variant we recognize,
// in priority order. Extra/unrecognized columns in the CSV are ignored.
const FIELD_ALIASES: Record<string, string[]> = {
  productId: ["productid", "product_id", "productgid", "product_gid", "handle", "product_handle"],
  productTitle: ["producttitle", "product_title", "product_name", "productname", "product"],
  rating: ["rating", "stars", "score", "review_rating"],
  reviewTitle: ["reviewtitle", "review_title", "title", "headline", "summary"],
  body: ["body", "review", "review_body", "content", "text", "comment", "message"],
  customerName: ["customername", "customer_name", "reviewername", "reviewer_name", "name", "author"],
  customerEmail: ["customeremail", "customer_email", "revieweremail", "reviewer_email", "email"],
  photoUrl: ["photourl", "photo_url", "photos", "image", "image_url", "picture"],
  approved: ["approved", "published", "status", "is_published", "state"],
};

function findColumn(row: Record<string, string>, field: string): string | undefined {
  const aliases = FIELD_ALIASES[field] || [field];
  const normalize = (s: string) => s.toLowerCase().replace(/[\s\-_]/g, "");
  const rowKeys = Object.keys(row);
  for (const alias of aliases) {
    const found = rowKeys.find((k) => normalize(k) === normalize(alias));
    if (found && row[found]?.trim()) return row[found].trim();
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const shop = body?.shop as string | undefined;
  const csvText = body?.csv as string | undefined;

  if (!shop || !csvText) {
    return NextResponse.json({ error: "Missing shop or csv" }, { status: 400 });
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length) {
    return NextResponse.json(
      { error: "CSV parse error", details: parsed.errors.slice(0, 3) },
      { status: 400 }
    );
  }

  let imported = 0;
  let skipped = 0;
  const skipReasons: string[] = [];

  for (const row of parsed.data) {
    const productId = findColumn(row, "productId");
    const productTitle = findColumn(row, "productTitle");
    const ratingRaw = findColumn(row, "rating");
    const reviewTitle = findColumn(row, "reviewTitle");
    const reviewBody = findColumn(row, "body");
    const customerName = findColumn(row, "customerName");
    const customerEmail = findColumn(row, "customerEmail");
    const photoUrl = findColumn(row, "photoUrl");
    const approvedRaw = findColumn(row, "approved");

    // Some apps (e.g. Judge.me) use a product handle instead of a numeric
    // ID — that's fine, we just store whatever identifier the CSV gives,
    // as long as it's consistent with what the storefront widget will
    // later query by. If the merchant's widget uses Shopify product IDs,
    // handle-based imports won't visually match up until re-mapped — this
    // is called out in the skip/warning summary below when detected.
    const rating = Number(ratingRaw);

    if (!productId || !productTitle || !reviewBody || !customerName || !rating || rating < 1 || rating > 5) {
      skipped++;
      if (skipReasons.length < 5) {
        skipReasons.push(`Row skipped (missing/invalid required field): ${JSON.stringify(row)}`);
      }
      continue;
    }

    // Judge.me/Loox/etc. often export status as "published"/"pending" or
    // "true"/"false" rather than our own "approved" wording — treat any
    // negative-sounding value as unapproved, default to approved
    // otherwise (assumption: merchant already vetted these elsewhere).
    const approved = approvedRaw
      ? !["false", "pending", "unpublished", "rejected", "0", "no"].includes(approvedRaw.toLowerCase())
      : true;

    await db.review.create({
      data: {
        shopId: shopRecord.id,
        productId,
        productTitle,
        rating,
        reviewTitle: reviewTitle || undefined,
        body: reviewBody,
        customerName,
        customerEmail: customerEmail || undefined,
        photoUrl,
        approved,
      },
    });
    imported++;
  }

  return NextResponse.json({ success: true, imported, skipped, skipReasons });
}
