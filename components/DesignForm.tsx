"use client";

import { useState } from "react";
import {
  aiSuggestionsAllowed,
  formTemplatesFor,
  summaryLayoutsFor,
} from "@/lib/design-options";
import { SUPPORTED_LANGUAGES } from "@/lib/review-suggestions";

export type DesignSettings = {
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
  summaryLayout:
    | "modern" | "minimal" | "compact" | "sidebar"
    | "stacked" | "horizontal" | "iconpct" | "split";
  // Summary block customization
  summaryBgColor: string;
  summaryTextColor: string;
  summaryWidth: number;
  summaryPosition: "left" | "center" | "right";
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
  // Serif
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Playfair Display', Georgia, serif", label: "Playfair Display" },
  { value: "'Merriweather', Georgia, serif", label: "Merriweather" },
  { value: "'Lora', Georgia, serif", label: "Lora" },
  { value: "'Cormorant Garamond', Georgia, serif", label: "Cormorant Garamond" },
  // Sans-serif
  { value: "'Inter', 'Helvetica Neue', Arial, sans-serif", label: "Inter" },
  { value: "'Poppins', Arial, sans-serif", label: "Poppins" },
  { value: "'Nunito', Arial, sans-serif", label: "Nunito" },
  { value: "'Outfit', Arial, sans-serif", label: "Outfit" },
  { value: "'DM Sans', Arial, sans-serif", label: "DM Sans" },
  { value: "'Raleway', Arial, sans-serif", label: "Raleway" },
  { value: "'Work Sans', Arial, sans-serif", label: "Work Sans" },
  { value: "'Josefin Sans', Arial, sans-serif", label: "Josefin Sans" },
  // Modern
  { value: "'Jost', Arial, sans-serif", label: "Jost" },
  { value: "'Manrope', Arial, sans-serif", label: "Manrope" },
  { value: "'Sora', Arial, sans-serif", label: "Sora" },
  // Monospace
  { value: "'JetBrains Mono', 'Courier New', monospace", label: "JetBrains Mono" },
];

// Preload Google Fonts when needed
function loadGoogleFont(fontFamily: string) {
  const name = fontFamily.match(/'([^']+)'/)?.[1];
  if (!name || name === "inherit" || typeof document === "undefined") return;
  const id = `gf-${name.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;600;700;800&display=swap`;
  document.head.appendChild(link);
}

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
  plan: "free" | "pro";
  initial: DesignSettings;
}) {
  const [settings, setSettings] = useState<DesignSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [lockedMsg, setLockedMsg] = useState<string[]>([]);

  const isFree = plan === "free";
  const isPro = plan === "pro";
  const languageCap = plan === "free" ? 1 : 10;

  function update<K extends keyof DesignSettings>(key: K, value: DesignSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/shop/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, ...settings }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Save failed — please try again.");
        return;
      }
      if (data.lockedFields?.length) {
        setLockedMsg(data.lockedFields);
        setTimeout(() => setLockedMsg([]), 4000);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveError("Network error — please check your connection.");
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

        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <p className="mb-2 text-xs font-medium text-white/50">Live preview — updates as you change settings</p>
          <div
            className="overflow-auto rounded-lg"
            style={{
              maxHeight: "340px",
              fontFamily: settings.fontFamily,
              border: settings.showBorder ? `${settings.borderWidth}px ${settings.borderStyle} ${settings.borderColor}` : "none",
              borderRadius: `${settings.borderRadius}px`,
              padding: "14px",
              backgroundColor: "transparent",
            }}
          >
            {/* Summary block */}
            <div style={{
              display: "flex", alignItems: "center", gap: "14px",
              padding: "12px 14px", marginBottom: "10px",
              background: settings.summaryBgColor,
              color: settings.summaryTextColor,
              borderRadius: `${settings.borderRadius}px`,
              flexWrap: "wrap",
            }}>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "28px", fontWeight: 700, color: settings.summaryTextColor, lineHeight: 1 }}>4.8</div>
                <div style={{ color: settings.starColor, fontSize: "12px", margin: "3px 0 2px" }}>{"★".repeat(5)}</div>
                <div style={{ fontSize: "9px", color: settings.summaryTextColor, opacity: 0.6 }}>Based on 13 reviews</div>
              </div>
              <div style={{ flex: 1, minWidth: "100px" }}>
                {([["\u2605 5", 77], ["\u2605 4", 23], ["\u2605 3", 0], ["\u2605 2", 0], ["\u2605 1", 0]] as [string, number][]).map(([label, pct]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                    <span style={{ width: "38px", fontSize: "8px", color: settings.summaryTextColor, opacity: 0.65, flexShrink: 0 }}>{label}</span>
                    <div style={{ flex: 1, height: "5px", backgroundColor: "#e0e0e0", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", backgroundColor: settings.rangeColor, borderRadius: "3px" }} />
                    </div>
                  </div>
                ))}
              </div>
              <button style={{ background: settings.primaryGradient || settings.primaryColor, color: "#fff", border: "none", borderRadius: `${settings.borderRadius}px`, padding: "7px 12px", fontSize: "9px", fontWeight: 700, cursor: "default", flexShrink: 0 }}>
                ✏ Write a Review
              </button>
            </div>

            {/* Filter bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", paddingBottom: "8px", borderBottom: `1px solid ${settings.borderColor || "#eee"}` }}>
              <span style={{ fontSize: `${Math.max(settings.reviewCountFontSize - 2, 9)}px`, color: settings.filterTextColor, fontWeight: 500 }}>3 Reviews</span>
              <span style={{ fontSize: "9px", color: settings.sortTextColor, border: `1px solid ${settings.sortBorderColor}`, background: settings.sortBgColor, padding: "3px 7px", borderRadius: "5px" }}>Most Recent ▾</span>
            </div>

            {/* Review cards */}
            <div style={
              settings.displayStyle === "grid"
                ? { display: "grid", gridTemplateColumns: `repeat(${Math.min(settings.gridColumns, 2)}, 1fr)`, gap: "7px" }
                : { display: "flex", flexDirection: "column", gap: "7px" }
            }>
              {SAMPLE_REVIEWS.map((rev, i) => (
                <div key={i} style={{
                  background: settings.backgroundGradient || settings.backgroundColor,
                  borderRadius: `${settings.borderRadius}px`,
                  padding: "9px 11px",
                  border: "1px solid rgba(0,0,0,.06)",
                  fontFamily: settings.fontFamily,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "5px" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: ["#7c3aed","#0891b2"][i % 2], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: 700, flexShrink: 0 }}>
                      {rev.customerName.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: settings.textColor }}>{rev.customerName}</div>
                      <div style={{ fontSize: "8px", color: settings.reviewMetaColor }}>6 days ago</div>
                    </div>
                  </div>
                  <div style={{ color: settings.starColor, fontSize: "10px", marginBottom: "4px" }}>{"★".repeat(rev.rating)}{"☆".repeat(5-rev.rating)}</div>
                  {i === 0 && <p style={{ margin: "0 0 3px", fontSize: `${Math.max(settings.reviewTextSize - 3, 8)}px`, fontWeight: 700, fontStyle: "italic", color: settings.reviewTitleColor }}>Great product!</p>}
                  <p style={{ margin: 0, fontSize: `${Math.max(settings.reviewTextSize - 3, 8)}px`, color: settings.reviewBodyColor, lineHeight: 1.5 }}>{rev.body.slice(0, 60)}…</p>
                </div>
              ))}
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
            onChange={(e) => { update("fontFamily", e.target.value); loadGoogleFont(e.target.value); }}
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
              Heading size/weight/position customization needs Pro.
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
            Review text size/position customization needs Pro.
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
            min={900}
            max={1220}
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-white/70">Review suggestions</p>
          {aiSuggestionsAllowed(plan) ? (
            <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/20">
              ✨ AI-written
            </span>
          ) : (
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white/50 ring-1 ring-white/10">
              Ready-made
            </span>
          )}
        </div>

        {/* The feature is never simply hidden on Free — the merchant can see
            what they already have and exactly what upgrading changes. */}
        {!aiSuggestionsAllowed(plan) && (
          <div className="mb-4 rounded-lg border border-amber-400/25 bg-amber-400/[0.07] p-3.5">
            <p className="text-[13px] font-semibold text-amber-200">
              Your shoppers see ready-made suggestions
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-200/70">
              About five hand-written lines per star rating. Upgrade to Pro for
              AI-written suggestions: around 120 per rating, tailored to each
              product, and each line offered to only one shopper — so no two
              reviews on your store read the same.
            </p>
            <a
              href={`/dashboard/plans?shop=${encodeURIComponent(shop)}`}
              target="_top"
              className="mt-3 inline-block rounded-md bg-emerald-400 px-3.5 py-1.5 text-xs font-bold text-black transition-colors hover:bg-emerald-300"
            >
              Upgrade to Pro
            </a>
          </div>
        )}
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
            Also needs Pro — Free plan is English-only.
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
            { key: "modern", label: "Modern Card", plan: "", desc: "Rating box, bars, button" },
            { key: "minimal", label: "Minimal", plan: "", desc: "Just the score — no bars" },
            { key: "compact", label: "Compact", plan: "Pro", desc: "Circle rating, clean bars" },
            { key: "sidebar", label: "Left Sidebar", plan: "Pro", desc: "Sticky left, reviews right" },
            { key: "stacked", label: "Stacked", plan: "Pro", desc: "Score above full-width bars" },
            { key: "horizontal", label: "Horizontal Bar", plan: "Pro only", desc: "All in one slim row" },
            { key: "iconpct", label: "Icon + Percentage", plan: "Pro only", desc: "People icons per star with %" },
            { key: "split", label: "Split Panel", plan: "Pro only", desc: "Colour-filled score beside bars" },
          ] as const).map((item) => {
            // Read from the shared source rather than restated here. This
            // used to be a hand-kept copy of the same list, which is exactly
            // how choosing a locked layout once saved silently as another.
            const locked = !summaryLayoutsFor(plan).includes(item.key);
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
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", background: settings.summaryBgColor || "#fff", border: "1px solid rgba(0,0,0,.08)", borderRadius: "5px", padding: "6px 8px" }}>
                      <div style={{ background: settings.rangeColor, borderRadius: "5px", padding: "6px 8px", flexShrink: 0, textAlign: "center" }}>
                        <div style={{ fontFamily: "Georgia,serif", fontSize: "14px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>4.8</div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        <div style={{ color: settings.starColor, fontSize: "7px" }}>★★★★★</div>
                        <div style={{ fontSize: "4px", color: "#aaa" }}>160 reviews</div>
                      </div>
                      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                        {([[5,90],[4,8],[3,0],[2,0],[1,0]] as [number,number][]).map(([s,pct], i) => (
                          <div key={s} style={{ textAlign: "center", padding: "0 4px", borderLeft: i > 0 ? "1px solid rgba(0,0,0,.1)" : "none" }}>
                            <div style={{ fontSize: "5px", fontWeight: 700, color: settings.summaryTextColor || "#333", whiteSpace: "nowrap" }}>{s} Star{s===1?"":"s"}</div>
                            <div style={{ width: "16px", height: "3px", background: "rgba(150,150,150,.25)", borderRadius: "2px", margin: "2px auto", overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: settings.rangeColor, borderRadius: "2px" }} />
                            </div>
                            <div style={{ fontSize: "5px", color: settings.summaryTextColor || "#333", opacity: 0.6 }}>{pct === 90 ? "155" : pct === 8 ? "5" : "0"}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: settings.primaryColor, color: "#fff", borderRadius: "3px", padding: "3px 5px", fontSize: "5px", fontWeight: 700, flexShrink: 0 }}>✏ Write</div>
                    </div>
                  )}
                  {item.key === "iconpct" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px" }}>
                      <div style={{ textAlign: "center", flexShrink: 0 }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#111", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                          <span style={{ fontFamily: "Georgia,serif", fontSize: "11px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>4.8</span>
                          <span style={{ fontSize: "4px", color: "#aaa" }}>/ 5</span>
                        </div>
                        <div style={{ color: settings.starColor, fontSize: "5px", marginTop: "2px" }}>★★★★★</div>
                        <div style={{ fontSize: "4px", color: "#aaa" }}>160 reviews</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        {([[5,90],[4,8],[3,0],[2,0],[1,0]] as [number,number][]).map(([s,pct]) => {
                          const filled = Math.round(pct / 10);
                          return (
                            <div key={s} style={{ display: "flex", alignItems: "center", gap: "2px", marginBottom: "2px" }}>
                              <span style={{ fontSize: "5px", color: "#aaa", width: "10px", textAlign: "right" }}>{s}★</span>
                              <div style={{ display: "flex", gap: "1px" }}>
                                {Array.from({length: 10}).map((_, i) => (
                                  <span key={i} style={{ color: i < filled ? settings.rangeColor : "#ddd", fontSize: "6px", lineHeight: 1 }}>●</span>
                                ))}
                              </div>
                              <span style={{ fontSize: "5px", color: "#aaa", marginLeft: "2px" }}>{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {item.key === "minimal" && (
                    <div style={{ textAlign: "center", padding: "6px 4px" }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "3px" }}>
                        <span style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px", color: "#111", lineHeight: 1 }}>4.8</span>
                        <span style={{ fontSize: "8px", color: "#bbb" }}>/ 5</span>
                      </div>
                      <div style={{ color: settings.starColor, fontSize: "8px", marginTop: "3px" }}>★★★★★</div>
                      <div style={{ fontSize: "6px", color: "#aaa", marginTop: "2px" }}>160 reviews</div>
                      <div style={{ background: "#111", color: "#fff", fontSize: "5px", borderRadius: "3px", padding: "3px 8px", display: "inline-block", marginTop: "5px" }}>Write</div>
                    </div>
                  )}

                  {item.key === "stacked" && (
                    <div style={{ padding: "3px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "15px", fontWeight: 800, color: "#111", lineHeight: 1 }}>4.8</span>
                          <div>
                            <div style={{ color: settings.starColor, fontSize: "6px" }}>★★★★★</div>
                            <div style={{ fontSize: "4px", color: "#aaa" }}>160 reviews</div>
                          </div>
                        </div>
                        <div style={{ background: "#111", color: "#fff", fontSize: "5px", borderRadius: "3px", padding: "3px 6px" }}>Write</div>
                      </div>
                      {[92, 6, 2].map((pct, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "3px", marginBottom: "2px" }}>
                          <span style={{ fontSize: "4px", color: "#aaa", width: "8px" }}>{5 - i}★</span>
                          <div style={{ flex: 1, height: "3px", background: "#eee", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ width: pct + "%", height: "100%", background: settings.rangeColor }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.key === "split" && (
                    <div style={{ display: "flex", borderRadius: "4px", overflow: "hidden", border: "1px solid #eee" }}>
                      <div style={{ flex: "0 0 44%", background: settings.primaryColor, color: "#fff", padding: "8px 4px", textAlign: "center" }}>
                        <div style={{ fontSize: "16px", fontWeight: 800, lineHeight: 1 }}>4.8</div>
                        <div style={{ fontSize: "6px", marginTop: "3px" }}>★★★★★</div>
                        <div style={{ fontSize: "4px", opacity: 0.8, marginTop: "2px" }}>160 reviews</div>
                      </div>
                      <div style={{ flex: 1, padding: "7px 5px", background: "#fafafa" }}>
                        {[92, 6, 2].map((pct, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: "3px", marginBottom: "2px" }}>
                            <span style={{ fontSize: "4px", color: "#aaa", width: "8px" }}>{5 - i}★</span>
                            <div style={{ flex: 1, height: "3px", background: "#e6e6e6", borderRadius: "2px", overflow: "hidden" }}>
                              <div style={{ width: pct + "%", height: "100%", background: settings.rangeColor }} />
                            </div>
                          </div>
                        ))}
                        <div style={{ background: "#111", color: "#fff", fontSize: "5px", borderRadius: "3px", padding: "3px 6px", display: "inline-block", marginTop: "3px" }}>Write</div>
                      </div>
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
          Free: Modern Card & Minimal · Pro: all 8 summary styles
        </p>

        {/* Summary block customization — locked for Free */}
        {isFree ? (
          <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-xs text-white/40">🔒 Summary colors, width and position are available on Pro.</p>
          </div>
        ) : (
          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="mb-3 grid grid-cols-3 gap-4">
              <ColorField label="Summary background" value={settings.summaryBgColor} onChange={(v) => update("summaryBgColor", v)} />
              <ColorField label="Summary text color" value={settings.summaryTextColor} onChange={(v) => update("summaryTextColor", v)} />
              <div>
                <label className="mb-1 block text-xs text-white/50">Position</label>
                <div className="flex gap-1">
                  {(["left","center","right"] as const).map((pos) => (
                    <button key={pos} onClick={() => update("summaryPosition", pos)}
                      className={`flex-1 rounded py-1.5 text-xs capitalize transition-colors ${settings.summaryPosition === pos ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/40" : "border border-white/10 text-white/40 hover:border-white/30"}`}>
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">
                Summary width: {settings.summaryWidth >= 320 ? `${settings.summaryWidth}px` : "Full width"}
              </label>
              <input type="range" min={300} max={1220} step={20} value={Math.max(settings.summaryWidth, 300)}
                onChange={(e) => update("summaryWidth", Number(e.target.value))} className="w-full" />
              <p className="mt-1 text-[10px] text-white/30">300 = full width · higher values shrink the summary block. For Left Sidebar this sets the sidebar column width.</p>
            </div>
          </div>
        )}
      </div>

      {/* Review list bar */}
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <p className="mb-2 text-sm font-medium text-white/70">Review list bar</p>
        {isFree ? (
          <p className="text-xs text-white/40">🔒 Filter bar and sort button colors are available on Pro.</p>
        ) : (
          <>
            <p className="mb-4 text-xs text-white/40">Controls the "3 Reviews" count label and "Most Recent" sort dropdown above the review cards.</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <ColorField label='Count text color ("3 Reviews")' value={settings.filterTextColor} onChange={(v) => update("filterTextColor", v)} />
              <div>
                <label className="mb-1 block text-xs text-white/50">Count font size: {settings.reviewCountFontSize}px</label>
                <input type="range" min={10} max={20} value={settings.reviewCountFontSize}
                  onChange={(e) => update("reviewCountFontSize", Number(e.target.value))} className="w-full" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <ColorField label="Sort button background" value={settings.sortBgColor} onChange={(v) => update("sortBgColor", v)} />
              <ColorField label="Sort button text" value={settings.sortTextColor} onChange={(v) => update("sortTextColor", v)} />
              <ColorField label="Sort button border" value={settings.sortBorderColor} onChange={(v) => update("sortBorderColor", v)} />
            </div>
          </>
        )}
      </div>

      {/* Review card text colors */}
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <p className="mb-2 text-sm font-medium text-white/70">Review card text colors</p>
        {isFree ? (
          <p className="text-xs text-white/40">🔒 Review card text colors are available on Pro.</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <ColorField label="Review title color" value={settings.reviewTitleColor} onChange={(v) => update("reviewTitleColor", v)} />
            <ColorField label="Review body color" value={settings.reviewBodyColor} onChange={(v) => update("reviewBodyColor", v)} />
            <ColorField label="Date / meta color" value={settings.reviewMetaColor} onChange={(v) => update("reviewMetaColor", v)} />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <p className="mb-4 text-sm font-medium text-white/70">Review form style</p>

        {/* Form color controls */}
        {isFree ? (
          <div className="mb-4 rounded-md border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-xs text-white/40">🔒 Form background, text, and close button colors are available on Pro.</p>
          </div>
        ) : (
          <div className="mb-4 grid grid-cols-3 gap-4">
            <ColorField label="Form background" value={settings.formBgColor} onChange={(v) => update("formBgColor", v)} />
            <ColorField label="Form text color" value={settings.formTextColor} onChange={(v) => update("formTextColor", v)} />
            <ColorField label="Close button color" value={settings.formCloseColor} onChange={(v) => update("formCloseColor", v)} />
          </div>
        )}

        {/* 4 template cards side by side — each shows a mini preview of the real form */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {(["basic", "card", "minimal", "dark"] as const).map((t, i) => {
            const labels = { basic: "Basic", card: "Card", minimal: "Minimal", dark: "Dark" };
            const planLabels = { basic: "", card: "Pro", minimal: "Pro", dark: "Pro" };
            const locked = !formTemplatesFor(plan).includes(t);
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
          Free: Basic only · Pro: all 4 form templates
        </p>
      </div>


      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-300 disabled:opacity-60"
      >
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
      </button>
      {saveError && (
        <p className="mt-2 text-xs text-red-400">{saveError}</p>
      )}
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
