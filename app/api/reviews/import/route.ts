import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import Papa from "papaparse";

// Expected CSV columns (case-insensitive, extra columns ignored):
// productId, productTitle, rating, body, customerName, photoUrl (optional), approved (optional, defaults true)
//
// Imported reviews are marked approved=true by default (assumption: if a
// merchant is importing pre-existing reviews from another platform,
// they've already vetted them) — this can be overridden per-row via an
// "approved" column set to "false".
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
    // Normalize column name casing (e.g. "Product Id" vs "productId")
    const get = (key: string) => {
      const found = Object.keys(row).find((k) => k.toLowerCase().replace(/[\s_]/g, "") === key.toLowerCase());
      return found ? row[found]?.trim() : undefined;
    };

    const productId = get("productId");
    const productTitle = get("productTitle");
    const ratingRaw = get("rating");
    const reviewBody = get("body");
    const customerName = get("customerName");
    const photoUrl = get("photoUrl") || undefined;
    const approvedRaw = get("approved");

    const rating = Number(ratingRaw);

    if (!productId || !productTitle || !reviewBody || !customerName || !rating || rating < 1 || rating > 5) {
      skipped++;
      if (skipReasons.length < 5) skipReasons.push(`Row skipped (missing/invalid required field): ${JSON.stringify(row)}`);
      continue;
    }

    await db.review.create({
      data: {
        shopId: shopRecord.id,
        productId,
        productTitle,
        rating,
        body: reviewBody,
        customerName,
        photoUrl,
        approved: approvedRaw ? approvedRaw.toLowerCase() !== "false" : true,
      },
    });
    imported++;
  }

  return NextResponse.json({ success: true, imported, skipped, skipReasons });
}
