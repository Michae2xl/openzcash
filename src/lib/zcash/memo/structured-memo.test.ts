import { describe, expect, it } from "vitest";
import { decodeMemo, encodeTextMemo } from "./zip302";
import {
  DocType,
  MEMO_SENTINEL,
  encodeStructuredMemo,
  parseStructuredMemo,
  parseStructuredMemoText,
  structuredMemoToText,
  type StructuredMemoRef,
} from "./structured-memo";

const payslip: StructuredMemoRef = {
  docType: DocType.Payslip,
  refId: "PS-2026-06-ANA",
  sha256: "mock-ana-c2hhMjU2LWRpZ2VzdA",
  period: "202606",
  accountCode: "6001",
};

describe("memo estruturado (texto sentinela)", () => {
  it("codifica como memo de TEXTO com prefixo zacct: (sobrevive como Memo::Text)", () => {
    const bytes = encodeStructuredMemo(payslip);
    const decoded = decodeMemo(bytes);
    expect(decoded.kind).toBe("text");
    if (decoded.kind === "text") {
      expect(decoded.text.startsWith(MEMO_SENTINEL)).toBe(true);
    }
  });

  it("faz round-trip preservando os campos", () => {
    const parsed = parseStructuredMemo(encodeStructuredMemo(payslip));
    expect(parsed).toEqual(payslip);
  });

  it("aceita payload mínimo (só refId)", () => {
    const ref = { docType: DocType.Invoice, refId: "INV-1" };
    expect(parseStructuredMemo(encodeStructuredMemo(ref))).toEqual(ref);
  });

  it("parseia direto de string (caminho do gateway real, que entrega memo como texto)", () => {
    const text = structuredMemoToText(payslip);
    expect(parseStructuredMemoText(text)).toEqual(payslip);
  });

  it("devolve null para texto livre e prefixo ausente", () => {
    expect(parseStructuredMemo(encodeTextMemo("Coffee"))).toBeNull();
    expect(parseStructuredMemoText("Invoice #1042 — ACME")).toBeNull();
    expect(parseStructuredMemo(null)).toBeNull();
  });

  it("devolve null para JSON corrompido após o sentinela", () => {
    expect(
      parseStructuredMemo(encodeTextMemo(`${MEMO_SENTINEL}{not-json`)),
    ).toBeNull();
  });

  it("devolve null para docType inválido", () => {
    expect(
      parseStructuredMemo(encodeTextMemo(`${MEMO_SENTINEL}{"t":9,"r":"X"}`)),
    ).toBeNull();
  });

  it("rejeita refId acima do limite na escrita", () => {
    expect(() =>
      encodeStructuredMemo({ docType: DocType.Payslip, refId: "x".repeat(65) }),
    ).toThrow();
  });
});
