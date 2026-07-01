/**
 * Human-readable taxonomy for the ZCG totals screen. Each spreadsheet
 * classification (or internal bucket) is tagged by its *nature* so a reader can
 * tell at a glance what the money is: a grant paid out to an external project,
 * the committee's own operating budget (travel/conferences), the stipends the
 * committee members are paid, or third-party security work.
 *
 * The ZCG grant pool has no standalone "Travel" or "Bug bounty" line — travel
 * and conferences live inside the discretionary budget, and bounties are
 * milestones inside grants or fall under the Audits classification. This module
 * makes those distinctions explicit without inventing figures.
 */

import { normalizeKey } from "./normalize";

export type ClassKind = "grant" | "security" | "stipends" | "operations";

export interface ClassTag {
  kind: ClassKind;
  /** Short badge label. */
  label: string;
  tone: "emerald" | "sky" | "violet" | "amber";
  /** One-line explanation shown on hover. */
  note: string;
}

const GRANT: ClassTag = {
  kind: "grant",
  label: "Grant",
  tone: "emerald",
  note: "Funding paid out to an external project or contributor.",
};

const SPECIAL: Record<string, ClassTag> = {
  [normalizeKey("ZCG stipends from ZCG slice")]: {
    kind: "stipends",
    label: "Committee salaries",
    tone: "violet",
    note: "Stipends paid to the ZCG committee members for their work — not a grant.",
  },
  [normalizeKey("ZCG Discretionary Budget")]: {
    kind: "operations",
    label: "ZCG operations",
    tone: "amber",
    note: "The committee's own operating budget: travel, conferences and tooling — not grants to projects.",
  },
  [normalizeKey("Audits")]: {
    kind: "security",
    label: "Security · audits",
    tone: "sky",
    note: "Third-party security audits and bug bounties.",
  },
};

/** Tag for a classification / recipient bucket label. Defaults to "Grant". */
export function classifyLabel(label: string): ClassTag {
  return SPECIAL[normalizeKey(label)] ?? GRANT;
}

/** True for buckets that are ZCG spending on itself (stipends + operations). */
export function isInternalKind(kind: ClassKind): boolean {
  return kind === "stipends" || kind === "operations";
}
