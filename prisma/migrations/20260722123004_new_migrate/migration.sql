-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "backgroundGradient" TEXT,
ADD COLUMN     "borderColor" TEXT NOT NULL DEFAULT '#e0e0e0',
ADD COLUMN     "borderStyle" TEXT NOT NULL DEFAULT 'solid',
ADD COLUMN     "borderWidth" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "primaryGradient" TEXT;
