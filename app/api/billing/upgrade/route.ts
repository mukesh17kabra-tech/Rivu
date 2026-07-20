import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createRecurringCharge, PLANS, PlanKey } from "@/lib/billing";

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  const planParam = req.nextUrl.searchParams.get("plan") as PlanKey | null;

  if (!shop) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  }
  if (!planParam || planParam === "free" || !(planParam in PLANS)) {
    return NextResponse.json(
      { error: "Missing or invalid plan. Use ?plan=starter, growth, or pro" },
      { status: 400 }
    );
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const charge = await createRecurringCharge(shop, shopRecord.accessToken, planParam);
  return NextResponse.redirect(charge.confirmation_url);
}
