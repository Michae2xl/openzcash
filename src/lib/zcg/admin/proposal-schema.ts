import { z } from "zod";

/** Validação compartilhada (form ↔ API) da escrita admin de propostas ZCG/FPF. */

export const PROPOSAL_STATUSES = [
  "approved",
  "rejected",
  "withdrawn",
  "cancelled",
  "filtered",
  "pending",
  "under_review",
  "vetoed",
] as const;
export const PROPOSAL_PROGRAMS = ["zcg", "coinholder"] as const;

const optStr = z.string().trim().max(1000).nullable().optional();
const usdDollars = z
  .number()
  .nonnegative()
  .max(1_000_000_000)
  .nullable()
  .optional();

export const proposalCreateSchema = z.object({
  program: z.enum(PROPOSAL_PROGRAMS),
  title: z.string().trim().min(1).max(500),
  status: z.enum(PROPOSAL_STATUSES),
  applicantsRaw: optStr,
  requestedUsd: usdDollars,
  platformLink: optStr,
  forumLink: optStr,
  submittedDate: z.string().trim().max(40).nullable().optional(),
  country: z.string().trim().max(120).nullable().optional(),
});
export type ProposalCreate = z.infer<typeof proposalCreateSchema>;

export const proposalPatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(PROPOSAL_STATUSES).optional(),
  title: z.string().trim().min(1).max(500).optional(),
  applicantsRaw: optStr,
  requestedUsd: usdDollars,
  platformLink: optStr,
});
export type ProposalPatch = z.infer<typeof proposalPatchSchema>;

export const proposalDeleteSchema = z.object({ id: z.string().min(1) });
