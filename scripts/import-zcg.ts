/**
 * Importa a planilha pública do ZCG para o Postgres.
 *
 * Uso: npm run import-zcg
 * Fase 1: importa as 5 abas de desembolso (Grants, IC, Coinholder, Discretionary,
 * Monthly) para o ledger off-chain `zcg_disbursements`. Idempotente.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { importDisbursements } =
    await import("../src/lib/zcg/import-disbursements");
  const results = await importDisbursements();
  console.table(results);

  const { importSnapshots } = await import("../src/lib/zcg/import-snapshots");
  const snaps = await importSnapshots();
  console.table(snaps);

  const { importProposals } = await import("../src/lib/zcg/import-proposals");
  console.table(await importProposals());

  const { importTotals } = await import("../src/lib/zcg/import-totals");
  console.table(await importTotals());

  const total = results.reduce((s, r) => s + r.imported, 0);
  const errors = results.filter((r) => r.status.startsWith("error"));
  console.log(`\nTotal importado: ${total} desembolsos`);
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
