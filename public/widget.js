/* Rivu Widget v20260728 */
/**
 * Rivu Review Widget — premium design matching the reference image:
 * - Left: big serif rating, star breakdown bars, filter (Most Recent),
 *   review cards with avatar circles, verified badge, "I recommend",
 *   photo thumbnail→lightbox, Read more, Load more, Powered by Rivu (Free)
 * - Modal popup: 4 selectable form templates (basic/card/minimal/dark),
 *   plan-gated
 */
(function () {
  const API_BASE = document.currentScript?.src
    ? new URL(document.currentScript.src).origin
    : "";

  if (!document.getElementById("rv-global-styles")) {
    const s = document.createElement("style");
    s.id = "rv-global-styles";
    s.textContent = `
      .rv-list::-webkit-scrollbar{display:none}
      .rv-list{scrollbar-width:none;-ms-overflow-style:none}
      .rv-card{transition:box-shadow .15s,transform .15s}
      .rv-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.1);transform:translateY(-2px)}
      .rv-media-thumb{transition:opacity .15s;cursor:pointer}
      .rv-media-thumb:hover{opacity:.82}
      @keyframes rv-fade-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      .rv-modal-backdrop{animation:rv-fade-in .18s ease}
      .rv-sort-toggle{transition:border-color .15s,box-shadow .15s}
      .rv-sort-toggle:hover{border-color:rgba(0,0,0,.28)}
      .rv-sort-toggle:focus-visible{border-color:rgba(0,0,0,.4);box-shadow:0 0 0 3px rgba(0,0,0,.06)}
      .rv-sort-option:hover{background:rgba(0,0,0,.05)!important}
      .rv-star-input:focus-visible{outline:2px solid currentColor}
    `;
    document.head.appendChild(s);
  }


  // ── Custom template (Pro) ────────────────────────────────────────────────
  // Merchant-authored HTML runs in the *shopper's* browser on a page that
  // carries the cart and checkout. It is sanitised server-side on save; this
  // repeats the strip here because a stored row can predate a tightening of
  // those rules, and this is the last moment before it executes.
  // The widget title is merchant-controlled and was previously interpolated
  // raw into the markup. Escaping it costs nothing and closes that gap.
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var RV_FORBIDDEN_TAGS = ["script","iframe","object","embed","link","meta","base",
    "style","form","input","button","textarea","select","option","svg","math",
    "template","slot","portal","frame","frameset"];

  /**
   * Client-side mirror of lib/widget-css.ts.
   *
   * The server already sanitises and scopes this CSS before storing it, so in
   * the normal path this is a no-op. It runs anyway because the result goes
   * straight into a <style> tag on the merchant's storefront: if a stored row
   * predates a tightening of the rules, or the payload is ever tampered with,
   * an unscoped rule here could restyle their entire site rather than just the
   * review widget.
   */
  function rvScopeCss(css) {
    css = String(css || "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/<\/?[a-z][^>]*>/gi, "")
      .replace(/@import[^;]*;?/gi, "")
      .replace(/expression\s*\([^)]*\)/gi, "")
      .replace(/url\s*\(\s*['"]?\s*(javascript|vbscript|data:text\/html)[^)]*\)/gi, "none")
      .replace(/@charset[^;]*;?/gi, "");

    var out = [];
    var rest = css;

    while (rest.length) {
      var braceAt = rest.indexOf("{");
      if (braceAt === -1) break;

      var head = rest.slice(0, braceAt).trim();

      // Match the closing brace by depth, so @media blocks stay intact.
      var depth = 0, end = -1;
      for (var i = braceAt; i < rest.length; i++) {
        if (rest[i] === "{") depth++;
        else if (rest[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
      }
      if (end === -1) break; // unbalanced — drop the remainder

      var body = rest.slice(braceAt + 1, end);
      rest = rest.slice(end + 1);
      if (!head) continue;

      if (/^@(media|supports|container|layer)\b/i.test(head)) {
        var inner = rvScopeCss(body);
        if (inner) out.push(head + " { " + inner + " }");
        continue;
      }
      if (head.charAt(0) === "@") {
        // @keyframes / @font-face carry no selectors to scope.
        out.push(head + " { " + body.trim() + " }");
        continue;
      }

      var scoped = head.split(",").map(function (raw) {
        var sel = raw.trim();
        if (!sel) return "";
        // Stripping tags out of "</style><script>x=1</script>.a{}" leaves
        // "x=1.a" behind as a pseudo-selector. It matches nothing, but
        // attacker-supplied text should not be emitted into a <style> tag at
        // all, so drop anything that isn't selector-shaped. "=" is legal only
        // inside an attribute selector.
        if (!/^[A-Za-z0-9_\-.#:\s>+~*[\]="'()|^$&]+$/.test(sel)) return "";
        if (sel.replace(/\[[^\]]*\]/g, "").indexOf("=") !== -1) return "";
        if (sel.indexOf(".rivu-custom-root") === 0) return sel;
        // html/body/:root/* are retargeted at the widget rather than dropped,
        // so the rule still does something instead of silently vanishing.
        if (/^(html|body|:root|\*)\b/i.test(sel)) {
          var restSel = sel.replace(/^(html|body|:root|\*)\b/i, "").trim();
          return restSel ? ".rivu-custom-root " + restSel : ".rivu-custom-root";
        }
        return ".rivu-custom-root " + sel;
      }).filter(Boolean).join(", ");

      if (scoped && body.trim()) out.push(scoped + " { " + body.trim() + " }");
    }

    return out.join("\n");
  }

  function rvSanitise(html) {
    var out = String(html || "");
    for (var i = 0; i < RV_FORBIDDEN_TAGS.length; i++) {
      var t = RV_FORBIDDEN_TAGS[i];
      out = out.replace(new RegExp("<" + t + "\\b[\\s\\S]*?<\\/" + t + "\\s*>", "gi"), "");
      out = out.replace(new RegExp("<" + t + "\\b[^>]*\\/?>", "gi"), "");
    }
    out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
    out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
    out = out.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
    out = out.replace(/(href|src|action|formaction)\s*=\s*(["'])\s*(javascript|data|vbscript)\s*:[^"']*\2/gi, "");
    return out;
  }

  // Placeholders are replaced with markup the widget generated itself, never
  // with shopper or merchant input.
  function rvRenderTemplate(tpl, values) {
    return tpl.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, function (whole, name) {
      return Object.prototype.hasOwnProperty.call(values, name) ? values[name] : whole;
    });
  }

  function avatarColor(name) {
    const P = ["#7c3aed","#0891b2","#dc2626","#ea580c","#16a34a","#2563eb","#c026d3","#0d9488"];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return P[Math.abs(h) % P.length];
  }
  function initials(name) {
    const p = name.trim().split(/\s+/);
    return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
  }
  function timeAgo(iso) {
    const d = Date.now() - new Date(iso).getTime(), s = d / 1000, m = s / 60, h = m / 60, day = h / 24, mo = day / 30, yr = day / 365;
    if (yr >= 1) return `${Math.round(yr)} year${Math.round(yr) > 1 ? "s" : ""} ago`;
    if (mo >= 1) return `about ${Math.round(mo)} month${Math.round(mo) > 1 ? "s" : ""} ago`;
    if (day >= 1) return `${Math.round(day)} day${Math.round(day) > 1 ? "s" : ""} ago`;
    if (h >= 1) return `${Math.round(h)} hour${Math.round(h) > 1 ? "s" : ""} ago`;
    return "just now";
  }
  const STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z";

  function starSvg(fill, size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' + fill +
      '" style="display:block;flex-shrink:0"><path d="' + STAR_PATH + '"/></svg>';
  }

  /**
   * Stars for a rating, including halves.
   *
   * This used to be called with Math.round, so a 4.5 average drew five solid
   * stars — the widget claimed a perfect score for a store that didn't have
   * one. Overstating a merchant's rating is worse than a cosmetic bug: their
   * shoppers see it, and it's the number the whole app exists to report.
   *
   * The half star is a clipped overlay rather than an SVG gradient or clipPath,
   * both of which need an id. Several widgets can share a page (product page,
   * badge, related products), and duplicate ids would make one instance's
   * gradient silently apply to another's stars.
   */
  function starsHtml(n, color, empty = "#e0e0e0", size = 16) {
    var rating = Number(n) || 0;
    var out = "";

    for (var i = 1; i <= 5; i++) {
      var fillFraction = Math.max(0, Math.min(1, rating - (i - 1)));

      if (fillFraction >= 0.75) {
        out += starSvg(color, size);
      } else if (fillFraction >= 0.25) {
        out +=
          '<span style="position:relative;display:inline-block;width:' + size +
          'px;height:' + size + 'px;flex-shrink:0;">' +
          starSvg(empty, size) +
          '<span style="position:absolute;top:0;left:0;width:50%;height:100%;overflow:hidden;">' +
          starSvg(color, size) +
          "</span></span>";
      } else {
        out += starSvg(empty, size);
      }
    }

    return out;
  }

  const REVIEWS_PER_PAGE = 10;

  async function render(el) {
    const { shop, productId, productTitle, productImage } = el.dataset;
    el.innerHTML = `<p style="font-size:14px;color:#aaa;padding:12px 0;">Loading reviews…</p>`;

    let reviews = [], summary = { total: 0, average: 0, breakdown: [] };
    const D = {
      // Every key the API sends must appear here — the merge below iterates
      // D, so a field missing from this object is silently discarded.
      richSnippetsEnabled:true, customTemplateEnabled:false, customTemplateHtml:"", customTemplateCss:"",
      displayStyle:"list", splitSummary:false, gridColumns:3, carouselVisible:1,
      arrowColor:"#111", primaryColor:"#111", starColor:"#f5b400", rangeColor:"#f5b400",
      backgroundColor:"#fff", textColor:"#333", borderRadius:8, fontFamily:"inherit",
      reviewTextSize:14, reviewTextAlign:"left", formAlign:"center",
      formMaxWidth:540, widgetMaxWidth:900, widgetTitle:"CUSTOMER REVIEWS",
      headingFontSize:14, headingBold:true, headingAlign:"center",
      topSpacing:24, showBorder:false, borderColor:"#e0e0e0", borderWidth:1, borderStyle:"solid",
      backgroundGradient:null, primaryGradient:null,
      letCustomerPickLanguage:false, showSuggestionsOnWebsite:true,
      formTemplate:"basic",
      summaryLayout:"modern", // "modern"|"compact"|"sidebar"|"horizontal"|"iconpct"
      summaryBgColor:"#f8f8f8",
      summaryTextColor:"#333333",
      summaryWidth:220,
      summaryPosition:"left",
      filterBgColor:"#ffffff",
      filterTextColor:"#999999",
      filterBorderColor:"rgba(0,0,0,0.08)",
      sortBgColor:"#ffffff",
      sortTextColor:"#333333",
      sortBorderColor:"#dddddd",
      reviewCountFontSize:14,
      reviewTitleColor:"#111111",
      reviewBodyColor:"#333333",
      reviewMetaColor:"#999999",
      formBgColor:"#ffffff",
      formTextColor:"#1a1a2e",
      formCloseColor:"#999999",
    };
    let design = { ...D };
    let plan = "free";
    let availableLanguages = [{ code:"en", label:"English" }];

    try {
      const res = await fetch(`${API_BASE}/api/reviews/list?shop=${encodeURIComponent(shop)}&productId=${encodeURIComponent(productId)}`);
      if (res.ok) {
        const data = await res.json();
        reviews = data.reviews || [];
        summary = data.summary || summary;
        plan = data.plan || "free";
        availableLanguages = data.availableLanguages || availableLanguages;
        const f = data.design || {};
        for (const k in D) {
          const v = f[k];
          design[k] = (v === undefined || v === null || v === "") ? D[k] : v;
        }
      }
    } catch(err) {
      el.innerHTML = '<p style="color:#c0392b;font-size:13px;padding:12px 0;">Rivu: failed to load reviews. Error: ' + String(err) + '</p>';
      return;
    }

    // ── SEO: schema.org Product + AggregateRating ──────────────────────
    // What earns the star ratings under a product in Google results, and
    // the main commercial reason a merchant fits a reviews app at all.
    //
    // Injected once per product, only when there is at least one approved
    // review — an aggregateRating with reviewCount 0 is invalid structured
    // data and Google penalises it rather than ignoring it.
    //
    // Merchants can switch this off (richSnippetsEnabled) because many
    // themes already emit their own Product schema, and two competing
    // aggregateRating blocks on one page make Google discard both.
    function injectRichSnippet() {
      if (!design.richSnippetsEnabled) return;
      if (!summary.total || !summary.average) return;

      var markerId = "rivu-jsonld-" + String(productId).replace(/[^a-zA-Z0-9_-]/g, "");
      if (document.getElementById(markerId)) return; // already emitted

      // Only reviews with a body are included; Google requires reviewBody.
      var sample = (reviews || [])
        .filter(function (r) { return r.body && r.customerName; })
        .slice(0, 20)
        .map(function (r) {
          return {
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: Number(r.rating),
              bestRating: 5,
              worstRating: 1,
            },
            author: { "@type": "Person", name: String(r.customerName) },
            reviewBody: String(r.body),
            datePublished: r.createdAt
              ? new Date(r.createdAt).toISOString().slice(0, 10)
              : undefined,
          };
        });

      var payload = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: productTitle || document.title,
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: Number(summary.average),
          reviewCount: Number(summary.total),
          bestRating: 5,
          worstRating: 1,
        },
      };
      if (productImage) payload.image = productImage;
      if (sample.length) payload.review = sample;

      var tag = document.createElement("script");
      tag.type = "application/ld+json";
      tag.id = markerId;
      // JSON.stringify drops undefined values and escapes the content, so
      // review text cannot break out of the script element.
      tag.textContent = JSON.stringify(payload);
      document.head.appendChild(tag);
    }

    try { injectRichSnippet(); } catch (e) { /* never block rendering for SEO */ }

    const r = design.borderRadius;
    const starColor = design.starColor;
    const rangeColor = design.rangeColor;
    const primary = design.primaryGradient || design.primaryColor;
    const cardBg = design.backgroundGradient || design.backgroundColor;

    // ─── State ───────────────────────────────────────────────────
    let sortOrder = "newest";
    let searchTerm = "";
    let shownCount = REVIEWS_PER_PAGE;
    let suggestionPool = [], suggestionPoolKey = "", suggestionBatchStart = 0;
    let selectedRating = 0, photoDataUrl, videoDataUrl, selectedLang = availableLanguages[0]?.code || "en";

    // ─── Lightbox ────────────────────────────────────────────────
    function buildLightbox() {
      const lb = document.createElement("div");
      lb.className = "rv-lightbox-root";
      lb.innerHTML = `<div class="rv-lightbox-back" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:99999;align-items:center;justify-content:center;">
        <button class="rv-lb-close" style="position:absolute;top:20px;right:24px;background:none;border:none;font-size:28px;color:#fff;cursor:pointer;">✕</button>
        <div class="rv-lb-content" style="max-width:90vw;max-height:88vh;"></div>
      </div>`;
      el.appendChild(lb);
      const back = lb.querySelector(".rv-lightbox-back");
      lb.querySelector(".rv-lb-close").addEventListener("click", () => { back.style.display = "none"; lb.querySelector(".rv-lb-content").innerHTML = ""; });
      back.addEventListener("click", e => { if (e.target === back) { back.style.display = "none"; lb.querySelector(".rv-lb-content").innerHTML = ""; } });
      return { open(url, type) {
        lb.querySelector(".rv-lb-content").innerHTML = type === "video"
          ? `<video src="${url}" controls autoplay style="max-width:90vw;max-height:88vh;border-radius:8px;"></video>`
          : `<img src="${url}" style="max-width:90vw;max-height:88vh;border-radius:8px;"/>`;
        back.style.display = "flex";
      }};
    }

    // ─── One review card ─────────────────────────────────────────
    // Build a per-shop review-count map so the Verified Buyer badge is
    // only shown to customers who have submitted 3 or more reviews (i.e.
    // the isTopReviewer flag that the API already computes per-email).
    // This re-uses the same flag — the badge shows when isTopReviewer=true.
    /**
     * Default styling for the review list when a custom layout is active.
     *
     * In custom mode reviewCard drops its inline styles — an inline style beats
     * any selector a merchant can write, so while they were there no custom
     * stylesheet could restyle the list, and every design ended up with the
     * same card. This is the baseline that replaces them: it still honours the
     * merchant's colour and size settings, and it is injected *before* their
     * own CSS so anything they write wins.
     */
    function listBaseCss() {
      return [
        ".rv-list{display:flex;flex-direction:column;gap:14px;}",
        ".rv-card{background:" + cardBg + ";color:" + design.textColor + ";border-radius:" + r + "px;padding:20px;font-size:" + design.reviewTextSize + "px;border:1px solid rgba(0,0,0,.06);box-shadow:0 1px 4px rgba(0,0,0,.05);}",
        ".rv-card-inner{display:flex;align-items:flex-start;gap:14px;}",
        ".rv-card-avatar{flex-shrink:0;}",
        ".rv-avatar{width:40px;height:40px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;}",
        ".rv-card-main{flex:1;min-width:0;}",
        ".rv-card-head{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:2px;}",
        ".rv-card-author{font-weight:700;font-size:14px;color:" + design.textColor + ";}",
        ".rv-card-time{margin-left:auto;font-size:12px;color:" + design.reviewMetaColor + ";white-space:nowrap;}",
        ".rv-card-date{font-size:12px;color:" + design.reviewMetaColor + ";margin-bottom:7px;}",
        ".rv-card-stars{display:flex;gap:2px;margin-bottom:10px;}",
        ".rv-card-title{margin:0 0 7px;font-weight:700;font-size:16px;font-style:italic;line-height:1.4;color:" + design.reviewTitleColor + ";}",
        ".rv-card-body{margin:0 0 8px;line-height:1.65;color:" + design.reviewBodyColor + ";font-size:" + design.reviewTextSize + "px;}",
        ".rv-card-body.rv-clamped{max-height:4.8em;overflow:hidden;}",
        ".rv-read-more{background:none;border:none;padding:0;font-size:12px;font-weight:600;color:" + design.primaryColor + ";cursor:pointer;margin-bottom:8px;}",
        ".rv-card-media{width:80px;height:80px;object-fit:cover;border-radius:8px;margin-bottom:8px;cursor:pointer;}",
        ".rv-card-video{position:relative;overflow:hidden;background:#000;}",
        ".rv-card-video video{width:100%;height:100%;object-fit:cover;pointer-events:none;}",
        ".rv-card-video-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.25);color:#fff;font-size:18px;}",
        ".rv-card-verified{display:inline-flex;align-items:center;gap:3px;font-size:11px;color:#2563eb;background:#eff6ff;padding:1px 7px;border-radius:20px;flex-shrink:0;}",
        ".rv-card-top{margin-left:4px;padding:1px 6px;background:" + design.primaryColor + ";color:#fff;border-radius:10px;font-size:10px;vertical-align:middle;}",
        ".rv-card-recommend{display:flex;align-items:center;gap:5px;font-size:12px;margin-top:6px;}",
        ".rv-card-recommend.rv-yes{color:#16a34a;}",
        ".rv-card-recommend.rv-no{color:#dc2626;}",
        ".rv-card-reply{margin-top:10px;padding:10px 12px;border-left:3px solid " + design.primaryColor + ";background:rgba(0,0,0,.035);border-radius:0 6px 6px 0;}",
        ".rv-card-reply-label{margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;opacity:.6;}",
        ".rv-card-reply-body{margin:0;font-size:13px;line-height:1.6;}",
      ].join("");
    }

    /**
     * One review card, serving both paths.
     *
     * The built-in layouts need the inline styles — they carry every colour and
     * size the merchant set. A custom layout needs them gone, for the reason
     * described above listBaseCss. Same markup either way, so the two can't
     * drift; only the styling mechanism changes.
     */
    function reviewCard(rev) {
      const custom = !!(design.customTemplateEnabled && design.customTemplateHtml);
      // In custom mode the class name carries the styling instead.
      const st = (css) => (custom ? "" : ' style="' + css + '"');

      const isLong = rev.body && rev.body.length > 240;
      const bodyId = `rv-b-${rev.id}`;
      const topBadge = rev.isTopReviewer
        ? `<span class="rv-card-top"${st(`margin-left:4px;padding:1px 6px;background:${design.primaryColor};color:#fff;border-radius:10px;font-size:10px;vertical-align:middle;`)}>⭐ Top</span>`
        : "";
      // Verified Buyer badge only for reviewers with 3+ reviews (isTopReviewer flag)
      const verifiedBadge = rev.isTopReviewer
        ? `<span class="rv-card-verified"${st("display:inline-flex;align-items:center;gap:3px;font-size:11px;color:#2563eb;background:#eff6ff;padding:1px 7px;border-radius:20px;flex-shrink:0;")}><span>✓</span> Verified Buyer</span>`
        : "";
      // "I recommend" — stored in rev.recommends boolean (null means not answered)
      // The merchant's public reply. Escaped, not trusted: it is written in
      // the admin but rendered in shoppers' browsers, so it goes through the
      // same treatment as any other stored text.
      const ownerReplyHtml = rev.ownerReply
        ? '<div class="rv-card-reply"' + st(
            "margin-top:10px;padding:10px 12px;border-left:3px solid " + design.primaryColor +
            ";background:rgba(0,0,0,.035);border-radius:0 6px 6px 0;"
          ) + '>' +
            '<p class="rv-card-reply-label"' + st(
              "margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;opacity:.6;"
            ) + '>Store owner reply</p>' +
            '<p class="rv-card-reply-body"' + st("margin:0;font-size:13px;line-height:1.6;") + '>' +
            escapeHtml(rev.ownerReply) + '</p></div>'
        : "";

      const recommendHtml = rev.recommends === true
        ? `<div class="rv-card-recommend rv-yes"${st("display:flex;align-items:center;gap:5px;font-size:12px;color:#16a34a;margin-top:6px;")}><span${st("font-size:15px;")}>👍</span> I recommend this product</div>`
        : rev.recommends === false
        ? `<div class="rv-card-recommend rv-no"${st("display:flex;align-items:center;gap:5px;font-size:12px;color:#dc2626;margin-top:6px;")}><span${st("font-size:15px;")}>👎</span> I don't recommend this product</div>`
        : "";
      return `
<div class="rv-card"${st(`background:${cardBg};color:${design.textColor};border-radius:${r}px;padding:20px;font-size:${design.reviewTextSize}px;border:1px solid rgba(0,0,0,.06);box-shadow:0 1px 4px rgba(0,0,0,.05);${design.displayStyle==='carousel'?'min-width:260px;max-width:300px;flex-shrink:0;':''}`)}>
  <div class="rv-card-inner"${st("display:flex;align-items:flex-start;gap:14px;")}>
    <div class="rv-card-avatar"${st("flex-shrink:0;")}>
      <div class="rv-avatar" style="background:${avatarColor(rev.customerName)};${custom ? "" : `width:40px;height:40px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;`}">${initials(rev.customerName)}</div>
    </div>
    <div class="rv-card-main"${st("flex:1;min-width:0;")}>
      <div class="rv-card-head"${st("display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:2px;")}>
        <span class="rv-card-author"${st(`font-weight:700;font-size:14px;color:${design.textColor};`)}>${rev.customerName}</span>
        ${verifiedBadge}
        ${topBadge}
        <span class="rv-card-time"${st(`margin-left:auto;font-size:12px;color:${design.reviewMetaColor};white-space:nowrap;`)}>${timeAgo(rev.createdAt)}</span>
      </div>
      <div class="rv-card-date"${st(`font-size:12px;color:${design.reviewMetaColor};margin-bottom:7px;`)}>${new Date(rev.createdAt).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"})}</div>
      <div class="rv-card-stars"${st("display:flex;gap:2px;margin-bottom:10px;")}>${starsHtml(rev.rating, starColor, "#e0e0e0", 16)}</div>
      ${rev.reviewTitle ? `<p class="rv-card-title"${st(`margin:0 0 7px;font-weight:700;font-size:16px;font-style:italic;text-align:left;line-height:1.4;color:${design.reviewTitleColor};`)}>${rev.reviewTitle}</p>` : ""}
      ${rev.body ? `<p id="${bodyId}" class="rv-card-body${isLong ? " rv-clamped" : ""}"${st(`margin:0 0 8px;line-height:1.65;text-align:left;color:${design.reviewBodyColor};font-size:${design.reviewTextSize}px;${isLong ? "max-height:4.8em;overflow:hidden;" : ""}`)}>${rev.body}</p>` : ""}
      ${isLong ? `<button class="rv-read-more" data-target="${bodyId}"${st(`background:none;border:none;padding:0;font-size:12px;font-weight:600;color:${design.primaryColor};cursor:pointer;margin-bottom:8px;`)}>Read more</button>` : ""}
      ${rev.videoUrl ? `<div class="rv-media-thumb rv-card-media rv-card-video" data-media-url="${rev.videoUrl}" data-media-type="video"${st("width:80px;height:80px;border-radius:8px;overflow:hidden;position:relative;background:#000;margin-bottom:8px;")}><video src="${rev.videoUrl}"${st("width:100%;height:100%;object-fit:cover;pointer-events:none;")}></video><div class="rv-card-video-play"${st("position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.25);")}><span${st("color:#fff;font-size:18px;")}>▶</span></div></div>` : ""}
      ${!rev.videoUrl && rev.photoUrl ? `<img class="rv-media-thumb rv-card-media" data-media-url="${rev.photoUrl}" data-media-type="image" src="${rev.photoUrl}"${st("width:80px;height:80px;object-fit:cover;border-radius:8px;margin-bottom:8px;cursor:pointer;")}/>` : ""}
      ${recommendHtml}
      ${ownerReplyHtml}
    </div>
  </div>
</div>`;
    }

    // ─── Sort + slice ─────────────────────────────────────────────
    /**
     * Sorts the review list.
     *
     * Rating order matters more than it looks: a shopper who wants to know
     * what the complaints are goes straight for the lowest ratings, and every
     * established review app offers it. Ties fall back to newest first, so the
     * order is stable rather than whatever the database happened to return.
     */
    function getSortedReviews() {
      const term = searchTerm.trim().toLowerCase();
      const matching = term
        ? reviews.filter((r) =>
            [r.body, r.reviewTitle, r.customerName]
              .filter(Boolean)
              .some((field) => String(field).toLowerCase().includes(term))
          )
        : reviews;

      const byNewest = (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

      const comparators = {
        newest: byNewest,
        oldest: (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        highest: (a, b) => b.rating - a.rating || byNewest(a, b),
        lowest: (a, b) => a.rating - b.rating || byNewest(a, b),
      };

      return [...matching].sort(comparators[sortOrder] || byNewest);
    }

    // ─── Build summary + review list DOM ─────────────────────────
    // Helper: render one breakdown bar row (called from all summary layouts)
    function breakdownRow(star, pct, textColor, barBg, barFill) {
      return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;">'
        + '<span style="font-size:12px;color:' + textColor + ';width:28px;flex-shrink:0;text-align:right;font-weight:600;">' + star + '★</span>'
        + '<div style="flex:1;height:8px;background:' + barBg + ';border-radius:4px;overflow:hidden;">'
        + '<div style="display:block;width:' + pct + '%;height:8px;background:' + barFill + ';border-radius:4px;"></div>'
        + '</div>'
        + '<span style="font-size:11px;color:' + textColor + ';opacity:.7;width:34px;flex-shrink:0;font-weight:500;">' + pct + '%</span>'
        + '</div>';
    }

    function buildMain() {
      const sorted = getSortedReviews();
      const visible = sorted.slice(0, shownCount);
      const hasMore = sorted.length > shownCount;

      // List wrapper style — set based on displayStyle
      let listWrapperStyle = "display:flex;flex-direction:column;gap:14px;";
      if (design.displayStyle === "grid") {
        listWrapperStyle = `display:grid;grid-template-columns:repeat(${design.gridColumns},1fr);gap:14px;`;
      } else if (design.displayStyle === "carousel") {
        listWrapperStyle = `display:flex;gap:14px;overflow-x:auto;scroll-behavior:smooth;padding-bottom:4px;`;
      } else if (design.displayStyle === "masonry") {
        listWrapperStyle = `column-count:${design.gridColumns};column-gap:14px;`;
      }

      // Breakdown bars
      /**
       * The share of reviewers who said they would recommend the product.
       *
       * Appended to the breakdown so every summary layout picks it up from one
       * place — there are eight of them, and editing each would guarantee one
       * gets missed.
       *
       * Hidden when nobody answered, rather than showing "0%", which would read
       * as everyone disliking the product.
       */
      const recommendSummaryHtml = (summary.recommend && summary.recommend.answered)
        ? '<div style="display:flex;align-items:baseline;gap:7px;margin-top:12px;padding-top:11px;' +
          'border-top:1px solid rgba(0,0,0,.07);">' +
          '<span style="font-size:17px;font-weight:800;color:' + design.textColor + ';">' +
          summary.recommend.percent + '%</span>' +
          '<span style="font-size:12px;color:' + design.reviewMetaColor + ';">would recommend' +
          ' (' + summary.recommend.count + ' of ' + summary.recommend.answered + ')</span>' +
          '</div>'
        : "";

      const breakdownHtml = summary.total ? summary.breakdown.map(b => {
        const pct = Number(b.percentage) || 0;
        return '<div style="display:flex;align-items:center;gap:10px;font-size:13px;margin:4px 0;">'
          + '<span style="width:48px;color:' + design.textColor + ';opacity:.65;">' + b.star + ' Stars</span>'
          + '<div style="flex:1;height:8px;background-color:#e0e0e0;border-radius:4px;overflow:hidden;">'
          + '<div style="display:block;width:' + pct + '%;height:8px;background-color:' + rangeColor + ';border-radius:4px;"></div>'
          + '</div>'
          + '<span style="width:28px;text-align:right;color:' + design.textColor + ';opacity:.65;">' + pct + '%</span>'
          + '</div>';
      }).join("") + recommendSummaryHtml : "";

      const writeBtn = `<button class="rv-open-form-btn" style="display:flex;align-items:center;gap:8px;padding:12px 22px;background:${primary};color:#fff;border:none;border-radius:${r}px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15);flex-shrink:0;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Write a Review</button>`;

      // Wrapper: applies merchant-set width + position to any summary block.
      // width < 900 acts as max-width; position controls left/center/right alignment.
      function wrapSummary(inner) {
        var ml = design.summaryPosition === 'left' ? '0' : 'auto';
        var mr = design.summaryPosition === 'right' ? '0' : 'auto';
        var w = Number(design.summaryWidth) || 0;
        // Treat small values (sidebar-era 160-600 range) as percentages of a
        // sensible band: anything >= 320 is used as a real max-width in px,
        // otherwise fall back to 100%.
        var maxW = w >= 320 ? w + 'px' : '100%';
        return '<div style="max-width:' + maxW + ';width:100%;margin-left:' + ml + ';margin-right:' + mr + ';">' + inner + '</div>';
      }

      // ── A: MODERN CARD (Free+) — orange box + stars left, horizontal bars right
      const summaryModern = (function(){
        if (!summary.total) return '<div style="margin-bottom:20px;display:flex;justify-content:center;">' + writeBtn + '</div>';
        return wrapSummary('<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin-bottom:24px;padding:20px 24px;background:' + design.summaryBgColor + ';border:1px solid rgba(0,0,0,.06);border-radius:' + r + 'px;">'
          + '<div style="display:flex;align-items:center;gap:14px;flex-shrink:0;">'
          +   '<div style="background:' + rangeColor + ';border-radius:10px;padding:12px 16px;text-align:center;min-width:76px;">'
          +     '<div style="font-family:Georgia,serif;font-size:34px;font-weight:800;color:#fff;line-height:1;">' + summary.average + '</div>'
          +     '<div style="display:flex;justify-content:center;gap:1px;margin-top:5px;">' + starsHtml(summary.average, '#fff', 'rgba(255,255,255,.35)', 12) + '</div>'
          +   '</div>'
          +   '<div>'
          +     '<div style="display:flex;gap:2px;margin-bottom:4px;">' + starsHtml(summary.average, starColor, '#e0e0e0', 18) + '</div>'
          +     '<div style="font-size:12px;color:' + design.summaryTextColor + ';opacity:.6;">Based on ' + summary.total + ' review' + (summary.total===1?'':'s') + '</div>'
          +   '</div>'
          + '</div>'
          + '<div style="flex:1;min-width:160px;">' + breakdownHtml + '</div>'
          + writeBtn + '</div>');
      })();

      // ── B: COMPACT (Growth+) — circle ring left, bars center, count+button right
      const summaryCompact = (function(){
        if (!summary.total) return '<div style="margin-bottom:20px;display:flex;justify-content:center;">' + writeBtn + '</div>';
        return wrapSummary('<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin-bottom:24px;padding:18px 24px;background:' + design.summaryBgColor + ';border:1px solid rgba(0,0,0,.06);border-radius:' + r + 'px;">'
          + '<div style="text-align:center;flex-shrink:0;">'
          +   '<div style="width:88px;height:88px;border-radius:50%;border:3px solid ' + starColor + ';display:flex;align-items:center;justify-content:center;margin:0 auto;">'
          +     '<div>'
          +       '<div style="font-family:Georgia,serif;font-size:26px;font-weight:800;color:' + design.summaryTextColor + ';line-height:1;">' + summary.average + '</div>'
          +       '<div style="display:flex;justify-content:center;gap:1px;margin-top:3px;">' + starsHtml(summary.average, starColor, '#e0e0e0', 10) + '</div>'
          +     '</div>'
          +   '</div>'
          +   '<div style="font-size:10px;color:' + design.summaryTextColor + ';opacity:.6;margin-top:6px;">Based on ' + summary.total + ' reviews</div>'
          + '</div>'
          + '<div style="flex:1;min-width:160px;">' + breakdownHtml + '</div>'
          + '<div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:10px;">'
          +   writeBtn
          +   '<span style="font-size:13px;font-weight:600;color:' + design.summaryTextColor + ';">' + summary.total + ' Reviews</span>'
          + '</div></div>');
      })();

      // ── C: LEFT SIDEBAR (Growth+) — sticky sidebar, reviews scroll right
      const summarySidebar = (function(){
        if (!summary.total) return '<div style="margin-bottom:20px;display:flex;justify-content:center;">' + writeBtn + '</div>';
        return '<div style="background:' + design.summaryBgColor + ';border-radius:' + r + 'px;padding:22px 18px;width:' + design.summaryWidth + 'px;flex-shrink:0;border:1px solid rgba(0,0,0,.06);">'
          + '<div style="font-family:Georgia,serif;font-size:48px;font-weight:800;color:' + design.summaryTextColor + ';line-height:1;">' + summary.average + '</div>'
          + '<div style="display:flex;gap:2px;margin:8px 0 4px;">' + starsHtml(summary.average, starColor, '#e0e0e0', 16) + '</div>'
          + '<div style="font-size:12px;color:' + design.summaryTextColor + ';opacity:.55;margin-bottom:16px;">Based on ' + summary.total + ' review' + (summary.total===1?'':'s') + '</div>'
          + breakdownHtml
          + '<div style="margin-top:16px;">' + writeBtn + '</div></div>';
      })();

      // ── D: HORIZONTAL BAR (Pro) — score box + stars + star columns + button (reference design)
      const summaryHorizontal = (function(){
        if (!summary.total) return '<div style="margin-bottom:20px;display:flex;justify-content:center;">' + writeBtn + '</div>';
        var cols = '';
        for (var i = 0; i < summary.breakdown.length; i++) {
          var b = summary.breakdown[i];
          var pct = Number(b.percentage) || 0;
          cols += '<div style="text-align:center;padding:0 14px;border-left:' + (i > 0 ? '1px solid rgba(0,0,0,.1)' : 'none') + ';">'
            + '<div style="font-size:14px;font-weight:700;color:' + design.summaryTextColor + ';margin-bottom:8px;white-space:nowrap;">' + b.star + ' Star' + (b.star===1?'':'s') + '</div>'
            + '<div style="width:56px;height:7px;background:rgba(150,150,150,.25);border-radius:4px;overflow:hidden;margin:0 auto 7px;">'
            +   '<div style="display:block;width:' + pct + '%;height:7px;background:' + rangeColor + ';border-radius:4px;"></div>'
            + '</div>'
            + '<div style="font-size:13px;font-weight:600;color:' + design.summaryTextColor + ';opacity:.7;">' + (b.count||0) + '</div>'
            + '</div>';
        }
        return wrapSummary('<div style="display:flex;align-items:center;gap:20px;margin-bottom:24px;padding:20px 26px;background:' + design.summaryBgColor + ';border:1px solid rgba(0,0,0,.06);border-radius:' + r + 'px;flex-wrap:wrap;">'
          + '<div style="background:' + rangeColor + ';border-radius:12px;padding:18px 22px;text-align:center;flex-shrink:0;">'
          +   '<div style="font-family:Georgia,serif;font-size:38px;font-weight:800;color:#fff;line-height:1;">' + summary.average + '</div>'
          + '</div>'
          + '<div style="flex-shrink:0;">'
          +   '<div style="display:flex;gap:2px;margin-bottom:4px;">' + starsHtml(summary.average, starColor, '#e0e0e0', 19) + '</div>'
          +   '<div style="font-size:13px;color:' + design.summaryTextColor + ';opacity:.65;">Based on ' + summary.total + ' reviews</div>'
          + '</div>'
          + '<div style="flex:1;display:flex;justify-content:center;flex-wrap:wrap;gap:0;">' + cols + '</div>'
          + writeBtn + '</div>');
      })();

      // ── E: ICON + PERCENTAGE (Pro) — black circle + person icons + % (count) per star
      const summaryIconPct = (function(){
        if (!summary.total) return '<div style="margin-bottom:20px;display:flex;justify-content:center;">' + writeBtn + '</div>';
        var iRows = '';
        for (var i = 0; i < summary.breakdown.length; i++) {
          var b = summary.breakdown[i];
          var pct = Number(b.percentage) || 0;
          var filled = Math.round(pct / 12.5); // 0-8 icons filled
          var icons = '';
          for (var d = 0; d < 8; d++) {
            var col = d < filled ? rangeColor : '#d5d5d5';
            icons += '<svg width="15" height="15" viewBox="0 0 24 24" fill="' + col + '" style="flex-shrink:0;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
          }
          iRows += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:9px;">'
            + '<span style="font-size:12px;font-weight:700;color:' + design.summaryTextColor + ';width:52px;flex-shrink:0;">' + b.star + ' Star' + (b.star===1?'':'s') + '</span>'
            + '<div style="display:flex;gap:4px;flex:1;">' + icons + '</div>'
            + '<span style="font-size:12px;font-weight:600;color:' + design.summaryTextColor + ';width:74px;flex-shrink:0;text-align:right;">' + pct + '% (' + (b.count||0) + ')</span>'
            + '</div>';
        }
        return wrapSummary('<div style="display:flex;align-items:center;gap:28px;flex-wrap:wrap;margin-bottom:24px;padding:24px 28px;background:' + design.summaryBgColor + ';border:1px solid rgba(0,0,0,.06);border-radius:' + r + 'px;">'
          + '<div style="text-align:center;flex-shrink:0;">'
          +   '<div style="width:96px;height:96px;border-radius:50%;background:#111;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto;">'
          +     '<span style="font-family:Georgia,serif;font-size:30px;font-weight:800;color:#fff;line-height:1;">' + summary.average + '</span>'
          +     '<span style="font-size:9px;color:#aaa;margin-top:3px;">Out of 5</span>'
          +   '</div>'
          +   '<div style="display:flex;justify-content:center;gap:2px;margin-top:9px;">' + starsHtml(summary.average, starColor, '#e0e0e0', 15) + '</div>'
          +   '<div style="font-size:11px;color:' + design.summaryTextColor + ';opacity:.6;margin-top:4px;">Based on ' + summary.total + ' reviews</div>'
          + '</div>'
          + '<div style="flex:1;min-width:260px;">' + iRows + '</div>'
          + writeBtn + '</div>');
      })();

      const sl = design.summaryLayout || 'modern';
      // ── F: MINIMAL (Free+) — just the score. Suits plain, typographic
      // themes where rating bars would fight the rest of the page.
      const summaryMinimal = (function(){
        if (!summary.total) return '<div style="margin-bottom:20px;display:flex;justify-content:center;">' + writeBtn + '</div>';
        return wrapSummary('<div style="text-align:center;margin-bottom:24px;padding:6px 0 4px;">'
          + '<div style="display:flex;align-items:baseline;justify-content:center;gap:8px;">'
          +   '<span style="font-size:42px;font-weight:800;letter-spacing:-1.5px;color:' + design.summaryTextColor + ';line-height:1;">' + summary.average + '</span>'
          +   '<span style="font-size:15px;color:' + design.summaryTextColor + ';opacity:.4;">/ 5</span>'
          + '</div>'
          + '<div style="display:flex;justify-content:center;gap:2px;margin:10px 0 6px;">' + starsHtml(summary.average, starColor, '#e0e0e0', 16) + '</div>'
          + '<div style="font-size:13px;color:' + design.summaryTextColor + ';opacity:.55;margin-bottom:16px;">' + summary.total + ' review' + (summary.total===1?'':'s') + '</div>'
          + '<div style="display:flex;justify-content:center;">' + writeBtn + '</div>'
          + '</div>');
      })();

      // ── G: STACKED (Growth+) — score above full-width bars. The layout
      // that survives a narrow column or a phone without wrapping oddly.
      const summaryStacked = (function(){
        if (!summary.total) return '<div style="margin-bottom:20px;display:flex;justify-content:center;">' + writeBtn + '</div>';
        return wrapSummary('<div style="margin-bottom:24px;padding:20px;background:' + design.summaryBgColor + ';border:1px solid rgba(0,0,0,.06);border-radius:' + r + 'px;">'
          + '<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:16px;">'
          +   '<div style="display:flex;align-items:center;gap:12px;">'
          +     '<span style="font-size:34px;font-weight:800;letter-spacing:-1px;color:' + design.summaryTextColor + ';line-height:1;">' + summary.average + '</span>'
          +     '<div>'
          +       '<div style="display:flex;gap:2px;">' + starsHtml(summary.average, starColor, '#e0e0e0', 14) + '</div>'
          +       '<div style="font-size:12px;color:' + design.summaryTextColor + ';opacity:.55;margin-top:3px;">' + summary.total + ' review' + (summary.total===1?'':'s') + '</div>'
          +     '</div>'
          +   '</div>'
          +   writeBtn
          + '</div>'
          + '<div>' + breakdownHtml + '</div>'
          + '</div>');
      })();

      // ── H: SPLIT PANEL (Pro) — tinted score panel beside the bars, the
      // shape most large retail sites use, so it looks familiar to shoppers.
      const summarySplit = (function(){
        if (!summary.total) return '<div style="margin-bottom:20px;display:flex;justify-content:center;">' + writeBtn + '</div>';
        return wrapSummary('<div style="display:flex;flex-wrap:wrap;margin-bottom:24px;border:1px solid rgba(0,0,0,.08);border-radius:' + r + 'px;overflow:hidden;">'
          + '<div style="flex:0 0 190px;min-width:170px;padding:24px 20px;text-align:center;background:' + primary + ';color:#fff;">'
          +   '<div style="font-size:44px;font-weight:800;letter-spacing:-1.5px;line-height:1;">' + summary.average + '</div>'
          +   '<div style="display:flex;justify-content:center;gap:2px;margin:10px 0 8px;">' + starsHtml(summary.average, '#ffffff', 'rgba(255,255,255,.35)', 14) + '</div>'
          +   '<div style="font-size:12px;opacity:.85;">' + summary.total + ' review' + (summary.total===1?'':'s') + '</div>'
          + '</div>'
          + '<div style="flex:1;min-width:200px;padding:20px;background:' + design.summaryBgColor + ';display:flex;flex-direction:column;justify-content:center;gap:14px;">'
          +   '<div>' + breakdownHtml + '</div>'
          +   '<div>' + writeBtn + '</div>'
          + '</div></div>');
      })();

      const summaryHtml = sl === 'compact' ? summaryCompact
        : sl === 'sidebar' ? summarySidebar
        : sl === 'horizontal' ? summaryHorizontal
        : sl === 'iconpct' ? summaryIconPct
        : sl === 'minimal' ? summaryMinimal
        : sl === 'stacked' ? summaryStacked
        : sl === 'split' ? summarySplit
        : summaryModern;

    /**
      * Search across the reviews already loaded.
      *
      * Filtering in the browser rather than round-tripping: the widget already
      * holds every review it will show, so a server call would add latency for
      * a list it can filter instantly. If pagination ever changes that, this
      * has to move server-side, and the count above it would start lying first.
      */
     function searchControl() {
       return '<label style="position:relative;display:inline-flex;align-items:center;">' +
         '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + design.filterTextColor +
         '" stroke-width="2" stroke-linecap="round" style="position:absolute;left:11px;pointer-events:none;opacity:.7;">' +
         '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
         '<input class="rv-search" type="search" value="' + escapeHtml(searchTerm) + '"' +
         ' placeholder="Search reviews" aria-label="Search reviews"' +
         ' style="border:1px solid ' + design.sortBorderColor + ';border-radius:' + Math.max(r - 2, 6) + 'px;' +
         'background:' + design.sortBgColor + ';color:' + design.sortTextColor + ';' +
         'padding:8px 12px 8px 32px;font-size:13px;font-family:inherit;width:160px;outline:none;"/>' +
         '</label>';
     }

    const SORT_OPTIONS = [
      { value: "newest", label: "Newest" },
      { value: "oldest", label: "Oldest" },
      { value: "highest", label: "Highest rating" },
      { value: "lowest", label: "Lowest rating" },
    ];

    /**
     * The sort control: an icon button that opens a small panel.
     *
     * A native <select> was doing this job, but it can only ever look like the
     * browser's dropdown, and on a review section that is meant to match the
     * merchant's theme it stood out as the one unstyled thing on the page.
     *
     * Built as a real menu rather than a styled div: the button reports its
     * expanded state, the options are focusable buttons, and Escape closes it —
     * so it is still usable without a mouse, which is what a native select gave
     * away for free.
     */
    function sortControl() {
      const current = SORT_OPTIONS.find((o) => o.value === sortOrder) || SORT_OPTIONS[0];

      return '<div class="rv-sort-wrap" style="position:relative;">' +
        '<button type="button" class="rv-sort-toggle" aria-haspopup="true" aria-expanded="false"' +
        ' aria-label="Sort reviews. Currently ' + current.label + '"' +
        ' style="display:inline-flex;align-items:center;justify-content:center;gap:7px;' +
        'border:1px solid ' + design.sortBorderColor + ';border-radius:' + Math.max(r - 2, 6) + 'px;' +
        'background:' + design.sortBgColor + ';color:' + design.sortTextColor + ';' +
        'padding:8px 11px;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;' +
        'line-height:1;">' +
        // Sliders icon — reads as "filter/sort" without needing a label.
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
        ' stroke-width="2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h10M18 18h2"/>' +
        '<circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="16" cy="18" r="2"/></svg>' +
        '<span class="rv-sort-current">' + escapeHtml(current.label) + '</span>' +
        '</button>' +
        '<div class="rv-sort-panel" role="menu" hidden' +
        ' style="position:absolute;top:calc(100% + 8px);right:0;z-index:20;min-width:172px;' +
        'background:' + design.sortBgColor + ';border:1px solid ' + design.sortBorderColor + ';' +
        'border-radius:' + Math.max(r, 8) + 'px;box-shadow:0 8px 28px rgba(0,0,0,.13);padding:8px;">' +
        '<p style="margin:0 0 4px;padding:5px 10px;font-size:12px;font-weight:700;' +
        'color:' + design.sortTextColor + ';opacity:.55;">Sort by</p>' +
        SORT_OPTIONS.map(function (o) {
          const selected = o.value === sortOrder;
          return '<button type="button" role="menuitem" class="rv-sort-option" data-sort="' + o.value + '"' +
            ' style="display:block;width:100%;text-align:left;background:' +
            (selected ? "rgba(0,0,0,.05)" : "none") + ';border:none;border-radius:6px;' +
            'padding:8px 10px;font-size:13px;font-family:inherit;cursor:pointer;' +
            'color:' + design.sortTextColor + ';font-weight:' + (selected ? 700 : 500) + ';">' +
            escapeHtml(o.label) + '</button>';
        }).join("") +
        '</div></div>';
    }

      const filtersHtml = reviews.length > 0 ? `
<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin:0 0 20px;padding-bottom:15px;border-bottom:1px solid ${design.filterBorderColor};">
  <span style="font-size:${design.reviewCountFontSize}px;color:${design.filterTextColor};font-weight:500;letter-spacing:-.005em;">
    <span style="color:${design.textColor};font-weight:700;">${sorted.length}</span> Review${sorted.length === 1 ? "" : "s"}${searchTerm.trim() ? " matching “" + escapeHtml(searchTerm.trim()) + "”" : ""}
  </span>
  <div style="display:flex;align-items:center;gap:10px;">
    ${searchControl()}
    ${sortControl()}
  </div>
</div>` : "";

      const listHtml = visible.length
        ? visible.map(reviewCard).join("")
        : `
<div style="text-align:center;padding:34px 20px;border:1px dashed ${design.borderColor};border-radius:${r}px;background:rgba(0,0,0,.015);">
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${design.starColor}" stroke-width="1.5" stroke-linejoin="round" style="opacity:.85;margin-bottom:10px;">
    <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.35l-5.81 3.05L7.3 13.93 2.6 9.35l6.5-.95L12 2.5z"/>
  </svg>
  <p style="margin:0 0 4px;font-size:16px;font-weight:600;color:${design.textColor};">No reviews yet</p>
  <p style="margin:0;font-size:13px;color:${design.reviewMetaColor};">Be the first to share what you think.</p>
</div>`;

      const loadMoreHtml = hasMore ? `
<div style="text-align:center;margin-top:20px;">
  <button class="rv-load-more" style="padding:12px 32px;background:#fff;color:${design.primaryColor};border:2px solid ${design.primaryColor};border-radius:${r}px;font-size:14px;font-weight:600;cursor:pointer;">
    Load More Reviews ▾
  </button>
</div>` : "";

      const poweredBy = plan === "free"
        ? `<p style="margin-top:20px;font-size:13px;font-weight:700;color:#888;text-align:center;letter-spacing:.01em;">Powered by <a href="https://rivu-one.vercel.app" target="_blank" rel="noopener" style="color:#555;text-decoration:none;font-weight:800;">Rivu</a></p>`
        : "";

      // Carousel: fixed card width + prev/next arrow buttons
      const reviewListHtml = design.displayStyle === "carousel" ? `
<div style="position:relative;padding:0 20px;">
  <button class="rv-arrow-prev" style="position:absolute;left:0;top:50%;transform:translateY(-50%);z-index:2;width:34px;height:34px;border-radius:50%;background:${design.arrowColor || "#111"};color:#fff;border:none;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.2);flex-shrink:0;">&#8249;</button>
  <div class="rv-list" style="${listWrapperStyle}">${listHtml}</div>
  <button class="rv-arrow-next" style="position:absolute;right:0;top:50%;transform:translateY(-50%);z-index:2;width:34px;height:34px;border-radius:50%;background:${design.arrowColor || "#111"};color:#fff;border:none;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.2);flex-shrink:0;">&#8250;</button>
</div>` : `<div class="rv-list"${
        // The wrapper's inline layout is dropped in custom mode for the same
        // reason the cards' is: an inline style beats every selector, so with
        // it in place a merchant could not lay the list out at all. The
        // baseline stylesheet supplies a sane default they can override.
        design.customTemplateEnabled && design.customTemplateHtml
          ? ""
          : ` style="${listWrapperStyle}"`
      }>${listHtml}</div>`;

      // Sidebar layout (C) — summary as fixed left column, reviews on right
      if (sl === "sidebar" && summary.total) {
        return `<div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap;">
  <div style="flex:0 0 ${design.summaryWidth}px;min-width:${design.summaryWidth}px;position:sticky;top:16px;">${summaryHtml}</div>
  <div style="flex:1;min-width:260px;">
    ${filtersHtml}
    ${reviewListHtml}
    ${loadMoreHtml}
    ${poweredBy}
  </div>
</div>`;
      }

      // A Pro merchant's own layout. Rendered here rather than at the call
      // site because every piece it can place — the bars, the button, the
      // review list — is scoped to this function.
      if (design.customTemplateEnabled && design.customTemplateHtml) {
        // The merchant's stylesheet ships with their markup. It arrives
        // already scoped to .rivu-custom-root (server-side, lib/widget-css.ts)
        // so it cannot reach the rest of the storefront, and the wrapper below
        // is what those scoped selectors hang off. Without the wrapper every
        // rule would match nothing and the layout would render unstyled.
        // Baseline first, merchant CSS second — later rules of equal
        // specificity win, so whatever they write overrides the defaults.
        var customCss = rvScopeCss(listBaseCss() + (design.customTemplateCss || ""));
        var styleTag = customCss
          ? "<style>" + customCss.split("<").join("") + "</style>"
          : "";

        return '<div class="rivu-custom-root">' + styleTag +
          rvRenderTemplate(rvSanitise(design.customTemplateHtml), {
          title: escapeHtml(design.widgetTitle),
          stars: starsHtml(summary.average, starColor, "#e0e0e0", 16),
          average: String(summary.average || 0),
          count: summary.total + " review" + (summary.total === 1 ? "" : "s"),
          breakdown: breakdownHtml,
          write_button: writeBtn,
          review_list: reviewListHtml,
        }) + "</div>" + poweredBy;
      }

      return `${summaryHtml}${filtersHtml}${reviewListHtml}${loadMoreHtml}${poweredBy}`;
    }

    // ─── 4 form templates ─────────────────────────────────────────
    function buildFormHtml(template) {
      const fBg = design.formBgColor || "#fff";
      const fTc = design.formTextColor || "#1a1a2e";
      const fClose = design.formCloseColor || "#999";
      const isDark = template === "dark";

      // Input style — NO box shadow ever, clean border only
      const inp = (extra) => `padding:11px 14px;border:1.5px solid ${isDark ? "rgba(255,255,255,.15)" : "#e0e0e0"};border-radius:8px;font-size:14px;font-family:inherit;background:${isDark ? "rgba(255,255,255,.06)" : fBg};color:${isDark ? "#fff" : fTc};outline:none;width:100%;box-sizing:border-box;box-shadow:none;${extra||""}`;
      const inp_focus = (col) => `onfocus="this.style.borderColor='${col}'" onblur="this.style.borderColor='${isDark ? "rgba(255,255,255,.15)" : "#e0e0e0"}'"`; 

      // Media upload button — highlighted, easy to tap
      const mediaBtn = (icon, label, name, accept) =>
        `<label style="display:inline-flex;align-items:center;gap:6px;padding:9px 16px;background:${isDark ? "rgba(255,255,255,.1)" : "#f0f0f0"};color:${isDark ? "rgba(255,255,255,.85)" : "#444"};border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:background .15s;" onmouseenter="this.style.background='${isDark ? "rgba(255,255,255,.18)" : "#e0e0e0"}'" onmouseleave="this.style.background='${isDark ? "rgba(255,255,255,.1)" : "#f0f0f0"}'">
          ${icon} ${label}
          <input type="file" name="${name}" accept="${accept}" style="display:none;"/>
          <span class="rv-${name}-label"></span>
        </label>`;

      // Recommend checkbox
      const recBox = `<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:${isDark ? "rgba(255,255,255,.05)" : "#f8f8f8"};border-radius:8px;cursor:pointer;font-size:13px;color:${isDark ? "rgba(255,255,255,.8)" : fTc};">
          <input type="checkbox" name="recommends" style="width:16px;height:16px;accent-color:${design.primaryColor};cursor:pointer;flex-shrink:0;"/>
          👍 I would recommend this product
        </label>`;

      const langDropdown = availableLanguages.length > 1
        ? `<select class="rv-lang-picker" style="width:100%;padding:10px;border:1.5px solid ${isDark ? "rgba(255,255,255,.15)" : "#e0e0e0"};border-radius:8px;font-size:13px;font-family:inherit;margin-bottom:12px;background:${isDark ? "rgba(255,255,255,.08)" : fBg};color:${isDark ? "#fff" : fTc};box-shadow:none;">${availableLanguages.map(l => `<option value="${l.code}">${l.label}</option>`).join("")}</select>`
        : "";

      /**
       * The rating input.
       *
       * One track rather than five buttons, because the rating a shopper can
       * give now includes halves — 3.5, 4.5 — and five whole-star buttons
       * cannot express one. The value comes from where the pointer is across
       * the track, so each star has a left half and a right half without any
       * extra markup.
       *
       * It stays keyboard-operable: the track is focusable and behaves as a
       * slider, since replacing buttons with a pointer-only control would shut
       * out anyone not using a mouse.
       */
      const starRow = (size, gap) =>
        '<span class="rv-star-input" role="slider" tabindex="0"' +
        ' aria-label="Rating" aria-valuemin="0.5" aria-valuemax="5" aria-valuenow="0"' +
        ' aria-valuetext="No rating selected"' +
        ' data-star-size="' + size + '"' +
        ' style="display:inline-flex;align-items:center;gap:' + gap + 'px;cursor:pointer;' +
        'padding:2px;border-radius:6px;outline-offset:3px;touch-action:none;">' +
        starsHtml(0, starColor, "#ddd", size) +
        "</span>";

      const submitBtn = (bg, tc, extra) =>
        `<button type="submit" style="padding:11px 24px;background:${bg};color:${tc};border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;${extra||""}">Submit Review</button>`;

      const closeBtn = (abs) =>
        `<button class="rv-form-close" style="${abs ? "position:absolute;top:14px;right:16px;" : ""}background:none;border:none;font-size:22px;cursor:pointer;color:${fClose};line-height:1;padding:4px;">×</button>`;

      // ── TEMPLATE 1: BASIC ──────────────────────────────────────────────────
      if (template === "basic") { return `
<div style="background:${fBg};border-radius:16px;overflow:hidden;font-family:inherit;color:${fTc};">
  <div style="background:linear-gradient(135deg,rgba(0,0,0,.04) 0%,rgba(0,0,0,.02) 100%);padding:22px 28px 18px;text-align:center;border-bottom:1px solid rgba(0,0,0,.07);position:relative;">
    ${closeBtn(true)}
    <p style="margin:0 0 3px;font-size:20px;font-weight:800;color:${fTc};letter-spacing:-.3px;">Write a Review</p>
    <p style="margin:0;font-size:13px;color:${fTc};opacity:.5;">Share your honest experience</p>
  </div>
  <div style="padding:22px 28px;">
    <div style="text-align:center;margin-bottom:16px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:${fTc};opacity:.45;text-transform:uppercase;letter-spacing:.05em;">Your Rating</p>
      <div style="display:inline-flex;background:rgba(245,180,0,.1);border-radius:40px;padding:4px 12px;">${starRow(32, 3)}</div>
      <p class="rv-tap-hint" style="margin:5px 0 0;font-size:11px;color:${fTc};opacity:.35;">Tap a star to rate</p>
    </div>
    ${langDropdown}
    <div class="rv-suggestions-wrap" style="display:none;"></div>
    <form class="rv-form" style="display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;gap:10px;">
        <input name="customerName" required placeholder="Your Name *" style="${inp()}" ${inp_focus(design.primaryColor)}/>
        <input name="customerEmail" type="email" placeholder="Email (Optional)" style="${inp()}" ${inp_focus(design.primaryColor)}/>
      </div>
      <input name="reviewTitle" maxlength="150" placeholder="Give your review a headline (optional)" style="${inp("font-weight:600;")}" ${inp_focus(design.primaryColor)}/>
      <textarea name="body" required minlength="10" placeholder="What did you like or dislike?" style="${inp("min-height:90px;resize:vertical;")}" ${inp_focus(design.primaryColor)}></textarea>
      ${recBox}
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        ${mediaBtn("📷", "Add Photo", "photo", "image/*")}
        ${mediaBtn("🎥", "Add Video", "video", "video/*")}
        <div style="margin-left:auto;">${submitBtn(primary, "#fff", "box-shadow:0 2px 8px rgba(0,0,0,.15);")}</div>
      </div>
      <p class="rv-status" style="margin:0;font-size:13px;text-align:center;"></p>
    </form>
  </div>
</div>`; }

      // ── TEMPLATE 2: CARD ──────────────────────────────────────────────────
      if (template === "card") { return `
<div style="background:${fBg};border-radius:16px;overflow:hidden;font-family:inherit;color:${fTc};">
  <div style="background:${primary};padding:20px 26px;position:relative;">
    ${closeBtn(true).replace(`color:${fClose}`, "color:rgba(255,255,255,.8)")}
    <p style="margin:0 0 2px;font-size:20px;font-weight:800;color:#fff;letter-spacing:-.3px;">Write a Review</p>
    <p style="margin:0 0 14px;font-size:12px;color:rgba(255,255,255,.75);">Share your honest experience</p>
    <div style="background:rgba(255,255,255,.15);border-radius:10px;padding:12px 14px;">
      <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:.06em;">Tap to rate</p>
      <div style="display:flex;gap:4px;">${starRow(30, 2)}</div>
    </div>
  </div>
  <div style="padding:20px 26px;">
    ${langDropdown}
    <div class="rv-suggestions-wrap" style="display:none;"></div>
    <form class="rv-form" style="display:flex;flex-direction:column;gap:10px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <input name="customerName" required placeholder="Your Name *" style="${inp()}" ${inp_focus(design.primaryColor)}/>
        <input name="customerEmail" type="email" placeholder="Email (Optional)" style="${inp()}" ${inp_focus(design.primaryColor)}/>
      </div>
      <input name="reviewTitle" maxlength="150" placeholder="Review Title *" style="${inp("font-weight:600;")}" ${inp_focus(design.primaryColor)}/>
      <textarea name="body" required minlength="10" placeholder="Share details of your experience..." style="${inp("min-height:90px;resize:vertical;")}" ${inp_focus(design.primaryColor)}></textarea>
      ${recBox}
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        ${mediaBtn("📷", "Add Photo", "photo", "image/*")}
        ${mediaBtn("🎥", "Add Video", "video", "video/*")}
        <div style="margin-left:auto;">${submitBtn(primary, "#fff", "")}</div>
      </div>
      <p class="rv-status" style="margin:0;font-size:13px;text-align:center;"></p>
    </form>
  </div>
</div>`; }

      // ── TEMPLATE 3: MINIMAL ───────────────────────────────────────────────
      if (template === "minimal") { return `
<div style="background:${fBg};border-radius:20px;padding:32px 30px;font-family:inherit;color:${fTc};position:relative;">
  ${closeBtn(true)}
  <h2 style="margin:0 0 4px;font-size:24px;font-weight:800;color:${fTc};letter-spacing:-.4px;">How was it?</h2>
  <p style="margin:0 0 20px;font-size:14px;color:${fTc};opacity:.45;">Your honest review helps everyone</p>
  <div style="display:flex;gap:6px;margin-bottom:4px;">${starRow(36, 4)}</div>
  <p class="rv-tap-hint" style="margin:0 0 18px;font-size:11px;color:${fTc};opacity:.3;">Select a rating above</p>
  ${langDropdown}
  <div class="rv-suggestions-wrap" style="display:none;"></div>
  <form class="rv-form" style="display:flex;flex-direction:column;gap:12px;">
    <div style="display:flex;gap:12px;">
      <input name="customerName" required placeholder="Name *" style="${inp()}" ${inp_focus(design.primaryColor)}/>
      <input name="customerEmail" type="email" placeholder="Email (optional)" style="${inp()}" ${inp_focus(design.primaryColor)}/>
    </div>
    <input name="reviewTitle" maxlength="150" placeholder="Review Title (optional)" style="${inp("font-weight:600;")}" ${inp_focus(design.primaryColor)}/>
    <textarea name="body" required minlength="10" placeholder="Tell us about your experience…" style="${inp("min-height:80px;resize:none;")}" ${inp_focus(design.primaryColor)}></textarea>
    ${recBox}
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      ${mediaBtn("📷", "Add Photo", "photo", "image/*")}
      ${mediaBtn("🎥", "Add Video", "video", "video/*")}
      <div style="margin-left:auto;">${submitBtn("#111", "#fff", "border-radius:40px;padding:12px 28px;letter-spacing:.02em;")}</div>
    </div>
    <p class="rv-status" style="margin:0;font-size:13px;text-align:center;"></p>
  </form>
</div>`; }

      // ── TEMPLATE 4: DARK ──────────────────────────────────────────────────
      return `
<div style="background:linear-gradient(145deg,#0f0f1a 0%,#1a1a2e 100%);border-radius:16px;padding:28px;font-family:inherit;position:relative;border:1px solid rgba(255,255,255,.08);color:#fff;">
  ${closeBtn(true).replace(`color:${fClose}`, "color:rgba(255,255,255,.5)")}
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,.08);">
    <div style="width:40px;height:40px;border-radius:10px;background:rgba(245,180,0,.15);border:1px solid rgba(245,180,0,.3);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">⭐</div>
    <div>
      <p style="margin:0 0 2px;font-size:18px;font-weight:800;color:#fff;">Write a Review</p>
      <p style="margin:0;font-size:12px;color:rgba(255,255,255,.4);">Your feedback matters to us</p>
    </div>
  </div>
  <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.4);">Rate your experience</p>
  <div style="display:flex;gap:6px;margin-bottom:4px;">${starRow(30, 2)}</div>
  <p class="rv-tap-hint" style="margin:8px 0 16px;font-size:11px;color:rgba(255,255,255,.3);">Tap a star to continue</p>
  ${langDropdown}
  <div class="rv-suggestions-wrap" style="display:none;"></div>
  <form class="rv-form" style="display:flex;flex-direction:column;gap:10px;">
    <div style="display:flex;gap:10px;">
      <input name="customerName" required placeholder="Your Name *" style="${inp()}" ${inp_focus("rgba(245,180,0,.6)")}/>
      <input name="customerEmail" type="email" placeholder="Email (Optional)" style="${inp()}" ${inp_focus("rgba(245,180,0,.6)")}/>
    </div>
    <textarea name="body" required minlength="10" placeholder="Tell us about your experience…" style="${inp("min-height:90px;resize:vertical;")}" ${inp_focus("rgba(245,180,0,.6)")}></textarea>
    ${recBox}
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      ${mediaBtn("📷", "Add Photo", "photo", "image/*")}
      ${mediaBtn("🎥", "Add Video", "video", "video/*")}
      <div style="margin-left:auto;">${submitBtn("linear-gradient(135deg,#f5b400 0%,#f59e0b 100%)", "#1a1a2e", "font-weight:800;")}</div>
    </div>
    <p class="rv-status" style="margin:0;font-size:13px;text-align:center;color:rgba(255,255,255,.5);"></p>
  </form>
</div>`;
    }


    // ─── RENDER ───────────────────────────────────────────────────
    const borderStr = design.showBorder
      ? `border:${design.borderWidth}px ${design.borderStyle} ${design.borderColor};border-radius:${r}px;padding:24px;`
      : "";

    // The custom template, when enabled, is produced by buildMain itself —
    // the heading is part of the merchant's own markup in that case, so it is
    // only added here for the built-in layout.
    var innerBody =
      (design.customTemplateEnabled && design.customTemplateHtml
        ? ''
        : '<p style="font-size:' + design.headingFontSize + 'px;font-weight:' + (design.headingBold ? 700 : 400) +
          ';letter-spacing:.06em;text-transform:uppercase;opacity:.85;margin:0 0 20px;text-align:' +
          design.headingAlign + ';">' + escapeHtml(design.widgetTitle) + '</p>') +
      '<div class="rv-main-content">' + buildMain() + '</div>';

    el.innerHTML = `
<div class="rv-root" style="font-family:${design.fontFamily};max-width:1440px;width:100%;margin-top:${design.topSpacing}px;margin-left:auto;margin-right:auto;color:${design.textColor};${borderStr}"><div style="max-width:${design.widgetMaxWidth}px;width:100%;margin:0 auto;">
  ${innerBody}
</div></div>

<div class="rv-modal-backdrop" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;align-items:center;justify-content:center;padding:16px;overflow-y:auto;">
  <div class="rv-form-container" style="width:100%;max-width:${design.formMaxWidth}px;max-height:92vh;overflow-y:auto;border-radius:12px;box-shadow:0 24px 60px rgba(0,0,0,.3);">
    ${buildFormHtml(design.formTemplate)}
  </div>
</div>`;

    const lightbox = buildLightbox();

    // Wire up media thumbnails
    el.querySelectorAll(".rv-media-thumb").forEach(t => {
      t.addEventListener("click", () => lightbox.open(t.dataset.mediaUrl, t.dataset.mediaType));
    });

    // Read more
    el.querySelectorAll(".rv-read-more").forEach(btn => {
      btn.addEventListener("click", () => {
        const tgt = el.querySelector(`#${btn.dataset.target}`);
        if (tgt) { tgt.style.maxHeight = "none"; tgt.style.overflow = "visible"; btn.style.display = "none"; }
      });
    });

    /**
     * Wires the sort menu. Called again after every re-render, because
     * rebuilding the list replaces these nodes.
     */
    function wireSort() {
      const search = el.querySelector(".rv-search");
      if (search) {
        search.addEventListener("input", () => {
          searchTerm = search.value;
          shownCount = REVIEWS_PER_PAGE;
          el.querySelector(".rv-main-content").innerHTML = buildMain();
          rewireMain();
          // Re-rendering replaces the input, so focus and caret have to be put
          // back or typing a second character would go nowhere.
          const next = el.querySelector(".rv-search");
          if (next) {
            next.focus();
            next.setSelectionRange(next.value.length, next.value.length);
          }
        });
      }

      const toggle = el.querySelector(".rv-sort-toggle");
      const panel = el.querySelector(".rv-sort-panel");
      if (!toggle || !panel) return;

      function close() {
        panel.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
      }

      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = panel.hidden;
        panel.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
      });

      el.querySelectorAll(".rv-sort-option").forEach((option) => {
        option.addEventListener("click", () => {
          sortOrder = option.dataset.sort;
          shownCount = REVIEWS_PER_PAGE;
          el.querySelector(".rv-main-content").innerHTML = buildMain();
          rewireMain();
        });
      });

      toggle.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
      });
      panel.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { close(); toggle.focus(); }
      });
      // A menu that only closes by choosing something is a trap; clicking away
      // has to dismiss it.
      document.addEventListener("click", (e) => {
        if (!panel.hidden && !panel.contains(e.target) && e.target !== toggle) close();
      });
    }

    wireSort();

    // Load more
    function rewireMain() {
      wireSort();
      const loadMore = el.querySelector(".rv-load-more");
      if (loadMore) loadMore.addEventListener("click", () => { shownCount += REVIEWS_PER_PAGE; el.querySelector(".rv-main-content").innerHTML = buildMain(); rewireMain(); });
      el.querySelectorAll(".rv-media-thumb").forEach(t => { t.addEventListener("click", () => lightbox.open(t.dataset.mediaUrl, t.dataset.mediaType)); });
      el.querySelectorAll(".rv-read-more").forEach(btn => { btn.addEventListener("click", () => { const tgt = el.querySelector(`#${btn.dataset.target}`); if (tgt) { tgt.style.maxHeight="none"; tgt.style.overflow="visible"; btn.style.display="none"; } }); });
      const openBtns = el.querySelectorAll(".rv-open-form-btn");
      openBtns.forEach(b => b.addEventListener("click", openModal));

      // Carousel arrows — wire after every rebuild
      const rvList = el.querySelector(".rv-list");
      const prevArrow = el.querySelector(".rv-arrow-prev");
      const nextArrow = el.querySelector(".rv-arrow-next");
      if (rvList && prevArrow) {
        prevArrow.addEventListener("click", () => {
          rvList.scrollBy({ left: -(rvList.clientWidth * 0.85), behavior: "smooth" });
        });
      }
      if (rvList && nextArrow) {
        nextArrow.addEventListener("click", () => {
          rvList.scrollBy({ left: rvList.clientWidth * 0.85, behavior: "smooth" });
        });
      }
    }
    rewireMain();

    // ─── Modal ────────────────────────────────────────────────────
    const backdrop = el.querySelector(".rv-modal-backdrop");
    const formContainer = el.querySelector(".rv-form-container");

    function openModal() { backdrop.style.display = "flex"; }
    function closeModal() { backdrop.style.display = "none"; if(tapHint) tapHint.style.display=""; selectedRating=0; paintStars(); }

    el.querySelectorAll(".rv-open-form-btn").forEach(b => b.addEventListener("click", openModal));
    backdrop.addEventListener("click", e => { if (e.target === backdrop) closeModal(); });

    const formClose = formContainer.querySelector(".rv-form-close");
    if (formClose) formClose.addEventListener("click", closeModal);

    const form = formContainer.querySelector(".rv-form");
    const status = formContainer.querySelector(".rv-status");
    const starInputs = [...formContainer.querySelectorAll(".rv-star-input")];
    const tapHint = formContainer.querySelector(".rv-tap-hint");
    const suggestionsWrap = formContainer.querySelector(".rv-suggestions-wrap");
    const langPicker = formContainer.querySelector(".rv-lang-picker");
    const photoInput = formContainer.querySelector('[name="photo"]');
    const videoInput = formContainer.querySelector('[name="video"]');
    const photoLabel = formContainer.querySelector(".rv-photo-label");
    const videoLabel = formContainer.querySelector(".rv-video-label");

    if (langPicker) {
      langPicker.addEventListener("change", () => { selectedLang = langPicker.value; if (selectedRating) loadSuggestions(); });
    }

    /** Redraws the track, optionally previewing the value under the pointer. */
    function paintStars(preview) {
      const shown = typeof preview === "number" ? preview : selectedRating;
      starInputs.forEach((track) => {
        const size = Number(track.dataset.starSize) || 30;
        track.innerHTML = starsHtml(shown, starColor, "#ddd", size);
        track.setAttribute("aria-valuenow", String(selectedRating));
        track.setAttribute(
          "aria-valuetext",
          selectedRating ? selectedRating + " out of 5 stars" : "No rating selected"
        );
      });
      if (tapHint && selectedRating) tapHint.style.display = "none";
    }

    /**
     * The rating for a pointer position across the track.
     *
     * Rounded up to the next half so the star under the pointer is always at
     * least half filled — landing on a star and getting the previous value
     * feels broken.
     */
    function ratingFromPointer(track, clientX) {
      const box = track.getBoundingClientRect();
      if (!box.width) return 0;
      const ratio = (clientX - box.left) / box.width;
      const value = Math.ceil(ratio * 10) / 2;
      return Math.max(0.5, Math.min(5, value));
    }

    // Suggestions — fetch a large pool (all templates for this rating) once
    // per rating+language combo, then client-side Fisher-Yates shuffle on
    // every Refresh so the customer genuinely sees a new random set each
    // time, not just the same 6 cycling in order.
    let sPool = [], sKey = "";
    function shuffleArray(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    async function loadSuggestions() {
      const key = `${selectedRating}|${selectedLang}`;
      if (key !== sKey || sPool.length === 0) {
        // Only re-fetch from server when rating or language actually changes.
        if (suggestionsWrap) suggestionsWrap.innerHTML = `<p style="font-size:12px;color:#aaa;margin:0 0 8px;">Loading suggestions…</p>`;
        try {
          const res = await fetch(`${API_BASE}/api/reviews/suggestions?rating=${selectedRating}&productTitle=${encodeURIComponent(productTitle)}&productId=${encodeURIComponent(productId || "")}&shop=${encodeURIComponent(shop)}&lang=${selectedLang}`);
          const data = await res.json();
          // items carry an id so a picked suggestion can be retired; older
          // responses only had plain strings, so accept both shapes.
          sPool = Array.isArray(data.items) && data.items.length
            ? data.items
            : (data.suggestions || []).map(t => ({ id: null, text: t }));
          sKey = key;
        } catch { if(suggestionsWrap) suggestionsWrap.innerHTML=""; return; }
      }
      // Fresh shuffle on EVERY call (including Refresh button), so the
      // customer always sees 6 suggestions in a brand-new random order.
      const shuffled = shuffleArray(sPool);
      renderSuggestionBatch(shuffled.slice(0, 6));
    }

    function renderSuggestionBatch(batch) {
      if (!suggestionsWrap) return;
      const bodyTA = form && form.querySelector('[name="body"]');
      suggestionsWrap.style.display = "block";
      suggestionsWrap.innerHTML = `
<div style="margin-bottom:10px;">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
    <span style="font-size:12px;font-weight:600;color:#555;">Suggestions</span>
    <div style="display:flex;gap:10px;">
      <button type="button" class="rv-refresh" style="background:none;border:none;font-size:12px;color:${design.primaryColor};cursor:pointer;padding:0;">🔄 Refresh</button>
      <button type="button" class="rv-close-sug" style="background:none;border:none;font-size:12px;color:#aaa;cursor:pointer;padding:0;">✕</button>
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:5px;">${batch.map(s => `<button type="button" class="rv-sug" data-sug-id="${s.id || ""}" style="text-align:left;padding:7px 10px;border:1px solid #e5e5e5;border-radius:6px;background:#fafafa;font-size:12px;cursor:pointer;color:#333;">${s.text}</button>`).join("")}</div>
</div>`;
      suggestionsWrap.querySelector(".rv-refresh").addEventListener("click", loadSuggestions);
      suggestionsWrap.querySelector(".rv-close-sug").addEventListener("click", () => { suggestionsWrap.style.display="none"; });
      suggestionsWrap.querySelectorAll(".rv-sug").forEach(b => {
        b.addEventListener("click", () => {
          if (bodyTA) bodyTA.value = b.textContent;
          suggestionsWrap.querySelectorAll(".rv-sug").forEach(x => { x.style.borderColor="#e5e5e5"; x.style.background="#fafafa"; });
          b.style.borderColor = design.primaryColor; b.style.background = "#fff";

          // Retire this suggestion so no other shopper in this store is
          // offered the same sentence. Fire-and-forget: the shopper already
          // has the text, so a failed claim must not block them.
          const sugId = b.dataset.sugId;
          if (sugId) {
            sPool = sPool.filter(s => s.id !== sugId);
            fetch(`${API_BASE}/api/reviews/suggestions/claim`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ shop: shop, id: sugId }),
            }).catch(() => {});
          }
        });
      });
    }

    starInputs.forEach((track) => {
      async function commit(value) {
        selectedRating = value;
        paintStars();
        if (design.showSuggestionsOnWebsite) await loadSuggestions();
      }

      track.addEventListener("click", (e) => {
        commit(ratingFromPointer(track, e.clientX));
      });

      // Preview on hover, so it is clear which half is about to be picked.
      track.addEventListener("mousemove", (e) => {
        paintStars(ratingFromPointer(track, e.clientX));
      });
      track.addEventListener("mouseleave", () => paintStars());

      track.addEventListener("keydown", (e) => {
        const step =
          e.key === "ArrowRight" || e.key === "ArrowUp"
            ? 0.5
            : e.key === "ArrowLeft" || e.key === "ArrowDown"
              ? -0.5
              : 0;
        if (!step) return;
        e.preventDefault();
        commit(Math.max(0.5, Math.min(5, (selectedRating || 0) + step)));
      });
    });

    if (photoInput) {
      photoInput.addEventListener("change", () => {
        const file = photoInput.files?.[0]; if (!file) return;
        if (photoLabel) photoLabel.textContent = file.name.slice(0, 16) + (file.name.length > 16 ? "…" : "");
        const img = new Image(), reader = new FileReader();
        reader.onload = () => { img.onload = () => { const c = document.createElement("canvas"); const sc = Math.min(1, 1000/Math.max(img.width,img.height)); c.width=img.width*sc; c.height=img.height*sc; c.getContext("2d").drawImage(img,0,0,c.width,c.height); photoDataUrl=c.toDataURL("image/jpeg",.82); }; img.src=reader.result; };
        reader.readAsDataURL(file);
      });
    }
    if (videoInput) {
      videoInput.addEventListener("change", () => {
        const file = videoInput.files?.[0]; if (!file) return;
        if (file.size > 8*1024*1024) { alert("Video too large — please keep it under 8MB."); videoInput.value=""; return; }
        if (videoLabel) videoLabel.textContent = file.name.slice(0,16)+(file.name.length>16?"…":"");
        const reader = new FileReader();
        reader.onload = () => { videoDataUrl = reader.result; };
        reader.readAsDataURL(file);
      });
    }

    if (form) {
      form.addEventListener("submit", async e => {
        e.preventDefault();
        if (!selectedRating) { if(status){status.textContent="Please pick a star rating.";status.style.color="#c0392b";} return; }
        if(status){status.textContent="Submitting…";status.style.color="#666";}
        try {
          const recommendsCb = form.querySelector('[name="recommends"]');
          const recommends = recommendsCb ? (recommendsCb.checked ? true : null) : null;
          const res = await fetch(`${API_BASE}/api/reviews/submit`, {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({
              shop, productId, productTitle,
              productImageUrl: productImage || undefined,
              rating: selectedRating,
              reviewTitle: form.reviewTitle?.value || undefined,
              body: form.body.value,
              customerName: form.customerName.value,
              customerEmail: form.customerEmail?.value || undefined,
              recommends,
              photoUrl: photoDataUrl,
              videoUrl: videoDataUrl,
            }),
          });
          const data = await res.json();
          if (res.ok) {
            if(status){ status.textContent = data.discountCode ? `Thanks! Discount code: ${data.discountCode}` : "Thanks! Your review is pending approval."; status.style.color="#1e7e34"; }
            form.reset(); photoDataUrl=undefined; videoDataUrl=undefined;
            setTimeout(closeModal, 2500);
          } else {
            if(status){status.textContent=data.error||"Something went wrong.";status.style.color="#c0392b";}
          }
        } catch { if(status){status.textContent="Network error, please try again.";status.style.color="#c0392b";} }
      });
    }
  }

  // Render all widget instances on the page.
  // Guard: skip any element already rendered (data-rv-rendered) to prevent
  // double-rendering when the script tag appears more than once.
  function renderAll() {
    document.querySelectorAll("#review-widget, .rivu-review-widget").forEach(el => {
      if (el.dataset.rvRendered) return;
      el.dataset.rvRendered = "1";
      render(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAll);
  } else {
    renderAll();
  }
})();
