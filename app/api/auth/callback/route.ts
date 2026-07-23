import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/shopify";
import { db } from "@/lib/db";
import { runAutoMigrations } from "@/lib/db-migrate";

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

  // Run auto-migrations (safe, idempotent — adds missing columns only)
  await runAutoMigrations();

  await db.shop.upsert({
    where: { shopDomain: shop },
    update: { accessToken: access_token },
    create: { shopDomain: shop, accessToken: access_token },
  });

  const host = req.nextUrl.searchParams.get("host");
  const params = new URLSearchParams({ shop });
  if (host) params.set("host", host);

  return NextResponse.redirect(`${process.env.HOST}/dashboard/home?${params.toString()}`);
}
