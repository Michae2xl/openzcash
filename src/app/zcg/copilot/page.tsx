import Link from "next/link";

export const dynamic = "force-dynamic";
// Hidden preview: not linked publicly (admin-only banner on /zcg/proposals),
// noindex until the skill's public repo ships.
export const metadata = {
  title: "ZCG Copilot · OpenZcash",
  robots: { index: false, follow: false },
};

/** Static terminal mock. Every line is a real, validated answer the skill
 * produced against the live APIs (adversarial validation, 2026-07-01). */
function Terminal() {
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
      <div className="space-y-4 p-5 font-mono text-[13px] leading-relaxed antialiased">
        <p className="text-stone-100">
          <span className="mr-2 text-emerald-400">❯</span>
          Find any grants having to do with tools for merchants to accept Zcash
        </p>
        <p className="text-stone-500">
          <span className="mr-2 text-emerald-500">●</span>
          Fetching the ledger, live pipeline, and GitHub applications...
        </p>
        <div className="space-y-1.5 text-stone-300">
          <p>
            <span className="font-semibold text-emerald-400">Funded:</span>{" "}
            Payment Gateway with BTCPay,{" "}
            <span className="text-amber-300">$120,000</span> paid (2022) ·
            Elemental ZEC payment processor,{" "}
            <span className="text-amber-300">$51,144</span> (6/6 milestones) ·
            CoinPayments, <span className="text-amber-300">$76,800</span> before
            cancellation
          </p>
          <p>
            <span className="font-semibold text-sky-400">
              Under review now:
            </span>{" "}
            Rozo Merchant POS (#336),{" "}
            <span className="text-amber-300">$48,000</span> requested
          </p>
          <p>
            <span className="font-semibold text-rose-400">Declined:</span>{" "}
            weave-zec ($48k), ZecPay ($44k), ZAPS ($120k)...
          </p>
          <p className="text-[11px] text-stone-600">
            sources: openzcash.org/api/zcg/data/grants · /api/zcg/office ·
            github #336
          </p>
        </div>
        <p className="text-stone-100">
          <span className="mr-2 text-emerald-400">❯</span>
          Was Zenith Full-node Wallet 2026 funded?
        </p>
        <div className="space-y-1.5 text-stone-300">
          <p>
            <span className="font-semibold text-rose-400">No.</span> It is under
            review right now (#334,{" "}
            <span className="text-amber-300">$122,600</span> requested). It is
            not the completed 2024 Zenith Full Node Wallet grant (
            <span className="text-amber-300">$124,800</span> paid). Same name,
            different application.
          </p>
          <p className="text-[11px] text-stone-600">
            sources: /api/zcg/office · github #334 · /api/zcg/data/grants
          </p>
        </div>
      </div>
    </div>
  );
}

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
    desc: "Requested vs approved amounts from the committee's grants system (zcg.pgpz.org).",
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
          <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-500/25">
            preview · hidden
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
              npx skills add ZcashCommunityGrants/zcg-copilot
            </code>
          </div>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-stone-400">
            BYO-LLM · no key · no hosted service
          </p>
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
