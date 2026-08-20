import { getProducts } from "@/lib/shopify";
import { PageHeader, Section } from "@/components/ui";
import { requireShop, shopQuery } from "@/lib/shop-context";
import { ReauthRequiredError } from "@/lib/access-token";
import { qrProductLimit } from "@/lib/usage-limits";

export default async function QRCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; host?: string }>;
}) {
  const { shop: shopParam, host } = await searchParams;
  // requireShop sends the merchant back to the app entry point when the shop
  // is missing or not yet registered, so authentication can re-run — instead
  // of dead-ending them on "Shop not found. Please reinstall the app."
  const { shop, shopRecord } = await requireShop(shopParam, host);

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

  // Free is documented as ten products. Listing every product regardless
  // would advertise a limit that doesn't exist.
  const qrLimit = qrProductLimit(shopRecord.plan);
  const hiddenProducts = Number.isFinite(qrLimit)
    ? Math.max(0, products.length - qrLimit)
    : 0;
  if (Number.isFinite(qrLimit)) products = products.slice(0, qrLimit);

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
          <p className="mb-4 text-sm text-white/55 leading-relaxed max-w-2xl">
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
              className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-bold text-black hover:bg-emerald-300"
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
            <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.08] p-4">
              <p className="text-sm text-amber-200">
                Rivu needs permission to read your products again.
              </p>
              <a
                href={`/api/auth?${shopQuery(shop, host)}`}
                target="_top"
                className="mt-3 inline-block rounded-md bg-emerald-400 px-4 py-2 text-sm font-bold text-black hover:bg-emerald-300"
              >
                Reconnect Rivu
              </a>
            </div>
          ) : fetchError ? (
            <p className="rounded-lg border border-red-400/25 bg-red-400/[0.08] p-4 text-sm text-red-300">
              Couldn&apos;t load products: {fetchError}
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {products.map((product) => {
                const qrUrl = `/api/qrcode?shop=${encodeURIComponent(shop)}&productId=${product.id}&productTitle=${encodeURIComponent(product.title)}${product.image?.src ? `&productImage=${encodeURIComponent(product.image.src)}` : ""}`;
                return (
                  <div
                    key={product.id}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-3 text-center"
                  >
                    <img src={qrUrl} alt={`QR for ${product.title}`} className="mx-auto mb-2 w-full rounded-md bg-white p-1" />
                    <p className="mb-2 text-xs text-white/60 truncate">{product.title}</p>
                    <a
                      href={qrUrl}
                      download={`review-qr-${product.id}.png`}
                      className="inline-block rounded-md bg-white/[0.08] px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/[0.14]"
                    >
                      Download
                    </a>
                  </div>
                );
              })}
            </div>
          )}

          {hiddenProducts > 0 && (
            <div className="mt-4 rounded-lg border border-amber-400/25 bg-amber-400/[0.08] p-4">
              <p className="text-sm text-amber-200">
                {hiddenProducts} more product{hiddenProducts === 1 ? "" : "s"} not
                shown — your plan covers per-product codes for {qrLimit}.
              </p>
              <p className="mt-1 text-xs text-amber-200/70">
                The store-wide code above already works for every product, so
                you only need these for a checkout thank-you page.
              </p>
              <a
                href={`/dashboard/plans?${shopQuery(shop, host)}`}
                className="mt-3 inline-block rounded-md bg-emerald-400 px-3.5 py-1.5 text-xs font-bold text-black hover:bg-emerald-300"
              >
                Upgrade for unlimited
              </a>
            </div>
          )}
      </Section>
    </>
  );
}
