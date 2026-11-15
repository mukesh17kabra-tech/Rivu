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
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-[#1a1d21]">
      <div className="w-full max-w-md text-center">
        <p className="mb-2 text-[13px] uppercase tracking-[0.2em] text-amber-400/90">
          Rivu
        </p>
        <h1 className="mb-3 text-2xl font-semibold tracking-tight">
          Something went wrong on our side
        </h1>
        <p className="text-[15px] leading-relaxed text-black/68">
          Your reviews and settings are safe. This is usually a temporary
          hiccup — retrying normally clears it.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-[#111418] px-4 py-2 text-[15px] font-medium text-white transition-colors hover:bg-[#2a2f35]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-md border border-black/[0.14] px-4 py-2 text-[15px] font-medium text-black/78 transition-colors hover:border-black/[0.25] hover:text-[#111418]"
          >
            Back to dashboard
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 font-mono text-[13px] text-black/50">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
