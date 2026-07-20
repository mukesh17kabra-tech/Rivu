/**
 * Rivu Reviews Widget — Theme App Extension version.
 * Loaded automatically by blocks/reviews.liquid when a merchant adds the
 * "Rivu Reviews" app block via the theme editor. API_BASE comes from a
 * data attribute (set in the liquid block) instead of the script's own
 * src, since Shopify serves this from its own asset CDN.
 * Supports list, grid, and carousel layouts, plus full color/font
 * customization set by the merchant in the app dashboard (/dashboard/design).
 */
(function () {
  async function render(el) {
    const { shop, productId, productTitle, productImage, apiBase } = el.dataset;
    const API_BASE = apiBase || "";

    el.innerHTML = `<p style="font-size:14px;color:#888;">Loading reviews...</p>`;

    let reviews = [];
    let summary = { total: 0, average: 0, breakdown: [] };
    let design = {
      displayStyle: "list",
      gridColumns: 3,
      primaryColor: "#111111",
      starColor: "#f5b400",
      backgroundColor: "#ffffff",
      textColor: "#333333",
      borderRadius: 8,
      fontFamily: "inherit",
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

    const cardStyle = `background:${design.backgroundColor};color:${design.textColor};border-radius:${design.borderRadius}px;padding:14px;font-size:13px;`;

    function reviewCard(r) {
      return `
        <div class="rv-card" style="${cardStyle}${design.displayStyle === "carousel" ? "min-width:220px;flex-shrink:0;" : ""}">
          <div style="color:${design.starColor};margin-bottom:6px;">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
          <p style="margin:0 0 8px;">${r.body}</p>
          ${r.photoUrl ? `<img src="${r.photoUrl}" style="max-width:100%;border-radius:${Math.max(design.borderRadius - 2, 0)}px;margin:0 0 8px;" />` : ""}
          <p style="margin:0;opacity:0.6;font-size:12px;">${r.customerName}</p>
        </div>`;
    }

    let listWrapperStyle = "display:flex;flex-direction:column;gap:12px;";
    if (design.displayStyle === "grid") {
      listWrapperStyle = `display:grid;grid-template-columns:repeat(${design.gridColumns},1fr);gap:12px;`;
    } else if (design.displayStyle === "carousel") {
      listWrapperStyle = "display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;";
    }

    const breakdownHtml = summary.total
      ? summary.breakdown
          .map(
            (b) => `
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:${design.textColor};opacity:0.7;margin:2px 0;">
          <span style="width:36px;">${b.star} star</span>
          <div style="flex:1;height:6px;background:rgba(0,0,0,0.08);border-radius:3px;overflow:hidden;">
            <div style="width:${b.percentage}%;height:100%;background:${design.starColor};"></div>
          </div>
          <span style="width:32px;text-align:right;">${b.percentage}%</span>
        </div>`
          )
          .join("")
      : "";

    const summaryHtml = summary.total
      ? `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
        <div style="text-align:center;">
          <div style="font-size:32px;font-weight:700;color:${design.textColor};">${summary.average}</div>
          <div style="color:${design.starColor};font-size:14px;">${"★".repeat(Math.round(summary.average))}${"☆".repeat(5 - Math.round(summary.average))}</div>
          <div style="font-size:12px;color:${design.textColor};opacity:0.6;">${summary.total} review${summary.total === 1 ? "" : "s"}</div>
        </div>
        <div style="flex:1;">${breakdownHtml}</div>
      </div>`
      : "";

    const reviewsHtml = reviews.length
      ? reviews.map(reviewCard).join("")
      : `<p style="font-size:14px;color:${design.textColor};opacity:0.6;">No reviews yet — be the first!</p>`;

    el.innerHTML = `
      <div style="font-family:${design.fontFamily};max-width:100%;color:${design.textColor};">
        <h3 style="font-size:16px;margin:0 0 8px;">Customer Reviews</h3>
        ${summaryHtml}
        <div class="rv-list" style="${listWrapperStyle}">${reviewsHtml}</div>

        <button class="rv-toggle" style="margin-top:16px;padding:8px 14px;background:${design.primaryColor};color:#fff;border:none;border-radius:${design.borderRadius}px;font-size:14px;cursor:pointer;">
          Write a review
        </button>

        <form class="rv-form" style="display:none;flex-direction:column;gap:8px;margin-top:16px;">
          <select name="rating" required style="padding:8px;border:1px solid #ccc;border-radius:${design.borderRadius}px;font-size:14px;">
            <option value="">Rating</option>
            <option value="5">★★★★★</option>
            <option value="4">★★★★☆</option>
            <option value="3">★★★☆☆</option>
            <option value="2">★★☆☆☆</option>
            <option value="1">★☆☆☆☆</option>
          </select>
          <input type="text" name="customerName" required placeholder="Your name"
                 style="padding:8px;border:1px solid #ccc;border-radius:${design.borderRadius}px;font-size:14px;" />
          <textarea name="body" required minlength="10" placeholder="Share your experience..."
                    style="padding:8px;border:1px solid #ccc;border-radius:${design.borderRadius}px;font-size:14px;min-height:80px;"></textarea>
          <button type="submit" style="padding:8px 14px;background:${design.primaryColor};color:#fff;border:none;border-radius:${design.borderRadius}px;font-size:14px;cursor:pointer;">
            Submit review
          </button>
          <p class="rv-status" style="margin:0;font-size:13px;"></p>
        </form>
      </div>
    `;

    const toggle = el.querySelector(".rv-toggle");
    const form = el.querySelector(".rv-form");
    const status = el.querySelector(".rv-status");

    toggle.addEventListener("click", () => {
      form.style.display = form.style.display === "none" ? "flex" : "none";
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const rating = Number(form.rating.value);
      const customerName = form.customerName.value;
      const bodyText = form.body.value;

      status.textContent = "Submitting...";

      try {
        const res = await fetch(`${API_BASE}/api/reviews/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shop,
            productId,
            productTitle,
            productImageUrl: productImage || undefined,
            rating,
            body: bodyText,
            customerName,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          status.textContent = data.discountCode
            ? `Thanks! Here's a thank-you discount code: ${data.discountCode}`
            : "Thanks! Your review is pending approval.";
          status.style.color = "green";
          status.style.fontWeight = data.discountCode ? "600" : "normal";
          form.reset();
          form.style.display = "none";
        } else {
          status.textContent = data.error || "Something went wrong.";
          status.style.color = "red";
        }
      } catch {
        status.textContent = "Network error, please try again.";
        status.style.color = "red";
      }
    });
  }

  document.querySelectorAll(".rivu-review-widget").forEach(render);
})();
