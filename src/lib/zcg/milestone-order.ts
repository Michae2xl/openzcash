import { parseZcgDate } from "./normalize";

type RecipientMilestoneDate = {
  isPaid: boolean;
  paidOutDate: string | null;
  estimatedPayoutDate: string | null;
  paidOutRaw?: string | null;
};

const relevantDate = (row: RecipientMilestoneDate) =>
  (row.isPaid ? row.paidOutDate : row.estimatedPayoutDate) ??
  parseZcgDate(row.paidOutRaw);

/**
 * Recipient pages split paid and upcoming rows into separate tables. Sorting
 * once by each row's displayed date keeps both tables newest-first while
 * leaving missing dates at the bottom.
 */
export function sortRecipientMilestonesNewestFirst<
  T extends RecipientMilestoneDate,
>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    const aDate = relevantDate(a);
    const bDate = relevantDate(b);

    if (aDate === bDate) return 0;
    if (aDate === null) return 1;
    if (bDate === null) return -1;
    return bDate.localeCompare(aDate);
  });
}
