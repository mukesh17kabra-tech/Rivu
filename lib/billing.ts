const API_VERSION = "2024-10";

// Central place to define plan pricing. Unlike a messaging-based app,
// nothing here has a real per-unit cost (image generation and QR codes
// are both free/local), so caps exist mainly to nudge larger stores
// toward paid tiers and to keep database load predictable — not because
// any plan would otherwise lose money.
export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    reviewsPerMonthCap: 25,
    qrProductCap: 10,
    templateCount: 1,
    photoReviewCap: 1,
    videoReviewCap: 0,
    reminderMonthlyCap: 0, // no automated reminders on Free
    languageCount: 1, // English only
    brandingRemoved: false, // Free plan shows "Powered by Rivu" on the widget
  },
  growth: {
    name: "Growth",
    price: 5,
    reviewsPerMonthCap: 500,
    qrProductCap: Infinity,
    templateCount: 5,
    photoReviewCap: 2,
    videoReviewCap: 1,
    reminderMonthlyCap: 50,
    languageCount: 6, // cap on how many languages the merchant can enable — see lib/plan-gating.ts LANGUAGE_CAP_BY_PLAN
    brandingRemoved: true, // "Powered by Rivu" hidden on paid plans
  },
  pro: {
    name: "Pro",
    price: 8,
    reviewsPerMonthCap: Infinity,
    qrProductCap: Infinity,
    templateCount: 8,
    photoReviewCap: 3,
    videoReviewCap: 2,
    reminderMonthlyCap: Infinity,
    languageCount: Infinity, // all 10
    brandingRemoved: true,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// Creates a recurring application charge for the given paid plan and
// returns the confirmation URL the merchant must visit to approve billing
// (Shopify hosts this page — no billing UI to build yourself).
export async function createRecurringCharge(
  shop: string,
  accessToken: string,
  planKey: Exclude<PlanKey, "free">
) {
  const plan = PLANS[planKey];

  const res = await fetch(
    `https://${shop}/admin/api/${API_VERSION}/recurring_application_charges.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        recurring_application_charge: {
          name: `Rivu — ${plan.name} Plan`,
          price: plan.price,
          return_url: `${process.env.HOST}/api/billing/callback?shop=${shop}&plan=${planKey}`,
          trial_days: 4,
          test: process.env.SHOPIFY_BILLING_TEST_MODE === "true",
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to create charge: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.recurring_application_charge as {
    id: number;
    confirmation_url: string;
    status: string;
  };
}

export async function activateCharge(shop: string, accessToken: string, chargeId: string) {
  const res = await fetch(
    `https://${shop}/admin/api/${API_VERSION}/recurring_application_charges/${chargeId}/activate.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to activate charge: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function getCharge(shop: string, accessToken: string, chargeId: string) {
  const res = await fetch(
    `https://${shop}/admin/api/${API_VERSION}/recurring_application_charges/${chargeId}.json`,
    { headers: { "X-Shopify-Access-Token": accessToken } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.recurring_application_charge as { id: number; status: string };
}
