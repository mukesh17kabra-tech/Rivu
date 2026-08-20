import { describe, expect, it } from "vitest";

import {
  sanitiseTemplate,
  renderTemplate,
  unknownVariables,
  isEmptyTemplate,
  TEMPLATE_VARIABLE_NAMES,
  STARTER_TEMPLATE,
} from "@/lib/widget-template";

/**
 * Custom templates are merchant-authored HTML that runs in *shoppers'*
 * browsers, on pages that carry carts and checkout links. A hole here is not
 * an admin bug — it is script execution on someone else's storefront, and the
 * merchant would be the one facing the consequences.
 *
 * So the sanitiser is tested adversarially: every case below is a real XSS
 * technique, not a hypothetical.
 */

const shouldBeStripped: [string, string][] = [
  ["plain script", '<script>alert(1)</script>'],
  ["script with attributes", '<script type="text/javascript" defer>steal()</script>'],
  ["uppercase tag", '<SCRIPT>alert(1)</SCRIPT>'],
  ["mixed case", '<ScRiPt>alert(1)</ScRiPt>'],
  ["iframe", '<iframe src="https://evil.test"></iframe>'],
  ["object", '<object data="evil.swf"></object>'],
  ["embed", '<embed src="evil.swf">'],
  ["style block", '<style>body{display:none}</style>'],
  ["base tag", '<base href="https://evil.test/">'],
  ["form phishing", '<form action="https://evil.test"><input name="card"></form>'],
  ["onerror handler", '<img src=x onerror="alert(1)">'],
  ["onclick double quotes", '<div onclick="alert(1)">hi</div>'],
  ["onclick single quotes", "<div onclick='alert(1)'>hi</div>"],
  ["onclick unquoted", "<div onclick=alert(1)>hi</div>"],
  ["onload", '<div onload="x()">hi</div>'],
  ["onmouseover", '<a onmouseover="x()">hi</a>'],
  ["javascript: href", '<a href="javascript:alert(1)">click</a>'],
  ["javascript with spacing", '<a href="javascript : alert(1)">click</a>'],
  ["data: URL", '<a href="data:text/html,<script>alert(1)</script>">x</a>'],
  ["vbscript:", '<a href="vbscript:msgbox(1)">x</a>'],
  ["svg vector", '<svg><script>alert(1)</script></svg>'],
  ["css expression", '<div style="width:expression(alert(1))">x</div>'],
  ["css import", '<div style="@import url(evil.css)">x</div>'],
  ["link stylesheet", '<link rel="stylesheet" href="https://evil.test/x.css">'],
  ["meta refresh", '<meta http-equiv="refresh" content="0;url=https://evil.test">'],
];

describe.each(shouldBeStripped)("sanitiser removes %s", (_label, payload) => {
  const { html } = sanitiseTemplate(payload);

  it("leaves no executable remnant", () => {
    expect(html.toLowerCase()).not.toContain("<script");
    expect(html.toLowerCase()).not.toContain("<iframe");
    expect(html.toLowerCase()).not.toContain("<style");
    expect(html.toLowerCase()).not.toContain("<form");
    expect(html.toLowerCase()).not.toContain("<base");
    expect(html.toLowerCase()).not.toContain("javascript:");
    expect(html.toLowerCase()).not.toContain("vbscript:");
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
  });
});

describe("the sanitiser explains itself", () => {
  it("reports what it removed", () => {
    const { removed } = sanitiseTemplate('<script>x()</script><div onclick="y()">hi</div>');
    expect(removed.length).toBeGreaterThan(0);
    expect(removed.join(" ")).toMatch(/script/i);
  });

  it("says nothing when the template is already safe", () => {
    const { removed } = sanitiseTemplate('<div class="a"><p>Reviews</p></div>');
    expect(removed).toEqual([]);
  });

  it("caps runaway input", () => {
    const { html, removed } = sanitiseTemplate("<p>x</p>".repeat(10000));
    expect(html.length).toBeLessThanOrEqual(20000);
    expect(removed.join(" ")).toMatch(/truncated/i);
  });
});

describe("safe markup survives", () => {
  const safe = [
    '<div class="wrap"><span>Reviews</span></div>',
    '<h3 style="color:#111;font-size:20px">Customer reviews</h3>',
    '<a href="https://example.com/reviews">All reviews</a>',
    '<img src="https://cdn.example.com/badge.png" alt="badge">',
    "<ul><li>One</li><li>Two</li></ul>",
  ];

  it.each(safe)("keeps %s", (markup) => {
    const { html } = sanitiseTemplate(markup);
    expect(html).not.toBe("");
    // The visible structure is preserved rather than flattened.
    expect(html).toContain("<");
  });

  it("keeps placeholders intact", () => {
    const { html } = sanitiseTemplate("<div>{{stars}} {{count}}</div>");
    expect(html).toContain("{{stars}}");
    expect(html).toContain("{{count}}");
  });
});

describe("placeholder substitution", () => {
  const values = {
    stars: "<span>★★★★☆</span>",
    average: "4.5",
    count: "128 reviews",
    title: "Customer reviews",
    breakdown: "<div>bars</div>",
    write_button: "<button>Write</button>",
    review_list: "<div>reviews</div>",
  };

  it("substitutes every documented variable", () => {
    for (const name of TEMPLATE_VARIABLE_NAMES) {
      const out = renderTemplate(`<div>{{${name}}}</div>`, values);
      expect(out).not.toContain(`{{${name}}}`);
    }
  });

  it("tolerates spacing inside the braces", () => {
    expect(renderTemplate("{{ stars }}", values)).toBe(values.stars);
    expect(renderTemplate("{{stars}}", values)).toBe(values.stars);
  });

  it("leaves an unknown placeholder visible", () => {
    // Silently dropping it would leave a blank gap on a live product page
    // with nothing to explain why.
    expect(renderTemplate("{{bogus}}", values)).toBe("{{bogus}}");
  });

  it("renders the starter template with nothing left over", () => {
    const out = renderTemplate(STARTER_TEMPLATE, values);
    expect(out).not.toMatch(/\{\{/);
  });
});

describe("merchant feedback helpers", () => {
  it("names unknown variables", () => {
    expect(unknownVariables("{{stars}} {{nope}} {{alsobad}}").sort()).toEqual([
      "alsobad",
      "nope",
    ]);
  });

  it("finds none in the starter template", () => {
    expect(unknownVariables(STARTER_TEMPLATE)).toEqual([]);
  });

  it("detects a template that would render nothing", () => {
    expect(isEmptyTemplate("   ")).toBe(true);
    expect(isEmptyTemplate("<script>x()</script>")).toBe(true);
    expect(isEmptyTemplate("<div>{{stars}}</div>")).toBe(false);
  });
});
