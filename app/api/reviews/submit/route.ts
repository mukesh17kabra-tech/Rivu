import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { createReviewRewardDiscount } from "@/lib/shopify";

const schema = z.object({
  shop: z.string().min(1),
  productId: z.string().min(1),
  productTitle: z.string().min(1),
  // Empty string (e.g. a product with no image) should be treated as
  // "not provided", not as an invalid URL. Shopify's Liquid image_url
  // filter often returns protocol-relative URLs (starting with "//" with
  // no "https:" prefix) — the URL validator rejects those, so we add the
  // protocol back before validating.
  productImageUrl: z.preprocess(
    (val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      if (typeof val === "string" && val.startsWith("//")) return `https:${val}`;
      return val;
    },
    z.string().url().optional()
  ),
  rating: z.number().int().min(1).max(5),
  reviewTitle: z.preprocess((val) => (val === "" ? undefined : val), z.string().max(150).optional()),
  body: z.string().min(10).max(2000),
  customerName: z.string().min(1).max(100),
  // Optional — used only to prevent a second reminder email once someone
  // has reviewed, not required for the review itself.
  customerEmail: z.preprocess((val) => (val === "" ? undefined : val), z.string().email().optional()),
  // Either a real URL or a base64 data URI (data:image/...) from the
  // storefront's photo upload input.
  photoUrl: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z
      .string()
      .refine((val) => val.startsWith("http") || val.startsWith("data:image/"), {
        message: "photoUrl must be a URL or an image data URI",
      })
      .optional()
  ),
  // Same pattern as photoUrl but for video data URIs (data:video/...).
  videoUrl: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z
      .string()
      .refine((val) => val.startsWith("http") || val.startsWith("data:video/"), {
        message: "videoUrl must be a URL or a video data URI",
      })
      .optional()
  ),
});

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    console.error("[reviews/submit] Validation failed. Raw body:", JSON.stringify(body));
    console.error("[reviews/submit] Zod errors:", JSON.stringify(parsed.error.flatten()));
    return withCors(
      NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    );
  }

  const { shop, ...data } = parsed.data;

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return withCors(NextResponse.json({ error: "Shop not found / app not installed" }, { status: 404 }));
  }

  // New reviews always start unapproved — merchant must approve in the
  // dashboard before they show publicly or become eligible for UGC cards.
  await db.review.create({
    data: { shopId: shopRecord.id, approved: false, ...data },
  });

  // Prevent further reminder emails for this product once this email has
  // reviewed it — even if their review was for a different order of the
  // same product.
  if (data.customerEmail) {
    await db.pendingReviewRequest.updateMany({
      where: {
        shopId: shopRecord.id,
        productId: data.productId,
        customerEmail: data.customerEmail,
        reviewed: false,
      },
      data: { reviewed: true },
    });
  }

  // Optional: reward the reviewer with a one-time discount code
  // immediately, regardless of approval status — the review itself is
  // genuine regardless of whether it ends up published.
  let discountCode: string | undefined;
  if (shopRecord.rewardEnabled) {
    try {
      discountCode = await createReviewRewardDiscount(shop, shopRecord.accessToken, {
        type: shopRecord.rewardType as "percentage" | "fixed_amount",
        value: shopRecord.rewardValue,
      });
    } catch (err) {
      console.error(`[reviews/submit] Failed to create reward discount for ${shop}:`, err);
      // Don't fail the whole review submission just because the reward
      // discount couldn't be created — the review itself still saved fine.
    }
  }

  return withCors(NextResponse.json({ success: true, discountCode }));
}
