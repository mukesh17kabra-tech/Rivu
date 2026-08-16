import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { runAutoMigrations } from "@/lib/db-migrate";
import { withDbRetry } from "@/lib/db";

const schema = z.object({
  shop: z.string().min(1),
  autoApproveReviews: z.boolean(),
});

/**
 * Toggles whether new reviews publish immediately or wait for approval.
 *
 * Exists so the moderation queue is a visible choice rather than an invisible
 * default — reviews silently sitting unapproved made the storefront look
 * empty and the app look broken.
 */
export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (parsed.data.shop.trim().toLowerCase() !== auth.shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The column is created by the runtime migration list, so make sure it
  // exists before writing to it on a database that hasn't caught up yet.
  await withDbRetry(() => runAutoMigrations());

  await db.shop.update({
    where: { shopDomain: auth.shop },
    data: { autoApproveReviews: parsed.data.autoApproveReviews },
  });

  return NextResponse.json({ success: true });
}
