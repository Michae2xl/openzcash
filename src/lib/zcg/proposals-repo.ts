import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgProposals } from "@/lib/db/schema";
import type { ProposalStatus } from "./import-proposals";
import { cached, LEDGER_TTL_MS } from "@/lib/cache/memo";
import {
  getGrantApplications,
  type OfficeProposalDTO,
} from "./github-applications";
import { titlesMatch } from "./match-titles";

export type ProposalRow = typeof zcgProposals.$inferSelect;

/** zcg | coinholder */
export type ProposalProgram = "zcg" | "coinholder";

export type ProposalFilters = {
  program?: ProposalProgram;
  status?: ProposalStatus;
};

/**
 * Lista propostas filtrando por programa e/ou status canônico.
 * Ordena por data submetida (mais recente primeiro), depois pela linha de origem
 * para estabilidade quando a data é nula.
 */
export async function listProposals(
  opts: ProposalFilters = {},
): Promise<ProposalRow[]> {
  const db = getDb();
  const conds = [];
  if (opts.program) conds.push(eq(zcgProposals.program, opts.program));
  if (opts.status) conds.push(eq(zcgProposals.status, opts.status));

  return db
    .select()
    .from(zcgProposals)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(
      sql`${zcgProposals.submittedDate} desc nulls last`,
      asc(zcgProposals.sourceSheetGid),
      asc(zcgProposals.sourceRowIndex),
    );
}

export type FunnelBucket = {
  program: ProposalProgram;
  status: ProposalStatus;
  count: number;
  /** USD pedido somado (só confiável no coinholder); centavos. */
  requestedUsdCents: bigint;
};

export type ProposalFunnel = {
  byBucket: FunnelBucket[];
  /** Totais por status, somando os dois programas. */
  byStatus: { status: ProposalStatus; count: number }[];
  /** Totais por programa. */
  byProgram: { program: ProposalProgram; count: number }[];
  total: number;
};

/**
 * Funil de propostas: contagem por status canônico, quebrada por programa.
 * Inclui agregados por status (somando programas) e por programa.
 */
export async function proposalsFunnel(): Promise<ProposalFunnel> {
  const db = getDb();

  const rows = await db
    .select({
      program: zcgProposals.program,
      status: zcgProposals.status,
      count: sql<number>`count(*)::int`,
      requestedUsdCents: sql<string>`coalesce(sum(${zcgProposals.requestedUsdCents}),0)`,
    })
    .from(zcgProposals)
    .groupBy(zcgProposals.program, zcgProposals.status)
    .orderBy(
      asc(zcgProposals.program),
      desc(sql`count(*)`),
      asc(zcgProposals.status),
    );

  const byBucket: FunnelBucket[] = rows.map((r) => ({
    program: r.program as ProposalProgram,
    status: r.status as ProposalStatus,
    count: r.count,
    requestedUsdCents: BigInt(r.requestedUsdCents),
  }));

  const statusMap = new Map<ProposalStatus, number>();
  const programMap = new Map<ProposalProgram, number>();
  let total = 0;
  for (const b of byBucket) {
    statusMap.set(b.status, (statusMap.get(b.status) ?? 0) + b.count);
    programMap.set(b.program, (programMap.get(b.program) ?? 0) + b.count);
    total += b.count;
  }

  const byStatus = [...statusMap.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  const byProgram = [...programMap.entries()]
    .map(([program, count]) => ({ program, count }))
    .sort((a, b) => b.count - a.count);

  return { byBucket, byStatus, byProgram, total };
}

// Proposal statuses meaning the committee has already decided (the spreadsheet
// is the authoritative source for status; a GitHub issue can still carry a
// stale "Ready For ZCG Review" label after the sheet records the decision).
const DECIDED_STATUSES = new Set<string>([
  "approved",
  "rejected",
  "withdrawn",
  "cancelled",
  "filtered",
  "vetoed",
  "paid",
]);

/**
 * Proposals genuinely under review, for the 3D office and its API. Starts from
 * the live GitHub "ready for review" applications, then drops any the
 * spreadsheet has already decided — the sheet is canonical for status, and
 * GitHub's review label is routinely left on after a decision (e.g. #335
 * red·bridge, approved in the sheet but still review-labelled on GitHub). This
 * mirrors how /zcg/proposals counts "under review", so the two always agree.
 */
export async function officeUnderReview(
  limit = 100,
): Promise<OfficeProposalDTO[]> {
  const [apps, sheet] = await Promise.all([
    getGrantApplications(limit),
    cached("listProposals:all", LEDGER_TTL_MS, () => listProposals({})),
  ]);
  const ghApps = apps.filter((a) => a.status === "review");

  // Pair each sheet proposal with the first still-unused GitHub review app that
  // matches by title — the exact one-to-one greedy pass /zcg/proposals uses
  // (same source, order and 400-row cap), so the two always agree. A GitHub app
  // is excluded only when the row it actually pairs with is one the committee
  // has DECIDED. This matters when a title is reused: #334 "Zenith Full-node
  // Wallet 2026" pairs with its own under-review row, not the older decided
  // Zenith grant, so it stays; #335 red·bridge pairs with its approved row, so
  // it drops.
  const usedGh = new Set<number>();
  const absorbedByDecided = new Set<number>();
  for (const p of sheet.slice(0, 400)) {
    const idx = ghApps.findIndex(
      (g, i) => !usedGh.has(i) && titlesMatch(p.title, g.title),
    );
    if (idx < 0) continue;
    usedGh.add(idx);
    if (p.status && DECIDED_STATUSES.has(p.status)) absorbedByDecided.add(idx);
  }

  return ghApps
    .filter((_, i) => !absorbedByDecided.has(i))
    .map((a) => ({
      number: a.number,
      title: a.title,
      amount: a.amountUsd,
      applicant: a.applicant,
      createdAt: (a.createdAt || "").slice(0, 10),
    }));
}
