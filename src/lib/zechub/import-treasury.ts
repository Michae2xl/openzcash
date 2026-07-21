import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  zcgChangelog,
  zechubAllocations,
  zechubPayouts,
  zechubTreasurySnapshots,
} from "@/lib/db/schema";
import { parseCsv } from "@/lib/zcg/csv";
import { sha256 } from "@/lib/zcg/sheets";
import { parseTreasury } from "./treasury-parse";

/**
 * Mirrors the public ZecHub DAO Treasury Dashboard spreadsheet. Each tab is a
 * point-in-time snapshot keyed by its "Last Updated" date, so importing on
 * the 6h cycle accumulates a time series; allocations follow their snapshot,
 * and the per-grant payout list reflects the NEWEST snapshot only
 * (delete + reinsert, same pattern as the ZCG tabs).
 */

const SHEET_ID =
  process.env.ZECHUB_SHEET_ID ?? "19Zy5hp3dMix8pyP8_PxMF32vkl-OyNWU07jrlCTFfso";
// Known tabs (older + current dashboard). New period tabs get appended here.
const GIDS = ["0", "228848690"];

export interface TreasuryImportResult {
  gid: string;
  capturedOn: string | null;
  payouts: number;
  status: string;
}

async function fetchTab(gid: string): Promise<string> {
  const res = await fetch(
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!res.ok) throw new Error(`zechub sheet ${gid}: HTTP ${res.status}`);
  const text = await res.text();
  if (/^\s*<(!doctype|html)/i.test(text))
    throw new Error(`zechub sheet ${gid}: got HTML (lost public access?)`);
  return text;
}

export async function importZechubTreasury(): Promise<TreasuryImportResult[]> {
  const db = getDb();
  const results: TreasuryImportResult[] = [];
  let newest: {
    capturedOn: string;
    payouts: ReturnType<typeof parseTreasury>["payouts"];
  } | null = null;

  for (const gid of GIDS) {
    try {
      const csv = await fetchTab(gid);
      const parsed = parseTreasury(parseCsv(csv));
      if (!parsed.capturedOn) {
        results.push({ gid, capturedOn: null, payouts: 0, status: "no date" });
        continue;
      }

      const snapshot = {
        id: parsed.capturedOn,
        capturedOn: parsed.capturedOn,
        zecPriceCents: parsed.zecPriceCents,
        donationsZat: parsed.donationsZat,
        donationsUsdCents: parsed.donationsUsdCents,
        fpfZat: parsed.fpfZat,
        fpfUsdCents: parsed.fpfUsdCents,
        fpfUnreservedZat: parsed.fpfUnreservedZat,
        fpfReservedUsdCents: parsed.fpfReservedUsdCents,
        incZat: parsed.incZat,
        incUsdCents: parsed.incUsdCents,
        penumbraUm: parsed.penumbraUm,
        namadaNam: parsed.namadaNam,
        totalPaidOutUsdCents: parsed.totalPaidOutUsdCents,
        toBePaidOutUsdCents: parsed.toBePaidOutUsdCents,
        contentSha256: sha256(csv),
      };
      // The dashboard is edited in place: same capture date, fresher numbers →
      // update; a new date starts a new time-series point.
      await db
        .insert(zechubTreasurySnapshots)
        .values(snapshot)
        .onConflictDoUpdate({
          target: zechubTreasurySnapshots.id,
          set: snapshot,
        });

      await db
        .delete(zechubAllocations)
        .where(eq(zechubAllocations.snapshotId, parsed.capturedOn));
      if (parsed.allocations.length) {
        await db.insert(zechubAllocations).values(
          parsed.allocations.map((a) => ({
            id: `${parsed.capturedOn}|${a.category}`,
            snapshotId: parsed.capturedOn!,
            category: a.category,
            zecZat: a.zecZat,
            sharePct: a.sharePct,
          })),
        );
      }

      if (!newest || parsed.capturedOn > newest.capturedOn) {
        newest = { capturedOn: parsed.capturedOn, payouts: parsed.payouts };
      }
      results.push({
        gid,
        capturedOn: parsed.capturedOn,
        payouts: parsed.payouts.length,
        status: "ok",
      });
    } catch (err) {
      results.push({
        gid,
        capturedOn: null,
        payouts: 0,
        status: `error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // Payout list mirrors the newest snapshot wholesale. Before replacing it,
  // diff paid amounts into the change feed (bootstrap-safe: an empty table
  // means first import, so nothing is "new").
  if (newest) {
    const before = await db
      .select({ title: zechubPayouts.title, paid: zechubPayouts.paidUsdCents })
      .from(zechubPayouts);
    if (before.length > 0) {
      const prevPaid = new Map(before.map((r) => [r.title, r.paid ?? 0n]));
      const day = new Date().toISOString().slice(0, 10);
      const entries = newest.payouts
        .filter((p) => (p.paidUsdCents ?? 0n) > (prevPaid.get(p.title) ?? 0n))
        .map((p) => {
          const delta = (p.paidUsdCents ?? 0n) - (prevPaid.get(p.title) ?? 0n);
          return {
            id: sha256(
              `zechub_payment|${p.title}|${p.paidUsdCents}|${day}`,
            ).slice(0, 32),
            kind: "zechub_payment",
            title: p.title,
            fromVal: null,
            toVal: null,
            detail: `$${(Number(delta) / 100).toLocaleString("en-US")} paid`,
          };
        });
      if (entries.length)
        await db.insert(zcgChangelog).values(entries).onConflictDoNothing();
    }
    await db.delete(zechubPayouts);
    if (newest.payouts.length) {
      await db.insert(zechubPayouts).values(
        newest.payouts.map((p) => ({
          id: sha256(p.title.toLowerCase()).slice(0, 32),
          title: p.title,
          paidUsdCents: p.paidUsdCents,
          pendingUsdCents: p.pendingUsdCents,
          m1: p.m1,
          m2: p.m2,
          m3: p.m3,
          zecPaidZat: p.zecPaidZat,
          capturedOn: newest.capturedOn,
        })),
      );
    }
  }

  return results;
}
