import { db } from "@/lib/db";
import { NavBar } from "@/components/NavBar";
import { resolveShop } from "@/lib/shop-context";
import { DesignForm } from "@/components/DesignForm";
import { RewardForm } from "@/components/RewardForm";
import { ReminderForm } from "@/components/ReminderForm";

export default async function DesignPage({
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
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Widget design</h1>
          <p className="mt-2 text-sm text-white/50">
            Match your store&apos;s branding — colors, layout, and font all update live on your
            storefront the moment you save.
          </p>
        </header>

        <NavBar shop={shop} host={host} active="design" />

        <DesignForm
          shop={shop}
          initial={{
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
          }}
        />

        <div className="mt-12 border-t border-white/10 pt-10">
          <h2 className="mb-1 text-lg font-semibold">Review reward (optional)</h2>
          <p className="mb-6 text-sm text-white/50 max-w-xl">
            Offer a discount code automatically to anyone who leaves a review — shown right
            after they submit. Completely optional; leave off if you don&apos;t want to offer
            anything.
          </p>
          <RewardForm
            shop={shop}
            initial={{
              rewardEnabled: shopRecord.rewardEnabled,
              rewardType: shopRecord.rewardType as "percentage" | "fixed_amount",
              rewardValue: shopRecord.rewardValue,
            }}
          />
        </div>

        <div className="mt-12 border-t border-white/10 pt-10">
          <h2 className="mb-1 text-lg font-semibold">Automated review reminders</h2>
          <p className="mb-6 text-sm text-white/50 max-w-xl">
            Like a Klaviyo post-purchase flow — automatically email customers asking for a
            review a set number of days after they buy, unless they've already left one.
          </p>
          <ReminderForm
            shop={shop}
            initial={{
              reminderEnabled: shopRecord.reminderEnabled,
              reminderDelayDays: shopRecord.reminderDelayDays,
              fromEmail: shopRecord.fromEmail || "",
            }}
          />
        </div>
      </div>
    </main>
  );
}
