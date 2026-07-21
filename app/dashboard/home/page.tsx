import { db } from "@/lib/db";
import { NavBar } from "@/components/NavBar";
import { resolveShop } from "@/lib/shop-context";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";

export default async function DashboardHome({
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
    ? Math.round((allRatings.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / allRatings.length) * 10) / 10
    : 0;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const thisMonth = await db.review.count({
    where: { shopId: shopRecord.id, createdAt: { gte: startOfMonth } },
  });

  return (
    <main className="min-h-screen bg-[#0B0D0F] text-[#E7E9EA] font-sans">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-6 flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80">Rivu</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h1>
          </div>
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-wide text-white/60">
            {shopRecord.plan} plan
          </span>
        </header>

        <NavBar shop={shop} host={host} active="home" />

        <OnboardingChecklist shop={shop} host={host} />

        <section className="mb-8 grid grid-cols-4 gap-4">
          <Stat label="Total Reviews" value={total} />
          <Stat label="Average Rating" value={average} suffix=" ★" />
          <Stat label="Pending Approval" value={pending} />
          <Stat label="Reviews This Month" value={thisMonth} />
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-white/50">
            Recent Reviews
          </h2>
          {recentReviews.length === 0 ? (
            <p className="text-sm text-white/40">No reviews yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-white/40">
                <tr>
                  <th className="pb-2 font-medium">Reviewer</th>
                  <th className="pb-2 font-medium">Rating</th>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentReviews.map((r: { id: string; customerName: string; rating: number; productTitle: string; createdAt: Date }) => (
                  <tr key={r.id} className="border-t border-white/5">
                    <td className="py-2">{r.customerName}</td>
                    <td className="py-2 text-yellow-400">
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </td>
                    <td className="py-2 text-white/60">{r.productTitle}</td>
                    <td className="py-2 text-white/40">{r.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <a
            href={`/dashboard/reviews?shop=${shop}${host ? `&host=${host}` : ""}`}
            className="mt-3 inline-block text-xs text-emerald-400 hover:underline"
          >
            View all reviews →
          </a>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">
        {value}
        {suffix}
      </p>
    </div>
  );
}
