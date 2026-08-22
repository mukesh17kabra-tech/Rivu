"use client";

import { useEffect, useState } from "react";

/**
 * Shows a one-time popup when merchant downgrades to Free.
 * Resets design to free defaults immediately.
 *
 * Logic:
 * - On mount, compare currentPlan with localStorage "last known plan"
 * - If was paid → now free → show popup + reset design
 * - Always update stored plan to current
 *
 * Shown on ALL dashboard pages via dashboard/layout.tsx
 */
export function DowngradeNotice({ currentPlan, shop }: { currentPlan: string; shop: string }) {
  const [show, setShow] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!shop || !currentPlan) return;

    const key = `rivu_plan_${shop}`;
    let lastPlan: string | null = null;

    try {
      lastPlan = localStorage.getItem(key);
    } catch {
      // localStorage unavailable (incognito etc.) — skip check
      return;
    }

    const wasPaid = lastPlan === "pro";
    const nowFree = currentPlan === "free";

    // Always update stored plan
    try { localStorage.setItem(key, currentPlan); } catch {}

    if (wasPaid && nowFree) {
      setShow(true);
      doReset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop, currentPlan]);

  async function doReset() {
    setResetting(true);
    try {
      await fetch("/api/billing/downgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop }),
      });
      setDone(true);
    } catch {
      // Non-fatal — popup still shows
    } finally {
      setResetting(false);
    }
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.80)" }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B0D0F] p-6 shadow-2xl">
        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-yellow-400/20 bg-yellow-400/10">
          <span className="text-2xl">⚠️</span>
        </div>

        <h2 className="mb-2 text-xl font-bold text-white">Downgraded to Free plan</h2>
        <p className="mb-4 text-sm leading-relaxed text-white/60">
          Your widget has been <strong className="text-white">automatically reset</strong> to the
          basic free design. The following paid customizations have been removed:
        </p>

        <ul className="mb-4 space-y-2 text-sm text-white/50">
          {[
            "All custom colors (summary, cards, filter bar, form)",
            "Custom fonts and font sizes",
            "Summary width and position",
            "Review form styles: Card, Minimal, Dark",
            "Widget summary styles: Compact, Sidebar, Horizontal",
            "Carousel and Sidebar layouts",
            "Multi-language suggestions (English only now)",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0 text-red-400">✕</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mb-5 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-300">
          ✓ All your reviews, photos, and customer data are completely safe.
          Only the visual design has been reset.
        </div>

        {resetting && (
          <p className="mb-3 text-center text-xs text-white/40">
            Resetting design to free defaults…
          </p>
        )}
        {done && (
          <p className="mb-3 text-center text-xs text-emerald-400">
            ✓ Design reset complete.
          </p>
        )}

        <div className="flex gap-3">
          <a
            href={`/dashboard/plans?shop=${shop}`}
            target="_top"
            className="flex-1 rounded-lg bg-emerald-400 px-4 py-2.5 text-center text-sm font-bold text-black hover:bg-emerald-300"
          >
            Upgrade to restore
          </a>
          <button
            onClick={() => setShow(false)}
            className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white/50 hover:border-white/30 hover:text-white/70"
          >
            Continue on Free
          </button>
        </div>
      </div>
    </div>
  );
}
