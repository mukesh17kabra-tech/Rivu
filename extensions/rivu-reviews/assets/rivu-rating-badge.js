/**
 * Rivu Rating Badge — two modes:
 *
 * 1. EXPLICIT mode: Merchant adds <div class="rivu-rating-badge"> manually.
 *    Used for the "Rivu Rating Badge" Shopify block on product pages.
 *
 * 2. AUTO-INJECT mode: Activated by data-auto-inject="true" on the script
 *    tag (set by the App Embed block). Scans the whole page for product
 *    card links (/products/HANDLE) and injects compact star badges next to
 *    each product's title — no theme modification needed, works on any theme,
 *    exactly like Judge.me / Loox / Okendo do it.
 */
(function () {
  // document.currentScript is null when script is deferred — use querySelector fallback.
  // We target specifically the embed script (has data-auto-inject) so we don't
  // accidentally pick up the reviews block script.
  const scriptTag =
    document.querySelector('script[data-auto-inject]') ||
    document.querySelector('script[data-api-base][data-shop]') ||
    document.currentScript;
  const API_BASE = (scriptTag && scriptTag.dataset.apiBase) || "";
  const SHOP = (scriptTag && scriptTag.dataset.shop) || "";
  const AUTO_INJECT = scriptTag && scriptTag.dataset.autoInject === "true";
  const EMBED_STAR_SIZE = parseInt((scriptTag && scriptTag.dataset.badgeStarSize) || "14", 10);

  // ── SVG star (reliable cross-browser, no font dependency) ────────────────
  function svgStar(filled, color, size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? color : "none"}" stroke="${color}" stroke-width="1.8" style="display:inline-block;vertical-align:middle;flex-shrink:0;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>`;
  }
  function starsHtml(average, color, size) {
    return [1,2,3,4,5].map(n => svgStar(n <= Math.round(average), color, size)).join("");
  }

  // ── Fetch average + render a badge into a container el ───────────────────
  const cache = {};
  async function fetchSummary(shop, productId, apiBase) {
    const key = `${shop}|${productId}`;
    if (cache[key]) return cache[key];
    try {
      const res = await fetch(
        `${apiBase}/api/reviews/summary?shop=${encodeURIComponent(shop)}&productId=${encodeURIComponent(productId)}`
      );
      const data = res.ok ? await res.json() : null;
      cache[key] = data;
      return data;
    } catch { return null; }
  }

  function renderBadge(container, data, starSize, scrollTarget) {
    if (!data || !data.total) { container.innerHTML = ""; return; }
    const color = data.starColor || "#f5b400";
    const tc = data.textColor || "#555";
    const size = starSize || data.ratingBadgeStarSize || 16;
    const template = data.ratingBadgeTemplate || "{rating}";

    // Count shown only if merchant explicitly uses {count} in template
    const starsMarkup = starsHtml(data.average, color, size);
    const countHtml = template.includes("{count}")
      ? ""  // already handled inline via {count} replacement below
      : "";  // never auto-append count — merchant controls this via template

    // Apply title case to the text parts of the template (not the {rating}/{count} placeholders)
    function toTitleCase(str) {
      return str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
    }

    const titledTemplate = template.replace(/([^{}]+)(?=\{|$)/g, (m) => toTitleCase(m));

    const inner = titledTemplate
      .replace(/\{rating\}/g, starsMarkup)
      .replace(/\{count\}/g, `<span style="font-size:${Math.max(size - 4, 10)}px;color:${tc};opacity:.75;margin-left:2px;">${data.total}</span>`);

    container.style.cssText = "display:inline-flex;align-items:center;gap:2px;text-decoration:none;";
    container.innerHTML = inner;

    if (scrollTarget) {
      container.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.querySelector(".rivu-review-widget") ||
          document.querySelector("#review-widget");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  // ── EXPLICIT mode: <div class="rivu-rating-badge"> ───────────────────────
  async function renderExplicit(el) {
    const shop = el.dataset.shop || SHOP;
    const productId = el.dataset.productId;
    const apiBase = el.dataset.apiBase || API_BASE;
    const starSize = parseInt(el.dataset.starSize || "0", 10) || undefined;
    if (!shop || !productId) return;
    const data = await fetchSummary(shop, productId, apiBase);
    const wrapper = document.createElement("a");
    wrapper.href = "#rivu-reviews";
    el.appendChild(wrapper);
    renderBadge(wrapper, data, starSize, true);
  }

  document.querySelectorAll(".rivu-rating-badge").forEach(renderExplicit);

  // ── AUTO-INJECT mode ─────────────────────────────────────────────────────
  // Finds every product card link on the page (href contains /products/),
  // resolves the handle → productId via Shopify's storefront JSON endpoint,
  // then injects a compact badge.
  if (!AUTO_INJECT || !SHOP || !API_BASE) return;

  const HANDLE_CACHE = {};

  async function getProductData(handle) {
    if (HANDLE_CACHE[handle]) return HANDLE_CACHE[handle];
    try {
      const res = await fetch(`/products/${handle}.js`);
      if (!res.ok) return null;
      const data = await res.json();
      HANDLE_CACHE[handle] = data;
      return data;
    } catch { return null; }
  }

  async function injectBadge(linkEl) {
    // Already injected?
    if (linkEl.dataset.rivuInjected) return;
    linkEl.dataset.rivuInjected = "1";

    const href = linkEl.getAttribute("href") || "";
    const match = href.match(/\/products\/([^?#/]+)/);
    if (!match) return;
    const handle = match[1];

    const product = await getProductData(handle);
    if (!product) return;

    // Shopify product IDs in storefront JSON come as plain integers;
    // the reviews API uses the GID format ("gid://shopify/Product/123456")
    const gid = `gid://shopify/Product/${product.id}`;

    const summary = await fetchSummary(SHOP, gid, API_BASE);
    if (!summary || !summary.total) return;

    // Find a good place to inject — prefer a title element inside the card,
    // fall back to injecting right after the link itself.
    const card = linkEl.closest("[class*='card'], [class*='product-card'], [class*='product-item'], li, article") || linkEl.parentElement;
    if (!card) return;

    // Check if we already injected a badge into this card
    if (card.querySelector(".rivu-auto-badge")) return;

    const badge = document.createElement("div");
    badge.className = "rivu-auto-badge";
    badge.style.cssText = "display:flex;align-items:center;gap:2px;margin-top:3px;flex-wrap:wrap;";

    const color = summary.starColor || "#f5b400";
    const tc = summary.textColor || "#555";
    badge.innerHTML = starsHtml(summary.average, color, EMBED_STAR_SIZE) +
      `<span style="font-size:${Math.max(EMBED_STAR_SIZE - 4, 10)}px;color:${tc};opacity:.7;margin-left:3px;vertical-align:middle;">(${summary.total})</span>`;

    // Try to insert after the product title link, or at the end of the card
    const titleEl = card.querySelector("[class*='title'] a, [class*='name'] a, h3 a, h2 a");
    if (titleEl && titleEl.parentElement) {
      titleEl.parentElement.insertAdjacentElement("afterend", badge);
    } else {
      card.appendChild(badge);
    }
  }

  function scanAndInject() {
    // All anchor tags pointing to /products/ URLs — these are product cards
    document.querySelectorAll('a[href*="/products/"]').forEach(injectBadge);
  }

  // Run immediately + watch for dynamically loaded content (infinite scroll, etc.)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanAndInject);
  } else {
    scanAndInject();
  }

  // MutationObserver for themes with lazy-loaded or dynamically added cards
  const observer = new MutationObserver((mutations) => {
    let hasNewNodes = false;
    for (const m of mutations) {
      if (m.addedNodes.length) { hasNewNodes = true; break; }
    }
    if (hasNewNodes) scanAndInject();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Also re-scan on popstate (SPA-style navigation in some themes)
  window.addEventListener("popstate", scanAndInject);
})();
