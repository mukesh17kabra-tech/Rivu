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

  /**
   * A solid square star, as used by Trustpilot-style rating strips.
   *
   * Offered alongside the classic five-point star because it is the single
   * biggest difference between a review section that looks like a third-party
   * widget and one that looks designed.
   */
  function squareSvg(fill, size) {
    return (
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" ' +
      'style="display:block;flex-shrink:0"><rect width="24" height="24" rx="2" fill="' +
      fill + '"/><path d="M12 5l1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6z" ' +
      'fill="#fff"/></svg>'
    );
  }

  /** Chooses the star shape, then renders the row including halves. */
  function ratingRow(rating, opts, size) {
    if (opts.starStyle !== "square") {
      return starsHtml(rating, opts.starColor, "#e0e0e0", size);
    }

    var n = Number(rating) || 0;
    var out = "";
    for (var i = 1; i <= 5; i++) {
      var fraction = Math.max(0, Math.min(1, n - (i - 1)));
      if (fraction >= 0.75) {
        out += squareSvg(opts.starColor, size);
      } else if (fraction >= 0.25) {
        // Same clipped-overlay trick as the pointed star: no ids, so several
        // blocks can share a page.
        out +=
          '<span style="position:relative;display:inline-block;width:' + size +
          "px;height:" + size + 'px;flex-shrink:0;">' + squareSvg("#dcdce1", size) +
          '<span style="position:absolute;top:0;left:0;width:50%;height:100%;overflow:hidden;">' +
          squareSvg(opts.starColor, size) + "</span></span>";
      } else {
        out += squareSvg("#dcdce1", size);
      }
    }
    return out;
  }

  /** The word a shopper reads before they read the number. */
  function verdict(average) {
    if (average >= 4.5) return "Excellent";
    if (average >= 4) return "Great";
    if (average >= 3) return "Good";
    if (average >= 2) return "Fair";
    return "Poor";
  }

  var VERIFIED_BADGE =
    '<span class="rivu-sc-verified" style="display:inline-flex;align-items:center;gap:4px;' +
    'font-size:11.5px;font-weight:700;white-space:nowrap;">' +
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0">' +
    '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1 14.4l-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4z"/>' +
    "</svg>Verified</span>";

  /** Relative age, as review sections conventionally show it. */
  function timeAgo(iso) {
    var then = new Date(iso).getTime();
    if (!then) return "";
    var days = Math.floor((Date.now() - then) / 86400000);
    if (days < 1) return "today";
    if (days < 7) return days + (days === 1 ? " day ago" : " days ago");
    if (days < 31) {
      var w = Math.floor(days / 7);
      return w + (w === 1 ? " week ago" : " weeks ago");
    }
    if (days < 365) {
      var m = Math.floor(days / 30);
      return m + (m === 1 ? " month ago" : " months ago");
    }
    var y = Math.floor(days / 365);
    return y + (y === 1 ? " year ago" : " years ago");
  }

  /** "Greg S." — a surname initial, the way review sites shorten names. */
  function shortName(name) {
    var parts = String(name || "").trim().split(/\s+/);
    if (parts.length < 2) return parts[0] || "";
    return parts[0] + " " + parts[parts.length - 1].charAt(0).toUpperCase() + ".";
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
      ratingRow(review.rating, opts, 15) +
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

  /**
   * Photo on top, then the review, then a ruled footer with the rating.
   *
   * The layout customers recognise from brands that take their review section
   * seriously: the picture does the persuading and the text supports it, which
   * is the reverse of the standard card.
   */
  function photoCard(review, opts) {
    var media = review.photoUrl || review.videoUrl;
    var isVideo = !!review.videoUrl;

    return (
      '<article class="rivu-sc-card rivu-sc-photo" style="background:' + opts.cardBg +
      ";color:" + opts.textColor + ";border-radius:" + opts.radius +
      "px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);display:flex;" +
      "flex-direction:column;box-sizing:border-box;" +
      (opts.layout === "carousel" ? "flex:0 0 auto;width:300px;" : "") +
      (opts.layout === "wall" ? "break-inside:avoid;margin-bottom:16px;" : "") +
      '">' +
      (media
        ? isVideo
          ? '<video src="' + escapeHtml(review.videoUrl) +
            '" muted playsinline style="width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#f2f2f4;"></video>'
          : '<img src="' + escapeHtml(review.photoUrl) +
            '" alt="" loading="lazy" style="width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#f2f2f4;"/>'
        // No photo: a tinted panel rather than a collapsed card, so a row of
        // these keeps its rhythm instead of one card being half the height.
        : '<div style="width:100%;aspect-ratio:1;background:#f2f2f4;display:flex;' +
          'align-items:center;justify-content:center;">' +
          '<span style="display:flex;gap:3px;opacity:.5;">' +
          ratingRow(review.rating, opts, 20) + "</span></div>") +
      '<div style="padding:16px 18px;display:flex;flex-direction:column;flex:1;">' +
      '<p style="margin:0 0 16px;font-size:13.5px;line-height:1.6;flex:1;">' +
      escapeHtml(review.body) + "</p>" +
      '<div style="border-top:1px solid rgba(0,0,0,.08);padding-top:12px;">' +
      '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:5px;">' +
      '<span style="display:flex;gap:2px;">' + ratingRow(review.rating, opts, 14) + "</span>" +
      (review.verified && opts.showVerified ? VERIFIED_BADGE : "") +
      "</div>" +
      '<span style="font-size:13px;font-weight:700;">' +
      escapeHtml(shortName(review.customerName)) + "</span>" +
      "</div></div></article>"
    );
  }

  /**
   * A dense entry for a rating strip: name, age, headline, two lines of text.
   *
   * No card border — the strip's own rules separate them, and boxes inside a
   * box is what makes review sections look bolted on.
   */
  function compactCard(review, opts) {
    /**
     * Body text clamped to a fixed number of lines.
     *
     * Every entry in a strip has to be the same height or the row looks
     * ragged, and reviews vary from one line to twenty. -webkit-line-clamp is
     * the only thing that truncates at a line boundary with an ellipsis; it is
     * prefixed but supported everywhere that matters, and a browser without it
     * simply shows the whole review rather than breaking.
     */
    var clamp =
      "display:-webkit-box;-webkit-line-clamp:" + opts.clampLines +
      ";-webkit-box-orient:vertical;overflow:hidden;";

    return (
      '<article class="rivu-sc-card rivu-sc-compact" style="color:' + opts.textColor +
      ";padding:0 22px 0 0;box-sizing:border-box;" +
      (opts.layout === "carousel" || opts.layout === "strip"
        ? "flex:0 0 auto;width:" + opts.compactWidth + "px;"
        : "") +
      '">' +
      // Tight, like a rating platform's own row — a gap between squares reads
      // as five separate icons rather than one score.
      '<div style="display:flex;gap:1px;margin-bottom:10px;">' +
      ratingRow(review.rating, opts, 17) + "</div>" +
      '<p style="margin:0 0 6px;font-size:12.5px;line-height:1.3;">' +
      '<span style="font-weight:700;">' + escapeHtml(shortName(review.customerName)) +
      "</span>" +
      '<span style="opacity:.55;"> ' + escapeHtml(timeAgo(review.createdAt)) + "</span>" +
      (review.verified && opts.showVerified
        ? '<span style="opacity:.75;"> · </span>' + VERIFIED_BADGE
        : "") +
      "</p>" +
      (review.reviewTitle
        ? '<p style="margin:0 0 5px;font-size:14.5px;font-weight:700;line-height:1.3;">' +
          escapeHtml(review.reviewTitle) + "</p>"
        : "") +
      '<p style="margin:0;font-size:13px;line-height:1.5;opacity:.8;' + clamp + '">' +
      escapeHtml(review.body) + "</p></article>"
    );
  }

  /**
   * A spotlight card: the review, the product it is about, and a way to buy it.
   *
   * Every other card style ends at the reviewer's name, which is exactly where
   * a shopper reading a home-page carousel runs out of road — they have just
   * been persuaded and there is nothing to click. This one carries the product
   * through: a thumbnail and its name in their own panel, then a button
   * straight to the product page.
   *
   * Two things the reference design has that this deliberately does not:
   *
   *  - A city ("Sharjah, UAE"). Rivu never collects where a reviewer is, and
   *    printing a plausible-looking one would be inventing evidence on someone
   *    else's storefront.
   *  - The words "Verified Purchase". `verified` here means the reviewer left
   *    an email address, which is not proof they bought anything. The badge
   *    says "Verified", which is what we can actually stand behind.
   */
  function spotlightCard(review, opts) {
    var accentSoft = tint(opts.accentColor, 0.16);
    var accentWash = tint(opts.accentColor, 0.05);
    // Clamped so a row of cards keeps one height: reviews run from one line to
    // twenty, and the product panel and button below have to line up across
    // the row or the carousel looks broken.
    var clamp =
      "display:-webkit-box;-webkit-line-clamp:" + opts.clampLines +
      ";-webkit-box-orient:vertical;overflow:hidden;";

    var thumb = review.productImageUrl
      ? '<img src="' + escapeHtml(review.productImageUrl) +
        '" alt="" loading="lazy" style="width:40px;height:40px;object-fit:contain;' +
        'border-radius:6px;flex-shrink:0;background:#fff;"/>'
      // A tinted square rather than nothing, so the panel keeps its shape when
      // a product has no image.
      : '<span style="width:40px;height:40px;border-radius:6px;flex-shrink:0;' +
        'background:rgba(0,0,0,.05);"></span>';

    var productPanel = review.productTitle
      ? '<div class="rivu-sc-spot-product" style="display:flex;align-items:center;gap:10px;' +
        "border:1px solid " + accentSoft + ";background:" + accentWash +
        ';border-radius:10px;padding:9px 11px;margin-bottom:14px;">' +
        thumb +
        '<span style="font-size:12.5px;font-weight:700;line-height:1.35;">' +
        escapeHtml(review.productTitle) + "</span></div>"
      : "";

    // Only when the handle was captured. Reviews written before that column
    // existed have none, and a button that goes nowhere is worse than none.
    var button = review.productHandle
      ? '<a class="rivu-sc-spot-btn" href="/products/' +
        encodeURIComponent(review.productHandle) +
        '" style="flex-shrink:0;text-decoration:none;background:' + opts.accentColor +
        ";color:" + opts.accentTextColor + ";font-size:12px;font-weight:700;" +
        'border-radius:999px;padding:8px 15px;white-space:nowrap;">' +
        escapeHtml(opts.viewProductText) + "</a>"
      : "";

    return (
      '<article class="rivu-sc-card rivu-sc-spotlight" style="background:' + opts.cardBg +
      ";color:" + opts.textColor + ";border:1px solid rgba(0,0,0,.06);border-radius:" +
      Math.max(opts.radius, 12) + "px;padding:18px;box-sizing:border-box;" +
      "box-shadow:0 1px 3px rgba(0,0,0,.06);display:flex;flex-direction:column;" +
      (opts.layout === "carousel" ? "flex:0 0 auto;width:300px;" : "") +
      (opts.layout === "wall" ? "break-inside:avoid;margin-bottom:16px;" : "") +
      '">' +
      '<div style="display:flex;gap:2px;margin-bottom:11px;">' +
      ratingRow(review.rating, opts, 15) + "</div>" +
      (review.reviewTitle
        ? '<p style="margin:0 0 6px;font-weight:700;font-size:14.5px;line-height:1.35;">' +
          escapeHtml(review.reviewTitle) + "</p>"
        : "") +
      // flex:1 pushes the panel and footer to the bottom, so short and long
      // reviews still line their buttons up.
      '<p style="margin:0 0 14px;font-size:13.5px;line-height:1.6;flex:1;' + clamp + '">' +
      escapeHtml(review.body) + "</p>" +
      productPanel +
      // Wraps rather than squeezing: in a narrow column the button was taking
      // the width the name needed and every reviewer became "Rashid…". A
      // button on its own second line is far better than an unreadable name.
      '<div style="display:flex;align-items:center;gap:10px;row-gap:11px;flex-wrap:wrap;' +
      'border-top:1px solid rgba(0,0,0,.07);padding-top:13px;">' +
      '<span style="width:32px;height:32px;border-radius:50%;background:' +
      avatarColor(review.customerName) +
      ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:11.5px;' +
      'font-weight:700;flex-shrink:0;">' + escapeHtml(initials(review.customerName)) + "</span>" +
      // 92px keeps a real name on the line before the button is allowed to
      // wrap, instead of the name shrinking to an ellipsis first.
      '<span style="min-width:92px;flex:1;">' +
      '<span style="display:block;font-size:13px;font-weight:700;overflow:hidden;' +
      'text-overflow:ellipsis;white-space:nowrap;">' +
      escapeHtml(shortName(review.customerName)) + "</span>" +
      (review.verified && opts.showVerified
        ? '<span style="display:block;opacity:.7;">' + VERIFIED_BADGE + "</span>"
        : "") +
      "</span>" + button + "</div></article>"
    );
  }

  /** Picks the card style the block asked for. */
  function renderCard(review, opts) {
    if (opts.layout === "gallery") return galleryCard(review, opts);
    if (opts.cardStyle === "photo") return photoCard(review, opts);
    if (opts.cardStyle === "compact") return compactCard(review, opts);
    if (opts.cardStyle === "spotlight") return spotlightCard(review, opts);
    return card(review, opts);
  }

  /**
   * The summary panel that leads a rating strip.
   *
   * Verdict word first, then stars, then the count — the order a shopper reads
   * in, and the reason a strip carries more weight than a bare number.
   */
  function stripSummary(summary, opts) {
    var countText = opts.badgeText
      ? badgeText(opts.badgeText, summary)
      : "Based on " + summary.total + " review" + (summary.total === 1 ? "" : "s");

    return (
      '<div class="rivu-sc-strip-summary" style="flex:0 0 auto;text-align:center;' +
      'padding-right:26px;min-width:158px;">' +
      '<p style="margin:0 0 9px;font-size:22px;font-weight:600;line-height:1.1;">' +
      escapeHtml(opts.verdictText || verdict(summary.average)) + "</p>" +
      // gap:1px, matching the review rows — the summary is the same rating
      // read larger, not a different element.
      '<div style="display:flex;gap:1px;justify-content:center;margin-bottom:9px;">' +
      ratingRow(summary.average, opts, 28) + "</div>" +
      '<p style="margin:0;font-size:12.5px;opacity:.75;' +
      (opts.underlineCount ? "text-decoration:underline;text-underline-offset:2px;" : "") +
      '">' + countText + "</p></div>"
    );
  }

  /** A product thumbnail and title, optionally linking to the product. */
  function productStrip(review, opts, big) {
    if (!review.productTitle) return "";
    var thumb = review.productImageUrl
      ? '<img src="' + escapeHtml(review.productImageUrl) +
        '" alt="" loading="lazy" style="width:' + (big ? 44 : 34) + "px;height:" +
        (big ? 44 : 34) + 'px;object-fit:cover;border-radius:5px;flex-shrink:0;background:#f2f2f4;"/>'
      : "";

    var label =
      '<span style="font-size:' + (big ? 13 : 11.5) +
      'px;line-height:1.35;">' + escapeHtml(review.productTitle) + "</span>";

    var inner =
      '<span style="display:flex;align-items:center;gap:9px;">' + thumb + label + "</span>";

    // Linked only when the handle was captured. Reviews written before that
    // column existed have none, and a dead link is worse than no link.
    return review.productHandle
      ? '<a href="/products/' + encodeURIComponent(review.productHandle) +
        '" style="display:block;text-decoration:none;color:inherit;border-top:1px solid rgba(0,0,0,.08);' +
        'margin-top:12px;padding-top:11px;">' + inner + "</a>"
      : '<div style="border-top:1px solid rgba(0,0,0,.08);margin-top:12px;padding-top:11px;">' +
        inner + "</div>";
  }

  /**
   * One gallery tile: the photo, then who wrote it, then the review.
   *
   * The order matters. A photo-led wall works because the picture is the claim
   * and the words are the evidence; leading with text turns it into a list
   * that happens to have images.
   */
  function galleryCard(review, opts) {
    var isVideo = !!review.videoUrl;
    var media = review.videoUrl || review.photoUrl;

    return (
      '<article class="rivu-sc-card rivu-sc-tile" data-rivu-review="' +
      escapeHtml(review.id) + '" style="background:' + opts.cardBg +
      ";color:" + opts.textColor + ";border:1px solid rgba(0,0,0,.07);border-radius:" +
      opts.radius + "px;overflow:hidden;break-inside:avoid;margin-bottom:16px;" +
      'cursor:pointer;">' +
      (media
        ? isVideo
          ? '<video src="' + escapeHtml(media) +
            '" muted playsinline style="width:100%;display:block;background:#f2f2f4;"></video>'
          : '<img src="' + escapeHtml(media) +
            '" alt="" loading="lazy" style="width:100%;display:block;background:#f2f2f4;"/>'
        : "") +
      '<div style="padding:13px 15px 15px;">' +
      '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:3px;">' +
      '<span style="font-size:13.5px;font-weight:700;">' +
      escapeHtml(shortName(review.customerName)) + "</span>" +
      (review.verified && opts.showVerified ? VERIFIED_BADGE : "") +
      "</div>" +
      '<p style="margin:0 0 8px;font-size:11.5px;opacity:.5;">' +
      escapeHtml(formatDate(review.createdAt)) + "</p>" +
      '<div style="display:flex;gap:1px;margin-bottom:8px;">' +
      ratingRow(review.rating, opts, 15) + "</div>" +
      '<p style="margin:0;font-size:13.5px;line-height:1.5;">' +
      escapeHtml(review.body) + "</p>" +
      productStrip(review, opts, false) +
      "</div></article>"
    );
  }

  /** dd/mm/yyyy, as the reference galleries show it. */
  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear();
  }

  /**
   * The lightbox: the photo large, the review beside it.
   *
   * Built once per block and reused, rather than one dialog per tile — a wall
   * of thirty reviews would otherwise put thirty hidden dialogs in the page.
   *
   * Keyboard and screen-reader behaviour is written out because a modal that
   * traps a keyboard user is worse than no modal: Escape closes, the backdrop
   * closes, focus moves to the close button on open and returns to the tile
   * that opened it on close.
   */
  function mountLightbox(el, reviews, opts) {
    var box = document.createElement("div");
    box.className = "rivu-sc-lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Customer review");
    box.hidden = true;
    box.style.cssText =
      "position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.6);" +
      "display:flex;align-items:center;justify-content:center;padding:20px;";
    document.body.appendChild(box);

    var lastFocused = null;

    function close() {
      box.hidden = true;
      box.innerHTML = "";
      document.documentElement.style.overflow = "";
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    function open(review, opener) {
      lastFocused = opener || null;
      var isVideo = !!review.videoUrl;
      var media = review.videoUrl || review.photoUrl;

      box.innerHTML =
        '<div class="rivu-sc-lightbox-panel" style="background:' + opts.cardBg +
        ";color:" + opts.textColor + ";border-radius:" + Math.max(opts.radius, 8) +
        "px;overflow:hidden;display:flex;flex-wrap:wrap;max-width:900px;width:100%;" +
        'max-height:90vh;">' +
        (media
          ? '<div style="flex:1 1 320px;min-width:280px;background:#000;display:flex;">' +
            (isVideo
              ? '<video src="' + escapeHtml(media) +
                '" controls playsinline style="width:100%;max-height:90vh;object-fit:contain;"></video>'
              : '<img src="' + escapeHtml(media) +
                '" alt="" style="width:100%;max-height:90vh;object-fit:contain;"/>') +
            "</div>"
          : "") +
        '<div style="flex:1 1 300px;min-width:260px;padding:22px;overflow-y:auto;' +
        'display:flex;flex-direction:column;">' +
        '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;">' +
        '<span style="font-size:16px;font-weight:700;">' +
        escapeHtml(shortName(review.customerName)) + "</span>" +
        (review.verified && opts.showVerified ? VERIFIED_BADGE : "") +
        '<span style="margin-left:auto;font-size:12px;opacity:.55;">' +
        escapeHtml(formatDate(review.createdAt)) + "</span></div>" +
        '<div style="display:flex;gap:1px;margin:11px 0;">' +
        ratingRow(review.rating, opts, 17) + "</div>" +
        (review.reviewTitle
          ? '<p style="margin:0 0 8px;font-size:15px;font-weight:700;">' +
            escapeHtml(review.reviewTitle) + "</p>"
          : "") +
        '<p style="margin:0;font-size:14px;line-height:1.6;">' +
        escapeHtml(review.body) + "</p>" +
        (review.ownerReply
          ? '<div style="margin-top:14px;padding:11px 13px;background:rgba(0,0,0,.04);' +
            'border-radius:6px;"><p style="margin:0 0 3px;font-size:11px;font-weight:700;' +
            'text-transform:uppercase;letter-spacing:.03em;opacity:.6;">Store owner reply</p>' +
            '<p style="margin:0;font-size:13px;line-height:1.55;">' +
            escapeHtml(review.ownerReply) + "</p></div>"
          : "") +
        '<div style="margin-top:auto;">' + productStrip(review, opts, true) +
        (review.productHandle
          ? '<a href="/products/' + encodeURIComponent(review.productHandle) +
            '" style="display:inline-block;margin-top:12px;padding:9px 16px;border:1px solid ' +
            "rgba(0,0,0,.15);border-radius:6px;font-size:13px;font-weight:600;" +
            'text-decoration:none;color:inherit;">View product</a>'
          : "") +
        "</div></div>" +
        '<button type="button" class="rivu-sc-lightbox-close" aria-label="Close"' +
        ' style="position:absolute;top:16px;left:16px;width:36px;height:36px;border-radius:50%;' +
        "border:none;background:rgba(0,0,0,.65);color:#fff;font-size:20px;line-height:1;" +
        'cursor:pointer;">&times;</button>';

      box.hidden = false;
      // The page behind must not scroll while the dialog is open.
      document.documentElement.style.overflow = "hidden";

      var closeBtn = box.querySelector(".rivu-sc-lightbox-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", close);
        closeBtn.focus();
      }
    }

    box.addEventListener("click", function (e) {
      // Only the backdrop closes, not a click inside the panel.
      if (e.target === box) close();
    });
    document.addEventListener("keydown", function (e) {
      if (!box.hidden && e.key === "Escape") close();
    });

    // One delegated listener on the block, so tiles added by a later render
    // work without re-wiring.
    el.addEventListener("click", function (e) {
      var tile = e.target && e.target.closest ? e.target.closest("[data-rivu-review]") : null;
      if (!tile || !el.contains(tile)) return;
      // A click on the product link is a navigation, not a request to zoom.
      if (e.target.closest && e.target.closest("a")) return;
      var id = tile.getAttribute("data-rivu-review");
      for (var i = 0; i < reviews.length; i++) {
        if (String(reviews[i].id) === id) { open(reviews[i], tile); return; }
      }
    });
  }

  /** A short pull-quote, for a testimonial strip. */
  function quote(review, opts) {
    return (
      '<blockquote class="rivu-sc-quote" style="margin:0;padding:18px 20px;text-align:center;' +
      (opts.layout === "carousel" ? "flex:0 0 auto;width:300px;" : "") +
      '">' +
      '<div style="display:flex;gap:2px;justify-content:center;margin-bottom:11px;">' +
      ratingRow(review.rating, opts, 15) +
      "</div>" +
      '<p style="margin:0 0 11px;font-size:16px;line-height:1.6;font-style:italic;">“' +
      escapeHtml(review.body) + "”</p>" +
      '<footer style="font-size:12.5px;opacity:.6;">— ' +
      escapeHtml(review.customerName) + "</footer></blockquote>"
    );
  }

  /**
   * The merchant's own wording for the badge.
   *
   * Tokens are substituted in a single pass. Two passes is how the rating
   * badge once ended up printing a literal "{ rating }" on a live storefront:
   * the second pattern matched inside what the first had already produced.
   *
   * The text is escaped before substitution and the values are numbers, so
   * nothing a merchant types can become markup.
   */
  function badgeText(template, summary) {
    var count = summary.total + " review" + (summary.total === 1 ? "" : "s");
    return escapeHtml(template).replace(
      /\{(average|count|total)\}/g,
      function (match, token) {
        if (token === "average") return String(summary.average);
        if (token === "total") return String(summary.total);
        return count;
      }
    );
  }

  function trustBadge(summary, opts) {
    if (!summary.total) return "";
    // Scaled rather than fixed: at its default size it was too small to read
    // as a trust signal in a wide section, and a merchant has no other way to
    // change it.
    var scale = Math.max(0.7, Math.min(2.5, opts.badgeScale));
    var pad = Math.round(11 * scale);

    var label = opts.badgeText
      ? badgeText(opts.badgeText, summary)
      : escapeHtml(summary.total + " review" + (summary.total === 1 ? "" : "s"));

    var scoreHtml =
      '<span class="rivu-sc-score" style="font-size:' + Math.round(23 * scale) +
      'px;font-weight:800;line-height:1;">' + summary.average + "</span>";

    var starsBlock =
      '<span class="rivu-sc-stars" style="display:flex;gap:1px;">' +
      starsHtml(summary.average, opts.starColor, "#e0e0e0", Math.round(13 * scale)) +
      "</span>";

    var labelHtml =
      '<span class="rivu-sc-label" style="font-size:' + (11.5 * scale).toFixed(1) +
      'px;opacity:.7;white-space:nowrap;">' + label + "</span>";

    /**
     * One line, or stacked.
     *
     * Inline puts the score, stars and text in a single row — which is what a
     * merchant wants when the badge sits in a header or just above an
     * "Add to cart" button, where vertical space is the scarce thing.
     */
    var inner = opts.badgeInline
      ? scoreHtml + starsBlock + labelHtml
      : scoreHtml +
        '<span style="display:flex;flex-direction:column;gap:' +
        Math.round(3 * scale) + 'px;">' + starsBlock + labelHtml + "</span>";

    return (
      '<div class="rivu-sc-trust" style="display:inline-flex;align-items:center;gap:' +
      Math.round(11 * scale) + "px;" +
      "border:1px solid rgba(0,0,0,.1);border-radius:" + opts.radius +
      "px;padding:" + pad + "px " + Math.round(16 * scale) + "px;background:" +
      opts.cardBg + ";color:" + opts.textColor + ";" +
      // Wrapping is allowed on a narrow screen even in one-line mode, so a
      // long sentence cannot push the badge wider than the viewport.
      (opts.badgeInline ? "flex-wrap:wrap;" : "") +
      (opts.maxWidth ? "width:100%;justify-content:center;box-sizing:border-box;" : "") +
      '">' + inner + "</div>"
    );
  }

  /**
   * A round prev/next control.
   *
   * The carousel was scroll-only, which works on a phone and is close to
   * invisible on a desktop — a shopper has no reason to think there is more to
   * the right. The arrows are what make it read as a carousel.
   */
  function arrow(direction, opts) {
    var glyph = direction === "prev" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6";
    // Subtle: a thin outline circle, no shadow, small. On a rating strip a
    // heavy button competes with the reviews it is there to serve.
    var subtle = opts.arrowStyle === "subtle";
    var size = subtle ? 26 : 36;

    return (
      '<button type="button" class="rivu-sc-arrow rivu-sc-' + direction + '"' +
      ' aria-label="' + (direction === "prev" ? "Previous" : "Next") + ' reviews"' +
      ' style="position:absolute;top:50%;transform:translateY(-50%);' +
      (direction === "prev" ? "left:" : "right:") + (subtle ? "-30px;" : "-8px;") +
      "z-index:2;width:" + size + "px;height:" + size + "px;border-radius:50%;" +
      "border:1px solid rgba(0,0,0," + (subtle ? ".18" : ".1") + ");" +
      "background:" + (subtle ? "transparent" : opts.cardBg) + ";" +
      "color:" + opts.textColor + ";cursor:pointer;padding:0;" +
      "display:flex;align-items:center;justify-content:center;" +
      (subtle ? "opacity:.6;" : "box-shadow:0 2px 8px rgba(0,0,0,.12);") +
      '">' +
      '<svg width="' + (subtle ? 12 : 16) + '" height="' + (subtle ? 12 : 16) +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
      ' stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="' + glyph + '"/></svg></button>'
    );
  }

  function scroller(inner, opts, gap) {
    return (
      '<div style="position:relative;">' +
      (opts.showArrows ? arrow("prev", opts) : "") +
      '<div class="rivu-sc-scroll" style="display:flex;gap:' + gap + "px;overflow-x:auto;" +
      "scroll-behavior:smooth;padding-bottom:6px;scrollbar-width:none;" +
      '-webkit-overflow-scrolling:touch;">' + inner + "</div>" +
      (opts.showArrows ? arrow("next", opts) : "") +
      "</div>"
    );
  }

  /**
   * A CSS-columns block that does not strand its content when reviews are few.
   *
   * `column-count: 4` with one review puts that review in the first of four
   * columns and leaves three empty — so a new store's photo gallery rendered
   * as a thin tile against a large blank rectangle, which reads as broken
   * rather than as new. It is the state every store is in on day one, which
   * is the worst possible time to look broken.
   *
   * So the column count drops to the number of reviews, and the block is then
   * capped and centred so a single review does not stretch into one enormous
   * full-width tile instead. The cap applies ONLY when there are fewer reviews
   * than columns: a store with enough reviews to fill the row renders exactly
   * as it did before, which matters because this is live on storefronts.
   */
  function columnBox(cls, inner, opts, count, gap) {
    var cols = Math.max(1, Math.min(opts.columns, count || opts.columns));
    var style = "column-count:" + cols + ";column-gap:" + gap + "px;";
    if (cols < opts.columns) {
      // 340px is about the width one column gets in a 1200px section at four
      // columns — so a lone tile is the size it would have been in a full row.
      style += "max-width:" + (cols * 340 + (cols - 1) * gap) + "px;margin:0 auto;";
    }
    return '<div class="' + cls + '" style="' + style + '">' + inner + "</div>";
  }

  function layoutWrapper(inner, opts, count) {
    if (opts.layout === "strip") {
      // Summary on the left, reviews scrolling beside it. Wraps on a narrow
      // screen so the summary sits above the reviews rather than squeezing.
      return (
        '<div class="rivu-sc-strip" style="display:flex;align-items:center;' +
        'gap:18px;flex-wrap:wrap;">' + inner + "</div>"
      );
    }
    if (opts.layout === "gallery") {
      // CSS columns, not a grid: gallery photos vary in height and a grid
      // leaves a ragged edge under the short ones.
      return columnBox("rivu-sc-gallery", inner, opts, count, 16);
    }
    if (opts.layout === "carousel") {
      return scroller(inner, opts, 14);
    }
    if (opts.layout === "wall") {
      // CSS columns rather than grid: reviews vary in length, and a grid would
      // leave ragged gaps under the short ones.
      return columnBox("rivu-sc-wall", inner, opts, count, 14);
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
      // Spotlight carries a product panel and a button, so it needs more width
      // than a plain card before the grid starts stacking things awkwardly.
      minCard: Number(d.minCard) || (d.cardStyle === "spotlight" ? 290 : 240),
      starColor: d.starColor || "#f5b400",
      textColor: d.textColor || "inherit",
      cardBg: d.cardBg || "#ffffff",
      radius: Number(d.radius) || 10,
      headingAlign: d.headingAlign || "left",
      // 0 means "no limit" — a section that is meant to span the theme width.
      maxWidth: Number(d.maxWidth) || 0,
      badgeScale: Number(d.badgeScale) || 1,
      badgeText: d.badgeText || "",
      badgeInline: d.badgeInline === "true",
      cardStyle: d.cardStyle || (d.layout === "strip" ? "compact" : "standard"),
      starStyle: d.starStyle || "star",
      showVerified: d.showVerified !== "false",
      showArrows: d.showArrows !== "false",
      verdictText: d.verdictText || "",
      caption: d.caption || "",
      // Line clamp keeps every entry the same height; 3 matches the reference
      // designs merchants ask for.
      clampLines: Math.max(1, Math.min(10, Number(d.clampLines) || 3)),
      compactWidth: Math.max(160, Math.min(480, Number(d.compactWidth) || 250)),
      underlineCount: d.underlineCount === "true",
      arrowStyle: d.arrowStyle || "solid",
      // Spotlight cards only. Defaults to the theme's text colour rather than
      // a colour of our own: a dark pill sits correctly on any storefront,
      // where a brand colour we picked would clash with most of them.
      accentColor: d.accentColor || d.textColor || "#1a1a1a",
      accentTextColor: d.accentTextColor || "#ffffff",
      viewProductText: d.viewProductText || "View product",
    };
  }

  /**
   * The accent colour at low opacity, for the product panel behind it.
   *
   * Derived rather than configured: two more colour settings to keep in sync
   * is how a merchant ends up with a panel that fights its own button.
   * Anything that is not a 3- or 6-digit hex (a CSS variable, a named colour)
   * falls back to neutral grey, which is safe everywhere.
   */
  function tint(color, alpha) {
    var hex = String(color || "").trim();
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
    if (!m) return "rgba(0,0,0," + alpha + ")";
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return (
      "rgba(" + parseInt(h.slice(0, 2), 16) + "," + parseInt(h.slice(2, 4), 16) +
      "," + parseInt(h.slice(4, 6), 16) + "," + alpha + ")"
    );
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
    var plan = data.plan || "free";

    /**
     * The gallery is a paid layout.
     *
     * Honest about what this is: a feature gate, not a data boundary. Reviews
     * and their photos are public on the storefront either way, so there is
     * nothing here to keep secret — what Pro buys is the layout. The check is
     * against the plan the server reports rather than anything the block can
     * set, so a merchant cannot unlock it by editing Liquid.
     *
     * The theme editor is told why the block is empty; a live storefront shows
     * nothing rather than an upgrade advert aimed at the wrong audience.
     */
    if (opts.layout === "gallery" && plan !== "pro" && plan !== "growth") {
      if (window.Shopify && window.Shopify.designMode) {
        el.innerHTML =
          '<p style="font-size:13px;line-height:1.5;padding:14px;border:1px dashed #c9c9d2;' +
          'border-radius:8px;color:#6d6d78;"><strong>Rivu Photo Gallery</strong><br/>' +
          "The photo gallery and its lightbox are part of Pro. Your other review " +
          "blocks keep working on the free plan.</p>";
      } else {
        el.innerHTML = "";
        el.style.display = "none";
      }
      return;
    }

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
        return opts.layout === "quotes" ? quote(r, opts) : renderCard(r, opts);
      })
      .join("");

    // The strip pairs its own summary panel with a scrolling list, so it
    // assembles the two rather than wrapping the reviews alone.
    if (opts.layout === "strip") {
      body =
        stripSummary(summary, opts) +
        '<div style="flex:1;min-width:240px;">' + scroller(body, opts, 0) + "</div>";
    }

    // Constrained and centred when a max width is set, so a section does not
    // have to span the full theme width to look deliberate.
    if (opts.maxWidth) {
      el.style.maxWidth = opts.maxWidth + "px";
      el.style.marginLeft = "auto";
      el.style.marginRight = "auto";
    }

    /**
     * Wires the arrows to the scroller they belong to.
     *
     * Scrolls by roughly one card rather than a fixed pixel count, so the
     * step matches whatever width the layout is using.
     */
    function wireArrows() {
      var track = el.querySelector(".rivu-sc-scroll");
      if (!track) return;
      var prev = el.querySelector(".rivu-sc-prev");
      var next = el.querySelector(".rivu-sc-next");
      var step = function () {
        var first = track.firstElementChild;
        return first ? first.getBoundingClientRect().width + 14 : 280;
      };
      if (prev) prev.addEventListener("click", function () {
        track.scrollBy({ left: -step(), behavior: "smooth" });
      });
      if (next) next.addEventListener("click", function () {
        track.scrollBy({ left: step(), behavior: "smooth" });
      });
    }

    el.innerHTML =
      (opts.heading
        ? '<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;text-align:' +
          opts.headingAlign + ';color:' + opts.textColor + ';">' +
          escapeHtml(opts.heading) + "</h2>"
        : "") +
      layoutWrapper(body, opts, reviews.length) +
      (opts.caption
        ? '<p class="rivu-sc-caption" style="margin:14px 0 0;font-size:12.5px;opacity:.55;color:' +
          opts.textColor + ';">' + escapeHtml(opts.caption) + "</p>"
        : "");

    wireArrows();

    // Mounted after the tiles exist, and only for the layout that has them.
    if (opts.layout === "gallery" && !el.dataset.rvLightbox) {
      el.dataset.rvLightbox = "1";
      mountLightbox(el, reviews, opts);
    }
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
