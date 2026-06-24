"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const TYPES = [
  { v: "grants", l: "Grants" },
  { v: "folha", l: "Payroll" },
  { v: "distribuicao", l: "Distribution" },
  { v: "pessoal", l: "Personal" },
  { v: "outro", l: "Other" },
];

export function TreasuryTypeSelect({ id, type }: { id: string; type: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function change(treasuryType: string) {
    setBusy(true);
    await fetch("/api/treasuries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, treasuryType }),
    });
    router.refresh();
    setBusy(false);
  }

  return (
    <select
      value={type}
      disabled={busy}
      onChange={(e) => change(e.target.value)}
      aria-label="Treasury type"
      className="cursor-pointer rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-800 outline-none ring-1 ring-inset ring-stone-300 transition hover:ring-stone-300 focus:ring-amber-500/40 disabled:opacity-50"
    >
      {TYPES.map((t) => (
        <option key={t.v} value={t.v}>
          {t.l}
        </option>
      ))}
    </select>
  );
}
