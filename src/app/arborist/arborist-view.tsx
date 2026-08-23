"use client";

import { useMemo, useState } from "react";
import type { ArboristCall } from "@/lib/arborist/notes";
import { cn } from "@/lib/utils";

/**
 * Client view for /arborist: search and filters over the full call archive.
 * Calls with a recording carry a small play badge on the call number, which
 * is the fastest way to spot "this episode has video".
 */

type VideoFilter = "all" | "video" | "novideo";

function fmtDate(iso: string | null, raw: string): string {
  if (!iso) return raw || "date unknown";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function PlayBadge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M8 5.5v13l11-6.5-11-6.5z" />
    </svg>
  );
}

export function ArboristView({ calls }: { calls: ArboristCall[] }) {
  const [q, setQ] = useState("");
  const [video, setVideo] = useState<VideoFilter>("all");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return calls.filter((c) => {
      if (video === "video" && !c.video) return false;
      if (video === "novideo" && c.video) return false;
      if (!needle) return true;
      return (
        String(c.number).includes(needle) ||
        (c.date ?? "").includes(needle) ||
        (c.moderator ?? "").toLowerCase().includes(needle) ||
        (c.notetaker ?? "").toLowerCase().includes(needle) ||
        c.agenda.some((a) => a.toLowerCase().includes(needle))
      );
    });
  }, [calls, q, video]);

  const withVideo = calls.filter((c) => c.video).length;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search calls, topics, moderators…"
          className="w-full max-w-xs rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40 sm:w-72"
        />
        {(
          [
            ["all", `All ${calls.length}`],
            ["video", `With video ${withVideo}`],
            ["novideo", "Notes only"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setVideo(key)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition",
              video === key
                ? "bg-stone-900 text-white ring-stone-900"
                : "bg-white text-stone-600 ring-stone-300 hover:ring-stone-400",
            )}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-stone-500 tnum">
          {shown.length} shown
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm ring-1 ring-inset ring-stone-900/5">
        <ul className="divide-y divide-stone-100">
          {shown.map((c) => (
            <li
              key={c.number}
              className="flex items-start gap-4 px-4 py-4 transition hover:bg-amber-500/[0.04] sm:px-5"
            >
              {/* Call number, with the play badge when a recording exists */}
              <div className="relative shrink-0">
                <div
                  className={cn(
                    "flex h-14 w-16 flex-col items-center justify-center rounded-xl ring-1 ring-inset",
                    c.video
                      ? "bg-gradient-to-br from-emerald-500/[0.12] to-white ring-emerald-500/25"
                      : "bg-gradient-to-br from-stone-100 to-white ring-stone-200",
                  )}
                >
                  <span className="text-[9px] font-medium uppercase tracking-wider text-stone-400">
                    call
                  </span>
                  <span className="text-lg font-bold leading-none text-stone-900 tnum">
                    {c.number}
                  </span>
                </div>
                {c.video ? (
                  <a
                    href={c.video}
                    target="_blank"
                    rel="noreferrer"
                    title="Watch the recording on YouTube"
                    aria-label={`Watch call ${c.number} on YouTube`}
                    className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white shadow-sm ring-2 ring-white transition hover:bg-rose-500"
                  >
                    <PlayBadge className="ml-0.5 h-3 w-3" />
                  </a>
                ) : null}
              </div>

              {/* Meta + agenda */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="text-sm font-semibold text-stone-900">
                    {fmtDate(c.date, c.rawDate)}
                  </p>
                  {c.duration ? (
                    <span className="text-[11px] text-stone-500">
                      · {c.duration}
                    </span>
                  ) : null}
                  {c.moderator ? (
                    <span className="text-[11px] text-stone-500">
                      · moderated by {c.moderator}
                    </span>
                  ) : null}
                  {c.notetaker ? (
                    <span className="text-[11px] text-stone-500">
                      · notes by {c.notetaker}
                    </span>
                  ) : null}
                </div>

                {c.agenda.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.agenda.map((a, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600 ring-1 ring-inset ring-stone-200"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-stone-600 hover:text-amber-800"
                  >
                    Full notes ↗
                  </a>
                  {c.video ? (
                    <a
                      href={c.video}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-rose-700 hover:text-rose-800"
                    >
                      <PlayBadge className="h-2.5 w-2.5" />
                      Watch recording ↗
                    </a>
                  ) : null}
                </div>
              </div>

              {/* Thumbnail on wide screens */}
              {c.videoId ? (
                <a
                  href={c.video!}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden shrink-0 overflow-hidden rounded-lg ring-1 ring-stone-200 transition hover:ring-amber-400/60 lg:block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${c.videoId}/mqdefault.jpg`}
                    alt=""
                    loading="lazy"
                    className="h-14 w-24 object-cover"
                  />
                </a>
              ) : null}
            </li>
          ))}
          {shown.length === 0 ? (
            <li className="py-10 text-center text-sm text-stone-500">
              No calls match that search.
            </li>
          ) : null}
        </ul>
      </div>
    </>
  );
}
