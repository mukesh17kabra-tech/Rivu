import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { SUPPORTED_LANGUAGES } from "@/lib/review-suggestions";
import { clampDesignToPlan, PlanTier } from "@/lib/plan-gating";

const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code) as [string, ...string[]];

const schema = z.object({
  shop: z.string().min(1),
  displayStyle: z.enum(["list", "grid", "carousel", "masonry"]),
  splitSummary: z.boolean(),
  gridColumns: z.number().int().min(2).max(5),
  carouselVisible: z.number().int().min(1).max(4),
  arrowColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  starColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  rangeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  borderRadius: z.number().int().min(0).max(24),
  fontFamily: z.string().min(1).max(100),
  reviewTextSize: z.number().int().min(11).max(20),
  reviewTextAlign: z.enum(["left", "center", "right"]),
  formAlign: z.enum(["left", "center", "right"]),
  formMaxWidth: z.number().int().min(280).max(600),
  widgetMaxWidth: z.number().int().min(320).max(900),
  widgetTitle: z.string().min(1).max(100),
  headingFontSize: z.number().int().min(9).max(24),
  headingBold: z.boolean(),
  headingAlign: z.enum(["left", "center", "right"]),
  topSpacing: z.number().int().min(0).max(120),
  showBorder: z.boolean(),
  borderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  borderWidth: z.number().int().min(1).max(6),
  borderStyle: z.enum(["solid", "dashed", "dotted", "double"]),
  backgroundGradient: z.preprocess((val) => (val === "" ? null : val), z.string().max(300).nullable()),
  primaryGradient: z.preprocess((val) => (val === "" ? null : val), z.string().max(300).nullable()),
  letCustomerPickLanguage: z.boolean(),
  showSuggestionsOnWebsite: z.boolean(),
  showSuggestionsOnQr: z.boolean(),
  suggestionLanguage: z.enum(LANGUAGE_CODES),
  enabledLanguages: z.array(z.enum(LANGUAGE_CODES)).min(1).max(10),
  formTemplate: z.enum(["basic", "card", "minimal", "dark"]),
  summaryLayout: z.enum(["modern", "compact", "sidebar", "horizontal"]),
  summaryBgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  summaryTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  summaryWidth: z.number().int().min(160).max(400),
  formBgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  formTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  formCloseColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { shop, ...design } = parsed.data;

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop }, select: { plan: true } });
  if (!shopRecord) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  // Server-side enforcement — clamps any locked-for-this-plan values back
  // to their defaults before saving, regardless of what the client sent.
  // This can't be bypassed by calling the API directly with a crafted
  // payload; the plan check happens here, not just in the UI.
  const plan = (shopRecord.plan as PlanTier) || "free";
  const { clamped, lockedFields } = clampDesignToPlan(plan, design);

  await db.shop.update({
    where: { shopDomain: shop },
    data: clamped,
  });

  return NextResponse.json({ success: true, lockedFields });
}
