import { describe, expect, it } from "vitest";
import { titlesMatch } from "./match-titles";

describe("titlesMatch", () => {
  it("matches identical titles from GitHub and the sheet", () => {
    const pairs: [string, string][] = [
      ["red·bridge Launch", "red·bridge Launch"],
      ["Zenith Full-node Wallet 2026", "Zenith Full-node Wallet 2026"],
      [
        "Zcash Reference Flow Kit v1: Android SDK Smoke Paths",
        "Zcash Reference Flow Kit v1: Android SDK Smoke Paths",
      ],
      ["ZKPay Campus", "ZKPay Campus"],
      ["Offensive Security", "Offensive Security"],
      [
        "Formal Verification of Consensus Arithmetic and Parsing in zebra-chain",
        "Formal Verification of Consensus Arithmetic and Parsing in zebra-chain",
      ],
    ];
    for (const [a, b] of pairs) expect(titlesMatch(a, b)).toBe(true);
  });

  it("matches the same proposal with a reworded title (Rozo)", () => {
    expect(
      titlesMatch(
        "Rozo Merchant POS: Fast Zcash Payments for Real-World Merchants",
        "Rozo Merchant POS: Fast Zcash Payments for Merchants IRL",
      ),
    ).toBe(true);
  });

  it("does NOT merge distinct proposals that share a keyword", () => {
    const distinct: [string, string][] = [
      ["Zaino Completion", "Zaino Release Stabilization"],
      [
        "zaino - Stability, Performance & Testing",
        "Zaino Release Stabilization",
      ],
      ["zaino - Stability, Performance & Testing", "Zaino Completion"],
      ["Zcash Nigeria 2026", "Zcash Ghana (July 2026 - September 2026)"],
      ["Zcash Brazil 2026", "Zcash Global en Español 2026"],
      ["Growing the Turkish Zcash Community", "Zcash Türkiye 2026 Q3-4"],
    ];
    for (const [a, b] of distinct) expect(titlesMatch(a, b)).toBe(false);
  });
});
