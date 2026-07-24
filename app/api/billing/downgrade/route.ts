import { NextRequest, NextResponse } from "next/server";
import { resetToFreePlan } from "@/lib/free-plan-defaults";

export async function POST(req: NextRequest) {
  const { shop } = await req.json().catch(() => ({}));
  if (!shop) return NextResponse.json({ error: "Missing shop" }, { status: 400 });

  await resetToFreePlan(shop);

  return NextResponse.json({ success: true });
}
