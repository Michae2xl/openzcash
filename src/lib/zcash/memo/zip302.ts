/**
 * Decodificação do campo de memo encriptado do Zcash conforme ZIP-302.
 *
 * O memo tem SEMPRE 512 bytes e só existe em outputs *shielded*
 * (Sapling/Orchard) — outputs transparentes não têm memo.
 *
 * Interpretação do primeiro byte (ZIP-302):
 *   0x00–0xF4  → texto UTF-8 (o memo inteiro é texto; zeros à direita são padding)
 *   0xF5       → reservado
 *   0xF6 + 0…  → "sem memo" (byte 0xF6 seguido só de zeros)
 *   0xF7–0xFE  → reservado para uso futuro (não exibir como texto)
 *   0xFF       → dados privados/arbitrários machine-readable (nosso payload estruturado)
 *
 * Referência: https://zips.z.cash/zip-0302
 */

export const MEMO_SIZE = 512;

export const MEMO_EMPTY_TAG = 0xf6;
export const MEMO_ARBITRARY_TAG = 0xff;
export const MEMO_TEXT_MAX_TAG = 0xf4;

export type DecodedMemo =
  | { readonly kind: "empty" }
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "arbitrary"; readonly bytes: Uint8Array }
  | { readonly kind: "reserved"; readonly firstByte: number };

function isAllZero(bytes: Uint8Array, from = 0): boolean {
  for (let i = from; i < bytes.length; i++) {
    if (bytes[i] !== 0) return false;
  }
  return true;
}

/** Índice do fim do conteúdo significativo (descarta zeros de padding à direita). */
export function contentEnd(bytes: Uint8Array, from = 0): number {
  let end = bytes.length;
  while (end > from && bytes[end - 1] === 0) end--;
  return end;
}

/**
 * Decodifica um memo bruto (até 512 bytes) na sua interpretação ZIP-302.
 * O parsing do payload de aplicação (prefixo 0xFF) é feito em structured-memo.ts.
 */
export function decodeMemo(memo: Uint8Array | null): DecodedMemo {
  if (memo === null || memo.length === 0) return { kind: "empty" };

  const first = memo[0];

  if (first === MEMO_EMPTY_TAG && isAllZero(memo, 1)) {
    return { kind: "empty" };
  }

  if (first <= MEMO_TEXT_MAX_TAG) {
    const end = contentEnd(memo);
    const text = new TextDecoder("utf-8", { fatal: false }).decode(
      memo.subarray(0, end),
    );
    return { kind: "text", text };
  }

  if (first === MEMO_ARBITRARY_TAG) {
    const end = contentEnd(memo);
    return { kind: "arbitrary", bytes: memo.subarray(0, end) };
  }

  return { kind: "reserved", firstByte: first };
}

/** Codifica um memo de texto UTF-8 em 512 bytes (com padding de zeros). */
export function encodeTextMemo(text: string): Uint8Array {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > MEMO_SIZE) {
    throw new Error(`Texto excede ${MEMO_SIZE} bytes (${bytes.length}).`);
  }
  if (bytes.length > 0 && bytes[0] > MEMO_TEXT_MAX_TAG) {
    // Improvável em texto humano, mas garante interpretação como texto.
    throw new Error(
      "Primeiro byte do texto colide com tag reservada do ZIP-302.",
    );
  }
  const out = new Uint8Array(MEMO_SIZE);
  out.set(bytes, 0);
  return out;
}

/** Memo vazio canônico (0xF6 + zeros). */
export function emptyMemo(): Uint8Array {
  const out = new Uint8Array(MEMO_SIZE);
  out[0] = MEMO_EMPTY_TAG;
  return out;
}
