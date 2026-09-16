"use client";

import { useState } from "react";

/**
 * Repairs the "View product" links on reviews that never captured a handle.
 *
 * Only the product-page widget ever sent one. Reviews collected by QR code or
 * review-request email, and every imported review, arrived with a product id
 * and a title — and since Rivu links products as /products/<handle>, with no
 * Shopify route by id, those reviews show their product's name as dead text.
 * A shopper who has just been convinced by a photo has nothing to click.
 *
 * New reviews now resolve their own handle when they are saved. This is for
 * the ones already in the table.
 *
 * Shown only when there is something to fix, and run only when the merchant
 * asks: it writes to their reviews and spends their Admin API budget.
 */
export function FixProductLinks({ shop, missing }: { shop: string; missing: number }) {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [result, setResult] = useState<{
    updated: number;
    unresolved: number;
    remaining: number;
  } | null>(null);

  if (missing === 0 && state === "idle") return null;

  async function run() {
    setState("working");
    try {
      const res = await fetch("/api/reviews/backfill-handles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop }),
      });
      if (!res.ok) {
        setState("error");
        return;
      }
      setResult(await res.json());
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-[13.5px] font-bold text-white">
            {state === "done" && result
              ? "Product links repaired"
              : `${missing} review${missing === 1 ? "" : "s"} can't link to ${
                  missing === 1 ? "its" : "their"
                } product`}
          </p>

          {state === "done" && result ? (
            <p className="mt-1 text-[12.5px] leading-relaxed text-white/55">
              {result.updated} now link to their product.
              {result.unresolved > 0 && (
                <>
                  {" "}
                  {result.unresolved} couldn&apos;t be matched — usually a product that has
                  since been deleted, or an import that carried another app&apos;s product
                  identifiers. Those keep showing the product name without a link.
                </>
              )}
              {result.remaining > result.unresolved && (
                <> {result.remaining} still to do — run it again to continue.</>
              )}
            </p>
          ) : (
            <p className="mt-1 text-[12.5px] leading-relaxed text-white/55">
              Reviews left through a QR code or a review request, and imported reviews,
              never recorded which page the product lives on. They show the product name,
              but a shopper can&apos;t click through to buy it. This looks each one up in
              your Shopify catalogue and fixes it. New reviews do this on their own.
            </p>
          )}

          {state === "error" && (
            <p className="mt-2 text-[12.5px] text-red-300">
              That didn&apos;t work. Please try again in a moment.
            </p>
          )}
        </div>

        {state !== "done" && (
          <button
            type="button"
            onClick={run}
            disabled={state === "working"}
            className="shrink-0 rounded-md bg-amber-400 px-4 py-2 text-[13px] font-semibold text-black transition-colors hover:bg-amber-300 disabled:opacity-60"
          >
            {state === "working" ? "Fixing…" : "Fix product links"}
          </button>
        )}
      </div>
    </div>
  );
}
