import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgProposals, zcgSheetImports } from "@/lib/db/schema";
import { parseCsv } from "./csv";
import { normalizeKey, parseUsdCents, parseZcgDate } from "./normalize";
import { fetchSheetCsv, readSheetStatus, sha256, ZCG_GIDS } from "./sheets";

type ProposalInput = typeof zcgProposals.$inferInsert;

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

/** Status canônico do funil. */
export type ProposalStatus =
  | "approved"
  | "vetoed"
  | "rejected"
  | "withdrawn"
  | "cancelled"
  | "filtered"
  | "under_review"
  | "pending";

/**
 * Mapeia o texto cru de status (varia por aba/ano) para um valor canônico.
 *
 * Valores reais observados nas duas abas:
 *   ZCG: Approved, Rejected, Application Withdrawn, Cancelled, Filtered by ZF,
 *        Filtered by FPF, Filtered by FPF / Outside of Scope,
 *        Waiting on applicant to post to forum, ZCG to discuss.
 *   Coinholder: Approved, Approved followed by Keyholder Veto, Rejected,
 *        Application Withdrawn, Pending Coinholder vote,
 *        Not Considered for Vote- Forum Post Missing,
 *        Not Considered for Vote- Late Submission.
 */
export function normalizeProposalStatus(raw?: string | null): ProposalStatus {
  const t = (raw ?? "").trim().toLowerCase();
  if (t === "") return "pending";
  // "Approved followed by Keyholder Veto" antes de "approved".
  if (t.includes("veto")) return "vetoed";
  if (t.includes("approved")) return "approved";
  if (t.includes("withdraw")) return "withdrawn";
  if (t.includes("cancel")) return "cancelled";
  if (t.includes("filtered") || t.includes("not considered")) return "filtered";
  if (t.includes("reject")) return "rejected";
  if (
    t.includes("under review") ||
    t.includes("to discuss") ||
    t.includes("waiting") ||
    t.includes("pending")
  ) {
    return t.includes("pending") ? "pending" : "under_review";
  }
  return "pending";
}

/** Extrai o nº da proposta do platform link (/proposals/<n> ou /issues/<n>). */
export function parseProposalExtId(link?: string | null): string | null {
  const s = (link ?? "").trim();
  if (!s) return null;
  const m = s.match(/\/(?:proposals|issues)\/(\d+)/);
  return m ? m[1] : null;
}

function buildProposal(args: {
  program: "zcg" | "coinholder";
  sourceSheetGid: string;
  sourceRowIndex: number;
  title: string;
  applicantsRaw?: string;
  submittedDate?: string;
  statusRaw?: string;
  decisionDate?: string;
  decisionTurnaround?: string;
  requestedUsd?: string;
  platformLink?: string;
  forumLink?: string;
  conditionNotes?: string;
  country?: string;
  orgOrIndividual?: string;
}): ProposalInput | null {
  const title = (args.title ?? "").trim();
  if (!title) return null; // linha separadora / vazia

  const platformLink = args.platformLink?.trim() || null;
  const proposalExtId = parseProposalExtId(platformLink);
  const statusRaw = (args.statusRaw ?? "").trim();
  const status = normalizeProposalStatus(statusRaw);
  const turnaroundDays = parseTurnaround(args.decisionTurnaround);

  const id = sha256(
    [
      args.program,
      args.sourceSheetGid,
      String(args.sourceRowIndex),
      title,
      proposalExtId ?? "",
    ].join("|"),
  );

  return {
    id,
    program: args.program,
    proposalExtId,
    title,
    titleKey: normalizeKey(title),
    applicantsRaw: args.applicantsRaw?.trim() || null,
    submittedDate: parseZcgDate(args.submittedDate),
    status,
    statusRaw,
    decisionDate: parseZcgDate(args.decisionDate),
    decisionTurnaroundDays: turnaroundDays,
    requestedUsdCents: parseUsdCents(args.requestedUsd),
    platformLink,
    forumLink: args.forumLink?.trim() || null,
    conditionNotes: args.conditionNotes?.replace(/\s+/g, " ").trim() || null,
    country: cleanCountry(args.country),
    orgOrIndividual: args.orgOrIndividual?.trim() || null,
    sourceSheetGid: args.sourceSheetGid,
    sourceRowIndex: args.sourceRowIndex,
  };
}

/** "7" → 7; vazio/placeholder → null. */
function parseTurnaround(raw?: string | null): number | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const m = s.match(/-?\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/** "N/A" e placeholders viram null; resto é preservado. */
function cleanCountry(raw?: string | null): string | null {
  const s = (raw ?? "").trim();
  if (!s || /^n\/?a$/i.test(s)) return null;
  return s;
}

// ── ZCG (gid 1164534734): col0 = data submetida, sem header claro. ──
function parseZcgProposals(rows: string[][], gid: string): ProposalInput[] {
  const h = rows[0] ?? [];
  const c = {
    title: findCol(h, "Proposal Title"),
    applicants: findCol(h, "Applicant(s)", "Applicant"),
    platform: findCol(h, "Grant Platform Link", "Platform Link"),
    forum: findCol(h, "Forum Link"),
    status: findCol(h, "Grant Status", "Status"),
    decisionDate: findCol(
      h,
      "Date Committee Approved/ Rejected",
      "Date Committee",
    ),
    turnaround: findCol(h, "Decision Turnaround Days", "Turnaround"),
    country: findCol(h, "Country"),
    org: findCol(h, "Organization or Individual"),
  };
  // col0 não tem header confiável → usa índice 0 fixo p/ data submetida.
  const submittedCol = 0;
  const out: ProposalInput[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const p = buildProposal({
      program: "zcg",
      sourceSheetGid: gid,
      sourceRowIndex: i,
      title: cell(r, c.title),
      applicantsRaw: cell(r, c.applicants),
      submittedDate: cell(r, submittedCol),
      statusRaw: cell(r, c.status),
      decisionDate: cell(r, c.decisionDate),
      decisionTurnaround: cell(r, c.turnaround),
      // No ZCG não há coluna confiável de USD pedido.
      platformLink: cell(r, c.platform),
      forumLink: cell(r, c.forum),
      country: cell(r, c.country),
      orgOrIndividual: cell(r, c.org),
    });
    if (p) out.push(p);
  }
  return out;
}

// ── Coinholder (gid 1847584751): header explícito, USD Amount confiável. ──
function parseCoinholderProposals(
  rows: string[][],
  gid: string,
): ProposalInput[] {
  const h = rows[0] ?? [];
  const c = {
    submitted: findCol(h, "Date Submitted"),
    title: findCol(h, "Proposal Title"),
    applicants: findCol(h, "Applicant(s)", "Applicant"),
    usd: findCol(h, "USD Amount"),
    platform: findCol(h, "Grant Platform Link", "Platform Link"),
    forum: findCol(h, "Forum Link"),
    status: findCol(h, "Approved / Rejected / Withdrawn", "Approved", "Status"),
    decisionDate: findCol(
      h,
      "Date Coinholders Approved/ Rejected",
      "Date Coinholders",
    ),
    notes: findCol(h, "Condition/Notes", "Notes"),
    country: findCol(h, "Country"),
    org: findCol(h, "Organization or Individual"),
  };
  const out: ProposalInput[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const p = buildProposal({
      program: "coinholder",
      sourceSheetGid: gid,
      sourceRowIndex: i,
      title: cell(r, c.title),
      applicantsRaw: cell(r, c.applicants),
      submittedDate: cell(r, c.submitted),
      statusRaw: cell(r, c.status),
      decisionDate: cell(r, c.decisionDate),
      requestedUsd: cell(r, c.usd),
      platformLink: cell(r, c.platform),
      forumLink: cell(r, c.forum),
      conditionNotes: cell(r, c.notes),
      country: cell(r, c.country),
      orgOrIndividual: cell(r, c.org),
    });
    if (p) out.push(p);
  }
  return out;
}

const SPECS = [
  { gid: ZCG_GIDS.proposals, parse: parseZcgProposals },
  { gid: ZCG_GIDS.coinholderProposals, parse: parseCoinholderProposals },
] as const;

export type ProposalImportResult = {
  gid: string;
  rows: number;
  imported: number;
  status: string;
};

/**
 * Importa as 2 abas de propostas (ZCG + coinholder). Idempotente por aba:
 * delete por sourceSheetGid + reinsert, espelhando a planilha sem órfãos.
 * Falha de fetch numa aba não derruba a outra (best-effort por aba).
 */
export async function importProposals(): Promise<ProposalImportResult[]> {
  const db = getDb();
  const results: ProposalImportResult[] = [];
  for (const spec of SPECS) {
    try {
      const csvText = await fetchSheetCsv(spec.gid);
      const hash = sha256(csvText);
      const rows = parseCsv(csvText);
      const status = readSheetStatus(rows);
      const proposals = spec.parse(rows, spec.gid);

      await db.transaction(async (tx) => {
        await tx
          .delete(zcgProposals)
          .where(
            and(
              eq(zcgProposals.sourceSheetGid, spec.gid),
              eq(zcgProposals.origin, "sheet"),
              eq(zcgProposals.locked, false),
            ),
          );
        for (const batch of chunk(proposals, 400)) {
          await tx.insert(zcgProposals).values(batch).onConflictDoNothing();
        }
        await tx
          .insert(zcgSheetImports)
          .values({
            id: `${spec.gid}:${hash.slice(0, 16)}`,
            sheetGid: spec.gid,
            sheetGroup: "proposal",
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
        imported: proposals.length,
        status,
      });
    } catch (err) {
      results.push({
        gid: spec.gid,
        rows: 0,
        imported: 0,
        status: `error: ${err instanceof Error ? err.message : String(err)}`,
      });
      // Re-lança contexto p/ logging do chamador sem derrubar as outras abas.
      console.error(
        `importProposals(${spec.gid}) falhou: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
  return results;
}
