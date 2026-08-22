"use client";

import { useState } from "react";

/**
 * Export only. Importing moved to ImportWizard, which previews the file before
 * writing anything — this used to import blind on file selection, which is a
 * lot to ask of a merchant handing over their entire review history.
 */
export function ImportExportBar({ shop }: { shop: string }) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

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
    <div className="mb-8 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-50"
      >
        {exporting ? "Exporting…" : "Export all reviews (CSV)"}
      </button>

      <span className="text-xs text-white/40">
        Your reviews are yours — export them at any time, in a format any other
        review app can read.
      </span>

      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
