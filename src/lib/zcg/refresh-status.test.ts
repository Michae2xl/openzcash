import { describe, expect, it } from "vitest";
import { coreRefreshSucceeded, type CoreRefreshResults } from "./refresh-status";

function complete(): CoreRefreshResults {
  return {
    disbursements: Array.from({ length: 5 }, () => ({ status: "ok" })),
    snapshots: Array.from({ length: 6 }, () => ({ ok: true })),
    proposals: Array.from({ length: 2 }, () => ({ status: "ok" })),
    totals: Array.from({ length: 2 }, () => ({ status: "ok" })),
  };
}

describe("coreRefreshSucceeded", () => {
  it("accepts only a complete spreadsheet refresh", () => {
    expect(coreRefreshSucceeded(complete())).toBe(true);
  });

  it("rejects a partial result even when another tab succeeded", () => {
    const result = complete();
    result.disbursements.pop();
    expect(coreRefreshSucceeded(result)).toBe(false);
  });

  it("rejects an explicit per-tab or snapshot error", () => {
    const tabError = complete();
    tabError.proposals[1].status = "error: timeout";
    expect(coreRefreshSucceeded(tabError)).toBe(false);

    const snapshotError = complete();
    snapshotError.snapshots[0].ok = false;
    expect(coreRefreshSucceeded(snapshotError)).toBe(false);
  });

  it("does not treat an upstream updates-required banner as an import error", () => {
    const result = complete();
    result.totals[0].status = "updates_required";
    expect(coreRefreshSucceeded(result)).toBe(true);
  });
});
