"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SupportChatWidget } from "@/components/SupportChatWidget";
import { DowngradeNotice } from "@/components/DowngradeNotice";
import Script from "next/script";

function DashboardInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const shop = searchParams.get("shop") || "";
  const host = searchParams.get("host") || "";

  const plan = typeof window !== "undefined"
    ? (sessionStorage.getItem(`rivu_current_plan_${shop}`) || "")
    : "";

  useEffect(() => {
    // Initialize App Bridge once the CDN script has loaded
    if (typeof window === "undefined" || !host) return;
    const init = () => {
      if (!(window as Window & { shopify?: { config?: unknown } }).shopify) return;
      // App Bridge v4 auto-initializes via the CDN script + data-api-key attribute
      // Session tokens are handled automatically by Shopify's embedded app iframe
    };
    // Small delay to ensure script is ready
    const t = setTimeout(init, 100);
    return () => clearTimeout(t);
  }, [host]);

  return (
    <>
      {children}
      {shop && plan && <DowngradeNotice currentPlan={plan} shop={shop} />}
      {shop && <SupportChatWidget shop={shop} />}
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* App Bridge v4 — required for Shopify embedded app checks */}
      <Script
        src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
        data-api-key={process.env.NEXT_PUBLIC_SHOPIFY_API_KEY}
        strategy="beforeInteractive"
      />
      <Suspense fallback={<>{children}</>}>
        <DashboardInner>{children}</DashboardInner>
      </Suspense>
    </>
  );
}
