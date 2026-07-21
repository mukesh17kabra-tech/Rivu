/**
 * Review Widget — supports list, grid, and carousel layouts, plus full
 * color/font customization set by the merchant in the app dashboard
 * (/dashboard/design). Add this to your product template:
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

  async function render(el) {
    const { shop, productId, productTitle, productImage } = el.dataset;

    el.innerHTML = `<p style="font-size:14px;color:#888;">Loading reviews...</p>`;

    let reviews = [];
    let summary = { total: 0, average: 0, breakdown: [] };
    let design = {
      displayStyle: "list",
      gridColumns: 3,
      carouselVisible: 1,
      arrowColor: "#111111",
      primaryColor: "#111111",
      starColor: "#f5b400",
      backgroundColor: "#ffffff",
      textColor: "#333333",
      borderRadius: 8,
      fontFamily: "inherit",
      formAlign: "left",
      formMaxWidth: 420,
      showSuggestionsOnWebsite: true,
    };

    try {
      const res = await fetch(
        `${API_BASE}/api/reviews/list?shop=${encodeURIComponent(shop)}&productId=${encodeURIComponent(productId)}`
      );
      if (res.ok) {
        const data = await res.json();
        reviews = data.reviews || [];
        summary = data.summary || summary;
        design = { ...design, ...(data.design || {}) };
      }
    } catch {
      // Fall back to defaults + empty state below.
    }

    const r = design.borderRadius;
    const cardStyle = `background:${design.backgroundColor};color:${design.textColor};border-radius:${r}px;padding:14px;font-size:13px;box-shadow:0 1px 3px rgba(0,0,0,0.06);`;

    function reviewCard(rev) {
      const carouselStyle = design.displayStyle === "carousel"
        ? `min-width:${carouselCardWidth};flex-shrink:0;`
        : "";
      return `
        <div class="rv-card" style="${cardStyle}${carouselStyle}">
          <div style="color:${design.starColor};margin-bottom:6px;font-size:14px;">${"★".repeat(rev.rating)}${"☆".repeat(5 - rev.rating)}</div>
          <p style="margin:0 0 8px;line-height:1.5;">${rev.body}</p>
          ${rev.photoUrl ? `<img src="${rev.photoUrl}" style="max-width:100%;border-radius:${Math.max(r - 2, 0)}px;margin:0 0 8px;" />` : ""}
          <p style="margin:0;opacity:0.55;font-size:12px;">${rev.customerName}</p>
        </div>`;
    }

    let listWrapperStyle = "display:flex;flex-direction:column;gap:12px;";
    let carouselCardWidth = null;
    if (design.displayStyle === "grid") {
      listWrapperStyle = `display:grid;grid-template-columns:repeat(${design.gridColumns},1fr);gap:12px;`;
    } else if (design.displayStyle === "carousel") {
      listWrapperStyle = "display:flex;gap:12px;overflow-x:auto;scroll-behavior:smooth;padding-bottom:8px;";
      carouselCardWidth = `calc(${100 / design.carouselVisible}% - ${(12 * (design.carouselVisible - 1)) / design.carouselVisible}px)`;
    }

    const breakdownHtml = summary.total
      ? summary.breakdown
          .map(
            (b) => `
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:${design.textColor};opacity:0.65;margin:3px 0;">
          <span style="width:36px;">${b.star} star</span>
          <div style="flex:1;height:6px;background:rgba(0,0,0,0.08);border-radius:3px;overflow:hidden;">
            <div style="width:${b.percentage}%;height:100%;background:${design.starColor};"></div>
          </div>
          <span style="width:30px;text-align:right;">${b.percentage}%</span>
        </div>`
          )
          .join("")
      : "";

    const rootTextAlign = design.formAlign === "center" ? "center" : design.formAlign === "right" ? "right" : "left";
    const summaryJustify = design.formAlign === "center" ? "center" : design.formAlign === "right" ? "flex-end" : "flex-start";

    const summaryHtml = summary.total
      ? `
      <div style="display:flex;align-items:center;justify-content:${summaryJustify};gap:20px;margin-bottom:18px;">
        <div style="text-align:center;">
          <div style="font-size:30px;font-weight:700;color:${design.textColor};line-height:1;">${summary.average}</div>
          <div style="color:${design.starColor};font-size:13px;margin-top:2px;">${"★".repeat(Math.round(summary.average))}${"☆".repeat(5 - Math.round(summary.average))}</div>
          <div style="font-size:11px;color:${design.textColor};opacity:0.55;margin-top:2px;">${summary.total} review${summary.total === 1 ? "" : "s"}</div>
        </div>
        <div style="flex:1;max-width:280px;">${breakdownHtml}</div>
      </div>`
      : "";

    const reviewsHtml = reviews.length
      ? reviews.map(reviewCard).join("")
      : `<p style="font-size:14px;color:${design.textColor};opacity:0.55;">No reviews yet — be the first!</p>`;

    const formMargin =
      design.formAlign === "center"
        ? "18px auto 0"
        : design.formAlign === "right"
        ? "18px 0 0 auto"
        : "18px 0 0 0";
    const formTextAlign = design.formAlign === "center" ? "center" : "left";

    const carouselArrows = design.displayStyle === "carousel"
      ? `
      <button class="rv-arrow rv-arrow-prev" style="position:absolute;left:-4px;top:50%;transform:translateY(-50%);background:#fff;border:1px solid #ddd;border-radius:50%;width:32px;height:32px;cursor:pointer;color:${design.arrowColor};font-size:16px;box-shadow:0 1px 4px rgba(0,0,0,0.1);z-index:1;">‹</button>
      <button class="rv-arrow rv-arrow-next" style="position:absolute;right:-4px;top:50%;transform:translateY(-50%);background:#fff;border:1px solid #ddd;border-radius:50%;width:32px;height:32px;cursor:pointer;color:${design.arrowColor};font-size:16px;box-shadow:0 1px 4px rgba(0,0,0,0.1);z-index:1;">›</button>`
      : "";
    const listOuterStyle = design.displayStyle === "carousel" ? "position:relative;padding:0 20px;" : "";

    el.innerHTML = `
      <div class="rv-root" style="font-family:${design.fontFamily};max-width:100%;color:${design.textColor};text-align:${rootTextAlign};">
        <h3 style="font-size:16px;margin:0 0 10px;font-weight:600;">Customer Reviews</h3>
        ${summaryHtml}
        <div style="${listOuterStyle}">
          ${carouselArrows}
          <div class="rv-list" style="${listWrapperStyle}">${reviewsHtml}</div>
        </div>

        <button class="rv-toggle" style="margin-top:18px;padding:9px 16px;background:transparent;color:${design.primaryColor};border:1.5px solid ${design.primaryColor};border-radius:${r}px;font-size:13px;font-weight:500;cursor:pointer;">
          Write a review
        </button>

        <div class="rv-form-wrap" style="display:none;margin:${formMargin};padding:24px;border:1px solid rgba(0,0,0,0.08);border-radius:${r}px;max-width:${design.formMaxWidth}px;text-align:${formTextAlign};">
          <p style="margin:0 0 4px;font-size:14px;font-weight:600;">How would you rate it?</p>
          <div class="rv-stars" style="display:flex;gap:6px;justify-content:${design.formAlign === "center" ? "center" : "flex-start"};margin:10px 0 16px;">
            ${[1, 2, 3, 4, 5]
              .map(
                (n) =>
                  `<button type="button" class="rv-star" data-star="${n}" style="background:none;border:none;padding:0;cursor:pointer;font-size:32px;line-height:1;color:#d9d9d9;">★</button>`
              )
              .join("")}
          </div>

          <div class="rv-suggestions-wrap" style="display:none;text-align:left;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <p style="margin:0;font-size:13px;font-weight:500;opacity:0.7;">Pick a suggestion or write your own</p>
              <div style="display:flex;gap:12px;">
                <button type="button" class="rv-refresh" style="background:none;border:none;font-size:12px;color:${design.primaryColor};cursor:pointer;padding:0;">🔄 Refresh</button>
                <button type="button" class="rv-close-suggestions" style="background:none;border:none;font-size:12px;color:#999;cursor:pointer;padding:0;">✕ Close</button>
              </div>
            </div>
            <div class="rv-suggestions" style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;"></div>
          </div>

          <form class="rv-form" style="display:flex;flex-direction:column;gap:10px;text-align:left;">
            <textarea name="body" required minlength="10" placeholder="Your review"
                      style="padding:11px;border:1px solid #ddd;border-radius:${Math.max(r - 2, 4)}px;font-size:14px;min-height:90px;font-family:inherit;resize:vertical;"></textarea>
            <input type="text" name="customerName" required placeholder="Your name"
                   style="padding:11px;border:1px solid #ddd;border-radius:${Math.max(r - 2, 4)}px;font-size:14px;font-family:inherit;" />
            <input type="email" name="customerEmail" placeholder="Your email (optional)"
                   style="padding:11px;border:1px solid #ddd;border-radius:${Math.max(r - 2, 4)}px;font-size:14px;font-family:inherit;" />

            <div>
              <label style="font-size:13px;opacity:0.7;display:block;margin-bottom:6px;">Add a photo (optional)</label>
              <label class="rv-photo-btn" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid #ddd;border-radius:${Math.max(r - 2, 4)}px;font-size:13px;cursor:pointer;color:#555;">
                📷 <span class="rv-photo-label">Choose a photo</span>
                <input type="file" name="photo" accept="image/*" style="display:none;" />
              </label>
              <img class="rv-photo-preview" style="display:none;max-width:90px;border-radius:6px;margin-top:8px;" />
            </div>

            <button type="submit" style="margin-top:6px;padding:12px 18px;background:${design.primaryColor};color:#fff;border:none;border-radius:${Math.max(r - 2, 4)}px;font-size:14px;font-weight:600;cursor:pointer;">
              Submit review
            </button>
            <p class="rv-status" style="margin:0;font-size:13px;text-align:${formTextAlign};"></p>
          </form>
        </div>
      </div>
    `;

    const rvList = el.querySelector(".rv-list");
    const prevArrow = el.querySelector(".rv-arrow-prev");
    const nextArrow = el.querySelector(".rv-arrow-next");
    if (prevArrow && nextArrow && rvList) {
      const scrollAmount = () => rvList.clientWidth / design.carouselVisible + 12;
      prevArrow.addEventListener("click", () => rvList.scrollBy({ left: -scrollAmount(), behavior: "smooth" }));
      nextArrow.addEventListener("click", () => rvList.scrollBy({ left: scrollAmount(), behavior: "smooth" }));
    }

    const toggle = el.querySelector(".rv-toggle");
    const formWrap = el.querySelector(".rv-form-wrap");
    const form = el.querySelector(".rv-form");
    const status = el.querySelector(".rv-status");
    const starButtons = [...el.querySelectorAll(".rv-star")];
    const suggestionsWrap = el.querySelector(".rv-suggestions-wrap");
    const suggestionsBox = el.querySelector(".rv-suggestions");
    const refreshBtn = el.querySelector(".rv-refresh");
    const closeSuggestionsBtn = el.querySelector(".rv-close-suggestions");
    const bodyTextarea = form.querySelector('[name="body"]');
    const photoInput = form.querySelector('[name="photo"]');
    const photoLabel = el.querySelector(".rv-photo-label");
    const photoPreview = el.querySelector(".rv-photo-preview");

    let selectedRating = 0;
    let photoDataUrl;

    toggle.addEventListener("click", () => {
      formWrap.style.display = formWrap.style.display === "none" ? "block" : "none";
    });

    function paintStars() {
      starButtons.forEach((btn) => {
        const n = Number(btn.dataset.star);
        btn.style.color = n <= selectedRating ? design.starColor : "#d9d9d9";
      });
    }

    async function loadSuggestions() {
      suggestionsBox.innerHTML = `<p style="font-size:12px;opacity:0.5;margin:0;">Loading...</p>`;
      try {
        const res = await fetch(
          `${API_BASE}/api/reviews/suggestions?rating=${selectedRating}&productTitle=${encodeURIComponent(productTitle)}`
        );
        const data = await res.json();
        const suggestions = data.suggestions || [];
        suggestionsBox.innerHTML = suggestions
          .map(
            (s) =>
              `<button type="button" class="rv-suggestion" style="text-align:left;padding:8px 10px;border:1px solid #e5e5e5;border-radius:6px;background:#fafafa;font-size:12px;cursor:pointer;color:#333;">${s}</button>`
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

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!selectedRating) {
        status.textContent = "Please select a star rating.";
        status.style.color = "#c0392b";
        return;
      }
      const customerName = form.customerName.value;
      const customerEmail = form.customerEmail.value;
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
            body: bodyText,
            customerName,
            customerEmail,
            photoUrl: photoDataUrl,
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
            formWrap.style.display = "none";
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
