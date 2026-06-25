import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgDisbursements } from "@/lib/db/schema";
import type { DisbRow } from "./disbursements-repo";

/**
 * Um GRANT (proposta aprovada) = um `project` único, agregando seus milestones.
 * O ledger `zcg_disbursements` é linha-a-linha (grão = milestone); aqui derivamos
 * a visão por grant via agregação — sem tabela física.
 */
export type GrantRow = {
  grantKey: string;
  grantee: string;
  category: string | null;
  status: string | null;
  program: "zcg_regular" | "coinholder";
  milestoneCount: number;
  paidCount: number;
  usdCents: bigint;
  zecZat: bigint;
  firstPaid: string | null;
  lastPaid: string | null;
};

const GRANT_SHEETS = sql`${zcgDisbursements.sourceSheet} in ('grants_disbursed','coinholder_grants')`;

export async function listGrants(
  opts: { search?: string; program?: string } = {},
): Promise<GrantRow[]> {
  const db = getDb();
  const conds = [GRANT_SHEETS, sql`${zcgDisbursements.project} is not null`];
  if (opts.program === "coinholder")
    conds.push(eq(zcgDisbursements.sourceSheet, "coinholder_grants"));
  if (opts.program === "zcg")
    conds.push(eq(zcgDisbursements.sourceSheet, "grants_disbursed"));
  if (opts.search)
    conds.push(
      sql`(${zcgDisbursements.project} ilike ${`%${opts.search}%`} or ${zcgDisbursements.recipientNameRaw} ilike ${`%${opts.search}%`})`,
    );

  const rows = await db
    .select({
      grantKey: zcgDisbursements.project,
      grantee: sql<string>`max(${zcgDisbursements.recipientNameRaw})`,
      category: sql<string | null>`max(${zcgDisbursements.category})`,
      program: sql<string>`max(${zcgDisbursements.sourceSheet})`,
      milestoneCount: sql<number>`count(*)::int`,
      paidCount: sql<number>`count(*) filter (where ${zcgDisbursements.isPaid})::int`,
      usdCents: sql<string>`coalesce(sum(${zcgDisbursements.amountUsdCents}),0)`,
      zecZat: sql<string>`coalesce(sum(${zcgDisbursements.zecDisbursedZat}),0)`,
      firstPaid: sql<string | null>`min(${zcgDisbursements.paidOutDate})`,
      lastPaid: sql<string | null>`max(${zcgDisbursements.paidOutDate})`,
      // Status canônico do grant: Cancelled domina; senão o mais frequente.
      status: sql<
        string | null
      >`case when bool_or(${zcgDisbursements.grantStatus} = 'cancelled') then 'cancelled' else mode() within group (order by ${zcgDisbursements.grantStatus}) end`,
    })
    .from(zcgDisbursements)
    .where(and(...conds))
    .groupBy(zcgDisbursements.project)
    .orderBy(sql`max(${zcgDisbursements.paidOutDate}) desc nulls last`);

  return rows.map((r) => ({
    grantKey: r.grantKey ?? "",
    grantee: r.grantee,
    category: r.category,
    status: r.status,
    program: r.program === "coinholder_grants" ? "coinholder" : "zcg_regular",
    milestoneCount: r.milestoneCount,
    paidCount: r.paidCount,
    usdCents: BigInt(r.usdCents),
    zecZat: BigInt(r.zecZat),
    firstPaid: r.firstPaid,
    lastPaid: r.lastPaid,
  }));
}

/** Os milestones de um grant (drill-down), ordenados por sequência. */
export async function grantMilestones(grantKey: string): Promise<DisbRow[]> {
  const db = getDb();
  return db
    .select()
    .from(zcgDisbursements)
    .where(eq(zcgDisbursements.project, grantKey))
    .orderBy(
      sql`${zcgDisbursements.milestoneSeq} asc nulls last`,
      asc(zcgDisbursements.paidOutDate),
    );
}

/** Every ledger milestone for one recipient (by normalized key), open + paid. */
export async function recipientMilestones(
  recipientKey: string,
): Promise<DisbRow[]> {
  const db = getDb();
  return db
    .select()
    .from(zcgDisbursements)
    .where(eq(zcgDisbursements.recipientKey, recipientKey))
    .orderBy(
      asc(zcgDisbursements.isPaid),
      sql`${zcgDisbursements.estimatedPayoutDate} asc nulls last`,
      asc(zcgDisbursements.paidOutDate),
    );
}

export type GrantsSummary = {
  grantCount: number;
  committedCents: bigint;
  paidCents: bigint;
  futureCents: bigint;
};

export async function grantsSummary(): Promise<GrantsSummary> {
  const db = getDb();
  const [r] = await db
    .select({
      grantCount: sql<number>`count(distinct ${zcgDisbursements.project})::int`,
      committedCents: sql<string>`coalesce(sum(${zcgDisbursements.amountUsdCents}) filter (where ${zcgDisbursements.grantStatus} is distinct from 'cancelled'),0)`,
      // Paid must use the SAME non-cancelled population as committed, otherwise
      // a partially-paid-then-cancelled grant would understate the open figure.
      paidCents: sql<string>`coalesce(sum(${zcgDisbursements.amountUsdCents}) filter (where ${zcgDisbursements.isPaid} and ${zcgDisbursements.grantStatus} is distinct from 'cancelled'),0)`,
    })
    .from(zcgDisbursements)
    .where(and(GRANT_SHEETS, sql`${zcgDisbursements.project} is not null`));

  const committed = BigInt(r?.committedCents ?? "0");
  const paid = BigInt(r?.paidCents ?? "0");
  const future = committed - paid;
  return {
    grantCount: r?.grantCount ?? 0,
    committedCents: committed,
    paidCents: paid,
    futureCents: future > 0n ? future : 0n,
  };
}
