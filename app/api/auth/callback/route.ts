import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/shopify";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const storedState = req.cookies.get("shopify_oauth_state")?.value;

  if (!shop || !code) {
    return NextResponse.json({ error: "Missing shop or code" }, { status: 400 });
  }
  if (!state || state !== storedState) {
    return NextResponse.json({ error: "Invalid state, possible CSRF" }, { status: 403 });
  }

  const { access_token } = await exchangeCodeForToken(shop, code);

  await db.shop.upsert({
    where: { shopDomain: shop },
    update: { accessToken: access_token },
    create: { shopDomain: shop, accessToken: access_token },
  });

  return NextResponse.redirect(`${process.env.HOST}/dashboard/reviews?shop=${shop}`);
}
