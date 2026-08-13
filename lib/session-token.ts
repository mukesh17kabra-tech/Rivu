import crypto from "crypto";

/**
 * Shopify session token ("id_token") verification.
 *
 * Embedded apps are loaded by Shopify Admin with an `id_token` query param
 * (and App Bridge attaches one as a Bearer token to fetches). It's a JWT
 * signed HS256 with the app's client secret. Verifying it is what proves a
 * request really came from Shopify for a particular shop — we must never
 * trust a bare `shop`/`host` query param for anything that grants access.
 *
 * Implemented by hand rather than pulling in @shopify/shopify-api: this is
 * the only JWT the app ever sees, and the verification is ~40 lines.
 */

export type SessionTokenPayload = {
  iss: string; // shop's admin domain, e.g. https://foo.myshopify.com/admin
  dest: string; // shop domain, e.g. https://foo.myshopify.com
  aud: string; // our client id
  sub: string; // Shopify user id
  exp: number;
  nbf: number;
  iat: number;
  jti: string;
  sid: string;
};

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/**
 * Returns the decoded payload if the token is valid, otherwise null.
 * Never throws — callers treat null as "not authenticated" and fall back
 * to the bounce/OAuth path instead of surfacing an error page.
 */
export function verifySessionToken(token: string): SessionTokenPayload | null {
  const secret = process.env.SHOPIFY_API_SECRET;
  const clientId = process.env.SHOPIFY_API_KEY;
  if (!secret || !clientId || !token) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const header = JSON.parse(base64UrlDecode(headerB64).toString("utf-8"));
    if (header.alg !== "HS256") return null;

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest();
    const actual = base64UrlDecode(signatureB64);
    if (expected.length !== actual.length) return null;
    if (!crypto.timingSafeEqual(expected, actual)) return null;

    const payload = JSON.parse(
      base64UrlDecode(payloadB64).toString("utf-8")
    ) as SessionTokenPayload;

    // `aud` must be our own client id — otherwise this is another app's token.
    if (payload.aud !== clientId) return null;

    // Allow 10s of clock skew in both directions; these tokens live ~1 minute.
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp < now - 10) return null;
    if (typeof payload.nbf === "number" && payload.nbf > now + 10) return null;

    // `dest` and `iss` must agree on the shop, and it must be a Shopify domain.
    const shop = shopFromSessionToken(payload);
    if (!shop) return null;
    if (!payload.iss || !payload.iss.startsWith(`https://${shop}/`)) return null;

    return payload;
  } catch {
    return null;
  }
}

/** Extracts the `foo.myshopify.com` domain from a verified payload's `dest`. */
export function shopFromSessionToken(
  payload: Pick<SessionTokenPayload, "dest">
): string | null {
  if (!payload?.dest) return null;
  try {
    const { hostname } = new URL(payload.dest);
    return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(hostname)
      ? hostname
      : null;
  } catch {
    return null;
  }
}

/**
 * Verifies the `hmac` query param Shopify signs OAuth requests with
 * (install entry point and OAuth callback). Per Shopify's spec, every
 * param except `hmac` is sorted and joined, then HMAC-SHA256'd with the
 * client secret.
 */
export function verifyQueryHmac(searchParams: URLSearchParams): boolean {
  const secret = process.env.SHOPIFY_API_SECRET;
  const hmac = searchParams.get("hmac");
  if (!secret || !hmac) return false;

  try {
    const message = Array.from(searchParams.entries())
      .filter(([key]) => key !== "hmac" && key !== "signature")
      .map(([key, value]) => [key, value] as const)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    const expected = crypto
      .createHmac("sha256", secret)
      .update(message)
      .digest();
    const actual = Buffer.from(hmac, "hex");
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
