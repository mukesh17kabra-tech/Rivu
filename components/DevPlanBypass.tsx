"use client";

import { useState } from "react";

const PLANS = ["free", "starter", "growth", "pro"] as const;

export function DevPlanBypass({ shop, currentPlan }: { shop: string; currentPlan: string }) {
  const [plan, setPlan] = useState(currentPlan);
  const [busy, setBusy] = useState(false);

  async function setPlanDirectly(newPlan: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/dev/set-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, plan: newPlan }),
      });
      if (res.ok) {
        setPlan(newPlan);
        // Refresh so the rest of the page (Current plan badges, feature
        // gates elsewhere in the app) picks up the change immediately.
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 rounded-lg border border-yellow-400/30 bg-yellow-400/[0.06] p-5">
      <p className="mb-1 text-sm font-medium text-yellow-200">
        🛠 Developer testing — bypass Shopify billing
      </p>
      <p className="mb-4 text-xs text-yellow-200/60">
        If the Billing API is blocked (401/403) or you just want to test a plan&apos;s features,
        use these buttons to set the plan directly — no real Shopify charge happens, the
        merchant isn&apos;t billed. Remove or lock down this panel before a real launch.
      </p>
      <div className="flex gap-2">
        {PLANS.map((p) => (
          <button
            key={p}
            onClick={() => setPlanDirectly(p)}
            disabled={busy}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors disabled:opacity-50 ${
              plan === p
                ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                : "border-white/15 bg-white/[0.03] text-white hover:border-white/30"
            }`}
          >
            {plan === p ? "✓ " : ""}
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
