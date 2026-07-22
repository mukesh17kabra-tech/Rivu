-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "rangeColor" TEXT NOT NULL DEFAULT '#f5b400',
ADD COLUMN     "reviewTextAlign" TEXT NOT NULL DEFAULT 'left',
ADD COLUMN     "reviewTextSize" INTEGER NOT NULL DEFAULT 14;
