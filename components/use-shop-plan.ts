"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The shop's current plan, kept in step across the dashboard.
 *
 * Two problems this solves.
 *
 * The layout used to read sessionStorage straight from the render body,
 * guarded by `typeof window !== "undefined"`. That renders empty on the server
 * and populated on the client — a hydration mismatch — and, because it was
 * read during render rather than subscribed to, it never updated when the plan
 * changed. The sidebar would sit on "FREE PLAN" while the Plans page showed
 * Pro as current.
 *
 * useSyncExternalStore is the right tool: sessionStorage plus an event is an
 * external store. It gives a server snapshot (so hydration matches) and
 * re-renders on change, without setting state from inside an effect.
 */

export const PLAN_CHANGED_EVENT = "rivu:plan-changed";

export function planStorageKey(shop: string) {
  return `rivu_current_plan_${shop}`;
}

/** Broadcast a plan change to every listener in the tab. */
export function publishPlan(shop: string, plan: string) {
  try {
    sessionStorage.setItem(planStorageKey(shop), plan);
  } catch {
    // Private browsing — the event below still updates the current tab.
  }
  window.dispatchEvent(
    new CustomEvent(PLAN_CHANGED_EVENT, { detail: { shop, plan } })
  );
}

export function useShopPlan(shop: string): string {
  const subscribe = useCallback(
    (onChange: () => void) => {
      // The custom event covers this tab, since `storage` deliberately does
      // not fire in the tab that performed the write. `storage` covers the
      // app being open in a second tab.
      window.addEventListener(PLAN_CHANGED_EVENT, onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener(PLAN_CHANGED_EVENT, onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    []
  );

  const getSnapshot = useCallback(() => {
    if (!shop) return "";
    try {
      return sessionStorage.getItem(planStorageKey(shop)) || "";
    } catch {
      return "";
    }
  }, [shop]);

  // Empty on the server, so the first client render matches the HTML and the
  // real value arrives on the next paint instead of during hydration.
  const getServerSnapshot = useCallback(() => "", []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
