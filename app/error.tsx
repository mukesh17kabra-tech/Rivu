"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary.
 *
 * Without this, any thrown error — a database hiccup, a slow Admin API call
 * — renders Next.js's own error screen and the app reads as broken. Shopify's
 * review guidelines accept operational errors but not web errors, so every
 * failure needs to land somewhere that still looks like Rivu and still has a
 * button.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[rivu] unhandled error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
      <div className="w-full max-w-md text-center">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-amber-600">
          Rivu
        </p>
        <h1 className="mb-3 text-2xl font-semibold tracking-tight">
          Something went wrong on our side
        </h1>
        <p className="text-sm leading-relaxed text-slate-500">
          Your reviews and settings are safe. This is usually a temporary
          hiccup — retrying normally clears it.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            Back to dashboard
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 font-mono text-xs text-slate-300">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
