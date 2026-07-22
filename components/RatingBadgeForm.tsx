"use client";

import { useState } from "react";

export function RatingBadgeForm({ shop, initialTemplate }: { shop: string; initialTemplate: string }) {
  const [template, setTemplate] = useState(initialTemplate);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/shop/rating-badge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, ratingBadgeTemplate: template }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const preview = template.replace(/\{rating\}/g, "★★★★☆").replace(/\{count\}/g, "128");

  return (
    <div className="max-w-md rounded-lg border border-white/10 bg-white/[0.02] p-6">
      <p className="mb-1 text-sm font-medium text-white">Rating Badge text</p>
      <p className="mb-4 text-xs text-white/50">
        Shown on product cards and near the product title (via the &quot;Rivu Rating
        Badge&quot; block). Use <code className="text-emerald-300">{"{rating}"}</code> where the
        star icons should appear, and <code className="text-emerald-300">{"{count}"}</code> for
        the review count.
      </p>
      <input
        type="text"
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        maxLength={150}
        className="mb-3 w-full rounded-md border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white"
      />
      <p className="mb-4 text-xs text-white/40">
        Preview: <span className="text-white/70">{preview}</span>
      </p>
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
