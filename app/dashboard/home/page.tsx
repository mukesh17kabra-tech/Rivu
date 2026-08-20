import Link from "next/link";
import { db } from "@/lib/db";
import { requireShop, shopQuery } from "@/lib/shop-context";
import { Card, PageHeader, Stat, Badge } from "@/components/ui";
import { usageWarning } from "@/lib/usage-limits";

export default async function DashboardHome({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; host?: string }>;
}) {
  const { shop: shopParam, host } = await searchParams;
  // requireShop sends the merchant back to the app entry point when the shop
  // is missing or not yet registered, so authentication can re-run — instead
  // of dead-ending them on "Shop not found. Please reinstall the app."
  const { shop, shopRecord } = await requireShop(shopParam, host);

  const [total, pending, allRatings, recentReviews] = await Promise.all([
    db.review.count({ where: { shopId: shopRecord.id } }),
    db.review.count({ where: { shopId: shopRecord.id, approved: false } }),
    db.review.findMany({ where: { shopId: shopRecord.id }, select: { rating: true } }),
    db.review.findMany({
      where: { shopId: shopRecord.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const average = allRatings.length
    ? Math.round(
        (allRatings.reduce((s: number, r: { rating: number }) => s + r.rating, 0) /
          allRatings.length) *
          10
      ) / 10
    : 0;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const thisMonth = await db.review.count({
    where: { shopId: shopRecord.id, createdAt: { gte: startOfMonth } },
  });

  const query = shopQuery(shop, host);
  const quotaWarning = usageWarning(shopRecord.plan, thisMonth);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={shop}
        actions={<Badge>{shopRecord.plan} plan</Badge>}
      />

      {/* Deliberately dark — the one call-to-action on an otherwise empty
          dashboard, so it should carry some weight. */}
      {total === 0 && (
        <Card className="mb-5 !border-emerald-400/30 !bg-emerald-400/[0.07]">
          <p className="text-sm font-bold text-white">
            👋 New here? Add the widget to your storefront
          </p>
          <p className="mt-1 text-[13px] text-white/60">
            Reviews start appearing here once the widget is live on your product pages.
          </p>
          <Link
            href={`/dashboard/installation?${query}`}
            className="mt-3 inline-block rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-emerald-300"
          >
            Open the installation guide →
          </Link>
        </Card>
      )}

      {quotaWarning && (
        <Card className="mb-5 !border-amber-400/25 !bg-amber-400/[0.07]">
          <p className="text-sm font-bold text-amber-200">{quotaWarning}</p>
          <Link
            href={`/dashboard/plans?${query}`}
            className="mt-2.5 inline-block rounded-md bg-emerald-400 px-3.5 py-1.5 text-xs font-bold text-black transition-colors hover:bg-emerald-300"
          >
            See plans
          </Link>
        </Card>
      )}

      <MilestoneBar total={total} />

      <section className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total reviews" value={total} />
        <Stat label="Average rating" value={average || "—"} suffix={average ? " ★" : ""} />
        <Stat
          label="Pending approval"
          value={pending}
          hint={pending ? "Needs your review" : undefined}
        />
        <Stat label="This month" value={thisMonth} />
      </section>

      <Card padded={false}>
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
          <h2 className="text-[15px] font-bold text-white">Recent reviews</h2>
          <Link
            href={`/dashboard/reviews?${query}`}
            className="text-[13px] font-medium text-white/45 transition-colors hover:text-white"
          >
            View all →
          </Link>
        </div>

        {recentReviews.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-white/35">No reviews yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/35">
                  <th className="px-5 py-2.5 font-semibold">Reviewer</th>
                  <th className="px-5 py-2.5 font-semibold">Rating</th>
                  <th className="px-5 py-2.5 font-semibold">Product</th>
                  <th className="px-5 py-2.5 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentReviews.map(
                  (r: {
                    id: string;
                    customerName: string;
                    rating: number;
                    productTitle: string;
                    createdAt: Date;
                  }) => (
                    <tr key={r.id} className="border-t border-white/[0.07]">
                      <td className="px-5 py-3 font-medium text-white">{r.customerName}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-amber-500">
                        {"★".repeat(r.rating)}
                        <span className="text-white/15">{"★".repeat(5 - r.rating)}</span>
                      </td>
                      <td className="px-5 py-3 text-white/55">{r.productTitle}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-white/35">
                        {r.createdAt.toLocaleDateString()}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function MilestoneBar({ total }: { total: number }) {
  const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];
  const next = MILESTONES.find((m) => m > total) ?? MILESTONES[MILESTONES.length - 1] * 2;
  const prev = [...MILESTONES].reverse().find((m) => m <= total) ?? 0;
  const progress = Math.min(100, Math.round(((total - prev) / (next - prev)) * 100));

  return (
    <Card className="mb-5">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-sm font-bold text-white">
          {total} review{total === 1 ? "" : "s"} collected
        </p>
        <p className="text-[13px] text-white/40">
          {next - total} more to reach {next}
        </p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-emerald-400 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </Card>
  );
}
