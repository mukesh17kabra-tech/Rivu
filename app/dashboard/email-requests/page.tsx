import { NavBar } from "@/components/NavBar";
import { requireShop } from "@/lib/shop-context";
import { ReminderForm } from "@/components/ReminderForm";
import { RewardForm } from "@/components/RewardForm";

export default async function EmailRequestsPage({
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
    <main className="min-h-screen bg-[#0B0D0F] text-[#E7E9EA] font-sans">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80">Rivu</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Email Requests</h1>
        </header>

        <NavBar shop={shop} host={host} active="email-requests" />

        <div className="space-y-10">
          <ReminderForm
            shop={shop}
            initial={{
              reminderEnabled: shopRecord.reminderEnabled,
              reminderDelayDays: shopRecord.reminderDelayDays,
              fromEmail: shopRecord.fromEmail || "",
              emailSubject: shopRecord.emailSubject,
              emailBodyTemplate: shopRecord.emailBodyTemplate,
            }}
          />
          <div className="border-t border-white/10 pt-8">
            <h3 className="mb-1 text-sm font-semibold text-white">Review reward (optional)</h3>
            <p className="mb-4 text-xs text-white/50">
              Offer a discount code automatically to anyone who leaves a review.
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
        </div>
      </div>
    </main>
  );
}
