"use client";

import { useState } from "react";
import { SUPPORTED_LANGUAGES } from "@/lib/review-suggestions";

type DesignSettings = {
  displayStyle: "list" | "grid" | "carousel" | "split";
  gridColumns: number;
  carouselVisible: number;
  arrowColor: string;
  primaryColor: string;
  starColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontFamily: string;
  formAlign: "left" | "center" | "right";
  formMaxWidth: number;
  widgetMaxWidth: number;
  widgetTitle: string;
  topSpacing: number;
  showSuggestionsOnWebsite: boolean;
  showSuggestionsOnQr: boolean;
  suggestionLanguage: string;
};

const FONT_OPTIONS = [
  { value: "inherit", label: "Match my theme" },
  { value: "Georgia, serif", label: "Georgia (serif)" },
  { value: "'Helvetica Neue', Arial, sans-serif", label: "Helvetica (sans-serif)" },
  { value: "'Courier New', monospace", label: "Courier (monospace)" },
];

const SAMPLE_REVIEWS = [
  { rating: 5, body: "Absolutely love this product! Exceeded my expectations.", customerName: "Aisha K." },
  { rating: 4, body: "Really good quality, delivery was a bit slow though.", customerName: "Rohan M." },
  { rating: 5, body: "Best purchase this year. Highly recommend!", customerName: "Priya S." },
];

export function DesignForm({ shop, initial }: { shop: string; initial: DesignSettings }) {
  const [settings, setSettings] = useState<DesignSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof DesignSettings>(key: K, value: DesignSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/shop/design", {
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
    <div className="grid grid-cols-2 gap-8">
      {/* Controls */}
      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-white/70">Layout</label>
          <div className="flex gap-2">
            {(["list", "grid", "carousel", "split"] as const).map((style) => (
              <button
                key={style}
                onClick={() => update("displayStyle", style)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm capitalize transition-colors ${
                  settings.displayStyle === style
                    ? "border-emerald-400 bg-emerald-400/10 text-white"
                    : "border-white/10 text-white/50 hover:border-white/30"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {settings.displayStyle === "grid" && (
          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">
              Grid columns: {settings.gridColumns}
            </label>
            <input
              type="range"
              min={2}
              max={5}
              value={settings.gridColumns}
              onChange={(e) => update("gridColumns", Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}

        {settings.displayStyle === "carousel" && (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Cards visible at once: {settings.carouselVisible}
              </label>
              <input
                type="range"
                min={1}
                max={4}
                value={settings.carouselVisible}
                onChange={(e) => update("carouselVisible", Number(e.target.value))}
                className="w-full"
              />
            </div>
            <ColorField
              label="Arrow color"
              value={settings.arrowColor}
              onChange={(v) => update("arrowColor", v)}
            />
          </>
        )}

        <ColorField
          label="Primary color (buttons, CTA)"
          value={settings.primaryColor}
          onChange={(v) => update("primaryColor", v)}
        />
        <ColorField
          label="Star color"
          value={settings.starColor}
          onChange={(v) => update("starColor", v)}
        />
        <ColorField
          label="Card background"
          value={settings.backgroundColor}
          onChange={(v) => update("backgroundColor", v)}
        />
        <ColorField
          label="Text color"
          value={settings.textColor}
          onChange={(v) => update("textColor", v)}
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-white/70">
            Corner roundness: {settings.borderRadius}px
          </label>
          <input
            type="range"
            min={0}
            max={24}
            value={settings.borderRadius}
            onChange={(e) => update("borderRadius", Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-white/70">Font</label>
          <select
            value={settings.fontFamily}
            onChange={(e) => update("fontFamily", e.target.value)}
            className="w-full rounded-md border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value} style={{ color: "#000" }}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="border-t border-white/10 pt-5">
          <label className="mb-2 block text-sm font-medium text-white/70">Widget heading text</label>
          <input
            type="text"
            value={settings.widgetTitle}
            onChange={(e) => update("widgetTitle", e.target.value)}
            className="w-full rounded-md border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white"
            maxLength={100}
          />
          <p className="mt-2 text-xs text-white/40">
            Shown above the review list — change to whatever fits your store&apos;s voice
            (e.g. &quot;What our customers say&quot;).
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-white/70">
            Top spacing: {settings.topSpacing}px
          </label>
          <input
            type="range"
            min={0}
            max={120}
            step={4}
            value={settings.topSpacing}
            onChange={(e) => update("topSpacing", Number(e.target.value))}
            className="w-full"
          />
          <p className="mt-2 text-xs text-white/40">
            Space above the widget — increase if it looks too squeezed against content
            above it on your page.
          </p>
        </div>

        <div className="border-t border-white/10 pt-5">
          <p className="mb-3 text-sm font-medium text-white/70">Overall widget size</p>
          <label className="mb-2 block text-xs font-medium text-white/50">
            Container max width: {settings.widgetMaxWidth}px
          </label>
          <input
            type="range"
            min={320}
            max={900}
            step={20}
            value={settings.widgetMaxWidth}
            onChange={(e) => update("widgetMaxWidth", Number(e.target.value))}
            className="w-full"
          />
          <p className="mt-2 text-xs text-white/40">
            Controls how much horizontal space the whole widget (summary, review list, and
            button) takes up — increase this if it looks too narrow on your page.
          </p>
        </div>

        <div className="border-t border-white/10 pt-5">
          <p className="mb-3 text-sm font-medium text-white/70">
            &quot;Write a review&quot; form position
          </p>
          <label className="mb-2 block text-xs font-medium text-white/50">Alignment</label>
          <div className="mb-4 flex gap-2">
            {(["left", "center", "right"] as const).map((align) => (
              <button
                key={align}
                onClick={() => update("formAlign", align)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm capitalize transition-colors ${
                  settings.formAlign === align
                    ? "border-emerald-400 bg-emerald-400/10 text-white"
                    : "border-white/10 text-white/50 hover:border-white/30"
                }`}
              >
                {align}
              </button>
            ))}
          </div>
          <label className="mb-2 block text-xs font-medium text-white/50">
            Form max width: {settings.formMaxWidth}px
          </label>
          <input
            type="range"
            min={280}
            max={600}
            step={20}
            value={settings.formMaxWidth}
            onChange={(e) => update("formMaxWidth", Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="border-t border-white/10 pt-5">
          <p className="mb-3 text-sm font-medium text-white/70">Show review suggestions</p>
          <label className="mb-2 flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.showSuggestionsOnWebsite}
              onChange={(e) => update("showSuggestionsOnWebsite", e.target.checked)}
              className="h-4 w-4 accent-emerald-400"
            />
            <span className="text-sm text-white/80">On the website (product page widget)</span>
          </label>
          <label className="mb-4 flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.showSuggestionsOnQr}
              onChange={(e) => update("showSuggestionsOnQr", e.target.checked)}
              className="h-4 w-4 accent-emerald-400"
            />
            <span className="text-sm text-white/80">On the QR-scan review page</span>
          </label>

          <label className="mb-2 block text-xs font-medium text-white/50">Suggestion language</label>
          <div className="grid grid-cols-2 gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => update("suggestionLanguage", lang.code)}
                className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                  settings.suggestionLanguage === lang.code
                    ? "border-emerald-400 bg-emerald-400/10 text-white"
                    : "border-white/10 text-white/50 hover:border-white/30"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-300 disabled:opacity-60"
        >
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>

      {/* Live preview */}
      <div>
        <p className="mb-2 text-sm font-medium text-white/50">Live preview</p>
        <div
          className="rounded-lg p-6"
          style={{
            backgroundColor: "#f4f4f4",
            fontFamily: settings.fontFamily,
          }}
        >
          <div
            className={
              settings.displayStyle === "grid"
                ? "grid gap-3"
                : settings.displayStyle === "carousel"
                ? "flex gap-3 overflow-x-auto"
                : "flex flex-col gap-3"
            }
            style={
              settings.displayStyle === "grid"
                ? { gridTemplateColumns: `repeat(${settings.gridColumns}, 1fr)` }
                : undefined
            }
          >
            {SAMPLE_REVIEWS.map((r, i) => (
              <div
                key={i}
                className={settings.displayStyle === "carousel" ? "min-w-[200px] flex-shrink-0" : ""}
                style={{
                  backgroundColor: settings.backgroundColor,
                  color: settings.textColor,
                  borderRadius: `${settings.borderRadius}px`,
                  padding: "14px",
                  fontSize: "13px",
                }}
              >
                <div style={{ color: settings.starColor, marginBottom: "6px" }}>
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </div>
                <p style={{ margin: "0 0 8px" }}>{r.body}</p>
                <p style={{ margin: 0, opacity: 0.6, fontSize: "12px" }}>{r.customerName}</p>
              </div>
            ))}
          </div>
          <button
            className="mt-4 text-sm"
            style={{
              backgroundColor: settings.primaryColor,
              color: "#fff",
              borderRadius: `${settings.borderRadius}px`,
              padding: "8px 14px",
              border: "none",
            }}
          >
            Write a review
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-white/70">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded border border-white/15 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-28 rounded-md border border-white/15 bg-white/[0.03] px-2 py-1 text-sm text-white"
        />
      </div>
    </div>
  );
}
