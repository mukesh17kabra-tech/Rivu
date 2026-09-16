import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/require-session";
import { db, withSchemaHeal } from "@/lib/db";
import { resolveProductHandle } from "@/lib/product-handle";

/**
 * Fills in the missing storefront handles on reviews already saved.
 *
 * Every "View product" link in Rivu is /products/<handle>, and Shopify has no
 * equivalent route by numeric id. Only the product-page widget ever sent a
 * handle, so reviews collected by QR code or review-request email — and every
 * imported review — show their product's name as dead text and can never link
 * to it. Submissions now resolve their own handle, but that does nothing for
 * what is already in the table.
 *
 * Merchant-triggered rather than automatic. It writes to their reviews and
 * spends their Admin API budget, so it happens when they ask, and reports
 * exactly what it changed.
 *
 * Bounded per call: a store with thousands of reviews runs it more than once
 * rather than risking a function timeout halfway through. The response says
 * how many are left so the caller knows to come back.
 */
const BATCH = 200;

export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const shop = body?.shop as string | undefined;
  if (String(shop).trim().toLowerCase() !== auth.shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shopRecord = await withSchemaHeal(() =>
    db.shop.findUnique({ where: { shopDomain: auth.shop } })
  );
  if (!shopRecord) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const missing = await withSchemaHeal(() =>
    db.review.findMany({
      where: { shopId: shopRecord.id, productHandle: null },
      select: { id: true, productId: true },
      take: BATCH,
    })
  );

  /**
   * One lookup per product, not per review.
   *
   * Thirty reviews of the same product is one Admin API call. resolveProductHandle
   * caches too, but grouping here keeps the work obvious and bounds it to the
   * number of distinct products even if that cache is cold.
   */
  const byProduct = new Map<string, string[]>();
  for (const r of missing) {
    const list = byProduct.get(r.productId) ?? [];
    list.push(r.id);
    byProduct.set(r.productId, list);
  }

  let updated = 0;
  let unresolved = 0;

  for (const [productId, reviewIds] of byProduct) {
    const handle = await resolveProductHandle(auth.shop, productId);
    if (!handle) {
      // Deleted product, or a product id that was never a Shopify id — an
      // import that carried someone else's identifiers, for instance. Left
      // alone rather than guessed at.
      unresolved += reviewIds.length;
      continue;
    }
    const result = await withSchemaHeal(() =>
      db.review.updateMany({
        where: { id: { in: reviewIds } },
        data: { productHandle: handle },
      })
    );
    updated += result.count;
  }

  const remaining = await withSchemaHeal(() =>
    db.review.count({ where: { shopId: shopRecord.id, productHandle: null } })
  );

  return NextResponse.json({
    success: true,
    checked: missing.length,
    updated,
    unresolved,
    // Anything still missing after this run either failed to resolve or did
    // not fit in the batch; the caller can tell which by running it again.
    remaining,
  });
}
