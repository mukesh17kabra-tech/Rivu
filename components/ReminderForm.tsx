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

  // "Send test email" — lets a merchant confirm delivery and check the
  // wording themselves before any of it reaches a real customer.
  const [testTo, setTestTo] = useState(initial.fromEmail || "");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: true; to: string } | { ok: false; message: string } | null
  >(null);

  async function handleSendTest() {
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/shop/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send the values currently on screen, so unsaved edits are testable.
        body: JSON.stringify({
          shop,
          to: testTo.trim(),
          fromEmail: settings.fromEmail,
          emailSubject: settings.emailSubject,
          emailBodyTemplate: settings.emailBodyTemplate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTestResult({ ok: true, to: data.to || testTo.trim() });
      } else {
        setTestResult({
          ok: false,
          message: data.error || "Couldn't send the test email.",
        });
      }
    } catch {
      setTestResult({ ok: false, message: "Couldn't reach the server. Please try again." });
    } finally {
      setSendingTest(false);
    }
  }

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

      <div className="border-t border-white/10 pt-5">
        <label className="mb-2 block text-sm font-medium text-white/70">
          Send yourself a test email
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            value={testTo}
            onChange={(e) => {
              setTestTo(e.target.value);
              setTestResult(null);
            }}
            placeholder="you@yourstore.com"
            className="min-w-0 flex-1 rounded-md border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30"
          />
          <button
            type="button"
            onClick={handleSendTest}
            disabled={sendingTest || !testTo.trim()}
            className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white hover:border-white/30 disabled:opacity-50"
          >
            {sendingTest ? "Sending…" : "Send test email"}
          </button>
        </div>

        <p className="mt-2 text-xs text-white/40">
          Sends the exact email a customer would get, using the subject and body
          above — including any changes you haven&apos;t saved yet. Your first
          product is used as the example.
        </p>

        {testResult?.ok && (
          <p className="mt-3 rounded-md border border-emerald-400/30 bg-emerald-400/[0.08] px-3 py-2 text-xs text-emerald-300">
            Test email sent to {testResult.to}. If it doesn&apos;t arrive within a
            minute or two, check your spam folder.
          </p>
        )}
        {testResult && !testResult.ok && (
          <p className="mt-3 rounded-md border border-red-400/30 bg-red-400/[0.08] px-3 py-2 text-xs text-red-300">
            {testResult.message}
          </p>
        )}
      </div>
    </div>
  );
}
