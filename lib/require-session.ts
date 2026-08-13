import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, shopFromSessionToken } from "./session-token";

/**
 * Authentication for merchant-facing API routes.
 *
 * These routes used to trust a bare `?shop=` query param, which meant anyone
 * who knew a store's domain could read or change that merchant's data —
 * rewrite their widget design, approve or delete reviews, downgrade their
 * plan. The shop parameter identifies a shop; it never proved anything.
 *
 * App Bridge automatically attaches the session token as
 * `Authorization: Bearer <id_token>` to same-origin fetches from the
 * embedded app, so requiring it needs no client-side changes for anything
 * already using fetch().
 *
 * Storefront and customer routes (reviews list/summary/suggestions/submit,
 * the QR order lookup, unsubscribe) deliberately do NOT use this — they are
 * called by shoppers who have no session token.
 */

export type SessionAuth =
  | { ok: true; shop: string }
  | { ok: false; response: NextResponse };

function unauthorized(reason: string): SessionAuth {
  return {
    ok: false,
    response: NextResponse.json({ error: "Unauthorized", reason }, { status: 401 }),
  };
}

/**
 * Verifies the request carries a valid Shopify session token, and that the
 * shop it was issued for matches the shop the request is acting on.
 *
 * Returns the shop domain from the *token*, never from the query string, so
 * callers can't be tricked into operating on someone else's store.
 */
export function requireSession(req: NextRequest, shopParam?: string | null): SessionAuth {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return unauthorized("missing session token");

  const payload = verifySessionToken(match[1].trim());
  if (!payload) return unauthorized("invalid or expired session token");

  const shop = shopFromSessionToken(payload);
  if (!shop) return unauthorized("session token has no usable shop");

  // A valid token for shop A must not be usable against shop B.
  if (shopParam && shopParam.trim().toLowerCase() !== shop) {
    return unauthorized("session token does not match the requested shop");
  }

  return { ok: true, shop };
}
