-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "videoUrl" TEXT;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "logoSize" INTEGER NOT NULL DEFAULT 140,
ADD COLUMN     "suggestionLanguage" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "topSpacing" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "widgetTitle" TEXT NOT NULL DEFAULT 'Customer Reviews';
