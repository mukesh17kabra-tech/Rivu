import { redirect } from "next/navigation";
import { resolveShop } from "@/lib/shop-context";
import { db } from "@/lib/db";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; host?: string; embedded?: string }>;
}) {
  const { shop: shopParam, host } = await searchParams;
  const shop = resolveShop(shopParam, host);

  if (shop) {
    let isAuthorized = false;
    try {
      const record = await db.shop.findUnique({ where: { shopDomain: shop } });
      isAuthorized = !!record?.accessToken;
    } catch {
      isAuthorized = false;
    }

    if (isAuthorized) {
      const params = new URLSearchParams({ shop });
      if (host) params.set("host", host);
      redirect(`/dashboard/home?${params.toString()}`);
    } else {
      redirect(`/api/auth?shop=${encodeURIComponent(shop)}`);
    }
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] text-[#E7E9EA] flex items-center justify-center">
      <div className="max-w-md text-center px-6">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80 mb-2">Shopify App</p>
        <h1 className="text-3xl font-semibold mb-4">Rivu</h1>
        <p className="text-white/60 text-sm leading-relaxed">
          Collect product reviews via QR codes and email, and display them in a
          fully customizable widget on your storefront.
        </p>
      </div>
    </main>
  );
}
