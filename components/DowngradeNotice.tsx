"use client";

import { useEffect, useState } from "react";

/**
 * Shows a one-time popup when a shop has just downgraded from a paid plan
 * to Free. Detected by comparing the last stored plan (in localStorage)
 * with the current plan from the server.
 */
export function DowngradeNotice({ currentPlan, shop }: { currentPlan: string; shop: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const key = `rivu_last_plan_${shop}`;
    const lastPlan = localStorage.getItem(key);
    const wasPaid = lastPlan === "growth" || lastPlan === "pro";
    const isNowFree = currentPlan === "free";

    if (wasPaid && isNowFree) {
      setShow(true);
    }
    // Always store current plan
    localStorage.setItem(key, currentPlan);
  }, [currentPlan, shop]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0B0D0F] p-6 shadow-2xl">
        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400/10">
          <span className="text-2xl">⚠️</span>
        </div>

        <h2 className="mb-2 text-lg font-bold text-white">You're now on the Free plan</h2>
        <p className="mb-4 text-sm text-white/60">
          Your widget has been reset to the basic free design. The following customizations
          have been removed:
        </p>

        <ul className="mb-5 space-y-1.5 text-sm text-white/50">
          {[
            "All custom colors (summary, filter bar, review card, form)",
            "Custom fonts and font sizes",
            "Summary width and position",
            "Review form style (only Basic available)",
            "Widget summary style (only Modern available)",
            "Carousel and Sidebar layouts",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 text-red-400">✕</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <p className="mb-5 text-sm text-white/60">
          Your reviews and collected data are safe — only the design settings have been reset.
        </p>

        <div className="flex gap-3">
          <a
            href={`/dashboard/plans?shop=${shop}`}
            target="_top"
            className="flex-1 rounded-md bg-emerald-400 px-4 py-2 text-center text-sm font-medium text-black hover:bg-emerald-300"
          >
            Upgrade to restore settings
          </a>
          <button
            onClick={() => setShow(false)}
            className="rounded-md border border-white/15 px-4 py-2 text-sm text-white/60 hover:border-white/30"
          >
            Continue with Free
          </button>
        </div>
      </div>
    </div>
  );
}
