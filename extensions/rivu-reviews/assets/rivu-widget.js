/**
 * Rivu Review Widget — premium design matching the reference image:
 * - Left: big serif rating, star breakdown bars, filter (Most Recent),
 *   review cards with avatar circles, verified badge, "I recommend",
 *   photo thumbnail→lightbox, Read more, Load more, Powered by Rivu (Free)
 * - Modal popup: 4 selectable form templates (basic/card/minimal/dark),
 *   plan-gated
 */
(function () {
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
    `;
    document.head.appendChild(s);
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
  function starsHtml(n, color, empty = "#e0e0e0", size = 16) {
    return [1,2,3,4,5].map(i => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${i<=n?color:empty}" style="display:inline-block;flex-shrink:0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>`).join("");
  }

  const REVIEWS_PER_PAGE = 10;

  async function render(el) {
    const { shop, productId, productTitle, productImage, apiBase } = el.dataset;
    const API_BASE = apiBase || "";

    // Guard: can't render without these
    if (!shop || !productId || !API_BASE) {
      el.innerHTML = '<p style="color:#c0392b;font-size:13px;padding:10px 0;">Rivu: missing shop, productId or api-base attribute. Please check the block settings.</p>';
      return;
    }

    el.innerHTML = `<p style="font-size:14px;color:#aaa;padding:12px 0;">Loading reviews…</p>`;

    let reviews = [], summary = { total: 0, average: 0, breakdown: [] };
    const D = {
      displayStyle:"list", splitSummary:false, gridColumns:3, carouselVisible:1,
      arrowColor:"#111", primaryColor:"#111", starColor:"#f5b400", rangeColor:"#f5b400",
      backgroundColor:"#fff", textColor:"#333", borderRadius:8, fontFamily:"inherit",
      reviewTextSize:14, reviewTextAlign:"left", formAlign:"center",
      formMaxWidth:540, widgetMaxWidth:900, widgetTitle:"CUSTOMER REVIEWS",
      headingFontSize:13, headingBold:true, headingAlign:"left",
      topSpacing:24, showBorder:false, borderColor:"#e0e0e0", borderWidth:1, borderStyle:"solid",
      backgroundGradient:null, primaryGradient:null,
      letCustomerPickLanguage:false, showSuggestionsOnWebsite:true,
      formTemplate:"basic",
      summaryLayout:"modern",
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
    } catch(apiErr) {
      console.error("[Rivu] API call failed:", apiErr);
      el.innerHTML = '<p style="color:#c0392b;font-size:13px;padding:10px 0;">Rivu: could not load reviews (' + String(apiErr) + '). Check that the App URL in block settings is correct.</p>';
      return;
    }

    const r = design.borderRadius;
    const starColor = design.starColor;
    const rangeColor = design.rangeColor;
    const primary = design.primaryGradient || design.primaryColor;
    const cardBg = design.backgroundGradient || design.backgroundColor;

    // ─── State ───────────────────────────────────────────────────
    let sortOrder = "newest";
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
    function reviewCard(rev) {
      const isLong = rev.body && rev.body.length > 240;
      const bodyId = `rv-b-${rev.id}`;
      const topBadge = rev.isTopReviewer
        ? `<span style="margin-left:4px;padding:1px 6px;background:${design.primaryColor};color:#fff;border-radius:10px;font-size:10px;vertical-align:middle;">⭐ Top</span>`
        : "";
      // Verified Buyer badge only for reviewers with 3+ reviews (isTopReviewer flag)
      const verifiedBadge = rev.isTopReviewer
        ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;color:#2563eb;background:#eff6ff;padding:1px 7px;border-radius:20px;flex-shrink:0;"><span>✓</span> Verified Buyer</span>`
        : "";
      // "I recommend" — stored in rev.recommends boolean (null means not answered)
      const recommendHtml = rev.recommends === true
        ? `<div style="display:flex;align-items:center;gap:5px;font-size:12px;color:#16a34a;margin-top:6px;"><span style="font-size:15px;">👍</span> I recommend this product</div>`
        : rev.recommends === false
        ? `<div style="display:flex;align-items:center;gap:5px;font-size:12px;color:#dc2626;margin-top:6px;"><span style="font-size:15px;">👎</span> I don't recommend this product</div>`
        : "";
      return `
<div class="rv-card" style="background:${cardBg};color:${design.textColor};border-radius:${r}px;padding:20px;font-size:${design.reviewTextSize}px;border:1px solid rgba(0,0,0,.06);box-shadow:0 1px 4px rgba(0,0,0,.05);">
  <div style="display:flex;align-items:flex-start;gap:14px;">
    <div style="flex-shrink:0;">
      <div class="rv-avatar" style="width:40px;height:40px;border-radius:50%;background:${avatarColor(rev.customerName)};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;">${initials(rev.customerName)}</div>
    </div>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:2px;">
        <span style="font-weight:700;font-size:14px;">${rev.customerName}</span>
        ${verifiedBadge}
        ${topBadge}
        <span style="margin-left:auto;font-size:12px;color:#999;white-space:nowrap;">${timeAgo(rev.createdAt)}</span>
      </div>
      <div style="font-size:12px;color:#aaa;margin-bottom:7px;">${new Date(rev.createdAt).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"})}</div>
      <div style="display:flex;gap:2px;margin-bottom:10px;">${starsHtml(rev.rating, starColor, "#e0e0e0", 16)}</div>
      ${rev.reviewTitle ? `<p style="margin:0 0 7px;font-weight:700;font-size:16px;font-style:italic;text-align:left;line-height:1.4;">${rev.reviewTitle}</p>` : ""}
      ${rev.body ? `<p id="${bodyId}" style="margin:0 0 8px;line-height:1.65;text-align:left;color:${design.textColor};${isLong ? "max-height:4.8em;overflow:hidden;" : ""}">${rev.body}</p>` : ""}
      ${isLong ? `<button class="rv-read-more" data-target="${bodyId}" style="background:none;border:none;padding:0;font-size:12px;font-weight:600;color:${design.primaryColor};cursor:pointer;margin-bottom:8px;">Read more</button>` : ""}
      ${rev.videoUrl ? `<div class="rv-media-thumb" data-media-url="${rev.videoUrl}" data-media-type="video" style="width:80px;height:80px;border-radius:8px;overflow:hidden;position:relative;background:#000;margin-bottom:8px;"><video src="${rev.videoUrl}" style="width:100%;height:100%;object-fit:cover;pointer-events:none;"></video><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.25);"><span style="color:#fff;font-size:18px;">▶</span></div></div>` : ""}
      ${!rev.videoUrl && rev.photoUrl ? `<img class="rv-media-thumb" data-media-url="${rev.photoUrl}" data-media-type="image" src="${rev.photoUrl}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;margin-bottom:8px;cursor:pointer;"/>` : ""}
      ${recommendHtml}
    </div>
  </div>
</div>`;
    }

    // ─── Sort + slice ─────────────────────────────────────────────
    function getSortedReviews() {
      const sorted = [...reviews].sort((a, b) =>
        sortOrder === "newest"
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      return sorted;
    }

    // ─── Build summary + review list DOM ─────────────────────────
    function buildMain() {
      const sorted = getSortedReviews();
      const visible = sorted.slice(0, shownCount);
      const hasMore = sorted.length > shownCount;

      // Breakdown bars
      const breakdownHtml = summary.total ? summary.breakdown.map(b => {
        const pct = Number(b.percentage) || 0;
        return `<div style="display:flex;align-items:center;gap:10px;font-size:13px;margin:4px 0;">
          <span style="width:48px;color:${design.textColor};opacity:.65;">${b.star} Stars</span>
          <div style="flex:1;height:8px;background-color:#f0f0f0;border-radius:4px;overflow:hidden;">
            <div style="display:block;width:${pct}%;height:100%;background-color:${rangeColor};border-radius:4px;"></div>
          </div>
          <span style="width:28px;text-align:right;color:${design.textColor};opacity:.65;">${b.percentage}</span>
        </div>`;
      }).join("") : "";

      const writeBtn = `<button class="rv-open-form-btn" style="display:flex;align-items:center;gap:8px;padding:12px 22px;background:${primary};color:#fff;border:none;border-radius:${r}px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15);flex-shrink:0;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Write a Review</button>`;

      // ── A: Modern Card (Free+) ─────────────────────────────────────────────
      // Orange rating box left, breakdown bars center, Write button right
      const summaryModern = summary.total ? `
<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin-bottom:28px;padding:20px;background:#fff;border:1px solid #f0f0f0;border-radius:${r}px;box-shadow:0 1px 6px rgba(0,0,0,.05);">
  <div style="display:flex;align-items:center;gap:16px;flex-shrink:0;">
    <div style="background:${rangeColor};border-radius:10px;padding:14px 18px;text-align:center;min-width:72px;">
      <div style="font-family:Georgia,serif;font-size:32px;font-weight:800;color:#fff;line-height:1;">${summary.average}</div>
      <div style="display:flex;justify-content:center;gap:1px;margin-top:4px;">${starsHtml(Math.round(summary.average), "#fff", "rgba(255,255,255,.4)", 11)}</div>
    </div>
    <div>
      <div style="display:flex;gap:2px;margin-bottom:4px;">${starsHtml(Math.round(summary.average), starColor, "#e5e5e5", 18)}</div>
      <div style="font-size:12px;color:#999;">Based on ${summary.total} review${summary.total===1?"":"s"}</div>
    </div>
  </div>
  <div style="flex:1;min-width:160px;">${breakdownHtml}</div>
  ${writeBtn}
</div>` : `<div style="margin-bottom:20px;">${writeBtn}</div>`;

      // ── B: Compact Summary + List (Growth+) ───────────────────────────────
      // Circular ring rating, clean compact bars, reviews in a tight list
      const summaryCompact = summary.total ? `
<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:24px;padding:16px 20px;border:1px solid #eee;border-radius:${r}px;">
  <div style="text-align:center;flex-shrink:0;padding:12px;border-right:1px solid #eee;padding-right:20px;margin-right:4px;">
    <div style="width:72px;height:72px;border-radius:50%;border:3px solid ${starColor};display:flex;align-items:center;justify-content:center;margin:0 auto;">
      <div>
        <div style="font-family:Georgia,serif;font-size:22px;font-weight:800;color:${design.textColor};line-height:1;">${summary.average}</div>
        <div style="font-size:8px;color:#999;margin-top:2px;">out of 5</div>
      </div>
    </div>
    <div style="display:flex;justify-content:center;gap:1px;margin-top:8px;">${starsHtml(Math.round(summary.average), starColor, "#e5e5e5", 12)}</div>
    <div style="font-size:10px;color:#aaa;margin-top:3px;">${summary.total} reviews</div>
  </div>
  <div style="flex:1;min-width:120px;">${breakdownHtml}</div>
  ${writeBtn}
</div>` : `<div style="margin-bottom:20px;">${writeBtn}</div>`;

      // ── C: Left Sidebar Summary (Growth+) ─────────────────────────────────
      // Sticky left column with summary, reviews flow on right — handled in bodyHtml
      const summarySidebar = summary.total ? `
<div style="background:#f8f8f8;border-radius:${r}px;padding:20px;margin-bottom:20px;">
  <div style="font-family:Georgia,serif;font-size:40px;font-weight:800;color:${design.textColor};line-height:1;">${summary.average}</div>
  <div style="display:flex;gap:2px;margin:6px 0 4px;">${starsHtml(Math.round(summary.average), starColor, "#e5e5e5", 16)}</div>
  <div style="font-size:12px;color:#999;margin-bottom:14px;">Based on ${summary.total} review${summary.total===1?"":"s"}</div>
  ${breakdownHtml}
  <div style="margin-top:14px;">${writeBtn}</div>
</div>` : `<div style="margin-bottom:20px;">${writeBtn}</div>`;

      // ── D: Horizontal Summary Bar (Pro) ──────────────────────────────────
      // Compact horizontal bar — rating box, inline stars breakdown, button all in one row
      const summaryHorizontal = summary.total ? `
<div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;padding:14px 18px;background:${design.backgroundColor};border:1px solid #eee;border-radius:${r}px;flex-wrap:wrap;box-shadow:0 1px 4px rgba(0,0,0,.05);">
  <div style="background:${rangeColor};border-radius:8px;padding:10px 14px;text-align:center;flex-shrink:0;">
    <div style="font-family:Georgia,serif;font-size:22px;font-weight:800;color:#fff;">${summary.average}</div>
    <div style="display:flex;gap:1px;margin-top:2px;">${starsHtml(Math.round(summary.average), "#fff", "rgba(255,255,255,.4)", 10)}</div>
  </div>
  <div style="font-size:11px;color:#aaa;flex-shrink:0;">Based on<br/><strong style="color:${design.textColor};font-size:13px;">${summary.total} reviews</strong></div>
  <div style="flex:1;display:flex;gap:8px;flex-wrap:wrap;">
    ${summary.breakdown.slice(0,3).map(b=>`<div style="text-align:center;"><div style="font-size:10px;color:#aaa;">${b.star} Stars</div><div style="font-size:11px;font-weight:700;color:${design.textColor};">${b.percentage}</div><div style="width:40px;height:4px;background:#eee;border-radius:2px;overflow:hidden;margin:2px auto 0;"><div style="width:${Number(b.percentage)||0}%;height:100%;background:${rangeColor};border-radius:2px;"></div></div></div>`).join("")}
  </div>
  ${writeBtn}
</div>` : `<div style="margin-bottom:20px;">${writeBtn}</div>`;

      const sl = design.summaryLayout || "modern";
      const summaryHtml = sl === "compact" ? summaryCompact
        : sl === "sidebar" ? summarySidebar
        : sl === "horizontal" ? summaryHorizontal
        : summaryModern;

      const filtersHtml = reviews.length > 0 ? `
<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid rgba(0,0,0,.08);">
  <span style="font-size:14px;color:#999;">${reviews.length} Review${reviews.length === 1 ? "" : "s"}</span>
  <select class="rv-sort" style="border:1px solid #ddd;border-radius:${Math.max(r-2,4)}px;padding:7px 12px;font-size:13px;font-family:inherit;cursor:pointer;background:#fff;color:${design.textColor};">
    <option value="newest">Most Recent</option>
    <option value="oldest">Oldest First</option>
  </select>
</div>` : "";

      const listHtml = visible.length
        ? visible.map(reviewCard).join("")
        : `<p style="font-size:14px;color:#aaa;padding:12px 0;">No reviews yet — be the first!</p>`;

      const loadMoreHtml = hasMore ? `
<div style="text-align:center;margin-top:20px;">
  <button class="rv-load-more" style="padding:12px 32px;background:#fff;color:${design.primaryColor};border:2px solid ${design.primaryColor};border-radius:${r}px;font-size:14px;font-weight:600;cursor:pointer;">
    Load More Reviews ▾
  </button>
</div>` : "";

      const poweredBy = plan === "free"
        ? `<p style="margin-top:16px;font-size:10px;color:#bbb;text-align:center;">Powered by <a href="https://rivu-one.vercel.app" target="_blank" rel="noopener" style="color:#bbb;text-decoration:underline;">Rivu</a></p>`
        : "";

      const reviewListHtml = `<div class="rv-list" style="${listWrapperStyle}">${listHtml}</div>`;

      // Sidebar layout (C) — summary as fixed left column, reviews on right
      if (sl === "sidebar" && summary.total) {
        return `<div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap;">
  <div style="flex:0 0 200px;position:sticky;top:16px;">${summaryHtml}</div>
  <div style="flex:1;min-width:260px;">
    ${filtersHtml}
    ${reviewListHtml}
    ${loadMoreHtml}
    ${poweredBy}
  </div>
</div>`;
      }

      return `${summaryHtml}${filtersHtml}${reviewListHtml}${loadMoreHtml}${poweredBy}`;
    }

    // ─── 4 form templates ─────────────────────────────────────────
    function buildFormHtml(template) {
      const langDropdown = design.letCustomerPickLanguage && availableLanguages.length > 1
        ? `<select class="rv-lang-picker" style="width:100%;padding:10px;border:1px solid rgba(255,255,255,.15);border-radius:8px;font-size:13px;font-family:inherit;margin-bottom:12px;background:rgba(255,255,255,.08);color:inherit;">${availableLanguages.map(l => `<option value="${l.code}">${l.label}</option>`).join("")}</select>`
        : "";

      // Shared: interactive star buttons
      const starRow = (size, gap, color) => [1,2,3,4,5].map(n =>
        `<button type="button" class="rv-star" data-star="${n}" style="background:none;border:none;padding:${gap}px;cursor:pointer;font-size:${size}px;color:#ccc;line-height:1;transition:color .12s,transform .1s;">★</button>`
      ).join("");

      // Shared: recommend checkbox
      const recBox = (bg, tc) =>
        `<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:${bg};border-radius:8px;cursor:pointer;font-size:13px;color:${tc};">
          <input type="checkbox" name="recommends" style="width:16px;height:16px;accent-color:${design.primaryColor};cursor:pointer;flex-shrink:0;"/>
          👍 I would recommend this product
        </label>`;

      // ── TEMPLATE 1: BASIC ──────────────────────────────────────────────────
      // Clean white form, centered heading, big stars in a pill background
      if (template === "basic") { return `
<div style="background:#fff;border-radius:16px;overflow:hidden;font-family:inherit;">
  <div style="background:linear-gradient(135deg,#f8f9ff 0%,#eef1ff 100%);padding:24px 28px 20px;text-align:center;border-bottom:1px solid #eee;">
    <p style="margin:0 0 3px;font-size:20px;font-weight:800;color:#1a1a2e;letter-spacing:-.3px;">Write a Review</p>
    <p style="margin:0;font-size:13px;color:#888;">Share your honest experience</p>
    <button class="rv-form-close" style="position:absolute;top:14px;right:16px;background:rgba(0,0,0,.07);border:none;border-radius:50%;width:28px;height:28px;font-size:16px;cursor:pointer;color:#555;display:flex;align-items:center;justify-content:center;">×</button>
  </div>
  <div style="padding:24px 28px;">
    <div style="text-align:center;margin-bottom:18px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:.05em;">Your Rating</p>
      <div style="display:inline-flex;background:#fff8ee;border-radius:40px;padding:6px 14px;gap:0;">${starRow(34, 3, "#f5b400")}</div>
      <p class="rv-tap-hint" style="margin:6px 0 0;font-size:11px;color:#bbb;">Tap a star to rate</p>
    </div>
    ${langDropdown}
    <div class="rv-suggestions-wrap" style="display:none;"></div>
    <form class="rv-form" style="display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;gap:10px;">
        <input name="customerName" required placeholder="Your Name *" style="flex:1;padding:11px 14px;border:2px solid #eee;border-radius:10px;font-size:14px;font-family:inherit;outline:none;transition:border-color .15s;" onfocus="this.style.borderColor='${design.primaryColor}'" onblur="this.style.borderColor='#eee'"/>
        <input name="customerEmail" type="email" placeholder="Email (Optional)" style="flex:1;padding:11px 14px;border:2px solid #eee;border-radius:10px;font-size:14px;font-family:inherit;outline:none;" onfocus="this.style.borderColor='${design.primaryColor}'" onblur="this.style.borderColor='#eee'"/>
      </div>
      <input name="reviewTitle" maxlength="150" placeholder="Give your review a headline (optional)" style="padding:11px 14px;border:2px solid #eee;border-radius:10px;font-size:14px;font-family:inherit;font-weight:600;outline:none;" onfocus="this.style.borderColor='${design.primaryColor}'" onblur="this.style.borderColor='#eee'"/>
      <textarea name="body" required minlength="10" placeholder="What did you like or dislike?" style="padding:11px 14px;border:2px solid #eee;border-radius:10px;font-size:14px;min-height:100px;font-family:inherit;resize:vertical;outline:none;" onfocus="this.style.borderColor='${design.primaryColor}'" onblur="this.style.borderColor='#eee'"></textarea>
      ${recBox("#f8f9ff", "#555")}
      <div style="display:flex;gap:8px;align-items:center;">
        <label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#888;cursor:pointer;border:1px solid #ddd;border-radius:8px;padding:7px 12px;">📷<input type="file" name="photo" accept="image/*" style="display:none;"/><span class="rv-photo-label">Photo</span></label>
        <label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#888;cursor:pointer;border:1px solid #ddd;border-radius:8px;padding:7px 12px;">🎥<input type="file" name="video" accept="video/*" style="display:none;"/><span class="rv-video-label">Video</span></label>
        <button type="submit" style="margin-left:auto;padding:12px 24px;background:${primary};color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.15);">Submit Review</button>
      </div>
      <p class="rv-status" style="margin:0;font-size:13px;text-align:center;"></p>
    </form>
  </div>
</div>`; }

      // ── TEMPLATE 2: CARD ──────────────────────────────────────────────────
      // Distinct: orange/colored star rating box top, then compact inline fields
      if (template === "card") { return `
<div style="background:#fff;border-radius:16px;overflow:hidden;font-family:inherit;box-shadow:0 8px 40px rgba(0,0,0,.12);">
  <div style="background:${primary};padding:20px 26px;">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div>
        <p style="margin:0 0 2px;font-size:20px;font-weight:800;color:#fff;letter-spacing:-.3px;">Write a Review</p>
        <p style="margin:0;font-size:12px;color:rgba(255,255,255,.75);">Share your honest experience</p>
      </div>
      <button class="rv-form-close" style="background:rgba(255,255,255,.2);border:none;border-radius:50%;width:30px;height:30px;font-size:17px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;">×</button>
    </div>
    <div style="margin-top:16px;background:rgba(255,255,255,.12);border-radius:12px;padding:14px 16px;">
      <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:.06em;">Tap to rate</p>
      <div style="display:flex;gap:4px;">${starRow(32, 2, "#fff")}</div>
    </div>
  </div>
  <div style="padding:22px 26px;">
    ${langDropdown}
    <div class="rv-suggestions-wrap" style="display:none;"></div>
    <form class="rv-form" style="display:flex;flex-direction:column;gap:10px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <input name="customerName" required placeholder="Your Name *" style="padding:11px 14px;border:1.5px solid #e8e8e8;border-radius:10px;font-size:14px;font-family:inherit;outline:none;transition:border-color .15s;" onfocus="this.style.borderColor='${design.primaryColor}'" onblur="this.style.borderColor='#e8e8e8'"/>
        <input name="customerEmail" type="email" placeholder="Email (Optional)" style="padding:11px 14px;border:1.5px solid #e8e8e8;border-radius:10px;font-size:14px;font-family:inherit;outline:none;" onfocus="this.style.borderColor='${design.primaryColor}'" onblur="this.style.borderColor='#e8e8e8'"/>
      </div>
      <input name="reviewTitle" maxlength="150" placeholder="Review Title *" style="padding:11px 14px;border:1.5px solid #e8e8e8;border-radius:10px;font-size:14px;font-weight:600;font-family:inherit;outline:none;" onfocus="this.style.borderColor='${design.primaryColor}'" onblur="this.style.borderColor='#e8e8e8'"/>
      <textarea name="body" required minlength="10" placeholder="Share details of your experience..." style="padding:11px 14px;border:1.5px solid #e8e8e8;border-radius:10px;font-size:14px;min-height:90px;font-family:inherit;resize:vertical;outline:none;" onfocus="this.style.borderColor='${design.primaryColor}'" onblur="this.style.borderColor='#e8e8e8'"></textarea>
      ${recBox("#faf8ff", "#555")}
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding-top:4px;">
        <label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#888;cursor:pointer;border:1.5px solid #e8e8e8;border-radius:8px;padding:7px 12px;">📷<input type="file" name="photo" accept="image/*" style="display:none;"/><span class="rv-photo-label">Add Photo</span></label>
        <label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#888;cursor:pointer;border:1.5px solid #e8e8e8;border-radius:8px;padding:7px 12px;">📹<input type="file" name="video" accept="video/*" style="display:none;"/><span class="rv-video-label">Add Video</span></label>
        <button type="submit" style="margin-left:auto;padding:11px 24px;background:${primary};color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">Submit Review</button>
      </div>
      <p class="rv-status" style="margin:0;font-size:13px;text-align:center;"></p>
    </form>
  </div>
</div>`; }

      // ── TEMPLATE 3: MINIMAL ───────────────────────────────────────────────
      // Ultra-clean floating card, almost no chrome, large open feel
      if (template === "minimal") { return `
<div style="background:#fff;border-radius:20px;padding:36px 32px;font-family:inherit;position:relative;box-shadow:0 32px 80px rgba(0,0,0,.18);">
  <button class="rv-form-close" style="position:absolute;top:18px;right:20px;background:none;border:none;font-size:22px;color:#ccc;cursor:pointer;line-height:1;transition:color .1s;" onmouseenter="this.style.color='#333'" onmouseleave="this.style.color='#ccc'">×</button>
  <div style="margin-bottom:24px;">
    <h2 style="margin:0 0 4px;font-size:24px;font-weight:800;color:#111;letter-spacing:-.4px;">How was it?</h2>
    <p style="margin:0;font-size:14px;color:#aaa;">Your honest review helps everyone</p>
  </div>
  <div style="display:flex;gap:6px;margin-bottom:6px;">${starRow(36, 4, "#f5b400")}</div>
  <p class="rv-tap-hint" style="margin:0 0 20px;font-size:12px;color:#ccc;letter-spacing:.02em;">Select a rating above</p>
  ${langDropdown}
  <div class="rv-suggestions-wrap" style="display:none;"></div>
  <form class="rv-form" style="display:flex;flex-direction:column;gap:14px;">
    <div style="display:flex;gap:12px;">
      <div style="flex:1;position:relative;">
        <input name="customerName" required placeholder=" " style="width:100%;padding:14px 14px 6px;border:none;border-bottom:2px solid #eee;border-radius:0;font-size:15px;font-family:inherit;outline:none;background:transparent;box-sizing:border-box;transition:border-color .15s;" onfocus="this.style.borderColor='${design.primaryColor}'" onblur="this.style.borderColor='#eee'"/>
        <label style="position:absolute;top:14px;left:14px;font-size:15px;color:#bbb;pointer-events:none;transition:.15s;font-family:inherit;">Name *</label>
      </div>
      <div style="flex:1;position:relative;">
        <input name="customerEmail" type="email" placeholder=" " style="width:100%;padding:14px 14px 6px;border:none;border-bottom:2px solid #eee;border-radius:0;font-size:15px;font-family:inherit;outline:none;background:transparent;box-sizing:border-box;" onfocus="this.style.borderColor='${design.primaryColor}'" onblur="this.style.borderColor='#eee'"/>
        <label style="position:absolute;top:14px;left:14px;font-size:15px;color:#bbb;pointer-events:none;font-family:inherit;">Email (optional)</label>
      </div>
    </div>
    <div style="position:relative;">
      <input name="reviewTitle" maxlength="150" placeholder=" " style="width:100%;padding:14px 14px 6px;border:none;border-bottom:2px solid #eee;border-radius:0;font-size:15px;font-family:inherit;font-weight:600;outline:none;background:transparent;box-sizing:border-box;" onfocus="this.style.borderColor='${design.primaryColor}'" onblur="this.style.borderColor='#eee'"/>
      <label style="position:absolute;top:14px;left:14px;font-size:15px;color:#bbb;pointer-events:none;font-family:inherit;">Review Title (optional)</label>
    </div>
    <textarea name="body" required minlength="10" placeholder="Tell us about your experience…" style="padding:0;border:none;border-bottom:2px solid #eee;border-radius:0;font-size:15px;min-height:80px;font-family:inherit;resize:none;outline:none;background:transparent;line-height:1.6;" onfocus="this.style.borderColor='${design.primaryColor}'" onblur="this.style.borderColor='#eee'"></textarea>
    ${recBox("#f9f9f9", "#555")}
    <div style="display:flex;align-items:center;gap:10px;">
      <label style="font-size:12px;color:#aaa;cursor:pointer;display:flex;align-items:center;gap:4px;">📷<input type="file" name="photo" accept="image/*" style="display:none;"/><span class="rv-photo-label">Add photo</span></label>
      <label style="font-size:12px;color:#aaa;cursor:pointer;display:flex;align-items:center;gap:4px;">🎥<input type="file" name="video" accept="video/*" style="display:none;"/><span class="rv-video-label">Add video</span></label>
      <button type="submit" style="margin-left:auto;padding:14px 28px;background:#111;color:#fff;border:none;border-radius:40px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:.02em;">Submit Review →</button>
    </div>
    <p class="rv-status" style="margin:0;font-size:13px;text-align:center;"></p>
  </form>
</div>`; }

      // ── TEMPLATE 4: DARK ──────────────────────────────────────────────────
      // Rich dark with subtle glow, gold stars, premium feel
      return `
<div style="background:linear-gradient(145deg,#0f0f1a 0%,#1a1a2e 100%);border-radius:16px;padding:30px 28px;font-family:inherit;position:relative;border:1px solid rgba(255,255,255,.08);">
  <button class="rv-form-close" style="position:absolute;top:14px;right:16px;background:rgba(255,255,255,.07);border:none;border-radius:50%;width:28px;height:28px;font-size:16px;cursor:pointer;color:#aaa;display:flex;align-items:center;justify-content:center;">×</button>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,.08);">
    <div style="width:40px;height:40px;border-radius:10px;background:rgba(245,180,0,.15);border:1px solid rgba(245,180,0,.3);display:flex;align-items:center;justify-content:center;font-size:20px;">⭐</div>
    <div>
      <p style="margin:0 0 2px;font-size:18px;font-weight:800;color:#fff;">Write a Review</p>
      <p style="margin:0;font-size:12px;color:rgba(255,255,255,.4);">Your feedback matters to us</p>
    </div>
  </div>
  <div style="margin-bottom:6px;">
    <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.4);">Rate your experience</p>
    <div style="display:flex;gap:6px;">${starRow(30, 2, "#f5b400")}</div>
  </div>
  <p class="rv-tap-hint" style="margin:8px 0 18px;font-size:11px;color:rgba(255,255,255,.3);">Tap a star to continue</p>
  ${langDropdown}
  <div class="rv-suggestions-wrap" style="display:none;"></div>
  <form class="rv-form" style="display:flex;flex-direction:column;gap:10px;">
    <div style="display:flex;gap:10px;">
      <input name="customerName" required placeholder="Your Name *" style="flex:1;padding:11px 14px;border:1px solid rgba(255,255,255,.12);border-radius:8px;font-size:14px;font-family:inherit;background:rgba(255,255,255,.05);color:#fff;outline:none;" onfocus="this.style.borderColor='rgba(245,180,0,.5)'" onblur="this.style.borderColor='rgba(255,255,255,.12)'"/>
      <input name="customerEmail" type="email" placeholder="Email (Optional)" style="flex:1;padding:11px 14px;border:1px solid rgba(255,255,255,.12);border-radius:8px;font-size:14px;font-family:inherit;background:rgba(255,255,255,.05);color:#fff;outline:none;" onfocus="this.style.borderColor='rgba(245,180,0,.5)'" onblur="this.style.borderColor='rgba(255,255,255,.12)'"/>
    </div>
    <textarea name="body" required minlength="10" placeholder="Tell us about your experience…" style="padding:11px 14px;border:1px solid rgba(255,255,255,.12);border-radius:8px;font-size:14px;min-height:90px;font-family:inherit;resize:vertical;background:rgba(255,255,255,.05);color:#fff;outline:none;" onfocus="this.style.borderColor='rgba(245,180,0,.5)'" onblur="this.style.borderColor='rgba(255,255,255,.12)'"></textarea>
    <label style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;cursor:pointer;font-size:13px;color:rgba(255,255,255,.75);">
      <input type="checkbox" name="recommends" style="width:16px;height:16px;accent-color:#f5b400;cursor:pointer;flex-shrink:0;"/>
      👍 I would recommend this product
    </label>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:rgba(255,255,255,.45);cursor:pointer;">📷<input type="file" name="photo" accept="image/*" style="display:none;"/><span class="rv-photo-label">Photo</span></label>
      <label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:rgba(255,255,255,.45);cursor:pointer;">🎥<input type="file" name="video" accept="video/*" style="display:none;"/><span class="rv-video-label">Video</span></label>
      <button type="submit" style="margin-left:auto;padding:11px 22px;background:linear-gradient(135deg,#f5b400 0%,#f59e0b 100%);color:#1a1a2e;border:none;border-radius:8px;font-size:14px;font-weight:800;cursor:pointer;letter-spacing:.01em;">Submit Review</button>
    </div>
    <p class="rv-status" style="margin:0;font-size:13px;text-align:center;color:rgba(255,255,255,.5);"></p>
  </form>
</div>`;
    }


    // ─── RENDER ───────────────────────────────────────────────────
    const borderStr = design.showBorder
      ? `border:${design.borderWidth}px ${design.borderStyle} ${design.borderColor};border-radius:${r}px;padding:24px;`
      : "";

    el.innerHTML = `
<div class="rv-root" style="font-family:${design.fontFamily};max-width:${design.widgetMaxWidth}px;width:100%;margin-top:${design.topSpacing}px;margin-left:${design.formAlign==="left"?"0":"auto"};margin-right:${design.formAlign==="right"?"0":"auto"};color:${design.textColor};${borderStr}">
  <p style="font-size:${design.headingFontSize}px;font-weight:${design.headingBold?700:400};letter-spacing:.06em;text-transform:uppercase;opacity:.6;margin:0 0 20px;text-align:${design.headingAlign};">${design.widgetTitle}</p>
  <div class="rv-main-content">${buildMain()}</div>
</div>

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

    // Sort
    const sortEl = el.querySelector(".rv-sort");
    if (sortEl) {
      sortEl.addEventListener("change", () => {
        sortOrder = sortEl.value;
        shownCount = REVIEWS_PER_PAGE;
        el.querySelector(".rv-main-content").innerHTML = buildMain();
        rewireMain();
      });
    }

    // Load more
    function rewireMain() {
      const sortEl2 = el.querySelector(".rv-sort");
      if (sortEl2) sortEl2.addEventListener("change", () => { sortOrder = sortEl2.value; shownCount = REVIEWS_PER_PAGE; el.querySelector(".rv-main-content").innerHTML = buildMain(); rewireMain(); });
      const loadMore = el.querySelector(".rv-load-more");
      if (loadMore) loadMore.addEventListener("click", () => { shownCount += REVIEWS_PER_PAGE; el.querySelector(".rv-main-content").innerHTML = buildMain(); rewireMain(); });
      el.querySelectorAll(".rv-media-thumb").forEach(t => { t.addEventListener("click", () => lightbox.open(t.dataset.mediaUrl, t.dataset.mediaType)); });
      el.querySelectorAll(".rv-read-more").forEach(btn => { btn.addEventListener("click", () => { const tgt = el.querySelector(`#${btn.dataset.target}`); if (tgt) { tgt.style.maxHeight="none"; tgt.style.overflow="visible"; btn.style.display="none"; } }); });
      const openBtns = el.querySelectorAll(".rv-open-form-btn");
      openBtns.forEach(b => b.addEventListener("click", openModal));
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
    const starButtons = [...formContainer.querySelectorAll(".rv-star")];
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

    function paintStars() {
      starButtons.forEach(b => { b.style.color = Number(b.dataset.star) <= selectedRating ? starColor : "#ddd"; });
      if (tapHint && selectedRating) tapHint.style.display = "none";
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
          const res = await fetch(`${API_BASE}/api/reviews/suggestions?rating=${selectedRating}&productTitle=${encodeURIComponent(productTitle)}&shop=${encodeURIComponent(shop)}&lang=${selectedLang}`);
          const data = await res.json();
          sPool = data.suggestions || [];
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
  <div style="display:flex;flex-direction:column;gap:5px;">${batch.map(s => `<button type="button" class="rv-sug" style="text-align:left;padding:7px 10px;border:1px solid #e5e5e5;border-radius:6px;background:#fafafa;font-size:12px;cursor:pointer;color:#333;">${s}</button>`).join("")}</div>
</div>`;
      suggestionsWrap.querySelector(".rv-refresh").addEventListener("click", loadSuggestions);
      suggestionsWrap.querySelector(".rv-close-sug").addEventListener("click", () => { suggestionsWrap.style.display="none"; });
      suggestionsWrap.querySelectorAll(".rv-sug").forEach(b => {
        b.addEventListener("click", () => {
          if (bodyTA) bodyTA.value = b.textContent;
          suggestionsWrap.querySelectorAll(".rv-sug").forEach(x => { x.style.borderColor="#e5e5e5"; x.style.background="#fafafa"; });
          b.style.borderColor = design.primaryColor; b.style.background = "#fff";
        });
      });
    }

    starButtons.forEach(btn => {
      btn.addEventListener("click", async () => {
        selectedRating = Number(btn.dataset.star); paintStars();
        if (design.showSuggestionsOnWebsite) await loadSuggestions();
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
    document.querySelectorAll(".rivu-review-widget").forEach(el => {
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
