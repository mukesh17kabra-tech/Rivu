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
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  /**
   * Clears the pending queue.
   *
   * The toggle only decides what happens to reviews as they arrive — it can't
   * reach back and publish ones already held. Someone who ticks "publish
   * automatically" and still sees a review marked Pending has no way to tell
   * why, and no way to fix it except one review at a time.
   */
  async function publishAll() {
    setPublishing(true);
    setError("");
    try {
      const res = await fetch("/api/reviews/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, action: "approveAll" }),
      });
      if (!res.ok) {
        setError("Couldn't publish those. Please try again.");
        return;
      }
      // The table on this page lists them, so show the new state.
      window.location.reload();
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

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

      {/* The confusing case: publishing is automatic, yet something is still
          pending. It was held back before the setting was turned on, and
          nothing on screen said so. */}
      {autoApprove && pendingCount > 0 && (
        <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.08] px-3 py-2.5">
          <p className="text-[13px] leading-relaxed text-amber-200">
            {pendingCount === 1
              ? "1 review is still pending"
              : `${pendingCount} reviews are still pending`}{" "}
            because {pendingCount === 1 ? "it arrived" : "they arrived"} while
            approval was switched on. This setting only applies to reviews from
            now on — it doesn&apos;t publish older ones.
          </p>
          <button
            type="button"
            onClick={publishAll}
            disabled={publishing}
            className="mt-2.5 rounded-md bg-amber-400 px-3 py-1.5 text-xs font-bold text-black transition-colors hover:bg-amber-300 disabled:opacity-60"
          >
            {publishing
              ? "Publishing…"
              : pendingCount === 1
                ? "Publish it now"
                : `Publish all ${pendingCount} now`}
          </button>
        </div>
      )}
      {error && <p className="mt-3 text-[13px] text-red-300">{error}</p>}
    </div>
  );
}
