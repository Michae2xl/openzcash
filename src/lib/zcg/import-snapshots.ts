/**
 * Fase 3 — Snapshots ao vivo de saldo + budget discricionário + aportes Maya.
 *
 * As abas de overview/balance da planilha ZCG são KEY-VALUE VERTICAIS: o rótulo
 * fica na coluna 0 e os valores nas colunas seguintes (a aba overview tem DUAS
 * colunas de valor — ZCG na 1, Lockbox na 2). Os rótulos variam, têm typos
 * ("Recieved") e quebras de linha — por isso o match é por RÓTULO normalizado
 * com fallback de substring, NUNCA por índice fixo.
 *
 * Dinheiro nunca passa por float persistido: USD → centavos (bigint), ZEC →
 * zatoshis (bigint) via parseUsdCents/parseZecToZat. CACAO da Maya NÃO é ZEC e
 * é ignorado de propósito. Preço de snapshot é único por block height.
 */

import { getDb } from "@/lib/db/client";
import {
  zcgBalanceSnapshots,
  zcgBudgetSnapshots,
  zcgMayaTransfers,
} from "@/lib/db/schema";
import { parseCsv } from "./csv";
import { parseUsdCents, parseZcgDate, parseZecToZat } from "./normalize";
import { fetchSheetCsv, readSheetStatus, sha256, ZCG_GIDS } from "./sheets";

type BalanceInput = typeof zcgBalanceSnapshots.$inferInsert;
type BudgetInput = typeof zcgBudgetSnapshots.$inferInsert;
type MayaInput = typeof zcgMayaTransfers.$inferInsert;

export type ScopeResult = { scope: string; ok: boolean; note: string };

/** lower + colapsa espaços/quebras + remove pontuação de borda — chave de rótulo. */
function normLabel(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[:#]+/g, "")
    .trim();
}

/**
 * Varre as linhas montando rótulo→[valores]. A coluna 0 é o rótulo; as demais
 * são valores (a overview usa col 1 = ZCG, col 2 = Lockbox). Rótulos vazios são
 * ignorados. Mantém a 1ª ocorrência de cada rótulo (rótulos repetidos como
 * "USD value at current price" pertencem a blocos que não nos interessam aqui).
 */
function buildLabelMap(rows: string[][]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const label = normLabel(r[0] ?? "");
    if (!label) continue;
    if (map.has(label)) continue;
    map.set(label, r.slice(1));
  }
  return map;
}

/**
 * Busca o rótulo tolerante: igualdade normalizada primeiro, depois substring
 * (em qualquer direção, para absorver typos e sufixos como "(total in USD)").
 * Retorna a célula `col` (0 = primeiro valor) ou "" se não achar.
 */
function pick(
  map: Map<string, string[]>,
  col: number,
  ...needles: string[]
): string {
  for (const needle of needles) {
    const nn = normLabel(needle);
    const vals = map.get(nn);
    if (vals) return (vals[col] ?? "").trim();
  }
  for (const needle of needles) {
    const nn = normLabel(needle);
    for (const [k, vals] of map) {
      if (k.includes(nn) || nn.includes(k)) {
        const v = (vals[col] ?? "").trim();
        if (v !== "") return v;
      }
    }
  }
  return "";
}

/** "3,381,187" → 3381187n. Vazio/inválido → null. */
function parseBlockHeight(raw: string): bigint | null {
  const cleaned = raw.replace(/[^0-9]/g, "");
  if (cleaned === "") return null;
  try {
    return BigInt(cleaned);
  } catch {
    return null;
  }
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/**
 * Block time com hora, em dois formatos reais da planilha:
 *  - "17 Jun 2026 15:15:49"   (overview/balance ZCG)
 *  - "6/17/2026 15:15:00"     (lockbox)
 * Trata como UTC (a planilha rotula "Block time (UTC)"). Sem hora → meia-noite
 * UTC. Inválido → null.
 */
function parseBlockTime(raw: string): Date | null {
  const s = raw.trim();
  if (s === "") return null;

  // "17 Jun 2026 15:15:49"
  let m = s.match(
    /^(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (m) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mon) {
      return new Date(
        Date.UTC(
          +m[3],
          mon - 1,
          +m[1],
          m[4] ? +m[4] : 0,
          m[5] ? +m[5] : 0,
          m[6] ? +m[6] : 0,
        ),
      );
    }
  }

  // "6/17/2026 15:15:00"
  m = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (m) {
    let year = +m[3];
    if (year < 100) year += 2000;
    return new Date(
      Date.UTC(
        year,
        +m[1] - 1,
        +m[2],
        m[4] ? +m[4] : 0,
        m[5] ? +m[5] : 0,
        m[6] ? +m[6] : 0,
      ),
    );
  }

  return null;
}

/** captured_at: usa o block time quando houver, senão o momento do import. */
function capturedAtFrom(blockTime: Date | null, fallback: Date): Date {
  return blockTime ?? fallback;
}

function balanceId(scope: string, capturedAt: Date): string {
  return sha256(`${scope}|${capturedAt.toISOString()}`);
}

/**
 * Overview (gid 892150625): chave-valor com DUAS colunas (ZCG col 0, Lockbox
 * col 1 dos valores). Captura a reconciliação de alto nível: ambos os heights,
 * preço único, saldos ZEC, caixa USD e a liquidez Maya (em USD).
 */
function parseOverview(
  rows: string[][],
  gid: string,
  importedAt: Date,
): BalanceInput {
  const map = buildLabelMap(rows);
  const priceCents = parseUsdCents(pick(map, 0, "ZECUSD price"));

  // Overview tem 2 heights; ancoramos o snapshot no ZCG (col 0).
  const blockHeight = parseBlockHeight(pick(map, 0, "Block height"));
  const blockTime = parseBlockTime(
    pick(map, 0, "Block time (UTC)", "Block time"),
  );
  const capturedAt = capturedAtFrom(blockTime, importedAt);

  const scope = "overview_reconciliation";
  return {
    id: balanceId(scope, capturedAt),
    scope,
    capturedAt,
    blockHeight,
    blockTime,
    status: null,
    zecBalanceZat: parseZecToZat(pick(map, 0, "Current ZEC balance")),
    usdCashBalanceCents: parseUsdCents(pick(map, 0, "Current USD balance")),
    zecusdPriceCents: priceCents,
    usdValueOfZecCents: null,
    usdTotalHoldingsCents: null,
    usdGrantsApprovedCents: null,
    usdMilestonesPaidCents: null,
    futureGrantLiabilitiesCents: null,
    zecReceivablesZat: null,
    sourceSheetGid: gid,
    importedAt,
  };
}

/**
 * ZCG operating balance (gid 135980745) ou Lockbox/Coinholder (gid 808560406).
 * Mesma forma vertical de 1 coluna de valor. Os rótulos diferem um pouco entre
 * as abas (ex.: "Donations Accrued/Recieved" com typo na ZCG vs "Received" na
 * Lockbox) — por isso o match é tolerante.
 */
function parseBalanceSheet(
  rows: string[][],
  gid: string,
  scope: string,
  importedAt: Date,
): BalanceInput {
  const map = buildLabelMap(rows);
  const status = readSheetStatus(rows);
  const blockHeight = parseBlockHeight(
    pick(
      map,
      0,
      "Coinbase address balance as of block height",
      "Coinholder Grants balance as of block height",
      "balance as of block height",
      "Block height",
    ),
  );
  const blockTime = parseBlockTime(
    pick(map, 0, "Block time (UTC)", "Block time"),
  );
  const capturedAt = capturedAtFrom(blockTime, importedAt);

  return {
    id: balanceId(scope, capturedAt),
    scope,
    capturedAt,
    blockHeight,
    blockTime,
    status,
    zecBalanceZat: parseZecToZat(pick(map, 0, "Current ZEC balance")),
    usdCashBalanceCents: parseUsdCents(pick(map, 0, "Current USD balance")),
    zecusdPriceCents: parseUsdCents(pick(map, 0, "ZECUSD price")),
    usdValueOfZecCents: parseUsdCents(
      pick(
        map,
        0,
        "USD value of Current ZEC balance",
        "USD value of current ZEC balance",
      ),
    ),
    usdTotalHoldingsCents: parseUsdCents(
      pick(
        map,
        0,
        "USD value of current holdings",
        "USD value available current holdings",
      ),
    ),
    usdGrantsApprovedCents: parseUsdCents(
      pick(map, 0, "Total USD value of grants approved"),
    ),
    usdMilestonesPaidCents: parseUsdCents(
      pick(map, 0, "USD value of grant milestones paid out so far"),
    ),
    futureGrantLiabilitiesCents: parseUsdCents(
      pick(
        map,
        0,
        "Future grant liabilities (total in USD)",
        "Future grant liabilities (total)",
      ),
    ),
    zecReceivablesZat: parseZecToZat(
      pick(
        map,
        0,
        "Total ZEC receivables",
        "Future ZEC donations (Receivables)",
      ),
    ),
    sourceSheetGid: gid,
    importedAt,
  };
}

/**
 * Maya (gid 1024670602): a aba tem uma tabela de aportes (linhas com data +
 * ZEC) à esquerda e um bloco de KPIs à direita. Para o snapshot de liquidez
 * pegamos os KPIs (USD em carteira, ZEC em carteira); CACAO é ignorado.
 */
function parseMayaSnapshot(
  rows: string[][],
  gid: string,
  importedAt: Date,
): BalanceInput {
  const map = buildLabelMap(rows);
  const scope = "maya_liquidity";
  const capturedAt = importedAt;
  return {
    id: balanceId(scope, capturedAt),
    scope,
    capturedAt,
    blockHeight: null,
    blockTime: null,
    status: null,
    // KPIs ficam na coluna após o rótulo; varremos col 0..2 dos valores.
    zecBalanceZat: parseZecToZat(pickMulti(map, ["ZEC"])),
    usdCashBalanceCents: parseUsdCents(pickMulti(map, ["USD Value in Wallet"])),
    zecusdPriceCents: null,
    usdValueOfZecCents: parseUsdCents(
      pickMulti(map, ["Current Value of ZEC transferred (USD)"]),
    ),
    usdTotalHoldingsCents: null,
    usdGrantsApprovedCents: null,
    usdMilestonesPaidCents: null,
    futureGrantLiabilitiesCents: null,
    zecReceivablesZat: null,
    sourceSheetGid: gid,
    importedAt,
  };
}

/**
 * Variante de pick que procura o primeiro valor não-vazio em qualquer coluna
 * de valor (a aba Maya espalha os KPIs em colunas variáveis à direita).
 */
function pickMulti(map: Map<string, string[]>, needles: string[]): string {
  for (const needle of needles) {
    const nn = normLabel(needle);
    const vals = map.get(nn);
    if (vals) {
      const hit = vals.find((v) => v.trim() !== "");
      if (hit) return hit.trim();
    }
  }
  for (const needle of needles) {
    const nn = normLabel(needle);
    for (const [k, vals] of map) {
      if (k === nn) {
        const hit = vals.find((v) => v.trim() !== "");
        if (hit) return hit.trim();
      }
    }
  }
  return "";
}

/**
 * Budget discricionário (gid 2043949055, linhas 0-4 ACIMA do header da linha 5).
 * Layout: header row 0 = ["", "USD", "ZEC"], depois 3 linhas rotuladas. USD e
 * ZEC DIVERGEM (não é a mesma conta) — armazenamos separados.
 */
function parseBudget(
  rows: string[][],
  gid: string,
  capturedAt: Date,
): BudgetInput[] {
  const map = buildLabelMap(rows.slice(0, 5));
  const specs: { label: BudgetInput["label"]; needle: string }[] = [
    { label: "annual_budget", needle: "Annual Budget" },
    { label: "spent_to_date", needle: "Spent to date" },
    { label: "budget_remaining", needle: "Budget Remaining" },
  ];
  const out: BudgetInput[] = [];
  for (const spec of specs) {
    const usdCents = parseUsdCents(pick(map, 0, spec.needle));
    const zecZat = parseZecToZat(pick(map, 1, spec.needle));
    out.push({
      id: sha256(
        `budget|${spec.label}|${capturedAt.toISOString()}|${usdCents}|${zecZat}`,
      ),
      sourceSheet: "discretionary",
      label: spec.label,
      usdCents,
      zecZat,
      capturedAt,
    });
  }
  return out;
}

/**
 * Aportes Maya: linhas da tabela à esquerda com Project + Amount (USD) +
 * Transferred (data) + ZEC Transferred + ZEC/USD. O header está na linha 0.
 */
function parseMayaTransfers(rows: string[][]): MayaInput[] {
  const out: MayaInput[] = [];
  // Header conhecido: Project, Amount (USD), Transferred, ZEC Transferred,
  // USD Transferred, ZEC/USD. Índices fixos só nesta tabela tabular.
  const COL = {
    project: 0,
    amountUsd: 1,
    transferred: 2,
    zecTransferred: 3,
    rate: 5,
  };
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const dateRaw = (r[COL.transferred] ?? "").trim();
    const transferredAt = parseZcgDate(dateRaw);
    const zecTransferredZat = parseZecToZat(r[COL.zecTransferred] ?? "");
    // Linha de aporte = tem data E ZEC transferido.
    if (!transferredAt || zecTransferredZat == null) continue;

    const project = (r[COL.project] ?? "").trim() || null;
    const amountUsdCents = parseUsdCents(r[COL.amountUsd] ?? "");
    const zecUsdPriceCents = parseUsdCents(r[COL.rate] ?? "");
    out.push({
      id: sha256(
        [
          "maya",
          project ?? "",
          transferredAt,
          String(zecTransferredZat),
          String(amountUsdCents),
        ].join("|"),
      ),
      project,
      amountUsdCents,
      transferredAt,
      zecTransferredZat,
      zecUsdPriceCents,
    });
  }
  return out;
}

/** Resumo legível de um snapshot de saldo para o log de retorno. */
function summarizeBalance(b: BalanceInput): string {
  const parts: string[] = [];
  if (b.blockHeight != null) parts.push(`height=${b.blockHeight}`);
  if (b.zecusdPriceCents != null)
    parts.push(`price=$${Number(b.zecusdPriceCents) / 100}`);
  if (b.zecBalanceZat != null)
    parts.push(`zec=${Number(b.zecBalanceZat) / 1e8}`);
  if (b.usdCashBalanceCents != null)
    parts.push(`usdCash=$${Number(b.usdCashBalanceCents) / 100}`);
  if (b.usdTotalHoldingsCents != null)
    parts.push(`holdings=$${Number(b.usdTotalHoldingsCents) / 100}`);
  if (b.usdGrantsApprovedCents != null)
    parts.push(`grantsApproved=$${Number(b.usdGrantsApprovedCents) / 100}`);
  if (b.usdMilestonesPaidCents != null)
    parts.push(`milestonesPaid=$${Number(b.usdMilestonesPaidCents) / 100}`);
  if (b.futureGrantLiabilitiesCents != null)
    parts.push(`futureLiab=$${Number(b.futureGrantLiabilitiesCents) / 100}`);
  if (b.zecReceivablesZat != null)
    parts.push(`receivables=${Number(b.zecReceivablesZat) / 1e8} ZEC`);
  return parts.join(", ") || "no fields";
}

type BalanceSpec = {
  scope: string;
  gid: string;
  build: (rows: string[][], importedAt: Date) => BalanceInput;
};

/**
 * Importa os snapshots de saldo (4 escopos), o budget discricionário (3 linhas)
 * e os aportes Maya. Best-effort por escopo: falha de fetch num escopo não
 * derruba os outros. Insere com onConflictDoNothing (UNIQUE scope+capturedAt e
 * label+capturedAt) — re-rodar com o mesmo block time é idempotente.
 */
export async function importSnapshots(): Promise<ScopeResult[]> {
  const db = getDb();
  const results: ScopeResult[] = [];

  const balanceSpecs: BalanceSpec[] = [
    {
      scope: "zcg_operating",
      gid: ZCG_GIDS.zcgBalance,
      build: (rows, importedAt) =>
        parseBalanceSheet(
          rows,
          ZCG_GIDS.zcgBalance,
          "zcg_operating",
          importedAt,
        ),
    },
    {
      scope: "lockbox_coinholder",
      gid: ZCG_GIDS.lockboxBalance,
      build: (rows, importedAt) =>
        parseBalanceSheet(
          rows,
          ZCG_GIDS.lockboxBalance,
          "lockbox_coinholder",
          importedAt,
        ),
    },
    {
      scope: "overview_reconciliation",
      gid: ZCG_GIDS.overview,
      build: (rows, importedAt) =>
        parseOverview(rows, ZCG_GIDS.overview, importedAt),
    },
    {
      scope: "maya_liquidity",
      gid: ZCG_GIDS.maya,
      build: (rows, importedAt) =>
        parseMayaSnapshot(rows, ZCG_GIDS.maya, importedAt),
    },
  ];

  for (const spec of balanceSpecs) {
    try {
      const csvText = await fetchSheetCsv(spec.gid);
      const rows = parseCsv(csvText);
      const snapshot = spec.build(rows, new Date());
      await db
        .insert(zcgBalanceSnapshots)
        .values(snapshot)
        .onConflictDoNothing();
      results.push({
        scope: spec.scope,
        ok: true,
        note: summarizeBalance(snapshot),
      });
    } catch (err) {
      results.push({
        scope: spec.scope,
        ok: false,
        note: `error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // Budget discricionário (3 linhas, USD e ZEC separados).
  try {
    const csvText = await fetchSheetCsv(ZCG_GIDS.discretionary);
    const rows = parseCsv(csvText);
    const budgets = parseBudget(rows, ZCG_GIDS.discretionary, new Date());
    for (const b of budgets) {
      await db.insert(zcgBudgetSnapshots).values(b).onConflictDoNothing();
    }
    const note = budgets
      .map(
        (b) =>
          `${b.label}: $${
            b.usdCents != null ? Number(b.usdCents) / 100 : "—"
          } / ${b.zecZat != null ? Number(b.zecZat) / 1e8 : "—"} ZEC`,
      )
      .join("; ");
    results.push({ scope: "budget", ok: true, note });
  } catch (err) {
    results.push({
      scope: "budget",
      ok: false,
      note: `error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // Aportes Maya (linhas com data + ZEC).
  try {
    const csvText = await fetchSheetCsv(ZCG_GIDS.maya);
    const rows = parseCsv(csvText);
    const transfers = parseMayaTransfers(rows);
    for (const t of transfers) {
      await db.insert(zcgMayaTransfers).values(t).onConflictDoNothing();
    }
    const totalZec = transfers.reduce(
      (acc, t) => acc + (t.zecTransferredZat ?? 0n),
      0n,
    );
    results.push({
      scope: "maya_transfers",
      ok: true,
      note: `${transfers.length} aportes, total ${Number(totalZec) / 1e8} ZEC`,
    });
  } catch (err) {
    results.push({
      scope: "maya_transfers",
      ok: false,
      note: `error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  return results;
}
