import { createHash } from "node:crypto";

/**
 * Planilha pública oficial do ZCG (Zcash Community Grants). Fonte read-only via
 * export CSV por aba. O ID é fixo, mas pode ser sobrescrito por env (ZCG_SHEET_ID)
 * caso a comunidade migre de planilha.
 */
export const ZCG_SHEET_ID =
  process.env.ZCG_SHEET_ID ?? "1FQ28rDCyRW0TiNxrm3rgD8ai2KGUsXAjPieQmI1kKKg";

/** Mapa estável de abas → gid. */
export const ZCG_GIDS = {
  overview: "892150625",
  zcgBalance: "135980745",
  lockboxBalance: "808560406",
  grantsDisbursed: "803214474",
  icPayments: "1267338970",
  coinholderGrants: "722519692",
  maya: "1024670602",
  discretionary: "2043949055",
  monthly: "598263567",
  totalsRecipient: "164877840",
  coinholderTotals: "1885743444",
  proposals: "1164534734",
  coinholderProposals: "1847584751",
} as const;

export type ZcgSheet = keyof typeof ZCG_GIDS;

export function sheetCsvUrl(gid: string, sheetId = ZCG_SHEET_ID): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

/**
 * Baixa o CSV de uma aba. Falha explicitamente em erro de rede ou quando o
 * Google devolve HTML (perda de permissão pública) — o chamador deve preservar
 * o último snapshot bom em vez de sobrescrever com lixo.
 */
export async function fetchSheetCsv(gid: string): Promise<string> {
  const res = await fetch(sheetCsvUrl(gid), {
    headers: { "User-Agent": "Mozilla/5.0" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`ZCG sheet ${gid}: HTTP ${res.status}`);
  }
  const text = await res.text();
  if (/^\s*<(!doctype|html)/i.test(text)) {
    throw new Error(`ZCG sheet ${gid}: recebeu HTML (sem permissão pública?)`);
  }
  return text;
}

export function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/** Lê o banner "Status: OK ✅ / Updates required ‼️" do topo de uma aba. */
export function readSheetStatus(rows: string[][]): string {
  const flat = rows.slice(0, 3).flat().join(" ").toLowerCase();
  if (flat.includes("updates required")) return "updates_required";
  if (flat.includes("ok") || flat.includes("up to date")) return "ok";
  return "unknown";
}
