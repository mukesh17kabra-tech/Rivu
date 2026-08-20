import { PageHeader, Section } from "@/components/ui";
import { requireShop } from "@/lib/shop-context";
import { DesignForm, type DesignSettings } from "@/components/DesignForm";
import { LogoUpload } from "@/components/LogoUpload";
import { CustomTemplateForm } from "@/components/CustomTemplateForm";
import { RatingBadgeForm } from "@/components/RatingBadgeForm";
import { PlanSync } from "@/components/PlanSync";
import { DowngradeNotice } from "@/components/DowngradeNotice";

export default async function WidgetSettingsPage({
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
      <PlanSync shop={shop} plan={shopRecord.plan} />
      <DowngradeNotice currentPlan={shopRecord.plan} shop={shop} />

      <PageHeader
        title="Widget design"
        description="Everything a shopper sees on your storefront. Changes save per section."
      />

      <Section
        step={1}
        title="The review widget"
        description="Layout, colours, fonts and the write-a-review form — the main block on your product pages."
      >
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
              borderColor: shopRecord.borderColor,
              borderWidth: shopRecord.borderWidth,
              borderStyle: shopRecord.borderStyle as "solid" | "dashed" | "dotted" | "double",
              backgroundGradient: shopRecord.backgroundGradient,
              primaryGradient: shopRecord.primaryGradient,
              letCustomerPickLanguage: shopRecord.letCustomerPickLanguage,
              showSuggestionsOnWebsite: shopRecord.showSuggestionsOnWebsite,
              showSuggestionsOnQr: shopRecord.showSuggestionsOnQr,
              suggestionLanguage: shopRecord.suggestionLanguage,
              enabledLanguages: shopRecord.enabledLanguages,
              formTemplate: (shopRecord.formTemplate || "basic") as "basic" | "card" | "minimal" | "dark",
              summaryLayout: (shopRecord.summaryLayout ||
                "modern") as DesignSettings["summaryLayout"],
              summaryBgColor: (shopRecord as Record<string, unknown>).summaryBgColor as string || "#f8f8f8",
              summaryTextColor: (shopRecord as Record<string, unknown>).summaryTextColor as string || "#333333",
              summaryWidth: (shopRecord as Record<string, unknown>).summaryWidth as number || 220,
              summaryPosition: ((shopRecord as Record<string, unknown>).summaryPosition as string || "left") as "left" | "center" | "right",
              filterBgColor: (shopRecord as Record<string, unknown>).filterBgColor as string || "#ffffff",
              filterTextColor: (shopRecord as Record<string, unknown>).filterTextColor as string || "#999999",
              sortBgColor: (shopRecord as Record<string, unknown>).sortBgColor as string || "#ffffff",
              sortTextColor: (shopRecord as Record<string, unknown>).sortTextColor as string || "#333333",
              sortBorderColor: (shopRecord as Record<string, unknown>).sortBorderColor as string || "#dddddd",
              reviewCountFontSize: (shopRecord as Record<string, unknown>).reviewCountFontSize as number || 14,
              reviewTitleColor: (shopRecord as Record<string, unknown>).reviewTitleColor as string || "#111111",
              reviewBodyColor: (shopRecord as Record<string, unknown>).reviewBodyColor as string || "#333333",
              reviewMetaColor: (shopRecord as Record<string, unknown>).reviewMetaColor as string || "#999999",
              formBgColor: (shopRecord as Record<string, unknown>).formBgColor as string || "#ffffff",
              formTextColor: (shopRecord as Record<string, unknown>).formTextColor as string || "#1a1a2e",
              formCloseColor: (shopRecord as Record<string, unknown>).formCloseColor as string || "#999999",
            }}
        />
      </Section>

      <Section
        step={2}
        title="Rating badge"
        description="The compact star line shown near your product title and on collection cards."
      >
        <RatingBadgeForm
          shop={shop}
          initialTemplate={shopRecord.ratingBadgeTemplate}
          initialStarSize={shopRecord.ratingBadgeStarSize}
        />
      </Section>

      <Section
        step={3}
        title="Build your own layout"
        description="Pro — write your own HTML and place the stars, reviews and buttons exactly where you want them."
      >
        <CustomTemplateForm
          shop={shop}
          plan={shopRecord.plan}
          initialEnabled={shopRecord.customTemplateEnabled}
          initialHtml={shopRecord.customTemplateHtml || ""}
        />
      </Section>

      <Section
        step={4}
        title="Store logo"
        description="Watermarked onto the shareable graphics Rivu generates from your reviews."
      >
        <LogoUpload
          shop={shop}
          initialLogoUrl={shopRecord.logoUrl || ""}
          initialLogoSize={shopRecord.logoSize}
        />
      </Section>
    </>
  );
}
