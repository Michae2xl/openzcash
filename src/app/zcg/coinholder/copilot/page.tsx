import Link from "next/link";
import { Terminal } from "./terminal";
import { AddToAgent } from "../../copilot/add-to-agent";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Coinholder Copilot · OpenZcash",
  description:
    "An agent skill for pre-vote diligence on the Coinholder-Directed Retroactive Grants Program: live, cited answers about the open round and every applicant's funding history.",
};

const USE_CASES = [
  {
    q: "Run diligence on proposal #21 before I vote.",
    a: "The ask, the claimed work, prior round verdicts, ledger history, announcement-vs-spreadsheet drift, and the open questions worth taking to the forum thread.",
  },
  {
    q: "Who in this round was funded before, and did they deliver?",
    a: "Every applicant cross-referenced against the audited ledger and prior rounds: funded-and-delivered, rejected-before, two-track orgs, first-timers.",
  },
  {
    q: "How does the ballot actually work?",
    a: "Four options, two of which are 'no' votes with different signals. Plus the keyholder veto that already zeroed out a coinholder-approved $2.67M grant.",
  },
  {
    q: "What has the Coinholder program actually paid so far?",
    a: "The completed grants and their per-payment ZEC trail, kept distinct from the $9M currently being requested.",
  },
];

const SOURCES = [
  {
    name: "Round mirror",
    desc: "The open review round (proposals, asks, key dates, ballot options), curated from FPF's announcement, which runs ahead of the spreadsheet.",
  },
  {
    name: "OpenZcash ledger",
    desc: "Audited mirror of the official ZCG spreadsheet. What was actually paid, to whom, across both programs.",
  },
  {
    name: "Prior rounds",
    desc: "The Coinholder proposals tab: rejections, withdrawals and late submissions that never reach the ledger.",
  },
  {
    name: "FPF GitHub + forum",
    desc: "The application texts with their evidence links, and the community debate in each proposal's thread.",
  },
];

export default function CoinholderCopilotPage() {
  return (
    <div className="antialiased">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Coinholder Copilot
          </h1>
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-500/25">
            agent skill
          </span>
        </div>
        <Link
          href="/zcg/coinholder"
          className="text-xs text-stone-500 hover:text-stone-800"
        >
          ‹ Coinholder Grants
        </Link>
      </div>

      <section className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
            An agent skill for the coinholder vote
          </p>
          <h2 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-stone-900 sm:text-6xl">
            Diligence
            <br />
            before you vote.
          </h2>
          <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-stone-600">
            Retroactive grants ask you to judge work already done. This skill
            turns your coding agent into a diligence copilot for the review
            round: every applicant cross-referenced against the audited payment
            ledger, prior round verdicts, and their own submitted evidence.
            Every figure is cited, never recalled from the model&apos;s memory.
          </p>
          <div className="mt-8 inline-block border border-stone-900 bg-[#0b0d10] px-5 py-3.5 shadow-lg shadow-stone-400/30">
            <code className="font-mono text-sm text-emerald-400">
              npx skills add Michae2xl/openzcash --skill coinholder-copilot
            </code>
          </div>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-stone-400">
            BYO-LLM · no key · no hosted service
          </p>
          <div className="mt-8">
            <AddToAgent skill="coinholder-copilot" />
          </div>
        </div>
        <Terminal />
      </section>

      <section className="mt-16">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-stone-400">
          Ask things like
        </p>
        <div className="mt-4 grid gap-px border border-stone-200 bg-stone-200 sm:grid-cols-2">
          {USE_CASES.map((u) => (
            <div
              key={u.q}
              className="bg-white p-6 transition-colors hover:bg-stone-50"
            >
              <p className="font-mono text-[13px] leading-relaxed text-stone-900">
                <span className="mr-1.5 text-amber-600">❯</span>
                {u.q}
              </p>
              <p className="mt-2.5 text-xs leading-relaxed text-stone-500">
                {u.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-stone-400">
          Grounded in four public sources
        </p>
        <div className="mt-4 grid gap-px border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
          {SOURCES.map((s) => (
            <div key={s.name} className="bg-white p-6">
              <p className="font-mono text-[13px] font-semibold text-stone-900">
                {s.name}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-stone-500">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-stone-400">
          The skill also encodes the round&apos;s real traps: repeat submissions
          at higher asks, same-org multiple proposals, third-party bonus
          nominations, announcement-vs-spreadsheet drift, and the difference
          between coinholder approval and actual payment. It lays out the
          evidence and never tells you how to vote. Methodology:{" "}
          <Link
            href="/zcg/methodology"
            className="text-amber-700 hover:underline"
          >
            how we compute this
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
