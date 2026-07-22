export function PlanCards({ shop, currentPlan }: { shop: string; currentPlan: string }) {
  return (
    <section className="grid grid-cols-3 gap-4">
      <PlanCard
        name="Free"
        price="$0/mo"
        perks={[
          "25 reviews/month",
          "Photo reviews (up to 1)",
          "List & Grid layouts",
          "QR codes for up to 10 products",
          "1 UGC template",
          "English suggestions only",
        ]}
        current={currentPlan === "free"}
      />
      <PlanCard
        name="Growth"
        price="$5/mo"
        perks={[
          "500 reviews/month",
          "50 reminder emails/month",
          "List, Grid & Masonry layouts (plus Split with any)",
          "Photo reviews (up to 2) + 1 video review",
          "Unlimited product QR codes",
          "6 suggestion languages",
          "5 UGC templates",
          "\"Top Reviewer\" streak badges",
          "Direct share to Instagram/WhatsApp",
          "Automated review-reminder emails",
          "4-day free trial",
        ]}
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
          "All layouts — List, Grid, Masonry, Carousel (plus Split with any)",
          "Photo reviews (up to 3) + 2 video reviews",
          "Unlimited product QR codes",
          "All 10 suggestion languages",
          "All 8 UGC templates",
          "\"Top Reviewer\" streak badges",
          "Direct share to Instagram/WhatsApp",
          "Automated review-reminder emails",
          "Review-reward discount codes",
          "Priority support",
          "4-day free trial",
        ]}
        href={`/api/billing/upgrade?shop=${shop}&plan=pro`}
        ctaLabel="Upgrade to Pro"
        highlight
        current={currentPlan === "pro"}
      />
    </section>
  );
}

function PlanCard({
  name,
  price,
  perks,
  href,
  ctaLabel,
  highlight = false,
  current = false,
}: {
  name: string;
  price: string;
  perks: string[];
  href?: string;
  ctaLabel?: string;
  highlight?: boolean;
  current?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-6 flex flex-col ${
        highlight ? "border-emerald-400/40 bg-emerald-400/[0.06]" : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white/50 uppercase tracking-wide">{name}</p>
        {current && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/60">
            Current
          </span>
        )}
      </div>
      <p className="mt-1 text-2xl font-semibold">{price}</p>
      <ul className="mt-4 space-y-2 text-sm text-white/70 flex-1">
        {perks.map((perk) => (
          <li key={perk} className="flex gap-2">
            <span className="text-emerald-400">·</span>
            {perk}
          </li>
        ))}
      </ul>
      {href && ctaLabel && !current && (
        <a
          href={href}
          target="_top"
          className={`mt-5 inline-block rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
            highlight ? "bg-emerald-400 text-black hover:bg-emerald-300" : "bg-white/10 text-white hover:bg-white/20"
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
