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
        <h3 className="mb-2 text-sm font-semibold text-white">Step 2 — Product Page Reviews Widget</h3>
        <p className="mb-3 text-sm text-white/60">
          No code required — opens the theme editor on a product page. Add the &quot;Rivu
          Reviews&quot; block, then hit Save.
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
        <h3 className="mb-2 text-sm font-semibold text-white">
          Step 3 — Star Badge on Collection Pages (optional)
        </h3>
        <p className="mb-3 text-sm text-white/60">
          Shows a compact star rating on every product card in your collections automatically.
        </p>
        <a
          href={collectionEditorUrl}
          target="_top"
          className="inline-block rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90"
        >
          Add to Collection Page →
        </a>
      </div>

      <div className="border-t border-white/10 pt-8">
        <h3 className="mb-2 text-sm font-semibold text-white">Manual install (advanced)</h3>
        <p className="mb-3 text-sm text-white/60">
          For themes that don&apos;t support app blocks, add this to your product template
          directly:
        </p>
        <pre className="overflow-x-auto rounded-md bg-black/40 p-4 text-xs text-white/70">
{`<div id="review-widget"
     data-shop="{{ shop.permanent_domain }}"
     data-product-id="{{ product.id }}"
     data-product-title="{{ product.title | escape }}"
     data-product-image="{{ product.featured_image | image_url: width: 800 }}">
</div>
<script src="https://your-app.vercel.app/widget.js" async></script>`}
        </pre>
      </div>

      <div className="border-t border-yellow-400/20 pt-8">
        <h3 className="mb-2 text-sm font-semibold text-yellow-200">⚠️ Important — after any app update</h3>
        <p className="text-sm text-white/60">
          Pushing code to Vercel updates the app itself, but the theme block&apos;s script
          (loaded from Shopify&apos;s own CDN) only updates when you run{" "}
          <code className="rounded bg-black/40 px-1 py-0.5 text-emerald-300">shopify app deploy</code>{" "}
          from your project folder. If a fix isn&apos;t showing up on your storefront, this is
          usually why — run that command and try again.
        </p>
      </div>
    </div>
  );
}
