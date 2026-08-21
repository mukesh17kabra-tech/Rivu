/**
 * CSS for custom widget layouts.
 *
 * The HTML builder shipped without any way to style the result, so a merchant
 * writing `<h3 class="rivu-heading">` had nothing that could define
 * `.rivu-heading` — custom layouts rendered unstyled.
 *
 * Merchant CSS is more dangerous than merchant HTML, because a stylesheet is
 * global by nature. `body { display: none }` would take down their entire
 * storefront, not just the review section. So every selector is rewritten to
 * sit under the widget's own root, and the constructs that can execute or
 * reach outside are stripped.
 */

/** The class the custom layout is wrapped in; every rule is scoped under it. */
export const CUSTOM_SCOPE_CLASS = "rivu-custom-root";

const MAX_CSS_LENGTH = 20000;

export type CssResult = {
  css: string;
  /** Notes for the merchant about what was changed or removed. */
  removed: string[];
};

/**
 * Strips CSS that can execute, load remote resources, or escape the widget.
 *
 * `@import` can pull in an arbitrary stylesheet; `expression()` executes in
 * old IE; `javascript:` in a url() executes; and `@charset` / `<` suggest
 * someone is trying to break out of the style element.
 */
function stripDangerousCss(input: string): CssResult {
  const removed: string[] = [];
  let css = String(input ?? "");

  if (css.length > MAX_CSS_LENGTH) {
    css = css.slice(0, MAX_CSS_LENGTH);
    removed.push(`CSS truncated to ${MAX_CSS_LENGTH} characters.`);
  }

  // Comments first, so nothing can hide inside one.
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");

  if (/<\/?[a-z]/i.test(css)) {
    removed.push("HTML tags were removed — this field is CSS only.");
    css = css.replace(/<\/?[a-z][^>]*>/gi, "");
  }

  if (/@import/i.test(css)) {
    removed.push("@import was removed — it can load an external stylesheet.");
    css = css.replace(/@import[^;]*;?/gi, "");
  }

  if (/expression\s*\(/i.test(css)) {
    removed.push("expression() was removed — it executes script.");
    css = css.replace(/expression\s*\([^)]*\)/gi, "");
  }

  if (/url\s*\(\s*['"]?\s*(javascript|vbscript|data:text\/html)/i.test(css)) {
    removed.push("Script URLs were removed from url().");
    css = css.replace(
      /url\s*\(\s*['"]?\s*(javascript|vbscript|data:text\/html)[^)]*\)/gi,
      "none"
    );
  }

  if (/@charset/i.test(css)) {
    css = css.replace(/@charset[^;]*;?/gi, "");
  }

  return { css: css.trim(), removed };
}

/**
 * Selectors that reach outside the widget and must be retargeted.
 *
 * `*` is deliberately absent: the plain prefix already turns it into
 * `.rivu-custom-root *`, which is both scoped and a truer reading of "every
 * element" than collapsing it onto the root would be.
 */
const GLOBAL_SELECTORS = /^(html|body|:root)\b/i;

/**
 * Prefixes a selector list with the widget scope.
 *
 * `html`, `body`, `:root` and `*` are rewritten to the scope itself rather
 * than dropped, so a merchant who writes `body { font-size: 15px }` gets it
 * applied to the widget instead of silently losing the rule — and crucially
 * not to their whole storefront.
 */
/**
 * Whether a selector is plausible CSS rather than debris.
 *
 * Stripping tags out of `</style><script>window.pwned=1</script>.a{…}` leaves
 * `window.pwned=1.a` as a "selector". It is inert — an invalid selector matches
 * nothing — but emitting attacker-supplied text into a <style> tag is not
 * something to be relaxed about, so anything that isn't selector-shaped is
 * dropped instead of scoped.
 */
function isPlausibleSelector(selector: string): boolean {
  if (!/^[A-Za-z0-9_\-.#:\s>+~*[\]="'()|^$&]+$/.test(selector)) return false;
  // `=` is only legal inside an attribute selector, so anything left over once
  // the bracketed parts are removed means this isn't a selector.
  return !selector.replace(/\[[^\]]*\]/g, "").includes("=");
}

function scopeSelector(selectorList: string): string {
  return selectorList
    .split(",")
    .map((raw) => {
      const selector = raw.trim();
      if (!selector) return "";
      if (!isPlausibleSelector(selector)) return "";

      // Already scoped — don't double-prefix.
      if (selector.startsWith(`.${CUSTOM_SCOPE_CLASS}`)) return selector;

      if (GLOBAL_SELECTORS.test(selector)) {
        const rest = selector.replace(GLOBAL_SELECTORS, "").trim();
        return rest ? `.${CUSTOM_SCOPE_CLASS} ${rest}` : `.${CUSTOM_SCOPE_CLASS}`;
      }

      return `.${CUSTOM_SCOPE_CLASS} ${selector}`;
    })
    .filter(Boolean)
    .join(", ");
}

/** At-rules whose bodies contain nested rules that also need scoping. */
const NESTED_AT_RULE = /^@(media|supports|container|layer)\b/i;

/**
 * Rewrites every rule so it can only apply inside the widget.
 *
 * A deliberately small parser rather than a full CSS one: the input is a short
 * layout stylesheet, and splitting on braces handles rules and one level of
 * @media nesting, which is all this feature needs. Anything it cannot parse is
 * dropped rather than passed through unscoped.
 */
export function scopeCss(input: string): string {
  const out: string[] = [];
  let rest = input;

  while (rest.length) {
    const braceAt = rest.indexOf("{");
    if (braceAt === -1) break;

    const head = rest.slice(0, braceAt).trim();
    // Find the matching close brace, tracking depth for nested at-rules.
    let depth = 0;
    let end = -1;
    for (let i = braceAt; i < rest.length; i++) {
      if (rest[i] === "{") depth++;
      else if (rest[i] === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) break; // unbalanced — discard the remainder

    const body = rest.slice(braceAt + 1, end);
    rest = rest.slice(end + 1);

    if (!head) continue;

    if (NESTED_AT_RULE.test(head)) {
      // Scope the rules inside the block, keep the at-rule itself.
      const inner = scopeCss(body);
      if (inner.trim()) out.push(`${head} { ${inner} }`);
      continue;
    }

    if (head.startsWith("@")) {
      // @keyframes and @font-face carry no selectors to scope, and their
      // bodies are not rules — pass them through untouched.
      out.push(`${head} { ${body.trim()} }`);
      continue;
    }

    const scoped = scopeSelector(head);
    if (scoped && body.trim()) out.push(`${scoped} { ${body.trim()} }`);
  }

  return out.join("\n");
}

/** Sanitise then scope. This is what gets stored and what gets served. */
export function prepareCustomCss(input: string): CssResult {
  const { css, removed } = stripDangerousCss(input);
  if (!css) return { css: "", removed };

  const scoped = scopeCss(css);
  if (!scoped && css) {
    removed.push("The CSS couldn't be parsed, so none of it was applied.");
  }
  return { css: scoped, removed };
}
