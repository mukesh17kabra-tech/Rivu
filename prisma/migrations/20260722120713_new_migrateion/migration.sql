-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "headingAlign" TEXT NOT NULL DEFAULT 'left',
ADD COLUMN     "headingBold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "headingFontSize" INTEGER NOT NULL DEFAULT 11,
ADD COLUMN     "letCustomerPickLanguage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ratingBadgeTemplate" TEXT NOT NULL DEFAULT '{rating} rating for this product',
ADD COLUMN     "showBorder" BOOLEAN NOT NULL DEFAULT true;
