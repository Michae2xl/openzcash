"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const SHEETS: { v: string; l: string }[] = [
  { v: "grants_disbursed", l: "Grant" },
  { v: "ic_payments", l: "Contractor" },
  { v: "coinholder_grants", l: "Coinholder grant" },
  { v: "discretionary", l: "Discretionary" },
  { v: "monthly", l: "Monthly" },
];
const STATUSES = [
  "",
  "completed",
  "open",
  "cancelled",
  "keyholder_veto",
  "funds_returned",
] as const;
const STATUS_LABEL: Record<string, string> = {
  "": "(none)",
  completed: "Completed",
  open: "Open",
  cancelled: "Cancelled",
  keyholder_veto: "Keyholder veto",
  funds_returned: "Funds returned",
};

/** Editable shape carried from the server row into the form. */
export type DisbEdit = {
  recipientNameRaw: string;
  sourceSheet: string;
  project: string;
  category: string;
  milestoneLabel: string;
  grantStatus: string;
  amountUsd: string;
  usdDisbursed: string;
  zecDisbursed: string;
  paidOutDate: string;
  isPaid: boolean;
};

export const EMPTY_DISB: DisbEdit = {
  recipientNameRaw: "",
  sourceSheet: "grants_disbursed",
  project: "",
  category: "",
  milestoneLabel: "",
  grantStatus: "",
  amountUsd: "",
  usdDisbursed: "",
  zecDisbursed: "",
  paidOutDate: "",
  isPaid: false,
};

async function api(method: string, body: unknown) {
  const res = await fetch("/api/zcg/disbursements", {
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

function num(s: string): number | null {
  return s.trim() === "" ? null : Number(s);
}

const INPUT =
  "w-full rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/30";

function DisbModal({
  title,
  mode,
  id,
  initial,
  onClose,
}: {
  title: string;
  mode: "create" | "edit";
  id?: string;
  initial: DisbEdit;
  onClose: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState<DisbEdit>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function upd<K extends keyof DisbEdit>(k: K, v: DisbEdit[K]) {
    setF((p) => ({ ...p, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const payload = {
      recipientNameRaw: f.recipientNameRaw,
      project: f.project || null,
      category: f.category || null,
      milestoneLabel: f.milestoneLabel || null,
      grantStatus: f.grantStatus || null,
      amountUsd: num(f.amountUsd),
      usdDisbursed: num(f.usdDisbursed),
      zecDisbursed: num(f.zecDisbursed),
      paidOutDate: f.paidOutDate || null,
      isPaid: f.isPaid,
    };
    try {
      if (mode === "create")
        await api("POST", { ...payload, sourceSheet: f.sourceSheet });
      else await api("PATCH", { ...payload, id });
      onClose();
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 p-5 shadow-xl ring-1 ring-stone-900/5"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-stone-900">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-stone-500 hover:text-stone-800"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 text-xs text-stone-500">
            Recipient
            <input
              required
              value={f.recipientNameRaw}
              onChange={(e) => upd("recipientNameRaw", e.target.value)}
              className={cn(INPUT, "mt-1")}
              placeholder="Org or individual"
            />
          </label>
          {mode === "create" ? (
            <label className="text-xs text-stone-500">
              Kind
              <select
                value={f.sourceSheet}
                onChange={(e) => upd("sourceSheet", e.target.value)}
                className={cn(INPUT, "mt-1 cursor-pointer")}
              >
                {SHEETS.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.l}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="text-xs text-stone-500">
            Status
            <select
              value={f.grantStatus}
              onChange={(e) => upd("grantStatus", e.target.value)}
              className={cn(INPUT, "mt-1 cursor-pointer")}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s] ?? s}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 text-xs text-stone-500">
            Grant / project
            <input
              value={f.project}
              onChange={(e) => upd("project", e.target.value)}
              className={cn(INPUT, "mt-1")}
              placeholder="Grant name (groups milestones)"
            />
          </label>
          <label className="text-xs text-stone-500">
            Category
            <input
              value={f.category}
              onChange={(e) => upd("category", e.target.value)}
              className={cn(INPUT, "mt-1")}
              placeholder="e.g. Infrastructure"
            />
          </label>
          <label className="text-xs text-stone-500">
            Milestone
            <input
              value={f.milestoneLabel}
              onChange={(e) => upd("milestoneLabel", e.target.value)}
              className={cn(INPUT, "mt-1")}
              placeholder="e.g. m1"
            />
          </label>
          <label className="text-xs text-stone-500">
            Budgeted USD
            <input
              type="number"
              step="any"
              value={f.amountUsd}
              onChange={(e) => upd("amountUsd", e.target.value)}
              className={cn(INPUT, "mt-1")}
              placeholder="e.g. 25000"
            />
          </label>
          <label className="text-xs text-stone-500">
            USD disbursed
            <input
              type="number"
              step="any"
              value={f.usdDisbursed}
              onChange={(e) => upd("usdDisbursed", e.target.value)}
              className={cn(INPUT, "mt-1")}
            />
          </label>
          <label className="text-xs text-stone-500">
            ZEC disbursed
            <input
              type="number"
              step="any"
              value={f.zecDisbursed}
              onChange={(e) => upd("zecDisbursed", e.target.value)}
              className={cn(INPUT, "mt-1")}
              placeholder="negative = clawback"
            />
          </label>
          <label className="text-xs text-stone-500">
            Paid-out date
            <input
              value={f.paidOutDate}
              onChange={(e) => upd("paidOutDate", e.target.value)}
              className={cn(INPUT, "mt-1")}
              placeholder="YYYY-MM-DD"
            />
          </label>
          <label className="col-span-2 mt-1 flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={f.isPaid}
              onChange={(e) => upd("isPaid", e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 accent-amber-600"
            />
            Paid (counts as a settled milestone)
          </label>
        </div>

        {err ? <p className="mt-3 text-xs text-rose-600">{err}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-50"
          >
            {busy ? "Saving…" : mode === "create" ? "Create" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function NewDisbursementForm() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-medium text-stone-900 shadow-sm shadow-amber-900/20 transition hover:bg-amber-400"
      >
        + New disbursement
      </button>
      {open ? (
        <DisbModal
          title="New disbursement"
          mode="create"
          initial={EMPTY_DISB}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

export function DisbursementAdminControls({
  id,
  origin,
  edited,
  initial,
}: {
  id: string;
  origin: string;
  edited: boolean;
  initial: DisbEdit;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // A pristine sheet row can't be deleted (re-import would bring it back); only
  // admin rows delete, and edited sheet rows revert to the spreadsheet value.
  const canRemove = origin === "admin" || edited;
  const removeLabel = origin === "admin" ? "Delete" : "Revert";

  async function remove() {
    const msg =
      origin === "admin"
        ? "Delete this disbursement?"
        : "Revert this row to the spreadsheet value?";
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      await api("DELETE", { id });
      router.refresh();
    } catch {
      /* noop */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {edited ? (
        <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
          edited
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-800 ring-1 ring-inset ring-stone-300 transition hover:bg-stone-200"
      >
        Edit
      </button>
      {canRemove ? (
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          className="rounded-md px-2 py-1 text-xs font-medium text-rose-600 ring-1 ring-inset ring-rose-500/25 transition hover:bg-rose-500/10 disabled:opacity-50"
        >
          {removeLabel}
        </button>
      ) : null}
      {open ? (
        <DisbModal
          title="Edit disbursement"
          mode="edit"
          id={id}
          initial={initial}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
