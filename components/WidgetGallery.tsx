import {
  PreviewAppEmbed,
  PreviewReviews,
  PreviewRatingBadge,
  PreviewRatingStrip,
  PreviewGrid,
  PreviewCarousel,
  PreviewWall,
  PreviewTestimonials,
  PreviewPhotoReviews,
  PreviewPhotoGallery,
  PreviewTrustBadge,
} from "./WidgetPreview";

/**
 * Every storefront widget Rivu ships, shown as a gallery.
 *
 * Rivu had eleven theme blocks and a page that described three of them in
 * prose. A merchant could not find the other eight, and could not picture any
 * of them — so the app looked like it did less than it does. This page is the
 * inventory, with a picture of each.
 *
 * The buttons open the theme editor on the template each block belongs to,
 * rather than using Shopify's `addAppBlockId` deep link. That parameter needs
 * the theme app extension's UUID to be exactly right; ours is currently
 * malformed (the last segment is twenty characters, not twelve), and a deep
 * link that resolves to nothing drops the merchant into an editor with no
 * explanation. Opening the right template and naming the block is slower by
 * one click and always works.
 */

type Widget = {
  key: string;
  /** Exactly as it appears in the theme editor's block list. */
  blockName: string;
  tagline: string;
  /** What it is for, in the merchant's terms, not ours. */
  detail: string;
  where: string;
  template: "product" | "index" | "collection" | "embed";
  pro?: boolean;
};

const WIDGETS = [
  {
    key: "reviews",
    blockName: "Rivu Reviews",
    tagline: "The main review section",
    detail:
      "Average rating, the star breakdown bars, every review, and the write-a-review form. This is the block most stores start with.",
    where: "Product page, below the description",
    template: "product",
  },
  {
    key: "rating-badge",
    blockName: "Rivu Rating Badge",
    tagline: "Stars under the product title",
    detail:
      "A compact star line and review count. Clicking it scrolls the shopper down to the full reviews, so the rating near the buy button actually leads somewhere.",
    where: "Product page under the title, and inside collection cards",
    template: "product",
  },
  {
    key: "rating-strip",
    blockName: "Rivu Rating Strip",
    tagline: "Store rating in one line",
    detail:
      "Your whole store's average rating and review count on a single line — the Trustpilot-style strip. Good directly under a header or above the footer.",
    where: "Any page",
    template: "index",
  },
  {
    key: "reviews-grid",
    blockName: "Rivu Reviews Grid",
    tagline: "Reviews in even columns",
    detail:
      "Reviews from across your store in a tidy grid. Set the column count in the theme editor; it drops to one column on a phone.",
    where: "Home page or a dedicated reviews page",
    template: "index",
  },
  {
    key: "reviews-carousel",
    blockName: "Rivu Reviews Carousel",
    tagline: "Reviews that scroll",
    detail:
      "A sliding row of reviews with arrows. Shows social proof without giving up half the page to it.",
    where: "Home page, between sections",
    template: "index",
  },
  {
    key: "reviews-wall",
    blockName: "Rivu Reviews Wall",
    tagline: "A masonry wall",
    detail:
      "Reviews packed into uneven columns, so long and short reviews sit together without gaps. Best when you have a lot of them.",
    where: "A dedicated reviews page",
    template: "index",
  },
  {
    key: "testimonials",
    blockName: "Rivu Testimonials",
    tagline: "Large pull quotes",
    detail:
      "One review at a time, set large and centred like a quote. Use it for your best few rather than all of them.",
    where: "Home page or a landing page",
    template: "index",
  },
  {
    key: "photo-reviews",
    blockName: "Rivu Photo Reviews",
    tagline: "Reviews that have photos",
    detail:
      "Only shows reviews a customer attached a picture to. Photos are the reviews shoppers trust most, so this puts them first.",
    where: "Home page or product page",
    template: "index",
  },
  {
    key: "photo-gallery",
    blockName: "Rivu Photo Gallery",
    tagline: "A wall of customer photos",
    detail:
      "Customer photos tiled edge to edge. Clicking one opens the full review beside the picture, with a link straight to the product in it.",
    where: "Home page or a dedicated gallery page",
    template: "index",
    pro: true,
  },
  {
    key: "trust-badge",
    blockName: "Rivu Trust Badge",
    tagline: "A small badge of proof",
    detail:
      "Your rating and review count in a compact badge, with your own wording. Sits well next to a footer or near the add-to-cart button.",
    where: "Footer, or beside the buy button",
    template: "index",
  },
] as const satisfies readonly Widget[];

const TEMPLATE_LABEL: Record<Widget["template"], string> = {
  product: "Product page editor",
  index: "Home page editor",
  collection: "Collection page editor",
  embed: "App embeds",
};

function editorUrl(shop: string, template: Widget["template"]) {
  const base = `https://${shop}/admin/themes/current/editor`;
  if (template === "embed") return `${base}?template=product&context=apps`;
  return `${base}?template=${template}`;
}

/**
 * Keyed off the widget list itself, so adding a twelfth block without drawing
 * a preview for it is a compile error rather than an empty card in the grid.
 */
const PREVIEWS: Record<(typeof WIDGETS)[number]["key"], React.ReactNode> = {
  reviews: <PreviewReviews />,
  "rating-badge": <PreviewRatingBadge />,
  "rating-strip": <PreviewRatingStrip />,
  "reviews-grid": <PreviewGrid />,
  "reviews-carousel": <PreviewCarousel />,
  "reviews-wall": <PreviewWall />,
  testimonials: <PreviewTestimonials />,
  "photo-reviews": <PreviewPhotoReviews />,
  "photo-gallery": <PreviewPhotoGallery />,
  "trust-badge": <PreviewTrustBadge />,
};

export function WidgetGallery({ shop, plan }: { shop: string; plan: string }) {
  const isPro = plan === "pro" || plan === "growth";
  const designHref = `/dashboard/widget-settings?shop=${encodeURIComponent(shop)}`;

  return (
    <div className="space-y-6">
      {/* The embed is not one widget among eleven — nothing below works until
          it is on, so it gets its own row rather than a card in the grid. */}
      <section className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-5">
        <div className="flex flex-wrap items-center gap-5">
          <div className="w-[200px] shrink-0">
            <PreviewAppEmbed />
          </div>
          <div className="min-w-[220px] flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-300">
              Turn this on first
            </p>
            <h3 className="mt-1 text-[17px] font-bold tracking-[-0.01em] text-white">
              Rivu App Embed
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">
              Loads the Rivu script on your storefront. Every widget below stays
              blank until this is enabled — it only has to be done once, and it
              adds nothing visible on its own.
            </p>
            <a
              href={editorUrl(shop, "embed")}
              target="_top"
              className="mt-3.5 inline-block rounded-md bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-black transition-colors hover:bg-emerald-300"
            >
              Open App Embeds →
            </a>
          </div>
        </div>
      </section>

      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="text-[15px] font-bold tracking-[-0.01em] text-white">
            {WIDGETS.length} widgets you can add
          </h3>
          <p className="text-xs text-white/35">
            Add from the theme editor, style them here in Rivu.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {WIDGETS.map((w) => {
            // `in` rather than `w.pro`: the list is `as const`, so entries
            // without the field genuinely do not have it.
            const pro = "pro" in w && w.pro === true;
            const locked = pro && !isPro;
            return (
              <article
                key={w.key}
                className="flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025]"
              >
                <div className="p-2.5 pb-0">{PREVIEWS[w.key]}</div>

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-[14px] font-bold tracking-[-0.01em] text-white">
                      {w.blockName}
                    </h4>
                    {pro && (
                      <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-amber-300">
                        Pro
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] font-medium text-emerald-300/80">
                    {w.tagline}
                  </p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-white/50">{w.detail}</p>

                  <p className="mt-3 text-[11px] text-white/30">
                    <span className="font-semibold text-white/45">Goes on:</span> {w.where}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                    {locked ? (
                      <a
                        href={`/dashboard/plans?shop=${encodeURIComponent(shop)}`}
                        className="rounded-md bg-amber-400 px-3 py-1.5 text-[12.5px] font-semibold text-black transition-colors hover:bg-amber-300"
                      >
                        Upgrade to use
                      </a>
                    ) : (
                      <a
                        href={editorUrl(shop, w.template)}
                        target="_top"
                        className="rounded-md bg-white px-3 py-1.5 text-[12.5px] font-semibold text-black transition-colors hover:bg-white/90"
                      >
                        Add to theme →
                      </a>
                    )}
                    <a
                      href={designHref}
                      className="rounded-md border border-white/15 px-3 py-1.5 text-[12.5px] font-semibold text-white/75 transition-colors hover:border-white/30 hover:text-white"
                    >
                      Customize
                    </a>
                  </div>

                  <p className="mt-2.5 text-[11px] leading-relaxed text-white/25">
                    Opens {TEMPLATE_LABEL[w.template]} — choose{" "}
                    <span className="text-white/40">Add block → Apps → {w.blockName}</span>
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
