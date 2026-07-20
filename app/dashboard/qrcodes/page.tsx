import { db } from "@/lib/db";
import { getProducts } from "@/lib/shopify";
import { NavBar } from "@/components/NavBar";
import { resolveShop } from "@/lib/shop-context";

export default async function QRCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; host?: string }>;
}) {
  const { shop: shopParam, host } = await searchParams;
  const shop = resolveShop(shopParam, host);

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

  const genericQrUrl = `/api/qrcode?shop=${encodeURIComponent(shop)}`;

  return (
    <main className="min-h-screen bg-[#0B0D0F] text-[#E7E9EA] font-sans">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80">Rivu</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">QR Codes</h1>
        </header>

        <NavBar shop={shop} host={host} active="qrcodes" />

        <section className="mb-12 rounded-lg border border-emerald-400/30 bg-emerald-400/[0.06] p-6">
          <p className="text-sm font-medium text-white mb-1">
            Recommended: one QR for your whole store
          </p>
          <p className="mb-4 text-sm text-white/60 leading-relaxed max-w-2xl">
            Print this single QR code on packing slips, thank-you cards, or receipts —
            it works for every product. When a customer scans it, they enter the email they
            ordered with, and Rivu automatically looks up what they bought so they can
            review it — no need to print a different QR per product.
          </p>
          <div className="flex items-center gap-4">
            <img src={genericQrUrl} alt="Generic store QR code" className="w-40 rounded-md bg-white p-2" />
            <a
              href={genericQrUrl}
              download="rivu-review-qr.png"
              className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-300"
            >
              Download QR
            </a>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-white/50">
            Per-product QR codes (optional, advanced)
          </h2>
          <p className="mb-4 text-sm text-white/40 max-w-2xl">
            Only useful for a specific scenario — e.g. showing a QR on your checkout
            thank-you page where the product is already known, skipping the email step.
            For anything printed on physical packaging, use the generic QR above instead.
          </p>

          {fetchError ? (
            <p className="rounded-lg border border-red-400/30 bg-red-400/[0.06] p-4 text-sm text-red-300">
              Couldn&apos;t load products: {fetchError}
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {products.map((product) => {
                const qrUrl = `/api/qrcode?shop=${encodeURIComponent(shop)}&productId=${product.id}&productTitle=${encodeURIComponent(product.title)}${product.image?.src ? `&productImage=${encodeURIComponent(product.image.src)}` : ""}`;
                return (
                  <div
                    key={product.id}
                    className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-center"
                  >
                    <img src={qrUrl} alt={`QR for ${product.title}`} className="mx-auto mb-2 w-full rounded-md bg-white p-1" />
                    <p className="mb-2 text-xs text-white/70 truncate">{product.title}</p>
                    <a
                      href={qrUrl}
                      download={`review-qr-${product.id}.png`}
                      className="inline-block rounded-md bg-white/10 px-2 py-1 text-[11px] font-medium text-white hover:bg-white/20"
                    >
                      Download
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
