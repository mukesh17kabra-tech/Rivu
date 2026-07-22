"use client";

import { useState } from "react";

export function LogoUpload({
  shop,
  initialLogoUrl,
  initialLogoSize,
}: {
  shop: string;
  initialLogoUrl: string;
  initialLogoSize: number;
}) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [logoSize, setLogoSize] = useState(initialLogoSize);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        // Keep the logo at a reasonably high resolution — it gets scaled
        // down for the widget preview here, but the generated UGC graphic
        // is 1080px wide, so a too-small source image would look blurry
        // once placed as a bigger watermark.
        const canvas = document.createElement("canvas");
        const maxDim = 500;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setLogoUrl(canvas.toDataURL("image/png"));
        setSaved(false);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/shop/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, logoUrl: logoUrl || "", logoSize }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  function handleRemove() {
    setLogoUrl("");
    setSaved(false);
  }

  return (
    <div className="max-w-md rounded-lg border border-white/10 bg-white/[0.02] p-6">
      <p className="mb-1 text-sm font-medium text-white">Logo on shareable graphics</p>
      <p className="mb-4 text-xs text-white/50">
        Shown as a watermark in the corner of every UGC card generated from your reviews —
        helps with brand recall when customers share them.
      </p>

      {logoUrl && (
        <img
          src={logoUrl}
          alt="Logo preview"
          className="mb-3 rounded bg-white/90 p-1"
          style={{ width: Math.min(logoSize, 200) }}
        />
      )}

      <div className="mb-4 flex items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/15 px-3 py-1.5 text-xs text-white hover:border-white/30">
          {logoUrl ? "Change logo" : "Upload logo"}
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
        {logoUrl && (
          <button onClick={handleRemove} className="text-xs text-red-400 hover:underline">
            Remove
          </button>
        )}
      </div>

      {logoUrl && (
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium text-white/50">
            Watermark size: {logoSize}px
          </label>
          <input
            type="range"
            min={60}
            max={300}
            step={10}
            value={logoSize}
            onChange={(e) => {
              setLogoSize(Number(e.target.value));
              setSaved(false);
            }}
            className="w-full"
          />
        </div>
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
