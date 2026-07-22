"use client";

import { useState } from "react";
import { DesignForm } from "@/components/DesignForm";
import { RewardForm } from "@/components/RewardForm";
import { ReminderForm } from "@/components/ReminderForm";
import { LogoUpload } from "@/components/LogoUpload";

type ShopSettings = {
  plan: string;
  displayStyle: "list" | "grid" | "carousel" | "split";
  gridColumns: number;
  carouselVisible: number;
  arrowColor: string;
  primaryColor: string;
  starColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontFamily: string;
  formAlign: "left" | "center" | "right";
  formMaxWidth: number;
  widgetMaxWidth: number;
  widgetTitle: string;
  topSpacing: number;
  showSuggestionsOnWebsite: boolean;
  showSuggestionsOnQr: boolean;
  suggestionLanguage: string;
  rewardEnabled: boolean;
  rewardType: "percentage" | "fixed_amount";
  rewardValue: number;
  reminderEnabled: boolean;
  reminderDelayDays: number;
  fromEmail: string;
  emailSubject: string;
  emailBodyTemplate: string;
  logoUrl: string;
  logoSize: number;
};

const TABS = [
  { key: "installation", label: "Installation" },
  { key: "widget", label: "Widget Settings" },
  { key: "email", label: "Email Requests" },
] as const;

export function SettingsTabs({
  shop,
  initialTab,
  shopRecord,
}: {
  shop: string;
  host?: string | null;
  initialTab: string;
  shopRecord: ShopSettings;
}) {
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02]">
      <div className="flex border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-emerald-400 text-white"
                : "border-transparent text-white/50 hover:text-white/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "installation" && <InstallationTab shop={shop} />}

        {tab === "widget" && (
          <div className="space-y-8">
            <DesignForm
              shop={shop}
              initial={{
                displayStyle: shopRecord.displayStyle,
                gridColumns: shopRecord.gridColumns,
                carouselVisible: shopRecord.carouselVisible,
                arrowColor: shopRecord.arrowColor,
                primaryColor: shopRecord.primaryColor,
                starColor: shopRecord.starColor,
                backgroundColor: shopRecord.backgroundColor,
                textColor: shopRecord.textColor,
                borderRadius: shopRecord.borderRadius,
                fontFamily: shopRecord.fontFamily,
                formAlign: shopRecord.formAlign,
                formMaxWidth: shopRecord.formMaxWidth,
                widgetMaxWidth: shopRecord.widgetMaxWidth,
                widgetTitle: shopRecord.widgetTitle,
                topSpacing: shopRecord.topSpacing,
                showSuggestionsOnWebsite: shopRecord.showSuggestionsOnWebsite,
                showSuggestionsOnQr: shopRecord.showSuggestionsOnQr,
                suggestionLanguage: shopRecord.suggestionLanguage,
              }}
            />
            <div className="border-t border-white/10 pt-8">
              <LogoUpload
                shop={shop}
                initialLogoUrl={shopRecord.logoUrl}
                initialLogoSize={shopRecord.logoSize}
              />
            </div>
          </div>
        )}

        {tab === "email" && (
          <div className="space-y-10">
            <ReminderForm
              shop={shop}
              initial={{
                reminderEnabled: shopRecord.reminderEnabled,
                reminderDelayDays: shopRecord.reminderDelayDays,
                fromEmail: shopRecord.fromEmail,
                emailSubject: shopRecord.emailSubject,
                emailBodyTemplate: shopRecord.emailBodyTemplate,
              }}
            />
            <div className="border-t border-white/10 pt-8">
              <h3 className="mb-1 text-sm font-semibold text-white">Review reward (optional)</h3>
              <p className="mb-4 text-xs text-white/50">
                Offer a discount code automatically to anyone who leaves a review.
              </p>
              <RewardForm
                shop={shop}
                initial={{
                  rewardEnabled: shopRecord.rewardEnabled,
                  rewardType: shopRecord.rewardType,
                  rewardValue: shopRecord.rewardValue,
                }}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function InstallationTab({ shop }: { shop: string }) {
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
    </div>
  );
}
