"use client";

import { useState } from "react";
import {
  TEMPLATE_VARIABLES,
  STARTER_TEMPLATE,
  sanitiseTemplate,
  unknownVariables,
} from "@/lib/widget-template";
import { customTemplateAllowed } from "@/lib/design-options";

/**
 * The Pro "build your own layout" editor.
 *
 * Replaces the one-time paid design service that was originally planned:
 * Shopify Managed Pricing cannot take one-time charges at all, and a
 * done-for-you service costs hours per customer with no recurring revenue.
 * Self-serve gets the merchant the same outcome and scales.
 */
export function CustomTemplateForm({
  shop,
  plan,
  initialEnabled,
  initialHtml,
}: {
  shop: string;
  plan: string;
  initialEnabled: boolean;
  initialHtml: string;
}) {
  const allowed = customTemplateAllowed(plan);

  const [enabled, setEnabled] = useState(initialEnabled);
  const [html, setHtml] = useState(initialHtml || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Run the same sanitiser the server and the storefront use, so the merchant
  // sees what will be stripped before they save rather than afterwards.
  const { removed } = sanitiseTemplate(html);
  const unknown = unknownVariables(html);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/shop/custom-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          customTemplateEnabled: enabled,
          customTemplateHtml: html,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't save. Please try again.");
        return;
      }
      // The server sanitises too; show whatever it actually stored so the
      // editor never disagrees with the storefront.
      if (typeof data.customTemplateHtml === "string") setHtml(data.customTemplateHtml);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!allowed) {
    return (
      <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.07] p-5">
        <p className="text-sm font-bold text-amber-200">Build your own layout</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-amber-200/75">
          On Pro you can write your own HTML for the review section and drop in{" "}
          <code className="rounded bg-black/30 px-1 text-amber-100">{"{{stars}}"}</code>,{" "}
          <code className="rounded bg-black/30 px-1 text-amber-100">{"{{review_list}}"}</code>{" "}
          and the rest wherever you want them — so the widget matches your theme
          exactly instead of approximately.
        </p>
        <a
          href={`/dashboard/plans?shop=${encodeURIComponent(shop)}`}
          target="_top"
          className="mt-3 inline-block rounded-md bg-emerald-400 px-3.5 py-1.5 text-xs font-bold text-black transition-colors hover:bg-emerald-300"
        >
          Upgrade to Pro
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            setSaved(false);
          }}
          className="h-4 w-4 accent-emerald-400"
        />
        <span className="text-sm text-white">
          Use my own layout instead of the built-in one
        </span>
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs text-white/50">Your HTML</label>
          <button
            type="button"
            onClick={() => {
              setHtml(STARTER_TEMPLATE);
              setSaved(false);
            }}
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
          >
            Load starter template
          </button>
        </div>
        <textarea
          value={html}
          onChange={(e) => {
            setHtml(e.target.value);
            setSaved(false);
          }}
          spellCheck={false}
          placeholder={STARTER_TEMPLATE}
          className="min-h-[260px] w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs leading-relaxed text-white"
        />
      </div>

      <div className="rounded-md border border-white/10 bg-white/[0.02] p-3.5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/40">
          Available placeholders
        </p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v.name}
              type="button"
              onClick={() => {
                setHtml((current) => `${current}{{${v.name}}}`);
                setSaved(false);
              }}
              className="flex items-baseline gap-2 rounded px-2 py-1 text-left hover:bg-white/[0.04]"
              title={`Insert {{${v.name}}}`}
            >
              <code className="shrink-0 text-[11px] text-emerald-300">
                {`{{${v.name}}}`}
              </code>
              <span className="text-[11px] text-white/40">{v.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Warnings are shown before saving, not after — the merchant should
          never discover on their live storefront that half their markup went. */}
      {removed.length > 0 && (
        <div className="rounded-md border border-amber-400/25 bg-amber-400/[0.07] p-3 text-xs text-amber-200">
          <p className="font-semibold">This will be removed when you save:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-amber-200/80">
            {removed.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="mt-1.5 text-amber-200/60">
            Scripts and event handlers run on your customers&apos; browsers, so
            they can&apos;t be allowed here.
          </p>
        </div>
      )}

      {unknown.length > 0 && (
        <p className="rounded-md border border-amber-400/25 bg-amber-400/[0.07] p-3 text-xs text-amber-200">
          Unknown placeholder{unknown.length === 1 ? "" : "s"}:{" "}
          {unknown.map((u) => `{{${u}}}`).join(", ")} — these will show as-is on
          your storefront.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-bold text-black hover:bg-emerald-300 disabled:opacity-60"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save layout"}
        </button>
        {error && <span className="text-xs text-red-300">{error}</span>}
      </div>
    </div>
  );
}
