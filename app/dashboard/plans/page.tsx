import { redirect } from "next/navigation";

// This page moved into the consolidated Settings page (Plan & Billing
// tab) — kept as a redirect so any old bookmarked/shared links still work.
export default async function PlansRedirect({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; host?: string }>;
}) {
  const { shop, host } = await searchParams;
  const params = new URLSearchParams();
  if (shop) params.set("shop", shop);
  if (host) params.set("host", host);
  params.set("tab", "billing");
  redirect(`/dashboard/settings?${params.toString()}`);
}
