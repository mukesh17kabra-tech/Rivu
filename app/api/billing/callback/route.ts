import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activateCharge, getCharge, PLANS, PlanKey } from "@/lib/billing";

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  const chargeId = req.nextUrl.searchParams.get("charge_id");
  const planParam = (req.nextUrl.searchParams.get("plan") as PlanKey) || "starter";

  if (!shop || !chargeId) {
    return NextResponse.json({ error: "Missing shop or charge_id" }, { status: 400 });
  }
  if (!(planParam in PLANS) || planParam === "free") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const charge = await getCharge(shop, shopRecord.accessToken, chargeId);

  if (!charge || charge.status !== "accepted") {
    return NextResponse.redirect(
      `${process.env.HOST}/dashboard/plans?shop=${shop}&billing=declined`
    );
  }

  await activateCharge(shop, shopRecord.accessToken, chargeId);

  await db.shop.update({
    where: { shopDomain: shop },
    data: { plan: planParam },
  });

  return NextResponse.redirect(
    `${process.env.HOST}/dashboard/plans?shop=${shop}&billing=success&plan=${planParam}`
  );
}
