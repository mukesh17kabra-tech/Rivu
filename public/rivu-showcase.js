/**
 * Rivu showcase — store-wide reviews, anywhere in the theme.
 *
 * One script behind several theme blocks (carousel, grid, quotes, photo wall,
 * trust badge). They differ only in layout, so keeping them in one file means a
 * fix to escaping or star rendering lands in all of them at once, rather than
 * five copies drifting the way the two product widgets already have.
 *
 * Reads its configuration from data attributes so each block can expose its own
 * settings in the theme editor without any JavaScript of its own.
 */
(function () {
  "use strict";

  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || "";
  var DEFAULT_API = SCRIPT_SRC ? SCRIPT_SRC.replace(/\/[^/]*$/, "") : "";

  var STAR_PATH =
    "M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z";

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .split("&").join("&amp;")
      .split("<").join("&lt;")
      .split(">").join("&gt;")
      .split('"').join("&quot;")
      .split("'").join("&#39;");
  }

  function starSvg(fill, size) {
    return (
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' +
      fill + '" style="display:block;flex-shrink:0"><path d="' + STAR_PATH + '"/></svg>'
    );
  }

  /**
   * Stars including halves, matching the product widget.
   *
   * The half is a clipped overlay rather than an SVG gradient, because a
   * gradient needs an id — and several of these blocks can share one page.
   */
  function starsHtml(n, color, empty, size) {
    var rating = Number(n) || 0;
    var out = "";
    for (var i = 1; i <= 5; i++) {
      var fraction = Math.max(0, Math.min(1, rating - (i - 1)));
      if (fraction >= 0.75) {
        out += starSvg(color, size);
      } else if (fraction >= 0.25) {
        out +=
          '<span style="position:relative;display:inline-block;width:' + size +
          "px;height:" + size + 'px;flex-shrink:0;">' + starSvg(empty, size) +
          '<span style="position:absolute;top:0;left:0;width:50%;height:100%;overflow:hidden;">' +
          starSvg(color, size) + "</span></span>";
      } else {
        out += starSvg(empty, size);
      }
    }
    return out;
  }

  function initials(name) {
    return String(name || "?").trim().slice(0, 2).toUpperCase();
  }

  function avatarColor(name) {
    var palette = ["#2f9e44", "#1971c2", "#e8590c", "#9c36b5", "#0c8599", "#c2255c"];
    var sum = 0;
    var text = String(name || "");
    for (var i = 0; i < text.length; i++) sum += text.charCodeAt(i);
    return palette[sum % palette.length];
  }

  /** One review card. Shared by every layout that shows a full review. */
  function card(review, opts) {
    var media = review.photoUrl || review.videoUrl;
    var isVideo = !!review.videoUrl;

    return (
      '<article class="rivu-sc-card" style="background:' + opts.cardBg +
      ";color:" + opts.textColor + ";border:1px solid rgba(0,0,0,.07);border-radius:" +
      opts.radius + "px;padding:18px;box-sizing:border-box;" +
      (opts.layout === "carousel" ? "flex:0 0 auto;width:280px;" : "") +
      (opts.layout === "wall" ? "break-inside:avoid;margin-bottom:14px;" : "") +
      '">' +
      '<div style="display:flex;gap:2px;margin-bottom:9px;">' +
      starsHtml(review.rating, opts.starColor, "#e0e0e0", 15) +
      "</div>" +
      (review.reviewTitle
        ? '<p style="margin:0 0 6px;font-weight:700;font-size:15px;line-height:1.35;">' +
          escapeHtml(review.reviewTitle) + "</p>"
        : "") +
      '<p style="margin:0 0 12px;font-size:13.5px;line-height:1.6;opacity:.85;">' +
      escapeHtml(review.body) + "</p>" +
      (media && opts.showMedia
        ? isVideo
          ? '<video src="' + escapeHtml(review.videoUrl) +
            '" muted playsinline style="width:100%;border-radius:8px;margin-bottom:12px;display:block;"></video>'
          : '<img src="' + escapeHtml(review.photoUrl) +
            '" alt="" loading="lazy" style="width:100%;border-radius:8px;margin-bottom:12px;display:block;"/>'
        : "") +
      '<div style="display:flex;align-items:center;gap:9px;">' +
      '<span style="width:29px;height:29px;border-radius:50%;background:' +
      avatarColor(review.customerName) +
      ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">' +
      escapeHtml(initials(review.customerName)) + "</span>" +
      '<span style="min-width:0;">' +
      '<span style="display:block;font-size:12.5px;font-weight:700;">' +
      escapeHtml(review.customerName) + "</span>" +
      (opts.showProduct && review.productTitle
        ? '<span style="display:block;font-size:11.5px;opacity:.55;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' +
          escapeHtml(review.productTitle) + "</span>"
        : "") +
      "</span></div></article>"
    );
  }

  /** A short pull-quote, for a testimonial strip. */
  function quote(review, opts) {
    return (
      '<blockquote class="rivu-sc-quote" style="margin:0;padding:18px 20px;text-align:center;' +
      (opts.layout === "carousel" ? "flex:0 0 auto;width:300px;" : "") +
      '">' +
      '<div style="display:flex;gap:2px;justify-content:center;margin-bottom:11px;">' +
      starsHtml(review.rating, opts.starColor, "#e0e0e0", 15) +
      "</div>" +
      '<p style="margin:0 0 11px;font-size:16px;line-height:1.6;font-style:italic;">“' +
      escapeHtml(review.body) + "”</p>" +
      '<footer style="font-size:12.5px;opacity:.6;">— ' +
      escapeHtml(review.customerName) + "</footer></blockquote>"
    );
  }

  function trustBadge(summary, opts) {
    if (!summary.total) return "";
    return (
      '<div class="rivu-sc-trust" style="display:inline-flex;align-items:center;gap:11px;' +
      "border:1px solid rgba(0,0,0,.1);border-radius:" + opts.radius +
      "px;padding:11px 16px;background:" + opts.cardBg + ";color:" + opts.textColor + ';">' +
      '<span style="font-size:23px;font-weight:800;line-height:1;">' +
      summary.average + "</span>" +
      '<span><span style="display:flex;gap:1px;">' +
      starsHtml(summary.average, opts.starColor, "#e0e0e0", 13) +
      '</span><span style="display:block;font-size:11.5px;opacity:.6;margin-top:3px;">' +
      summary.total + " review" + (summary.total === 1 ? "" : "s") +
      "</span></span></div>"
    );
  }

  function layoutWrapper(inner, opts) {
    if (opts.layout === "carousel") {
      return (
        '<div class="rivu-sc-scroll" style="display:flex;gap:14px;overflow-x:auto;' +
        'padding-bottom:6px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;">' +
        inner + "</div>"
      );
    }
    if (opts.layout === "wall") {
      // CSS columns rather than grid: reviews vary in length, and a grid would
      // leave ragged gaps under the short ones.
      return (
        '<div class="rivu-sc-wall" style="column-count:' + opts.columns +
        ';column-gap:14px;">' + inner + "</div>"
      );
    }
    return (
      '<div class="rivu-sc-grid" style="display:grid;gap:14px;' +
      "grid-template-columns:repeat(auto-fill,minmax(" + opts.minCard + 'px,1fr));">' +
      inner + "</div>"
    );
  }

  function readOptions(el) {
    var d = el.dataset;
    return {
      apiBase: d.apiBase || DEFAULT_API,
      shop: d.shop,
      layout: d.layout || "grid",
      limit: d.limit || "12",
      minRating: d.minRating || "1",
      withMedia: d.withMedia === "true",
      showMedia: d.showMedia !== "false",
      showProduct: d.showProduct !== "false",
      heading: d.heading || "",
      columns: Number(d.columns) || 3,
      minCard: Number(d.minCard) || 240,
      starColor: d.starColor || "#f5b400",
      textColor: d.textColor || "inherit",
      cardBg: d.cardBg || "#ffffff",
      radius: Number(d.radius) || 10,
    };
  }

  async function render(el) {
    if (el.dataset.rvRendered) return;
    el.dataset.rvRendered = "1";

    var opts = readOptions(el);
    if (!opts.shop) return;

    var url =
      opts.apiBase + "/api/reviews/showcase?shop=" + encodeURIComponent(opts.shop) +
      "&limit=" + encodeURIComponent(opts.limit) +
      "&minRating=" + encodeURIComponent(opts.minRating) +
      (opts.withMedia ? "&withMedia=1" : "");

    var data;
    try {
      var res = await fetch(url);
      if (!res.ok) return;
      data = await res.json();
    } catch (e) {
      // A storefront must not show an error because a review strip failed.
      return;
    }

    var reviews = data.reviews || [];
    var summary = data.summary || { total: 0, average: 0 };

    if (opts.layout === "trust") {
      el.innerHTML = trustBadge(summary, opts);
      return;
    }

    // Nothing to show is not an error state on a home page — an empty strip
    // reads as a broken section, so the block removes itself instead.
    if (!reviews.length) {
      el.innerHTML = "";
      el.style.display = "none";
      return;
    }

    var body = reviews
      .map(function (r) {
        return opts.layout === "quotes" ? quote(r, opts) : card(r, opts);
      })
      .join("");

    el.innerHTML =
      (opts.heading
        ? '<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:' +
          opts.textColor + ';">' + escapeHtml(opts.heading) + "</h2>"
        : "") +
      layoutWrapper(body, opts);
  }

  function renderAll() {
    var nodes = document.querySelectorAll("[data-rivu-showcase]");
    for (var i = 0; i < nodes.length; i++) render(nodes[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAll);
  } else {
    renderAll();
  }

  // Theme editor: re-render when a merchant drops the block in or changes a
  // setting, otherwise they see nothing until a manual reload.
  document.addEventListener("shopify:section:load", renderAll);
  document.addEventListener("shopify:block:select", renderAll);
})();
