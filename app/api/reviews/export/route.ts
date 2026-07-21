import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  if (!shop) {
    return NextResponse.json({ error: "Missing shop" }, { status: 400 });
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const reviews = await db.review.findMany({
    where: { shopId: shopRecord.id },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "productId",
    "productTitle",
    "rating",
    "body",
    "customerName",
    "photoUrl",
    "approved",
    "createdAt",
  ];

  const escapeCell = (val: string) => `"${val.replace(/"/g, '""')}"`;

  const rows = reviews.map(
    (r: {
      productId: string;
      productTitle: string;
      rating: number;
      body: string;
      customerName: string;
      photoUrl: string | null;
      approved: boolean;
      createdAt: Date;
    }) =>
      [
        r.productId,
        r.productTitle,
        String(r.rating),
        r.body,
        r.customerName,
        r.photoUrl || "",
        String(r.approved),
        r.createdAt.toISOString(),
      ]
        .map(escapeCell)
        .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="rivu-reviews-${shop}.csv"`,
    },
  });
}
