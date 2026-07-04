"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Animated terminal demo: types the question, "fetches", reveals the answer
 * line by line, then loops. Every line is a real, validated answer the skill
 * produced against the live APIs (adversarial validation, 2026-07-01).
 * Honors prefers-reduced-motion by rendering the full transcript statically.
 */

type Ev =
  | { kind: "cmd"; text: string }
  | { kind: "status"; text: string }
  | { kind: "line"; node: ReactNode }
  | { kind: "pause"; ms: number };

const USD = ({ v }: { v: string }) => (
  <span className="text-amber-300">{v}</span>
);

const EVENTS: Ev[] = [
  {
    kind: "cmd",
    text: "Find any grants having to do with tools for merchants to accept Zcash",
  },
  { kind: "pause", ms: 350 },
  {
    kind: "status",
    text: "Fetching the ledger, live pipeline, and GitHub applications...",
  },
  { kind: "pause", ms: 1000 },
  {
    kind: "line",
    node: (
      <p>
        <span className="font-semibold text-emerald-400">Funded:</span> Payment
        Gateway with BTCPay, <USD v="$120,000" /> paid (2022) · Elemental ZEC
        payment processor, <USD v="$51,144" /> (6/6 milestones) · CoinPayments,{" "}
        <USD v="$76,800" /> before cancellation
      </p>
    ),
  },
  {
    kind: "line",
    node: (
      <p>
        <span className="font-semibold text-sky-400">Under review now:</span>{" "}
        Rozo Merchant POS (#336), <USD v="$48,000" /> requested
      </p>
    ),
  },
  {
    kind: "line",
    node: (
      <p>
        <span className="font-semibold text-rose-400">Declined:</span> weave-zec
        ($48k), ZecPay ($44k), ZAPS ($120k)...
      </p>
    ),
  },
  {
    kind: "line",
    node: (
      <p className="text-[11px] text-stone-600">
        sources: openzcash.org/api/zcg/data/grants · /api/zcg/office · github
        #336
      </p>
    ),
  },
  { kind: "pause", ms: 1600 },
  { kind: "cmd", text: "Was Zenith Full-node Wallet 2026 funded?" },
  { kind: "pause", ms: 350 },
  { kind: "status", text: "Checking the live pipeline and the ledger..." },
  { kind: "pause", ms: 900 },
  {
    kind: "line",
    node: (
      <p>
        <span className="font-semibold text-rose-400">No.</span> It is under
        review right now (#334, <USD v="$122,600" /> requested). It is not the
        completed 2024 Zenith Full Node Wallet grant (<USD v="$124,800" />{" "}
        paid). Same name, different application.
      </p>
    ),
  },
  {
    kind: "line",
    node: (
      <p className="text-[11px] text-stone-600">
        sources: /api/zcg/office · github #334 · /api/zcg/data/grants
      </p>
    ),
  },
];

const TYPE_MS = 26; // per character
const LINE_MS = 360; // per revealed answer line
const STATUS_MS = 350; // before a status line shows
const LOOP_HOLD_MS = 6500; // hold the finished transcript, then restart

function Cursor() {
  return (
    <span className="ml-0.5 inline-block h-[1.05em] w-[0.55em] translate-y-[0.18em] animate-pulse bg-emerald-400/90" />
  );
}

export function Terminal() {
  // idx = fully completed events; typed = chars shown of the current cmd.
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState(0);
  const [cycle, setCycle] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Show the full transcript at once; defer the setState off the effect
      // body so it doesn't cascade a synchronous re-render.
      const t = setTimeout(() => setIdx(EVENTS.length), 0);
      return () => clearTimeout(t);
    }
    const ev = EVENTS[idx];
    let t: ReturnType<typeof setTimeout>;
    if (!ev) {
      t = setTimeout(() => {
        setIdx(0);
        setTyped(0);
        setCycle((c) => c + 1);
      }, LOOP_HOLD_MS);
    } else if (ev.kind === "cmd") {
      t =
        typed < ev.text.length
          ? setTimeout(() => setTyped((n) => n + 1), TYPE_MS)
          : setTimeout(() => {
              setIdx((i) => i + 1);
              setTyped(0);
            }, 250);
    } else if (ev.kind === "pause") {
      t = setTimeout(() => setIdx((i) => i + 1), ev.ms);
    } else if (ev.kind === "status") {
      t = setTimeout(() => setIdx((i) => i + 1), STATUS_MS);
    } else {
      t = setTimeout(() => setIdx((i) => i + 1), LINE_MS);
    }
    return () => clearTimeout(t);
  }, [idx, typed, cycle]);

  // Keep the newest line in view, like a real terminal.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [idx, typed]);

  const done = idx >= EVENTS.length;
  const current = EVENTS[idx];

  return (
    <div className="overflow-hidden border border-stone-900 bg-[#0b0d10] shadow-2xl shadow-stone-400/40">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-auto font-mono text-[11px] tracking-wide text-stone-500">
          your agent
        </span>
      </div>
      <div
        ref={bodyRef}
        className="h-[420px] space-y-4 overflow-hidden p-5 font-mono text-[13px] leading-relaxed antialiased sm:h-[460px]"
      >
        {EVENTS.slice(0, idx).map((ev, i) => {
          if (ev.kind === "pause") return null;
          if (ev.kind === "cmd")
            return (
              <p key={i} className="text-stone-100">
                <span className="mr-2 text-emerald-400">❯</span>
                {ev.text}
              </p>
            );
          if (ev.kind === "status")
            return (
              <p key={i} className="text-stone-500">
                <span className="mr-2 text-emerald-500">●</span>
                {ev.text}
              </p>
            );
          return (
            <div key={i} className="text-stone-300">
              {ev.node}
            </div>
          );
        })}
        {current?.kind === "cmd" ? (
          <p className="text-stone-100">
            <span className="mr-2 text-emerald-400">❯</span>
            {current.text.slice(0, typed)}
            <Cursor />
          </p>
        ) : null}
        {done ? (
          <p className="text-stone-100">
            <span className="mr-2 text-emerald-400">❯</span>
            <Cursor />
          </p>
        ) : null}
      </div>
    </div>
  );
}
