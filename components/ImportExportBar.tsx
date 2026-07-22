"use client";

import { useState } from "react";

export function ImportExportBar({ shop }: { shop: string }) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState("");

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError("");
    setResult(null);

    try {
      const csv = await file.text();
      const res = await fetch("/api/reviews/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, csv }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ imported: data.imported, skipped: data.skipped });
        // Refresh so imported reviews show up in the approved list below.
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setError(data.error || "Import failed.");
      }
    } catch {
      setError("Something went wrong reading that file.");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <a
        href={`/api/reviews/export?shop=${encodeURIComponent(shop)}`}
        className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
      >
        Export all reviews (CSV)
      </a>

      <label className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 cursor-pointer">
        {importing ? "Importing..." : "Import from Judge.me / Loox / Stamped / Yotpo / CSV"}
        <input type="file" accept=".csv" onChange={handleImport} disabled={importing} className="hidden" />
      </label>

      <span className="text-xs text-white/40">
        Just export your reviews as CSV from any of those apps and upload it here — column
        names are detected automatically, no need to rename anything.
      </span>

      {result && (
        <span className="text-xs text-emerald-400">
          Imported {result.imported}, skipped {result.skipped}
        </span>
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
