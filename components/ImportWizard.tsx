"use client";

import { useState } from "react";

/**
 * The migration flow for merchants coming from another review app.
 *
 * Previously this was a single button that read a file and wrote straight to
 * the database. Importing a store's entire review history is close to
 * irreversible from the merchant's side, and the old flow gave them no idea
 * what would happen until it already had — which is a lot to ask of someone
 * still deciding whether to trust the app.
 *
 * So it's two steps now: check the file, show exactly what will happen, then
 * import on confirmation.
 */

type SkipGroup = { reason: string; count: number; example?: string };

type Preview = {
  totalRows: number;
  willImport: number;
  alreadyPresent: number;
  skipped: SkipGroup[];
  warnings: string[];
  sample: {
    productTitle: string;
    customerName: string;
    rating: number;
    body: string;
    date: string | null;
  }[];
};

export function ImportWizard({ shop }: { shop: string }) {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<number | null>(null);

  async function post(dryRun: boolean, csvText: string) {
    const res = await fetch("/api/reviews/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop, csv: csvText, dryRun }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Import failed.");
    return data;
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBusy(true);
    setError("");
    setPreview(null);
    setDone(null);
    try {
      const text = await file.text();
      setCsv(text);
      setFileName(file.name);
      setPreview(await post(true, text));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that file.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    setBusy(true);
    setError("");
    try {
      const data = await post(false, csv);
      setDone(data.imported);
      setPreview(null);
      // Reviews are listed on this page, so show the new ones.
      setTimeout(() => window.location.reload(), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-8 rounded-lg border border-black/[0.10] bg-black/[0.02] p-5">
      <p className="text-sm font-bold text-[#111418]">
        Moving from Judge.me, Loox, Stamped or Yotpo?
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-black/50">
        Export your reviews as CSV from your current app and upload the file
        as-is. Column names are detected automatically, original review dates
        are kept, and you&apos;ll see exactly what will happen before anything
        is imported.
      </p>

      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-md bg-[#111418] px-4 py-2 text-xs font-bold text-white hover:bg-[#2a2f35]">
          {busy && !preview ? "Checking file…" : "Choose CSV file"}
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            disabled={busy}
            className="hidden"
          />
        </label>
        {fileName && !done && (
          <span className="text-xs text-black/45">{fileName}</span>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-red-600/25 bg-red-400/[0.07] p-3 text-xs text-red-700">
          {error}
        </p>
      )}

      {done !== null && (
        <p className="mt-3 rounded-md border border-emerald-600/20 bg-emerald-50 p-3 text-xs text-emerald-700">
          Imported {done} review{done === 1 ? "" : "s"}. Refreshing…
        </p>
      )}

      {preview && (
        <div className="mt-4 rounded-md border border-black/[0.10] bg-black/[0.035] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-black/45">
            Before importing
          </p>

          <div className="mt-2.5 flex flex-wrap gap-5 text-[13px]">
            <span className="text-[#111418]">
              <strong className="text-emerald-700">{preview.willImport}</strong>{" "}
              to import
            </span>
            {preview.alreadyPresent > 0 && (
              <span className="text-black/58">
                {preview.alreadyPresent} already in Rivu (skipped)
              </span>
            )}
            <span className="text-black/45">{preview.totalRows} rows in file</span>
          </div>

          {/* Warnings are things that will import but won't behave as expected —
              worth reading before, not discovering afterwards. */}
          {preview.warnings.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-xs text-amber-800/90">
              {preview.warnings.map((w) => (
                <li key={w} className="rounded border border-amber-400/20 bg-amber-400/[0.06] p-2.5">
                  {w}
                </li>
              ))}
            </ul>
          )}

          {preview.skipped.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-black/58">
                Rows that can&apos;t be imported
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-black/48">
                {preview.skipped.map((s) => (
                  <li key={s.reason}>
                    <span className="text-black/65">{s.count}</span> — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.sample.length > 0 && (
            <div className="mt-3.5 overflow-x-auto">
              <p className="mb-1.5 text-xs font-semibold text-black/58">
                First few, as they&apos;ll be imported
              </p>
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="text-black/42">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Product</th>
                    <th className="py-1 pr-3 font-medium">Reviewer</th>
                    <th className="py-1 pr-3 font-medium">Rating</th>
                    <th className="py-1 pr-3 font-medium">Date</th>
                    <th className="py-1 font-medium">Review</th>
                  </tr>
                </thead>
                <tbody className="text-black/65">
                  {preview.sample.map((s, i) => (
                    <tr key={i} className="border-t border-black/[0.06]">
                      <td className="py-1.5 pr-3">{s.productTitle}</td>
                      <td className="py-1.5 pr-3">{s.customerName}</td>
                      <td className="py-1.5 pr-3">{s.rating}★</td>
                      <td className="py-1.5 pr-3">
                        {s.date ?? <span className="text-amber-700/70">today</span>}
                      </td>
                      <td className="py-1.5 text-black/50">{s.body}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy || preview.willImport === 0}
              className="rounded-md bg-[#111418] px-4 py-2 text-xs font-bold text-white hover:bg-[#2a2f35] disabled:opacity-50"
            >
              {busy
                ? "Importing…"
                : `Import ${preview.willImport} review${preview.willImport === 1 ? "" : "s"}`}
            </button>
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setCsv("");
                setFileName("");
              }}
              disabled={busy}
              className="text-xs font-medium text-black/48 hover:text-black/65"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
