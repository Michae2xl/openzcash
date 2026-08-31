import { disbTypeLabel } from "./format";

type RecipientEntryFields = {
  project: string | null;
  disbursementType: string;
  deliverable: string | null;
  forMonth: string | null;
  milestoneLabel: string | null;
};

export function recipientEntryPresentation(entry: RecipientEntryFields): {
  label: string;
  detail: string | null;
  isGrant: boolean;
} {
  const project = entry.project?.trim() || null;
  return {
    label:
      project ??
      (entry.disbursementType === "monthly"
        ? "Committee stipend"
        : disbTypeLabel(entry.disbursementType)),
    detail:
      entry.deliverable?.trim() ||
      entry.forMonth?.trim() ||
      entry.milestoneLabel?.trim() ||
      null,
    isGrant: project !== null,
  };
}
