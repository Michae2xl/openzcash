import { z } from "zod";

/** Validação compartilhada (form ↔ API) da escrita admin de desembolsos ZCG. */

// Abas de origem (definem se conta como grant, contractor, etc.).
export const DISB_SHEETS = [
  "grants_disbursed",
  "ic_payments",
  "coinholder_grants",
  "discretionary",
  "monthly",
] as const;

const optStr = z.string().trim().max(500).nullable().optional();
// Valores podem ser NEGATIVOS (clawback / funds returned).
const money = z.number().finite().nullable().optional();

/** Campos editáveis comuns ao criar e ao corrigir. */
const editable = {
  recipientNameRaw: z.string().trim().max(300).optional(),
  project: optStr,
  category: optStr,
  milestoneLabel: optStr,
  disbursementType: z.string().trim().max(80).optional(),
  grantStatus: optStr,
  /** Dólares (convertidos para cents na API). */
  amountUsd: money,
  usdDisbursed: money,
  /** ZEC (convertido para zatoshis na API). */
  zecDisbursed: money,
  paidOutDate: z.string().trim().max(40).nullable().optional(),
  isPaid: z.boolean().optional(),
  isInternal: z.boolean().optional(),
};

export const disbursementCreateSchema = z.object({
  ...editable,
  recipientNameRaw: z.string().trim().min(1).max(300),
  sourceSheet: z.enum(DISB_SHEETS),
});
export type DisbursementCreate = z.infer<typeof disbursementCreateSchema>;

export const disbursementPatchSchema = z.object({
  ...editable,
  id: z.string().min(1),
  sourceSheet: z.enum(DISB_SHEETS).optional(),
  reason: z.string().trim().max(300).nullable().optional(),
});
export type DisbursementPatch = z.infer<typeof disbursementPatchSchema>;

export const disbursementDeleteSchema = z.object({ id: z.string().min(1) });
