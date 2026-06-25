"use client";

// Flat app grid (no fan) — all apps side by side, with an Admin section.
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconBalance,
  IconCheck,
  IconClose,
  IconCoins,
  IconGrant,
  IconKey,
  IconMail,
  IconNews,
  IconPencil,
  IconReceipt,
  IconShield,
  IconSigma,
  IconSwap,
  IconUsers,
  IconVote,
} from "./icons";
import { cn } from "@/lib/utils";

type IconType = (p: { className?: string }) => React.ReactNode;

type AppDef = {
  id: string;
  label: string;
  sub: string;
  href: string;
  Icon: IconType;
  grad: string;
  /** Admin-only app (data management); shown only to a signed-in admin. */
  admin?: boolean;
};

// All gold/stone — the brand reserves color for genuine status/flows only.
const GRAD: Record<string, string> = {
  amber: "from-amber-400 to-amber-600",
  sky: "from-amber-300 to-amber-500",
  emerald: "from-amber-500 to-amber-700",
  violet: "from-amber-400 to-orange-500",
  rose: "from-amber-500 to-orange-600",
  zinc: "from-stone-400 to-stone-600",
};

const APPS: AppDef[] = [
  {
    id: "lockbox",
    label: "Lockbox",
    sub: "Live funding",
    href: "/lockbox",
    Icon: IconShield,
    grad: GRAD.amber,
  },
  {
    id: "tesouros",
    label: "Treasuries",
    sub: "Viewing keys",
    href: "/viewing-keys",
    Icon: IconKey,
    grad: GRAD.violet,
    admin: true,
  },
  {
    id: "projetos",
    label: "Projects",
    sub: "Recipients",
    href: "/projects",
    Icon: IconCheck,
    grad: GRAD.emerald,
    admin: true,
  },
  {
    id: "convites",
    label: "Invites",
    sub: "Onboarding",
    href: "/invites",
    Icon: IconMail,
    grad: GRAD.rose,
    admin: true,
  },
  {
    id: "zcg",
    label: "ZCG",
    sub: "Dev Fund",
    href: "/zcg",
    Icon: IconCoins,
    grad: GRAD.amber,
  },
  {
    id: "grants",
    label: "Grants",
    sub: "Approved projects",
    href: "/zcg/grants",
    Icon: IconGrant,
    grad: GRAD.amber,
  },
  {
    id: "disbursements",
    label: "Disbursements",
    sub: "Off-chain ledger",
    href: "/zcg/disbursements",
    Icon: IconReceipt,
    grad: GRAD.sky,
  },
  {
    id: "recipients",
    label: "Recipients",
    sub: "$22M ranking",
    href: "/zcg/recipients",
    Icon: IconUsers,
    grad: GRAD.emerald,
  },
  {
    id: "proposals",
    label: "Proposals",
    sub: "Pipeline",
    href: "/zcg/proposals",
    Icon: IconVote,
    grad: GRAD.violet,
  },
  {
    id: "totals",
    label: "Totals",
    sub: "Integrity check",
    href: "/zcg/totals",
    Icon: IconSigma,
    grad: GRAD.amber,
  },
  {
    id: "meetings",
    label: "Meetings",
    sub: "Governance feed",
    href: "/zcg/meetings",
    Icon: IconNews,
    grad: GRAD.violet,
  },
  {
    id: "fpf",
    label: "FPF",
    sub: "Coinholder grants",
    href: "/zcg/fpf",
    Icon: IconBalance,
    grad: GRAD.violet,
  },
  {
    id: "coinholder",
    label: "Coinholder",
    sub: "Lockbox pool totals",
    href: "/zcg/coinholder",
    Icon: IconCoins,
    grad: GRAD.amber,
  },
  {
    id: "maya",
    label: "Maya",
    sub: "LP liquidity",
    href: "/zcg/maya",
    Icon: IconSwap,
    grad: GRAD.emerald,
  },
];

const STORAGE_KEY = "zbo-launcher-v1";
const APP_BY_ID = new Map(APPS.map((a) => [a.id, a]));
const PUBLIC_APPS = APPS.filter((a) => !a.admin);
const ADMIN_APPS = APPS.filter((a) => a.admin);

type State = { order: string[]; hidden: string[] };

function loadState(): State {
  const def = { order: PUBLIC_APPS.map((a) => a.id), hidden: [] as string[] };
  if (typeof window === "undefined") return def;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return def;
    const s = JSON.parse(raw) as State;
    const known = new Set(PUBLIC_APPS.map((a) => a.id));
    const order = s.order.filter((id) => known.has(id));
    const hidden = (s.hidden ?? []).filter((id) => known.has(id));
    for (const a of PUBLIC_APPS)
      if (!order.includes(a.id) && !hidden.includes(a.id)) order.push(a.id);
    return { order, hidden };
  } catch {
    return def;
  }
}

export function AppLauncher({ isAdmin = false }: { isAdmin?: boolean }) {
  const [state, setState] = useState<State>({
    order: PUBLIC_APPS.map((a) => a.id),
    hidden: [],
  });
  const [editing, setEditing] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Loads the saved layout from localStorage on mount (client-only — reading
    // it during render would break SSR hydration).
    /* eslint-disable react-hooks/set-state-in-effect */
    setState(loadState());
    setMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function persist(next: State) {
    setState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function hide(id: string) {
    persist({
      order: state.order.filter((x) => x !== id),
      hidden: [...state.hidden, id],
    });
  }
  function restore(id: string) {
    persist({
      order: [...state.order, id],
      hidden: state.hidden.filter((x) => x !== id),
    });
  }
  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const order = state.order.filter((x) => x !== dragId);
    const at = order.indexOf(targetId);
    order.splice(at, 0, dragId);
    persist({ ...state, order });
    setDragId(null);
  }

  const visible = state.order
    .map((id) => APP_BY_ID.get(id))
    .filter((a): a is AppDef => Boolean(a));
  const hiddenApps = state.hidden
    .map((id) => APP_BY_ID.get(id))
    .filter((a): a is AppDef => Boolean(a));

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <button
          onClick={() => setEditing((e) => !e)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ring-inset transition",
            editing
              ? "bg-amber-500/15 text-amber-700 shadow-amber-900/5 ring-amber-500/40"
              : "bg-white text-stone-600 shadow-stone-300/30 ring-stone-200 hover:text-stone-900 hover:ring-stone-300",
          )}
        >
          <IconPencil className="h-3.5 w-3.5" />
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {visible.map((app) => (
          <div
            key={app.id}
            draggable={editing}
            onDragStart={() => setDragId(app.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(app.id)}
            className={cn(
              "group relative flex flex-col items-center gap-2",
              editing && "cursor-grab active:cursor-grabbing",
              dragId === app.id && "opacity-40",
            )}
          >
            {editing ? (
              <button
                onClick={() => hide(app.id)}
                aria-label={`Hide ${app.label}`}
                className="absolute -left-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-stone-700 ring-1 ring-stone-300 hover:bg-rose-500/20 hover:text-rose-700"
              >
                <IconClose className="h-3 w-3" />
              </button>
            ) : null}
            <LauncherTile app={app} editing={editing} />
          </div>
        ))}
      </div>

      {mounted && editing && hiddenApps.length > 0 ? (
        <div className="mt-10 border-t border-stone-200 pt-6">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-wider text-stone-500">
            Hidden · tap to restore
          </p>
          <div className="flex flex-wrap gap-4">
            {hiddenApps.map((app) => (
              <button
                key={app.id}
                onClick={() => restore(app.id)}
                className="flex flex-col items-center gap-2 opacity-60 transition hover:opacity-100"
              >
                <span
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg ring-1 ring-stone-900/5",
                    app.grad,
                  )}
                >
                  <app.Icon className="h-6 w-6 text-white" />
                </span>
                <span className="text-xs text-stone-500">{app.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {isAdmin && ADMIN_APPS.length > 0 ? (
        <div className="mt-8 border-t border-stone-200 pt-6">
          <p className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-stone-500">
            <IconShield className="h-4 w-4 text-amber-600" /> Admin · data
            management
          </p>
          <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {ADMIN_APPS.map((app) => (
              <div
                key={app.id}
                className="group flex flex-col items-center gap-2"
              >
                <LauncherTile app={app} editing={false} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LauncherTile({ app, editing }: { app: AppDef; editing: boolean }) {
  const card = (
    <div
      className={cn(
        "w-full rounded-xl border border-stone-200 bg-white p-1.5 shadow-md shadow-stone-300/40 transition",
        editing
          ? "animate-pulse"
          : "group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-stone-400/30",
      )}
    >
      <div className="flex aspect-[5/4] items-center justify-center rounded-lg bg-[#efeae0]">
        <app.Icon className="h-7 w-7 text-stone-400 transition group-hover:text-amber-700" />
      </div>
      <p className="truncate whitespace-nowrap px-1 pb-1 pt-1.5 text-center text-sm font-bold text-stone-900 sm:text-base md:text-[17px]">
        {app.label}
      </p>
    </div>
  );
  if (editing) return card;
  return (
    <Link href={app.href} aria-label={app.label} className="block w-full">
      {card}
    </Link>
  );
}
