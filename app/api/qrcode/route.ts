import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

// GET /api/qrcode?shop=...
// GET /api/qrcode?shop=...&productId=...&productTitle=...&productImage=...
//
// Without productId: generates ONE generic QR for the whole store — the
// recommended option for packaging, since printing a different QR per
// product doesn't scale. Scanning it asks the customer for their email,
// looks up what they bought, then shows the review flow for that.
//
// With productId: generates a QR for one specific product (skips the
// email step) — useful for a thank-you page shown right after checkout,
// where the product is already known.
export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  const productId = req.nextUrl.searchParams.get("productId");
  const productTitle = req.nextUrl.searchParams.get("productTitle") || "";
  const productImage = req.nextUrl.searchParams.get("productImage") || "";

  if (!shop) {
    return NextResponse.json({ error: "Missing shop" }, { status: 400 });
  }

  const reviewUrl = new URL(`${process.env.HOST}/review`);
  reviewUrl.searchParams.set("shop", shop);
  if (productId) {
    reviewUrl.searchParams.set("productId", productId);
    reviewUrl.searchParams.set("productTitle", productTitle);
    if (productImage) reviewUrl.searchParams.set("productImage", productImage);
  }

  const pngBuffer = await QRCode.toBuffer(reviewUrl.toString(), {
    type: "png",
    width: 600,
    margin: 2,
  });

  return new NextResponse(new Uint8Array(pngBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
