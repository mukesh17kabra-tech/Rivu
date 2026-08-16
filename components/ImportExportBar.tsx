"use client";

import { useState } from "react";

export function ImportExportBar({ shop }: { shop: string }) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
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

  // The export endpoint requires a session token now, and a plain <a download>
  // can't carry an Authorization header. Fetching it (App Bridge attaches the
  // token) and saving the blob keeps the same one-click behaviour.
  async function handleExport() {
    setExporting(true);
    setError("");
    try {
      const res = await fetch(
        `/api/reviews/export?shop=${encodeURIComponent(shop)}`
      );
      if (!res.ok) {
        setError("Couldn't export your reviews. Please try again.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rivu-reviews-${shop}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't export your reviews. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-slate-200 disabled:opacity-50"
      >
        {exporting ? "Exporting…" : "Export all reviews (CSV)"}
      </button>

      <label className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-slate-200 cursor-pointer">
        {importing ? "Importing..." : "Import from Judge.me / Loox / Stamped / Yotpo / CSV"}
        <input type="file" accept=".csv" onChange={handleImport} disabled={importing} className="hidden" />
      </label>

      <span className="text-xs text-slate-400">
        Just export your reviews as CSV from any of those apps and upload it here — column
        names are detected automatically, no need to rename anything.
      </span>

      {result && (
        <span className="text-xs text-slate-900">
          Imported {result.imported}, skipped {result.skipped}
        </span>
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
