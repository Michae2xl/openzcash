/**
 * Tipos centrais do domínio Zcash (camada de leitura/auditoria).
 *
 * Modelagem read-only: o sistema observa a chain através de uma viewing key e
 * NUNCA detém spend keys. Valores são `bigint` em zatoshis. Estruturas imutáveis.
 */

export type Pool = "orchard" | "sapling" | "transparent";

/** Direção de um output em relação à tesouraria da empresa. */
export type Direction = "in" | "out" | "change";

/**
 * Chave usada para decifrar o output durante o trial-decryption.
 *  - "ivk": entradas (incoming viewing key)
 *  - "ovk": saídas e memos de saída (outgoing viewing key) — exige UFVK
 *  - "none": output transparente (sem cifragem/memo)
 */
export type DecryptedVia = "ivk" | "ovk" | "none";

export interface ChainOutput {
  readonly index: number;
  readonly pool: Pool;
  readonly direction: Direction;
  /** Valor sempre não-negativo; o sinal contábil vem de `direction`. */
  readonly valueZat: bigint;
  /** Endereço da contraparte (destinatário em saídas; nosso em entradas). */
  readonly address: string | null;
  /** Memo bruto (≤512 bytes) ou null em outputs transparentes. */
  readonly memoRaw: Uint8Array | null;
  readonly decryptedVia: DecryptedVia;
}

export interface ChainTx {
  readonly txid: string;
  readonly blockHeight: number;
  /** ISO 8601 (timestamp do bloco). */
  readonly blockTime: string;
  readonly pool: Pool;
  /** Taxa de rede (ZIP-317), em zatoshis. */
  readonly feeZat: bigint;
  /** Tesouro (viewing key/conta) ao qual esta transação pertence. */
  readonly treasuryId?: string;
  readonly outputs: readonly ChainOutput[];
}

/**
 * Metadados de uma viewing key registrada no sistema. A UFVK em si é tratada como
 * blob opaco e cifrada at-rest — aqui guardamos só o necessário para gestão/UI.
 */
export interface ViewingKeyRecord {
  readonly id: string;
  readonly accountLabel: string;
  /** "ufvk"/"uivk" = shielded (viewing key); "taddr" = endereço transparente público. */
  readonly kind: "ufvk" | "uivk" | "taddr";
  readonly pools: readonly Pool[];
  /** Representação mascarada para exibição (nunca a chave inteira na UI). */
  readonly ufvkMasked: string;
  readonly importedAt: string;
  readonly scope: string;
  readonly status: "active" | "revoked";
  /** Saldo real da conta (do node/engine), em zatoshis. Fonte de verdade do saldo. */
  readonly balanceZat?: bigint;
  /** Tipo do tesouro: "grants" | "folha" | "distribuicao" | "pessoal" | "outro". */
  readonly treasuryType?: string;
  /** Tesouro exposto na visão pública (comunidade). Default false. */
  readonly isPublic?: boolean;
}

/**
 * Registro, do lado do sistema, de um contra-cheque emitido (mock na Fatia 1).
 * É o que a reconciliação cruza com o que aparece on-chain.
 */
export interface PaycheckRecord {
  readonly id: string;
  readonly payslipId: string;
  readonly employeeLabel: string;
  /** YYYYMM. */
  readonly period: string;
  readonly amountZat: bigint;
  /** Txid esperado após broadcast; null se ainda não foi para a chain. */
  readonly expectedTxid: string | null;
  readonly accountCode: string;
}

/** Entrada do log de acesso à viewing key (auditoria de quem viu o quê). */
export interface ViewingKeyAccess {
  readonly id: string;
  readonly viewingKeyId: string;
  readonly principal: string;
  readonly grantedAt: string;
  readonly scope: string;
  readonly reason: string;
}
