import { describe, expect, it } from "vitest";
import { parseTreasury, usdCents, zecZat } from "./treasury-parse";

// Abbreviated but structurally faithful copy of the real dashboard tab
// (gid 228848690, "Last Updated 07/21/2026").
const FIXTURE: string[][] = [
  ["ZecHub DAO Treasury Dashboard", ""],
  ["DAO Treasury Link", ""],
  ["", ""],
  ["Last Updated:", "07/21/2026"],
  ["Zcash Price", "$542.00"],
  ["Penumbra Price", "$0.01"],
  ["FPF", ""],
  ["Category", "Amount (ZEC)", "Allocation"],
  ["Global Ambassador Provisioning", "20", "26.67%"],
  ["Hackathon", "25", "33.33%"],
  ["Community Proposals", "10", "13.33%"],
  ["Small Bounty Fund", "20", "26.67%"],
  ["", ""],
  ["Total ZEC Remaining (FPF):", "73.53"],
  ["Total USD Value:", "$39,853.26"],
  ["Unreserved ZEC (Spendable)", "39.58"],
  ["USD Reserved", "$18,400.00"],
  ["Current ZEC Value", "33.95"],
  ["ZecHub Donations", ""],
  ["Total ZEC Remaining:", "414.78"],
  ["Total USD Value:", "$224,810.76"],
  ["", ""],
  ["ZecHub Treasury (ZecHub Inc)", ""],
  ["Total ZEC Remaining:", "54.354"],
  ["Total USD Value:", "$29,459.87"],
  ["Penumbra Threshold Custody", ""],
  ["Total UM Remaining:", "819.1"],
  ["Total USD Value:", "$8.19"],
  ["Namada Treasury", ""],
  ["Total NAM Remaining:", "229,162"],
  ["Total USD Value:", "$160.41"],
  ["", ""],
  ["Total Paid Out USD | ZEC", "$13,720.00"],
  ["Zcash Global Ambassador Elzz - $3000 (Nov-Jan)", "$1,000.00"],
  ["Zcash India - $3750 (Mar-May)", "$3,750.00"],
  ["Zcash India June-August 2026 ", "$1,600.00"],
  ["", ""],
  ["To Be Paid Out USD | ZEC", "$18,400"],
  ["Zcash India June-August 2026 ", "$3,200.00"],
  ["Improve ZecHub Privacy & Translation Quality ", "$2,500.00"],
  ["", ""],
  ["Global Ambassador Proposals ", ""],
  ["", "M1 Status", "M2 Status", "M3 Status"],
  [
    "Zcash Global Ambassador Elzz - $3000 (Nov-Jan)",
    "Complete",
    "Complete",
    "Complete",
  ],
  ["USD Paid to date", "$3,000.00"],
  ["ZEC Paid to date", "2.78"],
  ["", "M1 Status", "M2 Status", "M3 Status"],
  ["Zcash India - $2500 (Mar-May)", "Complete", "Complete", "Pending"],
  ["USD Paid to date", "$2,500.00"],
  ["ZEC Paid to date", "1.9"],
];

describe("parseTreasury", () => {
  const p = parseTreasury(FIXTURE);

  it("reads the capture date and price", () => {
    expect(p.capturedOn).toBe("2026-07-21");
    expect(p.zecPriceCents).toBe(54200n);
  });

  it("reads every treasury bucket without label collisions", () => {
    expect(p.fpfZat).toBe(7353000000n);
    expect(p.fpfUsdCents).toBe(3985326n);
    expect(p.fpfUnreservedZat).toBe(3958000000n);
    expect(p.fpfReservedUsdCents).toBe(1840000n);
    expect(p.donationsZat).toBe(41478000000n);
    expect(p.donationsUsdCents).toBe(22481076n);
    expect(p.incZat).toBe(5435400000n);
    expect(p.incUsdCents).toBe(2945987n);
    expect(p.penumbraUm).toBe(819.1);
    expect(p.namadaNam).toBe(229162);
  });

  it("reads FPF allocations with shares", () => {
    expect(p.allocations).toHaveLength(4);
    expect(p.allocations[1]).toEqual({
      category: "Hackathon",
      zecZat: 2500000000n,
      sharePct: 33.33,
    });
  });

  it("reads paid/committed totals and merges per-grant rows", () => {
    expect(p.totalPaidOutUsdCents).toBe(1372000n);
    expect(p.toBePaidOutUsdCents).toBe(1840000n);
    const india = p.payouts.find((x) => x.title.includes("June-August"));
    expect(india?.paidUsdCents).toBe(160000n);
    expect(india?.pendingUsdCents).toBe(320000n);
    const elzz = p.payouts.find((x) => x.title.includes("Nov-Jan"));
    expect(elzz?.m1).toBe("Complete");
    expect(elzz?.zecPaidZat).toBe(278000000n);
  });

  it("merges paid and milestone blocks whose titles differ by $ amount", () => {
    // Real dashboard quirk: "Zcash India - $3750 (Mar-May)" in Paid Out vs
    // "Zcash India - $2500 (Mar-May)" in the milestone block are ONE grant.
    const india = p.payouts.filter((x) => x.title.includes("(Mar-May)"));
    expect(india).toHaveLength(1);
    expect(india[0].paidUsdCents).toBe(375000n);
    expect(india[0].m3).toBe("Pending");
    expect(india[0].zecPaidZat).toBe(190000000n);
    // Different periods of the same program must NOT merge.
    expect(p.payouts.some((x) => x.title.includes("June-August"))).toBe(true);
  });

  it("money helpers reject prose and blanks", () => {
    expect(usdCents("")).toBeNull();
    expect(usdCents("see notes")).toBeNull();
    expect(zecZat("n/a")).toBeNull();
  });
});
