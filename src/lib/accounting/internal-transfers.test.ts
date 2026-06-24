import { describe, expect, it } from "vitest";
import { buildInternalIndex, legKey } from "./internal-transfers";
import { reconcile } from "./reconciliation";
import type { ChainOutput, ChainTx } from "../zcash/types";

let counter = 0;
function out(
  direction: ChainOutput["direction"],
  pool: ChainOutput["pool"],
  valueZat: bigint,
  address: string | null,
): ChainOutput {
  return {
    index: counter++,
    pool,
    direction,
    valueZat,
    address,
    memoRaw: null,
    decryptedVia:
      pool === "transparent" ? "none" : direction === "out" ? "ovk" : "ivk",
  };
}

function tx(
  treasuryId: string,
  txid: string,
  height: number,
  outputs: ChainOutput[],
  feeZat = 0n,
): ChainTx {
  return {
    txid,
    blockHeight: height,
    blockTime: new Date(1700000000000 + height * 1000).toISOString(),
    pool: outputs[0]?.pool ?? "orchard",
    feeZat,
    treasuryId,
    outputs,
  };
}

const ADDR = "u18pjarr9wvd6lpe4ka69fcz837vn893rrd03nkw29hd3t0d8dsjte6j26xkf";

describe("buildInternalIndex — twin-match cross-tesouro", () => {
  it("par canônico vira internal_out (emissor) + internal_in (destino)", () => {
    const txs = [
      tx("1", "TXA", 100, [out("out", "orchard", 500000n, ADDR)], 10000n),
      tx("2", "TXA", 100, [out("in", "orchard", 500000n, ADDR)]),
    ];
    const idx = buildInternalIndex(txs);
    expect(idx.classByLeg.get(legKey("1", "TXA"))).toBe("internal_out");
    expect(idx.classByLeg.get(legKey("2", "TXA"))).toBe("internal_in");
    expect(idx.peerTreasury.get(legKey("1", "TXA"))).toBe("2");
    expect(idx.peerTreasury.get(legKey("2", "TXA"))).toBe("1");
  });

  it("ADVERSARIAL: terceiro paga DOIS tesouros na mesma txid NÃO é interno", () => {
    const txs = [
      tx("1", "TXEXT", 100, [out("in", "orchard", 100n, "uOWN1")]),
      tx("2", "TXEXT", 100, [out("in", "orchard", 200n, "uOWN2")]),
    ];
    const idx = buildInternalIndex(txs);
    expect(idx.classByLeg.size).toBe(0);
  });

  it("ADVERSARIAL: pagamento externo a endereço próprio sem perna IN → unconfirmed", () => {
    const txs = [
      // t2 recebeu nesse endereço no passado → o endereço é próprio de t2
      tx("2", "TXOLD", 50, [out("in", "orchard", 999n, "uOWN2")]),
      // t1 envia para esse endereço, mas NÃO há perna IN nesta txid (saiu de fato)
      tx("1", "TXPAY", 100, [out("out", "orchard", 700n, "uOWN2")], 10000n),
    ];
    const idx = buildInternalIndex(txs);
    expect(idx.classByLeg.get(legKey("1", "TXPAY"))).toBe(
      "internal_out_unconfirmed",
    );
  });

  it("self-send / troco cross-pool no MESMO tesouro não vira interno", () => {
    const txs = [
      tx(
        "1",
        "TXSELF",
        100,
        [
          out("out", "sapling", 1000n, "uT1SAP"),
          out("in", "orchard", 990n, "uT1ORCH"),
        ],
        10000n,
      ),
    ];
    const idx = buildInternalIndex(txs);
    expect(idx.classByLeg.get(legKey("1", "TXSELF"))).toBeUndefined();
  });

  it("diversifier novo: twin casa via mesma txid mesmo sem histórico anterior", () => {
    const txs = [
      tx("1", "TXN", 100, [out("out", "orchard", 2000n, "uNOVO")], 10000n),
      tx("2", "TXN", 100, [out("in", "orchard", 2000n, "uNOVO")]),
    ];
    const idx = buildInternalIndex(txs);
    expect(idx.classByLeg.get(legKey("1", "TXN"))).toBe("internal_out");
    expect(idx.classByLeg.get(legKey("2", "TXN"))).toBe("internal_in");
  });

  it("guarda transparente: t-addr reusado também recebido de fora → unconfirmed", () => {
    const TADDR = "t1abcdefghijklmnop";
    const txs = [
      tx("2", "TXEXT", 50, [out("in", "transparent", 5000n, TADDR)]),
      tx("1", "TXINT", 100, [out("out", "transparent", 5000n, TADDR)], 10000n),
      tx("2", "TXINT", 100, [out("in", "transparent", 5000n, TADDR)]),
    ];
    const idx = buildInternalIndex(txs);
    expect(idx.classByLeg.get(legKey("1", "TXINT"))).toBe(
      "internal_out_unconfirmed",
    );
  });

  it("matching 1:1: não casa dois OUT com um único twin (sem dupla contagem)", () => {
    const txs = [
      tx(
        "1",
        "TXD",
        100,
        [
          out("out", "orchard", 300n, "uDup"),
          out("out", "orchard", 300n, "uDup"),
        ],
        10000n,
      ),
      tx("2", "TXD", 100, [out("in", "orchard", 300n, "uDup")]),
    ];
    const idx = buildInternalIndex(txs);
    // a tx do emissor é uma transferência interna confirmada (não rebaixada),
    // e o destino recebe internal_in uma única vez.
    expect(idx.classByLeg.get(legKey("1", "TXD"))).toBe("internal_out");
    expect(idx.classByLeg.get(legKey("2", "TXD"))).toBe("internal_in");
    const ins = [...idx.classByLeg.values()].filter((v) => v === "internal_in");
    expect(ins).toHaveLength(1);
  });

  it("twinId inclui txid: duas internas idênticas em txids distintos ambas casam", () => {
    const txs = [
      tx("1", "TXA", 100, [out("out", "orchard", 500n, "uOWN2")], 10n),
      tx("2", "TXA", 100, [out("in", "orchard", 500n, "uOWN2")]),
      tx("1", "TXB", 101, [out("out", "orchard", 500n, "uOWN2")], 10n),
      tx("2", "TXB", 101, [out("in", "orchard", 500n, "uOWN2")]),
    ];
    const idx = buildInternalIndex(txs);
    expect(idx.classByLeg.get(legKey("1", "TXA"))).toBe("internal_out");
    expect(idx.classByLeg.get(legKey("1", "TXB"))).toBe("internal_out");
    expect(idx.classByLeg.get(legKey("2", "TXA"))).toBe("internal_in");
    expect(idx.classByLeg.get(legKey("2", "TXB"))).toBe("internal_in");
  });
});

describe("reconcile — efeito das transferências internas", () => {
  const txs = [
    tx("1", "TXA", 100, [out("out", "orchard", 500000n, ADDR)], 10000n),
    tx("2", "TXA", 100, [out("in", "orchard", 500000n, ADDR)]),
  ];
  const labels = new Map([
    ["1", "completa"],
    ["2", "reserva"],
  ]);

  it("classifica as duas pernas como info, não como exceção", () => {
    const { entries } = reconcile(txs, [], labels);
    const o = entries.find((e) => e.classification === "internal_out");
    const i = entries.find((e) => e.classification === "internal_in");
    expect(o?.reconStatus).toBe("info");
    expect(i?.reconStatus).toBe("info");
    expect(o?.counterparty).toBe("reserva");
    expect(i?.counterparty).toBe("completa");
  });

  it("consolidado só perde a fee; externo não conta a interna", () => {
    const { summary } = reconcile(txs, [], labels);
    // netZat: -(500000+10000) + 500000 = -10000 (só a fee)
    expect(summary.balanceZat).toBe(-10000n);
    expect(summary.totalInZat).toBe(0n); // interna não é receita externa
    expect(summary.totalOutZat).toBe(0n); // interna não é despesa externa
    expect(summary.internalVolumeZat).toBe(500000n);
    expect(summary.internalTransferCount).toBe(1);
    expect(summary.internalFeeZat).toBe(10000n);
    expect(summary.exceptionCount).toBe(0);
  });

  it("tx MISTA: parte interna no volume interno, parte externa nas saídas (não some)", () => {
    const txs = [
      tx(
        "1",
        "TXMIX",
        100,
        [
          out("out", "orchard", 500000n, "uOWN2"),
          out("out", "orchard", 300000n, "uEXT"),
        ],
        1000n,
      ),
      tx("2", "TXMIX", 100, [out("in", "orchard", 500000n, "uOWN2")]),
    ];
    const { entries, summary } = reconcile(txs, [], labels);
    const t1 = entries.find((e) => e.treasuryId === "1");
    expect(t1?.classification).toBe("mixed_transfer");
    expect(t1?.reconStatus).toBe("exception");
    expect(summary.internalVolumeZat).toBe(500000n); // só o interno, não 800k
    expect(summary.totalOutZat).toBe(300000n); // o pagamento externo NÃO desaparece
    expect(summary.balanceZat).toBe(-301000n); // = totalIn - totalOut - totalFee
  });

  it("unconfirmed: saída a endereço próprio sem par conta como saída externa provisória", () => {
    const txs = [
      tx("2", "TXOLD", 50, [out("in", "orchard", 999n, "uOWN2")]),
      tx("1", "TXPAY", 100, [out("out", "orchard", 700n, "uOWN2")], 1000n),
    ];
    const { entries, summary } = reconcile(txs, [], new Map());
    const pay = entries.find(
      (e) => e.classification === "internal_out_unconfirmed",
    );
    expect(pay?.reconStatus).toBe("exception");
    expect(summary.totalOutZat).toBe(700n); // não some dos totais
    expect(summary.internalVolumeZat).toBe(0n); // não confirmado
  });
});
