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
