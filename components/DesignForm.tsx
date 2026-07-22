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
    <div className="space-y-6">
      {/* Top row: Layout + live preview side by side, compact */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
          <label className="mb-2 block text-sm font-medium text-white/70">Layout</label>
          <div className="mb-3 flex gap-2">
            {(["list", "grid", "carousel", "split"] as const).map((style) => (
              <button
                key={style}
                onClick={() => update("displayStyle", style)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs capitalize transition-colors ${
                  settings.displayStyle === style
                    ? "border-emerald-400 bg-emerald-400/10 text-white"
                    : "border-white/10 text-white/50 hover:border-white/30"
                }`}
              >
                {style}
              </button>
            ))}
          </div>

          {settings.displayStyle === "grid" && (
            <div className="mb-2">
              <label className="mb-1 block text-xs text-white/50">
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
            <div className="mb-2">
              <label className="mb-1 block text-xs text-white/50">
                Cards visible: {settings.carouselVisible}
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
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <p className="mb-2 text-xs font-medium text-white/50">Live preview</p>
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: "#f4f4f4", fontFamily: settings.fontFamily }}
          >
            <div
              className={
                settings.displayStyle === "grid"
                  ? "grid gap-2"
                  : settings.displayStyle === "carousel"
                  ? "flex gap-2 overflow-x-auto"
                  : "flex flex-col gap-2"
              }
              style={
                settings.displayStyle === "grid"
                  ? { gridTemplateColumns: `repeat(${Math.min(settings.gridColumns, 2)}, 1fr)` }
                  : undefined
              }
            >
              {SAMPLE_REVIEWS.map((r, i) => (
                <div
                  key={i}
                  className={settings.displayStyle === "carousel" ? "min-w-[160px] flex-shrink-0" : ""}
                  style={{
                    backgroundColor: settings.backgroundColor,
                    color: settings.textColor,
                    borderRadius: `${settings.borderRadius}px`,
                    padding: "10px",
                    fontSize: "11px",
                  }}
                >
                  <div style={{ color: settings.starColor, marginBottom: "4px" }}>
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </div>
                  <p style={{ margin: "0 0 6px" }}>{r.body}</p>
                  <p style={{ margin: 0, opacity: 0.6, fontSize: "10px" }}>{r.customerName}</p>
                </div>
              ))}
            </div>
            <button
              className="mt-3 text-xs"
              style={{
                backgroundColor: settings.primaryColor,
                color: "#fff",
                borderRadius: `${settings.borderRadius}px`,
                padding: "6px 10px",
                border: "none",
              }}
            >
              Write a review
            </button>
          </div>
        </div>
      </div>

      {/* Colors — 4 in a row */}
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <p className="mb-3 text-sm font-medium text-white/70">Colors</p>
        <div className="grid grid-cols-4 gap-4">
          <ColorField label="Primary" value={settings.primaryColor} onChange={(v) => update("primaryColor", v)} />
          <ColorField label="Star" value={settings.starColor} onChange={(v) => update("starColor", v)} />
          <ColorField label="Card bg" value={settings.backgroundColor} onChange={(v) => update("backgroundColor", v)} />
          <ColorField label="Text" value={settings.textColor} onChange={(v) => update("textColor", v)} />
          {settings.displayStyle === "carousel" && (
            <ColorField label="Arrow" value={settings.arrowColor} onChange={(v) => update("arrowColor", v)} />
          )}
        </div>
      </div>

      {/* Typography + shape */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
          <label className="mb-2 block text-sm font-medium text-white/70">Font</label>
          <select
            value={settings.fontFamily}
            onChange={(e) => update("fontFamily", e.target.value)}
            className="mb-4 w-full rounded-md border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value} style={{ color: "#000" }}>
                {f.label}
              </option>
            ))}
          </select>
          <label className="mb-1 block text-xs text-white/50">
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

        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
          <label className="mb-2 block text-sm font-medium text-white/70">Widget heading</label>
          <input
            type="text"
            value={settings.widgetTitle}
            onChange={(e) => update("widgetTitle", e.target.value)}
            className="mb-4 w-full rounded-md border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white"
            maxLength={100}
          />
          <label className="mb-1 block text-xs text-white/50">
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
        </div>
      </div>

      {/* Sizing */}
      <div className="grid grid-cols-3 gap-6 rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <div>
          <label className="mb-1 block text-xs text-white/50">
            Container width: {settings.widgetMaxWidth}px
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
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">
            Form width: {settings.formMaxWidth}px
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
        <div>
          <label className="mb-1 block text-xs text-white/50">Form alignment</label>
          <div className="flex gap-1">
            {(["left", "center", "right"] as const).map((align) => (
              <button
                key={align}
                onClick={() => update("formAlign", align)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs capitalize transition-colors ${
                  settings.formAlign === align
                    ? "border-emerald-400 bg-emerald-400/10 text-white"
                    : "border-white/10 text-white/50 hover:border-white/30"
                }`}
              >
                {align}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Suggestions */}
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <p className="mb-3 text-sm font-medium text-white/70">Review suggestions</p>
        <div className="mb-4 flex gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.showSuggestionsOnWebsite}
              onChange={(e) => update("showSuggestionsOnWebsite", e.target.checked)}
              className="h-4 w-4 accent-emerald-400"
            />
            <span className="text-sm text-white/80">On website widget</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.showSuggestionsOnQr}
              onChange={(e) => update("showSuggestionsOnQr", e.target.checked)}
              className="h-4 w-4 accent-emerald-400"
            />
            <span className="text-sm text-white/80">On QR-scan page</span>
          </label>
        </div>
        <label className="mb-2 block text-xs text-white/50">Language</label>
        <div className="grid grid-cols-5 gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => update("suggestionLanguage", lang.code)}
              className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
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
      <label className="mb-1 block text-xs text-white/50">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border border-white/15 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 rounded-md border border-white/15 bg-white/[0.03] px-2 py-1 text-xs text-white"
        />
      </div>
    </div>
  );
}
