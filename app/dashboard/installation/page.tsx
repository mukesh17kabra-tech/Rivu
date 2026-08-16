import { Card, PageHeader } from "@/components/ui";
import { requireShop } from "@/lib/shop-context";
import { InstallationContent } from "@/components/InstallationContent";

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
        title="Installation"
        description="Add the Rivu widget to your storefront."
      />

      <Card>
        <InstallationContent shop={shop} />
      </Card>
    </>
  );
}
