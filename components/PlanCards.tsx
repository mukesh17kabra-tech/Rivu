import { PLANS } from "@/lib/billing";
/**
 * Price shown on a card, taken from lib/billing.ts rather than typed here.
 * These must match what Shopify charges — a card advertising one number while
 * checkout shows another is a trust problem, not a cosmetic one.
 */
function priceLabel(key: "free" | "pro") {
  const price = PLANS[key].price;
  return price === 0 ? "$0/mo" : `$${price}/mo`;
}

/**
 * Two tiers, not three.
 *
 * The free plan used to cap reviews at 25/month, which against competitors
 * offering unlimited meant the app stopped working exactly when a store
 * started succeeding — and anyone comparing the two picked the unlimited one.
 * Text reviews cost almost nothing to store, so the cap bought nothing.
 *
 * Video stays paid because media is stored as base64 in Postgres, so it is the
 * one thing here whose cost genuinely scales with use.
 *
 */
export function PlanCards({ shop, currentPlan }: { shop: string; currentPlan: string }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <PlanCard
        name="Free"
        price={priceLabel("free")}
        perks={[
          "Unlimited reviews",
          "Photo reviews (up to 1)",
          "Import from Judge.me, Loox, Stamped & Yotpo",
          "Google rich snippets (star ratings in search)",
          "List & Grid layouts",
          "QR codes for up to 10 products",
          "1 UGC template",
          "English suggestions only",
          "Basic colors (primary, star, card bg, text)",
        ]}
        brandingShown
        current={currentPlan === "free"}
        // Downgrading is a cancellation, and under Shopify Managed Pricing
        // Shopify owns that — the same hosted page handles moving up and
        // down. Deliberately not wired to /api/billing/downgrade, which
        // resets the merchant's whole widget design to Free defaults.
        href={`/api/billing/upgrade?shop=${shop}&plan=free`}
        ctaLabel="Switch to Free"
      />
      <PlanCard
        name="Pro"
        price={priceLabel("pro")}
        perks={[
          "Everything in Free, plus:",
          "Video reviews",
          "Unlimited reminder emails/month",
          "Build your own layout — your HTML & CSS",
          "All 8 widget summary styles",
          "All layouts — List, Grid, Masonry, Carousel & Sidebar",
          "AI-written review suggestions",
          "Photo reviews (up to 3)",
          "Unlimited product QR codes",
          "All 10 suggestion languages",
          "All 8 UGC templates",
          "All 4 form styles (Basic, Card, Minimal, Dark)",
          "Review-reward discount codes",
          "No “Powered by Rivu” badge",
          "4-day free trial",
        ]}
        brandingRemoved
        href={`/api/billing/upgrade?shop=${shop}&plan=pro`}
        ctaLabel="Upgrade to Pro"
        highlight
        current={currentPlan === "pro"}
      />

    </section>
  );
}

function PlanCard({
  name, price, perks, href, ctaLabel, highlight = false, current = false,
  brandingShown = false, brandingRemoved = false,
}: {
  name: string; price: string; perks: string[];
  href?: string; ctaLabel?: string; highlight?: boolean; current?: boolean;
  brandingShown?: boolean; brandingRemoved?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-6 flex flex-col ${highlight ? "border-emerald-400/40 bg-emerald-400/[0.06]" : "border-white/10 bg-white/[0.02]"}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white/50 uppercase tracking-wide">{name}</p>
        {current && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/60">Current</span>}
      </div>
      <p className="mt-1 text-2xl font-semibold">{price}</p>

      {/* Powered by Rivu branding notice — shown prominently */}
      {brandingShown && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-orange-400/30 bg-orange-400/10 px-3 py-2">
          <span className="text-orange-400">⚠</span>
          <span className="text-xs text-orange-300">
            <strong>&quot;Powered by Rivu&quot;</strong> shown on your widget
          </span>
        </div>
      )}
      {brandingRemoved && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2">
          <span className="text-emerald-400">✓</span>
          <span className="text-xs text-emerald-300">
            <strong>&quot;Powered by Rivu&quot;</strong> branding removed
          </span>
        </div>
      )}

      <ul className="mt-4 space-y-2 text-sm text-white/70 flex-1">
        {perks.map((perk) => (
          <li key={perk} className="flex gap-2">
            <span className="text-emerald-400 flex-shrink-0">·</span>
            {perk}
          </li>
        ))}
      </ul>

      {href && ctaLabel && !current && (
        <a
          href={href}
          target="_top"
          className={`mt-5 inline-block rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
            highlight
              ? "bg-emerald-400 text-black hover:bg-emerald-300"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {ctaLabel}
        </a>
      )}
      {current && (
        <div className="mt-5 rounded-md border border-white/10 px-4 py-2 text-center text-sm text-white/40">
          Your current plan
        </div>
      )}
    </div>
  );
}
