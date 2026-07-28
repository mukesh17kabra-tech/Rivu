import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// TEMPORARY DEBUG — remove before going to app store review
export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  if (!shop) return NextResponse.json({ error: "need ?shop=yourdomain.myshopify.com" });
  try {
    const s = await db.shop.findUnique({ where: { shopDomain: shop } });
    if (!s) return NextResponse.json({ error: "shop not found" });
    // Return all relevant design fields
    const r = s as Record<string, unknown>;
    return NextResponse.json({
      plan: r.plan,
      backgroundColor: r.backgroundColor,
      primaryColor: r.primaryColor,
      starColor: r.starColor,
      summaryBgColor: r.summaryBgColor,
      summaryTextColor: r.summaryTextColor,
      summaryLayout: r.summaryLayout,
      formTemplate: r.formTemplate,
      filterTextColor: r.filterTextColor,
      reviewTitleColor: r.reviewTitleColor,
      fontFamily: r.fontFamily,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
