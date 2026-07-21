import { db } from "@/lib/db";
import { NavBar } from "@/components/NavBar";
import { resolveShop } from "@/lib/shop-context";
import { SettingsTabs } from "@/components/SettingsTabs";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; host?: string; tab?: string }>;
}) {
  const { shop: shopParam, host, tab } = await searchParams;
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
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
        </header>

        <NavBar shop={shop} host={host} active="settings" />

        <SettingsTabs
          shop={shop}
          host={host}
          initialTab={tab || "installation"}
          shopRecord={{
            plan: shopRecord.plan,
            displayStyle: shopRecord.displayStyle as "list" | "grid" | "carousel",
            gridColumns: shopRecord.gridColumns,
            carouselVisible: shopRecord.carouselVisible,
            arrowColor: shopRecord.arrowColor,
            primaryColor: shopRecord.primaryColor,
            starColor: shopRecord.starColor,
            backgroundColor: shopRecord.backgroundColor,
            textColor: shopRecord.textColor,
            borderRadius: shopRecord.borderRadius,
            fontFamily: shopRecord.fontFamily,
            formAlign: shopRecord.formAlign as "left" | "center" | "right",
            formMaxWidth: shopRecord.formMaxWidth,
            showSuggestionsOnWebsite: shopRecord.showSuggestionsOnWebsite,
            showSuggestionsOnQr: shopRecord.showSuggestionsOnQr,
            rewardEnabled: shopRecord.rewardEnabled,
            rewardType: shopRecord.rewardType as "percentage" | "fixed_amount",
            rewardValue: shopRecord.rewardValue,
            reminderEnabled: shopRecord.reminderEnabled,
            reminderDelayDays: shopRecord.reminderDelayDays,
            fromEmail: shopRecord.fromEmail || "",
          }}
        />
      </div>
    </main>
  );
}
