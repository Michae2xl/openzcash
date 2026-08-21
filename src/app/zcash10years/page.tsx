import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Zcash at 10 · OpenZcash",
  description:
    "Ten years of the Zcash network, and the forty-year road that led to its genesis block: Chaum, the cypherpunks, Finney, Bitcoin, Zerocash, and every network upgrade since 2016.",
};

const GENESIS = new Date("2016-10-28T00:00:00Z");
const TENTH = new Date("2026-10-28T00:00:00Z");

/**
 * The mini documentary: the pre-history of Zcash, from blind signatures to
 * the trusted-setup ceremony. Dark, chaptered, film-style. Facts checked
 * against the protocol spec, the original papers, and primary reporting.
 */
const DOC_CHAPTERS: {
  era: string;
  title: string;
  who: string;
  text: string[];
}[] = [
  {
    era: "1982",
    title: "The idea of untraceable money",
    who: "David Chaum",
    text: [
      "Long before blockchains, cryptographer David Chaum published “Blind Signatures for Untraceable Payments” (1982): a bank could sign a digital coin without seeing it, so the coin could later be spent without the bank linking it back to you. Digital cash that behaved like cash.",
      "Chaum founded DigiCash in 1989 to build it. Its eCash ran a real pilot at a US bank in 1995, but the company went bankrupt in 1998. The world was not ready, and the money still needed a bank at the center.",
      "One detail matters for this story: among the young cryptographers who worked at DigiCash was Zooko Wilcox. The company failed; the apprenticeship did not.",
    ],
  },
  {
    era: "1992",
    title: "The cypherpunks",
    who: "Hughes, May, Gilmore and a mailing list",
    text: [
      "In 1992 a mailing list formed around a simple position: privacy in the electronic age would have to be built with code, not requested from institutions. Eric Hughes opened his 1993 manifesto with the line “Privacy is necessary for an open society in the electronic age.”",
      "The list became the proving ground for everything that followed: remailers, digital cash schemes, and the culture of shipping working cryptography instead of position papers. Zcash’s founding team traces directly to this milieu.",
    ],
  },
  {
    era: "1997–2004",
    title: "The missing pieces",
    who: "Back, Dai, Szabo, Finney",
    text: [
      "Adam Back’s Hashcash (1997) made computation itself a scarce stamp. Wei Dai’s b-money and Nick Szabo’s bit gold (late 1990s) sketched money without a central issuer. Each solved a piece; none shipped as money.",
      "Hal Finney, veteran cypherpunk and PGP developer, built RPOW (2004), reusable proofs of work: the closest thing to circulating digital scarcity before Bitcoin. When Bitcoin appeared, Finney was the first person besides its creator to run it, and the recipient of the first Bitcoin transaction ever sent (January 12, 2009).",
      "Finney died in 2014. The problem he spent decades on, private electronic cash that needs no permission, is the problem Zcash exists to finish.",
    ],
  },
  {
    era: "2008–2009",
    title: "Bitcoin ships, and exposes everything",
    who: "Satoshi Nakamoto",
    text: [
      "The Bitcoin whitepaper (October 31, 2008) and genesis block (January 3, 2009) solved decentralized consensus. Money finally worked without a bank.",
      "But it worked in public. Every amount, every counterparty, every balance, forever, on a ledger anyone can read. Bitcoin realized the cypherpunk dream of permissionless money while inverting its premise of privacy. Cash had become the most surveilled money ever created.",
    ],
  },
  {
    era: "2013–2014",
    title: "Zerocoin, then Zerocash",
    who: "Johns Hopkins, MIT, Technion, Tel Aviv",
    text: [
      "Zerocoin (2013, Miers, Garman, Green and Rubin at Johns Hopkins) proposed a cryptographic washing machine bolted onto Bitcoin. Zerocash (2014, Ben-Sasson, Chiesa, Garman, Green, Miers, Tromer and Virza) went further: a full currency where sender, receiver and amount are hidden, yet every transaction is verified.",
      "The tool that made it possible was the zk-SNARK, a succinct proof that a statement is true without revealing why. The proofs predate these papers; Zerocash was the moment they became a payment system on paper. It needed a team willing to make it real.",
    ],
  },
  {
    era: "2016",
    title: "The Ceremony",
    who: "Six participants, air-gapped machines",
    text: [
      "Zcash’s original proving system required generating secret parameters that, if any single party kept them, could be used to counterfeit coins invisibly. So the launch team ran a multi-party ceremony in October 2016: six participants, air-gapped hardware, destroyed key material. If even one was honest, the parameters were safe.",
      "On October 28, 2016 the genesis block was mined. For a brief moment on launch week, one ZEC traded above the price of one Bitcoin. The experiment was live.",
    ],
  },
];

/**
 * Ten years on mainnet. Every number here survived our review of the halving
 * schedule: Blossom (2019) halved the per-block reward by doubling block
 * frequency, which is why the halvings read 6.25 into 3.125 into 1.5625.
 */
const TIMELINE: {
  year: string;
  title: string;
  items: { label: string; text: string }[];
}[] = [
  {
    year: "2016",
    title: "Launch",
    items: [
      {
        label: "Oct 28 · Genesis",
        text: "Mainnet launches with Sprout shielded transactions, a 21M cap, 2.5-minute blocks and a 12.5 ZEC subsidy, ramped in over a 34-day slow start. The Founders Reward directs 20% of the subsidy to the founding team and investors for the first four years (10% of total supply).",
      },
    ],
  },
  {
    year: "2018",
    title: "The quiet save, then Sapling",
    items: [
      {
        label: "Mar · Counterfeiting bug found",
        text: "Ariel Gabizon finds a flaw in the BCTV14 proving system that could have allowed invisible counterfeiting of Sprout coins. It is fixed silently and disclosed only in February 2019. No evidence of exploitation was ever found.",
      },
      {
        label: "Oct 28 · Sapling",
        text: "A ground-up redesign of shielded transactions: proving drops from minutes and gigabytes to seconds and megabytes, making shielded usable on phones. Shipped on the network’s second birthday.",
      },
    ],
  },
  {
    year: "2019",
    title: "Blossom",
    items: [
      {
        label: "Dec 11 · 75-second blocks",
        text: "Block time drops from 150s to 75s and the per-block subsidy from 12.5 to 6.25 ZEC, keeping issuance per hour unchanged. This is the step most halving tables forget: it is why the first halving lands on 3.125, not 6.25.",
      },
    ],
  },
  {
    year: "2020",
    title: "First halving and the Dev Fund",
    items: [
      {
        label: "Jul · Heartwood",
        text: "Shielded coinbase: miners can receive block rewards directly into shielded addresses.",
      },
      {
        label: "Nov · Canopy, halving one",
        text: "Subsidy halves to 3.125 ZEC. The Founders Reward ends and ZIP 1014 replaces it with the community-voted Dev Fund: 7% ECC, 5% Zcash Foundation, 8% Major Grants (renamed Zcash Community Grants in 2021).",
      },
    ],
  },
  {
    year: "2022",
    title: "NU5: the trusted setup ends",
    items: [
      {
        label: "May 31 · Orchard and Halo 2",
        text: "The Halo 2 proving system removes the trusted setup for the new Orchard pool, and Unified Addresses bundle transparent, Sapling and Orchard receivers into a single address format.",
      },
      {
        label: "Jun · Sandblasting",
        text: "A sustained spam attack bloats the chain and exposes wallet sync pain. It forces the fee overhaul (ZIP 317) and a generation of faster sync work.",
      },
    ],
  },
  {
    year: "2024",
    title: "Second halving and the Lockbox",
    items: [
      {
        label: "2023–2024 · New stewards",
        text: "Zooko steps back from ECC leadership; Zashi ships as ECC’s flagship mobile wallet; Zebra, the Foundation’s Rust node, reaches production alongside zcashd.",
      },
      {
        label: "Nov · NU6, halving two",
        text: "Subsidy halves to 1.5625 ZEC. The renewed Dev Fund sends 8% to Zcash Community Grants and locks 12% (0.1875 ZEC per block) in an on-chain Lockbox reserved for future coinholder-directed funding. OpenZcash tracks it live.",
      },
    ],
  },
  {
    year: "2025",
    title: "Coinholders take the wheel",
    items: [
      {
        label: "zcashd retires",
        text: "The original Bitcoin-derived node is deprecated in favor of Zebra, ending nine years of zcashd.",
      },
      {
        label: "FPF and retroactive grants",
        text: "The Financial Privacy Foundation takes over grants administration and runs the first Coinholder-Directed Retroactive Grants round from the Lockbox. Coinholders approve; keyholders can veto, and did: a $2.67M approved grant was zeroed by keyholder veto, proving the check is real.",
      },
      {
        label: "The next bets",
        text: "Shielded Labs’ Crosslink (hybrid proof-of-stake) and Tachyon (shielded scaling) are announced as the network’s post-2026 directions.",
      },
    ],
  },
  {
    year: "2026",
    title: "Year ten",
    items: [
      {
        label: "Q3 · Retro round two",
        text: "37 proposals request $9.0M from the Lockbox in the largest coinholder round yet. Review closes September 16; the poll opens September 17.",
      },
      {
        label: "Aug–Sep · NU7 coinholder vote",
        text: "Coinholders vote on Network Upgrade 7, headlined by Zcash Shielded Assets: extending the shielded pool beyond ZEC itself, with a 1,000,000 ZEC quorum.",
      },
      {
        label: "Oct 28 · Ten years",
        text: "A decade of continuous operation: three shielded generations (Sprout, Sapling, Orchard), two halvings, zero downtime, and the trusted setup engineered away.",
      },
    ],
  },
];

/** Things people keep getting wrong, kept honest here. */
const CORRECTIONS: { claim: string; fact: string }[] = [
  {
    claim: "“The reward halved 12.5 → 6.25 in 2020”",
    fact: "No. Blossom (2019) moved to 75-second blocks and 6.25 ZEC per block with unchanged hourly issuance. The 2020 halving went to 3.125, and 2024 to 1.5625.",
  },
  {
    claim: "“Zerocash created zk-SNARKs”",
    fact: "Zero-knowledge proofs date to 1985 and SNARK constructions to the early 2010s. Zerocash was the first design to turn them into a payment system; Zcash made that run in production.",
  },
  {
    claim: "“Zcash is governed by a DAO”",
    fact: "There is no Zcash DAO. Governance runs through ZCAP advisory polls, coinholder votes (ZIP 1016), and independent organizations (ECC, ZF, ZCG with FPF). The only actual DAO in the ecosystem is ZecHub’s, and it governs a community project, not the protocol.",
  },
  {
    claim: "“The Major Grants Fund funds developers”",
    fact: "That name died in 2021. It is Zcash Community Grants, administered with the Financial Privacy Foundation since 2025, alongside the Lockbox and coinholder-directed retroactive grants.",
  },
];

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / 86_400_000));
}

export default function ZcashTenYearsPage() {
  const now = new Date();
  const daysToTen = daysBetween(now, TENTH);
  const daysSinceGenesis = daysBetween(GENESIS, now);

  return (
    <>
      <PageHeader
        title="Zcash at 10"
        subtitle="Ten years of the network, and the forty-year road that led to its genesis block. Every date and number below is checked against the protocol spec, the ZIPs and the original papers."
        actions={
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-2 text-right">
            <p className="text-lg font-semibold tabular-nums text-amber-800">
              {daysToTen === 0 ? "Today" : `${daysToTen} days`}
            </p>
            <p className="text-[11px] text-stone-600">
              to the 10th anniversary · Oct 28, 2026
            </p>
          </div>
        }
      />

      {/* ---- The mini documentary: dark, chaptered, film-style ---- */}
      <section className="overflow-hidden rounded-2xl border border-stone-900 bg-[#0b0d10] shadow-2xl shadow-stone-400/40">
        <div className="border-b border-white/10 px-6 py-5 sm:px-8">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-400">
            A mini documentary
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            The road to the genesis block
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-400">
            Zcash did not begin in 2016. It began in 1982, with a cryptographer
            who thought money should not report on its owner, and passed through
            every hand that tried to build it before the technology was ready.
          </p>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {DOC_CHAPTERS.map((c, i) => (
            <article
              key={c.era}
              className="grid gap-4 px-6 py-7 sm:grid-cols-[140px_1fr] sm:gap-8 sm:px-8"
            >
              <div>
                <p className="font-mono text-xs text-stone-500">
                  Chapter {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-amber-400">
                  {c.era}
                </p>
                <p className="mt-1 text-xs leading-snug text-stone-500">
                  {c.who}
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  {c.title}
                </h3>
                <div className="mt-2 space-y-3">
                  {c.text.map((p, j) => (
                    <p
                      key={j}
                      className="text-sm leading-relaxed text-stone-300"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="border-t border-white/10 bg-white/[0.03] px-6 py-4 sm:px-8">
          <p className="text-xs text-stone-500">
            In memory of Hal Finney (1956&ndash;2014), who ran the software
            first.
          </p>
        </div>
      </section>

      {/* ---- The ten years, verified ---- */}
      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-stone-900">
            Ten years on mainnet
          </h2>
          <p className="text-xs text-stone-500 tabular-nums">
            {daysSinceGenesis.toLocaleString("en-US")} days of continuous
            operation
          </p>
        </div>

        <div className="relative space-y-6 before:absolute before:bottom-2 before:left-[27px] before:top-2 before:w-px before:bg-gradient-to-b before:from-amber-400/60 before:via-stone-300 before:to-amber-400/60 sm:before:left-[31px]">
          {TIMELINE.map((era) => (
            <div key={era.year} className="relative pl-16 sm:pl-20">
              <div className="absolute left-0 top-0 flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/40 bg-gradient-to-br from-amber-500/[0.15] to-white text-sm font-bold tabular-nums text-amber-800 shadow-sm sm:h-16 sm:w-16">
                {era.year}
              </div>
              <Card>
                <h3 className="text-sm font-semibold text-stone-900">
                  {era.title}
                </h3>
                <div className="mt-3 space-y-3">
                  {era.items.map((it) => (
                    <div key={it.label}>
                      <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                        {it.label}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-stone-600">
                        {it.text}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Corrections: what people keep getting wrong ---- */}
      <section className="mt-10">
        <h2 className="mb-1 text-lg font-semibold text-stone-900">
          Often misstated
        </h2>
        <p className="mb-4 max-w-2xl text-sm text-stone-600">
          Claims we keep finding in articles, books and AI answers, corrected
          against the record.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {CORRECTIONS.map((c) => (
            <Card key={c.claim}>
              <p className="text-sm font-medium text-rose-700/90 line-through decoration-rose-300">
                {c.claim}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {c.fact}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <p className="mt-8 text-xs leading-relaxed text-stone-500">
        Sources: the Zcash protocol specification and ZIPs (zips.z.cash), the
        Zerocoin (2013) and Zerocash (2014) papers, ECC and Zcash Foundation
        announcements, and the audited funding records mirrored on{" "}
        <Link href="/zcg" className="text-amber-700 hover:underline">
          this site
        </Link>
        . The Lockbox accrues 0.1875 ZEC per block;{" "}
        <Link href="/lockbox" className="text-amber-700 hover:underline">
          watch it live
        </Link>
        .
      </p>
    </>
  );
}
