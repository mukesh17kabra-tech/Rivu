-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "emailBodyTemplate" TEXT NOT NULL DEFAULT 'Hi {{first_name}},

Thank you for your recent order. We''d love to hear your feedback!

Leave a review here: {{review_link}}

Thanks,
{{shop_name}}',
ADD COLUMN     "emailSubject" TEXT NOT NULL DEFAULT 'How did you like your purchase?';
