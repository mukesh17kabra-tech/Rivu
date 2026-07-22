"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SupportChatWidget } from "@/components/SupportChatWidget";

function ChatWidgetWithShop() {
  const searchParams = useSearchParams();
  const shop = searchParams.get("shop");
  return shop ? <SupportChatWidget shop={shop} /> : null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <ChatWidgetWithShop />
      </Suspense>
    </>
  );
}
