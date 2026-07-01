import { describe, expect, it } from "vitest";
import { conversionAnalysis } from "./conversion";

const grants = [
  {
    grantKey: "zaino - Stability, Performance & Testing",
    usdCents: 3200000n,
    firstPaid: "2026-02-01",
    status: "open",
  },
  {
    grantKey: "Rozo Merchant POS: Fast Zcash Payments for Merchants IRL",
    usdCents: 4800000n,
    firstPaid: "2026-01-10",
    status: "open",
  },
];

describe("conversionAnalysis", () => {
  it("links approved proposals to funded grants by fuzzy title", () => {
    const r = conversionAnalysis(
      [
        {
          title: "zaino - Stability, Performance & Testing",
          requestedUsdCents: 5000000n,
          decisionDate: "2026-01-15",
        },
        {
          title:
            "Rozo Merchant POS: Fast Zcash Payments for Real-World Merchants",
          requestedUsdCents: 4800000n,
          decisionDate: "2026-01-01",
        },
      ],
      grants,
    );
    expect(r.approvedCount).toBe(2);
    expect(r.matchedCount).toBe(2);
    const zaino = r.pairs.find((p) => p.title.startsWith("zaino"))!;
    expect(zaino.grantKey).toBe("zaino - Stability, Performance & Testing");
    expect(zaino.lagDays).toBe(17); // 2026-01-15 → 2026-02-01
  });

  it("leaves an approved proposal unmatched when no grant title matches", () => {
    const r = conversionAnalysis(
      [
        {
          title: "Some Unfunded Idea That Never Shipped",
          requestedUsdCents: 1000000n,
          decisionDate: "2026-01-01",
        },
      ],
      grants,
    );
    expect(r.matchedCount).toBe(0);
    expect(r.pairs[0].grantKey).toBeNull();
  });

  it("claims each grant at most once", () => {
    const r = conversionAnalysis(
      [
        {
          title: "zaino - Stability, Performance & Testing",
          requestedUsdCents: null,
          decisionDate: null,
        },
        {
          title: "zaino - Stability, Performance & Testing",
          requestedUsdCents: null,
          decisionDate: null,
        },
      ],
      grants,
    );
    expect(r.pairs.filter((p) => p.grantKey != null)).toHaveLength(1);
  });
});
