import { describe, expect, it } from "vitest";
import { issueNumberFromLink } from "./issue-link";

describe("issueNumberFromLink", () => {
  it("extracts the number from a ZCG issue link", () => {
    expect(
      issueNumberFromLink(
        "https://github.com/ZcashCommunityGrants/zcashcommunitygrants/issues/333",
      ),
    ).toBe(333);
  });

  it("ignores non-issue and foreign links", () => {
    expect(
      issueNumberFromLink(
        "https://forum.zcashcommunity.com/t/some-topic/56506",
      ),
    ).toBeNull();
    expect(
      issueNumberFromLink("https://github.com/other/repo/issues/12"),
    ).toBeNull();
  });

  it("handles null/undefined/empty", () => {
    expect(issueNumberFromLink(null)).toBeNull();
    expect(issueNumberFromLink(undefined)).toBeNull();
    expect(issueNumberFromLink("")).toBeNull();
  });
});
