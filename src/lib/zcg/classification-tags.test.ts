import { describe, expect, it } from "vitest";
import { classifyLabel, isInternalKind } from "./classification-tags";

describe("classifyLabel", () => {
  it("tags committee stipends as salaries (internal)", () => {
    const t = classifyLabel("ZCG stipends from ZCG slice");
    expect(t.kind).toBe("stipends");
    expect(isInternalKind(t.kind)).toBe(true);
  });

  it("tags the discretionary budget as ZCG operations (internal, incl. travel)", () => {
    const t = classifyLabel("ZCG Discretionary Budget");
    expect(t.kind).toBe("operations");
    expect(t.note).toMatch(/travel/i);
    expect(isInternalKind(t.kind)).toBe(true);
  });

  it("tags Audits as security (audits & bounties)", () => {
    expect(classifyLabel("Audits").kind).toBe("security");
  });

  it("defaults every other classification to a grant (external)", () => {
    for (const l of [
      "Zcash Protocol Extension",
      "Infrastructure",
      "Wallets",
      "Media",
      "Community",
      "Education",
      "Event Sponsorship",
    ]) {
      const t = classifyLabel(l);
      expect(t.kind).toBe("grant");
      expect(isInternalKind(t.kind)).toBe(false);
    }
  });
});
