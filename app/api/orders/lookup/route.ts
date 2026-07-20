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
        NextResponse.json({ error: "We couldn't find an order with that email." }, { status: 404 })
      );
    }
    return withCors(NextResponse.json({ products }));
  } catch (err) {
    return withCors(NextResponse.json({ error: (err as Error).message }, { status: 500 }));
  }
}
