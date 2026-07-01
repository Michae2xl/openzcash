import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { Synced } from "@/components/synced";

export const dynamic = "force-dynamic";
export const metadata = { title: "How we compute this · OpenZcash" };

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold text-stone-800">{title}</h2>
      <Card className="text-sm leading-relaxed text-stone-600">{children}</Card>
    </section>
  );
}

const SOURCES: { name: string; what: string }[] = [
  {
    name: "ZCG public spreadsheet",
    what: "Disbursements ledger (every milestone/payment), the recipient & classification totals pivots, and the proposals funnel. Imported and de-duplicated on a daily cron.",
  },
  {
    name: "GitHub issue tracker",
    what: "Live grant applications (ZcashCommunityGrants/zcashcommunitygrants) — the raw, first-hand stage before anything reaches the spreadsheet, read straight from open issues labelled “Grant Application / Ready For Review”.",
  },
  {
    name: "Zcash Community Forum",
    what: "ZCG meeting minutes, imported from the Discourse #grants category.",
  },
  {
    name: "On-chain (lightwalletd)",
    what: "The live Lockbox / ZIP-1016 balance and the day's ZEC/USD rate — the only figures read directly from the chain.",
  },
];

export default function MethodologyPage() {
  return (
    <>
      <PageHeader
        title="How we compute this"
        subtitle="OpenZcash is a read-only mirror. It never holds spend keys and moves no funds. Every figure is derived from public sources — here is exactly how."
      />

      <Section title="Where the data comes from">
        <ul className="space-y-2">
          {SOURCES.map((s) => (
            <li key={s.name}>
              <span className="font-medium text-stone-800">{s.name}</span> —{" "}
              {s.what}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="How each classification is tagged">
        <p className="mb-2">
          On the{" "}
          <Link href="/zcg/totals" className="text-amber-700 hover:underline">
            totals
          </Link>{" "}
          page every classification is labelled by its <em>nature</em>, so a
          reader can tell a grant apart from ZCG spending on itself:
        </p>
        <ul className="space-y-1.5">
          <li>
            <span className="font-medium text-emerald-700">Grant</span> —
            funding paid to an external project or contributor.
          </li>
          <li>
            <span className="font-medium text-amber-700">ZCG operations</span> —
            the committee&apos;s own budget (travel, conferences, tooling); the{" "}
            <span className="font-mono text-xs">ZCG Discretionary Budget</span>{" "}
            bucket.
          </li>
          <li>
            <span className="font-medium text-violet-700">
              Committee stipends
            </span>{" "}
            — salaries paid to ZCG members; see{" "}
            <Link
              href="/zcg/stipends"
              className="text-amber-700 hover:underline"
            >
              stipends
            </Link>
            .
          </li>
          <li>
            <span className="font-medium text-sky-700">Security · audits</span>{" "}
            — third-party security audits and bug bounties (the{" "}
            <span className="font-mono text-xs">Audits</span> classification).
            Bounties also appear as milestones inside individual grants.
          </li>
        </ul>
      </Section>

      <Section title="Why the two “discretionary” figures differ">
        <p>
          You will see the discretionary budget expressed two ways, and they are
          not the same number on purpose:
        </p>
        <ul className="mt-2 space-y-1.5">
          <li>
            The <span className="font-medium">ZCG operations</span> figure on
            the totals split (~$1.8M) comes from the{" "}
            <span className="font-medium">totals pivot</span> — the cumulative
            classification total published in the spreadsheet.
          </li>
          <li>
            The discretionary <span className="font-medium">budget tab</span>{" "}
            ($1M annual cap, ~$1.27M spent) is a separate annual worksheet.
          </li>
        </ul>
        <p className="mt-2">
          They are two readings of the same programme at different scopes
          (cumulative pivot vs. annual budget), which is exactly why the{" "}
          <Link href="/zcg/totals" className="text-amber-700 hover:underline">
            totals
          </Link>{" "}
          page shows a live ledger-vs-published cross-check instead of asserting
          they match.
        </p>
      </Section>

      <Section title="USD vs ZEC">
        <p>
          Grants are budgeted in USD but paid in ZEC at the day&apos;s rate, so
          a USD total and a ZEC total describe the same wallet from two angles
          and should never be added together. On-chain balances are marked to
          the live price; historical rows keep the rate recorded at payment
          time.
        </p>
      </Section>

      <Section title="Reproduce it yourself">
        <p>
          Every number here is queryable. The read-only API exposes the same
          ledger, recipients and grant milestones this site renders — see{" "}
          <Link href="/api/zcg" className="text-amber-700 hover:underline">
            /api/zcg
          </Link>{" "}
          (JSON, or CSV via{" "}
          <span className="font-mono text-xs">?format=csv</span>
          ).
        </p>
      </Section>

      <Synced className="mt-6" />
    </>
  );
}
