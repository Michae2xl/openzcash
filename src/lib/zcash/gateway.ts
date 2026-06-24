/**
 * Interface única de acesso ao Zcash (Repository Pattern).
 *
 * Toda a aplicação fala com a chain através deste contrato. Na Fatia 1 existe só
 * a implementação MOCK (in-memory). O adapter REAL falará JSON-RPC com o zallet
 * (sobre o node Zebra) fazendo o trial-decryption com a UFVK da empresa.
 *
 * Importante: esta é a superfície *read-only* (auditoria). A superfície de
 * pagamento (buildZip321/createPczt/finalizeAndBroadcast + FROST) entra na fatia
 * de Folha/Pagamentos e será um contrato separado — mantido fora daqui para que o
 * domínio de auditoria não tenha como, nem por engano, mover dinheiro.
 */

import type {
  ChainTx,
  PaycheckRecord,
  ViewingKeyAccess,
  ViewingKeyRecord,
} from "./types";

export interface ScanRange {
  readonly fromHeight: number;
  readonly toHeight?: number;
}

export interface ZcashGateway {
  /** Viewing keys registradas para auditoria. */
  listViewingKeys(): Promise<readonly ViewingKeyRecord[]>;

  /** Log de acesso às viewing keys. */
  listViewingKeyAccess(): Promise<readonly ViewingKeyAccess[]>;

  /**
   * Transações observadas via viewing key (trial-decryption já resolvido pelo
   * provedor). Read-only.
   */
  scanTransactions(range?: ScanRange): Promise<readonly ChainTx[]>;

  /** Contra-cheques emitidos pelo sistema, para reconciliar com a chain. */
  listIssuedPaychecks(): Promise<readonly PaycheckRecord[]>;
}
