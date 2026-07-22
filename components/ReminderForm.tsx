"use client";

import { useState } from "react";

type ReminderSettings = {
  reminderEnabled: boolean;
  reminderDelayDays: number;
  fromEmail: string;
  emailSubject: string;
  emailBodyTemplate: string;
};

export function ReminderForm({ shop, initial }: { shop: string; initial: ReminderSettings }) {
  const [settings, setSettings] = useState<ReminderSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/shop/reminders", {
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
    <div className="max-w-3xl space-y-5 rounded-lg border border-white/10 bg-white/[0.02] p-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-white/70">
          Your email (customer replies go here)
        </label>
        <input
          type="email"
          value={settings.fromEmail}
          onChange={(e) => {
            setSettings((s) => ({ ...s, fromEmail: e.target.value }));
            setSaved(false);
          }}
          placeholder="support@yourstore.com"
          className="w-full rounded-md border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white"
        />
        <p className="mt-2 text-xs text-white/40">
          Reminder emails are sent from Rivu&apos;s address (for reliable delivery), but if a
          customer hits reply, it'll come straight to this inbox. Leave blank if you don't need
          replies routed anywhere in particular.
        </p>
      </div>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={settings.reminderEnabled}
          onChange={(e) => {
            setSettings((s) => ({ ...s, reminderEnabled: e.target.checked }));
            setSaved(false);
          }}
          className="h-4 w-4 accent-emerald-400"
        />
        <span className="text-sm text-white">Automatically email customers to leave a review</span>
      </label>

      {settings.reminderEnabled && (
        <div>
          <label className="mb-2 block text-sm font-medium text-white/70">
            Send reminder this many days after purchase:
          </label>
          <input
            type="number"
            min={1}
            max={90}
            value={settings.reminderDelayDays}
            onChange={(e) => {
              setSettings((s) => ({ ...s, reminderDelayDays: Number(e.target.value) }));
              setSaved(false);
            }}
            className="w-full rounded-md border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white"
          />
          <p className="mt-2 text-xs text-white/40">
            Only sent if the customer hasn't already reviewed that product. Once someone leaves
            a review (using the same email they ordered with), they won't be reminded again for
            that product.
          </p>
        </div>
      )}

      {settings.reminderEnabled && (
        <>
          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">Email subject</label>
            <input
              type="text"
              value={settings.emailSubject}
              onChange={(e) => {
                setSettings((s) => ({ ...s, emailSubject: e.target.value }));
                setSaved(false);
              }}
              className="w-full rounded-md border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">Email body template</label>
            <textarea
              value={settings.emailBodyTemplate}
              onChange={(e) => {
                setSettings((s) => ({ ...s, emailBodyTemplate: e.target.value }));
                setSaved(false);
              }}
              className="w-full rounded-md border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white min-h-[280px] font-mono"
            />
            <p className="mt-2 text-xs text-white/40">
              Available variables:{" "}
              <code className="text-emerald-300">{"{{first_name}}"}</code>,{" "}
              <code className="text-emerald-300">{"{{shop_name}}"}</code>,{" "}
              <code className="text-emerald-300">{"{{review_link}}"}</code>,{" "}
              <code className="text-emerald-300">{"{{product_name}}"}</code>
            </p>
          </div>
        </>
      )}

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
