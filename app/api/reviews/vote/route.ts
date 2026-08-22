import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { runAutoMigrations } from "@/lib/db-migrate";
import { withDbRetry } from "@/lib/db";

/**
 * "Was this review helpful?" from the storefront.
 *
 * Called by shoppers, who are anonymous — there is no account to attach a vote
 * to, so the honest question is not "how do we stop repeat voting" but "how
 * much do we stop, and at what cost".
 *
 * The answer here is a salted hash of shop, review, IP and user agent. It stops
 * the ordinary case — the same person clicking twice, or reloading and clicking
 * again — without ever writing an IP address down, which matters because an IP
 * is personal data and this app is already subject to Shopify's protected
 * customer data rules.
 *
 * What it deliberately does not do is pretend to be proof of identity. Someone
 * switching networks or opening a private window can vote again. Preventing
 * that needs either accounts, which storefront shoppers do not have, or
 * fingerprinting, which is worse than the problem. Shoppers on shared networks
 * (an office, a campus, mobile carrier NAT) are the cost of the IP component:
 * the user agent usually separates them, and occasionally it will not.
 */

const schema = z.object({
  shop: z.string().min(1),
  reviewId: z.string().min(1),
  // null withdraws a vote, so a misclick can be undone.
  helpful: z.boolean().nullable(),
});

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

/**
 * A stable, non-reversible id for a voter.
 *
 * Salted with the app secret so the hash cannot be recomputed from an IP by
 * anyone who obtains the database, and scoped per review so the same visitor
 * cannot be followed from one review to the next.
 */
function voterKeyFor(req: NextRequest, shop: string, reviewId: string): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  // Left-most entry is the client; the rest are proxies that added themselves.
  const ip = forwarded.split(",")[0].trim() || "unknown";
  const agent = req.headers.get("user-agent") ?? "unknown";
  const salt = process.env.SHOPIFY_API_SECRET ?? "rivu-dev-salt";

  return createHash("sha256")
    .update([salt, shop, reviewId, ip, agent].join("|"))
    .digest("hex");
}

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return withCors(NextResponse.json({ error: "Invalid input" }, { status: 400 }));
  }

  const { shop, reviewId, helpful } = parsed.data;
  await withDbRetry(() => runAutoMigrations());

  const shopRecord = await db.shop.findUnique({
    where: { shopDomain: shop.trim().toLowerCase() },
    select: { id: true },
  });
  if (!shopRecord) {
    return withCors(NextResponse.json({ error: "Shop not found" }, { status: 404 }));
  }

  // Scoped to the shop: a review id alone would let anyone vote on any store's
  // reviews by guessing ids.
  const review = await db.review.findFirst({
    where: { id: reviewId, shopId: shopRecord.id, approved: true },
    select: { id: true },
  });
  if (!review) {
    return withCors(NextResponse.json({ error: "Review not found" }, { status: 404 }));
  }

  const voterKey = voterKeyFor(req, shop, reviewId);

  /**
   * The vote and the denormalised counts move together.
   *
   * Counts are recomputed from the votes rather than incremented, so they
   * cannot drift: an increment that runs twice, or a request that dies between
   * writing the vote and bumping the counter, would leave a number that no
   * longer describes the rows behind it.
   */
  const counts = await db.$transaction(async (tx) => {
    if (helpful === null) {
      await tx.reviewVote.deleteMany({ where: { reviewId, voterKey } });
    } else {
      await tx.reviewVote.upsert({
        where: { reviewId_voterKey: { reviewId, voterKey } },
        create: { reviewId, voterKey, helpful },
        update: { helpful },
      });
    }

    const [helpfulCount, unhelpfulCount] = await Promise.all([
      tx.reviewVote.count({ where: { reviewId, helpful: true } }),
      tx.reviewVote.count({ where: { reviewId, helpful: false } }),
    ]);

    await tx.review.update({
      where: { id: reviewId },
      data: { helpfulCount, unhelpfulCount },
    });

    return { helpfulCount, unhelpfulCount };
  });

  return withCors(NextResponse.json({ success: true, ...counts, vote: helpful }));
}
