import { describe, it, expect } from "vitest";
import { prepareCustomCss, scopeCss, CUSTOM_SCOPE_CLASS } from "../lib/widget-css";
import { DESIGN_PRESETS } from "../lib/design-presets";
import { sanitiseTemplate, TEMPLATE_VARIABLES } from "../lib/widget-template";

const SCOPE = `.${CUSTOM_SCOPE_CLASS}`;

describe("scoping — merchant CSS must not reach the rest of the store", () => {
  it("prefixes an ordinary class selector", () => {
    expect(scopeCss(".card { color: red }")).toBe(`${SCOPE} .card { color: red }`);
  });

  it("prefixes every selector in a comma list, not just the first", () => {
    const out = scopeCss(".a, .b { color: red }");
    expect(out).toContain(`${SCOPE} .a`);
    expect(out).toContain(`${SCOPE} .b`);
  });

  it("retargets `body` at the widget instead of the storefront", () => {
    // The rule that would otherwise hide the merchant's entire site.
    const out = prepareCustomCss("body { display: none }").css;
    expect(out).toBe(`${SCOPE} { display: none }`);
    expect(out.startsWith("body")).toBe(false);
  });

  it("retargets html and :root at the widget root", () => {
    for (const sel of ["html", ":root", "HTML"]) {
      const out = prepareCustomCss(`${sel} { color: red }`).css;
      expect(out, sel).toBe(`${SCOPE} { color: red }`);
    }
  });

  it("turns a universal selector into a scoped one", () => {
    // `.rivu-custom-root *` keeps the "every element" meaning while confining
    // it to the widget; what matters is that a bare `*` never escapes.
    expect(prepareCustomCss("* { margin: 0 }").css).toBe(`${SCOPE} * { margin: 0 }`);
  });

  it("keeps a descendant part when retargeting a global selector", () => {
    expect(prepareCustomCss("body .x { color: red }").css).toBe(
      `${SCOPE} .x { color: red }`
    );
  });

  it("does not double-prefix CSS that is already scoped", () => {
    const once = prepareCustomCss(".card { color: red }").css;
    const twice = prepareCustomCss(once).css;
    expect(twice).toBe(once);
  });

  it("scopes the rules inside a @media block and keeps the block", () => {
    const out = scopeCss("@media (max-width: 600px) { .a { color: red } }");
    expect(out).toContain("@media (max-width: 600px)");
    expect(out).toContain(`${SCOPE} .a`);
  });

  it("leaves @keyframes percentages alone — they are not selectors", () => {
    const out = scopeCss("@keyframes spin { from { opacity: 0 } to { opacity: 1 } }");
    expect(out).toContain("@keyframes spin");
    expect(out).not.toContain(`${SCOPE} from`);
  });

  it("drops unbalanced CSS rather than emitting it unscoped", () => {
    // A stray opening brace must not let the remainder through unprefixed.
    const out = prepareCustomCss(".a { color: red");
    expect(out.css).toBe("");
    expect(out.removed.join(" ")).toMatch(/couldn't be parsed/i);
  });

  it("every rule in the output is scoped", () => {
    const out = scopeCss(
      ".a { color: red } .b, .c { color: blue } @media print { .d { color: green } }"
    );
    for (const line of out.split("\n")) {
      if (line.trim().startsWith("@")) continue;
      expect(line, line).toContain(SCOPE);
    }
  });
});

describe("dangerous CSS", () => {
  it("removes @import, which can load an external stylesheet", () => {
    const out = prepareCustomCss('@import url("//evil.test/x.css"); .a { color: red }');
    expect(out.css).not.toMatch(/@import/i);
    expect(out.css).toContain(`${SCOPE} .a`);
    expect(out.removed.join(" ")).toMatch(/@import/);
  });

  it("removes expression(), which executes", () => {
    const out = prepareCustomCss(".a { width: expression(alert(1)) }");
    expect(out.css).not.toMatch(/expression/i);
  });

  it("neutralises script URLs in url()", () => {
    for (const bad of ["javascript:alert(1)", "vbscript:x", "data:text/html,<x>"]) {
      const out = prepareCustomCss(`.a { background: url(${bad}) }`);
      expect(out.css.toLowerCase(), bad).not.toContain("javascript:");
      expect(out.css.toLowerCase(), bad).not.toContain("vbscript:");
    }
  });

  it("cannot close the style tag it will be injected into", () => {
    const out = prepareCustomCss("</style><script>alert(1)</script>.a{color:red}");
    expect(out.css).not.toContain("</style");
    expect(out.css.toLowerCase()).not.toContain("<script");
  });

  it("drops debris left behind by stripped tags", () => {
    const out = prepareCustomCss(
      "</style><script>window.pwned=1</script>.mine{color:red}"
    );
    // The tags are gone, so nothing executes; this also keeps the leftover
    // text out of the stylesheet entirely.
    expect(out.css).not.toContain("window.pwned");
  });

  it("keeps legitimate selectors the debris filter could catch", () => {
    // Attribute selectors contain `=` and must survive.
    for (const sel of [
      '[data-featured="true"]',
      'a[href^="https"] .x',
      ".a > .b + .c ~ .d",
      ".a:hover::after",
      "#id .cls",
    ]) {
      const out = prepareCustomCss(`${sel} { color: red }`).css;
      expect(out, sel).toContain(SCOPE);
      expect(out, sel).not.toBe("");
    }
  });

  it("does not let a comment hide a dangerous construct", () => {
    // Stripping comments before scanning; otherwise /*x*/@import/*y*/ survives.
    const out = prepareCustomCss("/* c */ @import url(x); .a { color: red }");
    expect(out.css).not.toMatch(/@import/i);
  });

  it("truncates absurdly long input", () => {
    const out = prepareCustomCss(".a { color: red }".repeat(5000));
    expect(out.removed.join(" ")).toMatch(/truncated/i);
  });
});

describe("design presets", () => {
  it("has unique keys", () => {
    const keys = DESIGN_PRESETS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(DESIGN_PRESETS)("$label survives the HTML sanitiser unchanged", (preset) => {
    // A preset that gets stripped on save would look broken the moment the
    // merchant clicked Save — the exact failure this feature already had once.
    const { html, removed } = sanitiseTemplate(preset.html);
    expect(removed).toEqual([]);
    expect(html.replace(/\s+/g, " ").trim()).toBe(
      preset.html.replace(/\s+/g, " ").trim()
    );
  });

  it.each(DESIGN_PRESETS)("$label survives the CSS pipeline", (preset) => {
    const { css, removed } = prepareCustomCss(preset.css);
    expect(removed).toEqual([]);
    expect(css).not.toBe("");
  });

  it.each(DESIGN_PRESETS)("$label only uses real placeholders", (preset) => {
    const known = new Set(TEMPLATE_VARIABLES.map((v) => v.name));
    const used = [...preset.html.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(0);
    for (const name of used) expect(known, name).toContain(name);
  });

  it.each(DESIGN_PRESETS)("$label styles the classes its markup uses", (preset) => {
    // The bug this whole feature is fixing: markup referencing classes that
    // no stylesheet defines, so it renders unstyled.
    const scoped = prepareCustomCss(preset.css).css;
    const classes = [...preset.html.matchAll(/class="([^"]+)"/g)]
      .flatMap((m) => m[1].split(/\s+/))
      .filter(Boolean);
    expect(classes.length).toBeGreaterThan(0);
    for (const cls of classes) {
      expect(scoped, `${preset.key} → .${cls} is never styled`).toContain(`.${cls}`);
    }
  });

  /**
   * {{stars}} and {{breakdown}} expand to several sibling elements — five
   * <svg>s and five bar rows. Dropped straight into a flex container, each
   * becomes its own flex item, so the rating renders as a vertical column of
   * stars. That shipped in Editorial and was latent in the other two.
   */
  it.each(DESIGN_PRESETS)("$label wraps multi-element placeholders", (preset) => {
    for (const name of ["stars", "breakdown"]) {
      const at = preset.html.indexOf(`{{${name}}}`);
      if (at === -1) continue;

      // The placeholder's immediate parent must be an element that exists
      // solely to hold it, so the stylesheet can lay the siblings out.
      const before = preset.html.slice(0, at);
      const openTag = before.match(/<(\w+)([^>]*)>\s*$/);
      expect(
        openTag,
        `${preset.key}: {{${name}}} must sit directly inside its own wrapper element`
      ).not.toBeNull();

      const cls = openTag![2].match(/class="([^"]+)"/)?.[1];
      expect(cls, `${preset.key}: the wrapper around {{${name}}} needs a class`).
        toBeTruthy();

      const after = preset.html.slice(at + `{{${name}}}`.length);
      expect(
        after.trimStart().startsWith(`</${openTag![1]}>`),
        `${preset.key}: {{${name}}} must be the only content of its wrapper`
      ).toBe(true);
    }
  });

  it.each(DESIGN_PRESETS)("$label lays its star wrapper out in a row", (preset) => {
    const at = preset.html.indexOf("{{stars}}");
    const cls = preset.html
      .slice(0, at)
      .match(/<\w+[^>]*class="([^"]+)"[^>]*>\s*$/)?.[1];
    expect(cls).toBeTruthy();

    // A wrapper with no layout of its own leaves the stars as inline svgs at
    // the mercy of the parent — declaring flex is what keeps them in a row.
    const rule = preset.css.match(
      new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`)
    )?.[1];
    expect(rule, `${preset.key}: .${cls} is never styled`).toBeTruthy();
    expect(rule, `${preset.key}: .${cls} must set its own layout`).toMatch(
      /display:\s*(inline-)?flex/
    );
  });

  it.each(DESIGN_PRESETS)("$label styles the review list, not just the summary", (preset) => {
    // Presets originally only styled the header, so every design showed the
    // same review card underneath and the three looked interchangeable.
    expect(preset.css, `${preset.key}: never styles .rv-card`).toContain(".rv-card");
  });

  it("gives each preset a visibly different card", () => {
    // Compares the .rv-card rule across presets — same rule means same look.
    const cardRules = DESIGN_PRESETS.map((p) => ({
      key: p.key,
      rule: p.css.match(/\.rv-card\s*\{([^}]*)\}/)?.[1]?.replace(/\s+/g, " ").trim(),
    }));

    for (const { key, rule } of cardRules) {
      expect(rule, `${key} has no .rv-card rule`).toBeTruthy();
    }
    const unique = new Set(cardRules.map((c) => c.rule));
    expect(unique.size, "two presets share an identical card design").toBe(
      DESIGN_PRESETS.length
    );
  });

  it.each(DESIGN_PRESETS)("$label includes the review list", (preset) => {
    // Without it the widget renders a summary and no reviews at all.
    expect(preset.html).toContain("{{review_list}}");
  });
});
