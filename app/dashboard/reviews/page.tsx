import { db } from "@/lib/db";
import { ReviewCard } from "@/components/ReviewCard";
import { NavBar } from "@/components/NavBar";
import { ImportExportBar } from "@/components/ImportExportBar";
import { resolveShop } from "@/lib/shop-context";
import type { Review } from "@prisma/client";

export default async function ReviewsDashboard({
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

  const [pending, approved] = await Promise.all([
    db.review.findMany({
      where: { shopId: shopRecord.id, approved: false },
      orderBy: { createdAt: "desc" },
    }),
    db.review.findMany({
      where: { shopId: shopRecord.id, approved: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <main className="min-h-screen bg-[#0B0D0F] text-[#E7E9EA] font-sans">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80">Rivu</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{shopRecord.shopDomain}</h1>
        </header>

        <NavBar shop={shop} host={host} active="reviews" />

        <ImportExportBar shop={shop} />

        <section className="mb-12">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-white/50">
            Pending approval ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/15 p-6 text-sm text-white/40">
              No new reviews waiting on approval.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {pending.map((review: Review) => (
                <ReviewCard key={review.id} shop={shop} review={review} pending />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-white/50">
            Approved — generate UGC cards
          </h2>
          {approved.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/15 p-6 text-sm text-white/40">
              No approved reviews yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {approved.map((review: Review) => (
                <ReviewCard key={review.id} shop={shop} review={review} pending={false} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
