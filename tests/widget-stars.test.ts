import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Star rendering and sort order, checked by running the widget's own code.
 *
 * starsHtml was always called through Math.round, so a 4.5 average drew five
 * solid stars — the widget claimed a perfect score for a store that did not
 * have one. That is worse than a cosmetic bug: shoppers see it, and the rating
 * is the one number the app exists to report.
 */

const sources: [string, string][] = [
  ["public widget", "../public/widget.js"],
  ["theme extension widget", "../extensions/rivu-reviews/assets/rivu-widget.js"],
];

/** Pulls the star helpers out of the widget and evaluates them in isolation. */
function loadStars(rel: string) {
  const src = readFileSync(path.resolve(__dirname, rel), "utf8");

  const pathStart = src.indexOf("const STAR_PATH");
  const fnStart = src.indexOf("function starsHtml");
  const fnEnd = src.indexOf("\n  }", fnStart) + 4;
  expect(pathStart, `${rel}: STAR_PATH not found`).toBeGreaterThan(-1);
  expect(fnStart, `${rel}: starsHtml not found`).toBeGreaterThan(-1);

  const code = src.slice(pathStart, fnEnd);
  return new Function(`${code}\nreturn starsHtml;`)() as (
    n: number,
    color: string,
    empty?: string,
    size?: number
  ) => string;
}

/** Counts fully-filled, half and empty stars in the rendered markup. */
function shape(html: string, color = "#f5b400", empty = "#e0e0e0") {
  const halves = (html.match(/position:relative/g) || []).length;
  const filled = (html.match(new RegExp(`fill="${color}"`, "g")) || []).length;
  const blanks = (html.match(new RegExp(`fill="${empty}"`, "g")) || []).length;
  // Each half contains one filled and one empty svg of its own.
  return { full: filled - halves, half: halves, empty: blanks - halves };
}

describe.each(sources)("%s star rendering", (_name, rel) => {
  const starsHtml = loadStars(rel);

  it("draws five stars whatever the rating", () => {
    for (const rating of [0, 1, 2.5, 3.7, 4.5, 5]) {
      const { full, half, empty } = shape(starsHtml(rating, "#f5b400"));
      expect(full + half + empty, `rating ${rating}`).toBe(5);
    }
  });

  it("draws a half star for a .5 average", () => {
    // The reported case: 4.5 must not look like 5.
    const { full, half, empty } = shape(starsHtml(4.5, "#f5b400"));
    expect({ full, half, empty }).toEqual({ full: 4, half: 1, empty: 0 });
  });

  it("does not round a fractional rating up to a perfect score", () => {
    expect(shape(starsHtml(4.5, "#f5b400")).full).toBeLessThan(5);
    expect(shape(starsHtml(4.4, "#f5b400")).full).toBeLessThan(5);
  });

  it("draws whole stars for whole ratings", () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      const { full, half, empty } = shape(starsHtml(rating, "#f5b400"));
      expect({ rating, full, half, empty }).toEqual({
        rating,
        full: rating,
        half: 0,
        empty: 5 - rating,
      });
    }
  });

  it("treats a near-whole rating as whole", () => {
    // 4.9 stars shown as 4½ would understate it as surely as 4.5 shown as 5
    // overstates it.
    expect(shape(starsHtml(4.9, "#f5b400"))).toEqual({ full: 5, half: 0, empty: 0 });
    expect(shape(starsHtml(4.1, "#f5b400"))).toEqual({ full: 4, half: 0, empty: 1 });
  });

  it("shows nothing filled for no rating", () => {
    for (const rating of [0, NaN, undefined as unknown as number]) {
      const { full, half } = shape(starsHtml(rating, "#f5b400"));
      expect({ full, half }, String(rating)).toEqual({ full: 0, half: 0 });
    }
  });

  it("never exceeds five for an out-of-range rating", () => {
    const { full, half, empty } = shape(starsHtml(9, "#f5b400"));
    expect({ full, half, empty }).toEqual({ full: 5, half: 0, empty: 0 });
  });

  it("uses no SVG ids, so two widgets on a page can't collide", () => {
    // A gradient or clipPath would need an id; duplicate ids would let one
    // widget's definition apply to another's stars.
    const html = starsHtml(3.5, "#f5b400");
    expect(html).not.toMatch(/\bid=/);
    expect(html).not.toMatch(/url\(#/);
  });

  it("honours the size it is given", () => {
    const html = starsHtml(4.5, "#f5b400", "#e0e0e0", 24);
    expect(html).toContain('width="24"');
    // The half wrapper has to match, or the overlay is misaligned.
    expect(html).toContain("width:24px");
  });
});

describe.each(sources)("%s sort options", (_name, rel) => {
  const src = readFileSync(path.resolve(__dirname, rel), "utf8");

  it("offers sorting by rating, not only by date", () => {
    // A shopper looking for the complaints goes straight to the lowest ratings.
    expect(src).toContain('<option value="highest">');
    expect(src).toContain('<option value="lowest">');
  });

  it("has a comparator for every option it offers", () => {
    const offered = [...src.matchAll(/<option value="(\w+)">/g)]
      .map((m) => m[1])
      .filter((v) => ["newest", "oldest", "highest", "lowest"].includes(v));
    const block = src.slice(src.indexOf("const comparators = {"));
    for (const option of offered) {
      expect(block, `no comparator for "${option}"`).toContain(`${option}:`);
    }
  });

  it("breaks rating ties by date so the order is stable", () => {
    const block = src.slice(
      src.indexOf("const comparators = {"),
      src.indexOf("return [...reviews]")
    );
    expect(block).toContain("b.rating - a.rating || byNewest(a, b)");
    expect(block).toContain("a.rating - b.rating || byNewest(a, b)");
  });

  it("falls back to newest for an unrecognised sort value", () => {
    expect(src).toContain("comparators[sortOrder] || byNewest");
  });
});

describe("the summary average is no longer rounded before display", () => {
  it.each(sources)("%s", (_name, rel) => {
    const src = readFileSync(path.resolve(__dirname, rel), "utf8");
    // Rounding here is what hid the half star in every summary layout.
    expect(src).not.toContain("Math.round(summary.average)");
  });
});
