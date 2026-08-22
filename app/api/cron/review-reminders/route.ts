import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendReviewReminderEmail } from "@/lib/email";
import { getRecentOrders } from "@/lib/shopify";
import { checkReminderQuota, startOfMonth } from "@/lib/usage-limits";

// Triggered daily by Vercel Cron (see vercel.json). Protected by a shared
// secret so only Vercel's scheduler (or you, manually) can call it.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shops = await db.shop.findMany({ where: { reminderEnabled: true } });

  // Queue orders before sending. The orders/create webhook is the primary
  // path, but it only ever sees *new* orders — every merchant's existing
  // history is invisible to it, and Shopify occasionally fails a delivery.
  // Polling on the same schedule reconciles both, and the unique constraint
  // on (shopId, orderId, productId) makes re-queueing an order a no-op.
  let queued = 0;
  for (const shop of shops) {
    try {
      // Reach back past the delay so an order becomes eligible on time even
      // if it was placed before the app was installed.
      const lookbackDays = shop.reminderDelayDays + 30;
      const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
      const orders = await getRecentOrders(shop.shopDomain, since.toISOString());

      for (const order of orders) {
        const customerEmail = order.email || order.contact_email;
        if (!customerEmail) continue; // nothing to send to

        const customerName = order.customer
          ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim()
          : undefined;

        for (const item of order.line_items ?? []) {
          if (!item.product_id) continue;
          const result = await db.pendingReviewRequest.upsert({
            where: {
              shopId_orderId_productId: {
                shopId: shop.id,
                orderId: String(order.id),
                productId: String(item.product_id),
              },
            },
            update: {},
            create: {
              shopId: shop.id,
              orderId: String(order.id),
              productId: String(item.product_id),
              productTitle: item.title,
              customerEmail,
              customerName: customerName || undefined,
              purchasedAt: new Date(order.created_at || Date.now()),
            },
          });
          if (result) queued++;
        }
      }
    } catch (err) {
      // One shop's failure must not stop the others being processed.
      console.error(`[cron/review-reminders] backfill failed for ${shop.shopDomain}:`, err);
    }
  }

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

    // The plans advertise a monthly reminder allowance — Free none, Pro
    // 50, Pro unlimited — so it has to be counted. Sends are stamped with
    // reminderSentAt, which makes this month's total a single query.
    let sentThisMonth = await db.pendingReviewRequest.count({
      where: { shopId: shop.id, reminderSentAt: { gte: startOfMonth() } },
    });

    for (const req of due) {
      const allowance = checkReminderQuota(shop.plan, sentThisMonth);
      if (!allowance.allowed) {
        // Out of allowance: leave the remaining rows untouched so they send
        // next month rather than being silently consumed.
        console.warn(
          `[cron/review-reminders] ${shop.shopDomain} reached its reminder allowance`
        );
        break;
      }

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
        sentThisMonth++;
      } catch (err) {
        console.error(`[cron/review-reminders] Failed for ${req.customerEmail}:`, err);
      }
    }
  }

  return NextResponse.json({ ok: true, queued, sent });
}
