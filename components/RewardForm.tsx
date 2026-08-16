"use client";

import { useState } from "react";

type RewardSettings = {
  rewardEnabled: boolean;
  rewardType: "percentage" | "fixed_amount";
  rewardValue: number;
};

export function RewardForm({ shop, initial }: { shop: string; initial: RewardSettings }) {
  const [settings, setSettings] = useState<RewardSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/shop/reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, ...settings }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-5 rounded-lg border border-slate-200 bg-white p-6">
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={settings.rewardEnabled}
          onChange={(e) => {
            setSettings((s) => ({ ...s, rewardEnabled: e.target.checked }));
            setSaved(false);
          }}
          className="h-4 w-4 accent-slate-900"
        />
        <span className="text-sm text-slate-900">Give a discount for every review</span>
      </label>

      {settings.rewardEnabled && (
        <>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">Discount type</label>
            <div className="flex gap-2">
              {(["percentage", "fixed_amount"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setSettings((s) => ({ ...s, rewardType: type }));
                    setSaved(false);
                  }}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                    settings.rewardType === type
                      ? "border-emerald-400 bg-emerald-50 text-slate-900"
                      : "border-slate-200 text-slate-500 hover:border-slate-400"
                  }`}
                >
                  {type === "percentage" ? "Percentage off" : "Fixed amount off"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              {settings.rewardType === "percentage" ? "Percentage (%)" : "Amount (in store currency)"}
            </label>
            <input
              type="number"
              min={1}
              max={settings.rewardType === "percentage" ? 100 : 1000}
              value={settings.rewardValue}
              onChange={(e) => {
                setSettings((s) => ({ ...s, rewardValue: Number(e.target.value) }));
                setSaved(false);
              }}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <p className="text-xs text-slate-400">
            Every review generates a unique, one-time-use code — shown to the customer right
            after they submit their review.
          </p>
        </>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
      </button>
    </div>
  );
}
