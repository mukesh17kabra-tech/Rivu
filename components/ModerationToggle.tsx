"use client";

import { useState } from "react";

/**
 * Controls whether new reviews publish straight away or wait in a queue.
 *
 * Deliberately sits on the Reviews page next to the pending count: the whole
 * reason this exists is that reviews were being held back invisibly, so the
 * setting belongs where a merchant looks when a review hasn't shown up.
 */
export function ModerationToggle({
  shop,
  initialAutoApprove,
  pendingCount,
}: {
  shop: string;
  initialAutoApprove: boolean;
  pendingCount: number;
}) {
  const [autoApprove, setAutoApprove] = useState(initialAutoApprove);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function toggle(next: boolean) {
    setSaving(true);
    setError("");
    const previous = autoApprove;
    setAutoApprove(next); // optimistic — reverted below if the save fails
    try {
      const res = await fetch("/api/shop/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, autoApproveReviews: next }),
      });
      if (!res.ok) {
        setAutoApprove(previous);
        setError("Couldn't save that. Please try again.");
      }
    } catch {
      setAutoApprove(previous);
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-5 rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[15px] font-bold text-white">Publishing</p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/45">
            {autoApprove
              ? "New reviews appear on your storefront straight away."
              : "New reviews stay hidden until you approve them here."}
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-3">
          <span className="text-[13px] font-medium text-white/70">
            Publish automatically
          </span>
          <input
            type="checkbox"
            checked={autoApprove}
            disabled={saving}
            onChange={(e) => toggle(e.target.checked)}
            className="h-4 w-4 accent-emerald-400"
          />
        </label>
      </div>

      {!autoApprove && pendingCount > 0 && (
        <p className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.08] px-3 py-2 text-[13px] text-amber-200">
          {pendingCount} review{pendingCount === 1 ? "" : "s"} waiting for approval —
          {pendingCount === 1 ? " it isn't" : " they aren't"} visible on your storefront yet.
        </p>
      )}
      {error && <p className="mt-3 text-[13px] text-red-300">{error}</p>}
    </div>
  );
}
