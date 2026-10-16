import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DARK_WALLET_LOGOS, darkWalletLogo } from "./wallet-logos";

describe("darkWalletLogo", () => {
  it("resolves the light rendition for marks drawn in ink, ignoring the cache key", () => {
    expect(darkWalletLogo("/wallet-logos/zodl.png?v=ff209828")).toBe("/wallet-logos/dark/zodl.png");
    expect(darkWalletLogo("/wallet-logos/ledger.png")).toBe("/wallet-logos/dark/ledger.png");
  });

  it("leaves logos that carry their own colour alone", () => {
    expect(darkWalletLogo("/wallet-logos/zingo.png?v=e269f01b")).toBeUndefined();
    expect(darkWalletLogo("/wallet-logos/brave.png")).toBeUndefined();
  });

  it("points every rendition at a file that ships in public/", () => {
    for (const [light, dark] of Object.entries(DARK_WALLET_LOGOS)) {
      expect(existsSync(join(process.cwd(), "public", light))).toBe(true);
      expect(existsSync(join(process.cwd(), "public", dark))).toBe(true);
    }
  });
});
