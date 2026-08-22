import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Counts the event listeners the widget actually attaches.
 *
 * The sort menu shipped dead: wireSort ran standalone *and* from rewireMain,
 * which also runs during first render, so the button collected two click
 * listeners. Each click flipped `hidden` twice and the panel never appeared.
 *
 * Nothing in the existing suite could see it. The markup was right, the
 * handler was right, and rendering the widget produced exactly the expected
 * HTML — the defect lived entirely in how many times a listener was bound. So
 * this harness returns a stable node per selector and records every
 * addEventListener call against it.
 */

const sources: [string, string][] = [
  ["public widget", "../public/widget.js"],
  ["theme extension widget", "../extensions/rivu-reviews/assets/rivu-widget.js"],
];

type Listener = { type: string; fn: (e: unknown) => void };

function makeHarness() {
  /** One node per selector, so repeated lookups return the same object. */
  const nodes = new Map<string, Record<string, unknown>>();
  const documentListeners: Listener[] = [];

  function node(key: string): Record<string, unknown> {
    const existing = nodes.get(key);
    if (existing) return existing;

    const listeners: Listener[] = [];
    const el: Record<string, unknown> = {
      __key: key,
      __listeners: listeners,
      innerHTML: "",
      textContent: "",
      hidden: true,
      value: "",
      style: { cssText: "" },
      dataset: {},
      classList: { add: () => {}, remove: () => {} },
      addEventListener: (type: string, fn: (e: unknown) => void) =>
        listeners.push({ type, fn }),
      removeEventListener: () => {},
      setAttribute: () => {},
      getAttribute: () => null,
      appendChild: () => {},
      removeChild: () => {},
      remove: () => {},
      contains: () => false,
      focus: () => {},
      setSelectionRange: () => {},
      scrollIntoView: () => {},
      getBoundingClientRect: () => ({ left: 0, width: 200, top: 0, height: 20 }),
      querySelector: (sel: string) => node(`${key} ${sel}`),
      querySelectorAll: () => [],
    };
    nodes.set(key, el);
    return el;
  }

  return { nodes, node, documentListeners };
}

/** Counts click listeners on the first node whose key ends with `selector`. */
function clickListenersOn(
  nodes: Map<string, Record<string, unknown>>,
  selector: string
): number {
  let total = 0;
  for (const [key, el] of nodes) {
    if (!key.endsWith(selector)) continue;
    total += (el.__listeners as Listener[]).filter((l) => l.type === "click").length;
  }
  return total;
}

async function run(rel: string) {
  const source = readFileSync(path.resolve(__dirname, rel), "utf8");
  const h = makeHarness();

  const target = h.node("#target");
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
    createElement: () => h.node("created"),
    head: { appendChild: () => {} },
    body: { appendChild: () => {} },
    querySelector: (sel: string) =>
      sel.includes("script") ? { getAttribute: () => null } : h.node(sel),
    querySelectorAll: (sel: string) =>
      sel.includes("review-widget") || sel.includes("rivu-review-widget")
        ? [target]
        : [],
    addEventListener: (type: string, fn: (e: unknown) => void) =>
      h.documentListeners.push({ type, fn }),
  };
  g.window = {
    location: { href: "https://shop.test/products/board" },
    addEventListener: () => {},
    matchMedia: () => ({ matches: false }),
  };
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

  const REVIEWS = [1, 2].map((n) => ({
    id: `r${n}`,
    rating: 5,
    reviewTitle: "Good",
    body: "A perfectly reasonable review body.",
    customerName: `Reviewer ${n}`,
    createdAt: new Date().toISOString(),
    photoUrl: null,
    videoUrl: null,
    recommends: true,
    ownerReply: null,
  }));

  g.fetch = vi.fn(async (url: string) => ({
    ok: true,
    status: 200,
    text: async () => "",
    json: async () =>
      String(url).includes("/api/reviews/list")
        ? {
            reviews: REVIEWS,
            summary: {
              total: 2,
              average: 5,
              breakdown: [5, 4, 3, 2, 1].map((star) => ({
                star,
                count: star === 5 ? 2 : 0,
                percentage: star === 5 ? 100 : 0,
              })),
              recommend: { percent: 100, count: 2, answered: 2 },
            },
            plan: "pro",
            availableLanguages: [{ code: "en", label: "English" }],
            design: {
              customTemplateEnabled: false,
              summaryLayout: "modern",
              displayStyle: "list",
              richSnippetsEnabled: false,
            },
          }
        : { items: [], suggestions: [] },
  }));

  new Function(source)();
  await new Promise((r) => setTimeout(r, 300));
  return h;
}

/**
 * Forces the widget to rebuild its list, the way typing in the search box
 * does. Re-render is when duplicate wiring accumulates, so a harness that only
 * ever renders once cannot see it.
 */
async function reRender(h: ReturnType<typeof makeHarness>) {
  for (const [key, el] of h.nodes) {
    if (!key.endsWith(".rv-search")) continue;
    const input = (el.__listeners as Listener[]).find((l) => l.type === "input");
    if (input) input.fn({});
  }
  await new Promise((r) => setTimeout(r, 50));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(sources)("%s event wiring", (_name, rel) => {
  it("binds exactly one click listener to the sort button", async () => {
    // Two listeners is not a smaller bug than none: the panel opens and closes
    // within the same click, so the menu looks broken rather than glitchy.
    const h = await run(rel);
    expect(clickListenersOn(h.nodes, ".rv-sort-toggle")).toBe(1);
  });

  it("binds exactly one click listener to the write-review button", async () => {
    // Same failure mode, different button — this one is wired in two places
    // by design, so it is worth pinning.
    const h = await run(rel);
    expect(clickListenersOn(h.nodes, ".rv-open-form-btn")).toBeLessThanOrEqual(1);
  });

  it("registers the outside-click handler once, not per re-render", async () => {
    // It used to live inside wireSort, which runs again after every sort,
    // every search keystroke and every "load more" — each adding a listener
    // holding a panel that no longer exists.
    //
    // Re-rendered first, deliberately: with a single render both placements
    // register exactly one listener, so the assertion would pass either way.
    const h = await run(rel);
    const before = h.documentListeners.filter((l) => l.type === "click").length;

    await reRender(h);
    await reRender(h);

    const after = h.documentListeners.filter((l) => l.type === "click").length;

    // Exactly one, not "at most one". An earlier version of this assertion
    // allowed zero, so deleting the handler outright — which leaves the menu
    // with no way to dismiss but the option list — passed cleanly.
    expect(before).toBe(1);
    expect(after).toBe(before);
  });

  it("does not re-bind the sort button on every re-render", async () => {
    const h = await run(rel);
    await reRender(h);
    await reRender(h);
    expect(clickListenersOn(h.nodes, ".rv-sort-toggle")).toBe(1);
  });
});

describe.each(sources)("%s wiring structure", (_name, rel) => {
  const src = readFileSync(path.resolve(__dirname, rel), "utf8");

  it("calls wireSort from exactly one place", () => {
    const calls = (src.match(/^\s*wireSort\(\);/gm) || []).length;
    expect(calls).toBe(1);
  });

  it("skips a node it has already wired", () => {
    expect(src).toContain("toggle.dataset.rvWired");
  });
});
