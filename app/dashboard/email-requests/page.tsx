import { PageHeader, Section } from "@/components/ui";
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
    <>
      <PageHeader
        title="Email requests"
        description="Automatically ask customers for a review after they buy."
      />

      <Section
        title="Reminder email"
        description="What gets sent, when, and who replies land with."
      >
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
      </Section>

      <Section
        title="Review reward"
        description="Optional — automatically send a discount code to anyone who leaves a review."
      >
        <RewardForm
          shop={shop}
          initial={{
            rewardEnabled: shopRecord.rewardEnabled,
            rewardType: shopRecord.rewardType as "percentage" | "fixed_amount",
            rewardValue: shopRecord.rewardValue,
          }}
        />
      </Section>
    </>
  );
}
