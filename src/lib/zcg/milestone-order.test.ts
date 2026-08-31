import { describe, expect, it } from "vitest";
import { sortRecipientMilestonesNewestFirst } from "./milestone-order";

describe("recipient milestone ordering", () => {
  it("shows the newest relevant dates first and leaves undated rows last", () => {
    const rows = [
      {
        id: "paid-old",
        isPaid: true,
        paidOutDate: "2025-12-22",
        estimatedPayoutDate: null,
      },
      {
        id: "open-undated",
        isPaid: false,
        paidOutDate: null,
        estimatedPayoutDate: null,
        paidOutRaw: "TBD",
      },
      {
        id: "open-new",
        isPaid: false,
        paidOutDate: null,
        estimatedPayoutDate: "2027-06-30",
        paidOutRaw: null,
      },
      {
        id: "paid-new",
        isPaid: true,
        paidOutDate: "2026-08-27",
        estimatedPayoutDate: "2026-08-01",
        paidOutRaw: "27 Aug 2026",
      },
      {
        id: "open-old",
        isPaid: false,
        paidOutDate: null,
        estimatedPayoutDate: "2026-10-01",
        paidOutRaw: null,
      },
      {
        id: "open-raw-date",
        isPaid: false,
        paidOutDate: null,
        estimatedPayoutDate: null,
        paidOutRaw: "28 May 2025",
      },
    ];

    const sorted = sortRecipientMilestonesNewestFirst(rows);

    expect(sorted.filter((row) => !row.isPaid).map((row) => row.id)).toEqual([
      "open-new",
      "open-old",
      "open-raw-date",
      "open-undated",
    ]);
    expect(sorted.filter((row) => row.isPaid).map((row) => row.id)).toEqual([
      "paid-new",
      "paid-old",
    ]);
    expect(rows.map((row) => row.id)).toEqual([
      "paid-old",
      "open-undated",
      "open-new",
      "paid-new",
      "open-old",
      "open-raw-date",
    ]);
  });
});
