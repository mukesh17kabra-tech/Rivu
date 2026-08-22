import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Whether a review is visible on the storefront.
 *
 * The reported confusion: "Publish automatically" was ticked and a review still
 * showed as Pending. The wiring was right — the setting decides what happens to
 * reviews as they arrive, and that one had arrived earlier — but nothing on
 * screen said so, and the only way to clear it was review by review.
 */

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const submit = read("app/api/reviews/submit/route.ts");
const moderate = read("app/api/reviews/moderate/route.ts");
const toggle = read("components/ModerationToggle.tsx");

describe("a new review respects the merchant's setting", () => {
  it("takes its approved state from the shop, not the request", () => {
    expect(submit).toContain("approved: shopRecord.autoApproveReviews");
  });

  it("never lets the request body decide whether it publishes", () => {
    // A shopper posting approved:true would publish straight past moderation.
    // Two things stop it: the field isn't in the schema, and the assignment
    // comes after the spread so it wins even if it ever is.
    const schemaBlock = submit.slice(
      submit.indexOf("const schema"),
      submit.indexOf("export async function")
    );
    expect(schemaBlock).not.toMatch(/\bapproved\b/);

    const createBlock = submit.slice(submit.indexOf("db.review.create"));
    const spreadAt = createBlock.indexOf("...data");
    const approvedAt = createBlock.indexOf("approved:");
    expect(spreadAt).toBeGreaterThan(-1);
    expect(approvedAt).toBeGreaterThan(spreadAt);
  });
});

describe("the pending queue can be cleared in one go", () => {
  it("the route accepts approveAll", () => {
    expect(moderate).toContain('"approveAll"');
    expect(moderate).toContain("updateMany");
  });

  it("approveAll is scoped to the merchant's own shop", () => {
    // Without shopId this would publish every pending review in the database.
    const block = moderate.slice(moderate.indexOf('action === "approveAll"'));
    const where = block.slice(block.indexOf("where:"), block.indexOf("data:"));
    expect(where).toContain("shopId: shopRecord.id");
    expect(where).toContain("approved: false");
  });

  it("approveAll is the one action not requiring a review id", () => {
    // It operates on the queue, so demanding an id would reject every call.
    expect(moderate).toContain('const needsId = action !== "approveAll"');
    expect(moderate).toContain("needsId && !reviewId");
  });

  it("still requires a review id for the single-review actions", () => {
    for (const action of ["approve", "reject", "unpublish"]) {
      expect(moderate).toContain(`"${action}"`);
    }
    expect(moderate).toMatch(/needsId && !reviewId/);
  });
});

describe("the merchant is told why a review is still pending", () => {
  it("explains the case where publishing is automatic", () => {
    // This is what was missing: the notice only rendered when the toggle was
    // off, so the confusing combination showed nothing at all.
    //
    // Anchored on the opening brace. Without it the needle is a substring of
    // "!autoApprove && pendingCount > 0", so the *other* branch satisfied this
    // assertion and deleting this one changed nothing.
    expect(toggle).toContain("{autoApprove && pendingCount > 0");
  });

  it("still warns when moderation is on", () => {
    expect(toggle).toContain("{!autoApprove && pendingCount > 0");
  });

  it("offers the bulk publish from that notice", () => {
    expect(toggle).toContain('action: "approveAll"');
    expect(toggle).toMatch(/Publish all|Publish it now/);
  });

  it("says the setting is not retroactive", () => {
    // The sentence is the actual fix; the button only acts on it. Whitespace
    // is collapsed first because JSX wraps prose across lines, so matching the
    // raw source would depend on where the formatter happened to break it.
    const prose = toggle.replace(/\s+/g, " ").toLowerCase();
    expect(prose).toMatch(/only applies to reviews from now on/);
    expect(prose).toMatch(/doesn&apos;t publish older ones/);
  });
});
