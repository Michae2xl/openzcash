/**
 * Dataset MOCK da Fatia 1 — um extrato de tesouraria corporativa em ZEC,
 * no espírito da tela do ZODL (entradas, saídas, memos), porém no contexto da
 * empresa: recebimentos de clientes, contra-cheques a funcionários, pagamentos a
 * fornecedores, e casos "difíceis" de propósito para exercitar a reconciliação:
 *
 *  - contra-cheques com memo ESTRUTURADO (nosso schema 0xFF) → reconciliam
 *  - pagamento manual sem nosso memo (feito direto no zallet) → órfão (exceção)
 *  - depósito transparente de exchange (sem memo) → órfão de entrada
 *  - memo 0xFF de terceiro com versão desconhecida → tratado como arbitrário
 *  - contra-cheque emitido mas ainda não no chain → exceção (pendente/expiry)
 *
 * Determinístico (datas/valores fixos) para a UI e os testes serem reprodutíveis.
 */

import { zecToZatoshis } from "../units";
import {
  emptyMemo,
  encodeTextMemo,
  MEMO_ARBITRARY_TAG,
  MEMO_SIZE,
} from "../memo/zip302";
import { DocType, encodeStructuredMemo } from "../memo/structured-memo";
import type {
  ChainOutput,
  ChainTx,
  PaycheckRecord,
  ViewingKeyAccess,
  ViewingKeyRecord,
} from "../types";

/** sha256 mock (base64url) de um documento off-chain. */
const fakeHash = (seed: string): string =>
  `mock-${seed}-c2hhMjU2LWRpZ2VzdA`.slice(0, 43);

/** Memo 0xFF de outro fornecedor de software, com versão de schema desconhecida. */
function thirdPartyArbitraryMemo(): Uint8Array {
  const out = new Uint8Array(MEMO_SIZE);
  out[0] = MEMO_ARBITRARY_TAG;
  out[1] = 0x02; // versão que NÃO é a nossa (0x01) → parseStructuredMemo devolve null
  out.set(new TextEncoder().encode("x-vendor-proto"), 2);
  return out;
}

const ZAT_FEE = zecToZatoshis("0.00015"); // ZIP-317 aproximada para 1-2 outputs

let outIndex = 0;
function out(o: Omit<ChainOutput, "index">): ChainOutput {
  return { index: outIndex++, ...o };
}

export const MOCK_TXS: readonly ChainTx[] = [
  {
    txid: "a1f0c9e2d7b34a5e9c1f8b6d2e0a7c4b9f3d1e8a6c5b2f0d9e7a3c1b4d6f8e0a2",
    blockHeight: 2_741_120,
    blockTime: "2026-06-19T14:30:00Z",
    pool: "orchard",
    feeZat: 0n,
    outputs: [
      out({
        pool: "orchard",
        direction: "in",
        valueZat: zecToZatoshis("12.5"),
        address: "u1corp…acct (nosso)",
        memoRaw: encodeTextMemo("Invoice #1042 — ACME Corp"),
        decryptedVia: "ivk",
      }),
    ],
  },
  {
    txid: "b2e1d0f3a8c45b6f0d2e9c7e3f1b8d5c0a4e2f9b7d6c3a1f0e8b5d7c9f1a3b5d7",
    blockHeight: 2_740_980,
    blockTime: "2026-06-18T09:05:00Z",
    pool: "orchard",
    feeZat: 0n,
    outputs: [
      out({
        pool: "orchard",
        direction: "in",
        valueZat: zecToZatoshis("5.0"),
        address: "u1corp…acct (nosso)",
        memoRaw: encodeTextMemo("Subscription — Globex"),
        decryptedVia: "ivk",
      }),
    ],
  },
  {
    // Contra-cheque Ana — memo estruturado + nota de change de volta para nós
    txid: "c3f2e1a4b9d56c7f1e3f0d8e4a2c9b6d1f5e3a0c8b7d4e2f1a9c6b8d0e2f4a6b8",
    blockHeight: 2_740_500,
    blockTime: "2026-06-15T12:00:00Z",
    pool: "orchard",
    feeZat: ZAT_FEE,
    outputs: [
      out({
        pool: "orchard",
        direction: "out",
        valueZat: zecToZatoshis("8.8521"),
        address: "u1ana…wallet",
        memoRaw: encodeStructuredMemo({
          docType: DocType.Payslip,
          refId: "PS-2026-06-ANA",
          sha256: fakeHash("ana"),
          period: "202606",
          accountCode: "6001",
        }),
        decryptedVia: "ovk",
      }),
      out({
        pool: "orchard",
        direction: "change",
        valueZat: zecToZatoshis("3.6477"),
        address: "u1corp…change (nosso)",
        memoRaw: null,
        decryptedVia: "ovk",
      }),
    ],
  },
  {
    // Contra-cheque Bruno
    txid: "d4a3f2b5c0e67d8a2f4a1e9f5b3d0c7e2a6f4b1d9c8e5f3a2b0d7c9e1f3a5b7c9",
    blockHeight: 2_740_360,
    blockTime: "2026-06-15T12:01:00Z",
    pool: "orchard",
    feeZat: ZAT_FEE,
    outputs: [
      out({
        pool: "orchard",
        direction: "out",
        valueZat: zecToZatoshis("9.2"),
        address: "u1bruno…wallet",
        memoRaw: encodeStructuredMemo({
          docType: DocType.Payslip,
          refId: "PS-2026-06-BRUNO",
          sha256: fakeHash("bruno"),
          period: "202606",
          accountCode: "6001",
        }),
        decryptedVia: "ovk",
      }),
    ],
  },
  {
    // Contra-cheque Carla
    txid: "e5b4a3c6d1f78e9b3a5b2f0a6c4e1d8f3b7a5c2e0d9f6a4b3c1e8d0a2f4b6c8d0",
    blockHeight: 2_740_220,
    blockTime: "2026-06-15T12:02:00Z",
    pool: "orchard",
    feeZat: ZAT_FEE,
    outputs: [
      out({
        pool: "orchard",
        direction: "out",
        valueZat: zecToZatoshis("7.65"),
        address: "u1carla…wallet",
        memoRaw: encodeStructuredMemo({
          docType: DocType.Payslip,
          refId: "PS-2026-06-CARLA",
          sha256: fakeHash("carla"),
          period: "202606",
          accountCode: "6001",
        }),
        decryptedVia: "ovk",
      }),
    ],
  },
  {
    // Pagamento a fornecedor (AWS) — memo estruturado de FATURA
    txid: "f6c5b4d7e2a89f0c4b6c3a1b7d5f2e9a4c8b6d3f1e0a7c5b4d2f9e1a3c5b7d9e1",
    blockHeight: 2_739_900,
    blockTime: "2026-06-10T08:00:00Z",
    pool: "orchard",
    feeZat: ZAT_FEE,
    outputs: [
      out({
        pool: "orchard",
        direction: "out",
        valueZat: zecToZatoshis("3.1"),
        address: "u1aws…billing",
        memoRaw: encodeStructuredMemo({
          docType: DocType.Invoice,
          refId: "INV-AWS-5571",
          sha256: fakeHash("aws"),
          period: "202606",
          accountCode: "6300",
        }),
        decryptedVia: "ovk",
      }),
    ],
  },
  {
    // Pagamento manual feito direto no zallet, SEM nosso memo → órfão de saída
    txid: "07d6c5e8f3b90a1d5c7d4b2c8e6a3f0b5d9c7e4a2f1b8d6c5e3a0f2b4d6c8e0f2",
    blockHeight: 2_739_400,
    blockTime: "2026-06-12T16:45:00Z",
    pool: "orchard",
    feeZat: ZAT_FEE,
    outputs: [
      out({
        pool: "orchard",
        direction: "out",
        valueZat: zecToZatoshis("2.0"),
        address: "u1unknown…dest",
        memoRaw: emptyMemo(),
        decryptedVia: "ovk",
      }),
    ],
  },
  {
    // Depósito vindo de exchange (transparente, sem memo) → órfão de entrada
    txid: "18e7d6f9a4c01b2e6d8e5c3d9f7b4a1c6e0d8f5b3a2c9e7d6f4b1a3c5e7d9f1a3",
    blockHeight: 2_739_000,
    blockTime: "2026-06-05T11:20:00Z",
    pool: "transparent",
    feeZat: 0n,
    outputs: [
      out({
        pool: "transparent",
        direction: "in",
        valueZat: zecToZatoshis("20.0"),
        address: "t1corp…deposit (nosso)",
        memoRaw: null,
        decryptedVia: "none",
      }),
    ],
  },
  {
    // Pagamento a fornecedor cujo software usa OUTRO schema 0xFF (versão desconhecida)
    txid: "29f8e7a0b5d12c3f7e9f6d4e0a8c5b2d7f1e9a6c4b3d0f8e7a5c2b4d6f8a0c2e4",
    blockHeight: 2_738_600,
    blockTime: "2026-06-08T13:30:00Z",
    pool: "orchard",
    feeZat: ZAT_FEE,
    outputs: [
      out({
        pool: "orchard",
        direction: "out",
        valueZat: zecToZatoshis("1.2"),
        address: "u1othervendor…",
        memoRaw: thirdPartyArbitraryMemo(),
        decryptedVia: "ovk",
      }),
    ],
  },
];

/**
 * Contra-cheques emitidos pelo sistema. Os 3 primeiros casam com txs on-chain;
 * o de Diego foi emitido mas ainda não foi para a chain (expectedTxid null) →
 * a reconciliação acusa "emitido sem broadcast".
 */
export const MOCK_PAYCHECKS: readonly PaycheckRecord[] = [
  {
    id: "pc-ana-202606",
    payslipId: "PS-2026-06-ANA",
    employeeLabel: "Ana Souza",
    period: "202606",
    amountZat: zecToZatoshis("8.8521"),
    expectedTxid:
      "c3f2e1a4b9d56c7f1e3f0d8e4a2c9b6d1f5e3a0c8b7d4e2f1a9c6b8d0e2f4a6b8",
    accountCode: "6001",
  },
  {
    id: "pc-bruno-202606",
    payslipId: "PS-2026-06-BRUNO",
    employeeLabel: "Bruno Lima",
    period: "202606",
    amountZat: zecToZatoshis("9.2"),
    expectedTxid:
      "d4a3f2b5c0e67d8a2f4a1e9f5b3d0c7e2a6f4b1d9c8e5f3a2b0d7c9e1f3a5b7c9",
    accountCode: "6001",
  },
  {
    id: "pc-carla-202606",
    payslipId: "PS-2026-06-CARLA",
    employeeLabel: "Carla Dias",
    period: "202606",
    amountZat: zecToZatoshis("7.65"),
    expectedTxid:
      "e5b4a3c6d1f78e9b3a5b2f0a6c4e1d8f3b7a5c2e0d9f6a4b3c1e8d0a2f4b6c8d0",
    accountCode: "6001",
  },
  {
    id: "pc-diego-202606",
    payslipId: "PS-2026-06-DIEGO",
    employeeLabel: "Diego Martins",
    period: "202606",
    amountZat: zecToZatoshis("8.4"),
    expectedTxid: null,
    accountCode: "6001",
  },
];

export const MOCK_VIEWING_KEYS: readonly ViewingKeyRecord[] = [
  {
    id: "vk-treasury-main",
    accountLabel: "Tesouraria — conta principal",
    kind: "ufvk",
    pools: ["orchard", "sapling", "transparent"],
    ufvkMasked: "uview1qg7x…q9f2 (mascarada)",
    importedAt: "2026-05-02T10:00:00Z",
    scope: "auditoria (read-only)",
    status: "active",
  },
  {
    id: "vk-payroll-only",
    accountLabel: "Folha — sub-conta",
    kind: "uivk",
    pools: ["orchard"],
    ufvkMasked: "uivk1m4k…7d3a (mascarada)",
    importedAt: "2026-05-20T15:30:00Z",
    scope: "somente entradas",
    status: "active",
  },
];

export const MOCK_VK_ACCESS: readonly ViewingKeyAccess[] = [
  {
    id: "acc-1",
    viewingKeyId: "vk-treasury-main",
    principal: "ana.contabil@empresa",
    grantedAt: "2026-05-02T10:05:00Z",
    scope: "auditoria",
    reason: "fechamento mensal",
  },
  {
    id: "acc-2",
    viewingKeyId: "vk-treasury-main",
    principal: "auditor.externo@kpmg",
    grantedAt: "2026-06-01T09:00:00Z",
    scope: "leitura via app (RBAC)",
    reason: "auditoria trimestral",
  },
  {
    id: "acc-3",
    viewingKeyId: "vk-payroll-only",
    principal: "rh.folha@empresa",
    grantedAt: "2026-05-20T15:35:00Z",
    scope: "somente entradas",
    reason: "conferência de recebimentos",
  },
];
