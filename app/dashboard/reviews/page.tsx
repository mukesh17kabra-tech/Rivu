import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ImportExportBar } from "@/components/ImportExportBar";
import { ImportWizard } from "@/components/ImportWizard";
import { ReviewsTable } from "@/components/ReviewsTable";
import { ModerationToggle } from "@/components/ModerationToggle";
import { requireShop } from "@/lib/shop-context";
import { FixProductLinks } from "@/components/FixProductLinks";

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

  // Together rather than one after the other: they do not depend on each
  // other, and two sequential round trips to Postgres is two the merchant
  // waits through before the page paints.
  const [reviews, missingHandles] = await Promise.all([
    db.review.findMany({
      where: { shopId: shopRecord.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    // Counted across the whole table, not just the 200 shown, because the
    // offer to repair them is about all of them.
    db.review.count({
      where: { shopId: shopRecord.id, productHandle: null },
    }),
  ]);

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

      <FixProductLinks shop={shop} missing={missingHandles} />

      <ImportWizard shop={shop} />
      <ImportExportBar shop={shop} />

      <ReviewsTable shop={shop} reviews={reviews} plan={shopRecord.plan} />
    </>
  );
}
