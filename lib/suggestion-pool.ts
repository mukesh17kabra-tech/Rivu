import crypto from "crypto";
import { db } from "./db";
import { generateSuggestions, isAiConfigured } from "./ai-suggestions";
import { getSuggestions as getStaticSuggestions } from "./review-suggestions";
import { aiSuggestionsAllowed } from "./design-options";

/**
 * The pool of review suggestions a store can offer shoppers.
 *
 * Each suggestion is used at most once **per store**. When a shopper picks
 * one it's stamped `usedAt` and never offered in that store again, so no two
 * customers can submit word-for-word identical reviews — the thing that makes
 * a review section look fabricated.
 *
 * Deliberately scoped per store rather than globally across all merchants:
 * one shop's shoppers should never be able to exhaust another shop's
 * suggestions, and identical text in two unrelated stores is invisible to
 * everyone. To make it global instead, drop shopId from the queries below.
 */

/** Serve at least this many to the shopper. */
const SERVE_COUNT = 6;
/** Keep at least this many unused per (shop, language, rating). */
const LOW_WATER_MARK = 40;
/** Target pool size to refill to. */
const TARGET_POOL = 120;
/** How many to ask the model for per call — keeps responses small and fast. */
const BATCH_SIZE = 30;

/** Normalised hash, so near-identical text can't sneak in twice. */
function hashText(text: string): string {
  const normalised = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return crypto.createHash("sha256").update(normalised).digest("hex");
}

export type ServedSuggestion = { id: string | null; text: string };

/**
 * Adds freshly generated suggestions to a store's pool, skipping any that
 * already exist. Safe to run concurrently — the unique index is the
 * arbiter, and duplicates are ignored rather than raising.
 */
async function storeSuggestions(params: {
  shopId: string;
  language: string;
  rating: number;
  productId?: string | null;
  texts: string[];
}): Promise<number> {
  const { shopId, language, rating, productId, texts } = params;
  if (texts.length === 0) return 0;

  const seen = new Set<string>();
  const rows = [];
  for (const text of texts) {
    const textHash = hashText(text);
    if (seen.has(textHash)) continue;
    seen.add(textHash);
    rows.push({ shopId, language, rating, productId: productId ?? null, text, textHash });
  }

  const result = await db.reviewSuggestion.createMany({
    data: rows,
    skipDuplicates: true,
  });
  return result.count;
}

/**
 * Tops a pool back up to TARGET_POOL. Runs several generation batches, and
 * stops early if the model starts returning only duplicates (which is what
 * happens once a product's realistic phrasings are exhausted).
 */
export async function refillPool(params: {
  shopId: string;
  plan: string;
  productTitle: string;
  language: string;
  rating: number;
  productId?: string | null;
}): Promise<number> {
  const { shopId, plan, productTitle, language, rating, productId } = params;
  // Second line of defence: nothing generates for a shop that isn't paying,
  // even if a caller forgets the check in serveSuggestions.
  if (!aiSuggestionsAllowed(plan)) return 0;
  if (!isAiConfigured()) return 0;

  const available = await db.reviewSuggestion.count({
    where: { shopId, language, rating, usedAt: null },
  });
  let needed = TARGET_POOL - available;
  if (needed <= 0) return 0;

  let added = 0;
  while (needed > 0) {
    const texts = await generateSuggestions({
      productTitle,
      rating,
      language,
      count: Math.min(BATCH_SIZE, needed),
    });
    if (texts.length === 0) break; // provider unavailable

    const inserted = await storeSuggestions({
      shopId,
      language,
      rating,
      productId,
      texts,
    });
    added += inserted;
    needed -= inserted;

    // Everything came back as a duplicate — the well is dry for now.
    if (inserted === 0) break;
  }

  return added;
}

/**
 * Returns suggestions to show a shopper.
 *
 * Falls back to the static templates when the pool is empty and AI isn't
 * configured, so the feature always shows something. Static suggestions come
 * back with a null id — they can't be claimed, because they're shared
 * phrasings rather than pool entries.
 */
export async function serveSuggestions(params: {
  shopId: string;
  plan: string;
  productTitle: string;
  language: string;
  rating: number;
  productId?: string | null;
  count?: number;
}): Promise<{ items: ServedSuggestion[]; source: "ai" | "static" }> {
  const { shopId, plan, productTitle, language, rating, productId } = params;
  const count = params.count ?? SERVE_COUNT;

  // Free shops get the hand-written templates. AI generation costs money per
  // shop, so it is a paid feature — without this check a Free shop's shoppers
  // would spend the app's model quota.
  if (!aiSuggestionsAllowed(plan)) {
    const statics = getStaticSuggestions(rating, productTitle, count, language);
    return { items: statics.map((text) => ({ id: null, text })), source: "static" };
  }

  const unused = await db.reviewSuggestion.findMany({
    where: { shopId, language, rating, usedAt: null },
    select: { id: true, text: true },
    // Newest first would always show the same batch; take a window and
    // shuffle so repeat visitors don't see an identical list.
    take: Math.max(count * 5, 40),
    orderBy: { createdAt: "desc" },
  });

  if (unused.length >= count) {
    // Refill in the background once we dip below the low-water mark, so the
    // shopper never waits on a model call.
    if (unused.length < LOW_WATER_MARK) {
      void refillPool({ shopId, plan, productTitle, language, rating, productId }).catch(
        (err) => console.error("[suggestion-pool] background refill failed:", err)
      );
    }
    return { items: shuffle(unused).slice(0, count), source: "ai" };
  }

  // Pool too thin to serve from. Try a synchronous top-up once, then fall
  // back to templates if that didn't produce anything.
  if (isAiConfigured()) {
    await refillPool({ shopId, plan, productTitle, language, rating, productId }).catch((err) =>
      console.error("[suggestion-pool] refill failed:", err)
    );

    const afterRefill = await db.reviewSuggestion.findMany({
      where: { shopId, language, rating, usedAt: null },
      select: { id: true, text: true },
      take: Math.max(count * 5, 40),
      orderBy: { createdAt: "desc" },
    });
    if (afterRefill.length > 0) {
      return { items: shuffle(afterRefill).slice(0, count), source: "ai" };
    }
  }

  const statics = getStaticSuggestions(rating, productTitle, count, language);
  return { items: statics.map((text) => ({ id: null, text })), source: "static" };
}

/**
 * Marks a suggestion as used so it's never offered again in this store.
 *
 * The `usedAt: null` filter makes this a compare-and-set: if two shoppers
 * claim the same suggestion at the same moment, exactly one update matches a
 * row and the other is told to pick again.
 */
export async function claimSuggestion(
  shopId: string,
  suggestionId: string
): Promise<boolean> {
  const result = await db.reviewSuggestion.updateMany({
    where: { id: suggestionId, shopId, usedAt: null },
    data: { usedAt: new Date() },
  });
  return result.count === 1;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
