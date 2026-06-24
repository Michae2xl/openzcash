"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Inlined (not imported from the zod schema) to keep zod out of the client bundle.
const STATUSES = [
  "pending",
  "under_review",
  "approved",
  "rejected",
  "withdrawn",
  "cancelled",
  "filtered",
  "vetoed",
] as const;
const STATUS_LABEL: Record<string, string> = {
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
  filtered: "Filtered",
  under_review: "Under review",
  pending: "Pending",
  vetoed: "Vetoed",
};

async function api(method: string, body: unknown) {
  const res = await fetch("/api/zcg/proposals", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };
  if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
}

/** Per-row admin controls: change the verdict (locks the row) or delete it. */
export function ProposalAdminControls({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } catch {
      /* surfaced elsewhere; keep the row interactive */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <select
        value={status}
        disabled={busy}
        aria-label="Verdict"
        onChange={(e) =>
          run(() => api("PATCH", { id, status: e.target.value }))
        }
        className="cursor-pointer rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-800 outline-none ring-1 ring-inset ring-stone-300 transition focus:ring-amber-500/40 disabled:opacity-50"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s] ?? s}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy}
        aria-label="Delete proposal"
        onClick={() => {
          if (window.confirm("Delete this proposal?"))
            run(() => api("DELETE", { id }));
        }}
        className="rounded-md px-2 py-1 text-xs font-medium text-rose-600 ring-1 ring-inset ring-rose-500/25 transition hover:bg-rose-500/10 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
