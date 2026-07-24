import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SUPPORTED_LANGUAGES } from "@/lib/review-suggestions";
import { clampDesignToPlan, PlanTier } from "@/lib/plan-gating";
import { runAutoMigrations } from "@/lib/db-migrate";

const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code) as [string, ...string[]];

// Simple color validator — accepts #rrggbb and also rgba/transparent strings
function isColor(s: unknown): boolean {
  if (typeof s !== "string") return false;
  return /^#[0-9a-fA-F]{6}$/.test(s) || s.startsWith("rgba") || s === "transparent";
}

function parseBody(body: Record<string, unknown>) {
  const errors: string[] = [];

  function str(key: string, def: string): string {
    const v = body[key];
    return typeof v === "string" && v.length > 0 ? v : def;
  }
  function num(key: string, def: number, min: number, max: number): number {
    const v = Number(body[key]);
    return isNaN(v) ? def : Math.max(min, Math.min(max, v));
  }
  function bool(key: string, def: boolean): boolean {
    const v = body[key];
    return typeof v === "boolean" ? v : def;
  }
  function color(key: string, def: string): string {
    const v = body[key];
    if (typeof v === "string" && (isColor(v) || v.startsWith("linear-gradient"))) return v;
    return def;
  }
  function oneOf<T extends string>(key: string, allowed: T[], def: T): T {
    const v = body[key];
    return allowed.includes(v as T) ? (v as T) : def;
  }

  return {
    displayStyle:             oneOf("displayStyle", ["list","grid","carousel","masonry"], "list"),
    splitSummary:             bool("splitSummary", false),
    gridColumns:              num("gridColumns", 3, 2, 5),
    carouselVisible:          num("carouselVisible", 1, 1, 4),
    arrowColor:               color("arrowColor", "#111111"),
    primaryColor:             color("primaryColor", "#111111"),
    starColor:                color("starColor", "#f5b400"),
    rangeColor:               color("rangeColor", "#f5b400"),
    backgroundColor:          color("backgroundColor", "#ffffff"),
    textColor:                color("textColor", "#333333"),
    borderRadius:             num("borderRadius", 8, 0, 24),
    fontFamily:               str("fontFamily", "inherit"),
    reviewTextSize:           num("reviewTextSize", 14, 11, 20),
    reviewTextAlign:          oneOf("reviewTextAlign", ["left","center","right"], "left"),
    formAlign:                oneOf("formAlign", ["left","center","right"], "center"),
    formMaxWidth:             num("formMaxWidth", 540, 280, 700),
    widgetMaxWidth:           num("widgetMaxWidth", 900, 320, 1200),
    widgetTitle:              str("widgetTitle", "Customer Reviews"),
    headingFontSize:          num("headingFontSize", 13, 9, 32),
    headingBold:              bool("headingBold", true),
    headingAlign:             oneOf("headingAlign", ["left","center","right"], "left"),
    topSpacing:               num("topSpacing", 24, 0, 120),
    showBorder:               bool("showBorder", false),
    borderColor:              color("borderColor", "#e0e0e0"),
    borderWidth:              num("borderWidth", 1, 1, 6),
    borderStyle:              oneOf("borderStyle", ["solid","dashed","dotted","double"], "solid"),
    backgroundGradient:       (typeof body.backgroundGradient === "string" && body.backgroundGradient) ? body.backgroundGradient : null,
    primaryGradient:          (typeof body.primaryGradient === "string" && body.primaryGradient) ? body.primaryGradient : null,
    letCustomerPickLanguage:  bool("letCustomerPickLanguage", false),
    showSuggestionsOnWebsite: bool("showSuggestionsOnWebsite", true),
    showSuggestionsOnQr:      bool("showSuggestionsOnQr", false),
    suggestionLanguage:       LANGUAGE_CODES.includes(body.suggestionLanguage as typeof LANGUAGE_CODES[number]) ? (body.suggestionLanguage as string) : "en",
    enabledLanguages:         (Array.isArray(body.enabledLanguages) ? body.enabledLanguages.filter((l: unknown) => LANGUAGE_CODES.includes(l as typeof LANGUAGE_CODES[number])) : ["en"]) as string[],
    formTemplate:             oneOf("formTemplate", ["basic","card","minimal","dark"], "basic"),
    summaryLayout:            oneOf("summaryLayout", ["modern","compact","sidebar","horizontal"], "modern"),
    summaryBgColor:           color("summaryBgColor", "#f8f8f8"),
    summaryTextColor:         color("summaryTextColor", "#333333"),
    summaryWidth:             num("summaryWidth", 220, 160, 600),
    summaryPosition:          oneOf("summaryPosition", ["left","center","right"], "left"),
    filterBgColor:            color("filterBgColor", "#ffffff"),
    filterTextColor:          color("filterTextColor", "#999999"),
    filterBorderColor:        str("filterBorderColor", "rgba(0,0,0,0.08)"),
    sortBgColor:              color("sortBgColor", "#ffffff"),
    sortTextColor:            color("sortTextColor", "#333333"),
    sortBorderColor:          color("sortBorderColor", "#dddddd"),
    reviewCountFontSize:      num("reviewCountFontSize", 14, 10, 20),
    reviewTitleColor:         color("reviewTitleColor", "#111111"),
    reviewBodyColor:          color("reviewBodyColor", "#333333"),
    reviewMetaColor:          color("reviewMetaColor", "#999999"),
    formBgColor:              color("formBgColor", "#ffffff"),
    formTextColor:            color("formTextColor", "#1a1a2e"),
    formCloseColor:           color("formCloseColor", "#999999"),
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  const shop = typeof body.shop === "string" ? body.shop : null;
  if (!shop) {
    return NextResponse.json({ error: "Missing shop" }, { status: 400 });
  }

  // Run auto-migrations so new columns always exist before saving
  await runAutoMigrations();

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop }, select: { plan: true } });
  if (!shopRecord) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const design = parseBody(body);
  const plan = (shopRecord.plan as PlanTier) || "free";
  const { clamped, lockedFields } = clampDesignToPlan(plan, design);

  await db.shop.update({
    where: { shopDomain: shop },
    data: clamped,
  });

  return NextResponse.json({ success: true, lockedFields });
}
