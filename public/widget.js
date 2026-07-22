/**
 * Review Widget — premium design with avatar-initial circles, review
 * titles, "Read more" truncation, and an elegant serif big-rating number
 * (inspired by top review apps like Judge.me/Okendo). Supports list,
 * grid, and carousel layouts, plus full color/font customization set by
 * the merchant in the app dashboard.
 *
 * <div id="review-widget"
 *      data-shop="{{ shop.permanent_domain }}"
 *      data-product-id="{{ product.id }}"
 *      data-product-title="{{ product.title | escape }}"
 *      data-product-image="{{ product.featured_image | image_url: width: 800 }}">
 * </div>
 * <script src="https://YOUR-APP-DOMAIN.vercel.app/widget.js" async></script>
 */
(function () {
  const API_BASE = document.currentScript?.src
    ? new URL(document.currentScript.src).origin
    : "";

  // Global styles injected once per page (not per widget instance):
  // hides native scrollbars on carousels (our own arrow buttons are the
  // intended navigation), plus a subtle serif font stack for the big
  // rating number to match a premium review-app look.
  if (!document.getElementById("rv-global-styles")) {
    const styleTag = document.createElement("style");
    styleTag.id = "rv-global-styles";
    styleTag.textContent = `
      .rv-list::-webkit-scrollbar { display: none; }
      .rv-list { scrollbar-width: none; -ms-overflow-style: none; }
      .rv-big-rating { font-family: Georgia, 'Times New Roman', serif; }
      .rv-avatar { font-family: Georgia, 'Times New Roman', serif; }
      .rv-card { transition: box-shadow 0.15s, transform 0.15s; }
      .rv-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); transform: translateY(-2px); }
      .rv-media-thumb { transition: opacity 0.15s; }
      .rv-media-thumb:hover { opacity: 0.85; }
    `;
    document.head.appendChild(styleTag);
  }

  // Deterministic avatar background color from the reviewer's name, so
  // the same person always gets the same color (not random per render).
  const AVATAR_PALETTE = ["#7c3aed", "#0891b2", "#dc2626", "#ea580c", "#16a34a", "#2563eb", "#c026d3", "#0d9488"];
  function avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
  }
  function initials(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return "";
    }
  }

  async function render(el) {
    const { shop, productId, productTitle, productImage } = el.dataset;

    el.innerHTML = `<p style="font-size:14px;color:#888;">Loading reviews...</p>`;

    let reviews = [];
    let summary = { total: 0, average: 0, breakdown: [] };
    const DEFAULT_DESIGN = {
      displayStyle: "list",
      splitSummary: false,
      gridColumns: 3,
      carouselVisible: 1,
      arrowColor: "#111111",
      primaryColor: "#111111",
      starColor: "#f5b400",
      rangeColor: "#f5b400",
      backgroundColor: "#ffffff",
      textColor: "#333333",
      borderRadius: 8,
      fontFamily: "inherit",
      reviewTextSize: 14,
      reviewTextAlign: "left",
      formAlign: "left",
      formMaxWidth: 420,
      widgetMaxWidth: 480,
      widgetTitle: "Customer Reviews",
      headingFontSize: 11,
      headingBold: false,
      headingAlign: "left",
      topSpacing: 24,
      showBorder: true,
      borderColor: "#e0e0e0",
      borderWidth: 1,
      borderStyle: "solid",
      backgroundGradient: null,
      primaryGradient: null,
      letCustomerPickLanguage: false,
      showSuggestionsOnWebsite: true,
    };
    let design = { ...DEFAULT_DESIGN };
    let plan = "free";

    try {
      const res = await fetch(
        `${API_BASE}/api/reviews/list?shop=${encodeURIComponent(shop)}&productId=${encodeURIComponent(productId)}`
      );
      if (res.ok) {
        const data = await res.json();
        reviews = data.reviews || [];
        summary = data.summary || summary;
        plan = data.plan || "free";
        // Merge fetched design over defaults, but only fall back for
        // truly missing values (undefined/null/empty string) — NOT for
        // legitimate falsy values like `false` or `0`, which a naive
        // `fetched[key] || default` would incorrectly override.
        const fetched = data.design || {};
        for (const key in DEFAULT_DESIGN) {
          const val = fetched[key];
          design[key] = val === undefined || val === null || val === "" ? DEFAULT_DESIGN[key] : val;
        }
      }
    } catch {
      // Fall back to defaults + empty state below.
    }

    const r = design.borderRadius;
    const cardBackground = design.backgroundGradient || design.backgroundColor;
    const buttonBackground = design.primaryGradient || design.primaryColor;
    const cardStyle = `background:${cardBackground};color:${design.textColor};border-radius:${r}px;padding:18px;font-size:13px;box-shadow:0 1px 4px rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.04);`;

    function reviewCard(rev) {
      const cardTextAlign = design.reviewTextAlign === "center" ? "center" : design.reviewTextAlign === "right" ? "right" : "left";
      const carouselStyle = design.displayStyle === "carousel"
        ? `min-width:${carouselCardWidth};flex-shrink:0;`
        : design.displayStyle === "masonry"
        ? masonryCardStyle
        : "";
      const badge = rev.isTopReviewer
        ? `<span style="display:inline-block;margin-left:6px;padding:1px 6px;background:${design.primaryColor};color:#fff;border-radius:10px;font-size:9px;vertical-align:middle;white-space:nowrap;">⭐ Top Reviewer</span>`
        : "";
      const starJustify = cardTextAlign === "center" ? "center" : cardTextAlign === "right" ? "flex-end" : "flex-start";
      const headerJustify = cardTextAlign === "center" ? "center" : "flex-start";

      // "Read more" truncation for long review bodies — CSS-only clamp
      // plus a JS toggle button. Kept simple: a max-height + fade, click
      // to expand (no external libraries).
      const isLong = rev.body.length > 220;
      const bodyId = `rv-body-${rev.id}`;

      return `
        <div class="rv-card" style="${cardStyle}${carouselStyle}">
          <div style="display:flex;align-items:center;justify-content:${headerJustify};gap:10px;margin-bottom:10px;">
            <div class="rv-avatar" style="width:34px;height:34px;border-radius:50%;background:${avatarColor(rev.customerName)};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0;">${initials(rev.customerName)}</div>
            <div style="text-align:${cardTextAlign};">
              <p style="margin:0;font-size:13px;font-weight:600;">${rev.customerName}${badge}</p>
              <p style="margin:0;font-size:11px;opacity:0.5;">${formatDate(rev.createdAt)}</p>
            </div>
          </div>
          <div style="display:flex;justify-content:${starJustify};color:${design.starColor};margin-bottom:8px;font-size:13px;">${"★".repeat(rev.rating)}${"☆".repeat(5 - rev.rating)}</div>
          ${rev.reviewTitle ? `<p style="margin:0 0 6px;font-size:14px;font-weight:600;font-style:italic;text-align:${cardTextAlign};">${rev.reviewTitle}</p>` : ""}
          <p id="${bodyId}" class="rv-body-text" data-full="${rev.body.replace(/"/g, "&quot;")}" style="margin:0 0 6px;line-height:1.55;font-size:${design.reviewTextSize}px;text-align:${cardTextAlign};${isLong ? "max-height:4.7em;overflow:hidden;position:relative;" : ""}">${rev.body}</p>
          ${isLong ? `<button type="button" class="rv-read-more" data-target="${bodyId}" style="background:none;border:none;padding:0;margin:0 0 8px;font-size:12px;font-weight:600;color:${design.primaryColor};cursor:pointer;text-align:${cardTextAlign};display:block;">Read more</button>` : ""}
          ${rev.videoUrl ? `<div class="rv-media-thumb" data-media-url="${rev.videoUrl}" data-media-type="video" style="width:90px;height:90px;border-radius:${Math.max(r - 2, 0)}px;margin:6px 0 0;cursor:pointer;position:relative;overflow:hidden;background:#000;">
              <video src="${rev.videoUrl}" style="width:100%;height:100%;object-fit:cover;pointer-events:none;"></video>
              <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.25);">
                <span style="color:#fff;font-size:22px;">▶</span>
              </div>
            </div>` : ""}
          ${!rev.videoUrl && rev.photoUrl ? `<img class="rv-media-thumb" data-media-url="${rev.photoUrl}" data-media-type="image" src="${rev.photoUrl}" style="width:90px;height:90px;object-fit:cover;border-radius:${Math.max(r - 2, 0)}px;margin:6px 0 0;cursor:pointer;" />` : ""}
        </div>`;
    }

    let listWrapperStyle = "display:flex;flex-direction:column;gap:14px;";
    let carouselCardWidth = null;
    let masonryCardStyle = "";
    const carouselNeedsScroll = reviews.length > design.carouselVisible;
    if (design.displayStyle === "grid") {
      listWrapperStyle = `display:grid;grid-template-columns:repeat(${design.gridColumns},1fr);gap:14px;`;
    } else if (design.displayStyle === "carousel") {
      listWrapperStyle = `display:flex;gap:14px;${carouselNeedsScroll ? "overflow-x:auto;" : "overflow:visible;"}scroll-behavior:smooth;padding-bottom:4px;`;
      carouselCardWidth = `calc(${100 / design.carouselVisible}% - ${(14 * (design.carouselVisible - 1)) / design.carouselVisible}px)`;
    } else if (design.displayStyle === "masonry") {
      // True masonry (variable card heights packed tightly, Pinterest-
      // style) needs either JS layout or native CSS masonry (not yet
      // widely supported). CSS multi-column layout gives a very close
      // visual approximation with zero JS: cards flow down each column
      // and wrap, so cards of different heights don't leave big gaps.
      listWrapperStyle = `column-count:${design.gridColumns};column-gap:14px;`;
      masonryCardStyle = "break-inside:avoid;margin-bottom:14px;display:inline-block;width:100%;";
    }
    if (design.splitSummary) {
      listWrapperStyle += "max-height:560px;overflow-y:auto;";
    }

    const breakdownHtml = summary.total
      ? summary.breakdown
          .map((b) => {
            // Explicit Number() + fallback to 0 — defends against any
            // unexpected non-numeric value silently making the whole
            // inline `width:` declaration invalid (which browsers just
            // drop, leaving the bar looking uncolored/empty regardless
            // of the real percentage).
            const pct = Number(b.percentage) || 0;
            return `
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;margin:4px 0;">
          <span style="width:34px;color:${design.textColor};opacity:0.65;">${b.star}★</span>
          <div style="flex:1;height:6px;background:rgba(0,0,0,0.08);border-radius:3px;overflow:hidden;">
            <div style="display:block;width:${pct}%;height:100%;background-color:${design.rangeColor};border-radius:3px;"></div>
          </div>
          <span style="width:32px;text-align:right;color:${design.textColor};opacity:0.65;">${pct}%</span>
        </div>`;
          })
          .join("")
      : "";

    const rootTextAlign = design.formAlign === "center" ? "center" : design.formAlign === "right" ? "right" : "left";
    const summaryJustify = design.formAlign === "center" ? "center" : design.formAlign === "right" ? "flex-end" : "flex-start";

    const summaryHtml = summary.total
      ? `
      <div style="display:flex;align-items:center;justify-content:${summaryJustify};gap:24px;margin-bottom:22px;flex-wrap:wrap;">
        <div style="text-align:center;">
          <div class="rv-big-rating" style="font-size:44px;font-weight:700;color:${design.textColor};line-height:1;">${summary.average}</div>
          <div style="color:${design.starColor};font-size:14px;margin-top:4px;">${"★".repeat(Math.round(summary.average))}${"☆".repeat(5 - Math.round(summary.average))}</div>
          <div style="font-size:12px;color:${design.textColor};opacity:0.55;margin-top:4px;">${summary.total} review${summary.total === 1 ? "" : "s"}</div>
        </div>
        <div style="flex:1;min-width:180px;max-width:300px;">${breakdownHtml}</div>
      </div>`
      : "";

    const reviewsHtml = reviews.length
      ? reviews.map(reviewCard).join("")
      : `<p style="font-size:14px;color:${design.textColor};opacity:0.55;text-align:${rootTextAlign};">No reviews yet — be the first!</p>`;

    const formMargin =
      design.formAlign === "center"
        ? "18px auto 0"
        : design.formAlign === "right"
        ? "18px 0 0 auto"
        : "18px 0 0 0";
    const formTextAlign = design.formAlign === "center" ? "center" : "left";

    const carouselArrows =
      design.displayStyle === "carousel" && reviews.length > design.carouselVisible
        ? `
      <button class="rv-arrow rv-arrow-prev" style="position:absolute;left:-4px;top:50%;transform:translateY(-50%);background:#fff;border:1px solid #ddd;border-radius:50%;width:32px;height:32px;cursor:pointer;color:${design.arrowColor};font-size:16px;box-shadow:0 1px 4px rgba(0,0,0,0.1);z-index:1;">‹</button>
      <button class="rv-arrow rv-arrow-next" style="position:absolute;right:-4px;top:50%;transform:translateY(-50%);background:#fff;border:1px solid #ddd;border-radius:50%;width:32px;height:32px;cursor:pointer;color:${design.arrowColor};font-size:16px;box-shadow:0 1px 4px rgba(0,0,0,0.1);z-index:1;">›</button>`
        : "";
    const listOuterStyle = design.displayStyle === "carousel" ? "position:relative;padding:0 20px;" : "";

    const bodyHtml = design.splitSummary
      ? `
        <div style="display:flex;gap:32px;flex-wrap:wrap;align-items:flex-start;">
          <div style="flex:0 0 220px;position:sticky;top:16px;">${summaryHtml}</div>
          <div style="flex:1;min-width:240px;position:relative;">
            ${design.displayStyle === "carousel" ? carouselArrows : ""}
            <div class="rv-list" style="${listWrapperStyle}">${reviewsHtml}</div>
          </div>
        </div>`
      : `
        ${summaryHtml}
        <div style="${listOuterStyle}">
          ${carouselArrows}
          <div class="rv-list" style="${listWrapperStyle}">${reviewsHtml}</div>
        </div>`;

    const headingAlignValue = design.headingAlign === "center" ? "center" : design.headingAlign === "right" ? "right" : "left";
    const borderStyle = design.showBorder
      ? `border:${design.borderWidth}px ${design.borderStyle} ${design.borderColor};border-radius:${r}px;padding:20px;`
      : "";

    // "Powered by Rivu" — shown only on the Free plan (removed on paid
    // plans as a perk). Uses window.open so the click doesn't accidentally
    // navigate the shopper away from the product page in the same tab.
    const brandingHtml =
      plan === "free"
        ? `<p style="margin-top:14px;font-size:10px;opacity:0.4;text-align:${rootTextAlign};">
             Powered by <a href="https://rivu-one.vercel.app" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">Rivu</a>
           </p>`
        : "";

    // Lets shoppers choose which language they want to write their review
    // in — only shown if the merchant enabled it (paid-plan feature) and
    // there's more than just English available to pick from.
    const languageDropdownHtml = design.letCustomerPickLanguage
      ? `<select class="rv-lang-picker" style="margin-bottom:12px;padding:8px 10px;border:1px solid #ddd;border-radius:${Math.max(r - 2, 4)}px;font-size:12px;font-family:inherit;"></select>`
      : "";

    el.innerHTML = `
      <div class="rv-root" style="font-family:${design.fontFamily};max-width:${design.widgetMaxWidth}px;width:100%;margin-top:${design.topSpacing}px;margin-left:${design.formAlign === "left" ? "0" : "auto"};margin-right:${design.formAlign === "right" ? "0" : "auto"};color:${design.textColor};text-align:${rootTextAlign};${borderStyle}">
        <p style="font-size:${design.headingFontSize}px;font-weight:${design.headingBold ? 700 : 400};letter-spacing:0.06em;text-transform:uppercase;opacity:0.6;margin:0 0 6px;text-align:${headingAlignValue};">${design.widgetTitle}</p>
        ${bodyHtml}
        ${brandingHtml}

        <button class="rv-toggle" style="margin-top:20px;padding:11px 22px;background:${buttonBackground};color:#fff;border:none;border-radius:${r}px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.15);">
          Write a Review
        </button>

        <div class="rv-lightbox-backdrop" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;align-items:center;justify-content:center;padding:24px;">
          <button class="rv-lightbox-close" style="position:absolute;top:20px;right:20px;background:none;border:none;font-size:28px;line-height:1;cursor:pointer;color:#fff;padding:4px;">✕</button>
          <div class="rv-lightbox-content" style="max-width:90vw;max-height:85vh;"></div>
        </div>

        <div class="rv-modal-backdrop" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;align-items:center;justify-content:center;padding:20px;">
          <div class="rv-form-wrap" style="position:relative;width:100%;max-width:${design.formMaxWidth}px;max-height:90vh;overflow-y:auto;padding:28px;background:${design.backgroundColor};border-radius:${r}px;text-align:${formTextAlign};box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <button class="rv-form-close" style="position:absolute;top:14px;right:14px;background:none;border:none;font-size:20px;line-height:1;cursor:pointer;color:#999;padding:4px;">✕</button>
            <p style="margin:0 0 4px;font-size:19px;font-weight:700;text-align:center;font-family:Georgia,serif;">Write a Review</p>
            <p style="margin:0 0 4px;font-size:12px;opacity:0.5;text-align:center;">Share your honest experience</p>
            ${languageDropdownHtml ? `<div style="text-align:center;margin-top:10px;">${languageDropdownHtml}</div>` : ""}
            <div class="rv-stars" style="display:flex;gap:8px;justify-content:center;margin:16px 0 6px;">
              ${[1, 2, 3, 4, 5]
                .map(
                  (n) =>
                    `<button type="button" class="rv-star" data-star="${n}" style="background:none;border:none;padding:0;cursor:pointer;font-size:36px;line-height:1;color:#d9d9d9;transition:color 0.15s;">★</button>`
                )
                .join("")}
            </div>
            <p class="rv-tap-hint" style="margin:0 0 16px;font-size:11px;opacity:0.45;text-align:center;">Tap a star to rate</p>

          <div class="rv-suggestions-wrap" style="display:none;text-align:left;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <p style="margin:0;font-size:13px;font-weight:600;opacity:0.7;">Pick a suggestion or write your own</p>
              <div style="display:flex;gap:12px;">
                <button type="button" class="rv-refresh" style="background:none;border:none;font-size:12px;color:${design.primaryColor};cursor:pointer;padding:0;">🔄 Refresh</button>
                <button type="button" class="rv-close-suggestions" style="background:none;border:none;font-size:12px;color:#999;cursor:pointer;padding:0;">✕ Close</button>
              </div>
            </div>
            <div class="rv-suggestions" style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;"></div>
          </div>

          <form class="rv-form" style="display:flex;flex-direction:column;gap:12px;text-align:left;">
            <div style="display:flex;gap:10px;">
              <input type="text" name="customerName" required placeholder="Your Name *"
                     style="flex:1;padding:12px;border:1px solid #ddd;border-radius:${Math.max(r - 2, 4)}px;font-size:14px;font-family:inherit;" />
              <input type="email" name="customerEmail" placeholder="Email (Optional)"
                     style="flex:1;padding:12px;border:1px solid #ddd;border-radius:${Math.max(r - 2, 4)}px;font-size:14px;font-family:inherit;" />
            </div>
            <input type="text" name="reviewTitle" maxlength="150" placeholder="Review Title *"
                   style="padding:12px;border:1px solid #ddd;border-radius:${Math.max(r - 2, 4)}px;font-size:14px;font-family:inherit;font-weight:600;" />
            <textarea name="body" required minlength="10" placeholder="What did you like or dislike? How has this worked for you?"
                      style="padding:12px;border:1px solid #ddd;border-radius:${Math.max(r - 2, 4)}px;font-size:14px;min-height:100px;font-family:inherit;resize:vertical;"></textarea>

            <div>
              <label style="font-size:12px;opacity:0.6;display:block;margin-bottom:6px;">Add a photo (optional)</label>
              <label class="rv-photo-btn" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid #ddd;border-radius:${Math.max(r - 2, 4)}px;font-size:13px;cursor:pointer;color:#555;">
                📷 <span class="rv-photo-label">Choose a photo</span>
                <input type="file" name="photo" accept="image/*" style="display:none;" />
              </label>
              <img class="rv-photo-preview" style="display:none;max-width:90px;border-radius:6px;margin-top:8px;" />
            </div>

            <div>
              <label style="font-size:12px;opacity:0.6;display:block;margin-bottom:6px;">Or add a short video (optional)</label>
              <label class="rv-video-btn" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid #ddd;border-radius:${Math.max(r - 2, 4)}px;font-size:13px;cursor:pointer;color:#555;">
                🎥 <span class="rv-video-label">Choose a video</span>
                <input type="file" name="video" accept="video/*" style="display:none;" />
              </label>
              <p style="margin:4px 0 0;font-size:11px;opacity:0.5;">Keep it short (under ~15 seconds).</p>
              <video class="rv-video-preview" controls style="display:none;max-width:160px;border-radius:6px;margin-top:8px;"></video>
            </div>

            <button type="submit" style="margin-top:6px;padding:13px 18px;background:${buttonBackground};color:#fff;border:none;border-radius:${Math.max(r - 2, 4)}px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.15);">
              Submit Review
            </button>
            <p class="rv-status" style="margin:0;font-size:13px;text-align:center;"></p>
          </form>
          </div>
        </div>
      </div>
    `;

    // "Read more" toggles — simple expand-in-place.
    el.querySelectorAll(".rv-read-more").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = el.querySelector(`#${btn.dataset.target}`);
        if (!target) return;
        target.style.maxHeight = "none";
        target.style.overflow = "visible";
        btn.style.display = "none";
      });
    });

    // Media lightbox — click a photo/video thumbnail to see it full-size
    // in a dark overlay (Fancybox-style), instead of the media taking up
    // a huge amount of space inline in every review card.
    const lightboxBackdrop = el.querySelector(".rv-lightbox-backdrop");
    const lightboxContent = el.querySelector(".rv-lightbox-content");
    const lightboxClose = el.querySelector(".rv-lightbox-close");

    function openLightbox(url, type) {
      lightboxContent.innerHTML =
        type === "video"
          ? `<video src="${url}" controls autoplay style="max-width:90vw;max-height:85vh;border-radius:8px;"></video>`
          : `<img src="${url}" style="max-width:90vw;max-height:85vh;border-radius:8px;" />`;
      lightboxBackdrop.style.display = "flex";
    }
    function closeLightbox() {
      lightboxBackdrop.style.display = "none";
      lightboxContent.innerHTML = "";
    }

    el.querySelectorAll(".rv-media-thumb").forEach((thumb) => {
      thumb.addEventListener("click", () => {
        openLightbox(thumb.dataset.mediaUrl, thumb.dataset.mediaType);
      });
    });
    lightboxClose.addEventListener("click", closeLightbox);
    lightboxBackdrop.addEventListener("click", (e) => {
      if (e.target === lightboxBackdrop) closeLightbox();
    });

    const rvList = el.querySelector(".rv-list");
    const prevArrow = el.querySelector(".rv-arrow-prev");
    const nextArrow = el.querySelector(".rv-arrow-next");
    if (prevArrow && nextArrow && rvList) {
      const scrollAmount = () => rvList.clientWidth / design.carouselVisible + 14;
      prevArrow.addEventListener("click", () => rvList.scrollBy({ left: -scrollAmount(), behavior: "smooth" }));
      nextArrow.addEventListener("click", () => rvList.scrollBy({ left: scrollAmount(), behavior: "smooth" }));
    }

    const toggle = el.querySelector(".rv-toggle");
    const backdrop = el.querySelector(".rv-modal-backdrop");
    const formWrap = el.querySelector(".rv-form-wrap");
    const formClose = el.querySelector(".rv-form-close");
    const form = el.querySelector(".rv-form");
    const status = el.querySelector(".rv-status");
    const starButtons = [...el.querySelectorAll(".rv-star")];
    const tapHint = el.querySelector(".rv-tap-hint");
    const suggestionsWrap = el.querySelector(".rv-suggestions-wrap");
    const langPicker = el.querySelector(".rv-lang-picker");
    const suggestionsBox = el.querySelector(".rv-suggestions");
    const refreshBtn = el.querySelector(".rv-refresh");
    const closeSuggestionsBtn = el.querySelector(".rv-close-suggestions");
    const bodyTextarea = form.querySelector('[name="body"]');
    const photoInput = form.querySelector('[name="photo"]');
    const photoLabel = el.querySelector(".rv-photo-label");
    const photoPreview = el.querySelector(".rv-photo-preview");
    const videoInput = form.querySelector('[name="video"]');
    const videoLabel = el.querySelector(".rv-video-label");
    const videoPreview = el.querySelector(".rv-video-preview");

    let selectedRating = 0;
    let photoDataUrl;
    let videoDataUrl;

    function openModal() {
      backdrop.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
    function closeModal() {
      backdrop.style.display = "none";
      document.body.style.overflow = "";
    }

    toggle.addEventListener("click", openModal);
    formClose.addEventListener("click", closeModal);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });

    function paintStars() {
      starButtons.forEach((btn) => {
        const n = Number(btn.dataset.star);
        btn.style.color = n <= selectedRating ? design.starColor : "#d9d9d9";
      });
      if (tapHint) tapHint.style.display = "none";
    }

    async function loadSuggestions() {
      const lang = langPicker ? langPicker.value : "";
      suggestionsBox.innerHTML = `<p style="font-size:12px;opacity:0.5;margin:0;">Loading...</p>`;
      try {
        const res = await fetch(
          `${API_BASE}/api/reviews/suggestions?rating=${selectedRating}&productTitle=${encodeURIComponent(productTitle)}&shop=${encodeURIComponent(shop)}${lang ? `&lang=${lang}` : ""}`
        );
        const data = await res.json();
        const suggestions = data.suggestions || [];
        suggestionsBox.innerHTML = suggestions
          .map(
            (s) =>
              `<button type="button" class="rv-suggestion" style="text-align:left;padding:9px 11px;border:1px solid #e5e5e5;border-radius:6px;background:#fafafa;font-size:12px;cursor:pointer;color:#333;">${s}</button>`
          )
          .join("");
        suggestionsBox.querySelectorAll(".rv-suggestion").forEach((btn) => {
          btn.addEventListener("click", () => {
            bodyTextarea.value = btn.textContent;
            suggestionsBox.querySelectorAll(".rv-suggestion").forEach((b) => {
              b.style.borderColor = "#e5e5e5";
              b.style.background = "#fafafa";
            });
            btn.style.borderColor = design.primaryColor;
            btn.style.background = "#fff";
          });
        });
      } catch {
        suggestionsBox.innerHTML = "";
      }
    }

    if (langPicker) {
      const LANGS = [
        { code: "en", label: "English" },
        { code: "hi", label: "हिन्दी" },
        { code: "es", label: "Español" },
        { code: "fr", label: "Français" },
        { code: "de", label: "Deutsch" },
        { code: "pt", label: "Português" },
        { code: "ar", label: "العربية" },
        { code: "zh", label: "中文" },
        { code: "ja", label: "日本語" },
        { code: "id", label: "Bahasa Indonesia" },
      ];
      langPicker.innerHTML = LANGS.map((l) => `<option value="${l.code}">${l.label}</option>`).join("");
      langPicker.addEventListener("change", () => {
        if (selectedRating) loadSuggestions();
      });
    }

    starButtons.forEach((btn) => {
      btn.addEventListener("click", async () => {
        selectedRating = Number(btn.dataset.star);
        paintStars();
        if (design.showSuggestionsOnWebsite) {
          suggestionsWrap.style.display = "block";
          bodyTextarea.value = "";
          await loadSuggestions();
        }
      });
    });

    refreshBtn.addEventListener("click", loadSuggestions);

    closeSuggestionsBtn.addEventListener("click", () => {
      suggestionsWrap.style.display = "none";
      bodyTextarea.focus();
    });

    photoInput.addEventListener("change", () => {
      const file = photoInput.files?.[0];
      if (!file) return;
      photoLabel.textContent = file.name.length > 20 ? file.name.slice(0, 18) + "..." : file.name;
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxDim = 1000;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          photoDataUrl = canvas.toDataURL("image/jpeg", 0.8);
          photoPreview.src = photoDataUrl;
          photoPreview.style.display = "block";
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

    videoInput.addEventListener("change", () => {
      const file = videoInput.files?.[0];
      if (!file) return;
      if (file.size > 8 * 1024 * 1024) {
        alert("That video is a bit large — please choose one under ~8MB, or a shorter clip.");
        videoInput.value = "";
        return;
      }
      videoLabel.textContent = file.name.length > 20 ? file.name.slice(0, 18) + "..." : file.name;
      const reader = new FileReader();
      reader.onload = () => {
        videoDataUrl = reader.result;
        videoPreview.src = videoDataUrl;
        videoPreview.style.display = "block";
      };
      reader.readAsDataURL(file);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!selectedRating) {
        status.textContent = "Please select a star rating.";
        status.style.color = "#c0392b";
        return;
      }
      const customerName = form.customerName.value;
      const customerEmail = form.customerEmail.value;
      const reviewTitle = form.reviewTitle.value;
      const bodyText = form.body.value;

      status.textContent = "Submitting...";
      status.style.color = "#666";

      try {
        const res = await fetch(`${API_BASE}/api/reviews/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shop,
            productId,
            productTitle,
            productImageUrl: productImage || undefined,
            rating: selectedRating,
            reviewTitle,
            body: bodyText,
            customerName,
            customerEmail,
            photoUrl: photoDataUrl,
            videoUrl: videoDataUrl,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          status.textContent = data.discountCode
            ? `Thanks! Here's a thank-you discount code: ${data.discountCode}`
            : "Thanks! Your review is pending approval.";
          status.style.color = "#1e7e34";
          status.style.fontWeight = data.discountCode ? "600" : "normal";
          form.reset();
          setTimeout(() => {
            closeModal();
          }, 2500);
        } else {
          status.textContent = data.error || "Something went wrong.";
          status.style.color = "#c0392b";
        }
      } catch {
        status.textContent = "Network error, please try again.";
        status.style.color = "#c0392b";
      }
    });
  }

  document.querySelectorAll("#review-widget").forEach(render);
})();
