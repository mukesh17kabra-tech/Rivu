/**
 * Rivu Rating Badge
 *
 * MODE 1 — Explicit: <div class="rivu-rating-badge" data-shop="..." data-product-id="...">
 *   Used when merchant adds the Rating Badge block on product page via theme editor.
 *   Clicking it scrolls to the full reviews section.
 *
 * MODE 2 — Auto-inject: activated by data-auto-inject="true" on the script tag.
 *   Scans all product card links on the page and injects star badges automatically
 *   without needing app block slots — works on any theme, just like Judge.me/Loox.
 */
(function () {
  // Read config from the script tag (set by App Embed liquid block).
  // NOTE: document.currentScript is null for deferred scripts, so we
  // use querySelector as fallback — targets the embed script specifically.
  var scriptEl = document.querySelector('script[data-auto-inject]');
  var GLOBAL_API_BASE = (scriptEl && scriptEl.getAttribute('data-api-base')) || '';
  var GLOBAL_SHOP = (scriptEl && scriptEl.getAttribute('data-shop')) || '';
  var AUTO_INJECT = scriptEl && scriptEl.getAttribute('data-auto-inject') === 'true';
  var CARD_STAR_SIZE = parseInt((scriptEl && scriptEl.getAttribute('data-badge-star-size')) || '14', 10);

  // ── SVG star — reliable, no font dependency ─────────────────────────────
  function svgStar(filled, color, size) {
    var fill = filled ? color : 'none';
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' + fill + '" stroke="' + color + '" stroke-width="1.8" style="display:inline-block;vertical-align:middle;flex-shrink:0;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>';
  }

  function starsHtml(average, color, size) {
    var rounded = Math.round(average);
    var html = '';
    for (var i = 1; i <= 5; i++) html += svgStar(i <= rounded, color, size);
    return html;
  }

  // ── API fetch with simple in-memory cache ────────────────────────────────
  var cache = {};
  function fetchSummary(shop, productId, apiBase, callback) {
    var key = shop + '|' + productId;
    if (cache[key]) { callback(cache[key]); return; }
    var url = apiBase + '/api/reviews/summary?shop=' + encodeURIComponent(shop) + '&productId=' + encodeURIComponent(productId);
    fetch(url)
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) { if (data) { cache[key] = data; callback(data); } })
      .catch(function() {});
  }

  // ── Render badge into an element ──────────────────────────────────────────
  function renderBadge(container, data, starSize, onClickScrollToReviews) {
    if (!data || !data.total) { container.innerHTML = ''; return; }
    var color = data.starColor || '#f5b400';
    var tc = data.textColor || '#555';
    var size = starSize || data.ratingBadgeStarSize || 16;
    var template = data.ratingBadgeTemplate || '{rating}';

    function toTitleCase(str) {
      return str.replace(/\w\S*/g, function(t) { return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(); });
    }

    // Apply title case to non-placeholder parts
    var titled = template.replace(/([^{}]+)(?=\{|$)/g, function(m) { return toTitleCase(m); });
    var stars = starsHtml(data.average, color, size);
    var inner = titled.replace(/\{rating\}/g, stars).replace(/\{count\}/g, '<span style="color:' + tc + ';opacity:.75;">' + data.total + '</span>');

    container.style.cssText = 'display:inline-flex;align-items:center;gap:3px;text-decoration:none;cursor:pointer;';
    container.innerHTML = inner;

    if (onClickScrollToReviews) {
      container.addEventListener('click', function(e) {
        e.preventDefault();
        var target = document.querySelector('#rivu-review-section') ||
                     document.querySelector('.rivu-review-widget') ||
                     document.querySelector('#review-widget');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  // ── MODE 1: Explicit .rivu-rating-badge divs ─────────────────────────────
  // Mark them so auto-inject (MODE 2) skips the same product card.
  var explicitBadges = document.querySelectorAll('.rivu-rating-badge');
  explicitBadges.forEach(function(el) {
    if (el.dataset.rivuRendered) return;
    el.dataset.rivuRendered = '1';
    var shop = el.getAttribute('data-shop') || GLOBAL_SHOP;
    var productId = el.getAttribute('data-product-id');
    var apiBase = el.getAttribute('data-api-base') || GLOBAL_API_BASE;
    var starSize = parseInt(el.getAttribute('data-star-size') || '0', 10) || undefined;
    if (!shop || !productId) return;
    fetchSummary(shop, productId, apiBase, function(data) {
      renderBadge(el, data, starSize, true);
    });
  });

  // ── MODE 2: Auto-inject on product cards ─────────────────────────────────
  if (!AUTO_INJECT || !GLOBAL_SHOP || !GLOBAL_API_BASE) return;

  var productCache = {};
  function getProductId(handle, callback) {
    if (productCache[handle]) { callback(productCache[handle]); return; }
    fetch('/products/' + handle + '.js')
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(p) {
        if (p && p.id) {
          // Store both numeric and GID format — try numeric first
          productCache[handle] = String(p.id);
          callback(productCache[handle]);
        }
      })
      .catch(function() {});
  }

  var injected = new Set();

  function injectBadgeOnCard(linkEl) {
    var href = linkEl.getAttribute('href') || '';
    var match = href.match(/\/products\/([^?#/]+)/);
    if (!match) return;
    var handle = match[1];

    // Find the product card container
    var card = linkEl.closest('li, article, [class*="card"], [class*="product-item"], [class*="grid__item"]') || linkEl.parentElement;
    if (!card) return;

    // Skip if already injected in this card
    if (card.dataset.rivuBadge) return;
    card.dataset.rivuBadge = '1';

    getProductId(handle, function(numericId) {
      // Try to match the stored productId — stored as GID in DB from QR flow,
      // or as numeric ID from product page Liquid. We try both.
      var gid = 'gid://shopify/Product/' + numericId;
      
      // First try GID format
      fetchSummary(GLOBAL_SHOP, gid, GLOBAL_API_BASE, function(data) {
        if (data && data.total) {
          injectStars(card, linkEl, data, CARD_STAR_SIZE);
        } else {
          // Fall back to numeric ID format
          fetchSummary(GLOBAL_SHOP, numericId, GLOBAL_API_BASE, function(data2) {
            if (data2 && data2.total) injectStars(card, linkEl, data2, CARD_STAR_SIZE);
          });
        }
      });
    });
  }

  function injectStars(card, linkEl, data, starSize) {
    // Skip if card already has an explicit badge block OR auto-badge
    if (card.querySelector('.rivu-auto-badge') || card.querySelector('.rivu-rating-badge[data-rivu-rendered]')) return;
    var color = data.starColor || '#f5b400';
    var tc = data.textColor || '#555';
    var badge = document.createElement('div');
    badge.className = 'rivu-auto-badge';
    badge.style.cssText = 'display:flex;align-items:center;gap:3px;margin-top:4px;';
    badge.innerHTML = starsHtml(data.average, color, starSize) +
      '<span style="font-size:' + Math.max(starSize - 3, 10) + 'px;color:' + tc + ';opacity:.65;margin-left:2px;">(' + data.total + ')</span>';

    // Insert after the title/name element if possible, else after the link
    var titleEl = card.querySelector('[class*="title"], [class*="name"], h2, h3');
    if (titleEl) {
      titleEl.insertAdjacentElement('afterend', badge);
    } else {
      linkEl.insertAdjacentElement('afterend', badge);
    }
  }

  function scanCards() {
    document.querySelectorAll('a[href*="/products/"]:not([data-rivu-scanned])').forEach(function(link) {
      link.dataset.rivuScanned = '1';
      // Only inject once per unique product link
      var href = link.getAttribute('href') || '';
      var match = href.match(/\/products\/([^?#/]+)/);
      if (!match) return;
      injectBadgeOnCard(link);
    });
  }

  // Run immediately and on DOM changes
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanCards);
  } else {
    scanCards();
  }

  // Watch for dynamically added cards (infinite scroll, etc.)
  if (window.MutationObserver) {
    new MutationObserver(function(mutations) {
      var hasNew = mutations.some(function(m) { return m.addedNodes.length > 0; });
      if (hasNew) scanCards();
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
