import { Card, PageHeader, Section } from "@/components/ui";
import { requireShop } from "@/lib/shop-context";
import { WidgetGallery } from "@/components/WidgetGallery";
import { ManualInstall } from "@/components/InstallationContent";
import { EmbedCodeBuilder } from "@/components/EmbedCodeBuilder";
import { appUrl } from "@/lib/app-url";

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

      <div className="mt-6">
        <Section
          title="Paste-anywhere code"
          description="For the places a theme block can't reach — beside a price, in your header, or on a page built somewhere else. Pick one, write your own wording, copy."
        >
          <EmbedCodeBuilder
            shop={shop}
            origin={appUrl() || "https://rivu-one.vercel.app"}
          />
        </Section>
      </div>

      <Card>
        <ManualInstall shop={shop} />
      </Card>
    </>
  );
}
