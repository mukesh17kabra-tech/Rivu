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

export async function sendReviewReminderEmail(params: {
  to: string;
  customerName: string;
  productTitle: string;
  productImageUrl?: string;
  reviewUrl: string;
  replyToEmail?: string; // merchant's own address — customer sees/replies here, but "From" stays on our verified domain
}) {
  const { to, customerName, productTitle, productImageUrl, reviewUrl, replyToEmail } = params;

  return getResend().emails.send({
    from: process.env.EMAIL_FROM || "reviews@yourapp.com",
    replyTo: replyToEmail || undefined,
    to,
    subject: `How's your ${productTitle} working out?`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>We'd love your feedback</h2>
        <p>Hi ${customerName || "there"}, you recently picked up:</p>
        ${
          productImageUrl
            ? `<img src="${productImageUrl}" style="width:100%;max-width:300px;border-radius:8px;margin:12px 0;" />`
            : ""
        }
        <p><strong>${productTitle}</strong></p>
        <p>Got a minute to share how it's going? It really helps other shoppers.</p>
        <a href="${reviewUrl}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;margin-top:8px;">
          Leave a review
        </a>
      </div>
    `,
  });
}
