/**
 * Rivu Rating Badge — lightweight widget for:
 * 1. Product pages (near title) — shows average stars + count,
 *    clicking scrolls down to the full review widget on the same page
 * 2. Collection card product listings — shows compact star row
 *
 * Merchant-configurable from the dashboard:
 * - Template text with {rating} and {count} placeholders
 * - Star size (px) — default 16px, customizable per shop
 */
(function () {
  function svgStar(filled, color, size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? color : "none"}" stroke="${color}" stroke-width="1.5" style="display:inline-block;flex-shrink:0;vertical-align:middle;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>`;
  }

  function starsHtml(average, color, size) {
    const rounded = Math.round(average);
    return [1,2,3,4,5].map(n => svgStar(n <= rounded, color, size)).join("");
  }

  async function render(el) {
    const { shop, productId, apiBase } = el.dataset;
    if (!shop || !productId) return;

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
      const starSize = data.ratingBadgeStarSize || 16;
      const template = data.ratingBadgeTemplate || "{rating} ({count} reviews)";

      const starsMarkup = starsHtml(data.average, starColor, starSize);
      const countText = `<span style="font-size:${Math.max(starSize - 4, 10)}px;color:${textColor};opacity:.75;margin-left:4px;vertical-align:middle;">${data.total} review${data.total === 1 ? "" : "s"}</span>`;

      // {rating} → star icons, {count} → plain number
      const html = template
        .replace(/\{rating\}/g, starsMarkup)
        .replace(/\{count\}/g, `<span style="color:${textColor};opacity:.75;">${data.total}</span>`);

      // Clicking the badge scrolls to the full review widget on the page —
      // looks for #review-widget or .rivu-review-widget (either selector
      // works depending on whether the block is using the older id-based
      // selector or the newer class-based one).
      el.innerHTML = `
        <a href="#rivu-reviews-anchor" class="rivu-badge-link" style="display:inline-flex;align-items:center;gap:4px;text-decoration:none;cursor:pointer;">
          ${html}${countText}
        </a>
        <div id="rivu-reviews-anchor" style="scroll-margin-top:80px;"></div>
      `;

      el.querySelector(".rivu-badge-link").addEventListener("click", (e) => {
        e.preventDefault();
        // Try to find the review widget block on the page and scroll to it.
        const target =
          document.querySelector("#review-widget") ||
          document.querySelector(".rivu-review-widget") ||
          document.querySelector("[data-rivu-reviews]");
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    } catch {
      // Silent — badge just stays empty if the API is unreachable.
    }
  }

  document.querySelectorAll(".rivu-rating-badge").forEach(render);
})();
