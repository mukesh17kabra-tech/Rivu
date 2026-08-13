import { NavBar } from "@/components/NavBar";
import { requireShop } from "@/lib/shop-context";
import { InstallationContent } from "@/components/InstallationContent";

export default async function InstallationPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; host?: string }>;
}) {
  const { shop: shopParam, host } = await searchParams;
  // requireShop sends the merchant back to the app entry point when the shop
  // is missing or not yet registered, so authentication can re-run — instead
  // of dead-ending them on "Shop not found. Please reinstall the app."
  const { shop, shopRecord } = await requireShop(shopParam, host);

  return (
    <main className="min-h-screen bg-[#0B0D0F] text-[#E7E9EA] font-sans">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80">Rivu</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Installation</h1>
        </header>

        <NavBar shop={shop} host={host} active="installation" />

        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
          <InstallationContent shop={shop} />
        </div>
      </div>
    </main>
  );
}
