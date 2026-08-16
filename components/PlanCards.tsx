export function PlanCards({ shop, currentPlan }: { shop: string; currentPlan: string }) {
  return (
    <section className="grid grid-cols-3 gap-4">
      <PlanCard
        name="Free"
        price="$0/mo"
        perks={[
          "25 reviews/month",
          "Photo reviews (up to 1)",
          "List & Grid layouts only",
          "QR codes for up to 10 products",
          "1 UGC template",
          "English suggestions only",
          "Basic colors (primary, star, card bg, text)",
          "Widget heading text editable",
        ]}
        brandingShown
        current={currentPlan === "free"}
      />
      <PlanCard
        name="Growth"
        price="$5/mo"
        perks={[
          "500 reviews/month",
          "50 reminder emails/month",
          "List, Grid & Masonry layouts",
          "Photo reviews (up to 2) + 1 video",
          "Unlimited product QR codes",
          "All 10 suggestion languages (choose 6)",
          "5 UGC templates",
          "Full widget customization — all colors, fonts, sizes",
          "Heading size/bold/position controls",
          "Review card text colors",
          "Filter bar + sort button colors",
          "Top Reviewer streak badges",
          "Automated review-reminder emails",
          "4-day free trial",
        ]}
        brandingRemoved
        href={`/api/billing/upgrade?shop=${shop}&plan=growth`}
        ctaLabel="Upgrade to Growth"
        current={currentPlan === "growth"}
      />
      <PlanCard
        name="Pro"
        price="$8/mo"
        perks={[
          "Unlimited reviews",
          "Unlimited reminder emails",
          "All layouts — List, Grid, Masonry, Carousel & Sidebar",
          "Photo reviews (up to 3) + 2 videos",
          "Unlimited product QR codes",
          "All 10 suggestion languages",
          "All 8 UGC templates",
          "All 4 form styles (Basic, Card, Minimal, Dark)",
          "All 4 widget summary styles",
          "Full customization + form modal colors",
          "Review-reward discount codes",
          "Priority support",
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
    <div className={`rounded-lg border p-6 flex flex-col ${highlight ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{name}</p>
        {current && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">Current</span>}
      </div>
      <p className="mt-1 text-2xl font-semibold">{price}</p>

      {/* Powered by Rivu branding notice — shown prominently */}
      {brandingShown && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2">
          <span className="text-orange-400">⚠</span>
          <span className="text-xs text-orange-700">
            <strong>&quot;Powered by Rivu&quot;</strong> shown on your widget
          </span>
        </div>
      )}
      {brandingRemoved && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
          <span className="text-slate-900">✓</span>
          <span className="text-xs text-emerald-700">
            <strong>&quot;Powered by Rivu&quot;</strong> branding removed
          </span>
        </div>
      )}

      <ul className="mt-4 space-y-2 text-sm text-slate-600 flex-1">
        {perks.map((perk) => (
          <li key={perk} className="flex gap-2">
            <span className="text-slate-900 flex-shrink-0">·</span>
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
              ? "bg-slate-900 text-white hover:bg-slate-800"
              : "bg-slate-100 text-slate-900 hover:bg-slate-200"
          }`}
        >
          {ctaLabel}
        </a>
      )}
      {current && (
        <div className="mt-5 rounded-md border border-slate-200 px-4 py-2 text-center text-sm text-slate-400">
          Your current plan
        </div>
      )}
    </div>
  );
}
