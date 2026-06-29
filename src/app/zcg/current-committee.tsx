/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/**
 * The ZCG committee seated from July 2026: the June 2026 cohort (terms to
 * June 2027) plus the December 2025 cohort (terms to December 2026). Each
 * member links to their own social / forum, shown with their real forum
 * avatar (mirrored locally under /committee) ringed by their cohort colour.
 *
 * The three tags per member are distilled from ~18 months of public ZCG
 * committee meeting minutes (Jan 2025 – Jun 2026) — observed behaviour, not
 * self-description. Paul Brigner joined in July 2026, so he has no record yet.
 */

type Platform = "forum" | "x" | "linkedin" | "youtube";

interface Member {
  name: string;
  img: string;
  url: string;
  platform: Platform;
  cohort: "june-2026" | "dec-2025";
  term: string;
  tags?: [string, string, string];
}

const MEMBERS: Member[] = [
  {
    name: "GGuy",
    img: "/committee/gguy.png",
    url: "https://forum.zcashcommunity.com/u/gguy",
    platform: "forum",
    cohort: "june-2026",
    term: "to Jun 2027",
    tags: ["Process Governance", "Fiscal Gatekeeper", "Ecosystem Steward"],
  },
  {
    name: "Paul Brigner",
    img: "/committee/paulbrigner.png",
    url: "https://www.linkedin.com/in/paulbrigner/",
    platform: "linkedin",
    cohort: "june-2026",
    term: "to Jun 2027",
  },
  {
    name: "hanh",
    img: "/committee/hanh.png",
    url: "https://forum.zcashcommunity.com/u/hanh",
    platform: "forum",
    cohort: "dec-2025",
    term: "to Dec 2026",
    tags: ["Protocol Authority", "Quality Screener", "Core-Team Liaison"],
  },
  {
    name: "Zerodartz",
    img: "/committee/zerodartz.png",
    url: "https://twitter.com/zerodartz",
    platform: "x",
    cohort: "dec-2025",
    term: "to Dec 2026",
    tags: ["Community Growth", "Adoption Diligence", "Budget Right-Sizing"],
  },
  {
    name: "Artkor",
    img: "/committee/artkor.png",
    url: "https://www.youtube.com/@prozcash",
    platform: "youtube",
    cohort: "dec-2025",
    term: "to Dec 2026",
    tags: ["Data-Driven Diligence", "Hands-On QA", "ZecHub Connector"],
  },
];

// All five hold active seats — every member gets the emerald "seated" ring.
const RING = "from-emerald-300 to-emerald-500";

const PLATFORM_LABEL: Record<Platform, string> = {
  forum: "Zcash forum",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

function PlatformGlyph({ platform }: { platform: Platform }) {
  const cls = "h-3 w-3";
  if (platform === "x")
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  if (platform === "linkedin")
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" />
      </svg>
    );
  if (platform === "youtube")
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.03 2 11c0 2.79 1.4 5.28 3.6 6.93V22l3.93-2.16c.79.2 1.62.31 2.47.31 5.523 0 10-4.03 10-9S17.523 2 12 2z" />
    </svg>
  );
}

function MemberCard({ m }: { m: Member }) {
  return (
    <a
      href={m.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`${m.name} on ${PLATFORM_LABEL[m.platform]}`}
      className="group flex items-start gap-3 rounded-xl border border-stone-200/80 bg-white p-3 transition-colors hover:border-amber-300/70"
    >
      <span className="relative shrink-0">
        <span
          className={cn(
            "block rounded-full bg-gradient-to-br p-[2.5px] shadow-sm transition-transform duration-200 group-hover:scale-105",
            RING,
          )}
        >
          <img
            src={m.img}
            alt={m.name}
            width={48}
            height={48}
            className="h-12 w-12 rounded-full border-2 border-white object-cover"
          />
        </span>
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 shadow-sm transition-colors group-hover:text-amber-700">
          <PlatformGlyph platform={m.platform} />
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold text-stone-900 group-hover:text-amber-700">
            {m.name}
          </span>
          <span className="tnum shrink-0 text-[11px] font-medium text-stone-500">
            {m.term}
          </span>
        </div>
        {m.tags ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {m.tags.map((t) => (
              <span
                key={t}
                className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700 ring-1 ring-inset ring-stone-200"
              >
                {t}
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-1.5">
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-500/25">
              New member · no meeting record yet
            </span>
          </div>
        )}
      </div>
    </a>
  );
}

export function CurrentCommittee() {
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-stone-700">
          Current committee
        </h3>
        <span className="text-xs font-medium text-stone-500">
          5 seats · from July 2026
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {MEMBERS.map((m) => (
          <MemberCard key={m.name} m={m} />
        ))}
      </div>

      <p className="mt-3 text-[11px] text-stone-500">
        All five hold active seats · tags distilled from public ZCG meeting
        minutes.
      </p>
    </div>
  );
}
