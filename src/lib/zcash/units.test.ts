import { describe, expect, it } from "vitest";
import {
  ZATOSHIS_PER_ZEC,
  formatZec,
  zatoshisToZecString,
  zecToZatoshis,
} from "./units";

describe("zecToZatoshis", () => {
  it("converte inteiros e frações exatamente", () => {
    expect(zecToZatoshis("1")).toBe(ZATOSHIS_PER_ZEC);
    expect(zecToZatoshis("0.0176")).toBe(1_760_000n);
    expect(zecToZatoshis("8.8521")).toBe(885_210_000n);
  });

  it("aceita número e preserva sinal", () => {
    expect(zecToZatoshis(0.5)).toBe(50_000_000n);
    expect(zecToZatoshis("-2")).toBe(-200_000_000n);
  });

  it("rejeita mais de 8 casas decimais e entrada inválida", () => {
    expect(() => zecToZatoshis("0.000000001")).toThrow();
    expect(() => zecToZatoshis("abc")).toThrow();
  });
});

describe("zatoshisToZecString", () => {
  it("remove zeros à direita e preserva sinal", () => {
    expect(zatoshisToZecString(1_760_000n)).toBe("0.0176");
    expect(zatoshisToZecString(-1_760_000n)).toBe("-0.0176");
    expect(zatoshisToZecString(100_000_000n)).toBe("1");
    expect(zatoshisToZecString(0n)).toBe("0");
  });

  it("faz round-trip com zecToZatoshis", () => {
    for (const v of ["12.5", "9.2", "7.65", "0.00015", "3.1"]) {
      expect(zatoshisToZecString(zecToZatoshis(v))).toBe(v);
    }
  });
});

describe("formatZec", () => {
  it("formata com sinal e símbolo", () => {
    expect(formatZec(885_210_000n, { sign: true })).toBe("+8.8521 ZEC");
    expect(formatZec(-20_000_000n)).toBe("-0.2 ZEC");
    expect(formatZec(50_000_000n, { symbol: false })).toBe("0.5");
  });
});
