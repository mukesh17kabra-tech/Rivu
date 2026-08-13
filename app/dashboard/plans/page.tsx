import { NavBar } from "@/components/NavBar";
import { requireShop } from "@/lib/shop-context";
import { PlanSync } from "@/components/PlanSync";
import { PlanCards } from "@/components/PlanCards";
import { syncPlanFromShopify } from "@/lib/billing";

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; host?: string }>;
}) {
  const { shop: shopParam, host } = await searchParams;
  // requireShop sends the merchant back to the app entry point when the shop
  // is missing or not yet registered, so authentication can re-run — instead
  // of dead-ending them on "Shop not found. Please reinstall the app."
  const { shop, shopRecord } = await requireShop(shopParam, host);

  // Read the plan back from Shopify rather than trusting our own column.
  // Under managed pricing Shopify owns the subscription, and the column had
  // drifted — it said "pro" for a shop with no subscription at all, a
  // leftover from the old billing-bypass panel.
  const currentPlan = await syncPlanFromShopify(shop, shopRecord.plan);

  return (
    <main className="min-h-screen bg-[#0B0D0F] text-[#E7E9EA] font-sans">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80">Rivu</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Plans</h1>
        </header>

        <NavBar shop={shop} host={host} active="plans" />

        <PlanSync shop={shop} plan={currentPlan} />
        <PlanCards shop={shop} currentPlan={currentPlan} />
      </div>
    </main>
  );
}
