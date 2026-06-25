// Boot-time DB migration using ONLY production deps (drizzle-orm migrator +
// postgres), so it works in the pruned runtime image where drizzle-kit (a
// devDependency) is absent. Best-effort: logs and exits 0 even on failure, so
// the app still boots and the error is visible in the runtime logs.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL not set — skipping migrations");
  process.exit(0);
}

try {
  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);
  console.log("[migrate] applying migrations from ./drizzle …");
  await migrate(db, { migrationsFolder: "./drizzle" });
  await sql.end();
  console.log("[migrate] migrations applied");
} catch (e) {
  console.error("[migrate] FAILED:", e instanceof Error ? e.message : e);
}
process.exit(0);
