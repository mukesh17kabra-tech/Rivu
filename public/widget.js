/**
 * Review Widget
 * Add this to your product template:
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
    try {
      const res = await fetch(
        `${API_BASE}/api/reviews/list?shop=${encodeURIComponent(shop)}&productId=${encodeURIComponent(productId)}`
      );
      if (res.ok) {
        const data = await res.json();
        reviews = data.reviews || [];
        summary = data.summary || summary;
      }
    } catch {
      // Show empty state below if this fails.
    }

    const breakdownHtml = summary.total
      ? summary.breakdown
          .map(
            (b) => `
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#666;margin:2px 0;">
          <span style="width:36px;">${b.star} star</span>
          <div style="flex:1;height:6px;background:#eee;border-radius:3px;overflow:hidden;">
            <div style="width:${b.percentage}%;height:100%;background:#f5b400;"></div>
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
          <div style="font-size:32px;font-weight:700;color:#111;">${summary.average}</div>
          <div style="color:#f5b400;font-size:14px;">${"★".repeat(Math.round(summary.average))}${"☆".repeat(5 - Math.round(summary.average))}</div>
          <div style="font-size:12px;color:#999;">${summary.total} review${summary.total === 1 ? "" : "s"}</div>
        </div>
        <div style="flex:1;">${breakdownHtml}</div>
      </div>`
      : "";

    const reviewsHtml = reviews.length
      ? reviews
          .map(
            (r) => `
        <div style="border-top:1px solid #eee;padding:12px 0;">
          <div style="color:#f5b400;font-size:14px;">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
          <p style="margin:6px 0;font-size:14px;color:#333;">${r.body}</p>
          ${r.photoUrl ? `<img src="${r.photoUrl}" style="max-width:120px;border-radius:6px;margin:6px 0;" />` : ""}
          <p style="margin:0;font-size:12px;color:#999;">${r.customerName}</p>
        </div>`
          )
          .join("")
      : `<p style="font-size:14px;color:#999;">No reviews yet — be the first!</p>`;

    el.innerHTML = `
      <div style="font-family:inherit;max-width:480px;">
        <h3 style="font-size:16px;margin:0 0 8px;">Customer Reviews</h3>
        ${summaryHtml}
        <div class="rv-list">${reviewsHtml}</div>

        <button class="rv-toggle" style="margin-top:16px;padding:8px 14px;background:#111;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;">
          Write a review
        </button>

        <form class="rv-form" style="display:none;flex-direction:column;gap:8px;margin-top:16px;">
          <select name="rating" required style="padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;">
            <option value="">Rating</option>
            <option value="5">★★★★★</option>
            <option value="4">★★★★☆</option>
            <option value="3">★★★☆☆</option>
            <option value="2">★★☆☆☆</option>
            <option value="1">★☆☆☆☆</option>
          </select>
          <input type="text" name="customerName" required placeholder="Your name"
                 style="padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;" />
          <textarea name="body" required minlength="10" placeholder="Share your experience..."
                    style="padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;min-height:80px;"></textarea>
          <button type="submit" style="padding:8px 14px;background:#111;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;">
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
          status.textContent = "Thanks! Your review is pending approval.";
          status.style.color = "green";
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

  document.querySelectorAll("#review-widget").forEach(render);
})();
