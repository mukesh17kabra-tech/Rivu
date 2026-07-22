import { redirect } from "next/navigation";

// Settings was split back into separate top-level pages (Installation,
// Widget Settings, Email Requests) — kept as a redirect so old links work.
export default async function SettingsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; host?: string }>;
}) {
  const { shop, host } = await searchParams;
  const params = new URLSearchParams();
  if (shop) params.set("shop", shop);
  if (host) params.set("host", host);
  redirect(`/dashboard/installation?${params.toString()}`);
}
