-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "enabledLanguages" TEXT[] DEFAULT ARRAY['en']::TEXT[],
ADD COLUMN     "formTemplate" TEXT NOT NULL DEFAULT 'basic';

-- AlterTable
ALTER TABLE "SupportMessage" ADD COLUMN     "imageUrl" TEXT;
