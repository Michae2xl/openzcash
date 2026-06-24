/**
 * Implementação MOCK do ZcashGateway (in-memory).
 *
 * Simula o que o adapter real fará via zallet/Zebra: devolver as transações já
 * decifradas pela viewing key. Permite desenvolver toda a aplicação sem node real.
 * As funções são async de propósito, para o contrato bater com o adapter real.
 */

import type { ScanRange, ZcashGateway } from "../gateway";
import type {
  ChainTx,
  PaycheckRecord,
  ViewingKeyAccess,
  ViewingKeyRecord,
} from "../types";
import {
  MOCK_PAYCHECKS,
  MOCK_TXS,
  MOCK_VIEWING_KEYS,
  MOCK_VK_ACCESS,
} from "./dataset";

export class MockZcashGateway implements ZcashGateway {
  async listViewingKeys(): Promise<readonly ViewingKeyRecord[]> {
    return MOCK_VIEWING_KEYS;
  }

  async listViewingKeyAccess(): Promise<readonly ViewingKeyAccess[]> {
    return MOCK_VK_ACCESS;
  }

  async scanTransactions(range?: ScanRange): Promise<readonly ChainTx[]> {
    const txs = [...MOCK_TXS].sort((a, b) => b.blockHeight - a.blockHeight);
    if (!range) return txs;
    return txs.filter(
      (tx) =>
        tx.blockHeight >= range.fromHeight &&
        (range.toHeight === undefined || tx.blockHeight <= range.toHeight),
    );
  }

  async listIssuedPaychecks(): Promise<readonly PaycheckRecord[]> {
    return MOCK_PAYCHECKS;
  }
}
