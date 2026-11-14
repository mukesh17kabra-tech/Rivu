import { appUrl } from "@/lib/app-url";

/**
 * Copy-paste install for themes that don't support app blocks.
 *
 * Kept behind a disclosure rather than laid out in full: almost every store on
 * a current theme should use the gallery above, and a page that opens on raw
 * Liquid tells a merchant this app is going to be work.
 *
 * The snippets now carry the app's real domain. They used to say
 * YOUR-APP-DOMAIN.vercel.app, which is only a placeholder to someone who
 * already knows it is one — anyone who pasted it got a widget that silently
 * never loaded.
 */
export function ManualInstall({ shop }: { shop: string }) {
  const origin = appUrl() || "https://rivu-one.vercel.app";

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold tracking-[-0.01em] text-[#111418]">
            Theme doesn&apos;t support app blocks?
          </h3>
          <p className="mt-1 text-[13px] text-black/48">
            Older and heavily customised themes have no &ldquo;Add block&rdquo; slot. Paste this
            into your Liquid instead.
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-emerald-700 group-open:hidden">
          Show →
        </span>
        <span className="hidden shrink-0 text-xs font-semibold text-black/45 group-open:inline">
          Hide
        </span>
      </summary>

      <div className="mt-6 space-y-7 border-t border-black/[0.08] pt-6">
        <div>
          <h4 className="mb-2 text-sm font-semibold text-[#111418]">Full reviews widget</h4>
          <p className="mb-3 text-[13px] text-black/50">
            Paste into your product template, where you want the reviews to appear.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-black/[0.055] p-4 text-xs leading-relaxed text-black/65">
{`<div id="review-widget"
     data-shop="{{ shop.permanent_domain }}"
     data-product-id="{{ product.id }}"
     data-product-title="{{ product.title | escape }}"
     data-product-image="{{ product.featured_image | image_url: width: 800 }}">
</div>
<script src="${origin}/widget.js" async></script>`}
          </pre>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-[#111418]">Rating badge on product cards</h4>
          <p className="mb-3 text-[13px] text-black/50">
            Paste inside your product card snippet — usually{" "}
            <code className="rounded bg-black/[0.05] px-1 py-0.5 text-emerald-700">
              card-product.liquid
            </code>
            .
          </p>
          <pre className="overflow-x-auto rounded-lg bg-black/[0.055] p-4 text-xs leading-relaxed text-black/65">
{`<div class="rivu-rating-badge"
     data-shop="{{ shop.permanent_domain }}"
     data-product-id="{{ product.id }}"
     data-api-base="${origin}">
</div>`}
          </pre>
          <p className="mt-2 text-[11px] text-black/42">
            The badge script comes from the App Embed, so enable that first or this renders
            nothing.
          </p>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-[#111418]">Store-wide reviews anywhere</h4>
          <p className="mb-3 text-[13px] text-black/50">
            Reviews from across your store, on any page. Swap <code className="text-emerald-700">layout</code>{" "}
            for <code className="text-emerald-700">grid</code>,{" "}
            <code className="text-emerald-700">carousel</code>,{" "}
            <code className="text-emerald-700">wall</code>,{" "}
            <code className="text-emerald-700">quotes</code>,{" "}
            <code className="text-emerald-700">trust</code> or{" "}
            <code className="text-emerald-700">gallery</code>.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-black/[0.055] p-4 text-xs leading-relaxed text-black/65">
{`<div data-rivu-showcase
     data-shop="{{ shop.permanent_domain }}"
     data-api-base="${origin}"
     data-layout="grid"
     data-columns="3"
     data-limit="12">
</div>
<script src="${origin}/rivu-showcase.js" async></script>`}
          </pre>
        </div>

        <p className="text-[12px] text-black/42">
          Stuck on your theme? Send us the theme name from{" "}
          <a
            href={`https://${shop}/admin/themes`}
            target="_top"
            className="text-emerald-700 underline underline-offset-2"
          >
            Online Store → Themes
          </a>{" "}
          and we&apos;ll send back the exact snippet and where it goes.
        </p>
      </div>
    </details>
  );
}
