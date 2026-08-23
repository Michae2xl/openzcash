import { Suspense } from "react";
import { COMMUNITIES } from "@/lib/communities/data";
import { getCommunityActivity } from "@/lib/communities/forum-activity";
import { CommunitiesView } from "./communities-view";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Global Communities · OpenZcash",
  description:
    "The global Zcash community groups: who they are, where to find them, which ones ZCG funds (with audited numbers), and what each one has been up to on the forum.",
};

async function LiveDirectory() {
  const activity = await getCommunityActivity(COMMUNITIES);
  return <CommunitiesView communities={COMMUNITIES} activity={activity} />;
}

function HeroArt() {
  const flags = [...new Set(COMMUNITIES.map((c) => c.flag))].filter(
    (f) => f !== "🌐",
  );
  return (
    <section className="relative mb-8 overflow-hidden rounded-2xl border border-stone-800/60 bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950 px-6 py-10 shadow-lg shadow-stone-400/30 sm:px-10">
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

      {/* Wireframe globe with community nodes and connecting arcs */}
      <svg
        viewBox="0 0 400 400"
        aria-hidden
        className="pointer-events-none absolute -right-10 top-1/2 h-[360px] w-[360px] -translate-y-1/2 opacity-60 sm:-right-4"
      >
        <g fill="none" stroke="#f59e0b" strokeOpacity="0.35">
          <circle cx="200" cy="200" r="150" strokeWidth="1.5" />
          <ellipse cx="200" cy="200" rx="150" ry="58" strokeWidth="1" />
          <ellipse cx="200" cy="200" rx="150" ry="112" strokeWidth="0.75" strokeOpacity="0.2" />
          <ellipse cx="200" cy="200" rx="58" ry="150" strokeWidth="1" />
          <ellipse cx="200" cy="200" rx="112" ry="150" strokeWidth="0.75" strokeOpacity="0.2" />
          <path d="M92 130 Q200 40 308 130" strokeWidth="1" strokeOpacity="0.5" stroke="#fbbf24" />
          <path d="M74 240 Q200 340 326 240" strokeWidth="1" strokeOpacity="0.5" stroke="#fbbf24" />
          <path d="M120 105 Q250 150 290 265" strokeWidth="1" strokeOpacity="0.4" stroke="#34d399" />
        </g>
        <g fill="#fbbf24">
          <circle cx="120" cy="105" r="5" className="animate-pulse" />
          <circle cx="290" cy="265" r="5" className="animate-pulse" style={{ animationDelay: "0.6s" }} />
          <circle cx="92" cy="230" r="4" className="animate-pulse" style={{ animationDelay: "1.1s" }} />
          <circle cx="308" cy="130" r="4" className="animate-pulse" style={{ animationDelay: "0.3s" }} />
          <circle cx="205" cy="52" r="3.5" />
          <circle cx="160" cy="330" r="3.5" className="animate-pulse" style={{ animationDelay: "0.9s" }} />
          <circle cx="255" cy="180" r="4" fill="#34d399" className="animate-pulse" style={{ animationDelay: "1.4s" }} />
        </g>
      </svg>

      <div className="relative max-w-xl">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-400">
          The Zcash world map
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Global Communities
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-300">
          The regional groups building Zcash adoption around the world: who is
          active right now, who ZCG and the ZecHub DAO fund, and where to find
          every one of them. Live from the community forum.
        </p>
        <p className="mt-6 text-xl leading-relaxed tracking-wide" aria-hidden>
          {flags.join(" ")}
        </p>
      </div>
    </section>
  );
}

export default function CommunitiesPage() {
    return (
    <>
      <HeroArt />

      <Suspense
        fallback={
          <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500 shadow-sm">
            Loading live forum activity…
          </div>
        }
      >
        <LiveDirectory />
      </Suspense>

      <p className="mt-8 text-xs leading-relaxed text-stone-500">
        Funding figures mirror the official ZCG spreadsheet (budgeted USD, not
        paid; see the methodology). Communities with no ledger rows are marked
        accordingly — some are funded through other channels (ZecHub DAO
        ambassador program, direct donations), noted per card. Links seeded from
        ZecHub&apos;s community directory and verified individually.
      </p>
    </>
  );
}
