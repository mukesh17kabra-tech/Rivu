import { redirect } from "next/navigation";
import { resolveShop, shopQuery } from "@/lib/shop-context";
import { registerShopFromSessionToken } from "@/lib/install";
import { verifySessionToken, shopFromSessionToken } from "@/lib/session-token";
import { hasFreshAccessToken } from "@/lib/access-token";
import { appUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { StatusScreen } from "@/components/StatusScreen";

/**
 * App entry point — the URL Shopify Admin loads in the embedded iframe.
 *
 * Order of business:
 *  1. `id_token` present → verify it, exchange it for an access token and
 *     register the shop. This is the Shopify managed-installation path and
 *     is how the shop actually gets recorded.
 *  2. Embedded but no `id_token` → bounce through App Bridge, which reloads
 *     us with a fresh one.
 *  3. Top-level with a shop → already installed? go to the dashboard.
 *     Otherwise start the authorization-code flow.
 *  4. Nothing to go on → render the landing page, which always offers a
 *     way in.
 *
 * This page must never throw: a 500 here means the app has no UI at all.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    shop?: string;
    host?: string;
    embedded?: string;
    id_token?: string;
    /** Set once we've already bounced, so a failing bounce can't loop. */
    bounced?: string;
  }>;
}) {
  const {
    shop: shopParam,
    host,
    embedded,
    id_token: idToken,
    bounced,
  } = await searchParams;

  // ---------------------------------------------------------------- 1
  if (idToken) {
    // Fast path: if we already hold an access token that's good for a while,
    // skip the exchange entirely. Verifying the session token is local (an
    // HMAC check, no network), so this trades a round trip to Shopify on
    // every single app open for one indexed lookup.
    const payload = verifySessionToken(idToken);
    const knownShop = payload ? shopFromSessionToken(payload) : null;

    if (knownShop && (await hasFreshAccessToken(knownShop))) {
      redirect(`/dashboard/home?${shopQuery(knownShop, host)}`);
    }

    const result = await registerShopFromSessionToken(idToken);

    if (result.ok) {
      redirect(`/dashboard/home?${shopQuery(result.shop, host)}`);
    }

    if (result.reason === "invalid_session_token" && !bounced) {
      redirect(bounceUrl(shopParam, host));
    }

    const resolved = resolveShop(shopParam, host);
    const retryHref = resolved ? `/?${shopQuery(resolved, host)}` : "/";
    return (
      <StatusScreen
        tone="warning"
        title="We couldn't finish connecting your store"
        body={
          <>
            Shopify didn&apos;t complete the handshake for this session. This is
            usually temporary — retrying almost always clears it.
          </>
        }
        primaryAction={{ label: "Try again", href: retryHref }}
        secondaryAction={{ label: "Get help", href: "/privacy" }}
      />
    );
  }

  const shop = resolveShop(shopParam, host);
  const isEmbedded = embedded === "1" || !!host;

  // ---------------------------------------------------------------- 2
  // Inside the Admin iframe with no session token. App Bridge can mint one
  // for us; the bounce page reloads this route with `id_token` attached.
  if (isEmbedded && !bounced) {
    redirect(bounceUrl(shopParam, host));
  }

  // ---------------------------------------------------------------- 3
  if (shop) {
    // Deliberately NOT wrapped in .catch(() => null): a database outage must
    // not be read as "not installed", which would push an already-installed
    // merchant back through OAuth on every load. Transient failures are
    // retried inside the Prisma client; a real outage reaches the error
    // boundary instead.
    const record = await db.shop.findUnique({ where: { shopDomain: shop } });

    if (record?.accessToken) {
      redirect(`/dashboard/home?${shopQuery(shop, host)}`);
    }

    // Not installed and we have no session token to exchange. Fall back to
    // the authorization-code grant, which works from a top-level window.
    if (!isEmbedded) {
      redirect(`/api/auth?${shopQuery(shop, host)}`);
    }

    // Embedded, bounced already, still no token — give the merchant a
    // working button rather than a silent blank frame.
    return (
      <StatusScreen
        tone="warning"
        title="Finish installing Rivu"
        body={
          <>
            We couldn&apos;t read a Shopify session for{" "}
            <span className="text-slate-700">{shop}</span>. Reconnecting takes a
            few seconds.
          </>
        }
        primaryAction={{
          label: "Reconnect Rivu",
          href: `/api/auth?${shopQuery(shop, host)}`,
        }}
      />
    );
  }

  // ---------------------------------------------------------------- 4
  return <LandingPage />;
}

/**
 * App Bridge's session-token bounce: loading a page that carries the App
 * Bridge script plus a `shopify-reload` param makes App Bridge redirect to
 * that URL with a fresh `id_token` appended.
 *
 * `shopify-reload` must be an absolute URL on this app's own origin — a
 * bare path is silently ignored by App Bridge.
 */
function bounceUrl(shopParam?: string, host?: string): string {
  const target = new URLSearchParams();
  if (shopParam) target.set("shop", shopParam);
  if (host) target.set("host", host);
  // Marks the reload so a bounce that doesn't yield a token can't loop.
  target.set("bounced", "1");

  const reload = `${appUrl()}/?${target.toString()}`;
  const params = new URLSearchParams(target);
  params.set("shopify-reload", reload);

  return `/session-token-bounce?${params.toString()}`;
}

function LandingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
      <div className="w-full max-w-md text-center">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">
          Shopify App
        </p>
        <h1 className="mb-4 text-3xl font-semibold">Rivu</h1>
        <p className="text-sm leading-relaxed text-slate-500">
          Collect product reviews via QR codes and email, and display them in a
          fully customizable widget on your storefront.
        </p>

        {/* A plain GET form so there is always a usable way into the app,
            even when it's opened outside Shopify Admin with no params. */}
        <form action="/api/auth" method="GET" className="mt-8 text-left">
          <label
            htmlFor="shop"
            className="mb-2 block text-xs uppercase tracking-wide text-slate-400"
          >
            Your store domain
          </label>
          <div className="flex gap-2">
            <input
              id="shop"
              name="shop"
              type="text"
              required
              placeholder="my-store.myshopify.com"
              pattern="[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com"
              title="Enter your full .myshopify.com domain"
              className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Install
            </button>
          </div>
        </form>

        <p className="mt-6 text-xs text-slate-400">
          Already installed? Open Rivu from your Shopify admin&apos;s Apps menu.
        </p>
      </div>
    </main>
  );
}
