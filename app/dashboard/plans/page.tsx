import { db } from "@/lib/db";
import { NavBar } from "@/components/NavBar";
import { resolveShop } from "@/lib/shop-context";
import { PlanCards } from "@/components/PlanCards";
import { DevPlanBypass } from "@/components/DevPlanBypass";

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
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Plans</h1>
        </header>

        <NavBar shop={shop} host={host} active="plans" />

        <PlanCards shop={shop} currentPlan={shopRecord.plan} />

        <section className="mt-8 rounded-lg border border-white/10 bg-white/[0.02] p-5">
          <p className="mb-1 text-sm font-medium text-white">Need help?</p>
          <p className="text-sm text-white/60">
            Questions about your plan, billing, or the app in general — reach out at{" "}
            <a href="mailto:support@yourdomain.com" className="text-emerald-400 underline">
              support@yourdomain.com
            </a>
            . Pro plan merchants get priority replies.
          </p>
          <p className="mt-2 text-xs text-white/40">
            (Replace this with your real support email — pick any address on a domain you
            control, e.g. Gmail forwarding or your store's own domain.)
          </p>
        </section>

        <DevPlanBypass shop={shop} currentPlan={shopRecord.plan} />
      </div>
    </main>
  );
}
