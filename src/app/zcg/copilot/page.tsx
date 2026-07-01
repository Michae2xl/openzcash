import Link from "next/link";

export const dynamic = "force-dynamic";
// Hidden preview: not linked publicly (admin-only banner on /zcg/proposals),
// noindex until the skill's public repo ships.
export const metadata = {
  title: "ZCG Copilot · OpenZcash",
  robots: { index: false, follow: false },
};

/** Static terminal mock — every line below is a REAL, validated answer the
 * skill produced against the live APIs (adversarial validation, 2026-07-01). */
function Terminal() {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-950 shadow-2xl shadow-stone-400/30">
      <div className="flex items-center gap-2 border-b border-stone-800 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-red-500/80" />
        <span className="h-3 w-3 rounded-full bg-amber-400/80" />
        <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
        <span className="ml-auto text-xs text-stone-500">your agent</span>
      </div>
      <div className="space-y-4 p-5 font-mono text-[13px] leading-relaxed">
        <p className="text-stone-100">
          <span className="mr-2 text-emerald-400">❯</span>
          Find any grants having to do with tools for merchants to accept Zcash
        </p>
        <p className="text-stone-500">
          <span className="mr-2 text-emerald-500">●</span>
          Fetching the ledger, live pipeline, and GitHub applications…
        </p>
        <div className="space-y-1.5 text-stone-300">
          <p>
            <span className="font-semibold text-emerald-400">Funded:</span>{" "}
            Payment Gateway with BTCPay —{" "}
            <span className="text-amber-300">$120,000</span> paid (2022) ·
            Elemental ZEC payment processor —{" "}
            <span className="text-amber-300">$51,144</span> (6/6 milestones) ·
            CoinPayments — <span className="text-amber-300">$76,800</span>{" "}
            before cancellation
          </p>
          <p>
            <span className="font-semibold text-sky-400">
              Under review now:
            </span>{" "}
            Rozo Merchant POS (#336) —{" "}
            <span className="text-amber-300">$48,000</span> requested
          </p>
          <p>
            <span className="font-semibold text-rose-400">Declined:</span>{" "}
            weave-zec ($48k), ZecPay ($44k), ZAPS ($120k)…
          </p>
          <p className="text-xs text-stone-500">
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
            <span className="font-semibold text-rose-400">No</span> — under
            review right now (#334,{" "}
            <span className="text-amber-300">$122,600</span> requested).
            Distinct from the completed 2024 “Zenith Full Node Wallet” grant (
            <span className="text-amber-300">$124,800</span> paid) — same name,
            different application.
          </p>
          <p className="text-xs text-stone-500">
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
    a: "What was funded in that space (with exact paid totals), what was declined and why that matters, and what is pending review right now.",
  },
  {
    q: "I'm applying for a wallet grant. Who got funded before, and how much?",
    a: "Every wallet grant in the ledger — grantee, budget, milestones paid, dates — so your ask lands in the committee's real range.",
  },
  {
    q: "What's ZCG's burn rate this year, month by month?",
    a: "Aggregated from the payment ledger CSV, split by program, spikes explained line by line.",
  },
  {
    q: "How much has ZCG paid to QEDIT in total?",
    a: "Budgeted vs actually paid, across how many grants and payments — the distinction most answers get wrong.",
  },
];

export default function CopilotPage() {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
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

      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            An agent skill for Zcash funding
          </p>
          <h2 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-stone-900 sm:text-5xl">
            Every answer has a receipt.
          </h2>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-stone-600">
            A skill that turns your coding agent — Claude Code, Cursor, any of
            them — into a ZCG grants copilot. Ask about grants, spending,
            recipients, proposals under review. Answers come from the live
            public ledger, GitHub, and the forum, with exact numbers and a
            citation on every figure. Never from the model&apos;s memory.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <code className="rounded-xl border border-stone-300 bg-stone-100 px-4 py-2.5 font-mono text-sm text-stone-800">
              npx skills add Michae2xl/zcg-copilot
            </code>
            <span className="text-xs text-stone-400">
              BYO-LLM · no key · no hosted service
            </span>
          </div>
        </div>
        <Terminal />
      </section>

      <section className="mt-10">
        <h3 className="text-sm font-semibold text-stone-700">
          Ask things like
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {USE_CASES.map((u) => (
            <div
              key={u.q}
              className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-300/25 ring-1 ring-inset ring-stone-900/[0.04]"
            >
              <p className="font-mono text-[13px] text-stone-900">
                <span className="mr-1.5 text-emerald-600">❯</span>
                {u.q}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-stone-500">
                {u.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 p-5 shadow-sm ring-1 ring-inset ring-stone-900/5">
        <h3 className="text-sm font-semibold text-stone-700">
          Grounded in four public sources
        </h3>
        <div className="mt-3 grid gap-4 text-sm text-stone-600 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-medium text-stone-900">OpenZcash ledger</p>
            <p className="mt-1 text-xs">
              Audited mirror of the official ZCG spreadsheet — payments,
              recipients, grants. JSON/CSV.
            </p>
          </div>
          <div>
            <p className="font-medium text-stone-900">Live pipeline</p>
            <p className="mt-1 text-xs">
              Proposals under review right now, straight from the ZCG issue
              tracker.
            </p>
          </div>
          <div>
            <p className="font-medium text-stone-900">Canonical records</p>
            <p className="mt-1 text-xs">
              Requested vs approved amounts from the committee&apos;s grants
              system (zcg.pgpz.org).
            </p>
          </div>
          <div>
            <p className="font-medium text-stone-900">GitHub + forum</p>
            <p className="mt-1 text-xs">
              Full application texts, labels, and the community debate around
              each proposal.
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-stone-400">
          The skill also encodes the data&apos;s real failure modes — same-title
          collisions between re-applications, requested-vs-paid confusion,
          milestone double-counting — so agents answer correctly, not just
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
    </>
  );
}
