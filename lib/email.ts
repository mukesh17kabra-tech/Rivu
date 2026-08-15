import { Resend } from "resend";

// Lazily construct the client on first use, not at module load time — an
// eagerly-constructed client with a missing RESEND_API_KEY would throw
// during Next.js's build-time "collecting page data" step and fail the
// whole deployment (this bit the restock-alert-app early on).
let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set — add it in Vercel's env vars.");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

/**
 * The verified sender address.
 *
 * Accepts either name: .env.example documents EMAIL_FROM, but the deployed
 * configuration uses RESEND_FROM_EMAIL. Only EMAIL_FROM was ever read, so the
 * address silently fell back to a placeholder domain that Resend rejects —
 * every reminder email failed. Reading both means neither name is wrong.
 *
 * Throws rather than falling back to a placeholder: a clear error beats
 * sending from an address that cannot deliver.
 */
export function resolveFromAddress(): string {
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error(
      "No sender address configured — set EMAIL_FROM (or RESEND_FROM_EMAIL) to a domain verified in Resend."
    );
  }
  return from;
}

/** True when email can actually be sent, for pre-flight checks. */
export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY &&
      (process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL)
  );
}

export async function sendReviewReminderEmail(params: {
  to: string;
  customerName: string;
  productTitle: string;
  shopName: string;
  productImageUrl?: string;
  reviewUrl: string;
  unsubscribeUrl: string;
  qrCodeUrl: string; // PNG URL (from /api/qrcode) — customer can scan on a phone instead of clicking the link
  replyToEmail?: string; // merchant's own address — customer sees/replies here, but "From" stays on our verified domain
  subjectTemplate: string;
  bodyTemplate: string;
}) {
  const {
    to,
    customerName,
    productTitle,
    shopName,
    productImageUrl,
    reviewUrl,
    unsubscribeUrl,
    qrCodeUrl,
    replyToEmail,
    subjectTemplate,
    bodyTemplate,
  } = params;

  // Merchant-editable subject/body, with {{variable}} placeholders filled
  // in — matches the variables shown in the app's Email Requests settings:
  // {{first_name}}, {{shop_name}}, {{review_link}}, {{product_name}}
  const fillTemplate = (text: string) =>
    text
      .replace(/\{\{\s*first_name\s*\}\}/g, customerName || "there")
      .replace(/\{\{\s*shop_name\s*\}\}/g, shopName)
      .replace(/\{\{\s*review_link\s*\}\}/g, reviewUrl)
      .replace(/\{\{\s*product_name\s*\}\}/g, productTitle);

  const subject = fillTemplate(subjectTemplate);
  const bodyText = fillTemplate(bodyTemplate);

  // Convert the plain-text template (with \n line breaks, as edited in a
  // <textarea>) into simple HTML, turning the review link into a clickable
  // button and preserving line breaks otherwise.
  const bodyHtml = bodyText
    .split("\n")
    .map((line) =>
      line.includes(reviewUrl)
        ? line.replace(
            reviewUrl,
            `</p><a href="${reviewUrl}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;margin:8px 0;">Leave a review</a><p>`
          )
        : line
    )
    .join("<br/>");

  return getResend().emails.send({
    from: resolveFromAddress(),
    replyTo: replyToEmail || undefined,
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        ${
          productImageUrl
            ? `<img src="${productImageUrl}" style="width:100%;max-width:300px;border-radius:8px;margin:0 0 12px;" />`
            : ""
        }
        <p>${bodyHtml}</p>
        <div style="text-align:center;margin:24px 0;padding:20px;background:#fafafa;border-radius:8px;">
          <p style="margin:0 0 10px;font-size:13px;color:#666;">Or scan this code with your phone to leave a review:</p>
          <img src="${qrCodeUrl}" alt="Scan to review" style="width:140px;height:140px;" />
        </div>
        <p style="color:#999;font-size:12px;margin-top:32px;">
          Don't want these emails? <a href="${unsubscribeUrl}" style="color:#999;">Unsubscribe</a>
        </p>
      </div>
    `,
  });
}
