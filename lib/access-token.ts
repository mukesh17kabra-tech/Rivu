import { db } from "./db";

/**
 * Expiring offline access tokens.
 *
 * Shopify no longer accepts non-expiring offline tokens on the Admin API —
 * calls fail with:
 *   403 "[API] Non-expiring access tokens are no longer accepted for the
 *   Admin API. Start using expiring offline tokens"
 *
 * So an offline token now lives ~1 hour and is rotated with a refresh token
 * that lives ~90 days. Every Admin API call has to go through
 * getValidAccessToken so it rotates before use.
 */

const REFRESH_GRANT = "refresh_token";

/** Refresh slightly early so a token can't expire mid-request. */
const REFRESH_SKEW_MS = 5 * 60 * 1000;

/**
 * Thrown when we cannot produce a usable token without the merchant
 * re-authorizing: no refresh token (a legacy non-expiring row), the refresh
 * token has expired, or Shopify rejected it. Callers turn this into a
 * re-auth redirect rather than an error page.
 */
export class ReauthRequiredError extends Error {
  readonly shop: string;

  constructor(shop: string, reason: string) {
    super(`${shop} needs to re-authorize Rivu: ${reason}`);
    this.name = "ReauthRequiredError";
    this.shop = shop;
  }
}

export type TokenResponse = {
  access_token: string;
  scope?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
};

/** Turns a token response into the Shop columns that store it. */
export function tokenFieldsFrom(payload: TokenResponse) {
  const now = Date.now();
  return {
    accessToken: payload.access_token,
    tokenScope: payload.scope ?? null,
    tokenExpiresAt:
      typeof payload.expires_in === "number"
        ? new Date(now + payload.expires_in * 1000)
        : null,
    refreshToken: payload.refresh_token ?? null,
    refreshTokenExpiresAt:
      typeof payload.refresh_token_expires_in === "number"
        ? new Date(now + payload.refresh_token_expires_in * 1000)
        : null,
  };
}

/** Exchanges a refresh token for a fresh access token (and a new refresh token). */
async function requestRefresh(
  shop: string,
  refreshToken: string
): Promise<TokenResponse | null> {
  const clientId = process.env.SHOPIFY_API_KEY;
  const clientSecret = process.env.SHOPIFY_API_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: REFRESH_GRANT,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    console.error(
      `[access-token] refresh failed for ${shop}: ${res.status} ${await res
        .text()
        .catch(() => "")}`
    );
    return null;
  }

  return (await res.json()) as TokenResponse;
}

/**
 * Returns an access token that is valid right now, rotating it first if it
 * is expired or about to be. Throws ReauthRequiredError when rotation isn't
 * possible.
 */
export async function getValidAccessToken(shop: string): Promise<string> {
  const record = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!record?.accessToken) {
    throw new ReauthRequiredError(shop, "the app is not installed");
  }

  // A legacy row from the non-expiring era: no expiry and no refresh token.
  // The Admin API rejects these outright, and there's nothing to rotate —
  // the merchant has to re-authorize (opening the app does this
  // automatically via token exchange).
  if (!record.tokenExpiresAt) {
    if (!record.refreshToken) {
      throw new ReauthRequiredError(
        shop,
        "the stored token is a non-expiring token, which the Admin API no longer accepts"
      );
    }
  } else if (record.tokenExpiresAt.getTime() - Date.now() > REFRESH_SKEW_MS) {
    return record.accessToken; // still good
  }

  if (!record.refreshToken) {
    throw new ReauthRequiredError(shop, "no refresh token is stored");
  }
  if (
    record.refreshTokenExpiresAt &&
    record.refreshTokenExpiresAt.getTime() <= Date.now()
  ) {
    throw new ReauthRequiredError(shop, "the refresh token has expired");
  }

  const refreshed = await requestRefresh(shop, record.refreshToken);
  if (!refreshed?.access_token) {
    throw new ReauthRequiredError(shop, "Shopify rejected the refresh token");
  }

  await db.shop.update({
    where: { shopDomain: shop },
    data: tokenFieldsFrom(refreshed),
  });

  return refreshed.access_token;
}
