"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InviteRow, InviteStatus } from "@/lib/onboarding/invites";
import { Badge } from "@/components/ui";

const STATUS_TONE: Record<InviteStatus, "emerald" | "rose" | "amber" | "zinc"> =
  {
    pending: "emerald",
    used: "zinc",
    revoked: "rose",
    expired: "zinc",
  };

const inputClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none ring-amber-500/30 placeholder:text-stone-400 focus:ring-2";

function linkFor(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/onboarding?token=${token}`;
}

export function InvitesAdmin({ invites }: { invites: readonly InviteRow[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [days, setDays] = useState("7");
  const [busy, setBusy] = useState(false);
  const [newLink, setNewLink] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setNewLink(null);
    try {
      const r = await fetch("/api/onboarding/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          label,
          expiresInDays: days ? Number(days) : undefined,
        }),
      });
      const j = await r.json();
      if (j.ok) {
        setNewLink(linkFor(j.token));
        setLabel("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function revoke(token: string) {
    await fetch("/api/onboarding/invites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "revoke", token }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 shadow-sm shadow-stone-300/40 ring-1 ring-inset ring-stone-900/5 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1">
            <span className="mb-1 block text-xs text-stone-500">
              Recipient (label)
            </span>
            <input
              className={inputClass}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. ZCG Treasury"
            />
          </label>
          <label className="w-28">
            <span className="mb-1 block text-xs text-stone-500">
              Expiration (days)
            </span>
            <input
              className={inputClass}
              value={days}
              onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={generate}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-900 shadow-sm shadow-amber-900/20 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {busy ? "Generating…" : "Generate link"}
          </button>
        </div>
        {newLink ? (
          <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-xs text-emerald-700">
              Link created: copy it and send it to the treasury owner.
            </p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-white px-2 py-1 font-mono text-xs text-stone-700">
                {newLink}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(newLink)}
                className="shrink-0 rounded bg-stone-100 px-2 py-1 text-xs text-stone-800 hover:bg-stone-200"
              >
                Copy
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 shadow-sm shadow-stone-300/40 ring-1 ring-inset ring-stone-900/5 p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-5 py-3 font-medium">Label</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Link</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {invites.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-4 text-center text-xs text-stone-400"
                >
                  No invites yet. Generate the first one above.
                </td>
              </tr>
            ) : (
              invites.map((inv) => (
                <tr key={inv.token} className="text-stone-700">
                  <td className="px-5 py-3 font-medium text-stone-900">
                    {inv.label}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[inv.status]}>{inv.status}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    {inv.status === "pending" ? (
                      <button
                        type="button"
                        onClick={() =>
                          navigator.clipboard?.writeText(linkFor(inv.token))
                        }
                        className="rounded bg-stone-100 px-2 py-1 text-xs text-stone-800 hover:bg-stone-200"
                      >
                        Copy link
                      </button>
                    ) : (
                      <span className="text-xs text-stone-400">·</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {inv.status === "pending" ? (
                      <button
                        type="button"
                        onClick={() => revoke(inv.token)}
                        className="text-xs text-rose-600 hover:text-rose-700"
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className="text-xs text-stone-400">
                        {inv.treasuryId ? `→ treasury ${inv.treasuryId}` : "·"}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
