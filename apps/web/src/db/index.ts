import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { cache } from "react";
import * as schema from "./schema";

/**
 * Database access.
 * - Locally / in tests: one shared connection pool per process (reused across hot reloads).
 * - On Cloudflare Workers: a socket can't be reused across requests, so each request
 *   gets its own small client, connecting through Hyperdrive (pooled, near the database)
 *   when the HYPERDRIVE binding exists, else straight to DATABASE_URL.
 */
type DB = ReturnType<typeof drizzle<typeof schema>>;

const onWorkers = () => typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL) || (onWorkers() && Boolean(hyperdriveUrl()));
}

function hyperdriveUrl(): string | undefined {
  try {
    const env = getCloudflareContext().env as unknown as { HYPERDRIVE?: { connectionString: string } };
    return env.HYPERDRIVE?.connectionString;
  } catch {
    return undefined;
  }
}

const perRequestDb = cache((): DB => {
  const url = hyperdriveUrl() ?? process.env.DATABASE_URL!;
  return drizzle(postgres(url, { max: 5, fetch_types: false, prepare: false }), { schema });
});

const g = globalThis as unknown as { pg?: ReturnType<typeof postgres>; db?: DB };

export function getDb(): DB {
  if (onWorkers()) return perRequestDb();
  g.pg ??= postgres(process.env.DATABASE_URL!, { max: 5, prepare: false });
  return (g.db ??= drizzle(g.pg, { schema }));
}

export { schema };
