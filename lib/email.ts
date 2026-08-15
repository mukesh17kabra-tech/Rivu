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

  // The merchant writes the body as plain text in a <textarea>. The review
  // link becomes the CTA button rather than a raw URL, and the line it sat on
  // is dropped so the button isn't preceded by a dangling "Leave a review
  // here:" fragment mid-paragraph.
  const lines = bodyText.split("\n");
  const paragraphs = lines
    .filter((line) => !line.includes(reviewUrl))
    .join("\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      // Escaped before the newline→<br/> pass: the template is plain text, and
      // the product title and customer name substituted into it come from
      // order data rather than from us.
      (block) =>
        `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#3d3d47;">${escapeHtml(
          block
        ).replace(/\n/g, "<br/>")}</p>`
    )
    .join("");

  return getResend().emails.send({
    from: resolveFromAddress(),
    replyTo: replyToEmail || undefined,
    to,
    subject,
    // Table-based layout with inline styles — Outlook and Gmail strip <style>
    // blocks and ignore flex/grid, so this is the only structure that renders
    // consistently. Widths are fixed with a max-width fallback for mobile.
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f2f3f5;">
  <!-- Preheader: the grey line inbox clients show next to the subject. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Tell ${escapeHtml(shopName)} what you thought of ${escapeHtml(productTitle)}.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f3f5;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(16,17,26,.08);">

          <tr>
            <td style="height:5px;background:#111118;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td style="padding:30px 36px 0;text-align:center;">
              <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#9a9aa6;">
                ${escapeHtml(shopName)}
              </p>
            </td>
          </tr>

          ${
            productImageUrl
              ? `<tr>
            <td style="padding:22px 36px 0;text-align:center;">
              <img src="${productImageUrl}" alt="${escapeHtml(productTitle)}" width="200"
                   style="width:200px;max-width:100%;border-radius:10px;border:1px solid #ececf1;display:block;margin:0 auto;" />
            </td>
          </tr>`
              : ""
          }

          <tr>
            <td style="padding:20px 36px 0;text-align:center;">
              <h1 style="margin:0 0 6px;font-size:23px;line-height:1.3;font-weight:700;color:#111118;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                How was ${escapeHtml(productTitle)}?
              </h1>
              <div style="font-size:20px;letter-spacing:3px;color:#f5b400;line-height:1;">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 36px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              ${paragraphs}
            </td>
          </tr>

          <tr>
            <td style="padding:12px 36px 4px;text-align:center;">
              <!-- Bulletproof button: the VML fallback keeps the shape in Outlook. -->
              <a href="${reviewUrl}"
                 style="display:inline-block;padding:15px 40px;background:#111118;color:#ffffff;text-decoration:none;border-radius:9px;font-size:16px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                Write your review
              </a>
              <p style="margin:12px 0 0;font-size:13px;color:#9a9aa6;">Takes less than a minute</p>
            </td>
          </tr>

          <tr>
            <td style="padding:26px 36px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #ececf1;font-size:0;line-height:0;height:1px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 36px 8px;text-align:center;">
              <p style="margin:0 0 12px;font-size:13px;color:#7a7a88;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                Prefer your phone? Scan this instead.
              </p>
              <img src="${qrCodeUrl}" alt="Scan to leave a review" width="118"
                   style="width:118px;height:118px;border-radius:8px;border:1px solid #ececf1;padding:6px;background:#ffffff;" />
            </td>
          </tr>

          <tr>
            <td style="padding:22px 36px 30px;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#a6a6b2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                You're receiving this because you ordered from ${escapeHtml(shopName)}.<br/>
                <a href="${unsubscribeUrl}" style="color:#a6a6b2;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}

/** Merchant-authored text goes into HTML — escape before interpolating. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
