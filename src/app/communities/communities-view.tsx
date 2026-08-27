"use client";

import { useMemo, useState } from "react";
import { Stat } from "@/components/ui";
import type { Community, Region } from "@/lib/communities/data";
import type { TopicActivity } from "@/lib/communities/forum-activity";
import { cn } from "@/lib/utils";

/**
 * Client view for /communities, designed as an assessment surface for the
 * ZCG committee: a single dense ledger-style list, ordered by most recent
 * forum activity, with a recency signal per row (green ≤7d, amber ≤30d,
 * grey = quiet). Filters and the list are the whole page; totals sit at
 * the bottom.
 */

const REGIONS: Region[] = [
  "Africa",
  "North America",
  "Latin America",
  "Asia",
  "Europe",
  "Middle East",
  "Global",
];

type FundingFilter = "all" | "funded" | "unfunded";
type SortMode = "activity" | "name" | "region";

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function timeAgo(iso: string): string {
  const days = daysSince(iso);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function usd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

/**
 * Recency signal: the committee's at-a-glance "is this group alive".
 * Calibrated to a monthly reporting cadence: a community whose latest
 * report is 3 weeks old is on schedule, not idle.
 */
function RecencyDot({ iso }: { iso?: string }) {
  const days = iso ? daysSince(iso) : Infinity;
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        days <= 35
          ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
          : days <= 90
            ? "bg-amber-400"
            : "bg-stone-300",
      )}
      title={
        days === Infinity
          ? "No tracked forum activity"
          : `Last forum activity ${timeAgo(iso!)}`
      }
    />
  );
}


/** Gold shield for the OGs: communities with five or more years of verified
 * public record. Computed from `since`, so entries age into it on their own. */
function OgShield({ since }: { since?: number }) {
  if (!since) return null;
  const years = new Date().getFullYear() - since;
  if (years < 5) return null;
  return (
    <span
      title={`OG community: ${years} years of verified public record (since ${since})`}
      className="inline-flex shrink-0 items-center"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="url(#og-gold)"
        stroke="#92400e"
        strokeWidth="1.4"
        aria-label="OG community, five or more years"
      >
        <defs>
          <linearGradient id="og-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fde68a" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <path d="M12 2l8 3.5v5.2c0 5-3.4 8.6-8 11.3-4.6-2.7-8-6.3-8-11.3V5.5L12 2z" />
      </svg>
    </span>
  );
}

function pill(active: boolean, accent = false): string {
  return cn(
    "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition",
    active
      ? accent
        ? "bg-amber-600 text-white ring-amber-600"
        : "bg-stone-900 text-white ring-stone-900"
      : "bg-white text-stone-600 ring-stone-300 hover:ring-stone-400",
  );
}

export function CommunitiesView({
  communities,
  activity,
}: {
  communities: Community[];
  activity: TopicActivity[];
}) {
  const [region, setRegion] = useState<Region | "all">("all");
  const [funding, setFunding] = useState<FundingFilter>("all");
  const [sort, setSort] = useState<SortMode>("activity");

  const byId = useMemo(
    () => new Map(communities.map((c) => [c.id, c])),
    [communities],
  );
  const lastByCommunity = useMemo(() => {
    const m = new Map<string, TopicActivity>();
    for (const a of activity)
      if (!m.has(a.communityId)) m.set(a.communityId, a);
    return m;
  }, [activity]);

  const shown = useMemo(() => {
    const filtered = communities.filter(
      (c) =>
        (region === "all" || c.region === region) &&
        (funding === "all" ||
          (funding === "funded" ? c.zcg.funded : !c.zcg.funded)),
    );
    const key = (c: Community) =>
      lastByCommunity.get(c.id)?.lastPostedAt ?? "0000";
    if (sort === "name")
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "region")
      return [...filtered].sort(
        (a, b) =>
          a.region.localeCompare(b.region) || key(b).localeCompare(key(a)),
      );
    return [...filtered].sort((a, b) => key(b).localeCompare(key(a)));
  }, [communities, region, funding, sort, lastByCommunity]);


  const funded = communities.filter((c) => c.zcg.funded);
  const totalBudgeted = funded.reduce(
    (s, c) => s + (c.zcg.budgetedUsd ?? 0),
    0,
  );
  const countries = new Set(
    communities.filter((c) => c.country !== "Global").map((c) => c.country),
  ).size;
  const activeMonth = communities.filter((c) => {
    const l = lastByCommunity.get(c.id);
    return l && daysSince(l.lastPostedAt) <= 35;
  }).length;

  return (
    <>
      {/* ---- Filters + sort ---- */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setRegion("all")}
          className={pill(region === "all")}
        >
          All regions
        </button>
        {REGIONS.map((r) => (
          <button
            key={r}
            onClick={() => setRegion(region === r ? "all" : r)}
            className={pill(region === r)}
          >
            {r}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-stone-300" />
        {(
          [
            ["all", "All"],
            ["funded", "ZCG-funded"],
            ["unfunded", "No ZCG funding"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFunding(key)}
            className={pill(funding === key, true)}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1 text-[11px] text-stone-500">
          sort
          {(
            [
              ["activity", "Activity"],
              ["name", "Name"],
              ["region", "Region"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={cn(
                "rounded px-1.5 py-0.5 font-medium transition",
                sort === key
                  ? "bg-stone-900 text-white"
                  : "text-stone-500 hover:text-stone-800",
              )}
            >
              {label}
            </button>
          ))}
        </span>
      </div>

      {/* ---- The assessment list ---- */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm ring-1 ring-inset ring-stone-900/5">
        <div className="hidden grid-cols-[minmax(210px,1.1fr)_minmax(0,1.6fr)_150px_minmax(150px,0.9fr)] gap-4 border-b border-stone-200 bg-stone-50/60 px-5 py-2.5 md:grid">
          {[
            "Community",
            "Latest forum activity",
            "Funding",
            "Channels",
          ].map((h) => (
            <p
              key={h}
              className="text-[11px] font-semibold uppercase tracking-wider text-stone-500"
            >
              {h}
            </p>
          ))}
        </div>

        <ul className="divide-y divide-stone-100">
          {shown.map((c) => {
            const last = lastByCommunity.get(c.id);
            return (
              <li
                key={c.id}
                className="grid grid-cols-1 gap-3 px-5 py-4 transition hover:bg-amber-500/[0.04] md:grid-cols-[minmax(210px,1.1fr)_minmax(0,1.6fr)_150px_minmax(150px,0.9fr)] md:items-center md:gap-4"
              >
                {/* Community */}
                <div className="flex items-center gap-3">
                  {c.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.logo}
                      alt=""
                      loading="lazy"
                      className="h-8 w-8 shrink-0 rounded-lg object-contain ring-1 ring-stone-200"
                    />
                  ) : (
                    <span className="text-xl leading-none">{c.flag}</span>
                  )}
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                      <span className="truncate">{c.name}</span>
                      <OgShield since={c.since} />
                      <RecencyDot iso={last?.lastPostedAt} />
                    </p>
                    <p className="truncate text-[11px] text-stone-500">
                      {c.country} · {c.language}
                      {c.since ? (
                        <span className="text-stone-400"> · since {c.since}</span>
                      ) : null}
                    </p>
                  </div>
                </div>

                {/* Latest activity */}
                <div className="min-w-0">
                  {last ? (
                    <a
                      href={last.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group block"
                    >
                      <p className="truncate text-xs font-medium text-stone-800 group-hover:text-amber-800">
                        {last.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-stone-500">
                        <span
                          className={cn(
                            "font-semibold tnum",
                            daysSince(last.lastPostedAt) <= 35
                              ? "text-emerald-700"
                              : daysSince(last.lastPostedAt) <= 90
                                ? "text-amber-700"
                                : "text-stone-500",
                          )}
                        >
                          {timeAgo(last.lastPostedAt)}
                        </span>{" "}
                        · {last.kind}{last.source === "forum" ? ` · ${last.postsCount} posts` : ""}
                      </p>
                    </a>
                  ) : (
                    <p className="text-[11px] text-stone-400">
                      No tracked forum activity
                    </p>
                  )}
                </div>

                {/* Funding */}
                <div>
                  {c.zcg.funded ? (
                    <span
                      className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-500/25"
                      title={c.zcg.note ?? c.zcg.recipient}
                    >
                      ZCG-funded
                    </span>
                  ) : c.zcg.zechubDao ? (
                    <span
                      className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/25"
                      title={c.zcg.note}
                    >
                      ZecHub DAO
                    </span>
                  ) : (
                    <span
                      className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500 ring-1 ring-inset ring-stone-200"
                      title={c.zcg.note}
                    >
                      No ZCG funding
                    </span>
                  )}
                  {c.zcg.note ? (
                    <p className="mt-1 hidden max-w-[150px] text-[10px] leading-snug text-stone-400 md:line-clamp-2">
                      {c.zcg.note}
                    </p>
                  ) : null}
                </div>

                {/* Channels */}
                <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[11px] font-medium">
                  {c.links.x ? (
                    <a
                      className="text-stone-600 hover:text-amber-800"
                      href={c.links.x}
                      target="_blank"
                      rel="noreferrer"
                    >
                      X
                    </a>
                  ) : null}
                  {c.links.telegram ? (
                    <a
                      className="text-stone-600 hover:text-amber-800"
                      href={c.links.telegram}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Telegram
                    </a>
                  ) : null}
                  {c.links.discord ? (
                    <a
                      className="text-stone-600 hover:text-amber-800"
                      href={c.links.discord}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Discord
                    </a>
                  ) : null}
                  {c.links.instagram ? (
                    <a className="text-stone-600 hover:text-amber-800" href={c.links.instagram} target="_blank" rel="noreferrer">
                      Instagram
                    </a>
                  ) : null}
                  {c.links.youtube ? (
                    <a
                      className="text-stone-600 hover:text-amber-800"
                      href={c.links.youtube}
                      target="_blank"
                      rel="noreferrer"
                    >
                      YouTube
                    </a>
                  ) : null}
                  {c.links.site ? (
                    <a
                      className="text-stone-600 hover:text-amber-800"
                      href={c.links.site}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Site
                    </a>
                  ) : null}
                  {c.links.forumUser ? (
                    <a
                      className="text-stone-600 hover:text-amber-800"
                      href={`https://forum.zcashcommunity.com/u/${c.links.forumUser}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      @{c.links.forumUser}
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
          {shown.length === 0 ? (
            <li className="py-10 text-center text-sm text-stone-500">
              No communities match these filters.
            </li>
          ) : null}
        </ul>
      </div>

      {/* ---- Totals, at the bottom ---- */}
      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Communities" value={String(communities.length)} />
        <Stat label="Countries" value={String(countries)} />
        <Stat
          label="Active this month"
          value={`${activeMonth} of ${communities.length}`}
        />
        <Stat
          label="ZCG-funded"
          value={`${funded.length} of ${communities.length}`}
          sub={`${usd(totalBudgeted)} budgeted, per the audited ledger`}
          tone="warn"
        />
      </section>
    </>
  );
}
