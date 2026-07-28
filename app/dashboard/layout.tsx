"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SupportChatWidget } from "@/components/SupportChatWidget";
import { DowngradeNotice } from "@/components/DowngradeNotice";

// Wraps useSearchParams in Suspense (Next.js requirement for client components)
function DashboardInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const shop = searchParams.get("shop") || "";

  // Get plan from URL — dashboard pages pass plan as query param, OR
  // we read it from a data attribute set by the server layout. Since we
  // can't call DB here (client component), we store the plan in a
  // localStorage-friendly way via the DowngradeNotice itself which
  // receives currentPlan as a prop from each individual page.
  // For the layout-level notice, we check sessionStorage set by pages.
  const plan = typeof window !== "undefined"
    ? (sessionStorage.getItem(`rivu_current_plan_${shop}`) || "")
    : "";

  return (
    <>
      {children}
      {shop && plan && (
        <DowngradeNotice currentPlan={plan} shop={shop} />
      )}
      {shop && <SupportChatWidget shop={shop} />}
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <DashboardInner>{children}</DashboardInner>
    </Suspense>
  );
}
