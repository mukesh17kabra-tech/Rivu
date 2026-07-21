import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Temporary diagnostic route — not linked from any UI. Visit directly:
// /api/debug/token?shop=your-store.myshopify.com
//
// Tells you whether the stored access token is valid at all (via a
// simple, non-billing Admin API call) — isolates "token itself is bad"
// from "something billing-specific is wrong".
export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  if (!shop) {
    return NextResponse.json({ error: "Missing shop" }, { status: 400 });
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return NextResponse.json({ found: false, message: "No Shop row for this domain" });
  }

  const tokenPreview = shopRecord.accessToken
    ? `${shopRecord.accessToken.slice(0, 6)}...${shopRecord.accessToken.slice(-4)} (length ${shopRecord.accessToken.length})`
    : "EMPTY";

  const res = await fetch(`https://${shop}/admin/api/2024-10/shop.json`, {
    headers: { "X-Shopify-Access-Token": shopRecord.accessToken },
  });

  const body = await res.text();

  return NextResponse.json({
    found: true,
    tokenPreview,
    shopApiCallStatus: res.status,
    shopApiCallOk: res.ok,
    shopApiCallBodySnippet: body.slice(0, 300),
  });
}
