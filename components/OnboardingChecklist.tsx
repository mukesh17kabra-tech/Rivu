"use client";

import { useState } from "react";

export function OnboardingChecklist({ shop, host }: { shop: string; host?: string | null }) {
  const [dismissed, setDismissed] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});

  if (dismissed) return null;

  function markDone(key: string) {
    setDone((d) => ({ ...d, [key]: true }));
  }

  // Deep-links Shopify's theme editor straight to the product template with
  // the "Add block" panel ready — merchant just needs to pick our block and
  // hit Save. Uses the store's own admin domain, decoded from `host` if we
  // have it, otherwise falls back to the plain shop domain (works, just
  // opens the generic customizer instead of jumping straight to Add Block).
  const themeEditorUrl = `https://${shop}/admin/themes/current/editor?template=product`;

  const steps = [
    {
      key: "embed",
      title: "Enable App Embed",
      body: "Turn on Rivu in your theme's App Embeds — one toggle, loads the widget script globally.",
      cta: "Open App Embeds",
      href: `${themeEditorUrl}&context=apps`,
    },
    {
      key: "widget",
      title: "Add Reviews Widget to product pages",
      body: "Opens the theme editor on a product page — add the \"Rivu Reviews\" block, then hit Save.",
      cta: "Add to Product Page",
      href: themeEditorUrl,
    },
    {
      key: "badge",
      title: "Add Star Badge to collection pages (optional)",
      body: "Shows star ratings on collection product cards automatically.",
      cta: "Add to Collection Page",
      href: `https://${shop}/admin/themes/current/editor?template=collection`,
    },
  ];

  return (
    <section className="mb-8 rounded-lg border border-black/[0.10] bg-black/[0.02] p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[15px] font-medium text-[#111418]">🚀 Finish setting up Rivu</p>
        <button onClick={() => setDismissed(true)} className="text-[13px] text-black/58 hover:text-black/72">
          Dismiss
        </button>
      </div>
      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.key}
            className={`flex items-center justify-between rounded-md border p-4 ${
              done[step.key] ? "border-[#111418]/20 bg-[#111418]/[0.03] opacity-60" : "border-black/[0.10]"
            }`}
          >
            <div>
              <p className="text-[15px] font-medium text-[#111418]">{step.title}</p>
              <p className="mt-0.5 text-[13px] text-black/62">{step.body}</p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={step.href}
                target="_top"
                className="whitespace-nowrap rounded-md bg-[#111418] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#2a2f35]"
              >
                {step.cta} →
              </a>
              <button
                onClick={() => markDone(step.key)}
                className="whitespace-nowrap text-[13px] text-emerald-700 hover:underline"
              >
                Mark done
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
