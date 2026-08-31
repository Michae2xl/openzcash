import { after } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgSheetImports } from "@/lib/db/schema";
import { refreshZcg } from "./refresh";

const REFRESH_MARKER = "refresh:marker";

/** When the complete ZCG spreadsheet set was last imported successfully. */
export async function latestImportAt(): Promise<Date | null> {
  const db = getDb();
  const [marker] = await db
    .select({ at: zcgSheetImports.fetchedAt })
    .from(zcgSheetImports)
    .where(eq(zcgSheetImports.id, REFRESH_MARKER))
    .limit(1);
  if (marker?.at) return new Date(marker.at);

  // Legacy/bootstrap fallback for a database imported before the marker was
  // introduced. Once the first complete refresh succeeds, the marker wins.
  const [row] = await db
    .select({
      at: sql<string | Date | null>`max(${zcgSheetImports.fetchedAt})`,
    })
    .from(zcgSheetImports);
  return row?.at ? new Date(row.at) : null;
}

const STALE_MS = 6 * 60 * 60 * 1000; // re-import if data is older than 6h
const COOLDOWN_MS = 30 * 60 * 1000; // never trigger more than every 30 min
let lastTriggered = 0;

/**
 * Re-import when the data is stale. Called from a server page render; awaits
 * only the (cheap) freshness check, never the import itself, so the page is
 * never blocked. The import is scheduled via next/server `after()` so the
 * serverless runtime keeps the instance alive until it finishes (a plain
 * fire-and-forget promise is killed once the response flushes). On Vercel the
 * cron is the primary trigger; this keeps it fresh between cron runs. Only a
 * complete refresh advances latestImportAt(), so one successful tab cannot
 * hide a persistently failing sibling tab.
 */
export async function maybeAutoRefresh(): Promise<void> {
  const now = Date.now();
  if (now - lastTriggered < COOLDOWN_MS) return;
  const at = await latestImportAt();
  const age = at ? now - at.getTime() : Infinity;
  if (age < STALE_MS) return;
  lastTriggered = now;
  after(() =>
    refreshZcg().catch(() => {
      /* surfaced via the stale "synced … ago" indicator */
    }),
  );
}
