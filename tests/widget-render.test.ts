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
    recommends: null,
  },
];

/** Runs a widget source against the stub DOM and returns what it rendered. */
async function render(
  source: string,
  design: Record<string, unknown>,
  plan = "pro"
): Promise<string> {
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
            reviews: REVIEWS,
            summary: SUMMARY,
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
    // Retargeted at the widget, never left as a bare `body` rule.
    expect(html).not.toMatch(/<style>[^<]*\bbody\s*\{/);
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
