import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * The list has to update when a review is submitted.
 *
 * It didn't: the shopper wrote a review, saw "thanks", and then looked at a
 * review section that did not contain it — which is indistinguishable from the
 * review having been lost. Only a page reload brought it in.
 *
 * The message was wrong too. It always said "pending approval", including on
 * the stores that publish immediately, so the one sentence that could have
 * explained the absence instead described a setting the merchant wasn't using.
 */

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const widgets: [string, string][] = [
  ["public widget", "public/widget.js"],
  ["theme extension widget", "extensions/rivu-reviews/assets/rivu-widget.js"],
];

describe("the API tells the widget what happened", () => {
  const route = read("app/api/reviews/submit/route.ts");

  it("returns whether the review was published", () => {
    expect(route).toContain("approved: shopRecord.autoApproveReviews,");
    // Twice: once when creating the row, once in the response.
    const uses = (route.match(/approved: shopRecord\.autoApproveReviews/g) || []).length;
    expect(uses).toBe(2);
  });

  it("still returns the discount code alongside it", () => {
    // The reward is issued regardless of approval, and dropping it from the
    // response would lose the shopper their code.
    const response = route.slice(route.lastIndexOf("return withCors("));
    expect(response).toContain("discountCode");
    expect(response).toContain("success: true");
  });
});

describe.each(widgets)("%s refreshes after a submission", (_name, rel) => {
  const src = read(rel);
  const refresh = src.slice(
    src.indexOf("async function refreshReviews"),
    src.indexOf("// ─── Modal")
  );

  it("re-reads the list rather than inserting the review locally", () => {
    // The server decides the id, the date, whether it publishes at all, and
    // how it moves the average and the breakdown. Rebuilding that here would
    // be a second implementation of the summary, free to disagree.
    expect(refresh).toContain("/api/reviews/list?shop=");
    expect(refresh).toContain("reviews = data.reviews");
    expect(refresh).toContain("summary = data.summary");
  });

  it("returns to the first page", () => {
    // The new review is at the top under the default sort; staying on a deeper
    // page would hide the thing the shopper just wrote.
    expect(refresh).toContain("shownCount = REVIEWS_PER_PAGE");
  });

  it("rebuilds and re-wires, so the new card is interactive", () => {
    // Without rewireMain the vote buttons and read-more on the new markup are
    // inert until the next reload.
    expect(refresh).toContain("main.innerHTML = buildMain()");
    expect(refresh).toContain("rewireMain()");
  });

  it("stays silent if the refresh itself fails", () => {
    // The review is saved either way; an error toast here would suggest
    // otherwise.
    expect(refresh).toContain("catch");
  });

  it("is called from the submit success path", () => {
    expect(src).toContain("if (published) await refreshReviews();");
  });

  it("does not refresh when the review is held for moderation", () => {
    // Nothing new would come back, and the list would flash for no reason.
    expect(src).toContain("const published = data.approved !== false;");
  });

  it("tells the shopper which of the two happened", () => {
    const block = src.slice(src.indexOf("const published = data.approved"));
    expect(block.slice(0, 800)).toContain("Your review is now live.");
    expect(block.slice(0, 800)).toContain("Your review is pending approval.");
  });

  it("treats a missing approved field as published", () => {
    // An older API deployment doesn't send it, and the default setting is to
    // publish — so "!== false" rather than "=== true".
    expect(src).toContain("data.approved !== false");
    expect(src).not.toContain("data.approved === true");
  });
});
