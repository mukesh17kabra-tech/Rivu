"use client";

import { useSearchParams } from "next/navigation";
import { SupportChatWidget } from "@/components/SupportChatWidget";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const shop = searchParams.get("shop");

  return (
    <>
      {children}
      {shop && <SupportChatWidget shop={shop} />}
    </>
  );
}
