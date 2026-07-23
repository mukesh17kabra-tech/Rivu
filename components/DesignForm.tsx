"use client";

import { useState } from "react";
import { SUPPORTED_LANGUAGES } from "@/lib/review-suggestions";

type DesignSettings = {
  displayStyle: "list" | "grid" | "carousel" | "masonry";
  splitSummary: boolean;
  gridColumns: number;
  carouselVisible: number;
  arrowColor: string;
  primaryColor: string;
  starColor: string;
  rangeColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontFamily: string;
  reviewTextSize: number;
  reviewTextAlign: "left" | "center" | "right";
  formAlign: "left" | "center" | "right";
  formMaxWidth: number;
  widgetMaxWidth: number;
  widgetTitle: string;
  headingFontSize: number;
  headingBold: boolean;
  headingAlign: "left" | "center" | "right";
  topSpacing: number;
  showBorder: boolean;
  borderColor: string;
  borderWidth: number;
  borderStyle: "solid" | "dashed" | "dotted" | "double";
  backgroundGradient: string | null;
  primaryGradient: string | null;
  letCustomerPickLanguage: boolean;
  showSuggestionsOnWebsite: boolean;
  showSuggestionsOnQr: boolean;
  suggestionLanguage: string;
  enabledLanguages: string[];
  formTemplate: "basic" | "card" | "minimal" | "dark";
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

export function DesignForm({
  shop,
  plan,
  initial,
}: {
  shop: string;
  plan: "free" | "growth" | "pro";
  initial: DesignSettings;
}) {
  const [settings, setSettings] = useState<DesignSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lockedMsg, setLockedMsg] = useState<string[]>([]);

  const isFree = plan === "free";
  const isPro = plan === "pro";
  const languageCap = plan === "free" ? 1 : plan === "growth" ? 6 : 10;

  function update<K extends keyof DesignSettings>(key: K, value: DesignSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/shop/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, ...settings }),
      });
      const data = await res.json();
      if (data.lockedFields?.length) {
        setLockedMsg(data.lockedFields);
        setTimeout(() => setLockedMsg([]), 4000);
      }
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
            {(["list", "grid", "carousel", "masonry"] as const).map((style) => {
              const locked =
                (isFree && (style === "masonry" || style === "carousel")) ||
                (!isPro && style === "carousel");
              return (
                <button
                  key={style}
                  onClick={() => !locked && update("displayStyle", style)}
                  disabled={locked}
                  title={locked ? `Upgrade to unlock ${style}` : undefined}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs capitalize transition-colors ${
                    locked
                      ? "cursor-not-allowed border-white/5 text-white/25"
                      : settings.displayStyle === style
                      ? "border-emerald-400 bg-emerald-400/10 text-white"
                      : "border-white/10 text-white/50 hover:border-white/30"
                  }`}
                >
                  {locked ? "🔒 " : ""}
                  {style}
                </button>
              );
            })}
          </div>

          {(settings.displayStyle === "grid" || settings.displayStyle === "masonry") && (
            <div className="mb-2">
              <label className="mb-1 block text-xs text-white/50">
                Columns: {settings.gridColumns}
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

          <label className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
            <input
              type="checkbox"
              checked={settings.splitSummary}
              disabled={isFree}
              onChange={(e) => update("splitSummary", e.target.checked)}
              className="h-4 w-4 accent-emerald-400 disabled:opacity-40"
            />
            <span className={`text-sm ${isFree ? "text-white/30" : "text-white/80"}`}>
              {isFree ? "🔒 " : ""}Split view — sticky rating summary beside the review list
            </span>
          </label>
          <p className="mt-1 text-xs text-white/40">
            {isFree
              ? "Upgrade to Growth or Pro to unlock split view."
              : "Combines with any layout above — the summary stays in place while the reviews scroll."}
          </p>
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
                  : settings.displayStyle === "masonry"
                  ? "columns-2 gap-2"
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
                  className={
                    settings.displayStyle === "carousel"
                      ? "min-w-[160px] flex-shrink-0"
                      : settings.displayStyle === "masonry"
                      ? "mb-2 break-inside-avoid"
                      : ""
                  }
                  style={{
                    backgroundColor: settings.backgroundColor,
                    color: settings.textColor,
                    borderRadius: `${settings.borderRadius}px`,
                    padding: "10px",
                    fontSize: `${Math.min(settings.reviewTextSize, 13)}px`,
                    textAlign: settings.reviewTextAlign,
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
        <div className="grid grid-cols-5 gap-4">
          <GradientBackgroundField
            label="Primary"
            solidValue={settings.primaryColor}
            gradientValue={settings.primaryGradient}
            onSolidChange={(v) => update("primaryColor", v)}
            onGradientChange={(v) => update("primaryGradient", v)}
          />
          <ColorField label="Star" value={settings.starColor} onChange={(v) => update("starColor", v)} />
          <ColorField label="Range bar" value={settings.rangeColor} onChange={(v) => update("rangeColor", v)} locked={isFree} />
          <GradientBackgroundField
            label="Card bg"
            solidValue={settings.backgroundColor}
            gradientValue={settings.backgroundGradient}
            onSolidChange={(v) => update("backgroundColor", v)}
            onGradientChange={(v) => update("backgroundGradient", v)}
          />
          <ColorField label="Text" value={settings.textColor} onChange={(v) => update("textColor", v)} />
          {settings.displayStyle === "carousel" && (
            <ColorField label="Arrow" value={settings.arrowColor} onChange={(v) => update("arrowColor", v)} locked={isFree} />
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
            className="mb-3 w-full rounded-md border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white"
            maxLength={100}
          />
          <div className={`mb-3 grid grid-cols-3 gap-3 ${isFree ? "pointer-events-none opacity-40" : ""}`}>
            <div>
              <label className="mb-1 block text-xs text-white/50">
                {isFree ? "🔒 " : ""}Size: {settings.headingFontSize}px
              </label>
              <input
                type="range"
                min={9}
                max={24}
                value={settings.headingFontSize}
                onChange={(e) => update("headingFontSize", Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">Weight</label>
              <button
                onClick={() => update("headingBold", !settings.headingBold)}
                className={`w-full rounded-md border px-2 py-1.5 text-xs transition-colors ${
                  settings.headingBold
                    ? "border-emerald-400 bg-emerald-400/10 text-white font-bold"
                    : "border-white/10 text-white/50 hover:border-white/30"
                }`}
              >
                {settings.headingBold ? "Bold" : "Regular"}
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">Position</label>
              <select
                value={settings.headingAlign}
                onChange={(e) => update("headingAlign", e.target.value as "left" | "center" | "right")}
                className="w-full rounded-md border border-white/15 bg-white/[0.03] px-2 py-1.5 text-xs text-white"
              >
                <option value="left" style={{ color: "#000" }}>Left</option>
                <option value="center" style={{ color: "#000" }}>Center</option>
                <option value="right" style={{ color: "#000" }}>Right</option>
              </select>
            </div>
          </div>
          {isFree && (
            <p className="mb-3 text-xs text-yellow-300/70">
              Heading size/weight/position customization needs Growth or Pro.
            </p>
          )}
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
          <label className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
            <input
              type="checkbox"
              checked={settings.showBorder}
              onChange={(e) => update("showBorder", e.target.checked)}
              className="h-4 w-4 accent-emerald-400"
            />
            <span className="text-sm text-white/80">Show border around widget</span>
          </label>
          {settings.showBorder && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              <ColorField
                label="Border color"
                value={settings.borderColor}
                onChange={(v) => update("borderColor", v)}
              />
              <div>
                <label className="mb-1 block text-xs text-white/50">
                  Width: {settings.borderWidth}px
                </label>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={settings.borderWidth}
                  onChange={(e) => update("borderWidth", Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/50">Style</label>
                <select
                  value={settings.borderStyle}
                  onChange={(e) =>
                    update("borderStyle", e.target.value as "solid" | "dashed" | "dotted" | "double")
                  }
                  className="w-full rounded-md border border-white/15 bg-white/[0.03] px-2 py-1.5 text-xs text-white"
                >
                  <option value="solid" style={{ color: "#000" }}>Solid</option>
                  <option value="dashed" style={{ color: "#000" }}>Dashed</option>
                  <option value="dotted" style={{ color: "#000" }}>Dotted</option>
                  <option value="double" style={{ color: "#000" }}>Double</option>
                </select>
              </div>
            </div>
          )}
          <p className="mt-2 text-xs text-white/40">
            Helps the widget stand out against a plain background — recommended if your
            theme's page background is also white.
          </p>
        </div>
      </div>

      {/* Review text appearance */}
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <div className={`grid grid-cols-2 gap-6 ${isFree ? "pointer-events-none opacity-40" : ""}`}>
          <div>
            <label className="mb-1 block text-xs text-white/50">
              {isFree ? "🔒 " : ""}Review text size: {settings.reviewTextSize}px
            </label>
            <input
              type="range"
              min={11}
              max={20}
              value={settings.reviewTextSize}
              onChange={(e) => update("reviewTextSize", Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Review text position</label>
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => update("reviewTextAlign", align)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs capitalize transition-colors ${
                    settings.reviewTextAlign === align
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
        {isFree && (
          <p className="mt-3 text-xs text-yellow-300/70">
            Review text size/position customization needs Growth or Pro.
          </p>
        )}
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
        <label className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.letCustomerPickLanguage}
            disabled={isFree}
            onChange={(e) => update("letCustomerPickLanguage", e.target.checked)}
            className="h-4 w-4 accent-emerald-400 disabled:opacity-40"
          />
          <span className={`text-sm ${isFree ? "text-white/30" : "text-white/80"}`}>
            {isFree ? "🔒 " : ""}Let customers choose their own language (shows a dropdown on the
            review form)
          </span>
        </label>
        {isFree && (
          <p className="mb-3 -mt-2 text-xs text-yellow-300/70">
            Also needs Growth or Pro — Free plan is English-only.
          </p>
        )}
        <label className="mb-2 block text-xs text-white/50">
          Enabled languages ({settings.enabledLanguages.length}/{languageCap})
        </label>
        <div className="grid grid-cols-5 gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const checked = settings.enabledLanguages.includes(lang.code);
            const atCap = settings.enabledLanguages.length >= languageCap;
            const disabled = lang.code === "en" || (!checked && atCap);
            return (
              <label
                key={lang.code}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                  checked
                    ? "border-emerald-400 bg-emerald-400/10 text-white"
                    : disabled
                    ? "cursor-not-allowed border-white/5 text-white/25"
                    : "border-white/10 text-white/50 hover:border-white/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) => {
                    if (e.target.checked) {
                      update("enabledLanguages", [...settings.enabledLanguages, lang.code]);
                    } else {
                      update(
                        "enabledLanguages",
                        settings.enabledLanguages.filter((c) => c !== lang.code)
                      );
                    }
                  }}
                  className="h-3 w-3 accent-emerald-400"
                />
                {lang.label}
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-white/40">
          {plan === "free"
            ? "Free plan is English-only."
            : `Pick up to ${languageCap} languages your customers can write reviews in.`}
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <p className="mb-3 text-sm font-medium text-white/70">Review form style</p>
        <div className="grid grid-cols-2 gap-2">
          {(["basic", "card", "minimal", "dark"] as const).map((t, i) => {
            const labels = { basic: "Basic (clean)", card: "Card (accent)", minimal: "Minimal", dark: "Dark" };
            const planReq = i === 0 ? "free" : i <= 2 ? "growth" : "pro";
            const locked = (isFree && i > 0) || (plan === "growth" && i >= 3);
            return (
              <button
                key={t}
                onClick={() => !locked && update("formTemplate", t)}
                disabled={locked}
                className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                  locked
                    ? "cursor-not-allowed border-white/5 text-white/25"
                    : settings.formTemplate === t
                    ? "border-emerald-400 bg-emerald-400/10 text-white"
                    : "border-white/10 text-white/50 hover:border-white/30"
                }`}
              >
                {locked ? "🔒 " : ""}{labels[t]}
                {planReq !== "free" && (
                  <span className="ml-1 text-[10px] opacity-50 capitalize">{planReq}+</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-300 disabled:opacity-60"
      >
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
      </button>
      {lockedMsg.length > 0 && (
        <p className="mt-2 text-xs text-yellow-300/80">
          Some choices need a higher plan and were kept at their default: {lockedMsg.join(", ")}.{" "}
          <a href={`/dashboard/plans?shop=${shop}`} className="underline">
            View plans
          </a>
        </p>
      )}
    </div>
  );
}

function GradientBackgroundField({
  label,
  solidValue,
  gradientValue,
  onSolidChange,
  onGradientChange,
}: {
  label: string;
  solidValue: string;
  gradientValue: string | null;
  onSolidChange: (v: string) => void;
  onGradientChange: (v: string | null) => void;
}) {
  const isGradient = !!gradientValue;

  // Parse the two colors out of a stored linear-gradient string (best
  // effort — falls back to sensible defaults if parsing fails, e.g. on
  // first switch to gradient mode when there's nothing stored yet).
  const match = gradientValue?.match(/#[0-9a-fA-F]{6}/g);
  const colorA = match?.[0] || solidValue;
  const colorB = match?.[1] || "#7c3aed";

  function buildGradient(a: string, b: string) {
    return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="block text-xs text-white/50">{label}</label>
        <div className="flex gap-1">
          <button
            onClick={() => onGradientChange(null)}
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              !isGradient ? "bg-emerald-400/20 text-emerald-300" : "text-white/40"
            }`}
          >
            Solid
          </button>
          <button
            onClick={() => onGradientChange(buildGradient(colorA, colorB))}
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              isGradient ? "bg-emerald-400/20 text-emerald-300" : "text-white/40"
            }`}
          >
            Gradient
          </button>
        </div>
      </div>
      {isGradient ? (
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={colorA}
            onChange={(e) => onGradientChange(buildGradient(e.target.value, colorB))}
            className="h-8 w-8 cursor-pointer rounded border border-white/15 bg-transparent"
          />
          <input
            type="color"
            value={colorB}
            onChange={(e) => onGradientChange(buildGradient(colorA, e.target.value))}
            className="h-8 w-8 cursor-pointer rounded border border-white/15 bg-transparent"
          />
          <div
            className="h-8 flex-1 rounded border border-white/15"
            style={{ background: gradientValue || undefined }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={solidValue}
            onChange={(e) => onSolidChange(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded border border-white/15 bg-transparent"
          />
          <input
            type="text"
            value={solidValue}
            onChange={(e) => onSolidChange(e.target.value)}
            className="w-full min-w-0 rounded-md border border-white/15 bg-white/[0.03] px-2 py-1 text-xs text-white"
          />
        </div>
      )}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  locked = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  locked?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-white/50">
        {locked ? "🔒 " : ""}
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          disabled={locked}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border border-white/15 bg-transparent disabled:cursor-not-allowed disabled:opacity-40"
        />
        <input
          type="text"
          value={value}
          disabled={locked}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 rounded-md border border-white/15 bg-white/[0.03] px-2 py-1 text-xs text-white disabled:opacity-40"
        />
      </div>
    </div>
  );
}
