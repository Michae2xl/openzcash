import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgProposals } from "@/lib/db/schema";
import type { ProposalStatus } from "./import-proposals";

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
