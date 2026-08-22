import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Store owner replies, the "would recommend" stat, and review search.
 *
 * The recommend answer is the interesting one: the form had collected it from
 * the start and nothing ever counted it, so the data sat in the database doing
 * nothing while the summary had no room for the strongest line of reassurance
 * a review section can show.
 */

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const widgets: [string, string][] = [
  ["public widget", "public/widget.js"],
  ["theme extension widget", "extensions/rivu-reviews/assets/rivu-widget.js"],
];

describe("store owner reply", () => {
  it("is stored on the review", () => {
    const schema = read("prisma/schema.prisma");
    const review = schema.slice(schema.indexOf("model Review "));
    expect(review).toMatch(/ownerReply\s+String\?/);
    expect(review).toMatch(/ownerReplyAt\s+DateTime\?/);
  });

  it("has a migration, so the column appears without a manual step", () => {
    const migrate = read("lib/db-migrate.ts");
    expect(migrate).toContain(`ADD COLUMN IF NOT EXISTS "ownerReply" TEXT`);
    expect(migrate).toContain(`ADD COLUMN IF NOT EXISTS "ownerReplyAt" TIMESTAMP(3)`);
  });

  it("is saved through the shop-scoped moderate route", () => {
    const route = read("app/api/reviews/moderate/route.ts");
    expect(route).toContain('action === "reply"');
    // Scoped, or one merchant could reply on another's review.
    const block = route.slice(route.indexOf('action === "reply"'));
    expect(block.slice(0, 600)).toContain("shopId: shopRecord.id");
  });

  it("clears the reply and its timestamp together when emptied", () => {
    // A stale ownerReplyAt with no reply would surface as a dated empty block.
    const route = read("app/api/reviews/moderate/route.ts");
    expect(route).toContain("ownerReply: text || null");
    expect(route).toContain("ownerReplyAt: text ? new Date() : null");
  });

  it("is sent to the storefront", () => {
    expect(read("app/api/reviews/list/route.ts")).toContain("ownerReply: true");
  });

  it("takes the reply text as an argument rather than reading state", () => {
    // "Remove reply" empties the draft and saves in one handler. Reading state
    // there would send the old text and leave the reply in place, because a
    // React state update is not visible until the next render.
    const table = read("components/ReviewsTable.tsx");
    expect(table).toContain("async function saveReply(review: Review, text: string)");
    expect(table).toContain('saveReply(review, "")');
    expect(table).not.toMatch(/reply:\s*replyDraft/);
  });

  it.each(widgets)("%s escapes it before rendering", (_name, rel) => {
    // Written in the admin, rendered in shoppers' browsers.
    const src = read(rel);
    expect(src).toContain("escapeHtml(rev.ownerReply)");
  });

  it.each(widgets)("%s styles it in custom mode too", (_name, rel) => {
    // Inline styles are suppressed for custom layouts, so the baseline
    // stylesheet has to carry the reply block or it renders unstyled.
    expect(read(rel)).toContain('".rv-card-reply{');
  });
});

describe("would recommend", () => {
  const list = read("app/api/reviews/list/route.ts");

  it("is counted, not just collected", () => {
    expect(list).toContain("const recommend =");
    expect(list).toContain("summary: { total, average, breakdown: counts, recommend }");
  });

  it("excludes people who skipped the question from the denominator", () => {
    // null means unanswered. Counting a skip as a "no" would understate every
    // merchant who added the question after already having reviews.
    expect(list).toContain("r.recommends !== null");
  });

  it.each(widgets)("%s hides it when nobody answered", (_name, rel) => {
    // "0% would recommend" reads as everyone disliking the product.
    const src = read(rel);
    expect(src).toContain("summary.recommend && summary.recommend.answered");
  });

  it.each(widgets)("%s renders it from one place, not per layout", (_name, rel) => {
    // Eight summary layouts; editing each would guarantee one gets missed.
    const src = read(rel);
    expect(src).toContain('.join("") + recommendSummaryHtml');
  });
});

describe("review search", () => {
  it.each(widgets)("%s filters before sorting", (_name, rel) => {
    const src = read(rel);
    expect(src).toContain("const matching = term");
    // Sorting the filtered set, not the whole one.
    expect(src).toContain("[...matching].sort");
    expect(src).not.toContain("[...reviews].sort");
  });

  it.each(widgets)("%s searches body, title and reviewer name", (_name, rel) => {
    expect(read(rel)).toContain("[r.body, r.reviewTitle, r.customerName]");
  });

  it.each(widgets)("%s counts what is shown, not the whole set", (_name, rel) => {
    // A count that ignores the filter contradicts the list beneath it.
    const src = read(rel);
    expect(src).toContain("${sorted.length}</span> Review");
    expect(src).not.toContain("${reviews.length}</span> Review");
  });

  it.each(widgets)("%s restores focus after re-rendering", (_name, rel) => {
    // The input is replaced on every keystroke; without this the second
    // character would go nowhere.
    const src = read(rel);
    expect(src).toContain("next.focus()");
    expect(src).toContain("setSelectionRange");
  });

  it.each(widgets)("%s escapes the term it echoes back", (_name, rel) => {
    expect(read(rel)).toContain("escapeHtml(searchTerm)");
  });
});
