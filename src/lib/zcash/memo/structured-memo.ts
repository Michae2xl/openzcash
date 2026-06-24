/**
 * Payload estruturado da aplicação dentro do memo encriptado.
 *
 * Funciona como o campo "MEMO" de um cheque de papel, legível por máquina e só por
 * quem tem a viewing key. POLÍTICA DE PII: o memo NUNCA carrega dados pessoais nem
 * valores em claro — apenas uma REFERÊNCIA (`refId`) ao documento off-chain
 * (holerite/fatura) mais o `sha256` desse documento. Isso permite crypto-shredding
 * off-chain (GDPR), impossível com dados gravados on-chain.
 *
 * FORMATO: memo de TEXTO com prefixo sentinela `zacct:1:` seguido de JSON compacto.
 *
 *   zacct:1:{"t":1,"r":"PS-2026-06-ANA","h":"<sha256b64>","p":"202606","a":"6001"}
 *
 * Por que texto (e não o prefixo binário 0xFF / Memo::Arbitrary):
 *  - O ecossistema real (zkool/zallet, via `zcash_protocol::memo::Memo`) trata 0xFF
 *    como `Memo::Arbitrary` e os indexers só expõem `Memo::Text` (memo_text) — um
 *    memo binário 0xFF fica invisível na maioria das wallets/APIs. (Verificado no
 *    código do zkool2: `memosByTransaction` filtra `memo_text IS NOT NULL`.)
 *  - Como o conteúdo é só `refId + hash` (sem PII), texto é seguro e tem um bônus:
 *    o próprio funcionário lê o memo na carteira dele (entrega do holerite).
 *  - Continua machine-readable: o prefixo `zacct:` distingue do texto livre.
 */

import { z } from "zod";
import { decodeMemo, encodeTextMemo } from "./zip302";

export const SCHEMA_VERSION = 1;
export const MEMO_SENTINEL = `zacct:${SCHEMA_VERSION}:`;

export const DocType = {
  Payslip: 1,
  Invoice: 2,
  CategoryOnly: 3,
} as const;

export type DocTypeValue = (typeof DocType)[keyof typeof DocType];

export interface StructuredMemoRef {
  readonly docType: DocTypeValue;
  /** Referência ao documento off-chain (payslip_id, invoice_no…). */
  readonly refId: string;
  /** sha256 do documento off-chain, em base64url, para verificação de integridade. */
  readonly sha256?: string;
  /** Período de competência, YYYYMM. */
  readonly period?: string;
  /** Código da categoria contábil (mapeia para o chart of accounts). */
  readonly accountCode?: string;
}

const docTypeSchema = z
  .number()
  .int()
  .refine((n): n is DocTypeValue => n === 1 || n === 2 || n === 3, {
    message: "docType desconhecido",
  });

/** JSON compacto gravado após o sentinela. */
const wireSchema = z.object({
  t: docTypeSchema,
  r: z.string().min(1).max(64),
  h: z.string().max(64).optional(),
  p: z
    .string()
    .regex(/^\d{6}$/)
    .optional(),
  a: z.string().max(16).optional(),
});

export function structuredMemoToText(ref: StructuredMemoRef): string {
  const wire = {
    t: ref.docType,
    r: ref.refId,
    ...(ref.sha256 ? { h: ref.sha256 } : {}),
    ...(ref.period ? { p: ref.period } : {}),
    ...(ref.accountCode ? { a: ref.accountCode } : {}),
  };
  wireSchema.parse(wire); // fail-fast no boundary de escrita
  return MEMO_SENTINEL + JSON.stringify(wire);
}

export function encodeStructuredMemo(ref: StructuredMemoRef): Uint8Array {
  return encodeTextMemo(structuredMemoToText(ref));
}

/** Interpreta uma string de memo (texto já decifrado) como nosso payload estruturado. */
export function parseStructuredMemoText(
  text: string | null,
): StructuredMemoRef | null {
  if (!text || !text.startsWith(MEMO_SENTINEL)) return null;
  try {
    const json: unknown = JSON.parse(text.slice(MEMO_SENTINEL.length));
    const parsed = wireSchema.safeParse(json);
    if (!parsed.success) return null;
    return {
      docType: parsed.data.t,
      refId: parsed.data.r,
      sha256: parsed.data.h,
      period: parsed.data.p,
      accountCode: parsed.data.a,
    };
  } catch {
    return null;
  }
}

/** Interpreta um memo bruto (bytes) como nosso payload estruturado, ou null. */
export function parseStructuredMemo(
  memo: Uint8Array | null,
): StructuredMemoRef | null {
  const decoded = decodeMemo(memo);
  if (decoded.kind !== "text") return null;
  return parseStructuredMemoText(decoded.text);
}
