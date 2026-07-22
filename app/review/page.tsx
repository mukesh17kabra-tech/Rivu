import { ReviewFlow } from "@/components/ReviewFlow";
import { db } from "@/lib/db";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    shop?: string;
    productId?: string;
    productTitle?: string;
    productImage?: string;
  }>;
}) {
  const { shop, productId, productTitle, productImage } = await searchParams;

  if (!shop) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center p-6">
        <p className="text-sm text-gray-500">Missing store information.</p>
      </main>
    );
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center p-6">
        <p className="text-sm text-gray-500">Store not found.</p>
      </main>
    );
  }

  return (
    <ReviewFlow
      shop={shop}
      productId={productId}
      productTitle={productTitle}
      productImage={productImage}
      storeLogoUrl={shopRecord.logoUrl || undefined}
    />
  );
}
