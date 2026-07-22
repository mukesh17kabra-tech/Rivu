import { NextRequest, NextResponse } from "next/server";
import { getSuggestions } from "@/lib/review-suggestions";
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
    // Non-English suggestion languages are a paid-plan feature — Free
    // plan always gets English regardless of what's requested, so this
    // can't be bypassed by just calling the API directly with &lang=hi.
    if (shopRecord && shopRecord.plan !== "free") {
      // Customer's own explicit choice (from the storefront dropdown, if
      // the merchant enabled that) takes priority over the merchant's
      // saved default language.
      language = explicitLang || shopRecord.suggestionLanguage;
    }
  }

  const suggestions = getSuggestions(rating, productTitle, 7, language);
  return withCors(NextResponse.json({ suggestions }));
}
