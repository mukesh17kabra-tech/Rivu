/**
 * Auto-migration: runs on app startup to add any missing columns.
 * Safe to run multiple times — uses IF NOT EXISTS everywhere.
 * This is needed because prisma migrate dev requires interactive CLI,
 * while Vercel deployments are headless. This approach adds columns
 * directly via raw SQL.
 */

import { db } from "./db";

const MIGRATIONS = [
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "rangeColor" TEXT NOT NULL DEFAULT '#f5b400'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "reviewTextSize" INTEGER NOT NULL DEFAULT 14`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "reviewTextAlign" TEXT NOT NULL DEFAULT 'left'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "headingFontSize" INTEGER NOT NULL DEFAULT 11`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "headingBold" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "headingAlign" TEXT NOT NULL DEFAULT 'left'`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "showBorder" BOOLEAN NOT NULL DEFAULT true`,
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
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "reviewTitle" TEXT`,
  `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "recommends" BOOLEAN`,
  `ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "reviewTitle" TEXT`,
  `ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "recommends" BOOLEAN`,
];

let ran = false;

export async function runAutoMigrations() {
  if (ran) return;
  ran = true;
  try {
    for (const sql of MIGRATIONS) {
      await db.$executeRawUnsafe(sql);
    }
    console.log("[rivu] auto-migrations complete");
  } catch (err) {
    console.error("[rivu] auto-migration error:", err);
  }
}
