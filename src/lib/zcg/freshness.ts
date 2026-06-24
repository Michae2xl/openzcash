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
 * Fire-and-forget re-import when the data is stale. Called from a server page
 * render; awaits only the (cheap) freshness check, never the import itself, so
 * the page is never blocked. On Vercel the cron is the primary trigger; this
 * keeps it fresh in local/dev and between cron runs. Best-effort.
 */
export async function maybeAutoRefresh(): Promise<void> {
  const now = Date.now();
  if (now - lastTriggered < COOLDOWN_MS) return;
  const at = await latestImportAt();
  const age = at ? now - at.getTime() : Infinity;
  if (age < STALE_MS) return;
  lastTriggered = now;
  void refreshZcg().catch(() => {
    /* surfaced via the stale "synced … ago" indicator */
  });
}
