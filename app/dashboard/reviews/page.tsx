import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ImportExportBar } from "@/components/ImportExportBar";
import { ReviewsTable } from "@/components/ReviewsTable";
import { ModerationToggle } from "@/components/ModerationToggle";
import { requireShop } from "@/lib/shop-context";

export default async function ReviewsDashboard({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; host?: string }>;
}) {
  const { shop: shopParam, host } = await searchParams;
  // requireShop sends the merchant back to the app entry point when the shop
  // is missing or not yet registered, so authentication can re-run — instead
  // of dead-ending them on "Shop not found. Please reinstall the app."
  const { shop, shopRecord } = await requireShop(shopParam, host);

  const reviews = await db.review.findMany({
    where: { shopId: shopRecord.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const pendingCount = reviews.filter((r: { approved: boolean }) => !r.approved).length;

  return (
    <>
      <PageHeader
        title="All reviews"
        description={
          pendingCount > 0
            ? `${reviews.length} total · ${pendingCount} awaiting approval`
            : `${reviews.length} total`
        }
      />

      <ModerationToggle
        shop={shop}
        initialAutoApprove={shopRecord.autoApproveReviews}
        pendingCount={pendingCount}
      />

      <ImportExportBar shop={shop} />

      <ReviewsTable shop={shop} reviews={reviews} plan={shopRecord.plan} />
    </>
  );
}
