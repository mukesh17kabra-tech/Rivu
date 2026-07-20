import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

// GET /api/qrcode?shop=...&productId=...&productTitle=...&productImage=...
// Returns a PNG QR code that, when scanned, opens the public review page
// for that exact product. Meant to be printed on a card inside the
// package, or shown on a thank-you screen after checkout.
export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  const productId = req.nextUrl.searchParams.get("productId");
  const productTitle = req.nextUrl.searchParams.get("productTitle") || "";
  const productImage = req.nextUrl.searchParams.get("productImage") || "";

  if (!shop || !productId) {
    return NextResponse.json({ error: "Missing shop or productId" }, { status: 400 });
  }

  const reviewUrl = new URL(`${process.env.HOST}/review`);
  reviewUrl.searchParams.set("shop", shop);
  reviewUrl.searchParams.set("productId", productId);
  reviewUrl.searchParams.set("productTitle", productTitle);
  if (productImage) reviewUrl.searchParams.set("productImage", productImage);

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
