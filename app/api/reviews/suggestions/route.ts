import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serveSuggestions } from "@/lib/suggestion-pool";

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

/**
 * Suggestions for a shopper writing a review.
 *
 * Public by design — shoppers on the storefront have no session token.
 *
 * Serves from the store's AI-generated pool, where each suggestion can be
 * claimed only once (see lib/suggestion-pool.ts), and falls back to the
 * static templates when AI isn't configured.
 */
export async function GET(req: NextRequest) {
  const rating = Number(req.nextUrl.searchParams.get("rating"));
  const productTitle = req.nextUrl.searchParams.get("productTitle") || "this product";
  const productId = req.nextUrl.searchParams.get("productId");
  const shop = req.nextUrl.searchParams.get("shop");
  const explicitLang = req.nextUrl.searchParams.get("lang");

  if (!rating || rating < 1 || rating > 5) {
    return withCors(NextResponse.json({ error: "Invalid rating" }, { status: 400 }));
  }
  if (!shop) {
    return withCors(NextResponse.json({ error: "Missing shop" }, { status: 400 }));
  }

  const shopRecord = await db.shop.findUnique({
    where: { shopDomain: shop },
    select: { id: true, suggestionLanguage: true, enabledLanguages: true },
  });
  if (!shopRecord) {
    return withCors(NextResponse.json({ error: "Shop not found" }, { status: 404 }));
  }

  const allowed = shopRecord.enabledLanguages.length ? shopRecord.enabledLanguages : ["en"];
  // The customer's own choice (from the storefront dropdown, if the merchant
  // enabled it) beats the merchant's default — but only among languages the
  // merchant actually turned on, so &lang=ja can't be forced via the URL.
  const requested = explicitLang || shopRecord.suggestionLanguage;
  const language = allowed.includes(requested) ? requested : allowed[0];

  try {
    const { items, source } = await serveSuggestions({
      shopId: shopRecord.id,
      productTitle,
      productId,
      language,
      rating,
    });

    return withCors(
      NextResponse.json({
        items,
        source,
        // Kept so storefront widgets cached from before this change keep
        // working — they read `suggestions` as a plain string array.
        suggestions: items.map((i) => i.text),
      })
    );
  } catch (err) {
    console.error(`[reviews/suggestions] failed for ${shop}:`, err);
    return withCors(NextResponse.json({ items: [], suggestions: [] }));
  }
}
