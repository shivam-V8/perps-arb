import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * One shared connection pool per server process (reused across hot reloads in dev).
 * DATABASE_URL: local Docker Postgres in dev, any hosted Postgres (e.g. Neon) in production.
 */
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function client() {
  return (globalForDb.pg ??= postgres(process.env.DATABASE_URL!, { max: 5, prepare: false }));
}

type DB = ReturnType<typeof drizzle<typeof schema>>;
const globalDb = globalThis as unknown as { db?: DB };

export function getDb(): DB {
  return (globalDb.db ??= drizzle(client(), { schema }));
}

export { schema };
