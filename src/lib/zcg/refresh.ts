import { getDb } from "@/lib/db/client";
import { zcgSheetImports } from "@/lib/db/schema";
import { recordChangelog, snapshotForChangelog } from "./changelog";
import { importDisbursements } from "./import-disbursements";
import { importMeetings } from "./import-meetings";
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

/** Runs an importer in isolation so one throwing does not abort the rest. */
async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

/**
 * Re-imports the whole ZCG public spreadsheet into Postgres (disbursements,
 * snapshots, proposals, totals). Idempotent. Single source of truth for the
 * CLI (`npm run import-zcg`), the cron route and the stale-on-load trigger.
 *
 * The freshness marker is stamped ONLY when at least one tab imported cleanly —
 * otherwise a total fetch failure (e.g. lost public access) would masquerade as
 * fresh data and suppress the stale-on-load self-heal. `ok` reflects that.
 */
export async function refreshZcg() {
  const startedAt = Date.now();
  // Pre-import snapshot for the "what changed" feed; never blocks the import.
  const changelogBefore = await snapshotForChangelog().catch(() => null);
  const disbursements = await safe(importDisbursements);
  const snapshots = await safe(importSnapshots);
  const proposals = await safe(importProposals);
  const totals = await safe(importTotals);
  const meetings = await safe(importMeetings);

  const ok =
    disbursements.some((r) => !r.status.startsWith("error")) ||
    proposals.some((r) => !r.status.startsWith("error")) ||
    totals.some((r) => !r.status.startsWith("error")) ||
    meetings.some((r) => !r.status.startsWith("error")) ||
    snapshots.some((r) => r.ok);

  if (ok) await markRefreshed();

  let changelogEntries = 0;
  if (ok && changelogBefore) {
    changelogEntries = await recordChangelog(changelogBefore).catch(() => 0);
  }

  return {
    changelogEntries,
    ms: Date.now() - startedAt,
    ok,
    disbursements,
    snapshots,
    proposals,
    totals,
    meetings,
  };
}
