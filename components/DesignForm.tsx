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
  summaryLayout: "modern" | "compact" | "sidebar" | "horizontal";
  // Summary block customization
  summaryBgColor: string;
  summaryTextColor: string;
  summaryWidth: number;
  filterBgColor: string;
  filterTextColor: string;
  sortBgColor: string;
  sortTextColor: string;
  sortBorderColor: string;
  reviewCountFontSize: number;
  reviewTitleColor: string;
  reviewBodyColor: string;
  reviewMetaColor: string;
  // Form modal customization
  formBgColor: string;
  formTextColor: string;
  formCloseColor: string;
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
          {/* Premium live preview */}
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <p className="mb-2 text-xs font-medium text-white/50">Live preview</p>
            <div
              className="overflow-hidden rounded-lg"
              style={{
                backgroundColor: "#f5f5f5",
                fontFamily: settings.fontFamily,
                padding: "14px",
                fontSize: "11px",
              }}
            >
              {/* Mini summary row */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: "28px", fontWeight: 700, color: settings.textColor, lineHeight: 1 }}>4.8</div>
                  <div style={{ color: settings.starColor, fontSize: "11px", marginTop: "3px" }}>★★★★★</div>
                  <div style={{ fontSize: "9px", color: "#aaa", marginTop: "2px" }}>Based on 13 reviews</div>
                </div>
                <div style={{ flex: 1, minWidth: "100px" }}>
                  {[["5 Stars", 77], ["4 Stars", 23], ["3 Stars", 0]].map(([label, pct]) => (
                    <div key={label as string} style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                      <span style={{ width: "38px", fontSize: "9px", color: "#999", flexShrink: 0 }}>{label}</span>
                      <div style={{ flex: 1, height: "5px", backgroundColor: "#e0e0e0", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: settings.rangeColor, borderRadius: "3px" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <button style={{ backgroundColor: settings.primaryGradient || settings.primaryColor, color: "#fff", border: "none", borderRadius: `${settings.borderRadius}px`, padding: "6px 10px", fontSize: "9px", fontWeight: 600, cursor: "default", flexShrink: 0 }}>
                  ✏ Write a Review
                </button>
              </div>

              {/* Mini review cards */}
              <div
                style={
                  settings.displayStyle === "grid"
                    ? { display: "grid", gridTemplateColumns: `repeat(${Math.min(settings.gridColumns, 2)}, 1fr)`, gap: "6px" }
                    : settings.displayStyle === "carousel"
                    ? { display: "flex", gap: "6px", overflowX: "auto" }
                    : { display: "flex", flexDirection: "column", gap: "6px" }
                }
              >
                {SAMPLE_REVIEWS.map((rev, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: settings.backgroundGradient || settings.backgroundColor,
                      color: settings.textColor,
                      borderRadius: `${settings.borderRadius}px`,
                      padding: "8px 10px",
                      border: "1px solid rgba(0,0,0,.06)",
                      boxShadow: "0 1px 3px rgba(0,0,0,.05)",
                      ...(settings.displayStyle === "carousel" ? { minWidth: "140px", flexShrink: 0 } : {}),
                      ...(settings.displayStyle === "masonry" ? { breakInside: "avoid", marginBottom: "6px" } : {}),
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
                      {/* Avatar circle */}
                      <div style={{
                        width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0,
                        backgroundColor: ["#7c3aed", "#0891b2"][i % 2],
                        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "8px", fontWeight: 700,
                      }}>
                        {rev.customerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "9px" }}>{rev.customerName}</div>
                        <div style={{ fontSize: "8px", color: "#aaa" }}>{["6 days ago", "1 mo ago"][i]}</div>
                      </div>
                    </div>
                    <div style={{ color: settings.starColor, fontSize: "9px", marginBottom: "4px" }}>
                      {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                    </div>
                    {i === 0 && (
                      <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: "9px", fontStyle: "italic", textAlign: "left" }}>
                        Great product!
                      </p>
                    )}
                    <p style={{ margin: 0, fontSize: "9px", lineHeight: 1.5, textAlign: "left", overflow: "hidden", maxHeight: "3em" }}>
                      {rev.body}
                    </p>
                    <div style={{ fontSize: "8px", color: "#16a34a", marginTop: "4px" }}>👍 I recommend this</div>
                  </div>
                ))}
              </div>
            </div>
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
        <p className="mb-4 text-sm font-medium text-white/70">Widget summary style</p>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {([
            { key: "modern", label: "Modern Card", plan: "", desc: "Orange rating box, bars, button" },
            { key: "compact", label: "Compact", plan: "Growth+", desc: "Circle rating, clean bars" },
            { key: "sidebar", label: "Left Sidebar", plan: "Growth+", desc: "Sticky left, reviews right" },
            { key: "horizontal", label: "Horizontal Bar", plan: "Pro only", desc: "All in one slim row" },
          ] as const).map((item) => {
            const locked = (isFree && item.key !== "modern") || (plan === "growth" && item.key === "horizontal");
            const isSelected = settings.summaryLayout === item.key;
            return (
              <button
                key={item.key}
                onClick={() => !locked && update("summaryLayout", item.key)}
                disabled={locked}
                className={`group flex flex-col overflow-hidden rounded-lg border transition-all ${
                  locked ? "cursor-not-allowed border-white/5 opacity-40"
                  : isSelected ? "border-emerald-400 shadow-[0_0_0_2px_rgba(52,211,153,0.3)]"
                  : "border-white/10 hover:border-white/30"
                }`}
              >
                {/* Mini visual preview of each summary style */}
                <div className="w-full bg-white p-3" style={{ pointerEvents: "none", minHeight: "80px" }}>
                  {item.key === "modern" && (
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <div style={{ background: settings.rangeColor, borderRadius: "6px", padding: "6px 8px", textAlign: "center", flexShrink: 0 }}>
                        <div style={{ fontFamily: "Georgia,serif", fontSize: "14px", fontWeight: 700, color: "#fff" }}>4.8</div>
                        <div style={{ color: settings.starColor, fontSize: "7px" }}>★★★★★</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        {[90, 8, 2].map((w, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: "3px", marginBottom: "2px" }}>
                            <span style={{ fontSize: "6px", color: "#aaa", width: "20px" }}>{5-i} Stars</span>
                            <div style={{ flex: 1, height: "4px", background: "#f0f0f0", borderRadius: "2px" }}>
                              <div style={{ width: `${w}%`, height: "100%", background: settings.rangeColor, borderRadius: "2px" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: settings.primaryColor, color: "#fff", borderRadius: "4px", padding: "4px 7px", fontSize: "6px", fontWeight: 700, flexShrink: 0 }}>✏ Write</div>
                    </div>
                  )}
                  {item.key === "compact" && (
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: `2px solid ${settings.starColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <div style={{ fontFamily: "Georgia,serif", fontSize: "12px", fontWeight: 800, color: "#333" }}>4.8</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        {[90, 8].map((w, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: "2px", marginBottom: "2px" }}>
                            <div style={{ flex: 1, height: "3px", background: "#eee", borderRadius: "2px" }}>
                              <div style={{ width: `${w}%`, height: "100%", background: settings.rangeColor, borderRadius: "2px" }} />
                            </div>
                          </div>
                        ))}
                        <div style={{ color: settings.starColor, fontSize: "8px" }}>★★★★★</div>
                      </div>
                    </div>
                  )}
                  {item.key === "sidebar" && (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <div style={{ width: "44px", background: "#f8f8f8", borderRadius: "4px", padding: "5px", flexShrink: 0 }}>
                        <div style={{ fontFamily: "Georgia,serif", fontSize: "14px", fontWeight: 800, color: "#333", lineHeight: 1 }}>4.8</div>
                        <div style={{ color: settings.starColor, fontSize: "7px", marginTop: "2px" }}>★★★★★</div>
                        {[90, 8, 2].map((w, i) => (
                          <div key={i} style={{ height: "3px", background: "#eee", borderRadius: "1px", marginTop: "2px", overflow: "hidden" }}>
                            <div style={{ width: `${w}%`, height: "100%", background: settings.rangeColor }} />
                          </div>
                        ))}
                      </div>
                      <div style={{ flex: 1 }}>
                        {[1, 2].map(i => (
                          <div key={i} style={{ background: "#f5f5f5", borderRadius: "3px", padding: "4px", marginBottom: "3px" }}>
                            <div style={{ color: settings.starColor, fontSize: "7px" }}>★★★★★</div>
                            <div style={{ height: "3px", background: "#ddd", borderRadius: "1px", marginTop: "2px" }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.key === "horizontal" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", background: "#fff", border: "1px solid #eee", borderRadius: "4px", padding: "5px 7px" }}>
                      <div style={{ background: settings.rangeColor, borderRadius: "4px", padding: "4px 5px", flexShrink: 0 }}>
                        <div style={{ fontFamily: "Georgia,serif", fontSize: "11px", fontWeight: 700, color: "#fff" }}>4.8</div>
                        <div style={{ color: "rgba(255,255,255,.7)", fontSize: "5px" }}>★★★★★</div>
                      </div>
                      <div style={{ fontSize: "6px", color: "#aaa", flexShrink: 0 }}>160<br/>reviews</div>
                      <div style={{ flex: 1, display: "flex", gap: "3px" }}>
                        {[5, 4, 3].map(s => (
                          <div key={s} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "5px", color: "#aaa" }}>{s}★</div>
                            <div style={{ height: "3px", width: "14px", background: "#eee", borderRadius: "1px", margin: "1px auto" }}>
                              <div style={{ width: s === 5 ? "90%" : s === 4 ? "8%" : "2%", height: "100%", background: settings.rangeColor, borderRadius: "1px" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: settings.primaryColor, color: "#fff", borderRadius: "3px", padding: "3px 5px", fontSize: "5px", fontWeight: 700 }}>✏</div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-white/[0.04]">
                  <span className="text-xs font-medium text-white">
                    {locked ? "🔒 " : isSelected ? "✓ " : ""}{item.label}
                  </span>
                  {item.plan && (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-white/50">{item.plan}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-white/40">
          Free: Modern Card only · Growth: + Compact & Sidebar · Pro: All 4
        </p>

        {/* Summary block customization */}
        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
          <ColorField
            label="Summary background"
            value={settings.summaryBgColor}
            onChange={(v) => update("summaryBgColor", v)}
          />
          <ColorField
            label="Summary text color"
            value={settings.summaryTextColor}
            onChange={(v) => update("summaryTextColor", v)}
          />
          {settings.summaryLayout === "sidebar" && (
            <div>
              <label className="mb-1 block text-xs text-white/50">
                Sidebar width: {settings.summaryWidth}px
              </label>
              <input
                type="range"
                min={160}
                max={400}
                value={settings.summaryWidth}
                onChange={(e) => update("summaryWidth", Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>

      {/* Review list bar — filter count text + sort dropdown */}
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <p className="mb-3 text-sm font-medium text-white/70">Review list bar</p>
        <p className="mb-4 text-xs text-white/40">Controls the "3 Reviews" count text and "Most Recent" sort dropdown above the reviews.</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <ColorField label='Count text color ("3 Reviews")' value={settings.filterTextColor} onChange={(v) => update("filterTextColor", v)} />
          <div>
            <label className="mb-1 block text-xs text-white/50">Count font size: {settings.reviewCountFontSize}px</label>
            <input type="range" min={10} max={20} value={settings.reviewCountFontSize}
              onChange={(e) => update("reviewCountFontSize", Number(e.target.value))} className="w-full" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <ColorField label="Sort dropdown background" value={settings.sortBgColor} onChange={(v) => update("sortBgColor", v)} />
          <ColorField label="Sort dropdown text" value={settings.sortTextColor} onChange={(v) => update("sortTextColor", v)} />
          <ColorField label="Sort dropdown border" value={settings.sortBorderColor} onChange={(v) => update("sortBorderColor", v)} />
        </div>
      </div>

      {/* Review card text colors */}
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <p className="mb-3 text-sm font-medium text-white/70">Review card text colors</p>
        <div className="grid grid-cols-3 gap-4">
          <ColorField label="Review title color" value={settings.reviewTitleColor} onChange={(v) => update("reviewTitleColor", v)} />
          <ColorField label="Review body color" value={settings.reviewBodyColor} onChange={(v) => update("reviewBodyColor", v)} />
          <ColorField label="Date / meta color" value={settings.reviewMetaColor} onChange={(v) => update("reviewMetaColor", v)} />
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <p className="mb-4 text-sm font-medium text-white/70">Review form style</p>

        {/* Form color controls */}
        <div className="mb-4 grid grid-cols-3 gap-4">
          <ColorField
            label="Form background"
            value={settings.formBgColor}
            onChange={(v) => update("formBgColor", v)}
          />
          <ColorField
            label="Form text color"
            value={settings.formTextColor}
            onChange={(v) => update("formTextColor", v)}
          />
          <ColorField
            label="Close button color"
            value={settings.formCloseColor}
            onChange={(v) => update("formCloseColor", v)}
          />
        </div>

        {/* 4 template cards side by side — each shows a mini preview of the real form */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {(["basic", "card", "minimal", "dark"] as const).map((t, i) => {
            const labels = { basic: "Basic", card: "Card", minimal: "Minimal", dark: "Dark" };
            const planLabels = { basic: "", card: "Growth+", minimal: "Growth+", dark: "Pro only" };
            const locked = (isFree && i > 0) || (plan === "growth" && i >= 3);
            const isSelected = settings.formTemplate === t;

            // Mini form preview colours
            const bg = t === "dark" ? "#1a1a2e" : "#fff";
            const tc = t === "dark" ? "#fff" : "#222";
            const inBorder = t === "dark" ? "#333" : "#ddd";
            const inBg = t === "dark" ? "#111827" : "#fff";
            const accentBg = t === "card"
              ? (settings.primaryGradient || settings.primaryColor)
              : t === "dark"
              ? settings.rangeColor
              : (settings.primaryGradient || settings.primaryColor);
            const accentTc = t === "dark" ? "#1a1a2e" : "#fff";

            return (
              <button
                key={t}
                onClick={() => !locked && update("formTemplate", t)}
                disabled={locked}
                className={`group relative flex flex-col overflow-hidden rounded-lg border transition-all ${
                  locked
                    ? "cursor-not-allowed border-white/5 opacity-40"
                    : isSelected
                    ? "border-emerald-400 shadow-[0_0_0_2px_rgba(52,211,153,0.3)]"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                {/* Mini form preview — accurate visual of each template */}
                <div
                  className="w-full p-2.5"
                  style={{ backgroundColor: t === "dark" ? "#111" : "#f8f8f8", pointerEvents: "none" }}
                >
                  <div
                    style={{
                      backgroundColor: bg,
                      borderRadius: "7px",
                      padding: "8px",
                      fontFamily: "sans-serif",
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
                      {t === "card" && (
                        <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: accentBg, flexShrink: 0 }} />
                      )}
                      {t === "dark" && (
                        <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: settings.rangeColor, flexShrink: 0 }} />
                      )}
                      <div>
                        <p style={{ margin: 0, fontSize: "8px", fontWeight: 700, color: tc }}>Write a Review</p>
                        <p style={{ margin: 0, fontSize: "6px", color: t === "dark" ? "#aaa" : "#999" }}>Share your experience</p>
                      </div>
                    </div>

                    {/* Stars */}
                    <div style={{ textAlign: t === "basic" ? "center" : "left", marginBottom: "5px" }}>
                      {t === "basic" && <p style={{ margin: "0 0 2px", fontSize: "6px", color: "#aaa" }}>Your Rating</p>}
                      {t !== "basic" && <p style={{ margin: "0 0 2px", fontSize: "6px", color: t === "dark" ? "#aaa" : "#555" }}>Rate your experience</p>}
                      <span style={{ color: settings.starColor, fontSize: "11px" }}>★★★★☆</span>
                    </div>

                    {/* Fields */}
                    <div style={{ display: "flex", gap: "3px", marginBottom: "3px" }}>
                      <div style={{ flex: 1, height: "11px", border: `1px solid ${inBorder}`, borderRadius: "4px", background: inBg, display: "flex", alignItems: "center", paddingLeft: "4px" }}>
                        <span style={{ fontSize: "5px", color: "#bbb" }}>Your Name *</span>
                      </div>
                      <div style={{ flex: 1, height: "11px", border: `1px solid ${inBorder}`, borderRadius: "4px", background: inBg, display: "flex", alignItems: "center", paddingLeft: "4px" }}>
                        <span style={{ fontSize: "5px", color: "#bbb" }}>Email</span>
                      </div>
                    </div>
                    {(t === "minimal") && (
                      <div style={{ height: "11px", border: `1px solid ${inBorder}`, borderRadius: "4px", background: inBg, marginBottom: "3px", display: "flex", alignItems: "center", paddingLeft: "4px" }}>
                        <span style={{ fontSize: "5px", color: "#bbb" }}>Review Title *</span>
                      </div>
                    )}
                    <div style={{ height: "20px", border: `1px solid ${inBorder}`, borderRadius: "4px", background: inBg, marginBottom: "5px", display: "flex", alignItems: "flex-start", padding: "3px 4px" }}>
                      <span style={{ fontSize: "5px", color: "#bbb" }}>Your review…</span>
                    </div>

                    {/* Submit button */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div style={{
                        background: accentBg, color: accentTc,
                        borderRadius: "4px", padding: "3px 7px",
                        fontSize: "6px", fontWeight: 700,
                      }}>
                        Submit Review
                      </div>
                    </div>
                  </div>
                </div>

                {/* Name + plan label */}
                <div className={`flex items-center justify-between px-3 py-2 ${t === "dark" ? "bg-[#1a1a2e]/80" : "bg-white/[0.04]"}`}>
                  <span className="text-xs font-medium text-white">
                    {locked ? "🔒 " : isSelected ? "✓ " : ""}{labels[t]}
                  </span>
                  {planLabels[t] && (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-white/50">
                      {planLabels[t]}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-white/40">
          Free: Basic only · Growth: Basic, Card, Minimal · Pro: All 4 templates
        </p>
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
