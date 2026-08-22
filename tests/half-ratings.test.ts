import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Half-star ratings, end to end.
 *
 * The widget could *display* a fractional average but nobody could ever submit
 * one: the column was an integer, the validator demanded an integer, and the
 * picker was five whole-star buttons. So 3.5 and 4.5 were unreachable.
 *
 * Widening the rating touches more than the form — the breakdown bucketed by
 * exact match, two dashboards drew stars with String.repeat, and the AI
 * suggestion pool is keyed by whole star.
 */

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const widgets: [string, string][] = [
  ["public widget", "public/widget.js"],
  ["theme extension widget", "extensions/rivu-reviews/assets/rivu-widget.js"],
];

describe("the rating can hold a half", () => {
  it("is stored as a float, not an integer", () => {
    const schema = read("prisma/schema.prisma");
    const review = schema.slice(schema.indexOf("model Review "));
    expect(review).toMatch(/rating\s+Float/);
  });

  it("widens the existing column rather than needing a manual migration", () => {
    const migrate = read("lib/db-migrate.ts");
    expect(migrate).toContain(
      `ALTER TABLE "Review" ALTER COLUMN "rating" TYPE DOUBLE PRECISION`
    );
  });
});

describe("what the API accepts", () => {
  const submit = read("app/api/reviews/submit/route.ts");

  it("no longer demands a whole number", () => {
    expect(submit).not.toMatch(/rating:\s*z\.number\(\)\.int\(\)/);
  });

  it("accepts halves but nothing finer", () => {
    // The picker offers halves, so a 4.25 came from a hand-made request and
    // would render as a rating no shopper could have chosen.
    expect(submit).toContain("Number.isInteger(n * 2)");
  });

  it("still bounds the rating to 1–5", () => {
    expect(submit).toMatch(/\.min\(1\)/);
    expect(submit).toMatch(/\.max\(5\)/);
  });
});

describe("the breakdown counts half ratings", () => {
  it("buckets by rounding instead of matching exactly", () => {
    // An exact match drops every half rating from the bars while still
    // counting it in the average — the two would disagree on screen.
    const list = read("app/api/reviews/list/route.ts");
    expect(list).toContain("Math.round(r.rating) === star");
    expect(list).not.toContain("r.rating === star");
  });
});

describe("integer-only consumers were updated", () => {
  it("the suggestion pool is looked up by whole star", () => {
    // ReviewSuggestion.rating is an integer; a 4.5 lookup would miss entirely.
    const route = read("app/api/reviews/suggestions/route.ts");
    expect(route).toContain('Math.round(Number(req.nextUrl.searchParams.get("rating")))');
  });

  it.each([
    ["components/ReviewsTable.tsx", "review.rating"],
    ["app/dashboard/home/page.tsx", "r.rating"],
  ])("%s rounds before String.repeat", (file, expr) => {
    // repeat() truncates, so 4.5 drew four filled stars and no empty ones.
    const src = read(file);
    expect(src).toContain(`"★".repeat(Math.round(${expr}))`);
    expect(src).not.toMatch(
      new RegExp(`repeat\\(${expr.replace(".", "\\.")}\\)`)
    );
  });
});

describe.each(widgets)("%s rating picker", (_name, rel) => {
  const src = read(rel);

  it("is one track, not five whole-star buttons", () => {
    // Five buttons cannot express 3.5.
    expect(src).toContain('class="rv-star-input"');
    expect(src).not.toContain('class="rv-star" data-star=');
  });

  it("derives the rating from the pointer position in half steps", () => {
    expect(src).toContain("function ratingFromPointer");
    // Ceil to the next half: landing on a star and getting the previous value
    // feels broken.
    expect(src).toContain("Math.ceil(ratio * 10) / 2");
  });

  it("clamps to the 0.5–5 range", () => {
    expect(src).toContain("Math.max(0.5, Math.min(5, value))");
  });

  it("stays operable from the keyboard", () => {
    // A pointer-only control would shut out anyone not using a mouse — which
    // the five buttons it replaced handled for free.
    expect(src).toContain('role="slider"');
    expect(src).toContain('tabindex="0"');

    // The handler must be bound to the track itself. Asserting that the key
    // names merely appear somewhere proves nothing: unbinding the listener
    // leaves them sitting in dead code, and an earlier version of this test
    // passed with the keyboard completely broken.
    expect(src).toContain('track.addEventListener("keydown"');

    const handler = src.slice(src.indexOf('track.addEventListener("keydown"'));
    expect(handler.slice(0, 600)).toContain("ArrowRight");
    expect(handler.slice(0, 600)).toContain("ArrowLeft");
  });

  it("reports its value to assistive technology", () => {
    expect(src).toContain("aria-valuenow");
    expect(src).toContain("aria-valuetext");
  });

  it("redraws at the size it was built with", () => {
    // Without this the stars are drawn at one size, then repainted at the
    // fallback size the moment the shopper clicks.
    expect(src).toContain("data-star-size");
    expect(src).toContain("Number(track.dataset.starSize)");
  });

  it("previews the value under the pointer before committing", () => {
    expect(src).toContain("mousemove");
    expect(src).toContain("paintStars(ratingFromPointer(track, e.clientX))");
  });
});
