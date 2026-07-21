/**
 * Pure parser for the ZecHub DAO Treasury Dashboard spreadsheet. The sheet is
 * NOT tabular: it is a sequence of labelled key-value blocks ("FPF", "ZecHub
 * Donations", "Total Paid Out USD | ZEC", …), so parsing is a small section
 * state machine over col0/col1. Kept free of "server-only" for unit tests.
 */

export type TreasuryAllocation = {
  category: string;
  zecZat: bigint | null;
  sharePct: number | null;
};

export type TreasuryPayout = {
  title: string;
  paidUsdCents: bigint | null;
  pendingUsdCents: bigint | null;
  m1: string | null;
  m2: string | null;
  m3: string | null;
  zecPaidZat: bigint | null;
};

export type ParsedTreasury = {
  /** ISO date from "Last Updated", e.g. "2026-07-21". */
  capturedOn: string | null;
  zecPriceCents: bigint | null;
  donationsZat: bigint | null;
  donationsUsdCents: bigint | null;
  fpfZat: bigint | null;
  fpfUsdCents: bigint | null;
  fpfUnreservedZat: bigint | null;
  fpfReservedUsdCents: bigint | null;
  incZat: bigint | null;
  incUsdCents: bigint | null;
  penumbraUm: number | null;
  namadaNam: number | null;
  totalPaidOutUsdCents: bigint | null;
  toBePaidOutUsdCents: bigint | null;
  allocations: TreasuryAllocation[];
  payouts: TreasuryPayout[];
};

/** "$224,810.76" | "224810.76" → cents bigint; null for blanks/prose. */
export function usdCents(raw: string | undefined): bigint | null {
  const t = (raw ?? "").replace(/[$,\s]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return BigInt(Math.round(Number(t) * 100));
}

/** "414.78" | "229,162" → zatoshi bigint (×1e8); null for blanks/prose. */
export function zecZat(raw: string | undefined): bigint | null {
  const t = (raw ?? "").replace(/[,\s]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return BigInt(Math.round(Number(t) * 1e8));
}

function plainNumber(raw: string | undefined): number | null {
  const t = (raw ?? "").replace(/[,\s]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

/** "07/21/2026" → "2026-07-21". */
function isoDate(raw: string | undefined): string | null {
  const m = (raw ?? "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

type Section =
  | "none"
  | "fpf"
  | "donations"
  | "inc"
  | "penumbra"
  | "namada"
  | "paid"
  | "committed"
  | "milestones";

const SECTION_MARKERS: Array<[RegExp, Section]> = [
  [/^FPF$/i, "fpf"],
  [/^ZecHub Donations$/i, "donations"],
  [/^ZecHub Treasury/i, "inc"],
  [/^Penumbra/i, "penumbra"],
  [/^Namada/i, "namada"],
  [/^Total Paid Out/i, "paid"],
  [/^To Be Paid Out/i, "committed"],
  [/^Global Ambassador Proposals/i, "milestones"],
];

export function parseTreasury(rows: string[][]): ParsedTreasury {
  const out: ParsedTreasury = {
    capturedOn: null,
    zecPriceCents: null,
    donationsZat: null,
    donationsUsdCents: null,
    fpfZat: null,
    fpfUsdCents: null,
    fpfUnreservedZat: null,
    fpfReservedUsdCents: null,
    incZat: null,
    incUsdCents: null,
    penumbraUm: null,
    namadaNam: null,
    totalPaidOutUsdCents: null,
    toBePaidOutUsdCents: null,
    allocations: [],
    payouts: [],
  };
  const paid = new Map<string, bigint | null>();
  const committed = new Map<string, bigint | null>();
  const milestones = new Map<
    string,
    {
      m1: string | null;
      m2: string | null;
      m3: string | null;
      zec: bigint | null;
    }
  >();

  let section: Section = "none";
  let lastMilestoneTitle: string | null = null;

  for (let i = 0; i < rows.length; i++) {
    const label = (rows[i][0] ?? "").trim();
    const v1 = (rows[i][1] ?? "").trim();
    const v2 = (rows[i][2] ?? "").trim();
    const v3 = (rows[i][3] ?? "").trim();

    const marker = SECTION_MARKERS.find(([re]) => re.test(label));
    if (marker) {
      section = marker[1];
      // The Paid/Committed marker rows carry their own total in col1.
      if (section === "paid") out.totalPaidOutUsdCents = usdCents(v1);
      if (section === "committed") out.toBePaidOutUsdCents = usdCents(v1);
      continue;
    }
    if (!label) continue;

    if (label === "Last Updated:") out.capturedOn = isoDate(v1);
    else if (label === "Zcash Price") out.zecPriceCents = usdCents(v1);
    else if (section === "fpf") {
      if (label === "Total ZEC Remaining (FPF):") out.fpfZat = zecZat(v1);
      else if (label === "Total USD Value:") out.fpfUsdCents = usdCents(v1);
      else if (label === "Unreserved ZEC (Spendable)")
        out.fpfUnreservedZat = zecZat(v1);
      else if (label === "USD Reserved") out.fpfReservedUsdCents = usdCents(v1);
      else if (label !== "Category" && label !== "Current ZEC Value") {
        // Allocation rows: Category | Amount (ZEC) | Allocation %.
        const zat = zecZat(v1);
        if (zat != null)
          out.allocations.push({
            category: label,
            zecZat: zat,
            sharePct: plainNumber(v2.replace("%", "")),
          });
      }
    } else if (section === "donations") {
      if (label === "Total ZEC Remaining:") out.donationsZat = zecZat(v1);
      else if (label === "Total USD Value:")
        out.donationsUsdCents = usdCents(v1);
    } else if (section === "inc") {
      if (label === "Total ZEC Remaining:") out.incZat = zecZat(v1);
      else if (label === "Total USD Value:") out.incUsdCents = usdCents(v1);
    } else if (section === "penumbra") {
      if (label === "Total UM Remaining:") out.penumbraUm = plainNumber(v1);
    } else if (section === "namada") {
      if (label === "Total NAM Remaining:") out.namadaNam = plainNumber(v1);
    } else if (section === "paid") {
      paid.set(label, usdCents(v1));
    } else if (section === "committed") {
      committed.set(label, usdCents(v1));
    } else if (section === "milestones") {
      if (label === "USD Paid to date") continue;
      if (label === "ZEC Paid to date") {
        if (lastMilestoneTitle) {
          const m = milestones.get(lastMilestoneTitle);
          if (m) m.zec = zecZat(v1);
        }
      } else if (v1 || v2 || v3) {
        // Grant row: title | M1 Status | M2 Status | M3 Status.
        milestones.set(label, {
          m1: v1 || null,
          m2: v2 || null,
          m3: v3 || null,
          zec: null,
        });
        lastMilestoneTitle = label;
      }
    }
  }

  // Merge paid + committed + milestones. The dashboard writes the SAME grant
  // with different dollar suffixes per block ("Zcash India - $3750 (Mar-May)"
  // in Paid Out vs "Zcash India - $2500 (Mar-May)" in the milestone block),
  // so the merge key strips $amounts; the period suffix keeps distinct
  // phases of a program apart.
  const mergeKey = (t: string) =>
    t
      .toLowerCase()
      .replace(/\$\s?[\d,.]+k?/g, "")
      .replace(/[^a-z0-9()]+/g, " ")
      .trim();
  const byKey = new Map<
    string,
    {
      title: string;
      paid: bigint | null;
      pending: bigint | null;
      m: {
        m1: string | null;
        m2: string | null;
        m3: string | null;
        zec: bigint | null;
      } | null;
    }
  >();
  const upsert = (title: string) => {
    const k = mergeKey(title);
    const cur = byKey.get(k) ?? {
      title,
      paid: null,
      pending: null,
      m: null,
    };
    // Prefer the longest title variant (usually the most informative).
    if (title.length > cur.title.length) cur.title = title;
    byKey.set(k, cur);
    return cur;
  };
  for (const [t, v] of paid) upsert(t).paid = v;
  for (const [t, v] of committed) upsert(t).pending = v;
  for (const [t, v] of milestones) upsert(t).m = v;

  for (const e of byKey.values()) {
    out.payouts.push({
      title: e.title,
      paidUsdCents: e.paid,
      pendingUsdCents: e.pending,
      m1: e.m?.m1 ?? null,
      m2: e.m?.m2 ?? null,
      m3: e.m?.m3 ?? null,
      zecPaidZat: e.m?.zec ?? null,
    });
  }

  return out;
}
