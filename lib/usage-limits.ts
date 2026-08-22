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
  return plan === "pro" ? "pro" : "free";
}

export type QuotaCheck =
  | { allowed: true }
  | { allowed: false; reason: string; upgradeTo: "pro" };

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
    upgradeTo: "pro",
  };
}

/** Videos are a paid feature; Free is documented as zero. */
export function checkVideoAllowed(plan: string): QuotaCheck {
  const key = planOf(plan);
  if (PLANS[key].videoReviewCap > 0) return { allowed: true };

  return {
    allowed: false,
    reason: "Video reviews aren't available on the Free plan.",
    upgradeTo: "pro",
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

/**
 * Monthly reminder-email allowance. Free sends none: the plans advertise
 * reminders as a paid feature, and sending on Free would give away the thing
 * Pro is bought for.
 */
export function checkReminderQuota(plan: string, sentThisMonth: number): QuotaCheck {
  const key = planOf(plan);
  const cap = PLANS[key].reminderMonthlyCap;
  if (!Number.isFinite(cap)) return { allowed: true };
  if (sentThisMonth < cap) return { allowed: true };

  return {
    allowed: false,
    reason: cap === 0
      ? "Automated reminder emails are available on the Pro plan."
      : `This store has sent its ${cap} reminder emails for this month.`,
    upgradeTo: "pro",
  };
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
 * The warning text for a usage level, independent of any plan.
 *
 * Silence until 80% — a warning from the first review would be noise.
 *
 * Split out from usageWarning because no plan caps reviews any more — Free is
 * unlimited — so routing this through a plan would leave the threshold logic
 * with no way to be exercised. The mechanism stays covered, and stays correct
 * for whenever a metered cap returns.
 */
export function warningForUsage(used: number, cap: number): string | null {
  if (!Number.isFinite(cap)) return null;

  if (used >= cap) {
    return `You've used all ${cap} reviews this month. New reviews won't be saved until you upgrade or the month resets.`;
  }
  if (used >= cap * 0.8) {
    return `You've used ${used} of ${cap} reviews this month.`;
  }
  return null;
}

export function usageWarning(
  plan: string,
  reviewsThisMonth: number
): string | null {
  return warningForUsage(reviewsThisMonth, PLANS[planOf(plan)].reviewsPerMonthCap);
}
