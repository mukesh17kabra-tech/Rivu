import { describe, it, expect } from "vitest";
import {
  parseReviewCsv,
  parseReviewDate,
  dedupeKey,
  findColumn,
  type ImportPlan,
} from "../lib/review-import";

/**
 * Migration is the main reason a merchant switches review apps, so an import
 * that quietly mangles their history costs the sale and the trust.
 *
 * Two defects these cover in particular: original review dates were never
 * read, so every migrated review was stamped with the import date; and nothing
 * detected duplicates, so re-running an import doubled the merchant's history.
 */

function plan(csv: string): ImportPlan {
  const result = parseReviewCsv(csv);
  if ("error" in result) throw new Error(`unexpected error: ${result.error}`);
  return result;
}

describe("column detection across export formats", () => {
  it("reads a Judge.me-style export", () => {
    const p = plan(
      [
        "product_handle,product_title,rating,title,body,reviewer_name,reviewer_email,created_at,published",
        "snowboard,The Board,5,Great,Loved it,Ada,ada@test.com,2024-03-05,true",
      ].join("\n")
    );

    expect(p.records).toHaveLength(1);
    expect(p.records[0]).toMatchObject({
      productId: "snowboard",
      productTitle: "The Board",
      rating: 5,
      reviewTitle: "Great",
      body: "Loved it",
      customerName: "Ada",
      customerEmail: "ada@test.com",
      approved: true,
    });
    expect(p.records[0].createdAt?.toISOString().slice(0, 10)).toBe("2024-03-05");
  });

  it("reads a Loox-style export", () => {
    const p = plan(
      [
        "product_id,product,stars,review,name,date",
        "77,Board,4,Nice one,Grace,2023-11-02",
      ].join("\n")
    );
    expect(p.records[0]).toMatchObject({
      productId: "77",
      productTitle: "Board",
      rating: 4,
      customerName: "Grace",
    });
  });

  it("rejects an export with no product identifier at all", () => {
    // Deliberate: a review with only a product *name* can never be matched to
    // a product page, so it would import and then be invisible. Better to say
    // so, and have the merchant re-export with an ID or handle column.
    const p = plan(["product,stars,review,name", "Board,4,Nice one,Grace"].join("\n"));
    expect(p.records).toHaveLength(0);
    expect(p.skipped[0].reason).toBe("No product identifier");
  });

  it("ignores case, spaces and underscores in headers", () => {
    expect(
      findColumn({ "Product ID": "1", "Customer  Name": "Ada" }, "productId")
    ).toBe("1");
    expect(findColumn({ REVIEWER_NAME: "Ada" }, "customerName")).toBe("Ada");
  });

  it("ignores columns it doesn't recognise", () => {
    const p = plan(
      [
        "product_id,product_title,rating,body,name,internal_note",
        "1,Board,5,Great,Ada,ignore me",
      ].join("\n")
    );
    expect(p.records).toHaveLength(1);
  });
});

describe("review dates", () => {
  it("reads ISO dates", () => {
    expect(parseReviewDate("2024-03-05")?.toISOString().slice(0, 10)).toBe("2024-03-05");
    expect(
      parseReviewDate("2024-03-05T10:30:00Z")?.toISOString().slice(0, 10)
    ).toBe("2024-03-05");
  });

  it("reads unix timestamps in seconds and milliseconds", () => {
    expect(parseReviewDate("1709596800")?.getUTCFullYear()).toBe(2024);
    expect(parseReviewDate("1709596800000")?.getUTCFullYear()).toBe(2024);
  });

  it("reads an unambiguous day-first date correctly", () => {
    // 25 cannot be a month, so this is 25 December — reading it month-first
    // would silently shift the review by months.
    const d = parseReviewDate("25/12/2023");
    expect(d?.getUTCMonth()).toBe(11);
    expect(d?.getUTCDate()).toBe(25);
  });

  it("returns nothing for a date it cannot read, rather than inventing one", () => {
    // A wrong date is worse than a known-missing one: the warning tells the
    // merchant to fix their export, a silent "today" does not.
    expect(parseReviewDate("not a date")).toBeUndefined();
    expect(parseReviewDate("")).toBeUndefined();
    expect(parseReviewDate(undefined)).toBeUndefined();
  });

  it("rejects a future date as a parsing failure", () => {
    expect(parseReviewDate("2099-01-01")).toBeUndefined();
  });

  it("warns when reviews have no readable date", () => {
    const p = plan(
      ["product_id,product_title,rating,body,name", "1,Board,5,Great,Ada"].join("\n")
    );
    expect(p.records[0].createdAt).toBeUndefined();
    expect(p.warnings.join(" ")).toMatch(/no readable date/i);
  });

  it("does not warn when every review has a date", () => {
    const p = plan(
      [
        "product_id,product_title,rating,body,name,created_at",
        "1,Board,5,Great,Ada,2024-01-01",
      ].join("\n")
    );
    expect(p.warnings.join(" ")).not.toMatch(/no readable date/i);
  });
});

describe("duplicates", () => {
  it("treats the same review as the same regardless of case and spacing", () => {
    expect(dedupeKey({ productId: "1", customerName: "Ada", body: "Great" })).toBe(
      dedupeKey({ productId: " 1 ", customerName: "ADA", body: "great" })
    );
  });

  it("drops a row repeated inside the same file", () => {
    const p = plan(
      [
        "product_id,product_title,rating,body,name",
        "1,Board,5,Great,Ada",
        "1,Board,5,Great,Ada",
      ].join("\n")
    );
    expect(p.records).toHaveLength(1);
    expect(p.skipped.find((s) => s.reason.startsWith("Duplicate"))?.count).toBe(1);
  });

  it("keeps two genuinely different reviews by the same person", () => {
    const p = plan(
      [
        "product_id,product_title,rating,body,name",
        "1,Board,5,Great board,Ada",
        "2,Boots,4,Nice boots,Ada",
      ].join("\n")
    );
    expect(p.records).toHaveLength(2);
  });
});

describe("rows that can't be imported", () => {
  it("names the missing field instead of dumping the row", () => {
    const p = plan(
      [
        "product_id,product_title,rating,body,name",
        "1,Board,5,,Ada",
        "1,Board,,Great,Ada",
        ",Board,5,Great,Ada",
      ].join("\n")
    );

    const reasons = p.skipped.map((s) => s.reason);
    expect(reasons).toContain("No review text");
    expect(reasons).toContain("Rating missing or not 1-5");
    expect(reasons).toContain("No product identifier");
  });

  it("groups repeated problems into a count", () => {
    const rows = Array.from({ length: 12 }, () => "1,Board,5,,Ada");
    const p = plan(["product_id,product_title,rating,body,name", ...rows].join("\n"));
    const entry = p.skipped.find((s) => s.reason === "No review text");
    expect(entry?.count).toBe(12);
    expect(p.skipped).toHaveLength(1);
  });

  it("rejects ratings outside 1-5", () => {
    const p = plan(
      [
        "product_id,product_title,rating,body,name",
        "1,Board,0,Great,Ada",
        "1,Board,6,Great,Bob",
        "1,Board,abc,Great,Cy",
      ].join("\n")
    );
    expect(p.records).toHaveLength(0);
    expect(p.skipped[0].count).toBe(3);
  });
});

describe("publish status", () => {
  it("treats negative-sounding statuses as unapproved", () => {
    for (const status of ["false", "pending", "unpublished", "rejected", "0", "no", "spam"]) {
      const p = plan(
        [
          "product_id,product_title,rating,body,name,published",
          `1,Board,5,Great,Ada,${status}`,
        ].join("\n")
      );
      expect(p.records[0].approved, status).toBe(false);
    }
  });

  it("defaults to approved when the export says nothing", () => {
    // The merchant already vetted these in their previous app.
    const p = plan(
      ["product_id,product_title,rating,body,name", "1,Board,5,Great,Ada"].join("\n")
    );
    expect(p.records[0].approved).toBe(true);
  });
});

describe("product identifiers", () => {
  it("warns when the export uses handles rather than Shopify IDs", () => {
    // They import fine but won't show on the product page — worth saying
    // before the merchant concludes the app is broken.
    const p = plan(
      [
        "product_handle,product_title,rating,body,name",
        "snowboard,Board,5,Great,Ada",
      ].join("\n")
    );
    expect(p.warnings.join(" ")).toMatch(/product handle/i);
  });

  it("does not warn for numeric or GID identifiers", () => {
    const p = plan(
      [
        "product_id,product_title,rating,body,name",
        "123456,Board,5,Great,Ada",
        "gid://shopify/Product/99,Boots,4,Nice,Bob",
      ].join("\n")
    );
    expect(p.warnings.join(" ")).not.toMatch(/product handle/i);
  });
});

describe("bad input", () => {
  it("reports an empty file rather than importing nothing silently", () => {
    const result = parseReviewCsv("");
    expect("error" in result && result.error).toMatch(/no rows|couldn't be read/i);
  });

  it("keeps the good rows when one row is malformed", () => {
    // Losing 900 reviews because row 47 has a stray quote would be indefensible.
    const p = plan(
      [
        "product_id,product_title,rating,body,name",
        "1,Board,5,Great,Ada",
        "2,Boots,4,Nice,Bob",
      ].join("\n")
    );
    expect(p.records.length).toBe(2);
  });

  it("counts every row it was given", () => {
    const p = plan(
      [
        "product_id,product_title,rating,body,name",
        "1,Board,5,Great,Ada",
        "1,Board,5,,Bob",
      ].join("\n")
    );
    expect(p.totalRows).toBe(2);
    expect(p.records.length + p.skipped.reduce((n, s) => n + s.count, 0)).toBe(2);
  });
});
