import { PLANS, type PlanKey } from "./billing";

/**
 * The usage limits the plans actually advertise.
 *
 * These were listed on the pricing cards and the App Store listing but
 * enforced nowhere — a Free shop received unlimited reviews, unlimited QR
 * codes and video uploads it was not entitled to. That is two problems at
 * once: the listing was inaccurate, and nothing about hitting a limit ever
 * prompted an upgrade.
 *
 * Kept apart from lib/plan-gating.ts on purpose. That file clamps *design*
 * choices, silently and harmlessly. These are quotas, and going over one has
 * to be refused with an explanation rather than quietly adjusted.
 */

export function planOf(plan: string): PlanKey {
  return plan === "growth" || plan === "pro" ? plan : "free";
}

export type QuotaCheck =
  | { allowed: true }
  | { allowed: false; reason: string; upgradeTo: "growth" | "pro" };

/** The next plan up, used to word the upgrade prompt. */
function nextPlan(plan: PlanKey): "growth" | "pro" {
  return plan === "free" ? "growth" : "pro";
}

/**
 * Monthly review allowance. Counted per calendar month so it resets on a date
 * the merchant can predict, rather than a rolling window they cannot.
 */
export function checkReviewQuota(plan: string, reviewsThisMonth: number): QuotaCheck {
  const key = planOf(plan);
  const cap = PLANS[key].reviewsPerMonthCap;
  if (!Number.isFinite(cap) || reviewsThisMonth < cap) return { allowed: true };

  return {
    allowed: false,
    reason: `This store has reached its limit of ${cap} reviews this month.`,
    upgradeTo: nextPlan(key),
  };
}

/** Videos are a paid feature; Free is documented as zero. */
export function checkVideoAllowed(plan: string): QuotaCheck {
  const key = planOf(plan);
  if (PLANS[key].videoReviewCap > 0) return { allowed: true };

  return {
    allowed: false,
    reason: "Video reviews aren't available on the Free plan.",
    upgradeTo: "growth",
  };
}

/**
 * Review-reward discount codes are advertised as a Pro feature. They were
 * enforced nowhere, so every plan could switch them on — a Pro selling point
 * given away, and another inaccurate line on the listing.
 */
export function rewardCodesAllowed(plan: string): boolean {
  return planOf(plan) === "pro";
}

/** How many products may have their own QR code. */
export function qrProductLimit(plan: string): number {
  return PLANS[planOf(plan)].qrProductCap;
}

/**
 * Start of the current calendar month, for counting reviews.
 *
 * Deliberately UTC. `createdAt` is stored in UTC, so a boundary built from
 * local time would count the wrong reviews for a few hours either side of the
 * 1st — invisible on Vercel, which runs UTC, and quietly wrong anywhere else,
 * including a developer's machine.
 */
export function startOfMonth(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
  );
}

/**
 * Wording for a merchant approaching their limit. Silence until 80% — a
 * warning shown from the first review would be noise, not a signal.
 */
export function usageWarning(
  plan: string,
  reviewsThisMonth: number
): string | null {
  const cap = PLANS[planOf(plan)].reviewsPerMonthCap;
  if (!Number.isFinite(cap)) return null;

  if (reviewsThisMonth >= cap) {
    return `You've used all ${cap} reviews this month. New reviews won't be saved until you upgrade or the month resets.`;
  }
  if (reviewsThisMonth >= cap * 0.8) {
    return `You've used ${reviewsThisMonth} of ${cap} reviews this month.`;
  }
  return null;
}
