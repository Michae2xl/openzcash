// Boot-time seed for governance reference data (meetings, elections, links).
// These tables are admin-curated, NOT imported from the ZCG spreadsheet, so a
// fresh deploy would otherwise show an empty /zcg/meetings. Idempotent: ON
// CONFLICT DO NOTHING preserves any later admin edits. Prod deps only.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[seed] DATABASE_URL not set — skipping governance seed");
  process.exit(0);
}

const file = fileURLToPath(new URL("./governance-seed.json", import.meta.url));
const data = JSON.parse(readFileSync(file, "utf8"));
const sql = postgres(url, { max: 1 });

try {
  // `elected` is a jsonb column; pass it as JSON text so Postgres parses it.
  for (const r of data.zcg_elections ?? []) {
    if (r.elected != null && typeof r.elected !== "string") {
      r.elected = JSON.stringify(r.elected);
    }
  }
  for (const [table, rows] of Object.entries(data)) {
    if (!Array.isArray(rows) || rows.length === 0) continue;
    await sql`insert into ${sql(table)} ${sql(rows)} on conflict do nothing`;
    console.log(`[seed] ${table}: ${rows.length} rows ensured`);
  }
  console.log("[seed] governance seeded");
} catch (e) {
  console.error("[seed] FAILED:", e instanceof Error ? e.message : e);
}

await sql.end();
process.exit(0);
