import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const VALID_PLANS = ["free", "starter", "growth", "pro"];

// ⚠️ Testing convenience only. This sets Shop.plan directly with no
// Shopify charge created at all — the merchant is NOT billed. Useful
// while developing (especially when Shopify's Billing API rejects
// requests for reasons unrelated to your code, like an app not yet fully
// registered in a Partner org). Remove this route — or gate it behind an
// env var / your own account check — before a real public launch, since
// right now ANY shop could call it to unlock paid features for free.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const shop = body?.shop as string | undefined;
  const plan = body?.plan as string | undefined;

  if (!shop || !plan || !VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: "Invalid shop or plan" }, { status: 400 });
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  await db.shop.update({
    where: { shopDomain: shop },
    data: { plan },
  });

  return NextResponse.json({ success: true, plan });
}
