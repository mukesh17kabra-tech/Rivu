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

        <DevPlanBypass shop={shop} currentPlan={shopRecord.plan} />
      </div>
    </main>
  );
}
