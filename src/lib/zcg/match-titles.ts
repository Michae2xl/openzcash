/**
 * Fuzzy title matching used to dedupe a live GitHub grant application against
 * the same proposal already mirrored from the ZCG spreadsheet.
 *
 * The two sources drift: GitHub carries a "Grant Application - " prefix (already
 * stripped upstream) and applicants sometimes reword the title between the issue
 * and the sheet (e.g. "…Real-World Merchants" vs "…Merchants IRL"). A plain
 * exact match misses those, so we compare normalised token sets with a Jaccard
 * threshold — tuned high enough to keep genuinely distinct grants apart
 * ("Zaino Completion" ≠ "Zaino Release Stabilization" ≠ "zaino - Stability").
 */

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "for",
  "and",
  "to",
  "in",
  "on",
  "with",
  "by",
  "at",
]);

/** Minimum Jaccard similarity for two titles to be considered the same proposal. */
const MATCH_THRESHOLD = 0.55;
/** Minimum shared significant tokens (guards against 1-token coincidences). */
const MIN_SHARED = 2;

/** Normalised significant-token set for a title. */
export function titleSignature(title: string): Set<string> {
  const tokens = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // drop diacritics
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
  return new Set(tokens);
}

function jaccard(
  a: Set<string>,
  b: Set<string>,
): { score: number; shared: number } {
  if (a.size === 0 || b.size === 0) return { score: 0, shared: 0 };
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  const union = a.size + b.size - shared;
  return { score: union === 0 ? 0 : shared / union, shared };
}

/**
 * True when two titles almost certainly name the same proposal. An exact
 * normalised-token match always wins; otherwise a high Jaccard similarity with
 * enough shared tokens is required.
 */
export function titlesMatch(a: string, b: string): boolean {
  const sa = titleSignature(a);
  const sb = titleSignature(b);
  const { score, shared } = jaccard(sa, sb);
  return shared >= MIN_SHARED && score >= MATCH_THRESHOLD;
}
