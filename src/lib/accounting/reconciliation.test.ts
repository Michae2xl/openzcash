import { describe, expect, it } from "vitest";
import { MOCK_PAYCHECKS, MOCK_TXS } from "../zcash/mock/dataset";
import { zecToZatoshis } from "../zcash/units";
import { reconcile, type LedgerEntry } from "./reconciliation";

const result = reconcile(MOCK_TXS, MOCK_PAYCHECKS);

const byCounterparty = (name: string): LedgerEntry | undefined =>
  result.entries.find((e) => e.counterparty === name);

describe("reconcile (dataset mock)", () => {
  it("produz uma entrada por tx mais os contra-cheques pendentes", () => {
    expect(result.summary.entryCount).toBe(MOCK_TXS.length + 1); // +Diego pendente
  });

  it("casa 3 contra-cheques + 1 fornecedor e levanta 3 exceções", () => {
    expect(result.summary.matchedCount).toBe(4);
    // pagamento sem memo mas com destino decifrado = pagamento a terceiro (info),
    // então sobram 3 exceções: depósito órfão, memo 0xFF desconhecido, contra-cheque pendente
    expect(result.summary.exceptionCount).toBe(3);
  });

  it("classifica o contra-cheque da Ana como matched", () => {
    const ana = byCounterparty("Ana Souza");
    expect(ana?.classification).toBe("paycheck");
    expect(ana?.reconStatus).toBe("matched");
    expect(ana?.matchedPaycheckId).toBe("pc-ana-202606");
    expect(ana?.structured?.refId).toBe("PS-2026-06-ANA");
  });

  it("inclui a fee na saída e ignora o change no efeito líquido", () => {
    const ana = byCounterparty("Ana Souza");
    // net = -(valor + fee); o change (3.6477) NÃO entra
    expect(ana?.netZat).toBe(
      -(zecToZatoshis("8.8521") + zecToZatoshis("0.00015")),
    );
    expect(ana?.feeZat).toBe(zecToZatoshis("0.00015"));
  });

  it("trata pagamento sem memo, mas com destino decifrado, como pagamento a terceiro", () => {
    const pay = result.entries.find(
      (e) => e.classification === "external_payment",
    );
    expect(pay?.reconStatus).toBe("info");
    expect(pay?.counterparty).toBe("u1unknown…dest");
  });

  it("trata depósito transparente de exchange como órfão de entrada", () => {
    const dep = result.entries.find((e) => e.classification === "orphan_in");
    expect(dep?.reconStatus).toBe("exception");
    expect(dep?.pool).toBe("transparent");
  });

  it("trata memo 0xFF de terceiro (versão desconhecida) como saída a classificar", () => {
    const third = result.entries.find((e) =>
      e.note?.includes("schema desconhecido"),
    );
    expect(third?.classification).toBe("orphan_out");
    expect(third?.structured).toBeNull();
  });

  it("acusa contra-cheque emitido sem broadcast", () => {
    const diego = byCounterparty("Diego Martins");
    expect(diego?.classification).toBe("pending_paycheck");
    expect(diego?.reconStatus).toBe("exception");
    expect(diego?.txid).toBeNull();
    expect(diego?.netZat).toBe(0n);
  });

  it("classifica recebimentos com memo de texto como income (info)", () => {
    const acme = result.entries.find((e) => e.counterparty?.includes("ACME"));
    expect(acme?.classification).toBe("income");
    expect(acme?.reconStatus).toBe("info");
    expect(acme?.netZat).toBe(zecToZatoshis("12.5"));
  });

  it("mantém o saldo positivo e coerente", () => {
    expect(result.summary.balanceZat).toBeGreaterThan(0n);
    // entradas: 12.5 + 5 + 20 = 37.5
    expect(result.summary.totalInZat).toBe(zecToZatoshis("37.5"));
  });
});
