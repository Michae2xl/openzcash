"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CLASSES = [
  { v: "grant_received", l: "Grant received" },
  { v: "bounty_received", l: "Bounty received" },
  { v: "grant_paid", l: "Grant paid" },
  { v: "bounty_paid", l: "Bounty paid" },
  { v: "viewkey_payout", l: "Payment to project" },
  { v: "income", l: "Inflow" },
  { v: "external_payment", l: "Payment to a third party" },
];

export function ReclassifyControl({
  treasuryId,
  txid,
  overridden,
}: {
  treasuryId: string;
  txid: string;
  overridden?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function apply(classification: string) {
    if (!classification) return;
    setBusy(true);
    if (classification === "__clear") {
      await fetch("/api/overrides", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ treasuryId, txid }),
      });
    } else {
      await fetch("/api/overrides", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          treasuryId,
          txid,
          classification,
          reason: "manual reclassification",
        }),
      });
    }
    router.refresh();
    setBusy(false);
  }

  return (
    <select
      defaultValue=""
      disabled={busy}
      onChange={(e) => apply(e.target.value)}
      aria-label="Reclassify transaction"
      title="Reclassify"
      className="cursor-pointer rounded bg-stone-100 px-1.5 py-1 text-xs text-stone-500 outline-none ring-1 ring-inset ring-stone-200 hover:text-stone-800 focus:ring-amber-500/40 disabled:opacity-50"
    >
      <option value="">⋯</option>
      {CLASSES.map((c) => (
        <option key={c.v} value={c.v}>
          {c.l}
        </option>
      ))}
      {overridden ? <option value="__clear">↺ back to automatic</option> : null}
    </select>
  );
}
