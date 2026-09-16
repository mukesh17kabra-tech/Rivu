"use client";

import { useState } from "react";

/**
 * Copy-paste snippets for merchants who want reviews somewhere a theme block
 * cannot reach.
 *
 * Theme blocks only go where a theme offers an "Add block" slot. Plenty of the
 * places a merchant actually wants a rating — beside the price, in the header,
 * inside a custom Liquid section, on a landing page built in a page builder —
 * have no slot at all, and the answer until now was "sorry". This produces a
 * snippet for exactly those places.
 *
 * Deliberately not a live preview of the merchant's real reviews: that would
 * need their data in this page, and the snippet's whole value is that it is
 * inert HTML they can read before they trust it. The preview here is drawn
 * from the same numbers the snippet would show, and says so.
 *
 * The snippet carries its own <script> rather than relying on the App Embed —
 * the embed only loads the rating-badge script, and a snippet that silently
 * does nothing unless an unrelated setting is on is a support ticket waiting
 * to happen. Loading it twice is harmless; the script marks what it renders.
 */

type Snippet = {
  key: string;
  label: string;
  blurb: string;
  /** Where this one is meant to go, in the merchant's words. */
  goes: string;
  /** Extra data- attributes, beyond the ones every snippet carries. */
  attrs: (text: string) => string[];
};

const SNIPPETS: Snippet[] = [
  {
    key: "tag-inline",
    label: "Rating tag — one line",
    blurb:
      "Score, stars and your own wording in a single row. The one to use beside a price or an Add to cart button, where vertical space is tight.",
    goes: "Next to a price, a buy button, or in your header",
    attrs: (text) => [
      'data-layout="trust"',
      'data-badge-inline="true"',
      `data-badge-text="${text}"`,
    ],
  },
  {
    key: "tag-stacked",
    label: "Rating tag — stacked",
    blurb:
      "The same badge with the stars and text under the score. Reads better on its own in a footer or an About page than squeezed into a row.",
    goes: "Footer, About page, or a section of its own",
    attrs: (text) => [
      'data-layout="trust"',
      `data-badge-text="${text}"`,
    ],
  },
  {
    key: "spotlight",
    label: "Review carousel with product buttons",
    blurb:
      "A scrolling row of reviews, each showing the product it is about with a button through to it. The full section, for a home page or a landing page.",
    goes: "Home page, landing page, or any custom Liquid section",
    attrs: (text) => [
      'data-layout="carousel"',
      'data-card-style="spotlight"',
      'data-limit="12"',
      'data-min-rating="4"',
      `data-heading="${text}"`,
    ],
  },
];

/** Same defaults the script itself uses, so the two cannot disagree. */
const DEFAULT_TEXT: Record<string, string> = {
  "tag-inline": "Based on {count}",
  "tag-stacked": "{count} from happy customers",
  spotlight: "What our customers say",
};

function escapeAttr(value: string) {
  // Goes straight into a double-quoted HTML attribute in the snippet the
  // merchant pastes into their own theme. Anything that could close the
  // attribute or open a tag has to be neutralised here, not hoped about.
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function EmbedCodeBuilder({ shop, origin }: { shop: string; origin: string }) {
  const [active, setActive] = useState(SNIPPETS[0]);
  const [text, setText] = useState(DEFAULT_TEXT[SNIPPETS[0].key]);
  const [copied, setCopied] = useState(false);

  function choose(s: Snippet) {
    setActive(s);
    setText(DEFAULT_TEXT[s.key]);
    setCopied(false);
  }

  const attrs = [
    "data-rivu-showcase",
    `data-shop="${shop}"`,
    `data-api-base="${origin}"`,
    ...active.attrs(escapeAttr(text)),
  ];

  const code =
    `<div\n  ${attrs.join("\n  ")}>\n</div>\n` +
    `<script src="${origin}/rivu-showcase.js" async></script>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked in some embedded contexts. The code is on screen
      // and selectable, so this is a missing convenience, not a failure.
      setCopied(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-2.5 sm:grid-cols-3">
        {SNIPPETS.map((s) => {
          const on = s.key === active.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => choose(s)}
              aria-pressed={on}
              className={`rounded-lg border p-3.5 text-left transition-colors ${
                on
                  ? "border-emerald-400/50 bg-emerald-400/[0.08]"
                  : "border-white/[0.09] bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <p className={`text-[13px] font-bold ${on ? "text-white" : "text-white/75"}`}>
                {s.label}
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-white/40">{s.blurb}</p>
            </button>
          );
        })}
      </div>

      <div>
        <label
          htmlFor="rivu-embed-text"
          className="mb-1.5 block text-[12.5px] font-semibold text-white/70"
        >
          {active.key === "spotlight" ? "Heading" : "Your wording"}
        </label>
        <input
          id="rivu-embed-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setCopied(false);
          }}
          className="w-full rounded-lg border border-white/[0.12] bg-black/30 px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-emerald-400/60"
          placeholder="Write anything you like"
        />
        {active.key !== "spotlight" && (
          <p className="mt-2 text-[11.5px] leading-relaxed text-white/35">
            Write whatever you want. These three fill themselves in with your real numbers:{" "}
            <code className="rounded bg-white/[0.07] px-1 py-0.5 text-emerald-300">{"{count}"}</code>{" "}
            becomes &ldquo;128 reviews&rdquo;,{" "}
            <code className="rounded bg-white/[0.07] px-1 py-0.5 text-emerald-300">{"{total}"}</code>{" "}
            becomes &ldquo;128&rdquo;, and{" "}
            <code className="rounded bg-white/[0.07] px-1 py-0.5 text-emerald-300">
              {"{average}"}
            </code>{" "}
            becomes &ldquo;4.9&rdquo;.
          </p>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <p className="text-[12.5px] font-semibold text-white/70">Your code</p>
          <button
            type="button"
            onClick={copy}
            className="rounded-md bg-emerald-400 px-3.5 py-1.5 text-[12.5px] font-semibold text-black transition-colors hover:bg-emerald-300"
          >
            {copied ? "Copied ✓" : "Copy code"}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-lg border border-white/[0.08] bg-black/40 p-4 text-[11.5px] leading-relaxed text-white/75">
          {code}
        </pre>
      </div>

      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
        <p className="text-[13px] font-bold text-white">Where to paste it</p>
        <p className="mt-1 text-[12.5px] text-white/45">{active.goes}</p>
        <ol className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-white/55">
          <li>
            <span className="font-semibold text-white/80">1.</span> In Shopify admin, open{" "}
            <span className="text-white/80">Online Store → Themes → Customize</span>.
          </li>
          <li>
            <span className="font-semibold text-white/80">2.</span> Go to the page you want it on,
            then <span className="text-white/80">Add section → Custom Liquid</span> (some themes
            call it Custom HTML or Custom code).
          </li>
          <li>
            <span className="font-semibold text-white/80">3.</span> Paste the code into the box and
            press <span className="text-white/80">Save</span>.
          </li>
        </ol>
        <p className="mt-3 border-t border-white/[0.07] pt-3 text-[11.5px] leading-relaxed text-white/35">
          It can also go straight into a theme file, a page built in a page builder, or anywhere
          else that accepts HTML. It does not need the App Embed — the code loads what it needs on
          its own. If you have no published reviews yet it shows nothing at all, rather than an
          empty box.
        </p>
      </div>
    </div>
  );
}
