"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SupportChatWidget } from "@/components/SupportChatWidget";
import { DowngradeNotice } from "@/components/DowngradeNotice";

function DashboardInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const shop = searchParams.get("shop") || "";

  const plan = typeof window !== "undefined"
    ? (sessionStorage.getItem(`rivu_current_plan_${shop}`) || "")
    : "";

  return (
    <>
      {children}
      {shop && plan && <DowngradeNotice currentPlan={plan} shop={shop} />}
      {shop && <SupportChatWidget shop={shop} />}
    </>
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
