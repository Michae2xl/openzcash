"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Animated terminal demo for the ZecHub Copilot: types the question, "fetches",
 * reveals the answer line by line, then loops. Every line is a real answer the
 * skill produced against the live DAO indexer (verified 2026-08-17 on proposal
 * A116, which failed at 66.67% — one hundredth of a point short of the bar).
 * Honors prefers-reduced-motion by rendering the full transcript statically.
 */

type Ev =
  | { kind: "cmd"; text: string }
  | { kind: "status"; text: string }
  | { kind: "line"; node: ReactNode }
  | { kind: "pause"; ms: number };

const Num = ({ v }: { v: string }) => (
  <span className="text-amber-300">{v}</span>
);

const EVENTS: Ev[] = [
  {
    kind: "cmd",
    text: "Did the Zcash Ukraine proposal pass? It had twice as many yes as no",
  },
  { kind: "pause", ms: 300 },
  {
    kind: "status",
    text: "Reading A116 and its individual votes from the DAO indexer...",
  },
  {
    kind: "line",
    node: (
      <p>
        <span className="font-semibold text-rose-400">No — it failed.</span>{" "}
        A116 &ldquo;Zcash Ukraine Regional Community Initiative&rdquo;:{" "}
        <Num v="12 yes" />, <Num v="6 no" />, 18 of 24 members voting
      </p>
    ),
  },
  {
    kind: "line",
    node: (
      <p>
        <span className="font-semibold text-sky-400">Quorum</span> 18/24 ={" "}
        <span className="text-emerald-400">75.0%</span> · needs 40% ·{" "}
        <span className="text-emerald-400">PASS</span>
      </p>
    ),
  },
  {
    kind: "line",
    node: (
      <p>
        <span className="font-semibold text-sky-400">Threshold</span> 12/18 ={" "}
        <span className="text-rose-400">66.67%</span> · needs 67% ·{" "}
        <span className="text-rose-400">FAIL</span>
      </p>
    ),
  },
  {
    kind: "line",
    node: (
      <p className="text-stone-400">
        ZecHub needs <span className="text-stone-200">67% of yes+no</span>, not
        a majority. One more yes — or one fewer no — and it passes.
      </p>
    ),
  },
  {
    kind: "line",
    node: (
      <p className="text-stone-400">
        Not rare: <span className="text-stone-200">25 proposals</span> have had
        a yes-majority and still lost.
      </p>
    ),
  },
  {
    kind: "line",
    node: (
      <p className="text-[11px] text-stone-600">
        sources: indexer.daodao.zone · daoProposalSingle/proposal ·
        daoProposalSingle/listVotes
      </p>
    ),
  },
];

const TYPE_MS = 26; // per character
const LINE_MS = 380; // per revealed answer line
const STATUS_MS = 900; // hold the "fetching" line
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
