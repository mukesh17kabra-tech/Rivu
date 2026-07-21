import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const RETENTION_DAYS = 90;

// Triggered daily by Vercel Cron (see vercel.json). Deletes
// PendingReviewRequest rows that are older than RETENTION_DAYS and never
// resulted in a review — these hold a customer's email/name/purchase
// info purely to power reminder emails, and shouldn't be kept indefinitely
// once they're no longer useful (either already reminded-and-ignored past
// the retention window, or never going to be actioned).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const result = await db.pendingReviewRequest.deleteMany({
    where: {
      reviewed: false,
      purchasedAt: { lte: cutoff },
    },
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}
