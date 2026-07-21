import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  const email = req.nextUrl.searchParams.get("email");

  if (!shop || !email) {
    return new NextResponse("Missing shop or email", { status: 400 });
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return new NextResponse("Store not found", { status: 404 });
  }

  await db.reminderUnsubscribe.upsert({
    where: { shopId_customerEmail: { shopId: shopRecord.id, customerEmail: email } },
    update: {},
    create: { shopId: shopRecord.id, customerEmail: email },
  });

  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <body style="font-family:sans-serif;max-width:400px;margin:80px auto;text-align:center;color:#333;">
        <p style="font-size:32px;">✓</p>
        <h2>You've been unsubscribed</h2>
        <p style="color:#666;">You won't receive any more review reminder emails from this store.</p>
      </body>
    </html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
