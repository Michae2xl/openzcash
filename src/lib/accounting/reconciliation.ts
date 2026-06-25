/**
 * Reconciliação: cruza as transações observadas via viewing key com os
 * contra-cheques emitidos pelo sistema, classifica cada movimento e levanta
 * exceções (o que precisa de olho humano).
 *
 * Decisões de modelagem que vêm direto da crítica de domínio (docs/03):
 *  - FEES (ZIP-317) entram no efeito líquido de saldo de cada saída.
 *  - CHANGE é interno (volta para a tesouraria) e NÃO conta no efeito líquido.
 *  - OUTPUTS ÓRFÃOS (pagamentos sem o nosso memo estruturado, depósitos de
 *    exchange sem memo) são exceções de primeira classe, não "casos raros".
 *  - Contra-cheque emitido mas ainda sem transação on-chain vira exceção
 *    (pendente/expirado) — o dinheiro ainda não saiu.
 */

import { decodeMemo, type DecodedMemo } from "../zcash/memo/zip302";
import {
  parseStructuredMemo,
  type StructuredMemoRef,
} from "../zcash/memo/structured-memo";
import type { ChainTx, PaycheckRecord, Pool } from "../zcash/types";
import {
  buildInternalIndex,
  legKey,
  type InternalIndex,
} from "./internal-transfers";

export type EntryClass =
  | "income"
  | "paycheck"
  | "vendor_payment"
  | "orphan_in"
  | "orphan_out"
  | "external_payment"
  | "pending_paycheck"
  | "passthrough"
  | "internal_out"
  | "internal_in"
  | "internal_out_unconfirmed"
  | "mixed_transfer"
  | "shielded_out"
  | "grant_received"
  | "bounty_received"
  | "grant_paid"
  | "bounty_paid"
  | "viewkey_payout";

export type ReconStatus = "matched" | "exception" | "info";

export interface LedgerEntry {
  readonly txid: string | null;
  /** Tesouro (viewing key) dono deste lançamento. */
  readonly treasuryId: string | null;
  readonly blockTime: string;
  readonly blockHeight: number | null;
  readonly pool: Pool | null;
  /** Efeito no saldo: + entradas, − saídas, − fee. Change não conta. */
  readonly netZat: bigint;
  /** Valor bruto movimentado num repasse de passagem (recebido = reenviado). */
  readonly grossZat?: bigint;
  readonly feeZat: bigint;
  /** Componentes do movimento, separando EXTERNO (terceiros) de INTERNO (entre
   * tesouros próprios) por OUTPUT — uma tx pode ter as duas partes ao mesmo tempo. */
  readonly extInZat: bigint;
  readonly extOutZat: bigint;
  readonly intInZat: bigint;
  readonly intOutZat: bigint;
  readonly classification: EntryClass;
  readonly reconStatus: ReconStatus;
  readonly counterparty: string | null;
  readonly memo: DecodedMemo | null;
  readonly structured: StructuredMemoRef | null;
  readonly matchedPaycheckId: string | null;
  /** Explicação curta da classificação/exceção. */
  readonly note: string | null;
}

export interface ReconciliationSummary {
  readonly balanceZat: bigint;
  readonly totalInZat: bigint;
  readonly totalOutZat: bigint;
  readonly totalFeeZat: bigint;
  readonly matchedCount: number;
  readonly exceptionCount: number;
  readonly entryCount: number;
  /** Repasses de passagem (entrada casada com saída de mesmo valor/dia). */
  readonly passthroughCount: number;
  /** Volume bruto que atravessou a carteira em repasses. */
  readonly volumeZat: bigint;
  /** Volume movido ENTRE tesouros do mesmo dono (contado uma vez, lado emissor). */
  readonly internalVolumeZat: bigint;
  /** Nº de transferências internas confirmadas (pares fechados). */
  readonly internalTransferCount: number;
  /** Fee de rede gasta nas transferências internas (ZEC realmente queimado). */
  readonly internalFeeZat: bigint;
}

export interface ReconciliationResult {
  readonly entries: readonly LedgerEntry[];
  readonly summary: ReconciliationSummary;
}

/**
 * net = Σ entradas − Σ saídas (− fee só quando a saída é nossa). Change é interno
 * e ignorado. A fee (ZIP-317) é paga por quem CRIA a transação: numa entrada pura,
 * o remetente pagou a fee, então ela NÃO reduz o nosso saldo.
 */
function netEffect(tx: ChainTx): bigint {
  let net = 0n;
  let weSpent = false;
  for (const o of tx.outputs) {
    if (o.direction === "in") net += o.valueZat;
    else if (o.direction === "out") {
      net -= o.valueZat;
      weSpent = true;
    }
  }
  return weSpent ? net - tx.feeZat : net;
}

/** Output que representa o "assunto" da transação (saída tem prioridade sobre entrada). */
function principalOutput(tx: ChainTx) {
  return (
    tx.outputs.find((o) => o.direction === "out") ??
    tx.outputs.find((o) => o.direction === "in") ??
    tx.outputs[0] ??
    null
  );
}

export interface DerivedAddressInfo {
  readonly projectId?: string;
  readonly projectName: string;
  readonly paymentKind: string; // "grant" | "bounty"
  readonly issuedMonth: string;
}

function classifyTx(
  tx: ChainTx,
  paychecksByPayslip: ReadonlyMap<string, PaycheckRecord>,
  markMatchedPayslip: (payslipId: string) => void,
  internal: InternalIndex,
  treasuryLabels: ReadonlyMap<string, string>,
  overrides: ReadonlyMap<string, string>,
  derivedAddrs: ReadonlyMap<string, DerivedAddressInfo>,
): LedgerEntry {
  const principal = principalOutput(tx);
  const memo = principal ? decodeMemo(principal.memoRaw) : null;
  const structured = principal ? parseStructuredMemo(principal.memoRaw) : null;
  const netZat = netEffect(tx);

  // Componentes por OUTPUT: separa o que é interno (casado com twin em outro
  // tesouro) do que é externo (terceiros), inclusive numa MESMA tx mista.
  const lk = legKey(tx.treasuryId, tx.txid);
  const intOutZat = internal.internalOutValueByLeg.get(lk) ?? 0n;
  const intInZat = internal.internalInValueByLeg.get(lk) ?? 0n;
  const sumOut = tx.outputs.reduce(
    (s, o) => (o.direction === "out" ? s + o.valueZat : s),
    0n,
  );
  const sumIn = tx.outputs.reduce(
    (s, o) => (o.direction === "in" ? s + o.valueZat : s),
    0n,
  );
  const extOutZat = sumOut - intOutZat;
  const extInZat = sumIn - intInZat;

  const base = {
    txid: tx.txid,
    treasuryId: tx.treasuryId ?? null,
    blockTime: tx.blockTime,
    blockHeight: tx.blockHeight,
    pool: tx.pool,
    netZat,
    feeZat: tx.feeZat,
    memo,
    structured,
    extInZat,
    extOutZat,
    intInZat,
    intOutZat,
  } as const;

  // OVERRIDE manual: precedência máxima sobre toda a auto-classificação.
  const override = overrides.get(lk);
  if (override) {
    return {
      ...base,
      classification: override as EntryClass,
      reconStatus: "info",
      counterparty: principal?.address ?? null,
      matchedPaycheckId: null,
      note: "Manually reclassified by admin.",
    };
  }

  if (!principal) {
    return {
      ...base,
      classification: "orphan_in",
      reconStatus: "exception",
      counterparty: null,
      matchedPaycheckId: null,
      note: "Transação sem outputs observáveis.",
    };
  }

  const internalClass = internal.classByLeg.get(lk);
  const peerId = internal.peerTreasury.get(lk);
  const peerLabel = peerId ? (treasuryLabels.get(peerId) ?? peerId) : null;

  // Saída para endereço de outro tesouro nosso, mas SEM par fechado → exceção. O
  // valor segue contado como saída EXTERNA provisória (extOutZat) até confirmar.
  if (internalClass === "internal_out_unconfirmed" && !structured) {
    return {
      ...base,
      classification: "internal_out_unconfirmed",
      reconStatus: "exception",
      grossZat: extOutZat,
      counterparty: peerLabel,
      matchedPaycheckId: null,
      note: "Saída para endereço de outro tesouro, mas a perna de recebimento ainda não foi observada — revisar.",
    };
  }

  // Transferência interna PURA (sem nenhum componente externo na mesma tx). Memo
  // estruturado (holerite/fatura) prevalece sobre interno.
  const isPureInternal =
    (internalClass === "internal_out" || internalClass === "internal_in") &&
    extOutZat === 0n &&
    extInZat === 0n;
  if (isPureInternal && !structured) {
    const movedZat = internalClass === "internal_in" ? intInZat : intOutZat;
    return {
      ...base,
      classification: internalClass,
      reconStatus: "info",
      grossZat: movedZat,
      counterparty: peerLabel,
      matchedPaycheckId: null,
      note:
        internalClass === "internal_out"
          ? "Transferência para outro tesouro do mesmo dono — não é despesa externa."
          : "Recebida de outro tesouro do mesmo dono — não é receita externa.",
    };
  }

  // Tx MISTA: tem perna interna casada E também movimento externo no mesmo txid
  // (rara). Os totais já separam os componentes (ext*/int*); marca para revisão.
  if ((intOutZat > 0n || intInZat > 0n) && !structured) {
    return {
      ...base,
      classification: "mixed_transfer",
      reconStatus: "exception",
      grossZat: intOutZat > 0n ? intOutZat : intInZat,
      counterparty: peerLabel,
      matchedPaycheckId: null,
      note: "Transação mista: parte interna (entre tesouros) e parte externa (terceiro) no mesmo txid — revisar.",
    };
  }

  // Recebimento/pagamento num endereço DERIVADO de projeto (grant/bounty),
  // detectado pelo ENDEREÇO — não precisa de memo. Memo estruturado tem precedência.
  const derivedOut = tx.outputs.find(
    (o) => o.address && derivedAddrs.has(o.address),
  );
  if (derivedOut && !structured) {
    const info = derivedAddrs.get(
      derivedOut.address as string,
    ) as DerivedAddressInfo;
    const paid = derivedOut.direction === "out";
    const cls: EntryClass =
      info.paymentKind === "bounty"
        ? paid
          ? "bounty_paid"
          : "bounty_received"
        : paid
          ? "grant_paid"
          : "grant_received";
    return {
      ...base,
      classification: cls,
      reconStatus: "info",
      counterparty: `${info.projectName} · ${info.issuedMonth}`,
      matchedPaycheckId: null,
      note: paid
        ? "Pagamento ao endereço derivado do projeto (mês)."
        : "Recebimento no endereço derivado do projeto (mês).",
    };
  }

  // Entradas
  if (principal.direction === "in") {
    const hasContext = memo?.kind === "text" || structured !== null;
    if (hasContext) {
      return {
        ...base,
        classification: "income",
        reconStatus: "info",
        counterparty:
          structured?.refId ?? (memo?.kind === "text" ? memo.text : null),
        matchedPaycheckId: null,
        note: null,
      };
    }
    return {
      ...base,
      classification: "orphan_in",
      reconStatus: "exception",
      counterparty: principal.address,
      matchedPaycheckId: null,
      note:
        principal.pool === "transparent"
          ? "Depósito transparente sem memo (ex.: exchange) — classificar manualmente."
          : "Entrada sem memo — classificar manualmente.",
    };
  }

  // Saídas com nosso memo estruturado
  if (structured) {
    if (structured.docType === 1 /* payslip */) {
      const pc = paychecksByPayslip.get(structured.refId);
      if (pc) {
        markMatchedPayslip(structured.refId);
        return {
          ...base,
          classification: "paycheck",
          reconStatus: "matched",
          counterparty: pc.employeeLabel,
          matchedPaycheckId: pc.id,
          note: null,
        };
      }
      return {
        ...base,
        classification: "paycheck",
        reconStatus: "exception",
        counterparty: structured.refId,
        matchedPaycheckId: null,
        note: `Memo de holerite ${structured.refId} sem contra-cheque correspondente no sistema.`,
      };
    }
    // fatura / outros docs estruturados
    return {
      ...base,
      classification: "vendor_payment",
      reconStatus: "matched",
      counterparty: structured.refId,
      matchedPaycheckId: null,
      note: null,
    };
  }

  // Saída transparente para o pool BLINDADO (sapling/orchard): de um endereço
  // transparente, sabemos QUANTO saiu, não para quem (o destino é shielded).
  if (
    principal.direction === "out" &&
    principal.address === null &&
    principal.pool === "transparent"
  ) {
    return {
      ...base,
      classification: "shielded_out",
      reconStatus: "info",
      counterparty: "pool blindado (Sapling/Orchard)",
      matchedPaycheckId: null,
      note: "Saída do endereço transparente para o pool blindado — destino não observável a partir do t-addr.",
    };
  }

  // Saída sem nosso memo estruturado. Se o destino foi decifrado (via OVK), é um
  // pagamento a terceiro identificável (sabemos o endereço). Senão, fica órfão.
  if (principal.address && memo?.kind !== "arbitrary") {
    return {
      ...base,
      classification: "external_payment",
      reconStatus: "info",
      counterparty: principal.address,
      matchedPaycheckId: null,
      note: "Pagamento a terceiro (endereço de destino decifrado via OVK).",
    };
  }
  return {
    ...base,
    classification: "orphan_out",
    reconStatus: "exception",
    counterparty: principal.address,
    matchedPaycheckId: null,
    note:
      memo?.kind === "arbitrary"
        ? "Saída com memo de schema desconhecido (terceiro) — classificar."
        : "Pagamento sem o memo estruturado do sistema (feito fora do fluxo) — classificar.",
  };
}

/** Janela em que receber + repassar contam como uma única "passagem" (~36h). */
const PASSTHROUGH_WINDOW_MS = 36 * 60 * 60 * 1000;

/**
 * Detecta REPASSES de uma carteira de passagem: uma entrada sem memo casada com
 * uma saída sem memo de MESMO valor numa janela curta — a carteira só atravessou
 * o dinheiro. Funde o par num único lançamento "passthrough" (não é exceção).
 */
function foldPassthroughs(entries: readonly LedgerEntry[]): LedgerEntry[] {
  const isOrphan = (e: LedgerEntry) =>
    e.classification === "orphan_in" || e.classification === "orphan_out";

  const others = entries.filter((e) => !isOrphan(e) || !e.blockTime);
  // Ordena por tesouro e depois por tempo: passagens são detectadas DENTRO de um
  // mesmo tesouro (nunca casa entrada de um tesouro com saída de outro).
  const orphans = entries
    .filter((e) => isOrphan(e) && e.blockTime)
    .sort((a, b) => {
      const byT = (a.treasuryId ?? "").localeCompare(b.treasuryId ?? "");
      return byT !== 0
        ? byT
        : Date.parse(a.blockTime) - Date.parse(b.blockTime);
    });

  const result: LedgerEntry[] = [...others];
  let cluster: LedgerEntry[] = [];
  let lastT = Number.NEGATIVE_INFINITY;
  let lastTreasury: string | null = null;

  const flush = () => {
    if (cluster.length === 0) return;
    const inSum = cluster
      .filter((e) => e.netZat > 0n)
      .reduce((s, e) => s + e.netZat, 0n);
    const outSum = cluster
      .filter((e) => e.netZat < 0n)
      .reduce((s, e) => s - e.netZat, 0n);

    // Recebeu e repassou exatamente o mesmo valor no mesmo período → passagem
    // (cobre 1:1 e consolidações: várias notas entram, uma tx repassa o total).
    if (inSum > 0n && inSum === outSum) {
      const first = cluster.find((e) => e.netZat > 0n) ?? cluster[0];
      result.push({
        ...first,
        classification: "passthrough",
        reconStatus: "info",
        netZat: 0n,
        grossZat: inSum,
        extInZat: 0n,
        extOutZat: 0n,
        intInZat: 0n,
        intOutZat: 0n,
        counterparty: null,
        note:
          cluster.length > 2
            ? "Recebido em partes e repassado no mesmo período — a carteira apenas atravessou o valor."
            : "Recebido e repassado no mesmo dia — a carteira apenas atravessou o valor.",
      });
    } else {
      result.push(...cluster);
    }
    cluster = [];
  };

  for (const e of orphans) {
    const t = Date.parse(e.blockTime);
    const treasury = e.treasuryId ?? null;
    if (
      cluster.length > 0 &&
      (treasury !== lastTreasury || t - lastT > PASSTHROUGH_WINDOW_MS)
    )
      flush();
    cluster.push(e);
    lastT = t;
    lastTreasury = treasury;
  }
  flush();
  return result;
}

export function reconcile(
  txs: readonly ChainTx[],
  paychecks: readonly PaycheckRecord[],
  treasuryLabels: ReadonlyMap<string, string> = new Map(),
  overrides: ReadonlyMap<string, string> = new Map(),
  derivedAddrs: ReadonlyMap<string, DerivedAddressInfo> = new Map(),
): ReconciliationResult {
  const paychecksByPayslip = new Map(paychecks.map((p) => [p.payslipId, p]));
  const matchedPayslips = new Set<string>();
  const internal = buildInternalIndex(txs);

  const classified = [...txs]
    .sort((a, b) => b.blockHeight - a.blockHeight)
    .map((tx) =>
      classifyTx(
        tx,
        paychecksByPayslip,
        (id) => matchedPayslips.add(id),
        internal,
        treasuryLabels,
        overrides,
        derivedAddrs,
      ),
    );
  const txEntries = foldPassthroughs(classified);

  // Contra-cheques emitidos que não apareceram on-chain → exceção (pendente/expiry).
  const pendingEntries: LedgerEntry[] = paychecks
    .filter((p) => !matchedPayslips.has(p.payslipId))
    .map((p) => ({
      txid: p.expectedTxid,
      treasuryId: null,
      blockTime: "",
      blockHeight: null,
      pool: null,
      netZat: 0n,
      feeZat: 0n,
      extInZat: 0n,
      extOutZat: 0n,
      intInZat: 0n,
      intOutZat: 0n,
      classification: "pending_paycheck",
      reconStatus: "exception",
      counterparty: p.employeeLabel,
      memo: null,
      structured: null,
      matchedPaycheckId: p.id,
      note: p.expectedTxid
        ? "Contra-cheque emitido, transação ainda não observada na chain."
        : "Contra-cheque emitido mas ainda não transmitido (sem broadcast).",
    }));

  const entries = [...txEntries, ...pendingEntries];

  const summary = entries.reduce<{
    balanceZat: bigint;
    totalInZat: bigint;
    totalOutZat: bigint;
    totalFeeZat: bigint;
    matchedCount: number;
    exceptionCount: number;
    passthroughCount: number;
    volumeZat: bigint;
    internalVolumeZat: bigint;
    internalTransferCount: number;
    internalFeeZat: bigint;
  }>(
    (acc, e) => {
      acc.balanceZat += e.netZat;
      acc.totalFeeZat += e.feeZat;
      // Entradas/Saídas EXTERNAS vêm dos COMPONENTES por-output — uma tx mista
      // contribui só a parte de/para terceiros; o interno fica fora. A fee fica
      // só em Taxas (não duplica em Saídas): Saldo = Entradas − Saídas − Taxas.
      acc.totalInZat += e.extInZat;
      acc.totalOutZat += e.extOutZat;
      if (e.reconStatus === "matched") acc.matchedCount += 1;
      if (e.reconStatus === "exception") acc.exceptionCount += 1;
      if (e.classification === "passthrough") {
        acc.passthroughCount += 1;
        acc.volumeZat += e.grossZat ?? 0n;
      }
      // Volume interno: valor enviado a outro tesouro (lado emissor), por output
      // casado — exclui o componente externo de uma tx mista.
      if (e.intOutZat > 0n) {
        acc.internalTransferCount += 1;
        acc.internalVolumeZat += e.intOutZat;
        if (e.classification === "internal_out") acc.internalFeeZat += e.feeZat;
      }
      return acc;
    },
    {
      balanceZat: 0n,
      totalInZat: 0n,
      totalOutZat: 0n,
      totalFeeZat: 0n,
      matchedCount: 0,
      exceptionCount: 0,
      passthroughCount: 0,
      volumeZat: 0n,
      internalVolumeZat: 0n,
      internalTransferCount: 0,
      internalFeeZat: 0n,
    },
  );

  return {
    entries,
    summary: { ...summary, entryCount: entries.length },
  };
}
