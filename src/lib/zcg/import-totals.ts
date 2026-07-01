import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgTotals } from "@/lib/db/schema";
import { parseCsv } from "./csv";
import { normalizeKey, parseUsdCents } from "./normalize";
import { fetchSheetCsv, sha256, ZCG_GIDS } from "./sheets";

type TotalsInput = typeof zcgTotals.$inferInsert;

type Pool = "zcg_grants" | "coinholder";

function cell(r: string[], i: number): string {
  return i >= 0 && i < r.length ? r[i] : "";
}

/** Acha o índice de coluna por nome (tolerante a \n, espaços e caixa). */
function findCol(header: string[], ...needles: string[]): number {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const H = header.map(norm);
  for (const needle of needles) {
    const nn = norm(needle);
    const i = H.indexOf(nn);
    if (i >= 0) return i;
  }
  for (const needle of needles) {
    const nn = norm(needle);
    const i = H.findIndex((h) => h.includes(nn));
    if (i >= 0) return i;
  }
  return -1;
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// Buckets internos do ZCG (orçamento discricionário e stipends do comitê).
// Aparecem em ambos os pivots (recebedor e classificação) — sinalizamos os dois.
const INTERNAL_BUCKETS = new Set([
  normalizeKey("ZCG Discretionary Budget"),
  normalizeKey("ZCG stipends from ZCG slice"),
]);

function isInternalBucket(label: string): boolean {
  return INTERNAL_BUCKETS.has(normalizeKey(label));
}

/** "Total"/"TOTAL"/"Grand total" → linha de total geral. */
function isGrandTotalLabel(label: string): boolean {
  return /^(grand\s+)?total$/i.test(label.trim());
}

/** Acha o índice da linha de header das duas pivots ("Recipient or ..."). */
function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    if (findCol(rows[i], "Recipient or Classification") >= 0) return i;
  }
  return 2; // header real é a 3ª linha; fallback defensivo
}

function buildId(
  pool: Pool,
  rowKind: string,
  label: string,
  capturedAt: Date,
): string {
  return sha256(
    [pool, rowKind, normalizeKey(label), capturedAt.toISOString()].join("|"),
  );
}

/**
 * Lê as DUAS pivots coladas horizontalmente numa aba de totais e devolve as
 * linhas normalizadas. Eixo ESQUERDO agrupa por recebedor; eixo DIREITO por
 * categoria; a linha 'Total' de cada eixo vira um único grand_total (o esquerdo,
 * que carrega também o pipeline futuro).
 */
function parseTotals(
  rows: string[][],
  gid: string,
  pool: Pool,
  capturedAt: Date,
): TotalsInput[] {
  const headerRow = findHeaderRow(rows);
  const h = rows[headerRow] ?? [];

  // Pivot esquerdo (recebedor): label | pago | futuro.
  const cLabel = findCol(h, "Recipient or Classification");
  const cPaid = findCol(h, "USD value paid out to date");
  const cFuture = findCol(h, "Future milestones", "Future Payments", "Future");

  // Pivot direito (classificação): classificação | pago.
  const cClass = findCol(h, "Grant Classification", "Classification");
  // A 2ª ocorrência de "USD paid out to date" / "USD value paid out..." à
  // direita. Procuramos a partir da coluna da classificação p/ não pegar a da
  // esquerda.
  const cClassPaid = (() => {
    const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
    for (let i = cClass + 1; i < h.length; i++) {
      if (norm(h[i]).includes("usd") && norm(h[i]).includes("paid")) return i;
    }
    return cClass + 1;
  })();

  const out: TotalsInput[] = [];
  const seen = new Set<string>();

  const push = (
    rowKind: "recipient_total" | "classification_total" | "grand_total",
    label: string,
    paid: bigint,
    future: bigint | null,
    category: string | null,
  ) => {
    const id = buildId(pool, rowKind, label, capturedAt);
    // UNIQUE(pool,rowKind,label,capturedAt): evita colisão de label duplicado
    // (ex.: 'Total' aparece nos dois pivots) dentro da mesma captura.
    const dedupe = `${rowKind}|${normalizeKey(label)}`;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    out.push({
      id,
      pool,
      rowKind,
      label,
      category,
      usdPaidToDateCents: paid,
      usdFuturePipelineCents: future,
      isInternalBucket: isInternalBucket(label),
      capturedAt,
      sourceSheetGid: gid,
    });
  };

  for (let i = headerRow + 1; i < rows.length; i++) {
    const r = rows[i];

    // ── Pivot esquerdo: por recebedor ──
    const leftLabel = cell(r, cLabel).trim();
    if (leftLabel) {
      const paid = parseUsdCents(cell(r, cPaid));
      const future = parseUsdCents(cell(r, cFuture));
      if (isGrandTotalLabel(leftLabel)) {
        push("grand_total", leftLabel, paid ?? 0n, future, null);
      } else {
        push("recipient_total", leftLabel, paid ?? 0n, future, null);
      }
    }

    // ── Pivot direito: por classificação ──
    const rightLabel = cClass >= 0 ? cell(r, cClass).trim() : "";
    if (rightLabel) {
      const paid = parseUsdCents(cell(r, cClassPaid));
      if (isGrandTotalLabel(rightLabel)) {
        // Já capturamos o grand_total (com pipeline) pelo eixo esquerdo; o
        // 'Total' da direita é redundante e é descartado pelo dedupe.
        push("grand_total", rightLabel, paid ?? 0n, null, null);
      } else {
        push("classification_total", rightLabel, paid ?? 0n, null, rightLabel);
      }
    }
  }

  return out;
}

const SPECS: { gid: string; pool: Pool }[] = [
  { gid: ZCG_GIDS.totalsRecipient, pool: "zcg_grants" },
  { gid: ZCG_GIDS.coinholderTotals, pool: "coinholder" },
];

/**
 * Importa as 2 abas de totais (ZCG grants + coinholder). Cada aba tem duas
 * pivots horizontais (por recebedor e por categoria) + a linha 'Total'.
 * Idempotente: delete por sourceSheetGid + reinsert. Best-effort por aba.
 */
export type TotalsImportResult = {
  gid: string;
  parsed: number;
  imported: number;
  status: string;
};

export async function importTotals(): Promise<TotalsImportResult[]> {
  const db = getDb();
  const results: TotalsImportResult[] = [];

  for (const spec of SPECS) {
    try {
      const csvText = await fetchSheetCsv(spec.gid);
      const rows = parseCsv(csvText);
      const capturedAt = new Date();
      const totals = parseTotals(rows, spec.gid, spec.pool, capturedAt);
      let insertedCount = 0;

      await db.transaction(async (tx) => {
        await tx
          .delete(zcgTotals)
          .where(eq(zcgTotals.sourceSheetGid, spec.gid));
        for (const batch of chunk(totals, 400)) {
          const ins = await tx
            .insert(zcgTotals)
            .values(batch)
            .onConflictDoNothing()
            .returning({ id: zcgTotals.id });
          insertedCount += ins.length;
        }
      });

      const dropped = totals.length - insertedCount;
      results.push({
        gid: spec.gid,
        parsed: totals.length,
        imported: insertedCount,
        status: dropped > 0 ? `ok · ${dropped} dropped (conflict)` : "ok",
      });
    } catch (err) {
      // Best-effort por aba: uma aba instável não derruba o refresh inteiro.
      results.push({
        gid: spec.gid,
        parsed: 0,
        imported: 0,
        status: `error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return results;
}
