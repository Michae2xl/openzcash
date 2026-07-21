import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  zechubAllocations,
  zechubPayouts,
  zechubTreasurySnapshots,
} from "@/lib/db/schema";

export type TreasurySnapshot = typeof zechubTreasurySnapshots.$inferSelect;
export type TreasuryAllocationRow = typeof zechubAllocations.$inferSelect;
export type TreasuryPayoutRow = typeof zechubPayouts.$inferSelect;

/** Newest snapshot (the dashboard's current state), or null before import. */
export async function latestTreasurySnapshot(): Promise<TreasurySnapshot | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(zechubTreasurySnapshots)
    .orderBy(desc(zechubTreasurySnapshots.capturedOn))
    .limit(1);
  return rows[0] ?? null;
}

/** Full time series, oldest first (for evolution charts/deltas). */
export async function treasurySeries(limit = 120): Promise<TreasurySnapshot[]> {
  const db = getDb();
  return db
    .select()
    .from(zechubTreasurySnapshots)
    .orderBy(asc(zechubTreasurySnapshots.capturedOn))
    .limit(limit);
}

export async function treasuryAllocations(
  snapshotId: string,
): Promise<TreasuryAllocationRow[]> {
  const db = getDb();
  return db
    .select()
    .from(zechubAllocations)
    .where(eq(zechubAllocations.snapshotId, snapshotId))
    .orderBy(desc(zechubAllocations.zecZat));
}

/** Per-grant payout state (paid, committed, milestones), biggest paid first. */
export async function treasuryPayouts(): Promise<TreasuryPayoutRow[]> {
  const db = getDb();
  return db
    .select()
    .from(zechubPayouts)
    .orderBy(desc(zechubPayouts.paidUsdCents));
}
