import { SupportInbox } from "@/components/SupportInbox";

export default async function DeveloperSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; shop?: string }>;
}) {
  const { key, shop } = await searchParams;

  if (!key || key !== process.env.SUPPORT_SECRET_KEY) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-white/50">Invalid or missing key.</p>
      </main>
    );
  }

  return <SupportInbox apiKey={key} initialShop={shop} />;
}
