import { db } from "@/lib/db";
import { NavBar } from "@/components/NavBar";
import { resolveShop } from "@/lib/shop-context";

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; host?: string }>;
}) {
  const { shop: shopParam, host } = await searchParams;
  const shop = resolveShop(shopParam, host);

  if (!shop) {
    return <div className="p-8 text-sm text-gray-500">Missing shop parameter.</div>;
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return <div className="p-8 text-sm text-gray-500">Shop not found. Please reinstall the app.</div>;
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] text-[#E7E9EA] font-sans">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80">Rivu</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{shopRecord.shopDomain}</h1>
        </header>

        <NavBar shop={shop} host={host} active="plans" />

        <section className="grid grid-cols-4 gap-4">
          <PlanCard
            name="Free"
            price="$0/mo"
            perks={["25 reviews/month", "QR codes for up to 3 products", "1 UGC template"]}
            current={shopRecord.plan === "free"}
          />
          <PlanCard
            name="Starter"
            price="$4.99/mo"
            perks={["100 reviews/month", "Unlimited product QR codes", "2 UGC templates", "7-day free trial"]}
            href={`/api/billing/upgrade?shop=${shopRecord.shopDomain}&plan=starter`}
            ctaLabel="Upgrade to Starter"
            current={shopRecord.plan === "starter"}
          />
          <PlanCard
            name="Growth"
            price="$9.99/mo"
            perks={["500 reviews/month", "Unlimited product QR codes", "All UGC templates", "7-day free trial"]}
            href={`/api/billing/upgrade?shop=${shopRecord.shopDomain}&plan=growth`}
            ctaLabel="Upgrade to Growth"
            current={shopRecord.plan === "growth"}
          />
          <PlanCard
            name="Pro"
            price="$19.99/mo"
            perks={["Unlimited reviews", "Unlimited product QR codes", "All UGC templates", "Priority support", "7-day free trial"]}
            href={`/api/billing/upgrade?shop=${shopRecord.shopDomain}&plan=pro`}
            ctaLabel="Upgrade to Pro"
            highlight
            current={shopRecord.plan === "pro"}
          />
        </section>
      </div>
    </main>
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
