export function InstallationContent({ shop }: { shop: string }) {
  const themeEditorUrl = `https://${shop}/admin/themes/current/editor?template=product`;
  const collectionEditorUrl = `https://${shop}/admin/themes/current/editor?template=collection`;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-white">Step 1 — Enable the App Embed</h3>
        <p className="mb-3 text-sm text-white/60">
          Required first. Loads the Rivu widget script globally across your store — only needed once.
        </p>
        <a
          href={`${themeEditorUrl}&context=apps`}
          target="_top"
          className="inline-block rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-300"
        >
          Open App Embeds →
        </a>
      </div>

      <div className="border-t border-white/10 pt-8">
        <h3 className="mb-2 text-sm font-semibold text-white">Step 2 — Full Reviews Widget (Product Page)</h3>
        <p className="mb-3 text-sm text-white/60">
          The main review section — shows average rating, star breakdown bars, review cards, and the
          "Write a Review" form. Add the <strong className="text-white">Rivu Reviews</strong> block
          to your product page template.
        </p>
        <a
          href={themeEditorUrl}
          target="_top"
          className="inline-block rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90"
        >
          Add to Product Page →
        </a>
      </div>

      <div className="border-t border-white/10 pt-8">
        <h3 className="mb-2 text-sm font-semibold text-white">Step 3 — Star Badge near Product Title</h3>
        <p className="mb-3 text-sm text-white/60">
          Shows compact stars and review count right below the product title — clicking it
          automatically scrolls the customer down to the full review section. Add the{" "}
          <strong className="text-white">Rivu Rating Badge</strong> block near your product title in
          the theme editor. Star size and text are customizable from{" "}
          <a href={`/dashboard/widget-settings?shop=${shop}`} className="text-emerald-400 underline">
            Widget Settings
          </a>.
        </p>
        <a
          href={themeEditorUrl}
          target="_top"
          className="inline-block rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90"
        >
          Add Rating Badge to Product Page →
        </a>
      </div>

      <div className="border-t border-white/10 pt-8">
        <h3 className="mb-2 text-sm font-semibold text-white">Step 4 — Stars on Collection / Product Cards</h3>
        <p className="mb-3 text-sm text-white/60">
          Shows the star rating on each product card in your collection listings, so shoppers can
          see ratings before clicking into a product. Add the{" "}
          <strong className="text-white">Rivu Rating Badge</strong> block inside your product card
          section in the collection page editor.
        </p>
        <div className="mb-3 rounded-md bg-yellow-400/10 border border-yellow-400/20 px-4 py-3 text-xs text-yellow-200/80">
          <strong>Note:</strong> Collection card app blocks are only supported in themes that use
          the &quot;app block&quot; slot inside product cards (e.g. Dawn 10+, Sense, Craft). If
          your theme doesn&apos;t show an option to add a block inside product cards, use the manual
          Liquid install below.
        </div>
        <a
          href={collectionEditorUrl}
          target="_top"
          className="inline-block rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90"
        >
          Add Stars to Collection Cards →
        </a>
      </div>

      <div className="border-t border-white/10 pt-8">
        <h3 className="mb-2 text-sm font-semibold text-white">Manual install — Full Reviews Widget (advanced)</h3>
        <p className="mb-3 text-sm text-white/60">
          For themes that don&apos;t support app blocks, paste this into your product template
          Liquid file:
        </p>
        <pre className="overflow-x-auto rounded-md bg-black/40 p-4 text-xs text-white/70">
{`<div id="review-widget"
     data-shop="{{ shop.permanent_domain }}"
     data-product-id="{{ product.id }}"
     data-product-title="{{ product.title | escape }}"
     data-product-image="{{ product.featured_image | image_url: width: 800 }}">
</div>
<script src="https://YOUR-APP-DOMAIN.vercel.app/widget.js" async></script>`}
        </pre>
      </div>

      <div className="border-t border-white/10 pt-8">
        <h3 className="mb-2 text-sm font-semibold text-white">Manual install — Rating Badge on Product Cards (advanced)</h3>
        <p className="mb-3 text-sm text-white/60">
          To add the compact star badge inside product card snippets (e.g.{" "}
          <code className="text-emerald-300">card-product.liquid</code>) manually:
        </p>
        <pre className="overflow-x-auto rounded-md bg-black/40 p-4 text-xs text-white/70">
{`<div class="rivu-rating-badge"
     data-shop="{{ shop.permanent_domain }}"
     data-product-id="{{ product.id }}"
     data-api-base="https://YOUR-APP-DOMAIN.vercel.app">
</div>`}
        </pre>
        <p className="mt-2 text-xs text-white/40">
          The badge script is loaded automatically by the App Embed (Step 1). Make sure the App
          Embed is enabled before adding this snippet.
        </p>
      </div>
    </div>
  );
}
