"use client";

import { useState } from "react";

export function RatingBadgeForm({
  shop,
  initialTemplate,
  initialStarSize = 16,
}: {
  shop: string;
  initialTemplate: string;
  initialStarSize?: number;
}) {
  const [template, setTemplate] = useState(initialTemplate);
  const [starSize, setStarSize] = useState(initialStarSize);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/shop/rating-badge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, ratingBadgeTemplate: template, ratingBadgeStarSize: starSize }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  // Live preview — shows stars at the configured size
  const starHtml = "★".repeat(4) + "☆";
  const preview = template
    .replace(/\{rating\}/g, starHtml)
    .replace(/\{count\}/g, "128");

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
      <p className="mb-1 text-sm font-medium text-white">Rating Badge</p>
      <p className="mb-4 text-xs text-white/50">
        Compact star widget shown near the product title and on collection cards
        (via the &quot;Rivu Rating Badge&quot; Shopify block). Clicking the badge
        on a product page scrolls the customer down to the full review section automatically.
      </p>

      <label className="mb-1 block text-xs text-white/50">Badge text template</label>
      <input
        type="text"
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        maxLength={150}
        className="mb-2 w-full rounded-md border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white"
      />
      <p className="mb-4 text-xs text-white/40">
        Default <code className="rounded bg-black/30 px-1 text-emerald-300">{"{rating}"}</code> shows just stars + count.
        Add <code className="rounded bg-black/30 px-1 text-emerald-300">{"{count}"}</code> to include the review number inline.
        Example: <code className="rounded bg-black/30 px-1 text-emerald-300">{"{rating} Based on {count} Reviews"}</code>.
        Any text you add will be shown in Title Case automatically. Preview:{" "}
        <span className="text-yellow-300">{preview}</span>
      </p>

      <label className="mb-1 block text-xs text-white/50">
        Star size: {starSize}px
      </label>
      <input
        type="range"
        min={12}
        max={28}
        value={starSize}
        onChange={(e) => setStarSize(Number(e.target.value))}
        className="mb-3 w-full"
      />

      {/* Live size preview */}
      <div className="mb-4 flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2">
        <span style={{ fontSize: `${starSize}px`, color: "#f5b400", lineHeight: 1 }}>★★★★☆</span>
        <span style={{ fontSize: `${Math.max(starSize - 4, 10)}px`, color: "#999" }}>128 reviews</span>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-300 disabled:opacity-60"
      >
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
      </button>
    </div>
  );
}
