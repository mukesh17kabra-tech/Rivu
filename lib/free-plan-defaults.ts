import { FREE_PLAN_DESIGN_DEFAULTS } from "./design-defaults";
import { clampDesignToPlan } from "./plan-gating";
import { db } from "./db";

export { FREE_PLAN_DESIGN_DEFAULTS };

/**
 * Resets a shop's design to Free plan defaults.
 * Call this when a shop's plan changes to "free".
 *
 * Anything the Free plan genuinely allows is kept rather than flattened.
 * Minimal is a Free summary style, so a merchant who picked it and then
 * moved to Free was having their choice silently replaced with Modern —
 * it looked as though the setting hadn't saved. clampDesignToPlan is the
 * authority on what Free permits, so it decides here too.
 */
export async function resetToFreePlan(shopDomain: string) {
  const current = await db.shop.findUnique({
    where: { shopDomain },
    select: { summaryLayout: true },
  });

  const { clamped } = clampDesignToPlan("free", {
    ...FREE_PLAN_DESIGN_DEFAULTS,
    summaryLayout: current?.summaryLayout ?? FREE_PLAN_DESIGN_DEFAULTS.summaryLayout,
  });

  await db.shop.update({
    where: { shopDomain },
    data: {
      plan: "free",
      ...FREE_PLAN_DESIGN_DEFAULTS,
      // Survives the reset when Free allows it; clamped back otherwise.
      summaryLayout: clamped.summaryLayout,
    },
  });
}
