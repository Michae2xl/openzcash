import { after } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgSheetImports } from "@/lib/db/schema";
import { refreshZcg } from "./refresh";

/** When the ZCG spreadsheet was last imported (most recent sheet import). */
export async function latestImportAt(): Promise<Date | null> {
  const [row] = await getDb()
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
 * cron is the primary trigger; this keeps it fresh between cron runs.
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
