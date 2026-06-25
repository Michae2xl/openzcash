"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const STATUSES = ["voting", "closed"] as const;

async function api(path: string, method: string, body: unknown) {
  const res = await fetch(path, {
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

const INPUT =
  "w-full rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/30";
const GOLD_BTN =
  "rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-medium text-stone-900 shadow-sm shadow-amber-900/20 transition hover:bg-amber-400 disabled:opacity-50";
const PILL_EDIT =
  "rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-800 ring-1 ring-inset ring-stone-300 transition hover:bg-stone-200";
const PILL_DEL =
  "rounded-md px-2 py-1 text-xs font-medium text-rose-600 ring-1 ring-inset ring-rose-500/25 transition hover:bg-rose-500/10 disabled:opacity-50";

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 p-5 shadow-xl ring-1 ring-stone-900/5"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-stone-900">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-stone-600 hover:text-stone-800"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs text-stone-600">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

// ── Meetings ──
type MeetingForm = { title: string; meetingDate: string; url: string };
const EMPTY_MEETING: MeetingForm = { title: "", meetingDate: "", url: "" };

function MeetingModal({
  initial,
  id,
  onClose,
}: {
  initial: MeetingForm;
  id?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (id) await api("/api/zcg/meetings", "PATCH", { id, ...f });
      else await api("/api/zcg/meetings", "POST", f);
      onClose();
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={id ? "Edit meeting" : "New meeting"} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Title">
          <input
            required
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
            className={INPUT}
            placeholder="June 8, 2026"
          />
        </Field>
        <Field label="Date (YYYY-MM-DD)">
          <input
            required
            value={f.meetingDate}
            onChange={(e) => setF({ ...f, meetingDate: e.target.value })}
            className={INPUT}
            placeholder="2026-06-08"
          />
        </Field>
        <Field label="Forum URL">
          <input
            required
            value={f.url}
            onChange={(e) => setF({ ...f, url: e.target.value })}
            className={INPUT}
            placeholder="https://forum.zcashcommunity.com/…"
          />
        </Field>
        {err ? <p className="text-xs text-rose-600">{err}</p> : null}
        <div className="flex justify-end pt-1">
          <button type="submit" disabled={busy} className={GOLD_BTN}>
            {busy ? "Saving…" : id ? "Save" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function NewMeetingButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={GOLD_BTN}>
        + New meeting
      </button>
      {open ? (
        <MeetingModal initial={EMPTY_MEETING} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

export function MeetingControls({
  id,
  title,
  meetingDate,
  url,
}: {
  id: string;
  title: string;
  meetingDate: string;
  url: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  async function del() {
    if (!window.confirm("Delete this meeting?")) return;
    setBusy(true);
    try {
      await api("/api/zcg/meetings", "DELETE", { id });
      router.refresh();
    } catch {
      /* noop */
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={PILL_EDIT} onClick={() => setOpen(true)}>
        Edit
      </button>
      <button type="button" className={PILL_DEL} disabled={busy} onClick={del}>
        Delete
      </button>
      {open ? (
        <MeetingModal
          id={id}
          initial={{ title, meetingDate, url }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

// ── Elections ──
export type ElectionForm = {
  title: string;
  status: string;
  seats: string;
  url: string;
  nominationsClose: string;
  communityCall: string;
  votingCloses: string;
  resultsBy: string;
  elected: string;
  note: string;
};
export const EMPTY_ELECTION: ElectionForm = {
  title: "",
  status: "voting",
  seats: "2",
  url: "",
  nominationsClose: "",
  communityCall: "",
  votingCloses: "",
  resultsBy: "",
  elected: "",
  note: "",
};

function ElectionModal({
  initial,
  id,
  onClose,
}: {
  initial: ElectionForm;
  id?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  function upd<K extends keyof ElectionForm>(k: K, v: string) {
    setF((p) => ({ ...p, [k]: v }));
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const payload = {
      title: f.title,
      status: f.status,
      seats: Number(f.seats),
      url: f.url,
      nominationsClose: f.nominationsClose || null,
      communityCall: f.communityCall || null,
      votingCloses: f.votingCloses || null,
      resultsBy: f.resultsBy || null,
      elected: f.elected
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      note: f.note || null,
    };
    try {
      if (id) await api("/api/zcg/elections", "PATCH", { id, ...payload });
      else await api("/api/zcg/elections", "POST", payload);
      onClose();
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={id ? "Edit election" : "New election"} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Title">
          <input
            required
            value={f.title}
            onChange={(e) => upd("title", e.target.value)}
            className={INPUT}
            placeholder="June 2026 Election"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select
              value={f.status}
              onChange={(e) => upd("status", e.target.value)}
              className={cn(INPUT, "cursor-pointer")}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "voting" ? "Voting open" : "Closed"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Seats">
            <input
              type="number"
              min="1"
              value={f.seats}
              onChange={(e) => upd("seats", e.target.value)}
              className={INPUT}
            />
          </Field>
        </div>
        <Field label="URL">
          <input
            required
            value={f.url}
            onChange={(e) => upd("url", e.target.value)}
            className={INPUT}
            placeholder="https://…"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nominations close">
            <input
              value={f.nominationsClose}
              onChange={(e) => upd("nominationsClose", e.target.value)}
              className={INPUT}
              placeholder="YYYY-MM-DD"
            />
          </Field>
          <Field label="Community call">
            <input
              value={f.communityCall}
              onChange={(e) => upd("communityCall", e.target.value)}
              className={INPUT}
              placeholder="YYYY-MM-DD"
            />
          </Field>
          <Field label="Voting closes">
            <input
              value={f.votingCloses}
              onChange={(e) => upd("votingCloses", e.target.value)}
              className={INPUT}
              placeholder="YYYY-MM-DD"
            />
          </Field>
          <Field label="Results by">
            <input
              value={f.resultsBy}
              onChange={(e) => upd("resultsBy", e.target.value)}
              className={INPUT}
              placeholder="YYYY-MM-DD"
            />
          </Field>
        </div>
        <Field label="Elected (comma-separated, for closed elections)">
          <input
            value={f.elected}
            onChange={(e) => upd("elected", e.target.value)}
            className={INPUT}
            placeholder="Name A, Name B"
          />
        </Field>
        <Field label="Note">
          <textarea
            value={f.note}
            onChange={(e) => upd("note", e.target.value)}
            className={cn(INPUT, "min-h-[60px]")}
          />
        </Field>
        {err ? <p className="text-xs text-rose-600">{err}</p> : null}
        <div className="flex justify-end pt-1">
          <button type="submit" disabled={busy} className={GOLD_BTN}>
            {busy ? "Saving…" : id ? "Save" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function NewElectionButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={GOLD_BTN}>
        + New election
      </button>
      {open ? (
        <ElectionModal
          initial={EMPTY_ELECTION}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

export function ElectionControls({
  id,
  initial,
}: {
  id: string;
  initial: ElectionForm;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  async function del() {
    if (!window.confirm("Delete this election?")) return;
    setBusy(true);
    try {
      await api("/api/zcg/elections", "DELETE", { id });
      router.refresh();
    } catch {
      /* noop */
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={PILL_EDIT} onClick={() => setOpen(true)}>
        Edit
      </button>
      <button type="button" className={PILL_DEL} disabled={busy} onClick={del}>
        Delete
      </button>
      {open ? (
        <ElectionModal
          id={id}
          initial={initial}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

// ── Links ──
export function LinksAdmin({
  links,
}: {
  links: { key: string; label: string; url: string }[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Record<string, string>>(
    Object.fromEntries(links.map((l) => [l.key, l.url])),
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  async function save(l: { key: string; label: string }) {
    setBusyKey(l.key);
    try {
      await api("/api/zcg/links", "PATCH", {
        key: l.key,
        label: l.label,
        url: draft[l.key],
      });
      router.refresh();
    } catch {
      /* noop */
    } finally {
      setBusyKey(null);
    }
  }
  return (
    <div className="space-y-2">
      {links.map((l) => (
        <div key={l.key} className="flex items-center gap-2">
          <span className="w-40 shrink-0 truncate text-xs text-stone-600">
            {l.label}
          </span>
          <input
            value={draft[l.key] ?? ""}
            onChange={(e) => setDraft({ ...draft, [l.key]: e.target.value })}
            className={cn(INPUT, "flex-1 font-mono text-xs")}
          />
          <button
            type="button"
            disabled={busyKey === l.key || draft[l.key] === l.url}
            onClick={() => save(l)}
            className={cn(PILL_EDIT, "shrink-0")}
          >
            {busyKey === l.key ? "…" : "Save"}
          </button>
        </div>
      ))}
    </div>
  );
}
