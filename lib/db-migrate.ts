import { db } from "./db";

// Each statement runs individually — Postgres does not allow multiple
// commands in a single prepared statement ($executeRawUnsafe call).
const MIGRATIONS = [
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "displayStyle" TEXT NOT NULL DEFAULT 'list'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT NOT NULL DEFAULT '#111111'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "starColor" TEXT NOT NULL DEFAULT '#f5b400'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "textColor" TEXT NOT NULL DEFAULT '#333333'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "fontFamily" TEXT NOT NULL DEFAULT 'inherit'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "borderRadius" INTEGER NOT NULL DEFAULT 8`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "arrowColor" TEXT NOT NULL DEFAULT '#111111'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "gridColumns" INTEGER NOT NULL DEFAULT 3`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "carouselVisible" INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "formAlign" TEXT NOT NULL DEFAULT 'left'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "formMaxWidth" INTEGER NOT NULL DEFAULT 540`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "widgetMaxWidth" INTEGER NOT NULL DEFAULT 900`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "widgetTitle" TEXT NOT NULL DEFAULT 'Customer Reviews'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "topSpacing" INTEGER NOT NULL DEFAULT 24`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "showSuggestionsOnWebsite" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "showSuggestionsOnQr" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "suggestionLanguage" TEXT NOT NULL DEFAULT 'en'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "rangeColor" TEXT NOT NULL DEFAULT '#f5b400'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "reviewTextSize" INTEGER NOT NULL DEFAULT 14`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "reviewTextAlign" TEXT NOT NULL DEFAULT 'left'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "headingFontSize" INTEGER NOT NULL DEFAULT 11`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "headingBold" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "headingAlign" TEXT NOT NULL DEFAULT 'left'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "showBorder" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "borderColor" TEXT NOT NULL DEFAULT '#e0e0e0'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "borderWidth" INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "borderStyle" TEXT NOT NULL DEFAULT 'solid'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "backgroundGradient" TEXT`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "primaryGradient" TEXT`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "letCustomerPickLanguage" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "enabledLanguages" TEXT[] DEFAULT ARRAY['en']::TEXT[]`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "formTemplate" TEXT NOT NULL DEFAULT 'basic'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "summaryLayout" TEXT NOT NULL DEFAULT 'modern'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "summaryBgColor" TEXT NOT NULL DEFAULT '#f8f8f8'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "summaryTextColor" TEXT NOT NULL DEFAULT '#333333'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "summaryWidth" INTEGER NOT NULL DEFAULT 220`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "summaryPosition" TEXT NOT NULL DEFAULT 'left'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "filterBgColor" TEXT NOT NULL DEFAULT '#ffffff'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "filterTextColor" TEXT NOT NULL DEFAULT '#999999'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "filterBorderColor" TEXT NOT NULL DEFAULT 'rgba(0,0,0,0.08)'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "sortBgColor" TEXT NOT NULL DEFAULT '#ffffff'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "sortTextColor" TEXT NOT NULL DEFAULT '#333333'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "sortBorderColor" TEXT NOT NULL DEFAULT '#dddddd'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "reviewCountFontSize" INTEGER NOT NULL DEFAULT 14`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "reviewTitleColor" TEXT NOT NULL DEFAULT '#111111'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "reviewBodyColor" TEXT NOT NULL DEFAULT '#333333'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "reviewMetaColor" TEXT NOT NULL DEFAULT '#999999'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "formBgColor" TEXT NOT NULL DEFAULT '#ffffff'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "formTextColor" TEXT NOT NULL DEFAULT '#1a1a2e'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "formCloseColor" TEXT NOT NULL DEFAULT '#999999'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "ratingBadgeStarSize" INTEGER NOT NULL DEFAULT 16`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "ratingBadgeTemplate" TEXT NOT NULL DEFAULT '{rating}'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "splitSummary" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "reviewTitle" TEXT`,
  // Half-star ratings. Widening Int -> double precision preserves every
  // existing value; re-running it on an already-converted column is a no-op.
  `ALTER TABLE "Review" ALTER COLUMN "rating" TYPE DOUBLE PRECISION`,
  `ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "recommends" BOOLEAN`,
  `ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "ownerReply" TEXT`,
  `ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "ownerReplyAt" TIMESTAMP(3)`,
  // Expiring offline access tokens — see prisma/schema.prisma and
  // lib/access-token.ts. Nullable: existing rows hold a legacy
  // non-expiring token that can't be refreshed and must be re-minted.
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "tokenExpiresAt" TIMESTAMP(3)`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "refreshToken" TEXT`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "refreshTokenExpiresAt" TIMESTAMP(3)`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "tokenScope" TEXT`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "autoApproveReviews" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "richSnippetsEnabled" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "customTemplateEnabled" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "customTemplateHtml" TEXT`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "customTemplateCss" TEXT`,
  // AI review-suggestion pool. Each row is claimed at most once per shop —
  // see lib/suggestion-pool.ts.
  `CREATE TABLE IF NOT EXISTS "ReviewSuggestion" (
     "id" TEXT NOT NULL,
     "shopId" TEXT NOT NULL,
     "language" TEXT NOT NULL,
     "rating" INTEGER NOT NULL,
     "productId" TEXT,
     "text" TEXT NOT NULL,
     "textHash" TEXT NOT NULL,
     "usedAt" TIMESTAMP(3),
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "ReviewSuggestion_pkey" PRIMARY KEY ("id")
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ReviewSuggestion_shopId_language_rating_textHash_key"
     ON "ReviewSuggestion"("shopId", "language", "rating", "textHash")`,
  `CREATE INDEX IF NOT EXISTS "ReviewSuggestion_shopId_language_rating_usedAt_idx"
     ON "ReviewSuggestion"("shopId", "language", "rating", "usedAt")`,
  // Added separately so a re-run doesn't fail once the constraint exists.
  `DO $$ BEGIN
     ALTER TABLE "ReviewSuggestion" ADD CONSTRAINT "ReviewSuggestion_shopId_fkey"
       FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

let ran = false;

/**
 * `force` re-runs the statements even if this process already did.
 *
 * Used by the schema self-heal in lib/db.ts. The flag is per-process, and the
 * loop below deliberately swallows errors, so "already ran" is not the same as
 * "the schema is correct": a statement that failed for a real reason would
 * otherwise be permanently skipped for the life of the lambda, leaving the
 * app broken until it recycled. Every statement is idempotent
 * (ADD COLUMN IF NOT EXISTS), so repeating them is cheap and safe.
 */
export async function runAutoMigrations({ force = false } = {}) {
  if (ran && !force) return;
  ran = true;
  for (const sql of MIGRATIONS) {
    try {
      await db.$executeRawUnsafe(sql);
    } catch {
      // Column already exists — safe to ignore
    }
  }
}
