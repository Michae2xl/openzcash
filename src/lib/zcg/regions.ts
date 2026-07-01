/**
 * Best-effort region tagging for community grants, derived from the grant/
 * recipient name (e.g. "Zcash Nigeria 2026" → Nigeria). Pure and testable.
 * Returns null when no region keyword is present — those are treated as global
 * / unspecified and excluded from the by-region view rather than guessed.
 */

const REGION_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bnigeria\b/i, "Nigeria"],
  [/\bghana\b/i, "Ghana"],
  [/\b(brazil|brasil)\b/i, "Brazil"],
  [/\b(t[üu]rkiye|turkish|turkey)\b/i, "Türkiye"],
  [/arabia/i, "Arabia"],
  [/\bkenya\b/i, "Kenya"],
  [/\bindonesia\b/i, "Indonesia"],
  [/\bindia\b/i, "India"],
  [/\bvietnam\b/i, "Vietnam"],
  [/\bphilippines\b/i, "Philippines"],
  [/\bzimbabwe\b/i, "Zimbabwe"],
  [/\buganda\b/i, "Uganda"],
  [/\b(espa[ñn]ol|latam|hispano)\b/i, "LatAm (Español)"],
  [/\b(zcash )?global\b/i, "Global program"],
  [/\bafrica\b/i, "Africa"],
];

/** The region a grant/recipient name refers to, or null if none is named. */
export function classifyRegion(
  ...texts: (string | null | undefined)[]
): string | null {
  const hay = texts.filter(Boolean).join(" ");
  for (const [re, region] of REGION_RULES) {
    if (re.test(hay)) return region;
  }
  return null;
}
