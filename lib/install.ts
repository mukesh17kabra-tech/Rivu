import { db, withDbRetry } from "./db";
import { runAutoMigrations } from "./db-migrate";
import { verifySessionToken, shopFromSessionToken } from "./session-token";

const TOKEN_EXCHANGE_GRANT =
  "urn:ietf:params:oauth:grant-type:token-exchange";
const ID_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:id_token";
const OFFLINE_TOKEN_TYPE =
  "urn:shopify:params:oauth:token-type:offline-access-token";

/**
 * Exchanges a Shopify session token (`id_token`) for an offline access
 * token.
 *
 * This is the path Shopify expects for apps that use Shopify managed
 * installation (which this app does — see the `[access_scopes]` block in
 * shopify.app.toml, with no `use_legacy_install_flow`). Shopify performs
 * the install itself and then simply loads the app URL with an `id_token`;
 * it never calls the authorization-code endpoints. Without this exchange
 * the app has no access token and no Shop row, which is why the app used
 * to render nothing but a redirect notice inside Admin.
 *
 * An *offline* token is requested (not online) because the app's
 * background jobs — review-reminder emails, the data-retention cron,
 * webhook handlers — need to call the Admin API when no merchant is
 * logged in.
 */
export async function exchangeSessionTokenForAccessToken(
  shop: string,
  idToken: string
): Promise<string | null> {
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
      grant_type: TOKEN_EXCHANGE_GRANT,
      subject_token: idToken,
      subject_token_type: ID_TOKEN_TYPE,
      requested_token_type: OFFLINE_TOKEN_TYPE,
    }),
  });

  if (!res.ok) {
    // 400 means the session token was expired or otherwise invalid. The
    // caller bounces through App Bridge to get a fresh one rather than
    // showing an error.
    console.error(
      `[install] token exchange failed for ${shop}: ${res.status} ${await res
        .text()
        .catch(() => "")}`
    );
    return null;
  }

  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

/**
 * Writes (or refreshes) the Shop row so the rest of the app can find it.
 * Retried, because losing this write is what leaves a shop unregistered — the
 * failure the App Store review flagged.
 */
export async function saveShopToken(shop: string, accessToken: string) {
  // runAutoMigrations uses $executeRawUnsafe, which the Prisma client's
  // retry extension doesn't cover ($allModels only sees model operations),
  // so it needs the wrapper explicitly. The upsert below is covered.
  await withDbRetry(() => runAutoMigrations());
  await db.shop.upsert({
    where: { shopDomain: shop },
    update: { accessToken },
    create: { shopDomain: shop, accessToken },
  });
}

export type InstallResult =
  | { ok: true; shop: string }
  /** Session token missing/expired — bounce through App Bridge for a fresh one. */
  | { ok: false; reason: "invalid_session_token" }
  /** Shopify rejected the exchange or the request failed — retryable. */
  | { ok: false; reason: "exchange_failed" }
  /** We got a token but couldn't persist it. */
  | { ok: false; reason: "storage_failed" };

/**
 * Full first-load install path: verify the session token, exchange it for
 * an access token, and register the shop. Returns a discriminated result
 * instead of throwing, so the entry point can always render UI.
 */
export async function registerShopFromSessionToken(
  idToken: string
): Promise<InstallResult> {
  const payload = verifySessionToken(idToken);
  if (!payload) return { ok: false, reason: "invalid_session_token" };

  const shop = shopFromSessionToken(payload);
  if (!shop) return { ok: false, reason: "invalid_session_token" };

  let accessToken: string | null;
  try {
    accessToken = await exchangeSessionTokenForAccessToken(shop, idToken);
  } catch (err) {
    console.error(`[install] token exchange threw for ${shop}:`, err);
    return { ok: false, reason: "exchange_failed" };
  }
  if (!accessToken) return { ok: false, reason: "exchange_failed" };

  try {
    await saveShopToken(shop, accessToken);
  } catch (err) {
    console.error(`[install] could not save token for ${shop}:`, err);
    return { ok: false, reason: "storage_failed" };
  }

  return { ok: true, shop };
}
