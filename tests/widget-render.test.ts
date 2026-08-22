import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Executes the storefront widget against a stub DOM.
 *
 * Every other check on this file only confirmed it *parses*. That is not
 * enough, and it let a real bug reach a live store: the custom-template code
 * referenced breakdownHtml, writeBtn and listHtml from a scope where they
 * weren't declared. Syntactically perfect, ReferenceError at render time — and
 * because the exception escaped before innerHTML was assigned, the storefront
 * sat on "Loading reviews…" forever with no visible error.
 *
 * So this runs the thing. If the render throws, the placeholder survives, and
 * that is what these tests assert against.
 */

const widgetSource = readFileSync(
  path.resolve(__dirname, "../public/widget.js"),
  "utf8"
);
const extensionSource = readFileSync(
  path.resolve(__dirname, "../extensions/rivu-reviews/assets/rivu-widget.js"),
  "utf8"
);

type StubEl = Record<string, unknown> & { innerHTML: string };

function makeEl(): StubEl {
  const el: StubEl = {
    innerHTML: "",
    textContent: "",
    id: "",
    tagName: "div",
    style: { cssText: "" },
    dataset: {},
    classList: { add: () => {}, remove: () => {} },
    appendChild: () => {},
    removeChild: () => {},
    remove: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    // Returning a node rather than null: the widget wires up handlers on
    // freshly-built markup, and a null here would fail for reasons that have
    // nothing to do with what is under test.
    querySelector: () => makeEl(),
    querySelectorAll: () => [],
    scrollIntoView: () => {},
    focus: () => {},
  };
  return el;
}

const SUMMARY = {
  total: 1,
  average: 5,
  breakdown: [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: star === 5 ? 1 : 0,
    percentage: star === 5 ? 100 : 0,
  })),
  recommend: { percent: 100, count: 1, answered: 1 },
};

const REVIEWS = [
  {
    id: "r1",
    rating: 5,
    reviewTitle: "Superb",
    body: "Genuinely great board, loads of pop.",
    customerName: "Asha",
    createdAt: new Date().toISOString(),
    photoUrl: null,
    videoUrl: null,
    recommends: true,
    ownerReply: "Thanks Asha — glad it is working out.",
  },
];

/** Runs a widget source against the stub DOM and returns what it rendered. */
async function render(
  source: string,
  design: Record<string, unknown>,
  plan = "pro",
  /** Overrides merged into the single fixture review. */
  reviewOverrides: Record<string, unknown> = {},
  /** Replaces the whole payload — used for the empty state. */
  payloadOverrides: Record<string, unknown> = {}
): Promise<string> {
  const reviews = REVIEWS.map((r) => ({ ...r, ...reviewOverrides }));
  const target = makeEl();
  target.dataset = {
    shop: "example.myshopify.com",
    productId: "1",
    productTitle: "The Board",
    productImage: "",
    apiBase: "https://rivu.test",
  };

  const g = globalThis as unknown as Record<string, unknown>;

  g.document = {
    currentScript: { src: "https://rivu.test/widget.js" },
    readyState: "complete",
    title: "Product",
    getElementById: () => null,
    createElement: () => makeEl(),
    head: { appendChild: () => {} },
    body: { appendChild: () => {} },
    querySelector: (sel: string) =>
      sel.includes("script") ? { getAttribute: () => null } : makeEl(),
    querySelectorAll: (sel: string) =>
      sel.includes("review-widget") || sel.includes("rivu-review-widget")
        ? [target]
        : [],
    addEventListener: () => {},
  };
  g.window = {
    location: { href: "https://shop.test/products/board" },
    addEventListener: () => {},
    matchMedia: () => ({ matches: false }),
  };
  // `navigator` is a getter-only global in Node, so it has to be defined
  // rather than assigned.
  if (!("navigator" in g)) {
    Object.defineProperty(g, "navigator", {
      value: { userAgent: "vitest" },
      configurable: true,
    });
  }
  g.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };

  g.fetch = vi.fn(async (url: string) => ({
    ok: true,
    status: 200,
    text: async () => "",
    json: async () =>
      String(url).includes("/api/reviews/list")
        ? {
            reviews,
            summary: SUMMARY,
            ...payloadOverrides,
            plan,
            availableLanguages: [{ code: "en", label: "English" }],
            design,
          }
        : { items: [], suggestions: [] },
  }));

  new Function(source)();
  // The widget fetches before rendering; give the microtasks a turn.
  await new Promise((r) => setTimeout(r, 300));
  return target.innerHTML;
}

afterEach(() => {
  vi.restoreAllMocks();
});

const CUSTOM_TEMPLATE =
  '<div class="mine"><h3>{{title}}</h3><span>{{average}}</span>{{stars}}' +
  "<span>{{count}}</span>{{breakdown}}{{write_button}}{{review_list}}</div>";

const sources: [string, string][] = [
  ["public widget", widgetSource],
  ["theme extension widget", extensionSource],
];

describe.each(sources)("%s renders the built-in layout", (_name, source) => {
  it("replaces the loading placeholder", async () => {
    const html = await render(source, {
      customTemplateEnabled: false,
      summaryLayout: "modern",
      displayStyle: "list",
      richSnippetsEnabled: false,
    });

    expect(html).not.toContain("Loading reviews");
    expect(html.length).toBeGreaterThan(500);
  });

  it("shows the review and the heading", async () => {
    const html = await render(source, {
      customTemplateEnabled: false,
      summaryLayout: "modern",
      displayStyle: "list",
      widgetTitle: "Customer reviews",
      richSnippetsEnabled: false,
    });

    expect(html).toContain("loads of pop");
    expect(html).toContain("Customer reviews");
  });
});

describe.each(sources)("%s renders a custom template", (_name, source) => {
  it("does not get stuck loading", async () => {
    // The exact failure that shipped: a ReferenceError here left the
    // placeholder in place on a live storefront.
    const html = await render(source, {
      customTemplateEnabled: true,
      customTemplateHtml: CUSTOM_TEMPLATE,
      summaryLayout: "modern",
      displayStyle: "list",
      richSnippetsEnabled: false,
    });

    expect(html).not.toContain("Loading reviews");
  });

  it("uses the merchant's markup", async () => {
    const html = await render(source, {
      customTemplateEnabled: true,
      customTemplateHtml: CUSTOM_TEMPLATE,
      summaryLayout: "modern",
      displayStyle: "list",
      richSnippetsEnabled: false,
    });

    expect(html).toContain('class="mine"');
  });

  it("fills every placeholder", async () => {
    const html = await render(source, {
      customTemplateEnabled: true,
      customTemplateHtml: CUSTOM_TEMPLATE,
      summaryLayout: "modern",
      displayStyle: "list",
      richSnippetsEnabled: false,
    });

    expect(html).not.toContain("{{");
    expect(html).toContain("loads of pop"); // {{review_list}} resolved
  });

  it("still strips a script from the template at render time", async () => {
    const html = await render(source, {
      customTemplateEnabled: true,
      customTemplateHtml:
        '<div class="mine"><script>steal()</script>{{review_list}}</div>',
      summaryLayout: "modern",
      displayStyle: "list",
      richSnippetsEnabled: false,
    });

    expect(html.toLowerCase()).not.toContain("<script");
    expect(html).toContain('class="mine"');
  });

  it("falls back to the built-in layout when the template is empty", async () => {
    const html = await render(source, {
      customTemplateEnabled: true,
      customTemplateHtml: "",
      summaryLayout: "modern",
      displayStyle: "list",
      richSnippetsEnabled: false,
    });

    expect(html).not.toContain("Loading reviews");
    expect(html).toContain("loads of pop");
  });
});

/**
 * The merchant's CSS, executed.
 *
 * Custom layouts originally had no CSS field at all, so markup like
 * `<div class="mine">` referenced classes nothing defined and rendered
 * unstyled. These assert the stylesheet actually reaches the page — and,
 * more importantly, that it cannot reach past the widget.
 */
describe.each(sources)("%s renders custom CSS", (_name, source) => {
  const withCss = (css: string) => ({
    customTemplateEnabled: true,
    customTemplateHtml: CUSTOM_TEMPLATE,
    customTemplateCss: css,
    summaryLayout: "modern",
    displayStyle: "list",
    richSnippetsEnabled: false,
  });

  it("injects the stylesheet and the wrapper it hangs off", async () => {
    const html = await render(source, withCss(".mine { color: rebeccapurple }"));

    expect(html).not.toContain("Loading reviews");
    expect(html).toContain("<style>");
    expect(html).toContain("rebeccapurple");
    // The wrapper *element*, not just the string — every scoped rule hangs off
    // it, so without it the merchant's CSS matches nothing and the layout
    // renders unstyled, which is the bug this feature exists to fix. Asserting
    // on the bare class name is not enough: the stylesheet text contains it too.
    expect(html).toContain('<div class="rivu-custom-root">');
  });

  it("scopes the merchant's rules to the widget", async () => {
    const html = await render(source, withCss(".mine { color: red }"));
    expect(html).toContain(".rivu-custom-root .mine");
  });

  it("cannot hide the merchant's whole storefront", async () => {
    // `body { display: none }` is the rule that makes this dangerous.
    const html = await render(source, withCss("body { display: none }"));

    expect(html).toContain("<style>");
    // Retargeted at the widget, never left as a bare `body` rule. Anchored to a
    // rule boundary rather than \b: a word boundary also matches inside
    // `.rv-card-body {`, which made the earlier version of this assertion pass
    // or fail on unrelated class names.
    expect(html).not.toMatch(/(?:<style>|\n)body\s*\{/);
    expect(html).toContain(".rivu-custom-root {");
  });

  it("cannot break out of the style tag it sits in", async () => {
    const html = await render(
      source,
      withCss("</style><script>window.pwned=1</script>.mine{color:red}")
    );

    expect(html).not.toContain("</style><script");
    expect(html).not.toContain("window.pwned");
  });

  /**
   * The review list must be restyleable.
   *
   * Every card element was inline-styled, and an inline style beats any
   * selector a merchant can write — so no custom stylesheet could change the
   * list, and all three designs rendered the identical card.
   */
  it("drops the cards' inline styles so CSS can win", async () => {
    const html = await render(source, withCss(".rv-card { border: none }"));

    expect(html).toContain('class="rv-card"');
    // The card must carry no inline style of its own, or the merchant's rule
    // loses to it no matter how specific they get.
    expect(html).not.toMatch(/class="rv-card"[^>]*\sstyle=/);
    expect(html).not.toMatch(/class="rv-card-body[^"]*"[^>]*\sstyle=/);
  });

  it("drops the list container's inline style too", async () => {
    // Without this the merchant cannot lay the list out — no columns, no grid.
    const html = await render(source, withCss(".rv-list { column-count: 2 }"));

    expect(html).toContain('class="rv-list"');
    expect(html).not.toMatch(/class="rv-list"[^>]*\sstyle=/);
  });

  it("keeps the inline styles for the built-in layout", async () => {
    // The built-in path carries every merchant colour and size setting inline;
    // stripping them there would leave the default widget unstyled.
    const html = await render(source, {
      customTemplateEnabled: false,
      summaryLayout: "modern",
      displayStyle: "list",
      richSnippetsEnabled: false,
    });

    expect(html).toMatch(/class="rv-card"[^>]*\sstyle=/);
  });

  it("ships a default stylesheet so a bare custom layout still looks right", async () => {
    // A merchant writing their own markup with no CSS must not get naked cards.
    const html = await render(source, withCss(""));

    expect(html).toContain("<style>");
    expect(html).toContain(".rivu-custom-root .rv-card");
  });

  it("puts the merchant's CSS after the defaults so theirs wins", async () => {
    const html = await render(source, withCss(".rv-card { padding: 40px }"));

    const style = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
    // Compared against a declaration only the baseline emits. Anchoring on the
    // selector instead is useless: the merchant's own rule has the same
    // selector, so the comparison passed whichever order they were in.
    const baselineOnly = style.indexOf("box-shadow:0 1px 4px");
    expect(baselineOnly, "baseline stylesheet missing").toBeGreaterThan(-1);
    // Equal specificity, so source order decides — theirs must come last.
    expect(style.indexOf("padding: 40px")).toBeGreaterThan(baselineOnly);
  });

  it("renders the layout fine when no CSS is set", async () => {
    // An existing Pro merchant's saved row has no CSS at all; it must not
    // render an empty <style> or, worse, the string "undefined".
    const html = await render(source, withCss(""));

    expect(html).not.toContain("Loading reviews");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("<style></style>");
    expect(html).toContain("loads of pop");
  });
});

/**
 * Owner replies and the recommend stat, rendered rather than asserted on
 * source. Both are new payload fields, and a widget that silently ignores one
 * looks identical to a widget that renders it — until a merchant checks.
 */
describe.each(sources)("%s renders the new review fields", (_name, source) => {
  const base = {
    customTemplateEnabled: false,
    summaryLayout: "modern",
    displayStyle: "list",
    richSnippetsEnabled: false,
  };

  it("shows the store owner reply", async () => {
    const html = await render(source, base);
    expect(html).toContain("Store owner reply");
    expect(html).toContain("glad it is working out");
  });

  it("escapes a reply containing markup", async () => {
    const html = await render(source, base, "pro", {
      ownerReply: '<script>window.pwned=1</script>',
    });
    expect(html).not.toContain("<script>window.pwned");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders no reply block when there is no reply", async () => {
    const html = await render(source, base, "pro", { ownerReply: null });
    expect(html).not.toContain("Store owner reply");
    // The review itself must still be there.
    expect(html).toContain("loads of pop");
  });
});

describe.each(sources)("%s renders the recommend stat", (_name, source) => {
  const base = {
    customTemplateEnabled: false,
    summaryLayout: "modern",
    displayStyle: "list",
    richSnippetsEnabled: false,
  };

  it("shows the percentage who would recommend", async () => {
    // Collected by the form since the beginning and never once displayed.
    const html = await render(source, base);
    expect(html).toContain("would recommend");
    expect(html).toContain("100%");
  });
});

describe.each(sources)("%s empty state", (_name, source) => {
  it("centres the star without relying on the theme", async () => {
    // text-align only centres an svg while it is inline, and plenty of Shopify
    // themes set "svg { display: block }" globally — which put the star hard
    // against the left edge on one merchant's store while looking correct on
    // another's. Auto margins centre it either way.
    const html = await render(
      source,
      {
        customTemplateEnabled: false,
        summaryLayout: "modern",
        displayStyle: "list",
        richSnippetsEnabled: false,
      },
      "pro",
      {},
      { reviews: [], summary: { total: 0, average: 0, breakdown: [], recommend: null } }
    );

    expect(html).toContain("No reviews yet");
    const star = html.slice(html.indexOf("No reviews yet") - 700, html.indexOf("No reviews yet"));
    expect(star).toContain("margin:0 auto");
    expect(star).not.toMatch(/<svg[^>]*style="opacity:\.85;margin-bottom:10px;"/);
  });
});
