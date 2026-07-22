import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { SUPPORTED_LANGUAGES } from "@/lib/review-suggestions";

const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code) as [string, ...string[]];

const schema = z.object({
  shop: z.string().min(1),
  displayStyle: z.enum(["list", "grid", "carousel", "split"]),
  gridColumns: z.number().int().min(2).max(5),
  carouselVisible: z.number().int().min(1).max(4),
  arrowColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  starColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  borderRadius: z.number().int().min(0).max(24),
  fontFamily: z.string().min(1).max(100),
  formAlign: z.enum(["left", "center", "right"]),
  formMaxWidth: z.number().int().min(280).max(600),
  widgetMaxWidth: z.number().int().min(320).max(900),
  widgetTitle: z.string().min(1).max(100),
  topSpacing: z.number().int().min(0).max(120),
  showSuggestionsOnWebsite: z.boolean(),
  showSuggestionsOnQr: z.boolean(),
  suggestionLanguage: z.enum(LANGUAGE_CODES),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { shop, ...design } = parsed.data;

  await db.shop.update({
    where: { shopDomain: shop },
    data: design,
  });

  return NextResponse.json({ success: true });
}
