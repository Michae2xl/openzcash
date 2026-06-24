import { describe, expect, it } from "vitest";
import {
  LOCKBOX_START_HEIGHT,
  LOCKBOX_ZEC_PER_BLOCK,
  THIRD_HALVING_HEIGHT,
  lockboxZecAt,
} from "./lockbox";

describe("lockboxZecAt", () => {
  it("is zero at and before NU6 activation", () => {
    expect(lockboxZecAt(LOCKBOX_START_HEIGHT)).toBe(0);
    expect(lockboxZecAt(LOCKBOX_START_HEIGHT - 1000)).toBe(0);
    expect(lockboxZecAt(0)).toBe(0);
  });

  it("accrues 0.1875 ZEC per block since NU6", () => {
    expect(lockboxZecAt(LOCKBOX_START_HEIGHT + 1)).toBeCloseTo(
      LOCKBOX_ZEC_PER_BLOCK,
      8,
    );
    expect(lockboxZecAt(LOCKBOX_START_HEIGHT + 1000)).toBeCloseTo(187.5, 8);
  });

  it("matches the on-chain order of magnitude near mid-2026", () => {
    // ~662,800 blocks after NU6 ≈ 124k ZEC (the spreadsheet snapshot was ~122k).
    const zec = lockboxZecAt(3_389_210);
    expect(zec).toBeGreaterThan(120_000);
    expect(zec).toBeLessThan(130_000);
  });

  it("stops accruing after the 3rd halving", () => {
    const atEnd = lockboxZecAt(THIRD_HALVING_HEIGHT);
    expect(lockboxZecAt(THIRD_HALVING_HEIGHT + 50_000)).toBe(atEnd);
  });
});
