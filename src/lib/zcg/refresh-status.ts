type StatusResult = { status: string };
type SnapshotResult = { ok: boolean };

export type CoreRefreshResults = {
  disbursements: StatusResult[];
  snapshots: SnapshotResult[];
  proposals: StatusResult[];
  totals: StatusResult[];
};

const successful = (result: StatusResult) =>
  !result.status.startsWith("error");

/**
 * A refresh is fresh only when every official spreadsheet consumer completed.
 * Meeting-minute ingestion is intentionally excluded: the forum is a separate
 * public source and its outage must not redefine spreadsheet freshness.
 */
export function coreRefreshSucceeded(results: CoreRefreshResults): boolean {
  return (
    results.disbursements.length === 5 &&
    results.disbursements.every(successful) &&
    results.snapshots.length === 6 &&
    results.snapshots.every((result) => result.ok) &&
    results.proposals.length === 2 &&
    results.proposals.every(successful) &&
    results.totals.length === 2 &&
    results.totals.every(successful)
  );
}
