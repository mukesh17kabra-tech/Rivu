import { describe, it, expect, vi } from "vitest";
import { withSchemaHeal, isMissingSchemaError } from "../lib/db";

/**
 * The schema self-heal in lib/db.ts.
 *
 * Adding customTemplateCss and deploying took the live app down: migrations
 * are applied lazily, but only API routes ever called them — no server page
 * did. Prisma selects every scalar column unless given an explicit `select`,
 * and the app entry page uses a bare findUnique, so the first thing a merchant
 * saw on opening the app was an error page.
 *
 * Tested through the exported helper rather than by mocking Prisma: the logic
 * is what matters, and a fake client tests the fake.
 */

function prismaError(code: string, message = "boom") {
  return Object.assign(new Error(message), { code });
}

describe("isMissingSchemaError", () => {
  it("recognises a missing column and a missing table", () => {
    expect(isMissingSchemaError(prismaError("P2022"))).toBe(true);
    expect(isMissingSchemaError(prismaError("P2021"))).toBe(true);
  });

  it("recognises the message form, since the code isn't always set", () => {
    expect(
      isMissingSchemaError(
        new Error(
          "The column `Shop.customTemplateCss` does not exist in the current database."
        )
      )
    ).toBe(true);
    expect(
      isMissingSchemaError(new Error('column "customTemplateCss" does not exist'))
    ).toBe(true);
  });

  it("does not mistake an ordinary query error for a schema problem", () => {
    // Migrating in response to a real bug would hide it.
    expect(isMissingSchemaError(prismaError("P2002", "Unique constraint failed"))).toBe(
      false
    );
    expect(isMissingSchemaError(prismaError("P1001", "Can't reach database"))).toBe(
      false
    );
    expect(isMissingSchemaError(new Error("something else"))).toBe(false);
    expect(isMissingSchemaError(null)).toBe(false);
    expect(isMissingSchemaError("nope")).toBe(false);
  });
});

describe("withSchemaHeal", () => {
  it("migrates once and retries when a column is missing", async () => {
    const migrate = vi.fn(async () => {});
    let attempt = 0;
    const op = vi.fn(async () => {
      if (++attempt === 1) throw prismaError("P2022");
      return "ok";
    });

    await expect(withSchemaHeal(op, migrate)).resolves.toBe("ok");
    expect(migrate).toHaveBeenCalledOnce();
    expect(op).toHaveBeenCalledTimes(2);
  });

  it("migrates before retrying, not after", async () => {
    const order: string[] = [];
    let attempt = 0;
    const op = async () => {
      order.push("query");
      if (++attempt === 1) throw prismaError("P2022");
      return "ok";
    };

    await withSchemaHeal(op, async () => {
      order.push("migrate");
    });

    expect(order).toEqual(["query", "migrate", "query"]);
  });

  it("does nothing extra when the query succeeds", async () => {
    const migrate = vi.fn(async () => {});
    const op = vi.fn(async () => "ok");

    await expect(withSchemaHeal(op, migrate)).resolves.toBe("ok");
    expect(migrate).not.toHaveBeenCalled();
    expect(op).toHaveBeenCalledOnce();
  });

  it("fails fast on an ordinary query error", async () => {
    const migrate = vi.fn(async () => {});
    const op = vi.fn(async () => {
      throw prismaError("P2002", "Unique constraint failed");
    });

    await expect(withSchemaHeal(op, migrate)).rejects.toThrow(/Unique constraint/);
    expect(migrate).not.toHaveBeenCalled();
    expect(op).toHaveBeenCalledOnce();
  });

  it("surfaces the error instead of looping when migrating doesn't help", async () => {
    // The migration statements swallow their own errors, so a statement that
    // failed for a real reason would leave the column missing. That must
    // surface rather than retry forever.
    const migrate = vi.fn(async () => {});
    const op = vi.fn(async () => {
      throw prismaError("P2022", "column does not exist");
    });

    await expect(withSchemaHeal(op, migrate)).rejects.toThrow(/column does not exist/);
    expect(migrate).toHaveBeenCalledOnce();
    expect(op).toHaveBeenCalledTimes(2);
  });

  it("propagates a failure from the migration itself", async () => {
    const op = async () => {
      throw prismaError("P2022");
    };

    await expect(
      withSchemaHeal(op, async () => {
        throw new Error("migration exploded");
      })
    ).rejects.toThrow(/migration exploded/);
  });

  it("forces the migration, or the retry is pointless", async () => {
    // runAutoMigrations has a per-process "already ran" flag; without force the
    // retry re-runs the same failing query against the same schema.
    const src = await import("fs").then((fs) =>
      fs.readFileSync(new URL("../lib/db.ts", import.meta.url), "utf8")
    );
    expect(src).toContain("runAutoMigrations({ force: true })");
  });
});
