-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "customerEmail" TEXT;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "arrowColor" TEXT NOT NULL DEFAULT '#111111',
ADD COLUMN     "carouselVisible" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "fromEmail" TEXT,
ADD COLUMN     "reminderDelayDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showSuggestionsOnQr" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showSuggestionsOnWebsite" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "PendingReviewRequest" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "productImageUrl" TEXT,
    "customerEmail" TEXT NOT NULL,
    "customerName" TEXT,
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "reminderSentAt" TIMESTAMP(3),
    "reviewed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PendingReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderUnsubscribe" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderUnsubscribe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingReviewRequest_shopId_reminderSentAt_reviewed_idx" ON "PendingReviewRequest"("shopId", "reminderSentAt", "reviewed");

-- CreateIndex
CREATE UNIQUE INDEX "PendingReviewRequest_shopId_orderId_productId_key" ON "PendingReviewRequest"("shopId", "orderId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderUnsubscribe_shopId_customerEmail_key" ON "ReminderUnsubscribe"("shopId", "customerEmail");

-- AddForeignKey
ALTER TABLE "PendingReviewRequest" ADD CONSTRAINT "PendingReviewRequest_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderUnsubscribe" ADD CONSTRAINT "ReminderUnsubscribe_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
