import { adminGraphQL } from "./shopify";
import { db } from "./db";

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

/**
 * This app uses **Shopify Managed Pricing**: plans are defined in the Partner
 * Dashboard and Shopify hosts the plan-selection and checkout UI.
 *
 * That means the Billing API is unavailable to us. Attempting to create a
 * charge returns a bare `403` over REST, and over GraphQL the actual reason:
 *
 *   "Managed Pricing Apps cannot use the Billing API (to create charges)."
 *
 * So instead of creating charges, we send the merchant to Shopify's pricing
 * page and read the resulting subscription back. createRecurringCharge /
 * activateCharge / getCharge were removed — they could never succeed.
 */

/** App handle from the Partner Dashboard — part of the pricing-page URL. */
const APP_HANDLE = process.env.SHOPIFY_APP_HANDLE || "rivu";

/**
 * Shopify's hosted plan-selection page for this app. Must be opened at the
 * top level: it's an admin.shopify.com page and cannot render inside the
 * app's own iframe.
 */
export function managedPricingUrl(shop: string): string {
  const storeHandle = shop.replace(/\.myshopify\.com$/, "");
  return `https://admin.shopify.com/store/${storeHandle}/charges/${APP_HANDLE}/pricing_plans`;
}

type ActiveSubscriptionsQuery = {
  currentAppInstallation: {
    activeSubscriptions: { id: string; name: string; status: string }[];
  };
};

/**
 * Reads the merchant's real plan from Shopify rather than trusting our own
 * column. Returns null when Shopify reports a subscription whose name we
 * don't recognise, so a renamed plan can't silently downgrade anyone.
 */
export async function getActivePlanFromShopify(
  shop: string
): Promise<PlanKey | null> {
  const data = await adminGraphQL<ActiveSubscriptionsQuery>(
    shop,
    `{
      currentAppInstallation {
        activeSubscriptions { id name status }
      }
    }`
  );

  const active = (data.currentAppInstallation?.activeSubscriptions ?? []).filter(
    (sub) => sub.status === "ACTIVE"
  );

  // No active subscription means the merchant is on the free plan.
  if (active.length === 0) return "free";

  // Match Shopify's plan name against our own, case-insensitively. Managed
  // pricing names come from the Partner Dashboard, so tolerate extra words
  // like "Rivu — Growth Plan" as well as a bare "Growth".
  for (const key of Object.keys(PLANS) as PlanKey[]) {
    if (key === "free") continue;
    const planName = PLANS[key].name.toLowerCase();
    if (active.some((sub) => sub.name.toLowerCase().includes(planName))) {
      return key;
    }
  }

  console.warn(
    `[billing] ${shop} has an active subscription we don't recognise: ${active
      .map((s) => s.name)
      .join(", ")}`
  );
  return null;
}

/**
 * Brings our `plan` column in line with Shopify. Safe to call on page load —
 * it only writes when the value actually changed.
 *
 * Returns the plan the app should treat as current.
 */
export async function syncPlanFromShopify(
  shop: string,
  storedPlan: string
): Promise<string> {
  let actual: PlanKey | null;
  try {
    actual = await getActivePlanFromShopify(shop);
  } catch (err) {
    // Never block the Plans page on a Shopify hiccup — show what we have.
    console.error(`[billing] plan sync failed for ${shop}:`, err);
    return storedPlan;
  }

  if (!actual || actual === storedPlan) return storedPlan;

  await db.shop.update({ where: { shopDomain: shop }, data: { plan: actual } });
  return actual;
}
