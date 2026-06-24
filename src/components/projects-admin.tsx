"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui";
import { sealUfvk } from "@/lib/onboarding/seal-client";

interface DerivedAddr {
  issuedMonth: string;
  address: string;
  diversifierIndex: number;
}
interface Project {
  id: string;
  projectName: string;
  paymentKind: string;
  ufvkFingerprint: string | null;
  addresses: DerivedAddr[];
}

const inputClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none ring-amber-500/30 placeholder:text-stone-400 focus:ring-2";

function thisMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function ProjectsAdmin({
  projects,
  publicKey,
}: {
  projects: readonly Project[];
  publicKey: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"grant" | "bounty">("grant");
  const [viewingKey, setViewingKey] = useState("");
  const [birthHeight, setBirthHeight] = useState("");
  const [months, setMonths] = useState("12");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cur = thisMonth();

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (!publicKey) throw new Error("Public key unavailable on the server.");
      const sealedUfvk = await sealUfvk(viewingKey.trim(), publicKey);
      const r = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          paymentKind: kind,
          sealedUfvk,
          birthHeight: birthHeight ? Number(birthHeight) : 0,
          months: months ? Number(months) : 12,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error ?? "Failed to register project.");
      setName("");
      setViewingKey("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="max-w-xl space-y-4 rounded-xl border border-stone-200 bg-white p-5">
        <p className="text-sm font-medium text-stone-800">Register project</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-stone-500">Name</span>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Zcash Brazil"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-stone-500">Category</span>
            <select
              className={inputClass}
              value={kind}
              onChange={(e) => setKind(e.target.value as "grant" | "bounty")}
            >
              <option value="grant">Grant</option>
              <option value="bounty">Bounty</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs text-stone-500">
            Project viewing key (uview1…/zxviews1…)
          </span>
          <textarea
            className={`${inputClass} h-20 resize-none font-mono`}
            value={viewingKey}
            onChange={(e) => setViewingKey(e.target.value)}
            placeholder="uview1…"
          />
          <span className="mt-1 block text-xs text-amber-700/80">
            🔒 encrypted in your browser (sealed-box) before sending.
          </span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-stone-500">
              Birthday height (optional)
            </span>
            <input
              className={inputClass}
              value={birthHeight}
              onChange={(e) =>
                setBirthHeight(e.target.value.replace(/\D/g, ""))
              }
              inputMode="numeric"
              placeholder="ex.: 2867500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-stone-500">
              Months to derive
            </span>
            <input
              className={inputClass}
              value={months}
              onChange={(e) => setMonths(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="w-full rounded-lg bg-amber-500/20 px-3 py-2.5 text-sm font-semibold text-amber-800 ring-1 ring-inset ring-amber-500/40 transition hover:bg-amber-500/30 disabled:opacity-50"
        >
          {busy ? "Deriving addresses…" : "Register and derive addresses"}
        </button>
        {error ? (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-500/20">
            {error}
          </p>
        ) : null}
      </div>

      {projects.map((p) => (
        <div
          key={p.id}
          className="rounded-xl border border-stone-200 bg-white p-5"
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-medium text-stone-900">
              {p.projectName}
            </span>
            <Badge tone={p.paymentKind === "bounty" ? "sky" : "emerald"}>
              {p.paymentKind}
            </Badge>
            <span className="text-xs text-stone-400">
              {p.addresses.length} addresses
            </span>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="py-2 font-medium">Month</th>
                <th className="py-2 font-medium">Address</th>
                <th className="py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {p.addresses.map((a) => (
                <tr
                  key={a.address}
                  className={a.issuedMonth === cur ? "bg-amber-500/5" : ""}
                >
                  <td className="py-2 text-stone-700 tnum">
                    {a.issuedMonth}
                    {a.issuedMonth === cur ? (
                      <span className="ml-2 text-xs text-amber-700">
                        current
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 font-mono text-xs text-stone-500">
                    {a.address.slice(0, 24)}…{a.address.slice(-8)}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(a.address)}
                      className="rounded bg-stone-100 px-2 py-1 text-xs text-stone-800 hover:bg-stone-200"
                    >
                      Copy
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
