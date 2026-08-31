import { sha256 } from "./sheets";

/**
 * Preserve every source row even when two spreadsheet rows have identical
 * business fields. The first occurrence keeps the historical content hash;
 * subsequent occurrences receive a deterministic suffix hash. This avoids
 * changing existing API/reconciliation ids while ensuring repeated $0
 * placeholders (for example, distinct event reimbursements) are not silently
 * collapsed by the primary-key conflict handler.
 */
export function disambiguateDuplicateDisbursementIds<
  T extends { id: string },
>(rows: T[]): T[] {
  const seen = new Map<string, number>();
  return rows.map((row) => {
    const occurrence = (seen.get(row.id) ?? 0) + 1;
    seen.set(row.id, occurrence);
    if (occurrence === 1) return row;
    return {
      ...row,
      id: sha256(`${row.id}|duplicate:${occurrence}`),
    };
  });
}
