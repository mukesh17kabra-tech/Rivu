/**
 * Rivu Rating Badge — lightweight widget for product cards / compact
 * spots. Just shows average stars + review count, no form, no photo.
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

      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:4px;font-size:13px;color:${data.textColor || "#333"};">
          <span style="color:${data.starColor || "#f5b400"};">
            ${"★".repeat(Math.round(data.average))}${"☆".repeat(5 - Math.round(data.average))}
          </span>
          <span style="opacity:0.7;">(${data.total})</span>
        </div>
      `;
    } catch {
      el.innerHTML = "";
    }
  }

  document.querySelectorAll(".rivu-rating-badge").forEach(render);
})();
