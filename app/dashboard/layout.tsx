"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SupportChatWidget } from "@/components/SupportChatWidget";
import { DowngradeNotice } from "@/components/DowngradeNotice";
import { Sidebar } from "@/components/Sidebar";

function DashboardInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const shop = searchParams.get("shop") || "";
  const host = searchParams.get("host") || "";

  const plan =
    typeof window !== "undefined"
      ? sessionStorage.getItem(`rivu_current_plan_${shop}`) || ""
      : "";

  return (
    // The sidebar and the scrolling content sit side by side, so navigation
    // stays put while a long settings page scrolls.
    <div className="flex min-h-screen flex-col bg-[#0B0D0F] text-[#E7E9EA] md:flex-row">
      {shop && <Sidebar shop={shop} host={host} plan={plan} />}

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">{children}</div>
      </main>

      {shop && plan && <DowngradeNotice currentPlan={plan} shop={shop} />}
      {shop && <SupportChatWidget shop={shop} />}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // App Bridge is loaded once in the root layout (app/layout.tsx). Loading the
  // CDN script a second time here re-initialized it and could clobber the
  // session-token interception it installs on fetch.
  return (
    <Suspense fallback={<>{children}</>}>
      <DashboardInner>{children}</DashboardInner>
    </Suspense>
  );
}
