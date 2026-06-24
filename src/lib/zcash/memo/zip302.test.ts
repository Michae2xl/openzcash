import { describe, expect, it } from "vitest";
import { MEMO_SIZE, decodeMemo, emptyMemo, encodeTextMemo } from "./zip302";

describe("decodeMemo", () => {
  it("trata null e memo vazio canônico como empty", () => {
    expect(decodeMemo(null)).toEqual({ kind: "empty" });
    expect(decodeMemo(emptyMemo())).toEqual({ kind: "empty" });
    expect(decodeMemo(new Uint8Array(0))).toEqual({ kind: "empty" });
  });

  it("faz round-trip de texto e descarta padding de zeros", () => {
    const memo = encodeTextMemo("Invoice #1042 — ACME Corp");
    expect(memo.length).toBe(MEMO_SIZE);
    const decoded = decodeMemo(memo);
    expect(decoded).toEqual({
      kind: "text",
      text: "Invoice #1042 — ACME Corp",
    });
  });

  it("reconhece memo arbitrário (0xFF) como kind arbitrary", () => {
    const bytes = new Uint8Array(MEMO_SIZE);
    bytes[0] = 0xff;
    bytes[1] = 0x01;
    bytes.set(new TextEncoder().encode("x"), 2);
    const decoded = decodeMemo(bytes);
    expect(decoded.kind).toBe("arbitrary");
  });

  it("reconhece tags reservadas (0xF7) sem tratá-las como texto", () => {
    const bytes = new Uint8Array(MEMO_SIZE);
    bytes[0] = 0xf7;
    expect(decodeMemo(bytes)).toEqual({ kind: "reserved", firstByte: 0xf7 });
  });
});

describe("encodeTextMemo", () => {
  it("rejeita texto maior que 512 bytes", () => {
    expect(() => encodeTextMemo("a".repeat(513))).toThrow();
  });
});
