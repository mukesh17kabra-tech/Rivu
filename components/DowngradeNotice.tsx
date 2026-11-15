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
      <div className="w-full max-w-md rounded-2xl border border-black/[0.10] bg-white p-6 shadow-2xl">
        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-yellow-400/20 bg-yellow-400/10">
          <span className="text-2xl">⚠️</span>
        </div>

        <h2 className="mb-2 text-xl font-bold text-[#111418]">Downgraded to Free plan</h2>
        <p className="mb-4 text-[15px] leading-relaxed text-black/68">
          Your widget has been <strong className="text-[#111418]">automatically reset</strong> to the
          basic free design. The following paid customizations have been removed:
        </p>

        <ul className="mb-4 space-y-2 text-[15px] text-black/62">
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
              <span className="mt-0.5 flex-shrink-0 text-red-600">✕</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mb-5 rounded-lg border border-emerald-600/18 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
          ✓ All your reviews, photos, and customer data are completely safe.
          Only the visual design has been reset.
        </div>

        {resetting && (
          <p className="mb-3 text-center text-[13px] text-black/58">
            Resetting design to free defaults…
          </p>
        )}
        {done && (
          <p className="mb-3 text-center text-[13px] text-emerald-700">
            ✓ Design reset complete.
          </p>
        )}

        <div className="flex gap-3">
          <a
            href={`/dashboard/plans?shop=${shop}`}
            target="_top"
            className="flex-1 rounded-lg bg-[#111418] px-4 py-2.5 text-center text-[15px] font-bold text-white hover:bg-[#2a2f35]"
          >
            Upgrade to restore
          </a>
          <button
            onClick={() => setShow(false)}
            className="rounded-lg border border-black/[0.14] px-4 py-2.5 text-[15px] text-black/62 hover:border-black/[0.25] hover:text-black/72"
          >
            Continue on Free
          </button>
        </div>
      </div>
    </div>
  );
}
