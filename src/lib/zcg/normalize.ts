/**
 * Normalizadores das células da planilha ZCG → tipos do domínio.
 *
 * São funções puras e testáveis. Lidam com os formatos reais (e inconsistentes)
 * da planilha: USD com "$", vírgulas de milhar, parênteses ou prefixo "-" para
 * negativos, " $ -   " como zero; ZEC com clawback negativo; datas em vários
 * formatos por aba. Dinheiro nunca passa por float no resultado final — USD vira
 * centavos (bigint) e ZEC vira zatoshis (bigint).
 */

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

/** lower + trim + colapsa espaços — chave de join de recebedores. */
export function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Detecta placeholders de "vazio/zero" textuais ("-", "–", "N/A", "TBD"). */
function isBlankish(s: string): boolean {
  return /^(n\/?a|tbd|tba|—|–|-|\.)?$/i.test(s.trim());
}

/**
 * "$6,950.00" → 695000n (centavos). Negativos por parênteses "($x)" ou prefixo
 * "-"/"$-". " $ -   " (dash) e vazio → 0n/null respectivamente.
 */
export function parseUsdCents(raw: string | undefined | null): bigint | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (s === "") return null;
  // "$ -", " $ -   ", "-" → zero explícito
  if (/^\$?\s*[-–—]\s*$/.test(s)) return 0n;
  // Um intervalo numérico ("2020-2021", "$5 - $10", "$1,000-$2,000") não é um
  // valor único — não dá para interpretar, então devolve null em vez de
  // concatenar os dígitos dos dois lados do hífen.
  if (/\d[\s$]*[-–—][\s$]*\d/.test(s.replace(/^\(|\)$/g, ""))) return null;
  // Negativo só nas formas de string inteira: (1.234,56), -5, $ -5.
  const negative = /^\(.*\)$/.test(s) || /^-/.test(s) || /^\$\s*-/.test(s);
  const cleaned = s.replace(/[^0-9.]/g, "");
  if (cleaned === "" || cleaned === ".") return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  const cents = BigInt(Math.round(num * 100));
  return negative ? -cents : cents;
}

/**
 * "80.7764831" → 8077648310n (zatoshis). Preserva sinal negativo (clawback).
 * Decimal-safe: não converte ZEC inteiro via float. Vazio/placeholder → null.
 */
export function parseZecToZat(raw: string | undefined | null): bigint | null {
  if (raw == null) return null;
  let s = raw.trim().replace(/,/g, "");
  if (s === "" || isBlankish(s)) return s === "" ? null : 0n;
  const negative = s.startsWith("-");
  s = s.replace(/^[-+]/, "").replace(/[^0-9.]/g, "");
  if (s === "" || s === ".") return null;
  const [whole, frac = ""] = s.split(".");
  const fracPadded = `${frac}00000000`.slice(0, 8);
  const zat = BigInt(whole || "0") * 100_000_000n + BigInt(fracPadded || "0");
  return negative ? -zat : zat;
}

function iso(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Datas multi-formato da planilha → ISO "yyyy-mm-dd" (ou null se for condição
 * textual tipo "2 months after merge"). Formatos: "26 Jan 2021", "Feb 3, 2026",
 * "February 3, 2026", "1/6/2021", "2/3/26".
 */
export function parseZcgDate(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (s === "") return null;

  // "26 Jan 2021" / "3 May 2024"
  let m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(\d{4})$/);
  if (m) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mon) return iso(+m[3], mon, +m[1]);
  }
  // "Feb 3, 2026" / "February 3, 2026"
  m = s.match(/^([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const mon = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mon) return iso(+m[3], mon, +m[2]);
  }
  // "1/6/2021" / "2/3/26"
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let year = +m[3];
    if (year < 100) year += 2000;
    return iso(year, +m[1], +m[2]);
  }
  return null;
}

/** Extrai o nº inteiro de um milestone ("1", "Milestone 2") → 2; senão null. */
export function parseMilestoneSeq(
  raw: string | undefined | null,
): number | null {
  if (raw == null) return null;
  const m = raw.match(/\d+/);
  return m ? Number(m[0]) : null;
}
