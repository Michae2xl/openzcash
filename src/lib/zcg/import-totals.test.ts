import { describe, expect, it } from "vitest";
import { parseTotals } from "./import-totals";

const HEADER = [
  "Recipient or Classification",
  "USD value paid out to date",
  "Future milestones",
  "",
  "Classification",
  "USD paid out to date",
];

function parse(rows: string[][]) {
  return parseTotals(
    [["Status: OK"], [], HEADER, ...rows],
    "164877840",
    "zcg_grants",
    new Date("2026-11-27T00:00:00Z"),
  );
}

describe("parseTotals", () => {
  it("keeps recipients with a paid or a scheduled amount", () => {
    const out = parse([
      ["Paid Team", "$ 1,000", "$ 0", "", "Infrastructure", "$ 1,000"],
      ["Scheduled Team", "$ 0", "$ 500", "", "", ""],
    ]);
    const recipients = out.filter((r) => r.rowKind === "recipient_total");
    expect(recipients.map((r) => r.label)).toEqual([
      "Paid Team",
      "Scheduled Team",
    ]);
  });

  it("skips recipient rows with nothing paid and nothing scheduled", () => {
    const out = parse([
      ["Paid Team", "$ 1,000", "$ 0", "", "Infrastructure", "$ 1,000"],
      ["Emptied Row", "$ 0", "$ 0", "", "", ""],
      ["Blank Amounts", "", "", "", "", ""],
      ["Total", "$ 1,000", "$ 0", "", "Total", "$ 1,000"],
    ]);
    expect(
      out.filter((r) => r.rowKind === "recipient_total").map((r) => r.label),
    ).toEqual(["Paid Team"]);
    expect(out.filter((r) => r.rowKind === "grand_total")).toHaveLength(1);
    expect(
      out.filter((r) => r.rowKind === "classification_total"),
    ).toHaveLength(1);
  });
});
