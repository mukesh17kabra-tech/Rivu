import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

import {
  checkReviewQuota,
  checkVideoAllowed,
  qrProductLimit,
  usageWarning,
  startOfMonth,
  planOf,
} from "@/lib/usage-limits";
import { PLANS } from "@/lib/billing";

/**
 * These limits were printed on the pricing cards and the App Store listing
 * and enforced nowhere: a Free shop got unlimited reviews, unlimited QR codes
 * and video uploads it wasn't entitled to. Both an inaccurate listing and a
 * reason nobody ever needed to upgrade.
 *
 * Every number here is read from PLANS rather than typed in, so changing a
 * plan's allowance cannot leave these tests asserting the old one.
 */

describe("monthly review quota", () => {
  it("allows a shop below its cap", () => {
    expect(checkReviewQuota("free", 0).allowed).toBe(true);
    expect(checkReviewQuota("free", PLANS.free.reviewsPerMonthCap - 1).allowed).toBe(true);
  });

  it("refuses at the cap, not one past it", () => {
    // Off-by-one here either gives away a free review or steals a paid one.
    const cap = PLANS.free.reviewsPerMonthCap;
    expect(checkReviewQuota("free", cap).allowed).toBe(false);
    expect(checkReviewQuota("free", cap + 5).allowed).toBe(false);
  });

  it("scales with the plan", () => {
    const freeCap = PLANS.free.reviewsPerMonthCap;
    // What stops a Free shop is fine for Growth.
    expect(checkReviewQuota("growth", freeCap).allowed).toBe(true);
    expect(checkReviewQuota("growth", PLANS.growth.reviewsPerMonthCap).allowed).toBe(false);
  });

  it("never limits Pro", () => {
    expect(checkReviewQuota("pro", 1_000_000).allowed).toBe(true);
  });

  it("names the plan to upgrade to", () => {
    const free = checkReviewQuota("free", 999);
    const growth = checkReviewQuota("growth", 99_999);
    expect(free.allowed === false && free.upgradeTo).toBe("growth");
    expect(growth.allowed === false && growth.upgradeTo).toBe("pro");
  });

  it("treats an unrecognised plan as free", () => {
    // Fail closed: an unknown plan string must not grant unlimited usage.
    for (const plan of ["", "trial", "PRO", "enterprise"]) {
      expect(planOf(plan)).toBe("free");
      expect(checkReviewQuota(plan, PLANS.free.reviewsPerMonthCap).allowed).toBe(false);
    }
  });
});

describe("video reviews", () => {
  it("are refused on free", () => {
    expect(checkVideoAllowed("free").allowed).toBe(false);
  });

  it.each(["growth", "pro"])("are allowed on %s", (plan) => {
    expect(checkVideoAllowed(plan).allowed).toBe(true);
  });

  it("matches the advertised caps", () => {
    expect(PLANS.free.videoReviewCap).toBe(0);
    expect(PLANS.growth.videoReviewCap).toBeGreaterThan(0);
  });
});

describe("per-product QR codes", () => {
  it("limits free to the advertised number", () => {
    expect(qrProductLimit("free")).toBe(PLANS.free.qrProductCap);
    expect(Number.isFinite(qrProductLimit("free"))).toBe(true);
  });

  it.each(["growth", "pro"])("is unlimited on %s", (plan) => {
    expect(Number.isFinite(qrProductLimit(plan))).toBe(false);
  });
});

describe("the merchant is warned before they hit the wall", () => {
  const cap = PLANS.free.reviewsPerMonthCap;

  it("stays quiet well below the cap", () => {
    expect(usageWarning("free", 0)).toBeNull();
    expect(usageWarning("free", Math.floor(cap * 0.5))).toBeNull();
  });

  it("warns from 80%", () => {
    expect(usageWarning("free", Math.ceil(cap * 0.8))).toBeTruthy();
  });

  it("is explicit once the cap is reached", () => {
    const message = usageWarning("free", cap);
    expect(message).toBeTruthy();
    // A merchant should not have to infer that reviews are being dropped.
    expect(message!.toLowerCase()).toContain("won't be saved");
  });

  it("never warns an unlimited plan", () => {
    expect(usageWarning("pro", 10_000)).toBeNull();
  });
});

describe("the month boundary", () => {
  it("is the first of the month at midnight UTC", () => {
    const d = startOfMonth(new Date("2026-08-20T13:45:12.345Z"));
    expect(d.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });

  it("resets on a date the merchant can predict", () => {
    // Calendar month, not a rolling window — "500 reviews/month" has to mean
    // something a merchant can reason about.
    const jan = startOfMonth(new Date("2026-01-15T12:00:00Z"));
    const feb = startOfMonth(new Date("2026-02-15T12:00:00Z"));
    expect(jan.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(feb.toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });

  it("is timezone-independent", () => {
    // The original used local time, so the boundary moved with the machine's
    // offset and counted the wrong reviews around the 1st.
    const lateJan = startOfMonth(new Date("2026-01-31T23:59:59Z"));
    const earlyFeb = startOfMonth(new Date("2026-02-01T00:00:01Z"));
    expect(lateJan.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(earlyFeb.toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });
});

describe("the quota is enforced where reviews are created", () => {
  const submit = readFileSync(
    path.resolve(__dirname, "../app/api/reviews/submit/route.ts"),
    "utf8"
  );

  it("checks before writing the review", () => {
    const checkAt = submit.indexOf("checkReviewQuota");
    const createAt = submit.indexOf("db.review.create");
    expect(checkAt).toBeGreaterThan(-1);
    expect(checkAt).toBeLessThan(createAt);
  });

  it("strips video rather than rejecting the whole review", () => {
    // Losing a genuine review over an attachment would cost the merchant more
    // than the upsell is worth.
    expect(submit).toContain("checkVideoAllowed");
    expect(submit).toContain("videoUrl = undefined");
  });
});

describe("the cards no longer promise reminder emails", () => {
  const cards = readFileSync(
    path.resolve(__dirname, "../components/PlanCards.tsx"),
    "utf8"
  );

  it("has no reminder-email bullet", () => {
    // orders/create is unsubscribed pending protected-customer-data approval,
    // so nothing creates the rows the cron sends from. Restore these only once
    // the webhook is registered and verified.
    expect(cards).not.toContain("reminder emails/month");
    expect(cards).not.toContain("Automated review-reminder emails");
    expect(cards).not.toContain("Unlimited reminder emails");
  });
});
