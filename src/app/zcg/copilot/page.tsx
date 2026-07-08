import Link from "next/link";
import { Terminal } from "./terminal";
import { AddToAgent } from "./add-to-agent";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "ZCG Copilot · OpenZcash",
  description:
    "An agent skill that turns your coding agent into a ZCG grants copilot — live, cited answers about Zcash Community Grants funding.",
};

const USE_CASES = [
  {
    q: "I want to build privacy-preserving payments on Zcash. Vet this idea.",
    a: "What was funded in that space with exact paid totals, what was declined, and what is pending review right now.",
  },
  {
    q: "I'm applying for a wallet grant. Who got funded before, and how much?",
    a: "Every wallet grant in the ledger: grantee, budget, milestones paid, dates. Your ask lands in the committee's real range.",
  },
  {
    q: "What's ZCG's burn rate this year, month by month?",
    a: "Aggregated from the payment ledger CSV, split by program, spikes explained line by line.",
  },
  {
    q: "How much has ZCG paid to QEDIT in total?",
    a: "Budgeted vs actually paid, across how many grants and payments. The distinction most answers get wrong.",
  },
];

const SOURCES = [
  {
    name: "OpenZcash ledger",
    desc: "Audited mirror of the official ZCG spreadsheet. Payments, recipients, grants. JSON and CSV.",
  },
  {
    name: "Live pipeline",
    desc: "Proposals under review right now, straight from the ZCG issue tracker.",
  },
  {
    name: "Canonical records",
    desc: "Requested vs approved amounts from a committee member's grants prototype (zcg.pgpz.org). The Grant Dashboard spreadsheet stays the source of truth.",
  },
  {
    name: "GitHub + forum",
    desc: "Full application texts, labels, and the community debate around each proposal.",
  },
];

export default function CopilotPage() {
  return (
    <div className="antialiased">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            ZCG Copilot
          </h1>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/25">
            agent skill
          </span>
        </div>
        <Link
          href="/zcg/proposals"
          className="text-xs text-stone-500 hover:text-stone-800"
        >
          ‹ Proposals
        </Link>
      </div>

      <section className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.35em] text-emerald-700">
            An agent skill for Zcash funding
          </p>
          <h2 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-stone-900 sm:text-6xl">
            Every answer
            <br />
            has a receipt.
          </h2>
          <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-stone-600">
            A skill that turns your coding agent into a ZCG grants copilot. Ask
            about grants, spending, recipients, and proposals under review.
            Answers come from the live public ledger, GitHub, and the forum,
            with exact numbers and a citation on every figure. Never from the
            model&apos;s memory.
          </p>
          <div className="mt-8 inline-block border border-stone-900 bg-[#0b0d10] px-5 py-3.5 shadow-lg shadow-stone-400/30">
            <code className="font-mono text-sm text-emerald-400">
              npx skills add Michae2xl/openzcash --skill zcg-copilot
            </code>
          </div>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-stone-400">
            BYO-LLM · no key · no hosted service
          </p>
          <div className="mt-8">
            <AddToAgent />
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
                <span className="mr-1.5 text-emerald-600">❯</span>
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
          The skill also encodes the data&apos;s real failure modes: same-title
          collisions between re-applications, requested vs paid confusion,
          milestone double counting. Agents answer correctly, not just
          confidently. Methodology:{" "}
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
