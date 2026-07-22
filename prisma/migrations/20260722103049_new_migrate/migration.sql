-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "reviewTitle" TEXT;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "splitSummary" BOOLEAN NOT NULL DEFAULT false;
