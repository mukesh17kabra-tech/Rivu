import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Helpful/unhelpful voting and pinned reviews.
 *
 * The two hard parts are not the buttons. Voting has to answer "who is this
 * voter" for anonymous shoppers with no account, and pinning has to answer
 * "where does a pinned review go" for every sort order at once.
 */

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const widgets: [string, string][] = [
  ["public widget", "public/widget.js"],
  ["theme extension widget", "extensions/rivu-reviews/assets/rivu-widget.js"],
];

/** Pulls the comparator out of the widget and runs it for real. */
function loadSorter(rel: string) {
  const src = read(rel);
  const start = src.indexOf("      const chosen = comparators[sortOrder] || byNewest;");
  const end = src.indexOf("      });", start) + 9;
  expect(start, `${rel}: pinned sort not found`).toBeGreaterThan(-1);

  const body = src.slice(start, end).replace(
    "const chosen = comparators[sortOrder] || byNewest;",
    ""
  );
  return new Function(
    "matching",
    "chosen",
    body.replace("return [...matching]", "return [...matching]")
  ) as (
    matching: unknown[],
    chosen: (a: never, b: never) => number
  ) => { id: string }[];
}

const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

function review(id: string, opts: { createdAt?: string; pinnedAt?: string | null } = {}) {
  return {
    id,
    createdAt: opts.createdAt ?? "2026-01-01T00:00:00Z",
    pinnedAt: opts.pinnedAt ?? null,
    rating: 5,
  };
}

describe.each(widgets)("%s pinned ordering", (_name, rel) => {
  const sort = loadSorter(rel);
  const ids = (rows: unknown[]) =>
    sort(rows, byNewest as never).map((r) => r.id);

  it("puts a pinned review first even when it is the oldest", () => {
    // The whole point: a merchant pins the review that answers the question
    // shoppers keep asking, and it has to be the one they read first.
    const rows = [
      review("new", { createdAt: "2026-06-01T00:00:00Z" }),
      review("pinned", { createdAt: "2020-01-01T00:00:00Z", pinnedAt: "2026-06-02T00:00:00Z" }),
    ];
    expect(ids(rows)).toEqual(["pinned", "new"]);
  });

  it("orders several pinned reviews by most recently pinned", () => {
    // Pinning a second review must not silently displace the first.
    const rows = [
      review("first", { pinnedAt: "2026-01-01T00:00:00Z" }),
      review("second", { pinnedAt: "2026-05-01T00:00:00Z" }),
      review("plain"),
    ];
    expect(ids(rows)).toEqual(["second", "first", "plain"]);
  });

  it("leaves unpinned reviews in the chosen order", () => {
    const rows = [
      review("old", { createdAt: "2020-01-01T00:00:00Z" }),
      review("new", { createdAt: "2026-01-01T00:00:00Z" }),
    ];
    expect(ids(rows)).toEqual(["new", "old"]);
  });

  it("keeps pinned first under a rating sort too", () => {
    // Sorting by lowest rating must not bury the merchant's chosen review.
    const byLowest = (a: { rating: number }, b: { rating: number }) =>
      a.rating - b.rating;
    const rows = [
      { ...review("bad"), rating: 1 },
      { ...review("pinned", { pinnedAt: "2026-01-01T00:00:00Z" }), rating: 5 },
    ];
    expect(sort(rows, byLowest as never).map((r) => r.id)).toEqual(["pinned", "bad"]);
  });

  it("does not reorder when nothing is pinned", () => {
    const rows = [review("a"), review("b"), review("c")];
    expect(ids(rows)).toEqual(["a", "b", "c"]);
  });
});

describe("the voter identity decision", () => {
  const route = read("app/api/reviews/vote/route.ts");

  it("never stores a raw IP address", () => {
    // An IP is personal data, and this app is already under Shopify's
    // protected customer data rules.
    expect(route).toContain("createHash(\"sha256\")");
    const schema = read("prisma/schema.prisma");
    const model = schema.slice(schema.indexOf("model ReviewVote"));
    expect(model).not.toMatch(/\bip\b/i);
    expect(model).toContain("voterKey");
  });

  it("salts the hash, so it cannot be recomputed from an IP", () => {
    expect(route).toContain("process.env.SHOPIFY_API_SECRET");
  });

  it("scopes the key per review, so a visitor can't be followed across them", () => {
    expect(route).toContain("[salt, shop, reviewId, ip, agent]");
  });

  it("takes the client IP from the left of x-forwarded-for", () => {
    // The rest of that header is proxies that appended themselves; using the
    // last entry would give every shopper behind the CDN the same key.
    expect(route).toContain('forwarded.split(",")[0]');
  });

  it("allows one vote per voter per review at the database level", () => {
    const schema = read("prisma/schema.prisma");
    const model = schema.slice(schema.indexOf("model ReviewVote"));
    expect(model).toContain("@@unique([reviewId, voterKey])");
  });
});

describe("vote counting", () => {
  const route = read("app/api/reviews/vote/route.ts");

  it("recomputes counts instead of incrementing them", () => {
    // An increment that runs twice, or a request that dies between writing the
    // vote and bumping the counter, leaves a number that no longer describes
    // the rows behind it.
    //
    // Both counts are checked. Asserting the string merely appears passed with
    // one of the two replaced by a constant, because the other still matched.
    const counts = (route.match(/tx\.reviewVote\.count\(/g) || []).length;
    expect(counts).toBe(2);
    expect(route).toContain("where: { reviewId, helpful: true }");
    expect(route).toContain("where: { reviewId, helpful: false }");
    expect(route).not.toMatch(/increment:/);
  });

  it("writes the vote and the counts in one transaction", () => {
    expect(route).toContain("db.$transaction");
  });

  it("refuses a review that does not belong to the shop", () => {
    // A review id alone would let anyone vote on any store's reviews.
    expect(route).toContain("shopId: shopRecord.id");
  });

  it("only counts votes on published reviews", () => {
    expect(route).toContain("approved: true");
  });

  it("accepts null to withdraw a vote", () => {
    expect(route).toContain("helpful: z.boolean().nullable()");
    expect(route).toContain("tx.reviewVote.deleteMany");
  });
});

describe.each(widgets)("%s voting UI", (_name, rel) => {
  const src = read(rel);

  it("remembers this browser's vote locally", () => {
    // The server dedupes by a hash it cannot hand back, and the list response
    // is identical for every shopper, so neither can say "you voted".
    expect(src).toContain("rivu_votes");
    expect(src).toContain("function rvGetVote");
  });

  it("survives storage being unavailable", () => {
    // localStorage throws rather than returning null in some private windows,
    // and a review widget must not break over that.
    const fn = src.slice(src.indexOf("function rvVotes"), src.indexOf("function rvGetVote"));
    expect(fn).toContain("try {");
    expect(fn).toContain("catch");
  });

  it("clicking the same vote again withdraws it", () => {
    expect(src).toContain('rvGetVote(reviewId) === choice ? null : choice');
  });

  it("updates the counts in place rather than re-rendering", () => {
    // A re-render would scroll the shopper away from the review they just
    // voted on.
    const block = src.slice(src.indexOf('el.querySelectorAll(".rv-vote")'));
    expect(block.slice(0, 2000)).toContain("countEl.textContent");
    expect(block.slice(0, 2000)).not.toContain("buildMain()");
  });

  it("ignores a second click while one is in flight", () => {
    // The guard itself, not just the flag. Deleting the early return left the
    // set and the delete behind, so a looser check stayed green while a double
    // click could fire two requests and race their responses.
    expect(src).toContain("if (btn.dataset.rvBusy) return;");
    expect(src).toContain('btn.dataset.rvBusy = "1";');
    expect(src).toContain("delete btn.dataset.rvBusy;");
  });

  it("shows a marker on a pinned review", () => {
    expect(src).toContain("rv-card-pin");
    expect(src).toContain("rev.pinnedAt");
  });

  it("styles votes and pins in custom mode too", () => {
    // Inline styles are suppressed for custom layouts.
    expect(src).toContain('".rv-vote{');
    expect(src).toContain('".rv-card-pin{');
  });
});

describe("the dashboard can pin and the storefront is told", () => {
  it("moderate accepts pin and unpin", () => {
    const route = read("app/api/reviews/moderate/route.ts");
    expect(route).toContain('action === "pin" || action === "unpin"');
    expect(route).toContain("shopId: shopRecord.id");
  });

  it("pinnedAt carries both the state and the order", () => {
    const route = read("app/api/reviews/moderate/route.ts");
    expect(route).toContain('pinnedAt: action === "pin" ? new Date() : null');
  });

  it("the list route sends the fields the widget needs", () => {
    const list = read("app/api/reviews/list/route.ts");
    for (const field of ["pinnedAt", "helpfulCount", "unhelpfulCount"]) {
      expect(list, field).toContain(`${field}: true`);
    }
  });

  it("the migration uses a valid dollar-quote", () => {
    // $ is not a valid delimiter — the statement throws, and this loop
    // swallows errors, so the foreign key would be silently absent.
    const migrate = read("lib/db-migrate.ts");
    expect(migrate).not.toMatch(/DO \$ BEGIN/);
    expect(migrate).toContain("ReviewVote_reviewId_fkey");
  });
});
