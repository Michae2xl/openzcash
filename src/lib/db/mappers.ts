/**
 * Conversão entre as linhas do Postgres e os tipos de domínio.
 * Memo bruto ↔ base64; timestamptz ↔ ISO string; zatoshis como bigint.
 */

import type {
  ChainOutput,
  ChainTx,
  Direction,
  DecryptedVia,
  PaycheckRecord,
  Pool,
  ViewingKeyAccess,
  ViewingKeyRecord,
} from "@/lib/zcash/types";
import {
  chainOutputs,
  chainTxs,
  paychecks,
  viewingKeys,
  vkAccessLog,
} from "./schema";

type TxRow = typeof chainTxs.$inferSelect;
type OutRow = typeof chainOutputs.$inferSelect;
type VkRow = typeof viewingKeys.$inferSelect;
type AccessRow = typeof vkAccessLog.$inferSelect;
type PaycheckRow = typeof paychecks.$inferSelect;

const toB64 = (bytes: Uint8Array | null): string | null =>
  bytes ? Buffer.from(bytes).toString("base64") : null;

const fromB64 = (b64: string | null): Uint8Array | null =>
  b64 ? new Uint8Array(Buffer.from(b64, "base64")) : null;

// ---- domínio → linha ----

export function txToRow(tx: ChainTx): typeof chainTxs.$inferInsert {
  return {
    txid: tx.txid,
    blockHeight: tx.blockHeight,
    blockTime: new Date(tx.blockTime),
    pool: tx.pool,
    feeZat: tx.feeZat,
    treasuryId: tx.treasuryId ?? "default",
  };
}

export function outputToRow(
  treasuryId: string,
  txid: string,
  o: ChainOutput,
): typeof chainOutputs.$inferInsert {
  return {
    id: `${treasuryId}:${txid}:${o.index}`,
    treasuryId,
    txid,
    idx: o.index,
    pool: o.pool,
    direction: o.direction,
    valueZat: o.valueZat,
    address: o.address,
    memoB64: toB64(o.memoRaw),
    decryptedVia: o.decryptedVia,
  };
}

export function viewingKeyToRow(
  vk: ViewingKeyRecord,
): typeof viewingKeys.$inferInsert {
  return {
    id: vk.id,
    accountLabel: vk.accountLabel,
    kind: vk.kind,
    pools: [...vk.pools],
    ufvkMasked: vk.ufvkMasked,
    scope: vk.scope,
    status: vk.status,
    treasuryType: vk.treasuryType ?? "outro",
    balanceZat: vk.balanceZat ?? null,
    importedAt: new Date(vk.importedAt),
  };
}

export function accessToRow(
  a: ViewingKeyAccess,
): typeof vkAccessLog.$inferInsert {
  return {
    id: a.id,
    viewingKeyId: a.viewingKeyId,
    principal: a.principal,
    grantedAt: new Date(a.grantedAt),
    scope: a.scope,
    reason: a.reason,
  };
}

export function paycheckToRow(
  p: PaycheckRecord,
): typeof paychecks.$inferInsert {
  return {
    id: p.id,
    payslipId: p.payslipId,
    employeeLabel: p.employeeLabel,
    period: p.period,
    amountZat: p.amountZat,
    expectedTxid: p.expectedTxid,
    accountCode: p.accountCode,
  };
}

// ---- linha → domínio ----

export function rowToChainTx(tx: TxRow, outs: readonly OutRow[]): ChainTx {
  return {
    txid: tx.txid,
    blockHeight: tx.blockHeight,
    blockTime: tx.blockTime.toISOString(),
    pool: tx.pool as Pool,
    feeZat: tx.feeZat,
    treasuryId: tx.treasuryId,
    outputs: outs
      .filter((o) => o.treasuryId === tx.treasuryId && o.txid === tx.txid)
      .sort((a, b) => a.idx - b.idx)
      .map(rowToOutput),
  };
}

function rowToOutput(o: OutRow): ChainOutput {
  return {
    index: o.idx,
    pool: o.pool as Pool,
    direction: o.direction as Direction,
    valueZat: o.valueZat,
    address: o.address,
    memoRaw: fromB64(o.memoB64),
    decryptedVia: o.decryptedVia as DecryptedVia,
  };
}

export function rowToViewingKey(v: VkRow): ViewingKeyRecord {
  return {
    id: v.id,
    accountLabel: v.accountLabel,
    kind: v.kind as ViewingKeyRecord["kind"],
    pools: v.pools as Pool[],
    ufvkMasked: v.ufvkMasked,
    importedAt: v.importedAt.toISOString(),
    scope: v.scope,
    status: v.status as ViewingKeyRecord["status"],
    treasuryType: v.treasuryType,
    balanceZat: v.balanceZat ?? undefined,
    isPublic: v.isPublic ?? false,
  };
}

export function rowToAccess(a: AccessRow): ViewingKeyAccess {
  return {
    id: a.id,
    viewingKeyId: a.viewingKeyId,
    principal: a.principal,
    grantedAt: a.grantedAt.toISOString(),
    scope: a.scope,
    reason: a.reason,
  };
}

export function rowToPaycheck(p: PaycheckRow): PaycheckRecord {
  return {
    id: p.id,
    payslipId: p.payslipId,
    employeeLabel: p.employeeLabel,
    period: p.period,
    amountZat: p.amountZat,
    expectedTxid: p.expectedTxid,
    accountCode: p.accountCode,
  };
}
