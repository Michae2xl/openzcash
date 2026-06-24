/**
 * Repositório de leitura da auditoria (Postgres → domínio).
 */

import { getDb } from "@/lib/db/client";
import {
  rowToAccess,
  rowToChainTx,
  rowToPaycheck,
  rowToViewingKey,
} from "@/lib/db/mappers";
import {
  chainOutputs,
  chainTxs,
  paychecks,
  viewingKeys,
  vkAccessLog,
} from "@/lib/db/schema";
import type {
  ChainTx,
  PaycheckRecord,
  ViewingKeyAccess,
  ViewingKeyRecord,
} from "@/lib/zcash/types";

export interface AuditSnapshot {
  readonly txs: readonly ChainTx[];
  readonly paychecks: readonly PaycheckRecord[];
  readonly viewingKeys: readonly ViewingKeyRecord[];
  readonly access: readonly ViewingKeyAccess[];
}

export async function countChainTxs(): Promise<number> {
  const db = getDb();
  const rows = await db.select({ txid: chainTxs.txid }).from(chainTxs);
  return rows.length;
}

export async function loadAuditFromDb(): Promise<AuditSnapshot> {
  const db = getDb();
  const [txRows, outRows, pcRows, vkRows, accRows] = await Promise.all([
    db.select().from(chainTxs),
    db.select().from(chainOutputs),
    db.select().from(paychecks),
    db.select().from(viewingKeys),
    db.select().from(vkAccessLog),
  ]);

  const txs = txRows
    .sort((a, b) => b.blockHeight - a.blockHeight)
    .map((tx) => rowToChainTx(tx, outRows));

  return {
    txs,
    paychecks: pcRows.map(rowToPaycheck),
    viewingKeys: vkRows
      .slice()
      .sort((a, b) => a.importedAt.getTime() - b.importedAt.getTime())
      .map(rowToViewingKey),
    access: accRows
      .slice()
      .sort((a, b) => b.grantedAt.getTime() - a.grantedAt.getTime())
      .map(rowToAccess),
  };
}
