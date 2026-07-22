# Rivu — Shopify App

Turns approved customer reviews into ready-to-post social media graphics,
plus a QR-code review-collection flow that makes leaving a review as easy
as scanning a code and tapping a suggestion.

## What's included

### Core review + UGC generation
- `app/api/reviews/submit` — storefront/QR flow posts new reviews here (unapproved by default)
- `app/api/reviews/list` — returns approved reviews + rating breakdown (average, per-star percentages)
- `app/api/reviews/moderate` — merchant approves/rejects from the dashboard
- `app/api/ugc/generate` — generates the actual PNG graphic (2 starter templates)
- `app/dashboard/reviews` — merchant's moderation + UGC generation screen
- `public/widget.js` — drop-in storefront script (review list + rating bar + submission form)

### QR-code review collection
- `app/api/qrcode` — generates a QR PNG for a specific product, linking to its review page
- `app/review` — the public page a QR scan opens: pick a star rating, get
  6-7 pre-written suggestions matching that rating, tap one to prefill the
  textbox (still editable), refresh for a new batch, optional photo upload,
  submit
- `lib/review-suggestions.ts` — the suggestion templates, one pool per
  star rating (1-5) — edit this file to change the wording
- `app/dashboard/qrcodes` — merchant sees all their products with a
  downloadable QR code for each (print on packing slips/thank-you cards)

### Shopify OAuth (ported from the restock-alert-app)
- `app/api/auth`, `app/api/auth/callback` — standard install flow
- `lib/shopify.ts` — OAuth + product listing (used to build the QR code page)

## Setup
1. Create a Neon Postgres project → copy `DATABASE_URL` / `DIRECT_URL`
2. Create a Shopify Partner app → copy `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET`
   — required scopes: `read_products,read_orders`
3. `npm install`
4. `npx prisma migrate dev --name init`
5. Deploy to Vercel, set all env vars from `.env.example`
6. Install on a dev store: `/api/auth?shop=your-store.myshopify.com`
7. Merchant visits `/dashboard/qrcodes?shop=...` to download QR codes per product
8. Merchant visits `/dashboard/reviews?shop=...` to approve reviews + generate UGC cards
9. Add the storefront widget to product templates (shows reviews + rating bar):
   ```liquid
   <div id="review-widget"
        data-shop="{{ shop.permanent_domain }}"
        data-product-id="{{ product.id }}"
        data-product-title="{{ product.title | escape }}"
        data-product-image="{{ product.featured_image | image_url: width: 800 }}">
   </div>
   <script src="https://your-app.vercel.app/widget.js" async></script>
   ```

## How the QR review flow works

⚠️ Same **Protected Customer Data** consideration as the reminder feature
below — looking up a customer's order by email (`getProductsFromOrdersByEmail`
in `lib/shopify.ts`) reads customer order data via the Admin API, which
Shopify may also gate behind the same approval on a live/production store
even though `read_orders` scope is already granted. It may work
unrestricted on development stores during testing. Request Protected
Customer Data access (see the "Automated review reminders" section below
for exact steps) to be safe before relying on this for real merchants.
1. Merchant downloads a QR code for a product from `/dashboard/qrcodes`
   and prints it on a packing slip, thank-you card, or receipt
2. Customer scans it → opens `/review?shop=...&productId=...&productTitle=...`
3. Customer taps a star rating (1-5)
4. App shows 6-7 pre-written suggestions worded appropriately for that
   rating (positive wording for 5-star, more critical wording for 1-2
   star) — pulled from `lib/review-suggestions.ts`
5. Tapping a suggestion fills the textbox — customer can edit it or leave
   as-is; "🔄 Refresh" swaps in a new batch of suggestions if none fit
6. Optional photo upload (resized client-side before sending, so payloads
   stay small)
7. Submit → review is saved as unapproved, waiting for merchant review in
   `/dashboard/reviews`

## Photo storage note
Photos are currently stored as base64 data URIs directly in the database
(`Review.photoUrl`, a `Text` column) — simplest possible setup, no extra
service needed. This is fine at small-to-medium scale but not ideal for
very large photo volumes; if that becomes a bottleneck, swap in a proper
object storage service (e.g. Vercel Blob) and store just the resulting
URL instead.

## "Share to Instagram" (not yet wired in)
Automatic API posting requires Instagram Graph API + Meta Business
verification (same lengthy process as WhatsApp). For a no-review-needed
alternative, add an Instagram Stories deep link on mobile using a free
Facebook App ID (no business verification needed) — see
https://developers.facebook.com/docs/instagram-stories/ for the URL
scheme.

## Adding more UGC templates
Add another `if (template === "...")` branch in
`app/api/ugc/generate/route.tsx` — each is just JSX + inline styles
(Satori, which `@vercel/og` uses, supports a subset of CSS).

## Design customization (Judge.me-style widget theming)

Merchants control the storefront widget's look from `/dashboard/design` —
no code editing needed:

- **Layout**: list (stacked), grid (2-5 columns), or carousel (horizontal scroll)
- **Colors**: primary/CTA color, star color, card background, text color
- **Corner roundness** and **font family**

Settings are stored on the `Shop` row (`displayStyle`, `gridColumns`,
`primaryColor`, `starColor`, `backgroundColor`, `textColor`,
`borderRadius`, `fontFamily`) and read by `/api/reviews/list` alongside
the actual reviews — both `public/widget.js` (standalone script tag) and
`extensions/rivu-reviews/assets/rivu-widget.js` (theme app extension)
apply these settings live, so there's no rebuild/redeploy needed when a
merchant changes their design — it updates the moment they hit Save.

## Rating badge for product cards

A separate, lightweight block — `Rivu Rating Badge` — shows just the
average stars + review count (no form). Add it via **Add block → Apps →
Rivu Rating Badge** on:
- Product card sections (collection/search pages) — shows rating at a
  glance before the customer even opens the product
- The bottom of the product page, if you want the compact version instead
  of (or alongside) the full `Rivu Reviews` block

Uses `/api/reviews/summary` (average + count only, no full review text —
much lighter than the full reviews list, safe to add to every card on a
collection page without a performance hit).

## Review reward (optional discount for reviewers)

Merchants can enable an automatic discount code shown to every customer
right after they submit a review, from `/dashboard/design` → "Review
reward" section:
- Toggle on/off
- Percentage off or fixed-amount off
- Any value

Implementation: `lib/shopify.ts` → `createReviewRewardDiscount()` creates
a one-time-use Shopify discount code (via Price Rule + Discount Code REST
resources) the moment a review is submitted — shown directly on the
"thanks for your review" screen, no email needed. Requires the
`write_discounts` scope (already added to `shopify.app.toml` and
`lib/shopify.ts`).

## Bulk CSV import/export

- **Export** — `/dashboard/reviews` → "Export all reviews (CSV)" downloads
  every review (pending + approved) for the shop
- **Import** — same page → "Import reviews (CSV)" file picker. Expected
  columns (case/spacing-insensitive): `productId`, `productTitle`,
  `rating`, `body`, `customerName`, `photoUrl` (optional), `approved`
  (optional, defaults to `true` — assumes pre-vetted reviews from another
  platform). Invalid rows are skipped and reported, valid ones are
  imported immediately.

Use this to migrate existing reviews from another app (Judge.me, Loox,
etc.) — export from there, reshape into these columns, import here.

## Automated review reminders (Klaviyo-style post-purchase flow)

⚠️ **Requires Shopify's "Protected Customer Data" approval before the
`orders/create` webhook can be subscribed** — orders contain customer
email/name/address, which Shopify restricts by default even with
`read_orders` scope granted. Request it from the Dev/Partner Dashboard:
**App → API access → Protected customer data** → describe that you need
order + line item data to send post-purchase review reminders, and
submit for approval. This can take some time to review.

Until approved, the `[[webhooks.subscriptions]]` entry for `orders/create`
in `shopify.app.toml` is commented out so `shopify app deploy` succeeds —
the rest of the app works fine without it; only the automated reminder
emails won't have new orders to track until this is approved and the
webhook is re-enabled.

Configured at `/dashboard/design` → "Automated review reminders":
- Toggle on/off
- Choose how many days after purchase to send the reminder

**How it works end to end:**
1. `app/api/webhooks/orders` receives Shopify's `orders/create` webhook,
   creates one `PendingReviewRequest` row per line item (product +
   customer email + purchase date)
2. `app/api/cron/review-reminders` runs daily (see `vercel.json`), finds
   requests where the delay has elapsed, `reviewed = false`, and no
   reminder has been sent yet — sends an email via Resend
   (`lib/email.ts`) with a direct link to that product's review page
3. If the customer leaves a review (email must match what they ordered
   with, entered in the optional email field on the storefront widget, or
   automatically known via the QR flow's email-lookup step),
   `app/api/reviews/submit` marks their pending request `reviewed = true`
   — no further reminders for that product

Requires a Resend account (`RESEND_API_KEY`, `EMAIL_FROM`) and a
`CRON_SECRET` to protect the cron endpoint — see `.env.example`.

## Design/UX refinements

- Widget's "write a review" form is now centered, larger, and the photo
  upload is a styled button with a preview thumbnail instead of a bare
  file input
- Suggestions panel has a "✕ Close" button (in addition to "🔄 Refresh")
  so customers who don't want AI-style suggestions can dismiss them and
  write their own review directly — available separately for the website
  widget and the QR-scan flow via the toggles in `/dashboard/design`
- Carousel layout now has prev/next arrow buttons (color customizable)
  and a "cards visible at once" setting (1-4)

## Privacy, unsubscribe, and data retention (for Shopify's Protected Customer Data approval)

Added to support Shopify's Protected Customer Data application questions:

- **Privacy Policy** — public page at `/privacy` explaining what data is
  collected, why, how long it's kept, and how to opt out. Link this from
  your app listing / merchant-facing docs.
- **Unsubscribe** — every review-reminder email includes an unsubscribe
  link (`/api/unsubscribe?shop=...&email=...`). One click permanently
  stops reminders to that address for that store (`ReminderUnsubscribe`
  table). Checked before every send in the reminder cron.
- **Data retention** — `app/api/cron/data-retention` runs daily (see
  `vercel.json`), deleting `PendingReviewRequest` rows older than 90 days
  that never resulted in a review — avoids holding onto customer
  email/name/purchase data indefinitely once it's no longer useful.

When filling out Shopify's Protected Customer Data form, these three
features are what let you honestly answer "Yes" to: telling merchants
what data you process, respecting consent/opt-out decisions, and having
a retention period.

## UGC image generation — fixed to use next/og

`app/api/ugc/generate/route.tsx` now imports `ImageResponse` from
**`next/og`** (Next.js's own built-in export) instead of the raw
`@vercel/og` package. The raw package can fail at runtime in some Vercel
serverless environments (native binary / platform mismatches for its PNG
renderer) even though it type-checks and builds fine locally — `next/og`
is Next.js's officially supported wrapper for exactly this use case and
avoids that class of failure. `@vercel/og` has been removed from
`package.json` since it's no longer used.

Star ratings in generated images are drawn as inline SVG shapes, not text
characters (★/☆) — Satori (the rendering engine both packages use) often
can't render those glyphs without an explicitly embedded font, which was
silently breaking image generation before this fix.

## Editable email template (Email Requests settings)

`/dashboard/settings` → Email Requests now has editable **Subject** and
**Body template** fields (previously the reminder email's wording was
hardcoded). Supports variables:
- `{{first_name}}` — customer's name
- `{{shop_name}}` — store domain
- `{{review_link}}` — direct link to leave a review for that product
- `{{product_name}}` — the purchased product's title

`lib/email.ts` substitutes these before sending; the review link is
automatically turned into a clickable button in the resulting email.

## New features (this round)

- **Split layout** — new `displayStyle: "split"` option: rating summary +
  percentage bar on the left, full review list on the right. Set via
  Settings → Widget Settings → Layout.
- **Editable widget heading** — "Customer Reviews" text is now merchant-
  editable (Settings → Widget Settings → "Widget heading text").
- **Top spacing control** — adjustable space above the widget, since some
  themes butt it right up against other page content.
- **Rating bar color bug fixed** — the percentage bar was rendering
  washed-out/invisible because `opacity` was set on the whole row
  (including the colored fill), not just the text labels. Also added a
  defensive fallback so any missing/empty design setting can't silently
  break the widget's inline styles again.
- **Video reviews** — customers can attach a short video instead of (or
  as well as) a photo when submitting a review. Stored as a base64 data
  URI like photos, size-capped client-side (~8MB) with a friendly warning.
- **"Top Reviewer" streak badge** — customers with 3+ approved reviews
  (matched by email) get a small badge next to their name in the widget.
- **Multi-language suggestions** — `lib/review-suggestions.ts` now has
  full English and Hindi (हिन्दी) template sets. Merchants pick the
  language from Settings → Widget Settings → "Suggestion language".
- **Milestone progress bar** — Dashboard now shows progress toward the
  next review-count milestone (10/25/50/100/250/500/1000).
- **Configurable logo watermark size** — the UGC card watermark logo size
  is now a slider in Settings (60–300px) instead of a fixed 80px.
- **Instagram/WhatsApp direct share** — `ShareButtons` component uses the
  Web Share API (`navigator.share` with files) so customers/merchants can
  share a UGC card directly to whatever apps are installed on their phone
  — no Meta app review or Facebook App ID needed, since it's just the
  browser's native OS share sheet.

## ⚠️ Plan feature enforcement — partial, be aware

Plan cards now describe a full feature tier structure, but as of this
update, only these are actually **enforced** in code:
- Reviews/month cap, QR product cap (`lib/billing.ts`)
- UGC template count (`ReviewsTable.tsx` — locks templates beyond the
  plan's `templateCount`)
- Suggestion language (Free plan is forced to English server-side, even
  if a different language is saved in settings)

**Not yet enforced** (available to all plans regardless of what the
pricing cards say): video reviews, "Top Reviewer" streak badges, direct
share buttons, automated reminder emails, review-reward discount codes.
If you want the pricing to be accurate/defensible, these need the same
kind of server-side gate as the UGC template count has — happy to add
that gating in a follow-up pass.

## Bug fixes (this round)

- **"Bordered classic" UGC template logo overlap** — the watermark was
  anchored to the outer padding box while the visible border sat further
  inset, so it visually crossed the border line. Moved the watermark
  inside the bordered box instead.
- **Email Requests / Review reward forms too narrow** — widened from
  `max-w-md` to `max-w-2xl`, and made the email body textarea taller.
- **Review text not centered** — added explicit `text-align` to every
  text element in the review card (stars, body, name), instead of relying
  on inheriting it from the root wrapper. Shopify themes often have broad
  CSS rules (e.g. `p { text-align: left; }`) that can override inherited
  alignment — explicit inline styles always win regardless of theme CSS.
- **Rating bar "no color" reports** — confirmed via inspecting the live
  DOM that the fix from the previous round is correct
  (`background:#f5b400` renders at the right width). What looked like
  "no color" in a screenshot was the browser DevTools' own blue
  hover-highlight overlay sitting on top of the element, not an actual
  rendering bug.

## ⚠️ Plan enforcement gap (important, read before launch)

Only `reviewsPerMonthCap`, `qrProductCap`, `templateCount`, and
`suggestionLanguage` are actually server-side enforced right now. The
pricing page lists video reviews, streak badges, share buttons, reminder
emails, and reward codes as tier-differentiated features, but **none of
these are currently gated by plan in the code** — they work identically
on every tier. If you want the pricing to be accurate/defensible, add
plan checks to: `app/api/reviews/submit` (video/photo gating),
`app/api/cron/review-reminders` (skip if plan lacks reminders),
`app/api/shop/reward` (block enabling on lower tiers), and the
share/streak-badge rendering in `public/widget.js` /
`extensions/rivu-reviews/assets/rivu-widget.js`.
