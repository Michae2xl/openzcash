/**
 * Curated recipient aliases: the spreadsheet writes the same entity under
 * different names across years and tabs, which splits one grantee into two
 * rows and understates their total. Merging is deliberate and evidence-based,
 * never fuzzy at runtime: a wrong merge would attribute someone else's money
 * to a person, which is worse than a split row.
 *
 * Inclusion rule: same entity, proven by the ledger itself (same project
 * continued under a renamed row, or an @handle vs plain handle). Distinct
 * organisations that merely collaborated on a grant are NOT merged.
 */

import { normalizeKey } from "./normalize";

/** Canonical name → alternate spellings found in the ledger. */
export const RECIPIENT_ALIASES: Record<string, string[]> = {
  // Same wallet team; the sheet switched capitalisation in 2023. Both rows
  // pay "Nighthawk Wallet …" projects.
  Nighthawk: ["nighthawk"],
  // The 2026 red·bridge payments landed under the incorporated name while the
  // older Avalanche bridge grants used the short form.
  "RED.DEV INC": ["reddev"],
  // Discretionary payout recorded with the @ prefix, grants without it.
  robustfengbin: ["@robustfengbin"],
  // Committee stipend row vs the grant row for the same LLC.
  "PGP for Crypto, LLC": ["pgp for crypto (paul brigner)"],
};

/** alias (lowercased) → canonical display name. */
const ALIAS_TO_CANONICAL = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(RECIPIENT_ALIASES)) {
  for (const a of aliases) ALIAS_TO_CANONICAL.set(a.toLowerCase(), canonical);
}

/** Canonical display name for a raw ledger recipient name. */
export function canonicalRecipient(name: string): string {
  return ALIAS_TO_CANONICAL.get(name.trim().toLowerCase()) ?? name.trim();
}

/** True when this row's name is an alias folded into another recipient. */
export function isAliasName(name: string): boolean {
  return ALIAS_TO_CANONICAL.has(name.trim().toLowerCase());
}

/** All normalized ledger keys that belong to one curated recipient entity. */
export function recipientLedgerKeys(nameOrKey: string): string[] {
  const lookupKey = normalizeKey(nameOrKey);

  for (const [canonical, aliases] of Object.entries(RECIPIENT_ALIASES)) {
    const family = [canonical, ...aliases].map(normalizeKey);
    if (family.includes(lookupKey)) return family;
  }

  return [lookupKey];
}
