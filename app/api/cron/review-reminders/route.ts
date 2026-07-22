import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendReviewReminderEmail } from "@/lib/email";

// Triggered daily by Vercel Cron (see vercel.json). Protected by a shared
// secret so only Vercel's scheduler (or you, manually) can call it.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shops = await db.shop.findMany({ where: { reminderEnabled: true } });

  let sent = 0;

  for (const shop of shops) {
    const cutoff = new Date(Date.now() - shop.reminderDelayDays * 24 * 60 * 60 * 1000);

    const due = await db.pendingReviewRequest.findMany({
      where: {
        shopId: shop.id,
        reviewed: false,
        reminderSentAt: null,
        purchasedAt: { lte: cutoff },
      },
    });

    // Load this shop's unsubscribe list once, check against it in memory
    // rather than a query per pending request.
    const unsubscribed = await db.reminderUnsubscribe.findMany({
      where: { shopId: shop.id },
      select: { customerEmail: true },
    });
    const unsubscribedEmails = new Set(unsubscribed.map((u: { customerEmail: string }) => u.customerEmail));

    for (const req of due) {
      if (unsubscribedEmails.has(req.customerEmail)) {
        // Respect opt-out — mark as "sent" (skipped) so we don't keep
        // re-checking it every day.
        await db.pendingReviewRequest.update({
          where: { id: req.id },
          data: { reminderSentAt: new Date() },
        });
        continue;
      }

      const reviewUrl = `${process.env.HOST}/review?shop=${encodeURIComponent(shop.shopDomain)}&productId=${req.productId}&productTitle=${encodeURIComponent(req.productTitle)}${req.productImageUrl ? `&productImage=${encodeURIComponent(req.productImageUrl)}` : ""}`;
      const unsubscribeUrl = `${process.env.HOST}/api/unsubscribe?shop=${encodeURIComponent(shop.shopDomain)}&email=${encodeURIComponent(req.customerEmail)}`;
      const qrCodeUrl = `${process.env.HOST}/api/qrcode?shop=${encodeURIComponent(shop.shopDomain)}&productId=${req.productId}&productTitle=${encodeURIComponent(req.productTitle)}${req.productImageUrl ? `&productImage=${encodeURIComponent(req.productImageUrl)}` : ""}`;

      try {
        await sendReviewReminderEmail({
          to: req.customerEmail,
          customerName: req.customerName || "there",
          productTitle: req.productTitle,
          shopName: shop.shopDomain,
          productImageUrl: req.productImageUrl || undefined,
          reviewUrl,
          unsubscribeUrl,
          qrCodeUrl,
          replyToEmail: shop.fromEmail || undefined,
          subjectTemplate: shop.emailSubject,
          bodyTemplate: shop.emailBodyTemplate,
        });
        await db.pendingReviewRequest.update({
          where: { id: req.id },
          data: { reminderSentAt: new Date() },
        });
        sent++;
      } catch (err) {
        console.error(`[cron/review-reminders] Failed for ${req.customerEmail}:`, err);
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
