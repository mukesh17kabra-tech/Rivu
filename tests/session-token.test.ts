import { beforeAll, describe, expect, it } from "vitest";
import crypto from "crypto";

import {
  verifySessionToken,
  shopFromSessionToken,
  verifyQueryHmac,
} from "@/lib/session-token";

/**
 * Session tokens are the only thing standing between a merchant's data and
 * anyone who knows their shop domain — every guarded API route trusts this
 * module's verdict. A false accept here is a full authentication bypass, so
 * each way a token can be wrong gets its own test.
 */

const SECRET = "test-shopify-api-secret";
const CLIENT_ID = "test-client-id";
const SHOP = "example-store.myshopify.com";

beforeAll(() => {
  process.env.SHOPIFY_API_SECRET = SECRET;
  process.env.SHOPIFY_API_KEY = CLIENT_ID;
});

const b64 = (obj: unknown) =>
  Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

function sign(
  payload: Record<string, unknown>,
  { secret = SECRET, tamper = false, alg = "HS256" } = {}
) {
  const header = b64({ alg, typ: "JWT" });
  const body = b64(payload);
  let sig = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  if (tamper) sig = `${sig.slice(0, -4)}AAAA`;
  return `${header}.${body}.${sig}`;
}

function payload(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: `https://${SHOP}/admin`,
    dest: `https://${SHOP}`,
    aud: CLIENT_ID,
    sub: "1",
    exp: now + 60,
    nbf: now - 5,
    iat: now,
    jti: crypto.randomUUID(),
    sid: "session-id",
    ...overrides,
  };
}

describe("a well-formed token is accepted", () => {
  it("verifies and yields the shop", () => {
    const verified = verifySessionToken(sign(payload()));
    expect(verified).not.toBeNull();
    expect(shopFromSessionToken(verified!)).toBe(SHOP);
  });

  it("tolerates small clock skew", () => {
    const now = Math.floor(Date.now() / 1000);
    // Expired 5s ago — inside the allowed skew.
    expect(verifySessionToken(sign(payload({ exp: now - 5 })))).not.toBeNull();
  });
});

describe("every way a token can be wrong is rejected", () => {
  const now = Math.floor(Date.now() / 1000);

  const cases: [string, string][] = [
    ["a tampered signature", sign(payload(), { tamper: true })],
    ["signed with another secret", sign(payload(), { secret: "wrong-secret" })],
    ["issued for a different app", sign(payload({ aud: "someone-else" }))],
    ["long expired", sign(payload({ exp: now - 3600 }))],
    ["not yet valid", sign(payload({ nbf: now + 3600 }))],
    ["a non-Shopify dest", sign(payload({ dest: "https://evil.example.com" }))],
    ["dest and iss disagreeing", sign(payload({ iss: "https://other.myshopify.com/admin" }))],
    ["missing an expiry", sign(payload({ exp: undefined }))],
    ["not a JWT at all", "clearly-not-a-token"],
    ["only two segments", "header.body"],
    ["empty", ""],
  ];

  it.each(cases)("rejects %s", (_label, token) => {
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects the alg=none downgrade", () => {
    // A classic JWT attack: claim no signature is needed.
    const header = b64({ alg: "none", typ: "JWT" });
    const body = b64(payload());
    expect(verifySessionToken(`${header}.${body}.`)).toBeNull();
  });

  it("rejects a shop domain that only looks like Shopify's", () => {
    const token = sign(
      payload({
        dest: "https://evil.myshopify.com.attacker.test",
        iss: "https://evil.myshopify.com.attacker.test/admin",
      })
    );
    expect(verifySessionToken(token)).toBeNull();
  });
});

describe("OAuth query signatures", () => {
  function signQuery(params: Record<string, string>) {
    const message = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");
    return crypto.createHmac("sha256", SECRET).update(message).digest("hex");
  }

  it("accepts a correctly signed callback", () => {
    const params = { code: "abc", shop: SHOP, state: "xyz", timestamp: "123" };
    const search = new URLSearchParams({ ...params, hmac: signQuery(params) });
    expect(verifyQueryHmac(search)).toBe(true);
  });

  it("rejects a tampered parameter", () => {
    const params = { code: "abc", shop: SHOP, state: "xyz", timestamp: "123" };
    const search = new URLSearchParams({ ...params, hmac: signQuery(params) });
    search.set("shop", "attacker.myshopify.com");
    expect(verifyQueryHmac(search)).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyQueryHmac(new URLSearchParams({ shop: SHOP }))).toBe(false);
  });
});
