/**
 * Manual ZCG spreadsheet import (debug/seed). Same work the cron and the
 * stale-on-load trigger run via refreshZcg(). Idempotent.
 *
 * Uso: npm run import-zcg
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { refreshZcg } = await import("../src/lib/zcg/refresh");
  const r = await refreshZcg();

  console.table(r.disbursements);
  console.table(r.snapshots);
  console.table(r.proposals);
  console.table(r.totals);

  const total = r.disbursements.reduce((s, x) => s + x.imported, 0);
  const errors = r.disbursements.filter((x) => x.status.startsWith("error"));
  console.log(`\nTotal importado: ${total} desembolsos (${r.ms}ms)`);
  if (errors.length) {
    console.error(`${errors.length} aba(s) com erro.`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
