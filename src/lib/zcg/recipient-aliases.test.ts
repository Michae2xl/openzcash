import { describe, expect, it } from "vitest";
import {
  canonicalRecipient,
  isAliasName,
  RECIPIENT_ALIASES,
  recipientLedgerKeys,
} from "./recipient-aliases";

describe("canonicalRecipient", () => {
  it("folds known spelling variants into one entity", () => {
    // Real ledger pairs: the sheet renamed these across years and tabs.
    expect(canonicalRecipient("NightHawk")).toBe("Nighthawk");
    expect(canonicalRecipient("RedDev")).toBe("RED.DEV INC");
    expect(canonicalRecipient("@robustfengbin")).toBe("robustfengbin");
    expect(canonicalRecipient("PGP for Crypto (Paul Brigner)")).toBe(
      "PGP for Crypto, LLC",
    );
  });

  it("leaves unknown names untouched, only trimming", () => {
    expect(canonicalRecipient("  QEDIT  ")).toBe("QEDIT");
    expect(canonicalRecipient("Zingo Labs")).toBe("Zingo Labs");
  });

  it("keeps collaborations and lookalikes apart", () => {
    // Joint grants and similarly named but distinct entities must never merge:
    // attributing another party's money to someone is worse than a split row.
    for (const name of [
      "Blockchain Commons with Zingo Labs",
      "Zcash Media",
      "ZcashMe, Inc",
      "Weever / Zcash.me",
      "Cryptobyte",
      "1337bytes",
      "Least Authority",
      "Taylor Hornby",
    ]) {
      expect(canonicalRecipient(name)).toBe(name);
      expect(isAliasName(name)).toBe(false);
    }
  });

  it("is case-insensitive on lookup and idempotent on canonical names", () => {
    expect(canonicalRecipient("nighthawk")).toBe("Nighthawk");
    for (const canonical of Object.keys(RECIPIENT_ALIASES)) {
      expect(canonicalRecipient(canonical)).toBe(canonical);
    }
  });

  it("flags alias rows so aggregation can fold them", () => {
    expect(isAliasName("NightHawk")).toBe(true);
    expect(isAliasName("RedDev")).toBe(true);
  });

  it("expands a recipient detail lookup to its complete alias family", () => {
    const pgpKeys = [
      "pgp for crypto, llc",
      "pgp for crypto (paul brigner)",
    ];

    expect(recipientLedgerKeys("PGP for Crypto, LLC")).toEqual(pgpKeys);
    expect(recipientLedgerKeys("pgp for crypto (paul brigner)")).toEqual(
      pgpKeys,
    );
    expect(recipientLedgerKeys("GGuy")).toEqual(["gguy"]);
  });
});
