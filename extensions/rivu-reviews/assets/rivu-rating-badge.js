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
  // Hover state for the badge label. Injected once; scoped so it cannot leak
  // into the merchant's theme.
  if (!document.getElementById('rivu-badge-styles')) {
    var bs = document.createElement('style');
    bs.id = 'rivu-badge-styles';
    bs.textContent =
      '.rivu-rating-badge{transition:opacity .15s}' +
      '.rivu-rating-badge:hover{opacity:.82}' +
      '.rivu-rating-badge:hover .rivu-badge-label{text-decoration:underline;text-underline-offset:2px}';
    document.head.appendChild(bs);
  }

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

    // Sentence case, not Title Case. The old version capitalised every word,
    // turning "rating for this product" into "Rating For This Product", which
    // reads like a bug rather than a label.
    function sentenceCase(str) {
      return str.replace(/^(\s*)([a-z])/, function (_m, space, ch) {
        return space + ch.toUpperCase();
      });
    }

    // The stars are wrapped in one element so the badge's own gap separates
    // them from the label rather than being shared out between five icons —
    // that is why the text used to sit flush against the last star.
    var stars =
      '<span style="display:inline-flex;align-items:center;gap:1px;flex-shrink:0;">' +
      starsHtml(data.average, color, size) +
      '</span>';

    var average = Number(data.average || 0).toFixed(1);
    var averageHtml =
      '<span style="font-weight:700;color:' + tc + ';font-variant-numeric:tabular-nums;">' +
      average +
      '</span>';
    var countHtml =
      '<span style="color:' + tc + ';opacity:.6;">' +
      data.total +
      ' review' + (Number(data.total) === 1 ? '' : 's') +
      '</span>';

    // Placeholders and literal text are matched in ONE pass.
    //
    // Wrapping the literals first was a bug: /([^{}]+)/ also matches the word
    // *inside* the braces, so {rating} became {<span>rating</span>} and the
    // later substitution no longer matched it — the storefront rendered a
    // literal "{ rating }" instead of stars.
    // sentenceCase is applied to the first *label*, not to the template.
    // Templates normally open with "{rating}", so casing the whole string
    // changes nothing — the first character is a brace — and the visible text
    // stays lowercase. Mirrors renderBadgePreview in lib/badge-template.ts.
    var capitalised = false;
    var inner = template.replace(
      /\{(rating|average|count)\}|([^{}]+)/g,
      function (_match, placeholder, text) {
        if (placeholder === 'rating') return stars;
        if (placeholder === 'average') return averageHtml;
        if (placeholder === 'count') return countHtml;
        // Whitespace-only runs are dropped; the flex gap supplies spacing.
        if (!text || !text.trim()) return '';

        var label = text.trim();
        if (!capitalised) { label = sentenceCase(label); capitalised = true; }
        return '<span class="rivu-badge-label" style="color:' + tc +
          ';opacity:.75;font-weight:500;">' + label + '</span>';
      }
    );

    container.style.cssText =
      'display:inline-flex;align-items:center;gap:7px;line-height:1;' +
      'text-decoration:none;cursor:pointer;font-size:' + Math.max(size - 2, 12) + 'px;';
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
    if (!shop || !productId) {
      // Same reasoning as the review widget: a rating badge needs a product.
      // Explain it in the theme editor, stay invisible on the storefront.
      if (window.Shopify && window.Shopify.designMode) {
        el.innerHTML =
          '<p style="font-size:13px;line-height:1.5;padding:12px;border:1px dashed #c9c9d2;' +
          'border-radius:8px;color:#6d6d78;"><strong>Rivu Rating Badge</strong><br/>' +
          'Shows one product\'s star rating, so it only works on a product page. ' +
          'For a store-wide rating, use <strong>Rivu Trust Badge</strong>.</p>';
      }
      return;
    }
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

  /** Elements a theme is likely to use for a product's name. */
  var TITLE_SELECTOR = '[class*="title"], [class*="name"], [class*="heading"], h2, h3, h4';

  /**
   * The element that represents this product, found by looking for its title.
   *
   * Guessing the container from class names does not work. Every attempt hit
   * the same trap from a different angle: closest() considers the element
   * itself, so Dawn's image link matched [class*="card"] via its own
   * "card__media-link" class; and once that was fixed, the cart's media cell
   * matched [class*="cart-item"] via "cart-item__media". Both are inner
   * elements, so the two links to one product resolved to different containers
   * — the duplicate badges — and the badge landed on top of the image because
   * there was no title inside the container to sit under.
   *
   * Walking up until an ancestor actually contains a title element finds the
   * cart row and the product card without knowing anything about either
   * theme's class names.
   */
  function containerFor(linkEl) {
    var node = linkEl.parentElement;
    for (var depth = 0; depth < 5 && node; depth++) {
      if (node.querySelector && node.querySelector(TITLE_SELECTOR)) return node;
      node = node.parentElement;
    }
    // No title anywhere nearby: fall back to the immediate parent, which is
    // what this did before, rather than skipping the product entirely.
    return linkEl.parentElement || linkEl;
  }

  function injectBadgeOnCard(linkEl) {
    var href = linkEl.getAttribute('href') || '';
    var match = href.match(/\/products\/([^?#/]+)/);
    if (!match) return;
    var handle = match[1];

    /**
     * The element that represents this product on the page.
     *
     * A cart line and most product cards contain TWO links to the same
     * product — one wrapping the image, one wrapping the title. Cart markup
     * matches none of the card selectors below, so this used to fall back to
     * linkEl.parentElement, which is a different element for each of those two
     * links. The "already injected" flag was then set on two separate nodes and
     * both badges rendered: the duplicate stars reported in the cart drawer.
     *
     * Cart and line-item patterns are included, and tr, so those lines resolve
     * to one shared container.
     */
    var card = containerFor(linkEl);
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
          injectStars(card, linkEl, data, CARD_STAR_SIZE, handle);
        } else {
          // Fall back to numeric ID format
          fetchSummary(GLOBAL_SHOP, numericId, GLOBAL_API_BASE, function(data2) {
            if (data2 && data2.total) injectStars(card, linkEl, data2, CARD_STAR_SIZE, handle);
          });
        }
      });
    });
  }

  /** How far up to look for a badge already placed for the same product. */
  var DEDUPE_DEPTH = 4;

  /**
   * Whether this product already has a badge nearby.
   *
   * Runs at injection time, not scan time: the badges arrive after two chained
   * fetches, so at scan time there is nothing yet to find. My first attempt
   * checked then and deduped nothing.
   *
   * Walks up a few ancestors rather than trusting a container selector. A cart
   * line and a product card both hold two links to the same product — image
   * and title — and class-substring matching resolves them to different
   * elements: on Dawn's collection card the image link's nearest "card" is
   * .card while the title link's is h3.card__heading. Four levels reaches the
   * shared line or card in every theme layout checked, and stops short of a
   * neighbouring section, so the same product shown in two different rows
   * still gets a badge in each.
   */
  function badgeAlreadyNear(linkEl, handle) {
    var node = linkEl;
    for (var depth = 0; depth <= DEDUPE_DEPTH && node; depth++) {
      // Never search from the body or the html element. A product shown in two
      // separate sections is legitimate — a featured row and a recommendations
      // row — and from the body every badge on the page looks "nearby", so the
      // second section would silently lose its stars.
      if (node === document.body || node === document.documentElement) break;
      if (node.querySelector &&
          node.querySelector('.rivu-auto-badge[data-rivu-handle="' + handle + '"]')) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  function injectStars(card, linkEl, data, starSize, handle) {
    // Skip if card already has an explicit badge block OR auto-badge
    if (card.querySelector('.rivu-auto-badge') || card.querySelector('.rivu-rating-badge[data-rivu-rendered]')) return;
    if (handle && badgeAlreadyNear(linkEl, handle)) return;
    var color = data.starColor || '#f5b400';
    var tc = data.textColor || '#555';
    var badge = document.createElement('div');
    badge.className = 'rivu-auto-badge';
    // Tagged with the product, so the guard above can recognise its own work.
    if (handle) badge.setAttribute('data-rivu-handle', handle);
    badge.style.cssText = 'display:flex;align-items:center;gap:3px;margin-top:4px;';
    badge.innerHTML = starsHtml(data.average, color, starSize) +
      '<span style="font-size:' + Math.max(starSize - 3, 10) + 'px;color:' + tc + ';opacity:.65;margin-left:2px;">(' + data.total + ')</span>';

    // Insert after the title/name element if possible, else after the link
    var titleEl = card.querySelector(TITLE_SELECTOR);
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
