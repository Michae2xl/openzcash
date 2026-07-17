import "server-only";
import { desc, gte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgChangelog, zcgDisbursements, zcgProposals } from "@/lib/db/schema";
import { sha256 } from "./sheets";

/**
 * "What changed" audit feed: refreshZcg snapshots the proposal statuses and
 * disbursement ids BEFORE re-importing, then diffs against the fresh state.
 * The resulting entries (new proposals, status flips, new recorded payments)
 * power the home-page digest and the RSS feed — turning the daily mirror into
 * an auditable history of spreadsheet edits.
 */

export type ChangelogSnapshot = {
  /** `${program}|${titleKey}` → last seen title + status. */
  proposals: Map<string, { title: string; status: string }>;
  disbIds: Set<string>;
};

export type ChangelogEntry = typeof zcgChangelog.$inferSelect;

export async function snapshotForChangelog(): Promise<ChangelogSnapshot> {
  const db = getDb();
  const [props, disb] = await Promise.all([
    db
      .select({
        program: zcgProposals.program,
        titleKey: zcgProposals.titleKey,
        title: zcgProposals.title,
        status: zcgProposals.status,
      })
      .from(zcgProposals),
    db.select({ id: zcgDisbursements.id }).from(zcgDisbursements),
  ]);
  const proposals = new Map<string, { title: string; status: string }>();
  for (const p of props)
    proposals.set(`${p.program}|${p.titleKey}`, {
      title: p.title,
      status: p.status,
    });
  return { proposals, disbIds: new Set(disb.map((d) => d.id)) };
}

const fmtUsd = (cents: bigint) =>
  `$${Math.round(Number(cents) / 100).toLocaleString("en-US")}`;

/**
 * Diffs the fresh import against the pre-import snapshot and appends entries.
 * Bootstrap-safe: an empty "before" (first import into a fresh DB) records
 * nothing instead of flooding the feed with the entire history.
 */
export async function recordChangelog(
  before: ChangelogSnapshot,
): Promise<number> {
  const db = getDb();
  const after = await snapshotForChangelog();
  const day = new Date().toISOString().slice(0, 10);

  const entries: Array<{
    kind: string;
    title: string;
    fromVal: string | null;
    toVal: string | null;
    detail: string | null;
  }> = [];

  if (before.proposals.size > 0) {
    for (const [key, cur] of after.proposals) {
      const prev = before.proposals.get(key);
      if (!prev) {
        entries.push({
          kind: "proposal_new",
          title: cur.title,
          fromVal: null,
          toVal: cur.status,
          detail: null,
        });
      } else if (prev.status !== cur.status) {
        entries.push({
          kind: "proposal_status",
          title: cur.title,
          fromVal: prev.status,
          toVal: cur.status,
          detail: null,
        });
      }
    }
  }

  if (before.disbIds.size > 0) {
    const rows = await db
      .select({
        id: zcgDisbursements.id,
        project: zcgDisbursements.project,
        recipient: zcgDisbursements.recipientNameRaw,
        usd: zcgDisbursements.usdDisbursedCents,
        budget: zcgDisbursements.amountUsdCents,
        isPaid: zcgDisbursements.isPaid,
        isTest: zcgDisbursements.isTest,
      })
      .from(zcgDisbursements);
    const byProject = new Map<string, { count: number; cents: bigint }>();
    for (const r of rows) {
      if (before.disbIds.has(r.id) || !r.isPaid || r.isTest) continue;
      const name = r.project || r.recipient || "Unlabelled";
      const cents = r.usd ?? r.budget ?? 0n;
      const agg = byProject.get(name) ?? { count: 0, cents: 0n };
      byProject.set(name, { count: agg.count + 1, cents: agg.cents + cents });
    }
    for (const [name, agg] of byProject) {
      entries.push({
        kind: "payment",
        title: name,
        fromVal: null,
        toVal: null,
        detail: `${agg.count} payment${agg.count === 1 ? "" : "s"} · ${fmtUsd(agg.cents)}`,
      });
    }
  }

  if (!entries.length) return 0;
  await db
    .insert(zcgChangelog)
    .values(
      entries.map((e) => ({
        id: sha256(`${e.kind}|${e.title}|${e.fromVal}|${e.toVal}|${day}`).slice(
          0,
          32,
        ),
        ...e,
      })),
    )
    .onConflictDoNothing();
  return entries.length;
}

/** Recent entries for the home digest and the RSS feed. */
export async function listChangelog(
  days = 7,
  limit = 30,
): Promise<ChangelogEntry[]> {
  const db = getDb();
  const since = new Date(Date.now() - days * 86_400_000);
  return db
    .select()
    .from(zcgChangelog)
    .where(gte(zcgChangelog.at, since))
    .orderBy(desc(zcgChangelog.at))
    .limit(limit);
}
