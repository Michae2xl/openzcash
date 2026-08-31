import { describe, expect, it } from "vitest";
import { recipientEntryPresentation } from "./recipient-entry";

describe("recipient public-ledger entries", () => {
  it("distinguishes grants, committee stipends, and operating expenses", () => {
    expect(
      recipientEntryPresentation({
        project: "Maintenance and Improvements to Coin Voting",
        disbursementType: "grant_milestone",
        deliverable: "Milestone 8",
        forMonth: null,
        milestoneLabel: "8",
      }),
    ).toEqual({
      label: "Maintenance and Improvements to Coin Voting",
      detail: "Milestone 8",
      isGrant: true,
    });

    expect(
      recipientEntryPresentation({
        project: null,
        disbursementType: "monthly",
        deliverable: null,
        forMonth: "July 2026",
        milestoneLabel: null,
      }),
    ).toEqual({
      label: "Committee stipend",
      detail: "July 2026",
      isGrant: false,
    });

    expect(
      recipientEntryPresentation({
        project: null,
        disbursementType: "reimbursement",
        deliverable: "Documented expense",
        forMonth: null,
        milestoneLabel: null,
      }),
    ).toEqual({
      label: "Reimbursement",
      detail: "Documented expense",
      isGrant: false,
    });
  });
});
