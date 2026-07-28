import crypto from "crypto";

export function verifyShopifyWebhook(rawBody: string, hmacHeader: string | null): boolean {
  if (!hmacHeader) return false;
  try {
    const generated = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
      .update(rawBody, "utf8")
      .digest("base64");
    return crypto.timingSafeEqual(Buffer.from(generated), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}
