import Link from "next/link";
import { Terminal } from "./terminal";
import { AddToAgent } from "../../zcg/copilot/add-to-agent";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "ZecHub Copilot · OpenZcash",
  description:
    "An agent skill for the ZecHub DAO — live, cited answers about proposals, votes, members and the treasury, with the decision rule that actually decides a vote.",
};

const USE_CASES = [
  {
    q: "Did proposal A116 pass? It had twice as many yes as no.",
    a: "No. It computes both tests and shows which one failed: 66.67% approval against a 67% bar. A yes-majority is not enough, and 25 proposals have died that way.",
  },
  {
    q: "What is ZecHub voting on right now?",
    a: "Every open proposal with its current tally, turnout, and exactly what it still needs — more votes for quorum, or more yes for the 67% bar.",
  },
  {
    q: "How much can ZecHub actually spend?",
    a: "The spendable balance, not the headline total. Three separate pots, and the biggest one is donations rather than working capital.",
  },
  {
    q: "What has ZecHub paid contributors?",
    a: "The payout table reconciled against the dashboard total — they differ by $5,200 because one is per-period and the other cumulative.",
  },
];

const SOURCES = [
  {
    name: "DAO indexer",
    desc: "Proposals, votes, and members straight from the ZecHub DAO on Juno — 173 proposals of history, each vote attributable.",
  },
  {
    name: "Juno LCD",
    desc: "What a proposal actually executes on-chain. Membership changes are invisible without it: the indexer returns no messages.",
  },
  {
    name: "Treasury mirror",
    desc: "The three pots, allocations and payouts, refreshed on a 6h cycle with the ZEC price used at snapshot time.",
  },
  {
    name: "ZCG ledger",
    desc: "The other direction of the money: what Zcash Community Grants has paid ZecHub itself.",
  },
];

export default function ZechubCopilotPage() {
  return (
    <div className="antialiased">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            ZecHub Copilot
          </h1>
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-500/25">
            agent skill
          </span>
        </div>
        <Link
          href="/zechub"
          className="text-xs text-stone-500 hover:text-stone-800"
        >
          ‹ ZecHub
        </Link>
      </div>

      <section className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
            An agent skill for the ZecHub DAO
          </p>
          <h2 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-stone-900 sm:text-6xl">
            More yes than no
            <br />
            is not a win.
          </h2>
          <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-stone-600">
            ZecHub decides its funding on-chain, and the rule is stricter than
            it looks: a proposal needs 67% of yes+no <em>and</em> 40% turnout.
            This skill turns your coding agent into a copilot that computes both
            tests from the live indexer, names every voter, and reads the
            treasury without falling into its traps — with a citation on every
            figure.
          </p>
          <div className="mt-8 inline-block border border-stone-900 bg-[#0b0d10] px-5 py-3.5 shadow-lg shadow-stone-400/30">
            <code className="font-mono text-sm text-emerald-400">
              npx skills add Michae2xl/openzcash --skill zechub-copilot
            </code>
          </div>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-stone-400">
            BYO-LLM · no key · no hosted service
          </p>
          <div className="mt-8">
            <AddToAgent skill="zechub-copilot" />
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
          The skill encodes the traps that produce wrong answers: abstentions
          that carry quorum without diluting the threshold, <code>closed</code>{" "}
          and <code>rejected</code> both meaning defeat, milestones marked
          complete next to money still pending, a member count that is
          snapshotted per proposal, and the difference between what the DAO
          holds on-chain and what ZecHub can actually spend. It is read-only —
          it never submits or votes.
        </p>
      </section>
    </div>
  );
}
