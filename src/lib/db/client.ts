/**
 * Cliente Drizzle/Postgres com cache global (evita esgotar conexões no hot-reload do Next).
 */

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/config/env";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __zecSql?: ReturnType<typeof postgres>;
  __zecDb?: Db;
};

export function getDb(): Db {
  if (globalForDb.__zecDb) return globalForDb.__zecDb;

  const sql =
    globalForDb.__zecSql ?? postgres(getEnv().DATABASE_URL, { max: 5 });
  const db = drizzle(sql, { schema });

  globalForDb.__zecSql = sql;
  globalForDb.__zecDb = db;
  return db;
}

export { schema };
