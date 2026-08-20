/**
 * Custom widget templates — the Pro "build your own layout" feature.
 *
 * A merchant writes HTML containing placeholders like {{stars}} and
 * {{review_list}}, and the storefront widget substitutes real content into it.
 *
 * This is the most security-sensitive code in the app. The HTML is authored by
 * a merchant but executes in *their shoppers'* browsers, on pages that handle
 * carts and checkout. A stored `<script>` here is not a bug in Rivu's admin —
 * it is script execution on someone else's storefront. So the template is
 * sanitised when it is saved *and* again before it renders, and the renderer
 * never trusts what the database hands it.
 */

/** A placeholder a merchant may use, and what it becomes. */
export type TemplateVariable = {
  name: string;
  label: string;
  description: string;
};

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { name: "stars", label: "Star icons", description: "Filled stars for the average rating" },
  { name: "average", label: "Average score", description: 'e.g. "4.5"' },
  { name: "count", label: "Review count", description: 'e.g. "128 reviews"' },
  { name: "title", label: "Widget heading", description: "Your configured heading text" },
  { name: "breakdown", label: "Rating bars", description: "The 5→1 star percentage bars" },
  { name: "write_button", label: "Write a review button", description: "Opens the review form" },
  { name: "review_list", label: "The reviews", description: "Every review, in your chosen layout" },
];

export const TEMPLATE_VARIABLE_NAMES = TEMPLATE_VARIABLES.map((v) => v.name);

/** Matches {{ name }} with optional surrounding whitespace. */
export const TEMPLATE_TOKEN = /\{\{\s*([a-z_]+)\s*\}\}/g;

/**
 * Tags that may never appear. `script` and `iframe` execute; `style` can
 * cover the whole page; form elements can phish a shopper mid-checkout; and
 * `base` rewrites every relative URL on the page.
 */
const FORBIDDEN_TAGS = [
  "script", "iframe", "object", "embed", "link", "meta", "base",
  "style", "form", "input", "button", "textarea", "select", "option",
  "svg", "math", "template", "slot", "portal", "frame", "frameset",
];

const MAX_TEMPLATE_LENGTH = 20000;

export type SanitiseResult = {
  html: string;
  /** Human-readable notes about what was stripped, shown to the merchant. */
  removed: string[];
};

/**
 * Strips anything that could execute or hijack the page.
 *
 * Deliberately an allow-nothing-dangerous filter rather than a full HTML
 * parser: the input is a small layout snippet, and a conservative filter that
 * occasionally removes something harmless is the right trade when the cost of
 * a miss is script execution on a shopper's browser.
 */
export function sanitiseTemplate(input: string): SanitiseResult {
  const removed: string[] = [];
  let html = String(input ?? "");

  if (html.length > MAX_TEMPLATE_LENGTH) {
    html = html.slice(0, MAX_TEMPLATE_LENGTH);
    removed.push(`Template truncated to ${MAX_TEMPLATE_LENGTH} characters.`);
  }

  // Whole elements, including their content — a <script> body must go too.
  for (const tag of FORBIDDEN_TAGS) {
    const paired = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, "gi");
    const selfClosing = new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi");
    if (paired.test(html) || selfClosing.test(html)) {
      removed.push(`<${tag}> is not allowed`);
    }
    html = html.replace(paired, "").replace(selfClosing, "");
  }

  // Event handlers: onclick, onerror, onload — any on* attribute.
  if (/\son[a-z]+\s*=/i.test(html)) {
    removed.push("Event handlers (onclick, onerror, …) were removed");
  }
  html = html.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  html = html.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  html = html.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");

  // Script-bearing URL schemes in href/src/style.
  if (/(javascript|data|vbscript)\s*:/i.test(html)) {
    removed.push("javascript:, data: and vbscript: URLs were removed");
  }
  html = html.replace(/(href|src|action|formaction)\s*=\s*(["'])\s*(javascript|data|vbscript)\s*:[^"']*\2/gi, "");

  // CSS expressions and imports inside style attributes.
  html = html.replace(/style\s*=\s*(["'])([^"']*)\1/gi, (match, quote, css: string) => {
    if (/expression\s*\(|@import|url\s*\(\s*['"]?\s*(javascript|data|vbscript):/i.test(css)) {
      removed.push("Unsafe CSS was removed from a style attribute");
      return "";
    }
    return match;
  });

  return { html: html.trim(), removed: [...new Set(removed)] };
}

/** Placeholders used in a template that aren't ones we understand. */
export function unknownVariables(template: string): string[] {
  const found = new Set<string>();
  for (const match of template.matchAll(TEMPLATE_TOKEN)) {
    if (!TEMPLATE_VARIABLE_NAMES.includes(match[1])) found.add(match[1]);
  }
  return [...found];
}

/** True when the template would render nothing recognisable. */
export function isEmptyTemplate(template: string): boolean {
  return sanitiseTemplate(template).html.replace(/\s/g, "") === "";
}

/**
 * Substitutes placeholders with already-rendered HTML fragments.
 *
 * `values` must contain HTML the app generated itself — never merchant or
 * shopper input. An unknown placeholder is left visible rather than silently
 * dropped, so a typo shows up in the preview instead of leaving a blank gap on
 * a live product page.
 */
export function renderTemplate(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(TEMPLATE_TOKEN, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? values[name] : whole
  );
}

/** The starting point offered to a merchant who enables the feature. */
export const STARTER_TEMPLATE = `<div class="rivu-custom">
  <h3 class="rivu-heading">{{title}}</h3>

  <div class="rivu-top">
    <span class="rivu-score">{{average}}</span>
    {{stars}}
    <span class="rivu-count">{{count}}</span>
  </div>

  {{breakdown}}
  {{write_button}}
  {{review_list}}
</div>`;
