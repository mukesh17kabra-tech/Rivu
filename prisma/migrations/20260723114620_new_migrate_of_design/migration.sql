-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "recommends" BOOLEAN;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "ratingBadgeStarSize" INTEGER NOT NULL DEFAULT 16;
