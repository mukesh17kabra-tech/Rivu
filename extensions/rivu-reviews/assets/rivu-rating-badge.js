/**
 * Rivu Rating Badge — lightweight widget for product cards / compact
 * spots. Shows a merchant-customizable text template (e.g. "Got {rating}
 * for this product") with {rating} replaced by the actual star icons for
 * that product's average rating.
 */
(function () {
  async function render(el) {
    const { shop, productId, apiBase } = el.dataset;

    try {
      const res = await fetch(
        `${apiBase}/api/reviews/summary?shop=${encodeURIComponent(shop)}&productId=${encodeURIComponent(productId)}`
      );
      if (!res.ok) return;
      const data = await res.json();

      if (!data.total) {
        el.innerHTML = "";
        return;
      }

      const starColor = data.starColor || "#f5b400";
      const textColor = data.textColor || "#333";
      const starsHtml = `<span style="color:${starColor};">${"★".repeat(Math.round(data.average))}${"☆".repeat(5 - Math.round(data.average))}</span>`;
      const template = data.ratingBadgeTemplate || "{rating} rating for this product";
      const textHtml = template
        .replace(/\{rating\}/g, starsHtml)
        .replace(/\{count\}/g, data.total);

      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:4px;font-size:13px;color:${textColor};">
          ${textHtml}
        </div>
      `;
    } catch {
      el.innerHTML = "";
    }
  }

  document.querySelectorAll(".rivu-rating-badge").forEach(render);
})();
