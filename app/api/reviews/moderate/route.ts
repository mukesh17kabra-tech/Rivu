import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/require-session";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  // Merchant-only: requires a valid Shopify session token, which App Bridge
  // attaches automatically. A bare ?shop= param proves nothing.
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const { shop, reviewId, action, reply } = body || {};
  if (String(shop).trim().toLowerCase() !== auth.shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }


  // approveAll works on the whole pending queue, so it is the one action
  // without a review id.
  const needsId = action !== "approveAll";
  if (
    !shop ||
    (needsId && !reviewId) ||
    !["approve", "reject", "unpublish", "approveAll", "reply"].includes(action)
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  // Prisma throws when the row doesn't match (a stale review id from an
  // already-refreshed table, say), which surfaced as a 500. That's a missing
  // review, not a server fault — report it as one.
  try {
    if (action === "approveAll") {
      // "Publish automatically" only decides what happens to reviews as they
      // arrive — it cannot reach back and publish ones already held. A
      // merchant who turns it on reasonably expects nothing to be pending, so
      // this clears the queue in one go rather than one review at a time.
      const { count } = await db.review.updateMany({
        where: { shopId: shopRecord.id, approved: false },
        data: { approved: true },
      });
      return NextResponse.json({ success: true, published: count });
    }

    if (action === "reply") {
      // Stored as plain text and escaped when rendered. An empty reply clears
      // it, so a merchant can withdraw a reply without deleting the review.
      const text = typeof reply === "string" ? reply.trim().slice(0, 2000) : "";
      await db.review.update({
        where: { id: reviewId, shopId: shopRecord.id },
        data: {
          ownerReply: text || null,
          ownerReplyAt: text ? new Date() : null,
        },
      });
      return NextResponse.json({ success: true, ownerReply: text });
    }

    if (action === "approve") {
      await db.review.update({
        where: { id: reviewId, shopId: shopRecord.id },
        data: { approved: true },
      });
    } else if (action === "unpublish") {
      await db.review.update({
        where: { id: reviewId, shopId: shopRecord.id },
        data: { approved: false },
      });
    } else {
      await db.review.delete({ where: { id: reviewId, shopId: shopRecord.id } });
    }
  } catch (err) {
    const code = (err as { code?: string }).code;
    // P2025 = "record to update/delete not found"
    if (code === "P2025") {
      return NextResponse.json(
        { error: "That review no longer exists." },
        { status: 404 }
      );
    }
    console.error(`[reviews/moderate] ${action} failed for ${shop}:`, err);
    return NextResponse.json(
      { error: "Couldn't update that review. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
