/**
 * Serviço de scan: lê do ZcashGateway (mock ou zallet real) e PERSISTE no Postgres.
 * Idempotente (upsert por chave). Atualiza o estado de scan incremental.
 *
 * Read-only de ponta a ponta: só consome métodos de leitura do gateway; nunca gasta.
 */

import { getDb } from "@/lib/db/client";
import {
  accessToRow,
  outputToRow,
  paycheckToRow,
  txToRow,
  viewingKeyToRow,
} from "@/lib/db/mappers";
import {
  chainOutputs,
  chainTxs,
  paychecks,
  scanState,
  viewingKeys,
  vkAccessLog,
} from "@/lib/db/schema";
import type { ZcashGateway } from "@/lib/zcash/gateway";

export interface ScanResult {
  readonly txCount: number;
  readonly outputCount: number;
  readonly viewingKeyCount: number;
  readonly lastHeight: number;
}

export async function runScan(gateway: ZcashGateway): Promise<ScanResult> {
  const [txs, vks, access, issued] = await Promise.all([
    gateway.scanTransactions(),
    gateway.listViewingKeys(),
    gateway.listViewingKeyAccess(),
    gateway.listIssuedPaychecks(),
  ]);

  const db = getDb();
  let outputCount = 0;
  const lastHeight = txs.reduce((max, t) => Math.max(max, t.blockHeight), 0);

  await db.transaction(async (tx) => {
    for (const vk of vks) {
      const row = viewingKeyToRow(vk);
      await tx
        .insert(viewingKeys)
        .values(row)
        // No re-scan preserva o que o admin editou (nome e tipo do tesouro);
        // atualiza só o que vem da engine.
        .onConflictDoUpdate({
          target: viewingKeys.id,
          set: {
            kind: row.kind,
            pools: row.pools,
            ufvkMasked: row.ufvkMasked,
            scope: row.scope,
            status: row.status,
            balanceZat: row.balanceZat,
          },
        });
    }

    for (const a of access) {
      const row = accessToRow(a);
      await tx
        .insert(vkAccessLog)
        .values(row)
        .onConflictDoUpdate({ target: vkAccessLog.id, set: row });
    }

    for (const p of issued) {
      const row = paycheckToRow(p);
      await tx
        .insert(paychecks)
        .values(row)
        .onConflictDoUpdate({ target: paychecks.id, set: row });
    }

    for (const t of txs) {
      const treasuryId = t.treasuryId ?? "default";
      const txRow = txToRow(t);
      await tx
        .insert(chainTxs)
        .values(txRow)
        .onConflictDoUpdate({
          target: [chainTxs.treasuryId, chainTxs.txid],
          set: txRow,
        });

      for (const o of t.outputs) {
        const outRow = outputToRow(treasuryId, t.txid, o);
        await tx
          .insert(chainOutputs)
          .values(outRow)
          .onConflictDoUpdate({ target: chainOutputs.id, set: outRow });
        outputCount += 1;
      }
    }

    await tx
      .insert(scanState)
      .values({
        id: "singleton",
        lastScannedHeight: lastHeight,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: scanState.id,
        set: { lastScannedHeight: lastHeight, updatedAt: new Date() },
      });
  });

  return {
    txCount: txs.length,
    outputCount,
    viewingKeyCount: vks.length,
    lastHeight,
  };
}
