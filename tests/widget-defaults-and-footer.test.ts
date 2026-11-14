import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

import { renderBadgePreview } from "@/lib/badge-template";

/**
 * Reported from a live product page: the rating badge rendered five bare stars
 * with nothing beside them, which reads as decoration rather than a rating.
 *
 * The badge template was always merchant-editable (Widget settings → Rating
 * Badge); the problem was only its *default*, '{rating}'. That default lives
 * in four places that cannot see each other — the Prisma schema, the runtime
 * ADD COLUMN migration, the storefront script's fallback, and the existing
 * rows in Postgres — so it is exactly the kind of value that gets changed in
 * one of them and quietly stays old everywhere else.
 */

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

/** The stars, the score, the count. Not stars alone. */
const DEFAULT_TEMPLATE = "{rating} {average} · {count}";

describe("the rating badge default", () => {
  it("shows text beside the stars, not stars alone", () => {
    expect(DEFAULT_TEMPLATE).not.toBe("{rating}");
    const rendered = renderBadgePreview(DEFAULT_TEMPLATE, {
      average: 4.4,
      total: 128,
    });
    // Something readable has to survive rendering, or the complaint stands.
    expect(rendered).toContain("4.4");
    expect(rendered).toContain("128");
  });

  it("is the default in the Prisma schema", () => {
    expect(read("prisma/schema.prisma")).toContain(
      `ratingBadgeTemplate String @default("${DEFAULT_TEMPLATE}")`
    );
  });

  it("is the default the runtime migration gives the column", () => {
    const migrate = read("lib/db-migrate.ts");
    expect(migrate).toContain(
      `ADD COLUMN IF NOT EXISTS "ratingBadgeTemplate" TEXT NOT NULL DEFAULT '${DEFAULT_TEMPLATE}'`
    );
    expect(migrate).toContain(
      `ALTER COLUMN "ratingBadgeTemplate" SET DEFAULT '${DEFAULT_TEMPLATE}'`
    );
  });

  it("reaches shops that already exist, not only new installs", () => {
    // ADD COLUMN IF NOT EXISTS never revisits existing rows, so without this
    // backfill every current merchant keeps the bare stars they complained
    // about. Scoped to the old default so typed-in wording is left alone.
    expect(read("lib/db-migrate.ts")).toContain(
      `UPDATE "Shop" SET "ratingBadgeTemplate" = '${DEFAULT_TEMPLATE}' WHERE "ratingBadgeTemplate" = '{rating}'`
    );
  });

  it("is also the storefront script's fallback when the API sends none", () => {
    const badge = read("extensions/rivu-reviews/assets/rivu-rating-badge.js");
    expect(badge).toContain(
      `data.ratingBadgeTemplate || '${DEFAULT_TEMPLATE}'`
    );
    expect(badge).not.toContain(`data.ratingBadgeTemplate || '{rating}'`);
  });

  it("stays editable from the app", () => {
    // The whole point of changing a default rather than hard-coding the text.
    const form = read("components/RatingBadgeForm.tsx");
    expect(form).toContain("ratingBadgeTemplate: template");
    expect(read("app/api/shop/rating-badge/route.ts")).toContain(
      "ratingBadgeTemplate"
    );
  });
});

/**
 * The Free-plan widget footer. Both copies of the widget script carry it:
 * extensions/ ships through the Shopify CDN on `shopify app deploy`, public/
 * is the script-tag embed served by Vercel. Changing one and not the other is
 * the recurring mistake with this pair.
 */
const WIDGET_COPIES = [
  "extensions/rivu-reviews/assets/rivu-widget.js",
  "public/widget.js",
];

describe("the Free-plan footer", () => {
  for (const rel of WIDGET_COPIES) {
    describe(rel, () => {
      const src = read(rel);

      it("reads '✦ AI powered · Powered by Rivu'", () => {
        expect(src).toContain("&#10022; AI powered &middot; Powered by ");
      });

      it("still links only the word Rivu", () => {
        expect(src).toContain(
          `>Rivu</a>`
        );
      });

      it("is still gated to the Free plan", () => {
        // Pro pays for the branding to disappear; the new wording must not
        // bring it back for them.
        expect(src).toContain(`const poweredBy = plan === "free"`);
      });
    });
  }
});

describe("bottom spacing", () => {
  // The empty space under the widget is the theme section's own padding,
  // which the app cannot read or change. A negative margin is the only lever,
  // so the range has to actually allow negatives at every layer.
  it("is accepted as a negative value by the design API", () => {
    expect(read("app/api/shop/design/route.ts")).toContain(
      `num("bottomSpacing", 0, -80, 120)`
    );
  });

  it("has a slider that can go below zero", () => {
    const form = read("components/DesignForm.tsx");
    expect(form).toContain("bottomSpacing: number;");
    expect(form).toContain("min={-80}");
  });

  it("is applied as margin-bottom by both widget copies", () => {
    for (const rel of WIDGET_COPIES) {
      expect(read(rel), rel).toContain(
        "margin-bottom:${Number(design.bottomSpacing) || 0}px"
      );
    }
  });

  it("survives an API response that predates the column", () => {
    // `Number(undefined) || 0` rather than a bare interpolation: a cached
    // /api/reviews/list response from before this change would otherwise
    // render "margin-bottom:undefinedpx" and drop the whole declaration.
    for (const rel of WIDGET_COPIES) {
      expect(read(rel), rel).not.toContain(
        "margin-bottom:${design.bottomSpacing}px"
      );
    }
  });
});
