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
  console.table(r.meetings);

  const total = r.disbursements.reduce((s, x) => s + x.imported, 0);
  console.log(`\nTotal importado: ${total} desembolsos (${r.ms}ms)`);
  if (r.sourceWarnings.length) {
    console.warn(
      `Fonte oficial sinaliza updates_required em: ${r.sourceWarnings.join(", ")}`,
    );
  }
  if (!r.ok) {
    console.error("Refresh incompleto: pelo menos uma aba/derivação falhou.");
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
