import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  chainOutputs,
  chainTxs,
  viewingKeys,
  zcgDisbursements,
} from "@/lib/db/schema";

/**
 * Reconciliação ZCG ↔ on-chain.
 *
 * Limite importante: o tesouro transparente do ZCG (t3ev37Q2…) só expõe os
 * fluxos transparentes — entradas vindas do Lockbox e saídas AGREGADAS para o
 * pool blindado. Os pagamentos individuais aos grantees são feitos a partir do
 * pool Orchard (blindado) e/ou de endereços históricos: não são rastreáveis
 * por-milestone sem a UFVK shielded do ZCG. Por isso esta reconciliação é de
 * FLUXO (o balanço do tesouro fecha?) + INTEGRITY-CHECK (a planilha bate?), e
 * não um casamento 1:1 entre saída on-chain e milestone.
 */

export type FlowOutput = { date: string | null; zecZat: bigint; txid: string };

export type ZcgReconciliation = {
  onchain: {
    treasuryLabel: string;
    inflowZat: bigint;
    outflowZat: bigint;
    balanceZat: bigint;
    /** in − out − saldo ≈ 0 (diferença em zatoshis). */
    residualZat: bigint;
    reconciles: boolean;
    outputs: FlowOutput[];
  } | null;
  sheet: {
    zecPaidZat: bigint;
    usdPaidCents: bigint;
    paidCount: number;
    zecPaymentCount: number;
    offchainCount: number;
  };
};

const ONE_ZEC = 100_000_000n;

export async function zcgReconciliation(): Promise<ZcgReconciliation> {
  const db = getDb();

  // Tesouro transparente do ZCG/Dev Fund (o único com fluxo on-chain visível).
  const [t] = await db
    .select({
      id: viewingKeys.id,
      label: viewingKeys.accountLabel,
      balanceZat: viewingKeys.balanceZat,
    })
    .from(viewingKeys)
    .where(sql`${viewingKeys.address} is not null`)
    .limit(1);

  let onchain: ZcgReconciliation["onchain"] = null;
  if (t) {
    const [flow] = await db
      .select({
        inflow: sql<string>`coalesce(sum(abs(${chainOutputs.valueZat})) filter (where ${chainOutputs.direction} = 'in'),0)`,
        outflow: sql<string>`coalesce(sum(abs(${chainOutputs.valueZat})) filter (where ${chainOutputs.direction} = 'out'),0)`,
      })
      .from(chainOutputs)
      .where(eq(chainOutputs.treasuryId, t.id));

    const outs = await db
      .select({
        txid: chainOutputs.txid,
        zecZat: sql<string>`abs(${chainOutputs.valueZat})`,
        date: sql<string | null>`${chainTxs.blockTime}::date::text`,
      })
      .from(chainOutputs)
      .innerJoin(
        chainTxs,
        and(
          eq(chainTxs.txid, chainOutputs.txid),
          eq(chainTxs.treasuryId, chainOutputs.treasuryId),
        ),
      )
      .where(
        and(
          eq(chainOutputs.treasuryId, t.id),
          eq(chainOutputs.direction, "out"),
        ),
      )
      .orderBy(sql`abs(${chainOutputs.valueZat}) desc`);

    const inflowZat = BigInt(flow?.inflow ?? "0");
    const outflowZat = BigInt(flow?.outflow ?? "0");
    const balanceZat = t.balanceZat ?? inflowZat - outflowZat;
    const residualZat = inflowZat - outflowZat - balanceZat;

    onchain = {
      treasuryLabel: t.label,
      inflowZat,
      outflowZat,
      balanceZat,
      residualZat,
      reconciles: (residualZat < 0n ? -residualZat : residualZat) < ONE_ZEC,
      outputs: outs.map((o) => ({
        date: o.date,
        zecZat: BigInt(o.zecZat),
        txid: o.txid,
      })),
    };
  }

  const [s] = await db
    .select({
      zecPaid: sql<string>`coalesce(sum(${zcgDisbursements.zecDisbursedZat}) filter (where ${zcgDisbursements.isPaid} and ${zcgDisbursements.zecDisbursedZat} > 0),0)`,
      usdPaid: sql<string>`coalesce(sum(${zcgDisbursements.amountUsdCents}) filter (where ${zcgDisbursements.isPaid}),0)`,
      paidCount: sql<number>`count(*) filter (where ${zcgDisbursements.isPaid})::int`,
      zecPaymentCount: sql<number>`count(*) filter (where ${zcgDisbursements.isPaid} and ${zcgDisbursements.zecDisbursedZat} > 0)::int`,
      offchainCount: sql<number>`count(*) filter (where ${zcgDisbursements.isPaid} and ${zcgDisbursements.settlementAsset} <> 'ZEC')::int`,
    })
    .from(zcgDisbursements);

  return {
    onchain,
    sheet: {
      zecPaidZat: BigInt(s?.zecPaid ?? "0"),
      usdPaidCents: BigInt(s?.usdPaid ?? "0"),
      paidCount: s?.paidCount ?? 0,
      zecPaymentCount: s?.zecPaymentCount ?? 0,
      offchainCount: s?.offchainCount ?? 0,
    },
  };
}
