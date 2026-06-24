/** Formata centavos de USD (bigint) para exibição. */
export function formatUsdCents(
  cents: bigint | number | null | undefined,
  opts: { compact?: boolean } = {},
): string {
  if (cents == null) return "·";
  const n = Number(cents) / 100;
  if (opts.compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);
}

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  cancelled: "Cancelled",
  open: "Open",
  keyholder_veto: "Keyholder veto",
  funds_returned: "Funds returned",
};

export function disbStatusLabel(status: string | null): string {
  if (!status) return "·";
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

const TYPE_LABELS: Record<string, string> = {
  grant_milestone: "Grant",
  ic_payment: "Contractor",
  coinholder_grant: "Coinholder",
  monthly: "Monthly",
  security_bounty: "Security bounty",
  bounty_match: "Bounty match",
  sponsorship: "Sponsorship",
  tool_credit_service: "Tool/service credit",
  reimbursement: "Reimbursement",
  funds_returned: "Funds returned",
  discretionary: "Discretionary",
};

export function disbTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}
