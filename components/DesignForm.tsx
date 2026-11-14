"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DESIGN_THEMES, matchTheme } from "@/lib/design-themes";
import {
  aiSuggestionsAllowed,
  formTemplatesFor,
  summaryLayoutsFor,
  displayStylesFor,
  cardDesignsFor,
  DISPLAY_STYLES,
  CARD_DESIGNS,
  type DisplayStyle,
  type CardDesign,
} from "@/lib/design-options";
import { SUPPORTED_LANGUAGES } from "@/lib/review-suggestions";

export type DesignSettings = {
  displayStyle: DisplayStyle;
  cardDesign: CardDesign;
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
  bottomSpacing: number;
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

const TAB_TITLES = [
  "Layout",
  "Colors & font",
  "Text & spacing",
  "Review suggestions",
  "Review list",
  "Review form",
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
  const [tab, setTab] = useState(0);
  // Simple by default. Sixty controls is the right answer for a merchant who
  // wants one exact shade changed and the wrong first thing to show everyone
  // else, so the page opens on five choices and keeps the rest one click away.
  const [advanced, setAdvanced] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [lockedMsg, setLockedMsg] = useState<string[]>([]);

  const isFree = plan === "free";
  const isPro = plan === "pro";
  const languageCap = plan === "free" ? 1 : 10;

  // A merchant who went to Advanced once is not a beginner next time.
  useEffect(() => {
    try {
      if (window.localStorage.getItem("rivu.design.advanced") === "1") {
        setAdvanced(true);
      }
    } catch {
      // Blocked storage — stay on the simple view, which is the safe default.
    }
  }, []);

  function update<K extends keyof DesignSettings>(key: K, value: DesignSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  /**
   * Applies a theme's twenty-odd values in one state update.
   *
   * Spread rather than a loop of update() calls: twenty separate setState
   * calls off one click is twenty renders of a preview that reads every one
   * of those values, and only the last would be correct in the preview while
   * the rest flickered. Nothing outside the theme's own keys is touched, so a
   * merchant's heading text, widths and spacing survive a theme change.
   */
  function applyTheme(key: string) {
    const theme = DESIGN_THEMES.find((t) => t.key === key);
    if (!theme) return;
    setSettings((s) => ({ ...s, ...theme.values }));
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
      {/* This page used to be one flat column of fifteen identical bordered
          boxes with no labels, so a merchant had to scroll past all of them to
          find one control. The cards are now split across the six tabs below,
          and the preview is hoisted out of the tabs so it stays on screen while
          you change colours, text or spacing. Tabs only hide cards with CSS —
          every input stays mounted, so switching tabs never loses an unsaved
          change, and Save still saves the whole form at once. */}
      {/* Not pinned. Sticking it to the top meant it slid over the cards as
          you scrolled and carried its own scrollbar — two scrollbars on one
          page reads as broken. It now sits at the top and scrolls away like
          any other block. */}
      <LivePreview settings={settings} />

      {!advanced && (
        <SimplePanel
          settings={settings}
          plan={plan}
          update={update}
          applyTheme={applyTheme}
        />
      )}

      <button
        type="button"
        onClick={() => {
          setAdvanced((a) => {
            try {
              window.localStorage.setItem("rivu.design.advanced", a ? "0" : "1");
            } catch {
              // Private browsing and blocked storage: the toggle still works
              // for this visit, it just will not be remembered.
            }
            return !a;
          });
        }}
        className="block text-[12px] font-medium text-black/45 underline underline-offset-4 hover:text-black/65"
      >
        {advanced
          ? "← Back to the simple view"
          : "Advanced — every colour, size and spacing setting"}
      </button>

      <div className={advanced ? "flex flex-wrap gap-1 border-b border-black/[0.10]" : "hidden"}>
        {TAB_TITLES.map((title, i) => (
          <button
            key={title}
            type="button"
            onClick={() => setTab(i)}
            className={`-mb-px rounded-t-md border-b-2 px-3 py-2 text-[12px] font-medium transition-colors ${
              tab === i
                ? "border-[#111418] text-[#111418]"
                : "border-transparent text-black/48 hover:text-black/65"
            }`}
          >
            {title}
          </button>
        ))}
      </div>
      <div className={advanced ? "space-y-10" : "hidden"}>
      <Group
        hidden={tab !== 0}
        title="Layout"
        description="The overall shape of the widget. The preview updates as you change anything on this page."
      >
        <div className="rounded-lg border border-black/[0.10] bg-black/[0.02] p-5">
          <label className="mb-2 block text-sm font-medium text-black/65">Layout</label>
          {/* Read from lib/design-options.ts rather than restated here. The
              previous hardcoded list of four had its own copy of the locking
              rules, so a new layout appeared in the widget but never in this
              picker — and the lock could disagree with what the server
              enforces on save. */}
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DISPLAY_STYLES.map((option) => {
              const allowed = displayStylesFor(plan).includes(option.key);
              const selected = settings.displayStyle === option.key;
              return (
                <button
                  key={option.key}
                  onClick={() => allowed && update("displayStyle", option.key)}
                  disabled={!allowed}
                  title={allowed ? option.description : "Available on Pro"}
                  className={`rounded-md border px-2 py-2 text-left transition-colors ${
                    !allowed
                      ? "cursor-not-allowed border-black/[0.06] text-black/35"
                      : selected
                        ? "border-[#111418] bg-black/[0.04] text-[#111418]"
                        : "border-black/[0.10] text-black/50 hover:border-black/[0.25]"
                  }`}
                >
                  <span className="flex items-center gap-1 text-xs font-semibold">
                    {!allowed && "🔒"}
                    {option.label}
                    {option.minPlan !== "free" && (
                      <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-amber-700/80">
                        Pro
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-tight text-black/42">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Design is a separate question from layout: "grid" says where the
              cards go, "boxed" says what a card looks like. Combining them
              into one list forced a merchant to give up one to get the other. */}
          <label className="mb-2 mt-4 block text-sm font-medium text-black/65">
            Card design
          </label>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CARD_DESIGNS.map((option) => {
              const allowed = cardDesignsFor(plan).includes(option.key);
              const selected = settings.cardDesign === option.key;
              return (
                <button
                  key={option.key}
                  onClick={() => allowed && update("cardDesign", option.key)}
                  disabled={!allowed}
                  title={allowed ? option.description : "Available on Pro"}
                  className={`rounded-md border px-2 py-2 text-left transition-colors ${
                    !allowed
                      ? "cursor-not-allowed border-black/[0.06] text-black/35"
                      : selected
                        ? "border-[#111418] bg-black/[0.04] text-[#111418]"
                        : "border-black/[0.10] text-black/50 hover:border-black/[0.25]"
                  }`}
                >
                  <span className="flex items-center gap-1 text-xs font-semibold">
                    {!allowed && "🔒"}
                    {option.label}
                    {option.minPlan !== "free" && (
                      <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-amber-700/80">
                        Pro
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-tight text-black/42">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>

          {(settings.displayStyle === "grid" ||
            settings.displayStyle === "masonry" ||
            settings.cardDesign === "gallery") && (
            <div className="mb-2">
              <label className="mb-1 block text-xs text-black/50">
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
              <label className="mb-1 block text-xs text-black/50">
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

      </Group>

      <Group
        hidden={tab !== 1}
        title="Colors & font"
        description="Your brand colors and typeface. These apply to the whole widget."
      >
      {/* Colors — 4 in a row */}
      <div className="rounded-lg border border-black/[0.10] bg-black/[0.02] p-5">
        <p className="mb-3 text-sm font-medium text-black/65">Colors</p>
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
        <div className="rounded-lg border border-black/[0.10] bg-black/[0.02] p-5">
          <label className="mb-2 block text-sm font-medium text-black/65">Font</label>
          <select
            value={settings.fontFamily}
            onChange={(e) => { update("fontFamily", e.target.value); loadGoogleFont(e.target.value); }}
            className="mb-4 w-full rounded-md border border-black/[0.14] bg-black/[0.03] px-3 py-2 text-sm text-[#111418]"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value} style={{ color: "#000" }}>
                {f.label}
              </option>
            ))}
          </select>
          <label className="mb-1 block text-xs text-black/50">
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
      </Group>

      <Group
        hidden={tab !== 2}
        title="Text & spacing"
        description="The heading above the reviews, how big the review text is, and how much room the widget takes on the page."
      >
        <div className="rounded-lg border border-black/[0.10] bg-black/[0.02] p-5">
          <label className="mb-2 block text-sm font-medium text-black/65">Widget heading</label>
          <input
            type="text"
            value={settings.widgetTitle}
            onChange={(e) => update("widgetTitle", e.target.value)}
            className="mb-3 w-full rounded-md border border-black/[0.14] bg-black/[0.03] px-3 py-2 text-sm text-[#111418]"
            maxLength={100}
          />
          <div className={`mb-3 grid grid-cols-3 gap-3 ${isFree ? "pointer-events-none opacity-40" : ""}`}>
            <div>
              <label className="mb-1 block text-xs text-black/50">
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
              <label className="mb-1 block text-xs text-black/50">Weight</label>
              <button
                onClick={() => update("headingBold", !settings.headingBold)}
                className={`w-full rounded-md border px-2 py-1.5 text-xs transition-colors ${
                  settings.headingBold
                    ? "border-[#111418] bg-black/[0.04] text-[#111418] font-bold"
                    : "border-black/[0.10] text-black/50 hover:border-black/[0.25]"
                }`}
              >
                {settings.headingBold ? "Bold" : "Regular"}
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs text-black/50">Position</label>
              <select
                value={settings.headingAlign}
                onChange={(e) => update("headingAlign", e.target.value as "left" | "center" | "right")}
                className="w-full rounded-md border border-black/[0.14] bg-black/[0.03] px-2 py-1.5 text-xs text-[#111418]"
              >
                <option value="left" style={{ color: "#000" }}>Left</option>
                <option value="center" style={{ color: "#000" }}>Center</option>
                <option value="right" style={{ color: "#000" }}>Right</option>
              </select>
            </div>
          </div>
          {isFree && (
            <p className="mb-3 text-xs text-amber-700/70">
              Heading size/weight/position customization needs Pro.
            </p>
          )}
          <label className="mb-1 block text-xs text-black/50">
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
          <label className="mb-1 block text-xs text-black/50">
            Bottom spacing: {settings.bottomSpacing}px
          </label>
          <input
            type="range"
            min={-80}
            max={120}
            step={4}
            value={settings.bottomSpacing}
            onChange={(e) => update("bottomSpacing", Number(e.target.value))}
            className="w-full"
          />
          <p className="mb-1 text-xs text-black/45">
            Too much empty space under the reviews is usually your theme
            section&apos;s own padding, which the app cannot see. Drag this
            below 0 to pull whatever follows the reviews up into that padding
            and close the gap.
          </p>
          <label className="mt-3 flex items-center gap-2 border-t border-black/[0.10] pt-3">
            <input
              type="checkbox"
              checked={settings.showBorder}
              onChange={(e) => update("showBorder", e.target.checked)}
              className="h-4 w-4 accent-[#111418]"
            />
            <span className="text-sm text-black/72">Show border around widget</span>
          </label>
          {settings.showBorder && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              <ColorField
                label="Border color"
                value={settings.borderColor}
                onChange={(v) => update("borderColor", v)}
              />
              <div>
                <label className="mb-1 block text-xs text-black/50">
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
                <label className="mb-1 block text-xs text-black/50">Style</label>
                <select
                  value={settings.borderStyle}
                  onChange={(e) =>
                    update("borderStyle", e.target.value as "solid" | "dashed" | "dotted" | "double")
                  }
                  className="w-full rounded-md border border-black/[0.14] bg-black/[0.03] px-2 py-1.5 text-xs text-[#111418]"
                >
                  <option value="solid" style={{ color: "#000" }}>Solid</option>
                  <option value="dashed" style={{ color: "#000" }}>Dashed</option>
                  <option value="dotted" style={{ color: "#000" }}>Dotted</option>
                  <option value="double" style={{ color: "#000" }}>Double</option>
                </select>
              </div>
            </div>
          )}
          <p className="mt-2 text-xs text-black/45">
            Helps the widget stand out against a plain background — recommended if your
            theme's page background is also white.
          </p>
        </div>

      {/* Review text appearance */}
      <div className="rounded-lg border border-black/[0.10] bg-black/[0.02] p-5">
        <div className={`grid grid-cols-2 gap-6 ${isFree ? "pointer-events-none opacity-40" : ""}`}>
          <div>
            <label className="mb-1 block text-xs text-black/50">
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
            <label className="mb-1 block text-xs text-black/50">Review text position</label>
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => update("reviewTextAlign", align)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs capitalize transition-colors ${
                    settings.reviewTextAlign === align
                      ? "border-[#111418] bg-black/[0.04] text-[#111418]"
                      : "border-black/[0.10] text-black/50 hover:border-black/[0.25]"
                  }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        </div>
        {isFree && (
          <p className="mt-3 text-xs text-amber-700/70">
            Review text size/position customization needs Pro.
          </p>
        )}
      </div>

      {/* Sizing */}
      <div className="grid grid-cols-3 gap-6 rounded-lg border border-black/[0.10] bg-black/[0.02] p-5">
        <div>
          <label className="mb-1 block text-xs text-black/50">
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
          <label className="mb-1 block text-xs text-black/50">
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
          <label className="mb-1 block text-xs text-black/50">Form alignment</label>
          <div className="flex gap-1">
            {(["left", "center", "right"] as const).map((align) => (
              <button
                key={align}
                onClick={() => update("formAlign", align)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs capitalize transition-colors ${
                  settings.formAlign === align
                    ? "border-[#111418] bg-black/[0.04] text-[#111418]"
                    : "border-black/[0.10] text-black/50 hover:border-black/[0.25]"
                }`}
              >
                {align}
              </button>
            ))}
          </div>
        </div>
      </div>

      </Group>

      <Group
        hidden={tab !== 3}
        title="Review suggestions"
        description="Optional prompts shown to a customer who is stuck on what to write."
      >
      {/* Suggestions */}
      <div className="rounded-lg border border-black/[0.10] bg-black/[0.02] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-black/65">Review suggestions</p>
          {aiSuggestionsAllowed(plan) ? (
            <span className="rounded-full bg-[#111418] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white ring-1 ring-[#111418]">
              ✨ AI-written
            </span>
          ) : (
            <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-black/50 ring-1 ring-black/[0.10]">
              Ready-made
            </span>
          )}
        </div>

        {/* The feature is never simply hidden on Free — the merchant can see
            what they already have and exactly what upgrading changes. */}
        {!aiSuggestionsAllowed(plan) && (
          <div className="mb-4 rounded-lg border border-amber-600/25 bg-amber-400/[0.07] p-3.5">
            <p className="text-[13px] font-semibold text-amber-800">
              Your shoppers see ready-made suggestions
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800/70">
              About five hand-written lines per star rating. Upgrade to Pro for
              AI-written suggestions: around 120 per rating, tailored to each
              product, and each line offered to only one shopper — so no two
              reviews on your store read the same.
            </p>
            <a
              href={`/dashboard/plans?shop=${encodeURIComponent(shop)}`}
              target="_top"
              className="mt-3 inline-block rounded-md bg-[#111418] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#2a2f35]"
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
              className="h-4 w-4 accent-[#111418]"
            />
            <span className="text-sm text-black/72">On website widget</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.showSuggestionsOnQr}
              onChange={(e) => update("showSuggestionsOnQr", e.target.checked)}
              className="h-4 w-4 accent-[#111418]"
            />
            <span className="text-sm text-black/72">On QR-scan page</span>
          </label>
        </div>
        <label className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.letCustomerPickLanguage}
            disabled={isFree}
            onChange={(e) => update("letCustomerPickLanguage", e.target.checked)}
            className="h-4 w-4 accent-[#111418] disabled:opacity-40"
          />
          <span className={`text-sm ${isFree ? "text-black/38" : "text-black/72"}`}>
            {isFree ? "🔒 " : ""}Let customers choose their own language (shows a dropdown on the
            review form)
          </span>
        </label>
        {isFree && (
          <p className="mb-3 -mt-2 text-xs text-amber-700/70">
            Also needs Pro — Free plan is English-only.
          </p>
        )}
        <label className="mb-2 block text-xs text-black/50">
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
                    ? "border-[#111418] bg-black/[0.04] text-[#111418]"
                    : disabled
                    ? "cursor-not-allowed border-black/[0.06] text-black/35"
                    : "border-black/[0.10] text-black/50 hover:border-black/[0.25]"
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
                  className="h-3 w-3 accent-[#111418]"
                />
                {lang.label}
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-black/45">
          {plan === "free"
            ? "Free plan is English-only."
            : `Pick up to ${languageCap} languages your customers can write reviews in.`}
        </p>
      </div>

      </Group>

      <Group
        hidden={tab !== 4}
        title="Review list"
        description="The rating summary at the top, the filter bar, and the review cards themselves."
      >
      <div className="rounded-lg border border-black/[0.10] bg-black/[0.02] p-5">
        <p className="mb-4 text-sm font-medium text-black/65">Widget summary style</p>
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
                  locked ? "cursor-not-allowed border-black/[0.06] opacity-40"
                  : isSelected ? "border-[#111418] shadow-[0_0_0_2px_rgba(17,20,24,0.25)]"
                  : "border-black/[0.10] hover:border-black/[0.25]"
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
                <div className="flex items-center justify-between px-3 py-2 bg-black/[0.035]">
                  <span className="text-xs font-medium text-[#111418]">
                    {locked ? "🔒 " : isSelected ? "✓ " : ""}{item.label}
                  </span>
                  {item.plan && (
                    <span className="rounded-full bg-black/[0.07] px-1.5 py-0.5 text-[9px] text-black/50">{item.plan}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-black/45">
          Free: Modern Card & Minimal · Pro: all 8 summary styles
        </p>

        {/* Summary block customization — locked for Free */}
        {isFree ? (
          <div className="mt-4 rounded-md border border-black/[0.10] bg-black/[0.03] px-4 py-3">
            <p className="text-xs text-black/45">🔒 Summary colors, width and position are available on Pro.</p>
          </div>
        ) : (
          <div className="mt-4 border-t border-black/[0.10] pt-4">
            <div className="mb-3 grid grid-cols-3 gap-4">
              <ColorField label="Summary background" value={settings.summaryBgColor} onChange={(v) => update("summaryBgColor", v)} />
              <ColorField label="Summary text color" value={settings.summaryTextColor} onChange={(v) => update("summaryTextColor", v)} />
              <div>
                <label className="mb-1 block text-xs text-black/50">Position</label>
                <div className="flex gap-1">
                  {(["left","center","right"] as const).map((pos) => (
                    <button key={pos} onClick={() => update("summaryPosition", pos)}
                      className={`flex-1 rounded py-1.5 text-xs capitalize transition-colors ${settings.summaryPosition === pos ? "bg-[#111418] text-white border border-[#111418]/40" : "border border-black/[0.10] text-black/45 hover:border-black/[0.25]"}`}>
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-black/50">
                Summary width: {settings.summaryWidth >= 320 ? `${settings.summaryWidth}px` : "Full width"}
              </label>
              <input type="range" min={300} max={1220} step={20} value={Math.max(settings.summaryWidth, 300)}
                onChange={(e) => update("summaryWidth", Number(e.target.value))} className="w-full" />
              <p className="mt-1 text-[10px] text-black/38">300 = full width · higher values shrink the summary block. For Left Sidebar this sets the sidebar column width.</p>
            </div>
          </div>
        )}
      </div>

      {/* Review list bar */}
      <div className="rounded-lg border border-black/[0.10] bg-black/[0.02] p-5">
        <p className="mb-2 text-sm font-medium text-black/65">Review list bar</p>
        {isFree ? (
          <p className="text-xs text-black/45">🔒 Filter bar and sort button colors are available on Pro.</p>
        ) : (
          <>
            <p className="mb-4 text-xs text-black/45">Controls the "3 Reviews" count label and "Most Recent" sort dropdown above the review cards.</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <ColorField label='Count text color ("3 Reviews")' value={settings.filterTextColor} onChange={(v) => update("filterTextColor", v)} />
              <div>
                <label className="mb-1 block text-xs text-black/50">Count font size: {settings.reviewCountFontSize}px</label>
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
      <div className="rounded-lg border border-black/[0.10] bg-black/[0.02] p-5">
        <p className="mb-2 text-sm font-medium text-black/65">Review card text colors</p>
        {isFree ? (
          <p className="text-xs text-black/45">🔒 Review card text colors are available on Pro.</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <ColorField label="Review title color" value={settings.reviewTitleColor} onChange={(v) => update("reviewTitleColor", v)} />
            <ColorField label="Review body color" value={settings.reviewBodyColor} onChange={(v) => update("reviewBodyColor", v)} />
            <ColorField label="Date / meta color" value={settings.reviewMetaColor} onChange={(v) => update("reviewMetaColor", v)} />
          </div>
        )}
      </div>

      </Group>

      <Group
        hidden={tab !== 5}
        title="Review form"
        description="The box a customer actually types their review into."
      >
      <div className="rounded-lg border border-black/[0.10] bg-black/[0.02] p-5">
        <p className="mb-4 text-sm font-medium text-black/65">Review form style</p>

        {/* Form color controls */}
        {isFree ? (
          <div className="mb-4 rounded-md border border-black/[0.10] bg-black/[0.03] px-4 py-3">
            <p className="text-xs text-black/45">🔒 Form background, text, and close button colors are available on Pro.</p>
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
                    ? "cursor-not-allowed border-black/[0.06] opacity-40"
                    : isSelected
                    ? "border-[#111418] shadow-[0_0_0_2px_rgba(17,20,24,0.25)]"
                    : "border-black/[0.10] hover:border-black/[0.25]"
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
                <div className={`flex items-center justify-between px-3 py-2 ${t === "dark" ? "bg-[#1a1a2e]/80" : "bg-black/[0.035]"}`}>
                  <span className="text-xs font-medium text-[#111418]">
                    {locked ? "🔒 " : isSelected ? "✓ " : ""}{labels[t]}
                  </span>
                  {planLabels[t] && (
                    <span className="rounded-full bg-black/[0.07] px-1.5 py-0.5 text-[9px] text-black/50">
                      {planLabels[t]}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-black/45">
          Free: Basic only · Pro: all 4 form templates
        </p>
      </div>
      </Group>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-[#111418] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a2f35] disabled:opacity-60"
      >
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
      </button>
      {saveError && (
        <p className="mt-2 text-xs text-red-600">{saveError}</p>
      )}
      {lockedMsg.length > 0 && (
        <p className="mt-2 text-xs text-amber-700/80">
          Some choices need a higher plan and were kept at their default: {lockedMsg.join(", ")}.{" "}
          <a href={`/dashboard/plans?shop=${shop}`} className="underline">
            View plans
          </a>
        </p>
      )}
    </div>
  );
}

/**
 * A labelled run of setting cards.
 *
 * Deliberately not components/ui.tsx's <Section>: this form is already
 * rendered *inside* a Section on the Widget settings page, so reusing it would
 * put a bordered card inside a bordered card inside a bordered card. This is a
 * heading and a rule, with no box of its own — the cards underneath keep their
 * own borders and do the visual separating.
 */
function Group({
  title,
  description,
  hidden,
  children,
}: {
  title: string;
  description?: string;
  hidden?: boolean;
  children: ReactNode;
}) {
  return (
    // Hidden with CSS rather than unmounted: the inputs underneath keep their
    // DOM state, and a half-typed heading survives a trip to another tab.
    <section className={hidden ? "hidden" : "space-y-6"} aria-hidden={hidden}>
      <div className="border-b border-black/[0.08] pb-2.5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-black/48">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-[12px] leading-relaxed text-black/42">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
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
        <label className="block text-xs text-black/50">{label}</label>
        <div className="flex gap-1">
          <button
            onClick={() => onGradientChange(null)}
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              !isGradient ? "bg-[#111418] text-white" : "text-black/45"
            }`}
          >
            Solid
          </button>
          <button
            onClick={() => onGradientChange(buildGradient(colorA, colorB))}
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              isGradient ? "bg-[#111418] text-white" : "text-black/45"
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
            className="h-8 w-8 cursor-pointer rounded border border-black/[0.14] bg-transparent"
          />
          <input
            type="color"
            value={colorB}
            onChange={(e) => onGradientChange(buildGradient(colorA, e.target.value))}
            className="h-8 w-8 cursor-pointer rounded border border-black/[0.14] bg-transparent"
          />
          <div
            className="h-8 flex-1 rounded border border-black/[0.14]"
            style={{ background: gradientValue || undefined }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={solidValue}
            onChange={(e) => onSolidChange(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded border border-black/[0.14] bg-transparent"
          />
          <input
            type="text"
            value={solidValue}
            onChange={(e) => onSolidChange(e.target.value)}
            className="w-full min-w-0 rounded-md border border-black/[0.14] bg-black/[0.03] px-2 py-1 text-xs text-[#111418]"
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
      <label className="mb-1 block text-xs text-black/50">
        {locked ? "🔒 " : ""}
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          disabled={locked}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border border-black/[0.14] bg-transparent disabled:cursor-not-allowed disabled:opacity-40"
        />
        <input
          type="text"
          value={value}
          disabled={locked}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 rounded-md border border-black/[0.14] bg-black/[0.03] px-2 py-1 text-xs text-[#111418] disabled:opacity-40"
        />
      </div>
    </div>
  );
}

/**
 * The five choices that decide what the widget actually looks like.
 *
 * Everything here also exists in the Advanced tabs; this is not a second set
 * of settings but a shorter route to the same values, so nothing can drift
 * between the two views. A merchant who never opens Advanced still gets a
 * widget that matches their store.
 */
function SimplePanel({
  settings,
  plan,
  update,
  applyTheme,
}: {
  settings: DesignSettings;
  plan: "free" | "pro";
  update: <K extends keyof DesignSettings>(key: K, value: DesignSettings[K]) => void;
  applyTheme: (key: string) => void;
}) {
  const active = matchTheme(settings as unknown as Record<string, unknown>);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-black/[0.10] bg-black/[0.02] p-5">
        <label className="mb-1 block text-sm font-medium text-black/65">
          Pick a look
        </label>
        <p className="mb-3 text-xs text-black/42">
          Sets the colours, corners and card style together. You can change any
          of it afterwards.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {DESIGN_THEMES.map((theme) => (
            <button
              key={theme.key}
              type="button"
              onClick={() => applyTheme(theme.key)}
              title={theme.description}
              className={`rounded-md border p-3 text-left transition-colors ${
                active === theme.key
                  ? "border-[#111418] bg-black/[0.04]"
                  : "border-black/[0.10] bg-black/[0.02] hover:border-black/[0.22]"
              }`}
            >
              <div className="mb-2 flex gap-1">
                {theme.swatch.map((c) => (
                  <span
                    key={c}
                    className="h-4 w-4 rounded-full border border-black/[0.18]"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="text-xs font-semibold text-black/75">
                {theme.label}
              </div>
              <div className="mt-0.5 text-[10px] leading-snug text-black/42">
                {theme.description}
              </div>
            </button>
          ))}
        </div>
        {active === null && (
          <p className="mt-3 text-[11px] text-black/38">
            Your own colours — no theme selected. Picking one replaces them.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-black/[0.10] bg-black/[0.02] p-5">
        <label className="mb-2 block text-sm font-medium text-black/65">
          How the reviews are arranged
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DISPLAY_STYLES.map((option) => {
            const allowed = displayStylesFor(plan).includes(option.key);
            const selected = settings.displayStyle === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => allowed && update("displayStyle", option.key)}
                disabled={!allowed}
                title={allowed ? option.description : "Available on Pro"}
                className={`rounded-md border px-2 py-2 text-left transition-colors ${
                  selected
                    ? "border-[#111418] bg-black/[0.04]"
                    : "border-black/[0.10] bg-black/[0.02] hover:border-black/[0.22]"
                } ${allowed ? "" : "cursor-not-allowed opacity-40"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-black/75">
                    {option.label}
                  </span>
                  {!allowed && (
                    <span className="text-[9px] font-bold text-amber-700/80">
                      PRO
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[10px] text-black/42">
                  {option.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-lg border border-black/[0.10] bg-black/[0.02] p-5">
          <label className="mb-2 block text-sm font-medium text-black/65">
            Heading above the reviews
          </label>
          <input
            type="text"
            value={settings.widgetTitle}
            onChange={(e) => update("widgetTitle", e.target.value)}
            placeholder="Customer Reviews"
            className="w-full rounded-md border border-black/[0.14] bg-black/[0.03] px-3 py-2 text-sm text-[#111418]"
          />
        </div>

        <div className="rounded-lg border border-black/[0.10] bg-black/[0.02] p-5">
          <label className="mb-2 block text-sm font-medium text-black/65">
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
          <p className="mt-1 text-[11px] text-black/38">
            0 = sharp corners, 24 = fully rounded cards.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-black/[0.10] bg-black/[0.02] p-5">
        <label className="mb-1 block text-sm font-medium text-black/65">
          Your two colours
        </label>
        <p className="mb-3 text-xs text-black/42">
          The button colour and the star colour — the two a shopper notices.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <ColorField
            label="Button colour"
            value={settings.primaryColor}
            onChange={(v) => update("primaryColor", v)}
          />
          <ColorField
            label="Star colour"
            value={settings.starColor}
            onChange={(v) => update("starColor", v)}
          />
        </div>
      </div>
    </div>
  );
}

function LivePreview({ settings }: { settings: DesignSettings }) {
  return (
    <div className="rounded-lg border border-black/[0.10] bg-black/[0.02] p-4">
      <p className="mb-2 text-xs font-medium text-black/50">Live preview — updates as you change settings</p>
      <div
        className="overflow-hidden rounded-lg"
        style={{
          // Clipped, not scrollable. A scrollbar inside the preview invited
          // scrolling it instead of the page, and the mock below the fold adds
          // nothing — the colours, corners and type are all visible up here.
          maxHeight: "240px",
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
  );
}
