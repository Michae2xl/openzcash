import { describe, expect, it } from "vitest";
import { reconcile, type DerivedAddressInfo } from "./reconciliation";
import type { ChainOutput, ChainTx } from "../zcash/types";

let c = 0;
function out(
  direction: ChainOutput["direction"],
  valueZat: bigint,
  address: string | null,
): ChainOutput {
  return {
    index: c++,
    pool: "orchard",
    direction,
    valueZat,
    address,
    memoRaw: null,
    decryptedVia: direction === "out" ? "ovk" : "ivk",
  };
}
function tx(
  treasuryId: string,
  txid: string,
  outputs: ChainOutput[],
  feeZat = 0n,
): ChainTx {
  return {
    txid,
    blockHeight: 100,
    blockTime: new Date(1700000000000).toISOString(),
    pool: "orchard",
    feeZat,
    treasuryId,
    outputs,
  };
}

describe("reconcile — override manual", () => {
  it("override tem precedência e marca info (sai das exceções)", () => {
    const txs = [tx("1", "TX1", [out("in", 1000n, "uX")])]; // seria orphan_in
    const overrides = new Map([["1::TX1", "grant_received"]]);
    const { entries, summary } = reconcile(txs, [], new Map(), overrides);
    const e = entries.find((x) => x.txid === "TX1");
    expect(e?.classification).toBe("grant_received");
    expect(e?.reconStatus).toBe("info");
    expect(summary.exceptionCount).toBe(0);
  });
});

describe("reconcile — endereço derivado de projeto", () => {
  const derived = new Map<string, DerivedAddressInfo>([
    [
      "uDERIV",
      {
        projectName: "Zcash Brazil",
        paymentKind: "grant",
        issuedMonth: "2026-06",
      },
    ],
  ]);

  it("saída para endereço derivado vira grant_paid atribuído ao projeto/mês", () => {
    const txs = [tx("1", "TXPAY", [out("out", 5000n, "uDERIV")], 100n)];
    const { entries } = reconcile(txs, [], new Map(), new Map(), derived);
    const e = entries.find((x) => x.txid === "TXPAY");
    expect(e?.classification).toBe("grant_paid");
    expect(e?.counterparty).toBe("Zcash Brazil · 2026-06");
    expect(e?.reconStatus).toBe("info");
  });

  it("entrada no endereço derivado vira grant_received", () => {
    const txs = [tx("1", "TXRCV", [out("in", 5000n, "uDERIV")])];
    const { entries } = reconcile(txs, [], new Map(), new Map(), derived);
    expect(entries.find((x) => x.txid === "TXRCV")?.classification).toBe(
      "grant_received",
    );
  });

  it("paymentKind bounty vira bounty_paid", () => {
    const d = new Map<string, DerivedAddressInfo>([
      [
        "uB",
        { projectName: "P", paymentKind: "bounty", issuedMonth: "2026-06" },
      ],
    ]);
    const txs = [tx("1", "TXB", [out("out", 100n, "uB")], 10n)];
    const { entries } = reconcile(txs, [], new Map(), new Map(), d);
    expect(entries.find((x) => x.txid === "TXB")?.classification).toBe(
      "bounty_paid",
    );
  });
});
