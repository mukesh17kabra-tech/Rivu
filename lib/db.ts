import { PrismaClient } from "@prisma/client";

/**
 * Neon (like most serverless Postgres) suspends the compute endpoint after a
 * period of inactivity. The first query afterwards fails outright with
 * `P1001 Can't reach database server` while the endpoint wakes — which
 * surfaced as a 500 page. That is the exact class of error Shopify's review
 * rejects, and the most likely thing a reviewer sees when they open an app
 * that has been idle for days.
 *
 * The retry lives inside the Prisma client as a query extension so *every*
 * caller gets it — pages, API routes, webhooks and crons alike — rather than
 * relying on each query site remembering to opt in.
 *
 * Only connection-establishment failures are retried, never query errors, so
 * a genuine bug still fails fast.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  { attempts = 3, baseDelayMs = 300 } = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (!isTransientConnectionError(err)) throw err;
      lastError = err;
      if (attempt < attempts - 1) {
        // 300ms then 900ms — comfortably covers a Neon wake-up.
        await new Promise((r) => setTimeout(r, baseDelayMs * 3 ** attempt));
      }
    }
  }

  throw lastError;
}

function isTransientConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  // P1001 = can't reach server, P1002 = timed out, P1017 = connection closed.
  const code =
    (err as { errorCode?: string }).errorCode ?? (err as { code?: string }).code;
  if (code === "P1001" || code === "P1002" || code === "P1017") return true;

  if ((err as { name?: string }).name === "PrismaClientInitializationError") {
    return true;
  }

  const message = String((err as { message?: string }).message ?? "");
  return (
    message.includes("Can't reach database server") ||
    message.includes("Connection terminated") ||
    message.includes("Timed out fetching a new connection")
  );
}

/**
 * A query failing because the schema is behind the code.
 *
 * P2022 = column does not exist, P2021 = table does not exist. Both mean the
 * deployed code knows about something the database hasn't got yet.
 */
export function isMissingSchemaError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code =
    (err as { errorCode?: string }).errorCode ?? (err as { code?: string }).code;
  if (code === "P2022" || code === "P2021") return true;

  const message = String((err as { message?: string }).message ?? "");
  return (
    message.includes("does not exist in the current database") ||
    /column .* does not exist/i.test(message)
  );
}

/**
 * Runs the pending migrations, then retries the query once.
 *
 * Migrations are applied lazily by lib/db-migrate.ts, but only API routes ever
 * called it — no server page did. So adding a column and deploying broke the
 * app entry page instantly: Prisma selects every scalar column unless given an
 * explicit `select`, and ~30 call sites use a bare findUnique. The first thing
 * a merchant saw on opening the app was an error page.
 *
 * Healing here rather than at those call sites means it holds for the next
 * column too, without thirty chances to forget. Imported lazily because
 * db-migrate imports this module.
 */
export async function withSchemaHeal<T>(
  operation: () => Promise<T>,
  migrate: () => Promise<void> = async () => {
    // Imported lazily because db-migrate imports this module.
    const { runAutoMigrations } = await import("./db-migrate");
    await runAutoMigrations({ force: true });
  }
): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    if (!isMissingSchemaError(err)) throw err;
    await migrate();
    // Retried exactly once. The migration statements swallow their own errors,
    // so "ran" does not mean "worked" — if the column still isn't there the
    // error must surface rather than spin.
    return operation();
  }
}

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  return client.$extends({
    name: "retry-transient-connection-errors",
    query: {
      $allModels: {
        $allOperations({ query, args }) {
          return withSchemaHeal(() => withDbRetry(() => query(args)));
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma?: ExtendedPrismaClient;
};

export const db: ExtendedPrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
