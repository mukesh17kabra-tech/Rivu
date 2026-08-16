import { PageHeader } from "@/components/ui";
import { requireShop } from "@/lib/shop-context";
import { PlanSync } from "@/components/PlanSync";
import { PlanCards } from "@/components/PlanCards";
import { DowngradeNotice } from "@/components/DowngradeNotice";
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
    <>
      <PageHeader
        title="Plan"
        description="Upgrade or change your plan on Shopify."
      />

      <PlanSync shop={shop} plan={currentPlan} />
      {/* Rendered here with the freshly synced plan rather than relying on
          the layout's sessionStorage copy, which can be stale or empty.
          Downgrades land back on this page, so this is where the warning
          needs to be reliable. */}
      <DowngradeNotice currentPlan={currentPlan} shop={shop} />
      <PlanCards shop={shop} currentPlan={currentPlan} />
    </>
  );
}
