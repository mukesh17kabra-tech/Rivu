import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { sendReviewReminderEmail, isEmailConfigured } from "@/lib/email";
import { getProducts } from "@/lib/shopify";
import { appUrl } from "@/lib/app-url";

/**
 * Sends the merchant a test copy of their review-reminder email.
 *
 * Built to mirror app/api/cron/review-reminders exactly — same helper, same
 * URL shapes, same reply-to handling — so what lands in the inbox is what a
 * customer would actually receive. It also accepts the subject/body/reply-to
 * currently in the form, so a merchant can try wording out before saving.
 */

const schema = z.object({
  shop: z.string().min(1),
  to: z.string().email("That doesn't look like a valid email address."),
  // Unsaved form values — fall back to what's stored.
  fromEmail: z.string().optional(),
  emailSubject: z.string().max(300).optional(),
  emailBodyTemplate: z.string().max(20000).optional(),
});

/**
 * One test send per shop every 15 seconds. The route is merchant-only
 * already; this just stops a stuck button or an impatient click from firing
 * a burst at an arbitrary inbox.
 */
const lastSendByShop = new Map<string, number>();
const COOLDOWN_MS = 15_000;

export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { shop, to, fromEmail, emailSubject, emailBodyTemplate } = parsed.data;
  if (shop.trim().toLowerCase() !== auth.shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Surface a missing mail configuration as a clear message rather than
  // letting the Resend client throw — this is exactly what a merchant is
  // trying to find out by pressing the button.
  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "Email isn't configured on the server yet — RESEND_API_KEY and EMAIL_FROM both need to be set. Contact support.",
      },
      { status: 503 }
    );
  }

  const last = lastSendByShop.get(auth.shop) ?? 0;
  const waitMs = COOLDOWN_MS - (Date.now() - last);
  if (waitMs > 0) {
    return NextResponse.json(
      { error: `Please wait ${Math.ceil(waitMs / 1000)}s before sending another test.` },
      { status: 429 }
    );
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: auth.shop } });
  if (!shopRecord) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  // Use a real product where we can, so the test looks like the real thing.
  // A failure here must not fail the test send — fall back to a sample.
  let productId = "sample-product";
  let productTitle = "Your Product";
  let productImageUrl: string | undefined;
  try {
    const products = await getProducts(auth.shop);
    if (products.length > 0) {
      productId = String(products[0].id);
      productTitle = products[0].title;
      productImageUrl = products[0].image?.src;
    }
  } catch {
    // keep the sample values
  }

  const base = appUrl(req);
  const q = encodeURIComponent;
  const productQuery =
    `shop=${q(auth.shop)}&productId=${q(productId)}&productTitle=${q(productTitle)}` +
    (productImageUrl ? `&productImage=${q(productImageUrl)}` : "");

  try {
    lastSendByShop.set(auth.shop, Date.now());

    await sendReviewReminderEmail({
      to,
      customerName: "Alex",
      productTitle,
      productImageUrl,
      shopName: auth.shop,
      reviewUrl: `${base}/review?${productQuery}`,
      unsubscribeUrl: `${base}/api/unsubscribe?shop=${q(auth.shop)}&email=${q(to)}`,
      qrCodeUrl: `${base}/api/qrcode?${productQuery}`,
      // Prefer the value being edited right now over the saved one.
      replyToEmail: (fromEmail ?? shopRecord.fromEmail) || undefined,
      subjectTemplate: emailSubject ?? shopRecord.emailSubject,
      bodyTemplate: emailBodyTemplate ?? shopRecord.emailBodyTemplate,
    });

    return NextResponse.json({ success: true, to });
  } catch (err) {
    // Let the merchant retry immediately if the send failed.
    lastSendByShop.delete(auth.shop);
    console.error(`[shop/test-email] send failed for ${auth.shop}:`, err);

    const message = err instanceof Error ? err.message : "";
    // Resend's most common rejection during setup: the from-domain isn't
    // verified, or the account is still in sandbox mode.
    const hint = /domain|verif|sandbox|from/i.test(message)
      ? "Resend rejected the sender address — check that your EMAIL_FROM domain is verified in Resend."
      : "We couldn't send the test email. Please try again in a moment.";

    return NextResponse.json({ error: hint }, { status: 502 });
  }
}
