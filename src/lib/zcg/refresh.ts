import { getDb } from "@/lib/db/client";
import { zcgSheetImports } from "@/lib/db/schema";
import { importDisbursements } from "./import-disbursements";
import { importProposals } from "./import-proposals";
import { importSnapshots } from "./import-snapshots";
import { importTotals } from "./import-totals";

const REFRESH_MARKER = "refresh:marker";

/** Stamp the last successful refresh, even when the sheet content is unchanged. */
async function markRefreshed(): Promise<void> {
  await getDb()
    .insert(zcgSheetImports)
    .values({
      id: REFRESH_MARKER,
      sheetGid: "refresh",
      sheetGroup: "live",
      contentSha256: "",
      rowCount: 0,
      sheetStatus: "ok",
      parsedOk: true,
    })
    .onConflictDoUpdate({
      target: zcgSheetImports.id,
      set: { fetchedAt: new Date() },
    });
}

/**
 * Re-imports the whole ZCG public spreadsheet into Postgres (disbursements,
 * snapshots, proposals, totals). Idempotent. Single source of truth for the
 * CLI (`npm run import-zcg`), the cron route and the stale-on-load trigger.
 */
export async function refreshZcg() {
  const startedAt = Date.now();
  const disbursements = await importDisbursements();
  const snapshots = await importSnapshots();
  const proposals = await importProposals();
  const totals = await importTotals();
  await markRefreshed();
  return {
    ms: Date.now() - startedAt,
    disbursements,
    snapshots,
    proposals,
    totals,
  };
}
