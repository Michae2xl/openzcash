import { Suspense } from "react";
import { PageHeader, Stat } from "@/components/ui";
import { getArboristCalls, ARBORIST_REPO_URL } from "@/lib/arborist/notes";
import { ArboristView } from "./arborist-view";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Arborist Calls · OpenZcash",
  description:
    "Every Zcash Arborist Call: dates, agendas, moderators, notes and recordings, read live from the community notes repository.",
};

async function Archive() {
  const calls = await getArboristCalls();
  if (calls.length === 0) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500 shadow-sm">
        The notes repository did not respond. Try again shortly, or browse it
        directly on{" "}
        <a
          href={ARBORIST_REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="text-amber-700 hover:underline"
        >
          GitHub ↗
        </a>
        .
      </p>
    );
  }

  const withVideo = calls.filter((c) => c.video).length;
  const dated = calls.filter((c) => c.date).map((c) => c.date!);
  const firstYear = dated.length ? dated.sort()[0]!.slice(0, 4) : "n/a";
  const latest = calls.find((c) => c.date);

  return (
    <>
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Calls archived" value={String(calls.length)} />
        <Stat
          label="With recording"
          value={`${withVideo} of ${calls.length}`}
          tone="warn"
        />
        <Stat label="Running since" value={firstYear} />
        <Stat
          label="Latest call"
          value={latest ? `#${latest.number}` : "n/a"}
          sub={latest?.date ?? undefined}
        />
      </section>

      <ArboristView calls={calls} />
    </>
  );
}

export default function ArboristPage() {
  return (
    <>
      <PageHeader
        title="Arborist Calls"
        subtitle="The Zcash protocol's standing engineering call: agendas, moderators, notes and recordings for every meeting, read live from the community notes repository."
      />

      <Suspense
        fallback={
          <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500 shadow-sm">
            Loading the call archive…
          </div>
        }
      >
        <Archive />
      </Suspense>

      <p className="mt-8 text-xs leading-relaxed text-stone-500">
        Source:{" "}
        <a
          href={ARBORIST_REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="text-amber-700 hover:underline"
        >
          ZcashCommunityGrants/arboretum-notes ↗
        </a>
        , the community-maintained record of every call. Dates, durations,
        moderators and recording links are parsed from each note&apos;s header;
        where a header omitted the year, it is inferred from the neighbouring
        calls.
      </p>
    </>
  );
}
