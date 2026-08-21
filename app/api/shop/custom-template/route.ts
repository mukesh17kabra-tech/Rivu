import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, withDbRetry } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { runAutoMigrations } from "@/lib/db-migrate";
import { sanitiseTemplate } from "@/lib/widget-template";
import { prepareCustomCss } from "@/lib/widget-css";
import { customTemplateAllowed } from "@/lib/design-options";

const schema = z.object({
  shop: z.string().min(1),
  customTemplateEnabled: z.boolean(),
  customTemplateHtml: z.string().max(30000),
  customTemplateCss: z.string().max(30000).optional(),
});

/**
 * Saves a Pro merchant's custom widget layout.
 *
 * Its own route rather than a few more fields on /api/shop/design, because
 * that endpoint replaces every design field it receives — a partial post there
 * resets the rest to defaults. Keeping the template separate means saving a
 * layout can't wipe someone's colours.
 */
export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (parsed.data.shop.trim().toLowerCase() !== auth.shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await withDbRetry(() => runAutoMigrations());

  const record = await db.shop.findUnique({
    where: { shopDomain: auth.shop },
    select: { plan: true },
  });
  if (!record) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  // Checked server-side, not just hidden in the UI — the endpoint is reachable
  // directly by anyone holding a valid session token for the shop.
  if (!customTemplateAllowed(record.plan)) {
    return NextResponse.json(
      { error: "Custom layouts are available on the Pro plan." },
      { status: 403 }
    );
  }

  // Stored sanitised so the database never holds markup we would refuse to
  // serve. The storefront sanitises again before rendering.
  const { html, removed } = sanitiseTemplate(parsed.data.customTemplateHtml);
  // Scoped as well as sanitised, so what's stored is already safe to serve.
  const { css, removed: cssRemoved } = prepareCustomCss(
    parsed.data.customTemplateCss ?? ""
  );

  await db.shop.update({
    where: { shopDomain: auth.shop },
    data: {
      customTemplateEnabled: parsed.data.customTemplateEnabled,
      customTemplateHtml: html || null,
      customTemplateCss: css || null,
    },
  });

  // Returning what was actually stored keeps the editor honest: it shows the
  // merchant the saved version rather than what they typed.
  return NextResponse.json({
    success: true,
    customTemplateHtml: html,
    customTemplateCss: css,
    removed: [...removed, ...cssRemoved],
  });
}
