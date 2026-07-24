"use client";

import { useEffect, useState } from "react";

export function DowngradeNotice({ currentPlan, shop }: { currentPlan: string; shop: string }) {
  const [show, setShow] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const key = `rivu_last_plan_${shop}`;
    const lastPlan = localStorage.getItem(key);
    const wasPaid = lastPlan === "growth" || lastPlan === "pro";
    const isNowFree = currentPlan === "free";

    if (wasPaid && isNowFree) {
      // Show popup AND immediately reset design on server
      setShow(true);
      triggerReset();
    }

    // Always store current plan
    localStorage.setItem(key, currentPlan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlan, shop]);

  async function triggerReset() {
    setResetting(true);
    try {
      await fetch("/api/billing/downgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop }),
      });
    } finally {
      setResetting(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0B0D0F] p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400/10 border border-yellow-400/20">
          <span className="text-2xl">⚠️</span>
        </div>

        <h2 className="mb-2 text-lg font-bold text-white">You're now on the Free plan</h2>
        <p className="mb-4 text-sm text-white/60">
          Your widget design has been automatically reset to the basic free layout.
          The following paid customizations have been removed from your storefront:
        </p>

        <ul className="mb-5 space-y-1.5 text-sm text-white/50">
          {[
            "Custom colors (summary, filter bar, review cards, form modal)",
            "Custom fonts and font sizes",
            "Summary width and position controls",
            "Review form styles (Card, Minimal, Dark)",
            "Widget summary styles (Compact, Sidebar, Horizontal)",
            "Carousel and Sidebar layouts",
            "Multi-language suggestions (English only)",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0 text-red-400">✕</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <p className="mb-5 rounded-md bg-emerald-400/10 border border-emerald-400/20 px-3 py-2 text-xs text-emerald-300">
          ✓ Your reviews, photos, and collected data are all safe — only the visual design has been reset.
        </p>

        {resetting && (
          <p className="mb-3 text-xs text-white/40 text-center">Resetting design settings…</p>
        )}

        <div className="flex gap-3">
          <a
            href={`/dashboard/plans?shop=${shop}`}
            target="_top"
            className="flex-1 rounded-md bg-emerald-400 px-4 py-2.5 text-center text-sm font-semibold text-black hover:bg-emerald-300"
          >
            Upgrade to restore settings
          </a>
          <button
            onClick={() => setShow(false)}
            className="rounded-md border border-white/15 px-4 py-2.5 text-sm text-white/50 hover:border-white/30 hover:text-white/70"
          >
            Continue on Free
          </button>
        </div>
      </div>
    </div>
  );
}
