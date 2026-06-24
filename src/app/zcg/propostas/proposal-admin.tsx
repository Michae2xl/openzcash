"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

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

const EMPTY = {
  program: "zcg",
  title: "",
  status: "pending",
  applicant: "",
  requestedUsd: "",
  platformLink: "",
};

/** Admin form to author a new proposal (origin='admin'). */
export function NewProposalForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({ ...EMPTY });

  function upd(k: keyof typeof EMPTY, v: string) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api("POST", {
        program: f.program,
        title: f.title,
        status: f.status,
        applicantsRaw: f.applicant || null,
        requestedUsd: f.requestedUsd ? Number(f.requestedUsd) : null,
        platformLink: f.platformLink || null,
      });
      setF({ ...EMPTY });
      setOpen(false);
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-amber-500/90 px-3.5 py-2 text-sm font-medium text-stone-900 shadow-sm shadow-amber-900/20 transition hover:bg-amber-400"
      >
        + New proposal
      </button>
    );
  }

  const input =
    "w-full rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/30";

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.05] to-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-900">New proposal</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-stone-500 hover:text-stone-800"
        >
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="col-span-2 text-xs text-stone-500 sm:col-span-2">
          Title
          <input
            required
            value={f.title}
            onChange={(e) => upd("title", e.target.value)}
            className={cn(input, "mt-1")}
            placeholder="Proposal title"
          />
        </label>
        <label className="text-xs text-stone-500">
          Program
          <select
            value={f.program}
            onChange={(e) => upd("program", e.target.value)}
            className={cn(input, "mt-1 cursor-pointer")}
          >
            <option value="zcg">ZCG</option>
            <option value="coinholder">Coinholder</option>
          </select>
        </label>
        <label className="text-xs text-stone-500">
          Verdict
          <select
            value={f.status}
            onChange={(e) => upd("status", e.target.value)}
            className={cn(input, "mt-1 cursor-pointer")}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 text-xs text-stone-500">
          Applicant
          <input
            value={f.applicant}
            onChange={(e) => upd("applicant", e.target.value)}
            className={cn(input, "mt-1")}
            placeholder="Org or individual"
          />
        </label>
        <label className="text-xs text-stone-500">
          Requested USD
          <input
            type="number"
            min="0"
            value={f.requestedUsd}
            onChange={(e) => upd("requestedUsd", e.target.value)}
            className={cn(input, "mt-1")}
            placeholder="e.g. 25000"
          />
        </label>
        <label className="text-xs text-stone-500">
          Link
          <input
            value={f.platformLink}
            onChange={(e) => upd("platformLink", e.target.value)}
            className={cn(input, "mt-1")}
            placeholder="https://…"
          />
        </label>
      </div>
      {err ? <p className="mt-2 text-xs text-rose-600">{err}</p> : null}
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Create proposal"}
        </button>
      </div>
    </form>
  );
}
