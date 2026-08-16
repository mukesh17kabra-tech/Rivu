import { getProducts } from "@/lib/shopify";
import { PageHeader, Section } from "@/components/ui";
import { requireShop, shopQuery } from "@/lib/shop-context";
import { ReauthRequiredError } from "@/lib/access-token";

export default async function QRCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; host?: string }>;
}) {
  const { shop: shopParam, host } = await searchParams;
  // requireShop sends the merchant back to the app entry point when the shop
  // is missing or not yet registered, so authentication can re-run — instead
  // of dead-ending them on "Shop not found. Please reinstall the app."
  const { shop } = await requireShop(shopParam, host);

  let products: { id: number; title: string; image?: { src: string } }[] = [];
  let fetchError: string | null = null;
  let needsReauth = false;
  try {
    // getProducts resolves and rotates the access token itself.
    products = await getProducts(shop);
  } catch (err) {
    // A token that can't be rotated is recoverable by re-authorizing, so say
    // that instead of showing the merchant an internal error string.
    if (err instanceof ReauthRequiredError) {
      needsReauth = true;
    } else {
      fetchError = (err as Error).message;
    }
  }

  const genericQrUrl = `/api/qrcode?shop=${encodeURIComponent(shop)}`;

  return (
    <>
      <PageHeader
        title="QR codes"
        description="Print a code on packaging so buyers can review straight from their phone."
      />

      <Section
        title="One QR for your whole store"
        description="Recommended — works for every product, so you only print one code."
      >
        <div>
          <p className="mb-4 text-sm text-slate-500 leading-relaxed max-w-2xl">
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
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Download QR
            </a>
          </div>
        </div>
      </Section>

      <Section
        title="Per-product QR codes"
        description="Advanced — only for places where the product is already known, like a checkout thank-you page. For packaging, use the store-wide code above."
      >

          {needsReauth ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                Rivu needs permission to read your products again.
              </p>
              <a
                href={`/api/auth?${shopQuery(shop, host)}`}
                target="_top"
                className="mt-3 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Reconnect Rivu
              </a>
            </div>
          ) : fetchError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Couldn&apos;t load products: {fetchError}
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {products.map((product) => {
                const qrUrl = `/api/qrcode?shop=${encodeURIComponent(shop)}&productId=${product.id}&productTitle=${encodeURIComponent(product.title)}${product.image?.src ? `&productImage=${encodeURIComponent(product.image.src)}` : ""}`;
                return (
                  <div
                    key={product.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-center"
                  >
                    <img src={qrUrl} alt={`QR for ${product.title}`} className="mx-auto mb-2 w-full rounded-md bg-white p-1" />
                    <p className="mb-2 text-xs text-slate-600 truncate">{product.title}</p>
                    <a
                      href={qrUrl}
                      download={`review-qr-${product.id}.png`}
                      className="inline-block rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-900 hover:bg-slate-200"
                    >
                      Download
                    </a>
                  </div>
                );
              })}
            </div>
          )}
      </Section>
    </>
  );
}
