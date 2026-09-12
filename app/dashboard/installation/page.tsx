import { Card, PageHeader } from "@/components/ui";
import { requireShop } from "@/lib/shop-context";
import { WidgetGallery } from "@/components/WidgetGallery";
import { ManualInstall } from "@/components/InstallationContent";

export default async function InstallationPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; host?: string }>;
}) {
  const { shop: shopParam, host } = await searchParams;
  // requireShop sends the merchant back to the app entry point when the shop
  // is missing or not yet registered, so authentication can re-run — instead
  // of dead-ending them on "Shop not found. Please reinstall the app."
  const { shop, shopRecord } = await requireShop(shopParam, host);

  return (
    <>
      <PageHeader
        title="Widgets"
        description="Ten widgets for your storefront, plus the embed that powers them. Pick the ones you want."
      />

      <WidgetGallery shop={shop} plan={shopRecord.plan} />

      <Card className="mt-6">
        <ManualInstall shop={shop} />
      </Card>
    </>
  );
}
