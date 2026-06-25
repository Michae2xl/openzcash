"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { IconPencil } from "./icons";

/**
 * Admin controls for one treasury: rename, toggle public visibility, delete.
 * All routed through /api/treasuries (admin-gated by the middleware).
 */
export function TreasuryAdminControls({
  id,
  name,
  isPublic,
}: {
  id: string;
  name: string;
  isPublic: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    await fetch("/api/treasuries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    router.refresh();
    setBusy(false);
  }

  async function rename() {
    const next = val.trim();
    if (!next || next === name) {
      setEditing(false);
      return;
    }
    await patch({ name: next });
    setEditing(false);
  }

  async function remove() {
    const ok = window.confirm(
      `Delete treasury "${name}"? This removes its viewing key and all scanned transactions. This cannot be undone.`,
    );
    if (!ok) return;
    setBusy(true);
    await fetch("/api/treasuries", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-200 pt-3">
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") rename();
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
            className="w-40 rounded-md border border-stone-300 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-amber-500/30"
          />
          <button
            onClick={rename}
            disabled={busy}
            className="rounded-md bg-stone-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-1 text-xs text-stone-600"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setVal(name);
            setEditing(true);
          }}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700 ring-1 ring-inset ring-stone-200 transition hover:bg-stone-200/70 disabled:opacity-50"
        >
          <IconPencil className="h-3 w-3" /> Rename
        </button>
      )}

      <button
        onClick={() => patch({ isPublic: !isPublic })}
        disabled={busy}
        title={
          isPublic
            ? "Visible on the public community view"
            : "Hidden from the public view (admin only)"
        }
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition disabled:opacity-50",
          isPublic
            ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 hover:bg-emerald-500/20"
            : "bg-stone-100 text-stone-600 ring-stone-200 hover:bg-stone-200/70",
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            isPublic ? "bg-emerald-500" : "bg-stone-400",
          )}
        />
        {isPublic ? "Public" : "Private"}
      </button>

      <button
        onClick={remove}
        disabled={busy}
        className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-rose-600 ring-1 ring-inset ring-rose-500/25 transition hover:bg-rose-500/10 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
