"use client";

import { useEffect } from "react";

/**
 * Tiny invisible component — stores the current plan in sessionStorage
 * so the dashboard layout's DowngradeNotice can detect downgrades.
 * Add <PlanSync shop={shop} plan={plan} /> to any dashboard server page.
 */
export function PlanSync({ shop, plan }: { shop: string; plan: string }) {
  useEffect(() => {
    if (shop && plan) {
      try {
        sessionStorage.setItem(`rivu_current_plan_${shop}`, plan);
      } catch {}
    }
  }, [shop, plan]);

  return null;
}
