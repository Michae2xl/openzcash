/**
 * Conversão e formatação de valores Zcash.
 *
 * Regra de ouro: cálculos financeiros usam SEMPRE `bigint` em zatoshis
 * (a menor unidade indivisível). `number`/float só aparece na borda de
 * exibição. Nunca somar dinheiro como float.
 */

export const ZATOSHIS_PER_ZEC = 100_000_000n;
const FRACTION_DIGITS = 8;

/**
 * Converte zatoshis em string decimal exata de ZEC, sem perder precisão.
 * Remove zeros à direita da parte fracionária. Preserva o sinal.
 */
export function zatoshisToZecString(zat: bigint): string {
  const negative = zat < 0n;
  const abs = negative ? -zat : zat;

  const whole = abs / ZATOSHIS_PER_ZEC;
  const fraction = abs % ZATOSHIS_PER_ZEC;

  const fractionStr = fraction
    .toString()
    .padStart(FRACTION_DIGITS, "0")
    .replace(/0+$/, "");

  const body = fractionStr ? `${whole}.${fractionStr}` : `${whole}`;
  return negative ? `-${body}` : body;
}

/** Formata para exibição: ex. "+8.8521 ZEC" / "-0.0176 ZEC". */
/** Adds thousands separators to the integer part of a decimal string. */
function groupThousands(s: string): string {
  const neg = s.startsWith("-");
  const body = neg ? s.slice(1) : s;
  const [int, frac] = body.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const out = frac ? `${grouped}.${frac}` : grouped;
  return neg ? `-${out}` : out;
}

export function formatZec(
  zat: bigint,
  opts: { sign?: boolean; symbol?: boolean } = {},
): string {
  const { sign = false, symbol = true } = opts;
  const value = groupThousands(zatoshisToZecString(zat));
  const prefixed = sign && zat > 0n ? `+${value}` : value;
  return symbol ? `${prefixed} ZEC` : prefixed;
}

/**
 * Formata de forma compacta para cards de resumo: abrevia milhares/milhões
 * (ex. "78.18K ZEC", "1.2M ZEC") e mantém a precisão normal abaixo de 1000.
 * O valor exato continua disponível no hero e nos cartões detalhados.
 */
export function formatZecCompact(
  zat: bigint,
  opts: { symbol?: boolean } = {},
): string {
  const { symbol = true } = opts;
  const zec = zatoshisToZecNumber(zat);
  const suffix = symbol ? " ZEC" : "";
  if (Math.abs(zec) >= 1000) {
    const compact = new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(zec);
    return `${compact}${suffix}`;
  }
  return formatZec(zat, { symbol });
}

/**
 * Converte zatoshis para `number` de ZEC. APENAS para alimentar conversão
 * de preço/exibição — perde precisão para valores enormes. Não use em ledger.
 */
export function zatoshisToZecNumber(zat: bigint): number {
  return Number(zat) / Number(ZATOSHIS_PER_ZEC);
}

/** Converte uma quantia em ZEC (string ou number) para zatoshis exatos. */
export function zecToZatoshis(zec: string | number): bigint {
  const str =
    typeof zec === "number" ? zec.toFixed(FRACTION_DIGITS) : zec.trim();
  if (!/^-?\d+(\.\d+)?$/.test(str)) {
    throw new Error(`Quantia de ZEC inválida: ${JSON.stringify(zec)}`);
  }
  const negative = str.startsWith("-");
  const [whole, fraction = ""] = str.replace("-", "").split(".");
  if (fraction.length > FRACTION_DIGITS) {
    throw new Error(
      `ZEC tem no máximo ${FRACTION_DIGITS} casas decimais: ${str}`,
    );
  }
  const padded = fraction.padEnd(FRACTION_DIGITS, "0");
  const zat = BigInt(whole) * ZATOSHIS_PER_ZEC + BigInt(padded);
  return negative ? -zat : zat;
}
