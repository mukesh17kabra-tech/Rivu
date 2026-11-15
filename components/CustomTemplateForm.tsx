"use client";

import { useState } from "react";
import {
  TEMPLATE_VARIABLES,
  STARTER_TEMPLATE,
  sanitiseTemplate,
  unknownVariables,
} from "@/lib/widget-template";
import { customTemplateAllowed } from "@/lib/design-options";
import { prepareCustomCss } from "@/lib/widget-css";
import { DESIGN_PRESETS, CSS_SCOPE_NOTE } from "@/lib/design-presets";

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
  initialCss,
}: {
  shop: string;
  plan: string;
  initialEnabled: boolean;
  initialHtml: string;
  initialCss: string;
}) {
  const allowed = customTemplateAllowed(plan);

  const [enabled, setEnabled] = useState(initialEnabled);
  const [html, setHtml] = useState(initialHtml || "");
  const [css, setCss] = useState(initialCss || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Run the same sanitiser the server and the storefront use, so the merchant
  // sees what will be stripped before they save rather than afterwards.
  const { removed } = sanitiseTemplate(html);
  const { removed: cssRemoved } = prepareCustomCss(css);
  const unknown = unknownVariables(html);

  /**
   * Presets load HTML and CSS together.
   *
   * Loading only the markup is what made the original starter template look
   * broken — it referenced classes that nothing defined. The pair is the unit.
   */
  function loadPreset(key: string) {
    const preset = DESIGN_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    setHtml(preset.html);
    setCss(preset.css);
    setSaved(false);
  }

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
          customTemplateCss: css,
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
      if (typeof data.customTemplateCss === "string") setCss(data.customTemplateCss);
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
      <div className="rounded-lg border border-amber-600/25 bg-amber-400/[0.07] p-5">
        <p className="text-[15px] font-bold text-amber-800">Build your own layout</p>
        <p className="mt-1.5 text-sm leading-relaxed text-amber-800/75">
          On Pro you can write your own HTML for the review section and drop in{" "}
          <code className="rounded bg-black/[0.05] px-1 text-amber-800">{"{{stars}}"}</code>,{" "}
          <code className="rounded bg-black/[0.05] px-1 text-amber-800">{"{{review_list}}"}</code>{" "}
          and the rest wherever you want them — so the widget matches your theme
          exactly instead of approximately.
        </p>
        <a
          href={`/dashboard/plans?shop=${encodeURIComponent(shop)}`}
          target="_top"
          className="mt-3 inline-block rounded-md bg-[#111418] px-3.5 py-1.5 text-[13px] font-bold text-white transition-colors hover:bg-[#2a2f35]"
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
          className="h-4 w-4 accent-[#111418]"
        />
        <span className="text-[15px] text-[#111418]">
          Use my own layout instead of the built-in one
        </span>
      </label>

      {/* A ready-made design is a far better starting point than an empty box —
          each one loads markup and matching CSS, then stays fully editable. */}
      <div className="rounded-md border border-black/[0.10] bg-black/[0.02] p-3.5">
        <p className="mb-2.5 text-[13px] font-bold uppercase tracking-wide text-black/58">
          Start from a design
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {DESIGN_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => loadPreset(preset.key)}
              className="rounded-md border border-black/[0.10] bg-black/[0.05] p-3 text-left transition-colors hover:border-[#111418]/40 hover:bg-[#111418]/[0.06]"
            >
              <span className="block text-sm font-bold text-[#111418]">
                {preset.label}
              </span>
              <span className="mt-1 block text-[12px] leading-snug text-black/60">
                {preset.description}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-[12px] text-black/55">
          Loading a design replaces both boxes below. Edit them freely
          afterwards — nothing is locked.
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[13px] text-black/62">Your HTML</label>
          <button
            type="button"
            onClick={() => {
              setHtml(STARTER_TEMPLATE);
              setSaved(false);
            }}
            className="text-[13px] font-medium text-emerald-700 hover:text-emerald-800"
          >
            Load blank starter
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
          className="min-h-[260px] w-full rounded-md border border-black/[0.14] bg-black/[0.055] px-3 py-2 font-mono text-[13px] leading-relaxed text-[#111418]"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-[13px] text-black/62">Your CSS</label>
          {css.trim() !== "" && (
            <button
              type="button"
              onClick={() => {
                setCss("");
                setSaved(false);
              }}
              className="text-[13px] font-medium text-black/58 hover:text-black/72"
            >
              Clear
            </button>
          )}
        </div>
        <textarea
          value={css}
          onChange={(e) => {
            setCss(e.target.value);
            setSaved(false);
          }}
          spellCheck={false}
          placeholder={".rv-ed-score {\n  font-size: 62px;\n  font-weight: 300;\n}"}
          className="min-h-[200px] w-full rounded-md border border-black/[0.14] bg-black/[0.055] px-3 py-2 font-mono text-[13px] leading-relaxed text-[#111418]"
        />
        <p className="mt-1.5 text-[12px] leading-relaxed text-black/55">
          {CSS_SCOPE_NOTE}
        </p>
      </div>

      <div className="rounded-md border border-black/[0.10] bg-black/[0.02] p-3.5">
        <p className="mb-2 text-[13px] font-bold uppercase tracking-wide text-black/58">
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
              className="flex items-baseline gap-2 rounded px-2 py-1 text-left hover:bg-black/[0.035]"
              title={`Insert {{${v.name}}}`}
            >
              <code className="shrink-0 text-[12px] text-emerald-700">
                {`{{${v.name}}}`}
              </code>
              <span className="text-[12px] text-black/58">{v.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Warnings are shown before saving, not after — the merchant should
          never discover on their live storefront that half their markup went. */}
      {removed.length > 0 && (
        <div className="rounded-md border border-amber-600/25 bg-amber-400/[0.07] p-3 text-[13px] text-amber-800">
          <p className="font-semibold">This will be removed when you save:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-amber-800/80">
            {removed.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="mt-1.5 text-amber-800/60">
            Scripts and event handlers run on your customers&apos; browsers, so
            they can&apos;t be allowed here.
          </p>
        </div>
      )}

      {cssRemoved.length > 0 && (
        <div className="rounded-md border border-amber-600/25 bg-amber-400/[0.07] p-3 text-[13px] text-amber-800">
          <p className="font-semibold">Your CSS will be changed on save:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-amber-800/80">
            {cssRemoved.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {unknown.length > 0 && (
        <p className="rounded-md border border-amber-600/25 bg-amber-400/[0.07] p-3 text-[13px] text-amber-800">
          Unknown placeholder{unknown.length === 1 ? "" : "s"}:{" "}
          {unknown.map((u) => `{{${u}}}`).join(", ")} — these will show as-is on
          your storefront.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-[#111418] px-4 py-2 text-[15px] font-bold text-white hover:bg-[#2a2f35] disabled:opacity-60"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save layout"}
        </button>
        {error && <span className="text-[13px] text-red-600">{error}</span>}
      </div>
    </div>
  );
}
