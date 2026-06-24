import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import {
  normalizeKey,
  parseMilestoneSeq,
  parseUsdCents,
  parseZcgDate,
  parseZecToZat,
} from "./normalize";

describe("parseCsv (RFC-4180)", () => {
  it("campos simples", () => {
    expect(parseCsv("a,b,c")).toEqual([["a", "b", "c"]]);
  });

  it("vírgula dentro de aspas não quebra o campo", () => {
    expect(parseCsv('"Zecwallet Code,Maintenance and Infra",ok')).toEqual([
      ["Zecwallet Code,Maintenance and Infra", "ok"],
    ]);
  });

  it('aspas escapadas ("")', () => {
    expect(parseCsv('"she said ""hi""",x')).toEqual([['she said "hi"', "x"]]);
  });

  it("CRLF e LF terminam linhas", () => {
    expect(parseCsv("a,b\r\nc,d\ne,f")).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e", "f"],
    ]);
  });

  it("quebra de linha embutida em aspas (título multilinha)", () => {
    expect(parseCsv('"Category \nas determined",ZCG')).toEqual([
      ["Category \nas determined", "ZCG"],
    ]);
  });

  it("célula com cifrão e espaços preservada", () => {
    expect(parseCsv('Total," $ 22,204,893 "')).toEqual([
      ["Total", " $ 22,204,893 "],
    ]);
  });
});

describe("parseUsdCents", () => {
  it("valor com $ e vírgula de milhar", () => {
    expect(parseUsdCents("$6,950.00")).toBe(695000n);
    expect(parseUsdCents("$58,000")).toBe(5800000n);
    expect(parseUsdCents("$410.99")).toBe(41099n);
    expect(parseUsdCents("$1,793,720.91")).toBe(179372091n);
    expect(parseUsdCents(" $ 5,755,468 ")).toBe(575546800n);
  });

  it("negativos por parênteses e prefixo", () => {
    expect(parseUsdCents("($249,867)")).toBe(-24986700n);
    expect(parseUsdCents("-$5,000")).toBe(-500000n);
  });

  it("dash e vazio", () => {
    expect(parseUsdCents(" $ -   ")).toBe(0n);
    expect(parseUsdCents("$ 0")).toBe(0n);
    expect(parseUsdCents("")).toBeNull();
    expect(parseUsdCents(null)).toBeNull();
  });
});

describe("parseZecToZat", () => {
  it("converte ZEC decimal para zatoshis exatos", () => {
    expect(parseZecToZat("80.7764831")).toBe(8077648310n);
    expect(parseZecToZat("100")).toBe(10_000_000_000n);
    expect(parseZecToZat("0.1")).toBe(10_000_000n);
    expect(parseZecToZat("490.12")).toBe(49_012_000_000n);
    expect(parseZecToZat("1,279,018.00")).toBe(127_901_800_000_000n);
  });

  it("preserva clawback negativo", () => {
    expect(parseZecToZat("-5")).toBe(-500_000_000n);
  });

  it("vazio → null", () => {
    expect(parseZecToZat("")).toBeNull();
    expect(parseZecToZat(null)).toBeNull();
  });
});

describe("parseZcgDate", () => {
  it("'DD Mon YYYY' (com leading space)", () => {
    expect(parseZcgDate("26 Jan 2021")).toBe("2021-01-26");
    expect(parseZcgDate(" 3 May 2024")).toBe("2024-05-03");
  });

  it("'Mon D, YYYY'", () => {
    expect(parseZcgDate("Feb 3, 2026")).toBe("2026-02-03");
    expect(parseZcgDate("November 25, 2025")).toBe("2025-11-25");
  });

  it("'M/D/YYYY' e 'M/D/YY'", () => {
    expect(parseZcgDate("1/6/2021")).toBe("2021-01-06");
    expect(parseZcgDate("2/3/26")).toBe("2026-02-03");
  });

  it("condição textual → null", () => {
    expect(parseZcgDate("2 months after merge")).toBeNull();
    expect(parseZcgDate("")).toBeNull();
  });
});

describe("normalizeKey & parseMilestoneSeq", () => {
  it("colapsa espaços e baixa caixa", () => {
    expect(normalizeKey("  Zcash   Brazil ")).toBe("zcash brazil");
  });
  it("extrai o número do milestone", () => {
    expect(parseMilestoneSeq("1")).toBe(1);
    expect(parseMilestoneSeq("Milestone 2")).toBe(2);
    expect(parseMilestoneSeq("NA")).toBeNull();
    expect(parseMilestoneSeq("")).toBeNull();
  });
});
