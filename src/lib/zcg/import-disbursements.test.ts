import { describe, expect, it } from "vitest";
import { disambiguateDuplicateDisbursementIds } from "./disbursement-ids";

describe("disambiguateDuplicateDisbursementIds", () => {
  it("preserves the historical first id and keeps every duplicate row", () => {
    const rows = [
      { id: "same", sourceRowIndex: 10 },
      { id: "same", sourceRowIndex: 11 },
      { id: "same", sourceRowIndex: 12 },
      { id: "different", sourceRowIndex: 13 },
    ];

    const result = disambiguateDuplicateDisbursementIds(rows);

    expect(result).toHaveLength(rows.length);
    expect(result[0].id).toBe("same");
    expect(result[3].id).toBe("different");
    expect(new Set(result.map((row) => row.id)).size).toBe(rows.length);
  });

  it("is deterministic across repeated imports", () => {
    const rows = [{ id: "same" }, { id: "same" }, { id: "same" }];
    expect(disambiguateDuplicateDisbursementIds(rows)).toEqual(
      disambiguateDuplicateDisbursementIds(rows),
    );
  });
});
