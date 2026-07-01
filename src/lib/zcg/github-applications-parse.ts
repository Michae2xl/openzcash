/**
 * Pure parsing helpers for ZCG grant-application issue bodies. Kept free of
 * "server-only" so the logic can be unit-tested directly.
 */

/** A whole trimmed line that is nothing but a dollar amount, e.g. "$477,658" or "24,500". */
const AMOUNT_LINE = /^\$?\s?\d[\d,]*(\.\d+)?$/;

/** First pure-amount line inside the "### <header>" section of an issue body. */
function sectionAmount(body: string, header: string): number | null {
  const lines = body.split(/\r?\n/);
  const target = `### ${header}`.toLowerCase();
  const i = lines.findIndex((l) => l.trim().toLowerCase() === target);
  if (i < 0) return null;
  for (let j = i + 1; j < lines.length; j++) {
    const t = lines[j].trim();
    if (!t) continue;
    if (t.startsWith("### ")) break; // section ended, no amount
    if (AMOUNT_LINE.test(t)) {
      const n = Number(t.replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
    }
  }
  return null;
}

/**
 * The requested grant amount from an application's issue body, in whole USD.
 * Applicants sometimes leave the "Requested Grant Amount (USD)" field blank or
 * fill it with prose, so fall back to the "Total Budget (USD)" field (the same
 * figure in well-formed applications).
 */
export function requestedAmountFromBody(
  body: string | undefined,
): number | null {
  if (!body) return null;
  return (
    sectionAmount(body, "Requested Grant Amount (USD)") ??
    sectionAmount(body, "Total Budget (USD)")
  );
}
