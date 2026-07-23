-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "filterBgColor" TEXT NOT NULL DEFAULT '#ffffff',
ADD COLUMN     "filterBorderColor" TEXT NOT NULL DEFAULT 'rgba(0,0,0,0.08)',
ADD COLUMN     "filterTextColor" TEXT NOT NULL DEFAULT '#999999',
ADD COLUMN     "reviewBodyColor" TEXT NOT NULL DEFAULT '#333333',
ADD COLUMN     "reviewCardFontSize" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "reviewCountFontSize" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "reviewMetaColor" TEXT NOT NULL DEFAULT '#999999',
ADD COLUMN     "reviewTitleColor" TEXT NOT NULL DEFAULT '#111111',
ADD COLUMN     "sortBgColor" TEXT NOT NULL DEFAULT '#ffffff',
ADD COLUMN     "sortBorderColor" TEXT NOT NULL DEFAULT '#dddddd',
ADD COLUMN     "sortTextColor" TEXT NOT NULL DEFAULT '#333333';
