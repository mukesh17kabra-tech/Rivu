// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * The auto-injected rating badge, run against a real DOM.
 *
 * Reported: two identical star badges on one line in the cart drawer.
 *
 * A cart line — and most product cards — contain TWO links to the same
 * product, one wrapping the image and one wrapping the title. Cart markup
 * matches none of the card selectors the script looked for, so it fell back to
 * `linkEl.parentElement`, which is a *different* element for each of those
 * links. The "already injected here" flag was set on two separate nodes and
 * both badges rendered.
 *
 * This uses happy-dom rather than a hand-written stub. Two of my own stub
 * harnesses have been the broken thing this week while the tests looked green;
 * a DOM bug needs a DOM, not an object literal that answers querySelector.
 */

const script = readFileSync(
  path.resolve(__dirname, "../extensions/rivu-reviews/assets/rivu-rating-badge.js"),
  "utf8"
);

/** Dawn's cart drawer: a table row, two links, nothing "card"-like above. */
const CART_DRAWER = `
  <table class="cart-items">
    <tr class="cart-item">
      <td class="cart-item__media">
        <a href="/products/the-complete-snowboard" class="cart-item__link"></a>
        <img src="/board.jpg" class="cart-item__image"/>
      </td>
      <td class="cart-item__details">
        <a href="/products/the-complete-snowboard" class="cart-item__name">The Complete Snowboard</a>
        <div class="product-option">Color: Ice</div>
      </td>
    </tr>
  </table>
`;

/** A collection card, which does have a card-like container. */
const COLLECTION_GRID = `
  <ul class="product-grid">
    <li class="grid__item">
      <div class="card">
        <a href="/products/the-complete-snowboard" class="card__media-link">
          <img src="/board.jpg"/>
        </a>
        <h3 class="card__heading">
          <a href="/products/the-complete-snowboard" class="card__link">The Complete Snowboard</a>
        </h3>
      </div>
    </li>
  </ul>
`;

function setUpPage(markup: string) {
  document.head.innerHTML = "";
  document.body.innerHTML =
    `<script data-auto-inject="true" data-shop="s.myshopify.com"
             data-api-base="https://rivu.test" data-badge-star-size="14"></script>` +
    markup;

  // /products/<handle>.js for the numeric id, then the Rivu summary.
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        String(url).includes("/products/")
          ? { id: 123456 }
          : { total: 2, average: 4, starColor: "#f5b400", textColor: "#555" },
    }))
  );
}

/** Runs the script and lets its chained fetches settle. */
async function run() {
  new Function(script)();
  for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 10));
  return document.querySelectorAll(".rivu-auto-badge");
}

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the cart drawer", () => {
  it("gets exactly one badge per line, not one per link", async () => {
    // The reported bug: stars above the image and again beside the title.
    setUpPage(CART_DRAWER);
    const badges = await run();
    expect(badges.length).toBe(1);
  });

  it("puts the badge inside the cart line it belongs to", async () => {
    setUpPage(CART_DRAWER);
    await run();
    const line = document.querySelector(".cart-item");
    expect(line?.querySelectorAll(".rivu-auto-badge").length).toBe(1);
  });

  it("tags the badge with its product, so the guard recognises its own work", async () => {
    setUpPage(CART_DRAWER);
    const badges = await run();
    expect(badges[0].getAttribute("data-rivu-handle")).toBe("the-complete-snowboard");
  });
});

describe("a collection card", () => {
  it("still gets exactly one badge", async () => {
    // This case already worked — the fix must not double it.
    setUpPage(COLLECTION_GRID);
    const badges = await run();
    expect(badges.length).toBe(1);
  });

  it("places it after the product title", async () => {
    setUpPage(COLLECTION_GRID);
    await run();
    const heading = document.querySelector(".card__heading");
    expect(heading?.nextElementSibling?.className).toContain("rivu-auto-badge");
  });
});

describe("several different products on one page", () => {
  it("gets a badge each", async () => {
    // The dedupe is per product, not per page — a related-products row must
    // not end up with one badge between them.
    setUpPage(`
      <ul>
        <li class="grid__item"><div class="card">
          <a href="/products/one"><img/></a><h3 class="card__heading"><a href="/products/one">One</a></h3>
        </div></li>
        <li class="grid__item"><div class="card">
          <a href="/products/two"><img/></a><h3 class="card__heading"><a href="/products/two">Two</a></h3>
        </div></li>
      </ul>
    `);
    const badges = await run();
    expect(badges.length).toBe(2);
  });
});

describe("the same product twice on one page", () => {
  it("gets a badge in each place it appears", async () => {
    // A product can legitimately show in both a featured row and a
    // recommendations row; the guard only looks at nearby ancestors, so it
    // must not suppress the second one.
    setUpPage(`
      <div class="featured"><li class="grid__item"><div class="card">
        <a href="/products/one"><img/></a><h3 class="card__heading"><a href="/products/one">One</a></h3>
      </div></li></div>
      <div class="recommended"><li class="grid__item"><div class="card">
        <a href="/products/one"><img/></a><h3 class="card__heading"><a href="/products/one">One</a></h3>
      </div></li></div>
    `);
    const badges = await run();
    expect(badges.length).toBe(2);
  });
});

describe("where the cart badge lands", () => {
  it("sits in the details cell, not on top of the image", async () => {
    // The screenshot showed one badge above the product image. That is the
    // container selectors doing their job: without cart/line-item patterns the
    // nearest match is the media cell, and the badge is inserted after the
    // image link because there is no title inside it to sit under.
    setUpPage(CART_DRAWER);
    await run();

    const media = document.querySelector(".cart-item__media");
    const details = document.querySelector(".cart-item__details");

    expect(media?.querySelectorAll(".rivu-auto-badge").length).toBe(0);
    expect(details?.querySelectorAll(".rivu-auto-badge").length).toBe(1);
  });

  it("follows the product name", async () => {
    setUpPage(CART_DRAWER);
    await run();
    const name = document.querySelector(".cart-item__name");
    expect(name?.nextElementSibling?.className).toContain("rivu-auto-badge");
  });
});

describe("a theme with no title element near the link", () => {
  it("still gets only one badge", async () => {
    // containerFor gives up after five levels and falls back to the link's
    // parent, which is different for each of the two links — so the per-card
    // flag cannot dedupe and the per-product guard is the only thing left
    // standing between this theme and the duplicate badges.
    setUpPage(`
      <div class="row">
        <div><a href="/products/one"><img/></a></div>
        <div><a href="/products/one">One</a></div>
      </div>
    `);
    const badges = await run();
    expect(badges.length).toBe(1);
  });
});
