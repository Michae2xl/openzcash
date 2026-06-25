import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgDisbursements, zcgSheetImports } from "@/lib/db/schema";
import { parseCsv } from "./csv";
import {
  normalizeKey,
  parseMilestoneSeq,
  parseUsdCents,
  parseZcgDate,
  parseZecToZat,
} from "./normalize";
import { fetchSheetCsv, readSheetStatus, sha256, ZCG_GIDS } from "./sheets";

type DisbInput = typeof zcgDisbursements.$inferInsert;

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

function normStatus(s?: string | null): string | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  return t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

// Ordem importa: "bounty match" (co-funding a um pool, NÃO bounty a pesquisador)
// é testado antes de "security bounty" para não inflar a métrica de bounties.
function discType(desc: string): string {
  const d = desc.toLowerCase();
  if (/bounty\s*(payment\s*)?match/.test(d)) return "bounty_match";
  if (/security bounty/.test(d)) return "security_bounty";
  if (/sponsor|conference|summit|super partner/.test(d)) return "sponsorship";
  if (/credit|codex|services/.test(d)) return "tool_credit_service";
  if (/return|refund|clawback/.test(d)) return "funds_returned";
  return "reimbursement";
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function buildDisb(args: {
  sourceSheet: string;
  sourceSheetGid: string;
  sourceRowIndex: number;
  disbursementType: string;
  project?: string;
  recipientRaw: string;
  deliverable?: string;
  category?: string;
  reportingFrequency?: string;
  milestoneLabel?: string;
  settlementAsset?: string;
  amountUsd?: string;
  usdDisbursed?: string;
  zecDisbursed?: string;
  zecUsdRate?: string;
  paidOut?: string;
  estimatedPayout?: string;
  forMonth?: string;
  grantStatus?: string;
}): DisbInput | null {
  const recipientNameRaw = (args.recipientRaw ?? "").trim();
  if (!recipientNameRaw) return null; // linha separadora / vazia

  const amountUsdCents = parseUsdCents(args.amountUsd);
  const usdDisbursedCents = parseUsdCents(args.usdDisbursed);
  const zecDisbursedZat = parseZecToZat(args.zecDisbursed);
  const usdDisbursedZecRateCents = parseUsdCents(args.zecUsdRate);
  const paidOutDate = parseZcgDate(args.paidOut);
  const paidOutRaw = (args.paidOut ?? "").trim();
  const recipientKey = normalizeKey(recipientNameRaw);
  const forMonth = args.forMonth?.trim() || null;

  const isPaid =
    paidOutDate !== null &&
    ((zecDisbursedZat ?? 0n) !== 0n || usdDisbursedCents !== null);
  const isInternal =
    args.sourceSheet === "monthly" || // stipends do comitê/core = gasto interno
    recipientKey === "zcg" ||
    recipientKey.includes("discretionary budget") ||
    recipientKey.includes("stipends from");
  const isTest = /test tx/i.test(forMonth ?? "");

  let settlementAsset = (args.settlementAsset ?? "").trim().toUpperCase();
  if (!["ZEC", "USD", "USDC"].includes(settlementAsset)) {
    settlementAsset =
      (zecDisbursedZat ?? 0n) !== 0n
        ? "ZEC"
        : usdDisbursedCents !== null
          ? "USD"
          : "ZEC";
  }

  const id = sha256(
    [
      args.sourceSheet,
      args.project ?? "",
      recipientNameRaw,
      args.milestoneLabel ?? "",
      paidOutRaw,
      String(amountUsdCents),
      String(zecDisbursedZat),
    ].join("|"),
  );

  return {
    id,
    sourceSheet: args.sourceSheet,
    disbursementType: args.disbursementType,
    project: args.project?.trim() || null,
    recipientNameRaw,
    recipientKey,
    deliverable: args.deliverable?.trim() || null,
    category: args.category?.replace(/\s+/g, " ").trim() || null,
    reportingFrequency: args.reportingFrequency?.trim() || null,
    milestoneLabel: args.milestoneLabel?.trim() || null,
    milestoneSeq: parseMilestoneSeq(args.milestoneLabel),
    settlementAsset,
    amountUsdCents,
    usdDisbursedCents,
    zecDisbursedZat,
    usdDisbursedZecRateCents,
    paidOutDate,
    paidOutRaw,
    estimatedPayoutDate: parseZcgDate(args.estimatedPayout),
    forMonth,
    grantStatus: normStatus(args.grantStatus),
    isTest,
    isPaid,
    isInternal,
    sourceSheetGid: args.sourceSheetGid,
    sourceRowIndex: args.sourceRowIndex,
  };
}

function parseGrants(rows: string[][], gid: string): DisbInput[] {
  const h = rows[0];
  const c = {
    project: findCol(h, "Project"),
    grantee: findCol(h, "Grantee"),
    category: findCol(h, "Category"),
    repFreq: findCol(h, "Reporting Frequency"),
    milestone: findCol(h, "Milestone"),
    amount: findCol(h, "Amount (USD)"),
    estimate: findCol(h, "Estimate"),
    paidOut: findCol(h, "Paid Out"),
    zec: findCol(h, "ZEC Disbursed"),
    usd: findCol(h, "USD Disbursed"),
    rate: findCol(h, "ZEC/USD"),
    status: findCol(h, "Grant Status"),
  };
  const out: DisbInput[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const d = buildDisb({
      sourceSheet: "grants_disbursed",
      sourceSheetGid: gid,
      sourceRowIndex: i,
      disbursementType: "grant_milestone",
      project: cell(r, c.project),
      recipientRaw: cell(r, c.grantee),
      category: cell(r, c.category),
      reportingFrequency: cell(r, c.repFreq),
      milestoneLabel: cell(r, c.milestone),
      amountUsd: cell(r, c.amount),
      estimatedPayout: cell(r, c.estimate),
      paidOut: cell(r, c.paidOut),
      zecDisbursed: cell(r, c.zec),
      usdDisbursed: cell(r, c.usd),
      zecUsdRate: cell(r, c.rate),
      grantStatus: cell(r, c.status),
    });
    if (d) out.push(d);
  }
  return out;
}

function parseIc(rows: string[][], gid: string): DisbInput[] {
  const h = rows[0];
  const c = {
    project: findCol(h, "Project"),
    ic: findCol(h, "Independent Contractor"),
    deliverable: findCol(h, "Deliverable"),
    category: findCol(h, "Category"),
    amount: findCol(h, "Amount (USD)"),
    paidOut: findCol(h, "Paid Out"),
    zec: findCol(h, "ZEC Disbursed"),
    usd: findCol(h, "USD Disbursed"),
    rate: findCol(h, "ZEC/USD"),
  };
  const out: DisbInput[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const d = buildDisb({
      sourceSheet: "ic_payments",
      sourceSheetGid: gid,
      sourceRowIndex: i,
      disbursementType: "ic_payment",
      project: cell(r, c.project),
      recipientRaw: cell(r, c.ic),
      deliverable: cell(r, c.deliverable),
      category: cell(r, c.category),
      amountUsd: cell(r, c.amount),
      paidOut: cell(r, c.paidOut),
      zecDisbursed: cell(r, c.zec),
      usdDisbursed: cell(r, c.usd),
      zecUsdRate: cell(r, c.rate),
    });
    if (d) out.push(d);
  }
  return out;
}

function parseCoinholder(rows: string[][], gid: string): DisbInput[] {
  const h = rows[0];
  const c = {
    project: findCol(h, "Project"),
    grantee: findCol(h, "Grantee"),
    category: findCol(h, "Category"),
    amount: findCol(h, "Amount (USD)"),
    estimate: findCol(h, "Estimate"),
    paidOut: findCol(h, "Paid Out"),
    zec: findCol(h, "ZEC Disbursed"),
    rate: findCol(h, "ZEC/USD"),
    status: findCol(h, "Grant Status"),
  };
  const out: DisbInput[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const d = buildDisb({
      sourceSheet: "coinholder_grants",
      sourceSheetGid: gid,
      sourceRowIndex: i,
      disbursementType: "coinholder_grant",
      project: cell(r, c.project),
      recipientRaw: cell(r, c.grantee),
      category: cell(r, c.category),
      amountUsd: cell(r, c.amount),
      estimatedPayout: cell(r, c.estimate),
      paidOut: cell(r, c.paidOut),
      zecDisbursed: cell(r, c.zec),
      zecUsdRate: cell(r, c.rate),
      grantStatus: cell(r, c.status),
    });
    if (d) out.push(d);
  }
  return out;
}

function parseDiscretionary(rows: string[][], gid: string): DisbInput[] {
  // Header na linha 5; linhas 0-4 = bloco de budget agregado (vai p/ snapshots).
  const headerRow = 5;
  const h = rows[headerRow] ?? [];
  const c = {
    date: findCol(h, "Date Reimbursed/Sent", "Date"),
    recipient: findCol(h, "Recipient"),
    paidAs: findCol(h, "Paid out as"),
    desc: findCol(h, "Description"),
    zec: findCol(h, "ZEC"),
    rate: findCol(h, "ZEC/USD"),
    usd: findCol(h, "USD"),
  };
  const out: DisbInput[] = [];
  for (let i = headerRow + 1; i < rows.length; i++) {
    const r = rows[i];
    const desc = cell(r, c.desc);
    const d = buildDisb({
      sourceSheet: "discretionary",
      sourceSheetGid: gid,
      sourceRowIndex: i,
      disbursementType: discType(desc),
      recipientRaw: cell(r, c.recipient),
      deliverable: desc,
      settlementAsset: cell(r, c.paidAs),
      paidOut: cell(r, c.date),
      zecDisbursed: cell(r, c.zec),
      zecUsdRate: cell(r, c.rate),
      usdDisbursed: cell(r, c.usd),
      amountUsd: cell(r, c.usd),
    });
    if (d) out.push(d);
  }
  return out;
}

function parseMonthly(rows: string[][], gid: string): DisbInput[] {
  const h = rows[0];
  const c = {
    date: findCol(h, "Date"),
    recipient: findCol(h, "Recipient"),
    forMonth: findCol(h, "for Month"),
    usd: findCol(h, "USD Amount"),
    rate: findCol(h, "ZEC/USD"),
    zec: findCol(h, "ZEC"),
  };
  const out: DisbInput[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const d = buildDisb({
      sourceSheet: "monthly",
      sourceSheetGid: gid,
      sourceRowIndex: i,
      disbursementType: "monthly",
      recipientRaw: cell(r, c.recipient),
      forMonth: cell(r, c.forMonth),
      amountUsd: cell(r, c.usd),
      paidOut: cell(r, c.date),
      zecDisbursed: cell(r, c.zec),
      zecUsdRate: cell(r, c.rate),
    });
    if (d) out.push(d);
  }
  return out;
}

const SPECS = [
  { gid: ZCG_GIDS.grantsDisbursed, parse: parseGrants },
  { gid: ZCG_GIDS.icPayments, parse: parseIc },
  { gid: ZCG_GIDS.coinholderGrants, parse: parseCoinholder },
  { gid: ZCG_GIDS.discretionary, parse: parseDiscretionary },
  { gid: ZCG_GIDS.monthly, parse: parseMonthly },
] as const;

export type ImportResult = {
  gid: string;
  rows: number;
  imported: number;
  status: string;
};

/**
 * Importa as 5 abas de desembolso. Idempotente: substitui o conteúdo de cada
 * aba (delete por gid + reinsert) para espelhar a planilha sem deixar órfãos.
 * Falha de fetch numa aba não derruba as outras (best-effort por aba).
 */
export async function importDisbursements(): Promise<ImportResult[]> {
  const db = getDb();
  const results: ImportResult[] = [];
  for (const spec of SPECS) {
    try {
      const csvText = await fetchSheetCsv(spec.gid);
      const hash = sha256(csvText);
      const rows = parseCsv(csvText);
      const status = readSheetStatus(rows);
      const disbs = spec.parse(rows, spec.gid);

      await db.transaction(async (tx) => {
        await tx
          .delete(zcgDisbursements)
          .where(
            and(
              eq(zcgDisbursements.sourceSheetGid, spec.gid),
              eq(zcgDisbursements.origin, "sheet"),
              eq(zcgDisbursements.locked, false),
            ),
          );
        for (const batch of chunk(disbs, 400)) {
          await tx.insert(zcgDisbursements).values(batch).onConflictDoNothing();
        }
        await tx
          .insert(zcgSheetImports)
          .values({
            id: `${spec.gid}:${hash.slice(0, 16)}`,
            sheetGid: spec.gid,
            sheetGroup: "disbursement",
            contentSha256: hash,
            rowCount: rows.length,
            sheetStatus: status,
            parsedOk: true,
          })
          .onConflictDoNothing();
      });

      results.push({
        gid: spec.gid,
        rows: rows.length,
        imported: disbs.length,
        status,
      });
    } catch (err) {
      results.push({
        gid: spec.gid,
        rows: 0,
        imported: 0,
        status: `error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }
  return results;
}
