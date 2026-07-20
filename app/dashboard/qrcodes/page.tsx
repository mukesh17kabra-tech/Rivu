import { db } from "@/lib/db";
import { getProducts } from "@/lib/shopify";
import { NavBar } from "@/components/NavBar";

export default async function QRCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const { shop } = await searchParams;

  if (!shop) {
    return <div className="p-8 text-sm text-gray-500">Missing shop parameter.</div>;
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return <div className="p-8 text-sm text-gray-500">Shop not found. Please reinstall the app.</div>;
  }

  let products: { id: number; title: string; image?: { src: string } }[] = [];
  let fetchError: string | null = null;
  try {
    products = await getProducts(shop, shopRecord.accessToken);
  } catch (err) {
    fetchError = (err as Error).message;
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] text-[#E7E9EA] font-sans">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80">Rivu</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">QR Codes</h1>
          <p className="mt-2 text-sm text-white/50">
            Print these on packing slips, thank-you cards, or receipts — scanning takes the
            customer straight to a review form for that exact product.
          </p>
        </header>

        <NavBar shop={shop} active="qrcodes" />

        {fetchError ? (
          <p className="rounded-lg border border-red-400/30 bg-red-400/[0.06] p-4 text-sm text-red-300">
            Couldn&apos;t load products: {fetchError}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {products.map((product) => {
              const qrUrl = `/api/qrcode?shop=${encodeURIComponent(shop)}&productId=${product.id}&productTitle=${encodeURIComponent(product.title)}${product.image?.src ? `&productImage=${encodeURIComponent(product.image.src)}` : ""}`;
              return (
                <div
                  key={product.id}
                  className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-center"
                >
                  <img src={qrUrl} alt={`QR for ${product.title}`} className="mx-auto mb-3 w-full rounded-md bg-white p-2" />
                  <p className="mb-3 text-sm text-white/80 truncate">{product.title}</p>
                  <a
                    href={qrUrl}
                    download={`review-qr-${product.id}.png`}
                    className="inline-block rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                  >
                    Download QR
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
