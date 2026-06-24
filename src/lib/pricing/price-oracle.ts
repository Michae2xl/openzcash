/**
 * Oracle de preço ZEC→fiat.
 *
 * Multi-fiat porque a empresa opera multi-país (folha plugável por jurisdição).
 * Na Fatia 1 os preços são MOCK e fixos. No real, congelaríamos um `price_snapshot`
 * (CoinGecko/CoinMarketCap) na data/timestamp do bloco e todo lançamento contábil
 * referenciaria esse snapshot — nunca recalculando on-the-fly.
 */

import { zatoshisToZecNumber } from "../zcash/units";

export type Fiat = "USD" | "BRL" | "EUR";

export const SUPPORTED_FIAT: readonly Fiat[] = ["USD", "BRL", "EUR"];

/** Preço mock de 1 ZEC em cada fiat (snapshot fictício). */
const MOCK_ZEC_PRICE: Record<Fiat, number> = {
  USD: 355.0,
  BRL: 1_950.0,
  EUR: 330.0,
};

const FIAT_LOCALE: Record<Fiat, string> = {
  USD: "en-US",
  BRL: "pt-BR",
  EUR: "de-DE",
};

export function zecUnitPrice(fiat: Fiat): number {
  return MOCK_ZEC_PRICE[fiat];
}

/** Converte zatoshis para o valor em fiat (para exibição/relatório). */
export function zatoshisToFiat(zat: bigint, fiat: Fiat): number {
  return zatoshisToZecNumber(zat) * MOCK_ZEC_PRICE[fiat];
}

export function formatFiat(value: number, fiat: Fiat): string {
  return new Intl.NumberFormat(FIAT_LOCALE[fiat], {
    style: "currency",
    currency: fiat,
  }).format(value);
}
