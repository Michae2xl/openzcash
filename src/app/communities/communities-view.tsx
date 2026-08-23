"use client";

import { useMemo, useState } from "react";
import { Stat } from "@/components/ui";
import type { Community, Region } from "@/lib/communities/data";
import type { TopicActivity } from "@/lib/communities/forum-activity";
import { cn } from "@/lib/utils";

/**
 * Client view for /communities. Layout order is deliberate: the live forum
 * timeline sits at the top of the page (the "what is happening now" answer),
 * then the headline stats, then the region/funding filters over the cards.
 * All data arrives pre-fetched from the server component.
 */

const REGIONS: Region[] = [
  "Africa",
  "Latin America",
  "Asia",
  "Europe",
  "Middle East",
  "Global",
];

type FundingFilter = "all" | "funded" | "unfunded";

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
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

function LinkChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700 ring-1 ring-inset ring-stone-200 transition hover:bg-amber-500/10 hover:text-amber-800 hover:ring-amber-500/30"
    >
      {label} ↗
    </a>
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

  const byId = useMemo(
    () => new Map(communities.map((c) => [c.id, c])),
    [communities],
  );
  const lastByCommunity = useMemo(() => {
    const m = new Map<string, TopicActivity>();
    for (const a of activity) if (!m.has(a.communityId)) m.set(a.communityId, a);
    return m;
  }, [activity]);

  const shown = useMemo(
    () =>
      communities.filter(
        (c) =>
          (region === "all" || c.region === region) &&
          (funding === "all" ||
            (funding === "funded" ? c.zcg.funded : !c.zcg.funded)),
      ),
    [communities, region, funding],
  );
  const shownIds = useMemo(() => new Set(shown.map((c) => c.id)), [shown]);
  const timeline = useMemo(
    () => activity.filter((a) => shownIds.has(a.communityId)).slice(0, 24),
    [activity, shownIds],
  );

  const funded = communities.filter((c) => c.zcg.funded);
  const totalBudgeted = funded.reduce(
    (s, c) => s + (c.zcg.budgetedUsd ?? 0),
    0,
  );
  const countries = new Set(
    communities.filter((c) => c.country !== "Global").map((c) => c.country),
  ).size;

  return (
    <>
      {/* ---- Live forum timeline: top of the page ---- */}
      <section className="mb-6 rounded-2xl border border-stone-200 bg-white shadow-sm ring-1 ring-inset ring-stone-900/5">
        <div className="flex items-baseline justify-between gap-3 border-b border-stone-200 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-600">
            Latest forum activity
          </p>
          <p className="text-[11px] text-stone-400">
            live from forum.zcashcommunity.com · scroll →
          </p>
        </div>
        <div className="flex snap-x gap-3 overflow-x-auto p-4">
          {timeline.map((a) => {
            const c = byId.get(a.communityId);
            return (
              <a
                key={a.topicId}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="w-56 shrink-0 snap-start rounded-xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 p-3 transition hover:border-amber-400/60 hover:shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-stone-800">
                    {c?.flag} {c?.name}
                  </p>
                  <span className="shrink-0 text-[10px] font-medium text-emerald-700 tnum">
                    {timeAgo(a.lastPostedAt)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-stone-500">
                  {a.title}
                </p>
              </a>
            );
          })}
          {timeline.length === 0 ? (
            <p className="w-full py-4 text-center text-xs text-stone-400">
              Forum activity unavailable right now.
            </p>
          ) : null}
        </div>
      </section>

      {/* ---- Filters ---- */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setRegion("all")}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition",
            region === "all"
              ? "bg-stone-900 text-white ring-stone-900"
              : "bg-white text-stone-600 ring-stone-300 hover:ring-stone-400",
          )}
        >
          All regions
        </button>
        {REGIONS.map((r) => (
          <button
            key={r}
            onClick={() => setRegion(region === r ? "all" : r)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition",
              region === r
                ? "bg-stone-900 text-white ring-stone-900"
                : "bg-white text-stone-600 ring-stone-300 hover:ring-stone-400",
            )}
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
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition",
              funding === key
                ? "bg-amber-600 text-white ring-amber-600"
                : "bg-white text-stone-600 ring-stone-300 hover:ring-stone-400",
            )}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-stone-500 tnum">
          {shown.length} of {communities.length} communities
        </span>
      </div>

      {/* ---- Community cards ---- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((c) => {
          const last = lastByCommunity.get(c.id);
          return (
            <div
              key={c.id}
              className="rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 p-4 shadow-sm ring-1 ring-inset ring-stone-900/5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl leading-none">{c.flag}</span>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">
                      {c.name}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {c.country} · {c.language}
                    </p>
                  </div>
                </div>
                {last ? (
                  <span
                    className="shrink-0 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/25 tnum"
                    title={`Last forum activity: ${last.title}`}
                  >
                    {timeAgo(last.lastPostedAt)}
                  </span>
                ) : null}
              </div>

              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                {c.about}
              </p>

              <div className="mt-3">
                {c.zcg.funded ? (
                  <>
                    <p className="text-[11px] font-medium text-amber-800">
                      <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 ring-1 ring-inset ring-amber-500/25">
                        ZCG-funded
                      </span>
                    </p>
                    {c.zcg.note ? (
                      <p className="mt-1 text-[11px] text-stone-500">
                        {c.zcg.note}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-[11px] font-medium text-stone-500">
                    <span className="rounded-md bg-stone-100 px-1.5 py-0.5 ring-1 ring-inset ring-stone-200">
                      No ZCG funding
                    </span>
                    {c.zcg.note ? (
                      <span className="ml-1.5 font-normal">{c.zcg.note}</span>
                    ) : null}
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.links.x ? <LinkChip href={c.links.x} label="X" /> : null}
                {c.links.telegram ? (
                  <LinkChip href={c.links.telegram} label="Telegram" />
                ) : null}
                {c.links.discord ? (
                  <LinkChip href={c.links.discord} label="Discord" />
                ) : null}
                {c.links.youtube ? (
                  <LinkChip href={c.links.youtube} label="YouTube" />
                ) : null}
                {c.links.site ? (
                  <LinkChip href={c.links.site} label="Site" />
                ) : null}
                {c.links.forumUser ? (
                  <LinkChip
                    href={`https://forum.zcashcommunity.com/u/${c.links.forumUser}`}
                    label={`@${c.links.forumUser}`}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
        {shown.length === 0 ? (
          <p className="col-span-full py-10 text-center text-sm text-stone-500">
            No communities match these filters.
          </p>
        ) : null}
      </div>

      {/* ---- Totals, at the bottom ---- */}
      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Communities" value={String(communities.length)} />
        <Stat label="Countries" value={String(countries)} />
        <Stat
          label="ZCG-funded"
          value={`${funded.length} of ${communities.length}`}
          tone="warn"
        />
        <Stat
          label="Budgeted to communities"
          value={usd(totalBudgeted)}
          sub="per the audited ledger"
        />
      </section>

    </>
  );
}
