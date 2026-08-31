import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const recipients = vi.hoisted(() =>
  [
    ["GGuy", "gguy", 0],
    ["PGP for Crypto, LLC", "pgp for crypto, llc", 2],
    ["Hanh", "hanh", 13],
    ["Zerodartz", "zerodartz", 0],
    ["Artkor", "artkor", 0],
  ].map(([recipientName, recipientKey, grantCount]) => ({
    recipientName,
    recipientKey,
    grantCount,
    paymentCount: 1,
    lineCount: 1,
    usdCents: 100n,
    zecZat: 100n,
    externalUsdCents: grantCount ? 100n : 0n,
    externalZecZat: grantCount ? 100n : 0n,
    isInternal: grantCount === 0,
    hasInternal: true,
    lastPaid: "2026-07-29",
  })),
);

vi.mock("@/lib/zcg/disbursements-repo", () => ({
  recipientTotals: vi.fn(async () => recipients),
}));

vi.mock("@/lib/cache/memo", () => ({
  LEDGER_TTL_MS: 1,
  cached: async (
    _key: string,
    _ttl: number,
    loader: () => Promise<unknown>,
  ) => loader(),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | false>) =>
    classes.filter(Boolean).join(" "),
}));

describe("current committee ledger presentation", () => {
  it("offers the same public-ledger entry point for all five members", async () => {
    const { CurrentCommittee } = await import("./current-committee");

    const html = renderToStaticMarkup(await CurrentCommittee());

    expect(html.match(/Public ledger/g)).toHaveLength(5);
    expect(html.match(/href="\/zcg\/recipient\?r=/g)).toHaveLength(5);
    for (const name of ["GGuy", "Paul Brigner", "hanh", "Zerodartz", "Artkor"]) {
      expect(html).toContain(`aria-label="${name} public ledger"`);
    }
    expect(html.match(/Official ledger/g)).toHaveLength(5);
  });
});
