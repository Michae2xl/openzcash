/** Formata centavos de USD (bigint) para exibição. */
export function formatUsdCents(
  cents: bigint | number | null | undefined,
  opts: { compact?: boolean } = {},
): string {
  if (cents == null) return "—";
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
  completed: "Concluído",
  cancelled: "Cancelado",
  open: "Em aberto",
  keyholder_veto: "Veto",
  funds_returned: "Devolvido",
};

export function disbStatusLabel(status: string | null): string {
  if (!status) return "—";
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

const TYPE_LABELS: Record<string, string> = {
  grant_milestone: "Grant",
  ic_payment: "Contractor",
  coinholder_grant: "Coinholder",
  monthly: "Mensal",
  security_bounty: "Bounty (segurança)",
  bounty_match: "Match de bounty",
  sponsorship: "Patrocínio",
  tool_credit_service: "Crédito/serviço",
  reimbursement: "Reembolso",
  funds_returned: "Devolução",
  discretionary: "Discricionário",
};

export function disbTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}
