import { z } from "zod";

/** Validação compartilhada (form ↔ API) da escrita admin de governança ZCG. */

const url = z.string().trim().url().max(600);
const dateStr = z.string().trim().max(40).nullable().optional();

// ── Meetings ──
export const meetingCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  meetingDate: z.string().trim().min(1).max(40),
  url,
});
export const meetingPatchSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  meetingDate: z.string().trim().min(1).max(40).optional(),
  url: url.optional(),
});
export const meetingDeleteSchema = z.object({ id: z.string().min(1) });

// ── Elections ──
export const ELECTION_STATUSES = ["voting", "closed"] as const;
const electionFields = {
  title: z.string().trim().min(1).max(200),
  status: z.enum(ELECTION_STATUSES),
  seats: z.number().int().min(1).max(50),
  url,
  nominationsClose: dateStr,
  communityCall: dateStr,
  votingCloses: dateStr,
  resultsBy: dateStr,
  elected: z.array(z.string().trim().max(120)).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
  sortOrder: z.number().int().optional(),
};
export const electionCreateSchema = z.object(electionFields);
export const electionPatchSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(ELECTION_STATUSES).optional(),
  seats: z.number().int().min(1).max(50).optional(),
  url: url.optional(),
  nominationsClose: dateStr,
  communityCall: dateStr,
  votingCloses: dateStr,
  resultsBy: dateStr,
  elected: z.array(z.string().trim().max(120)).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
  sortOrder: z.number().int().optional(),
});
export const electionDeleteSchema = z.object({ id: z.string().min(1) });

// ── Links (fixed keys: edit only) ──
export const linkPatchSchema = z.object({
  key: z.string().min(1).max(60),
  label: z.string().trim().min(1).max(120).optional(),
  url,
});
