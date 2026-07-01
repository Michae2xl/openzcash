import { describe, expect, it } from "vitest";
import { classifyRegion } from "./regions";

describe("classifyRegion", () => {
  it("tags named regions from grant titles", () => {
    expect(classifyRegion("Zcash Nigeria 2026")).toBe("Nigeria");
    expect(classifyRegion("Zcash Ghana (July 2026)")).toBe("Ghana");
    expect(classifyRegion("Zcash Brazil 2026")).toBe("Brazil");
    expect(classifyRegion("Growing the Turkish Zcash Community")).toBe(
      "Türkiye",
    );
    expect(classifyRegion("ZcashArabia")).toBe("Arabia");
    expect(classifyRegion("Zcash Global en Español 2026")).toBe(
      "LatAm (Español)",
    );
  });

  it("combines multiple text fields", () => {
    expect(classifyRegion(null, "Zaino", "Zcash Kenya pilot")).toBe("Kenya");
  });

  it("returns null when no region is named", () => {
    expect(classifyRegion("Zebra Coverage-Guided Fuzzing")).toBeNull();
    expect(classifyRegion("QEDIT", "Protocol audit")).toBeNull();
    expect(classifyRegion("")).toBeNull();
  });
});
