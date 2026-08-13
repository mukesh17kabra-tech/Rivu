import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/require-session";
import { resetToFreePlan } from "@/lib/free-plan-defaults";

export async function POST(req: NextRequest) {
  // Merchant-only: requires a valid Shopify session token, which App Bridge
  // attaches automatically. A bare ?shop= param proves nothing.
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;

  const { shop } = await req.json().catch(() => ({}));
  if (String(shop).trim().toLowerCase() !== auth.shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!shop) return NextResponse.json({ error: "Missing shop" }, { status: 400 });

  await resetToFreePlan(shop);

  return NextResponse.json({ success: true });
}
