import { NextRequest, NextResponse } from "next/server";
import { getSuggestions, ALLOWED_LANGUAGES_BY_PLAN } from "@/lib/review-suggestions";
import { db } from "@/lib/db";

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export async function GET(req: NextRequest) {
  const rating = Number(req.nextUrl.searchParams.get("rating"));
  const productTitle = req.nextUrl.searchParams.get("productTitle") || "this product";
  const shop = req.nextUrl.searchParams.get("shop");
  const explicitLang = req.nextUrl.searchParams.get("lang");

  if (!rating || rating < 1 || rating > 5) {
    return withCors(NextResponse.json({ error: "Invalid rating" }, { status: 400 }));
  }

  let language = "en";
  if (shop) {
    const shopRecord = await db.shop.findUnique({
      where: { shopDomain: shop },
      select: { suggestionLanguage: true, plan: true },
    });
    if (shopRecord) {
      const allowed = ALLOWED_LANGUAGES_BY_PLAN[shopRecord.plan] || ALLOWED_LANGUAGES_BY_PLAN.free;
      // Customer's own explicit choice (from the storefront dropdown, if
      // the merchant enabled that) takes priority over the merchant's
      // saved default — but only if the shop's plan actually allows that
      // language. This can't be bypassed by calling the API directly with
      // &lang=ja on a Growth plan that only has 6 languages, for example.
      const requested = explicitLang || shopRecord.suggestionLanguage;
      language = allowed.includes(requested) ? requested : allowed[0];
    }
  }

  const suggestions = getSuggestions(rating, productTitle, 12, language);
  return withCors(NextResponse.json({ suggestions }));
}
