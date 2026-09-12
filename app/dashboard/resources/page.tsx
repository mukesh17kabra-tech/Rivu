import { Card, PageHeader } from "@/components/ui";
import { requireShop } from "@/lib/shop-context";

/**
 * Help, guides and answers.
 *
 * Every page in this app until now told a merchant what to configure and none
 * told them what to do — so a store that installed Rivu, added the widget and
 * collected four reviews had no idea whether that was normal or what came
 * next. That gap is where trials are lost.
 *
 * Written out in full rather than linked to a docs site: an embedded app that
 * sends people out to a marketing domain for an answer usually loses them
 * there. Everything on this page is true of the app as it stands today — no
 * placeholder webinars, no course that does not exist.
 */

type Guide = { title: string; body: string; action?: { label: string; href: string } };

function GuideList({ guides }: { guides: Guide[] }) {
  return (
    <ul className="divide-y divide-white/[0.07]">
      {guides.map((g) => (
        <li key={g.title} className="py-3.5 first:pt-0 last:pb-0">
          <p className="text-[13.5px] font-semibold text-white">{g.title}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-white/50">{g.body}</p>
          {g.action && (
            <a
              href={g.action.href}
              target={g.action.href.startsWith("http") ? "_top" : undefined}
              className="mt-2 inline-block text-[12px] font-semibold text-emerald-300 hover:text-emerald-200"
            >
              {g.action.label} →
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <h2 className="text-[16px] font-bold tracking-[-0.01em] text-white">{title}</h2>
      <p className="mb-4 mt-1 text-[12.5px] text-white/40">{description}</p>
      {children}
    </Card>
  );
}

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; host?: string }>;
}) {
  const { shop: shopParam, host } = await searchParams;
  const { shop } = await requireShop(shopParam, host);
  const q = `shop=${encodeURIComponent(shop)}${host ? `&host=${encodeURIComponent(host)}` : ""}`;

  const setup: Guide[] = [
    {
      title: "1. Turn on the App Embed",
      body:
        "Loads the Rivu script on your storefront. Nothing else works until this is on, and it is invisible on its own. One click, once.",
      action: {
        label: "Open App Embeds",
        href: `https://${shop}/admin/themes/current/editor?template=product&context=apps`,
      },
    },
    {
      title: "2. Add the review widget to your product page",
      body:
        "Rivu Reviews is the main block — rating, breakdown bars, reviews and the write-a-review form. Ten more blocks are available once this one is in.",
      action: { label: "Browse all widgets", href: `/dashboard/installation?${q}` },
    },
    {
      title: "3. Style it to match your theme",
      body:
        "Colours, fonts, corner radius, layout and card design, with a live preview that updates as you change it. Pro can write raw HTML and CSS instead.",
      action: { label: "Open widget design", href: `/dashboard/widget-settings?${q}` },
    },
    {
      title: "4. Bring your existing reviews with you",
      body:
        "Export a CSV from Judge.me, Loox, Stamped or Yotpo and upload it unchanged. Original dates, photos and your replies to customers all come across, and a dry run shows you exactly what will happen before anything is written.",
      action: { label: "Import reviews", href: `/dashboard/reviews?${q}` },
    },
    {
      title: "5. Switch on review request emails",
      body:
        "Rivu emails a customer a few days after their order arrives and asks for a review. This is where almost all of your reviews will come from — a store that only waits for organic reviews collects very few.",
      action: { label: "Set up requests", href: `/dashboard/email-requests?${q}` },
    },
  ];

  const moreReviews: Guide[] = [
    {
      title: "Send the request at the right moment",
      body:
        "Too early and the parcel has not arrived; too late and the purchase is forgotten. For most stores 7–14 days after delivery is the window. Shorter for consumables, longer for anything they need to use a few times first.",
      action: { label: "Change the delay", href: `/dashboard/email-requests?${q}` },
    },
    {
      title: "Ask for a photo, and say why",
      body:
        "Reviews with photos are the ones shoppers actually stop on. Asking plainly — \"a quick photo helps other people more than anything you can write\" — lifts photo reviews far more than any incentive.",
    },
    {
      title: "Put a QR code in the parcel",
      body:
        "A card in the box with a QR code catches people at the moment they open it, which is the moment they are most pleased. It also reaches the customers who never open marketing email.",
      action: { label: "Make a QR code", href: `/dashboard/qrcodes?${q}` },
    },
    {
      title: "Reply to the bad ones in public",
      body:
        "A store with nothing but five stars reads as filtered. A three-star review with a calm, specific reply from the owner does more for trust than another perfect one — shoppers are looking for how you behave when something goes wrong.",
      action: { label: "Reply to reviews", href: `/dashboard/reviews?${q}` },
    },
    {
      title: "Show reviews somewhere other than the product page",
      body:
        "Most stores stop at the product page. A rating strip under the header, a photo wall on the home page, or a trust badge near the buy button reach shoppers who never scroll far enough to see a review.",
      action: { label: "Browse all widgets", href: `/dashboard/installation?${q}` },
    },
  ];

  const questions: Guide[] = [
    {
      title: "I added the block but nothing shows up",
      body:
        "Almost always the App Embed is off — the block is placed but the script that fills it never loads. Check step 1 above. If the embed is on and it is still blank, the product has no approved reviews yet.",
    },
    {
      title: "My reviews imported but don't appear on the product page",
      body:
        "Your export used product handles where Rivu expects Shopify product IDs. The reviews are safely stored and will appear as soon as the identifiers match — the import preview warns you when it spots this.",
    },
    {
      title: "A review is stuck on Pending",
      body:
        "Auto-publish is read at the moment a review is submitted, so it only applies to reviews that arrive after you switch it on. Anything already waiting stays waiting until you approve it — select them and publish in one go.",
      action: { label: "Check moderation", href: `/dashboard/reviews?${q}` },
    },
    {
      title: "Photos from my old app stopped loading",
      body:
        "Imported photos are links to wherever your previous app hosts them, so they stop when that app does. Keep the old app running for a few weeks after you switch, or ask customers to re-upload on their next review.",
    },
    {
      title: "Do reviews show up in Google search results?",
      body:
        "Yes — Rivu outputs the structured data Google reads for star ratings, on by default. Google decides whether to actually show the stars, and it usually takes a few weeks. If another review app on your store already does this, message us and we'll turn Rivu's off for you; there is no switch for it in the app yet.",
    },
    {
      title: "What happens to my reviews if I downgrade or uninstall?",
      body:
        "Nothing is deleted. Pro-only designs fall back to their free equivalent and Pro-only widgets stop rendering, but every review stays exactly where it is and comes back if you upgrade again. You can export all of them to CSV at any time.",
      action: { label: "Export reviews", href: `/dashboard/reviews?${q}` },
    },
  ];

  return (
    <>
      <PageHeader
        title="Help & guides"
        description="How to set Rivu up, how to actually collect reviews, and answers to what usually goes wrong."
      />

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Panel
          title="Getting set up"
          description="Five steps, about fifteen minutes. In this order."
        >
          <GuideList guides={setup} />
        </Panel>

        <Panel
          title="Collecting more reviews"
          description="What actually moves the number, in rough order of effect."
        >
          <GuideList guides={moreReviews} />
        </Panel>
      </div>

      <Card className="mb-5">
        <h2 className="text-[16px] font-bold tracking-[-0.01em] text-white">Common questions</h2>
        <p className="mb-4 mt-1 text-[12.5px] text-white/40">
          The things merchants write in about most.
        </p>
        <div className="grid gap-x-8 md:grid-cols-2">
          <GuideList guides={questions.slice(0, 3)} />
          <GuideList guides={questions.slice(3)} />
        </div>
      </Card>

      <Card className="border-emerald-400/25 bg-emerald-400/[0.06]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-bold tracking-[-0.01em] text-white">
              Still stuck? Ask us directly.
            </h2>
            <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-white/55">
              Use the chat button in the bottom corner of any page — it goes straight to the person
              who builds Rivu, not a ticket queue, and you can attach a screenshot. Tell us your
              theme name and what you expected to see; that is normally enough for us to fix it for
              you rather than talk you through it.
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-emerald-400/40 px-4 py-2 text-[13px] font-semibold text-emerald-300">
            Chat is bottom-right ↘
          </span>
        </div>
      </Card>
    </>
  );
}
