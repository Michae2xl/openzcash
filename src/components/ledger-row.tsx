import {
  CLASS_LABELS,
  type LedgerEntry,
} from "@/lib/accounting/reconciliation";
import { formatRelativeDate } from "@/lib/format";
import { formatFiat, zatoshisToFiat } from "@/lib/pricing/price-oracle";
import { formatZec } from "@/lib/zcash/units";
import { cn } from "@/lib/utils";
import { IconAlert, IconArrowDown, IconArrowUp, IconShield } from "./icons";
import { ReclassifyControl } from "./reclassify-control";
import { StatusPill } from "./ui";

function entryTitle(e: LedgerEntry): string {
  switch (e.classification) {
    case "paycheck":
      return `Paycheck · ${e.counterparty ?? "n/a"}`;
    case "vendor_payment":
      return `Vendor · ${e.counterparty ?? "n/a"}`;
    case "income":
      return e.counterparty ?? "Inflow";
    case "orphan_in":
      return "Unidentified inflow";
    case "orphan_out":
      return "Unidentified payment";
    case "pending_paycheck":
      return `Pending paycheck · ${e.counterparty ?? "n/a"}`;
    case "external_payment":
      return e.counterparty
        ? `Payment → ${e.counterparty.slice(0, 18)}…`
        : "Payment to a third party";
    case "passthrough":
      return "Pass-through (forwarded)";
    case "internal_out":
      return `↦ Internal transfer · ${e.counterparty ?? "another treasury"}`;
    case "internal_in":
      return `↤ Internal transfer · ${e.counterparty ?? "another treasury"}`;
    case "internal_out_unconfirmed":
      return "Internal transfer? (destination not observed)";
    case "mixed_transfer":
      return "Mixed transaction (internal + external)";
    case "shielded_out":
      return "↗ Sent to the shielded pool (Sapling/Orchard)";
    case "grant_received":
      return `Grant received${e.counterparty ? ` · ${e.counterparty}` : ""}`;
    case "bounty_received":
      return `Bounty received${e.counterparty ? ` · ${e.counterparty}` : ""}`;
    case "grant_paid":
      return `Grant paid${e.counterparty ? ` → ${e.counterparty}` : ""}`;
    case "bounty_paid":
      return `Bounty paid${e.counterparty ? ` → ${e.counterparty}` : ""}`;
    case "viewkey_payout":
      return `Payment to project${e.counterparty ? ` → ${e.counterparty}` : ""}`;
  }
}

function entrySubtitle(e: LedgerEntry): string | null {
  if (e.structured) {
    const parts = [e.structured.refId];
    if (e.structured.period) parts.push(`period ${e.structured.period}`);
    if (e.structured.accountCode)
      parts.push(`account ${e.structured.accountCode}`);
    return parts.join(" · ");
  }
  if (e.memo?.kind === "text") return e.memo.text;
  return e.note;
}

export function LedgerRow({
  entry,
  showStatus = true,
  editable = false,
}: {
  entry: LedgerEntry;
  showStatus?: boolean;
  editable?: boolean;
}) {
  const isPending = entry.classification === "pending_paycheck";
  const isPassthrough = entry.classification === "passthrough";
  const isInternal =
    entry.classification === "internal_in" ||
    entry.classification === "internal_out";
  const isInternalUnconfirmed =
    entry.classification === "internal_out_unconfirmed" ||
    entry.classification === "mixed_transfer";
  const isIn = entry.netZat > 0n;
  const Icon =
    isPending || isInternalUnconfirmed
      ? IconAlert
      : isPassthrough
        ? IconArrowUp
        : isIn
          ? IconArrowDown
          : IconArrowUp;
  const iconTone = isPending
    ? "bg-amber-500/10 text-amber-700"
    : isInternalUnconfirmed
      ? "bg-amber-500/10 text-amber-700"
      : isPassthrough || isInternal
        ? "bg-sky-500/10 text-sky-600"
        : isIn
          ? "bg-emerald-500/10 text-emerald-600"
          : "bg-rose-500/10 text-rose-600";
  const shielded = entry.pool !== null && entry.pool !== "transparent";
  const subtitle = entrySubtitle(entry);

  return (
    <div className="flex items-center gap-4 py-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          iconTone,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-stone-900">
            {entryTitle(entry)}
          </p>
          {shielded ? (
            <IconShield className="h-3.5 w-3.5 shrink-0 text-amber-700/70" />
          ) : null}
        </div>
        {subtitle ? (
          <p className="truncate text-xs text-stone-500">{subtitle}</p>
        ) : (
          <p className="text-xs text-stone-400">
            {CLASS_LABELS[entry.classification]}
          </p>
        )}
      </div>

      <div className="shrink-0 text-right">
        {isPending ? (
          <p className="text-sm font-medium text-stone-500">awaiting</p>
        ) : isPassthrough ? (
          <>
            <p className="tnum text-sm font-semibold text-sky-600">
              {formatZec(entry.grossZat ?? 0n)}
            </p>
            <p className="text-xs text-stone-500">passed through</p>
          </>
        ) : isInternal || isInternalUnconfirmed ? (
          <>
            <p
              className={cn(
                "text-sm font-semibold tnum",
                isInternalUnconfirmed ? "text-amber-700" : "text-sky-600",
              )}
            >
              {formatZec(entry.netZat, { sign: true })}
            </p>
            <p className="text-xs text-stone-500">between treasuries</p>
          </>
        ) : (
          <>
            <p
              className={cn(
                "text-sm font-semibold tnum",
                isIn ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {formatZec(entry.netZat, { sign: true })}
            </p>
            <p className="text-xs text-stone-500 tnum">
              {formatFiat(zatoshisToFiat(entry.netZat, "USD"), "USD")}
            </p>
          </>
        )}
      </div>

      <div className="hidden w-24 shrink-0 text-right text-xs text-stone-500 sm:block">
        {entry.blockTime ? formatRelativeDate(entry.blockTime) : "n/a"}
      </div>

      {showStatus ? (
        <div className="hidden w-28 shrink-0 text-right md:block">
          <StatusPill status={entry.reconStatus} />
        </div>
      ) : null}

      {editable && entry.txid && entry.treasuryId ? (
        <div className="hidden shrink-0 lg:block">
          <ReclassifyControl
            treasuryId={entry.treasuryId}
            txid={entry.txid}
            overridden={entry.note === "Manually reclassified by admin."}
          />
        </div>
      ) : null}
    </div>
  );
}
