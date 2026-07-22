import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProductsFromOrdersByEmail } from "@/lib/shopify";

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const shop = body?.shop as string | undefined;
  const email = body?.email as string | undefined;

  if (!shop || !email) {
    return withCors(NextResponse.json({ error: "Missing shop or email" }, { status: 400 }));
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return withCors(NextResponse.json({ error: "Store not found" }, { status: 404 }));
  }

  try {
    const products = await getProductsFromOrdersByEmail(shop, shopRecord.accessToken, email);
    if (products.length === 0) {
      return withCors(
        NextResponse.json(
          { error: "We couldn't find any order placed with this email. Please double-check and try again." },
          { status: 404 }
        )
      );
    }
    return withCors(NextResponse.json({ products }));
  } catch (err) {
    // Log the real error server-side for debugging, but never show the
    // customer a raw "401"/"403" — that's meaningless to them and looks
    // broken. This usually means the store's Protected Customer Data
    // access isn't approved yet, or the access token needs refreshing —
    // both are store-side issues, not something the customer did wrong.
    console.error(`[orders/lookup] Failed for ${shop}:`, err);
    return withCors(
      NextResponse.json(
        { error: "We're having trouble looking up your order right now. Please try again in a moment." },
        { status: 500 }
      )
    );
  }
}
