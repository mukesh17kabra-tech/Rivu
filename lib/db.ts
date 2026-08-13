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

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  return client.$extends({
    name: "retry-transient-connection-errors",
    query: {
      $allModels: {
        $allOperations({ query, args }) {
          return withDbRetry(() => query(args));
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
