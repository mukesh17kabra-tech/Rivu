"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { planStorageKey, publishPlan } from "./use-shop-plan";

/**
 * Keeps the whole dashboard on the same plan after it changes.
 *
 * Rendered by any server page that knows the authoritative plan, so `plan`
 * here is the value straight from the database.
 *
 * The bug this fixes: after upgrading, Widget design still offered the old
 * plan's options until the merchant hit reload. Next keeps a client-side
 * Router Cache of previously-visited routes, so navigating Plans → Widget
 * design replayed a payload rendered *before* the change. Nothing was stale in
 * the database; the browser simply never asked again.
 *
 * router.refresh() discards that cache and refetches the current route from
 * the server. It only runs when the plan actually differs from what was last
 * seen, so it cannot loop: the new value is stored first, and the pass that
 * follows the refresh finds them equal.
 */
export function PlanSync({ shop, plan }: { shop: string; plan: string }) {
  const router = useRouter();
  const refreshedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!shop || !plan) return;

    let previous: string | null = null;
    try {
      previous = sessionStorage.getItem(planStorageKey(shop));
    } catch {
      /* private browsing — treat as first sight */
    }

    // Tell the sidebar and the downgrade notice, in this tab and any other.
    publishPlan(shop, plan);

    const changed = previous !== null && previous !== plan;
    if (changed && refreshedFor.current !== plan) {
      // Guarded by a ref as well as by the value comparison: in development
      // React runs effects twice, and a double refresh is wasteful.
      refreshedFor.current = plan;
      router.refresh();
    }
  }, [shop, plan, router]);

  return null;
}
