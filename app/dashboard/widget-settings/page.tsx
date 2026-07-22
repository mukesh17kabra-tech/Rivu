import { db } from "@/lib/db";
import { NavBar } from "@/components/NavBar";
import { resolveShop } from "@/lib/shop-context";
import { DesignForm } from "@/components/DesignForm";
import { LogoUpload } from "@/components/LogoUpload";
import { RatingBadgeForm } from "@/components/RatingBadgeForm";

export default async function WidgetSettingsPage({
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
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80">Rivu</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Widget Settings</h1>
        </header>

        <NavBar shop={shop} host={host} active="widget-settings" />

        <div className="space-y-8">
          <DesignForm
            shop={shop}
            plan={shopRecord.plan as "free" | "growth" | "pro"}
            initial={{
              displayStyle: shopRecord.displayStyle as "list" | "grid" | "carousel" | "masonry",
              splitSummary: shopRecord.splitSummary,
              gridColumns: shopRecord.gridColumns,
              carouselVisible: shopRecord.carouselVisible,
              arrowColor: shopRecord.arrowColor,
              primaryColor: shopRecord.primaryColor,
              starColor: shopRecord.starColor,
              rangeColor: shopRecord.rangeColor,
              backgroundColor: shopRecord.backgroundColor,
              textColor: shopRecord.textColor,
              borderRadius: shopRecord.borderRadius,
              fontFamily: shopRecord.fontFamily,
              reviewTextSize: shopRecord.reviewTextSize,
              reviewTextAlign: shopRecord.reviewTextAlign as "left" | "center" | "right",
              formAlign: shopRecord.formAlign as "left" | "center" | "right",
              formMaxWidth: shopRecord.formMaxWidth,
              widgetMaxWidth: shopRecord.widgetMaxWidth,
              widgetTitle: shopRecord.widgetTitle,
              headingFontSize: shopRecord.headingFontSize,
              headingBold: shopRecord.headingBold,
              headingAlign: shopRecord.headingAlign as "left" | "center" | "right",
              topSpacing: shopRecord.topSpacing,
              showBorder: shopRecord.showBorder,
              letCustomerPickLanguage: shopRecord.letCustomerPickLanguage,
              showSuggestionsOnWebsite: shopRecord.showSuggestionsOnWebsite,
              showSuggestionsOnQr: shopRecord.showSuggestionsOnQr,
              suggestionLanguage: shopRecord.suggestionLanguage,
            }}
          />
          <div className="border-t border-white/10 pt-8">
            <RatingBadgeForm shop={shop} initialTemplate={shopRecord.ratingBadgeTemplate} />
          </div>
          <div className="border-t border-white/10 pt-8">
            <LogoUpload
              shop={shop}
              initialLogoUrl={shopRecord.logoUrl || ""}
              initialLogoSize={shopRecord.logoSize}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
