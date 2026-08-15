import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { claimSuggestion } from "@/lib/suggestion-pool";

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

/**
 * Claims a suggestion the moment a shopper picks it, so it is never offered
 * to anyone else in this store again.
 *
 * Public, like the suggestions endpoint itself — shoppers have no session
 * token. The worst a caller can do is burn suggestions from one store's
 * pool, which refills automatically; nothing is read back and no merchant
 * data is exposed.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const shop = typeof body?.shop === "string" ? body.shop.trim().toLowerCase() : null;
  const suggestionId = typeof body?.id === "string" ? body.id : null;

  if (!shop || !suggestionId) {
    return withCors(NextResponse.json({ error: "Missing shop or id" }, { status: 400 }));
  }

  const shopRecord = await db.shop.findUnique({
    where: { shopDomain: shop },
    select: { id: true },
  });
  if (!shopRecord) {
    return withCors(NextResponse.json({ error: "Shop not found" }, { status: 404 }));
  }

  try {
    // False means someone else claimed it first — the widget just leaves the
    // text in place; it's already in the shopper's hands.
    const claimed = await claimSuggestion(shopRecord.id, suggestionId);
    return withCors(NextResponse.json({ claimed }));
  } catch (err) {
    console.error(`[reviews/suggestions/claim] failed for ${shop}:`, err);
    return withCors(NextResponse.json({ claimed: false }));
  }
}
