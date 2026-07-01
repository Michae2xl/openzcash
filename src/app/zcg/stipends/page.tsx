import Link from "next/link";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { Synced } from "@/components/synced";
import { formatUsdCents } from "@/lib/zcg/format";
import { cached, LEDGER_TTL_MS } from "@/lib/cache/memo";
import { listDisbursements } from "@/lib/zcg/disbursements-repo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Committee stipends · OpenZcash" };

type MemberStipend = {
  member: string;
  totalUsd: number;
  payments: number;
  firstPaid: string;
  lastPaid: string;
};

export default async function StipendsPage() {
  const rows = await cached("stipends:monthly", LEDGER_TTL_MS, () =>
    listDisbursements({ sheet: "monthly", limit: 1000 }),
  );

  const byMember = new Map<string, MemberStipend>();
  for (const d of rows) {
    const member = d.recipientNameRaw || "—";
    const usd = d.amountUsdCents != null ? Number(d.amountUsdCents) : 0;
    const date = d.paidOutDate ?? "";
    const cur = byMember.get(member);
    if (!cur) {
      byMember.set(member, {
        member,
        totalUsd: usd,
        payments: 1,
        firstPaid: date,
        lastPaid: date,
      });
    } else {
      cur.totalUsd += usd;
      cur.payments += 1;
      if (date && (!cur.firstPaid || date < cur.firstPaid))
        cur.firstPaid = date;
      if (date && date > cur.lastPaid) cur.lastPaid = date;
    }
  }
  const members = [...byMember.values()].sort(
    (a, b) => b.totalUsd - a.totalUsd,
  );
  const total = members.reduce((s, m) => s + m.totalUsd, 0);
  const totalPayments = members.reduce((s, m) => s + m.payments, 0);

  return (
    <>
      <PageHeader
        title="Committee stipends"
        subtitle="What each ZCG committee member has been paid in monthly stipends — the committee's own compensation, not a grant. Mirrored from the ZCG monthly-payments sheet."
        actions={
          <Link
            href="/zcg/totals"
            className="text-xs text-stone-500 hover:text-stone-800"
          >
            ‹ Totals
          </Link>
        }
      />

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat
          label="Total stipends"
          value={formatUsdCents(total, { compact: true })}
          sub="paid to date"
          tone="warn"
        />
        <Stat
          label="Members paid"
          value={String(members.length)}
          sub="recipients"
        />
        <Stat
          label="Payments"
          value={String(totalPayments)}
          sub="monthly transfers"
        />
      </section>

      {members.length > 0 ? (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-xs text-stone-500">
                <th className="px-4 py-2.5 font-medium">Member</th>
                <th className="px-4 py-2.5 text-right font-medium">Paid</th>
                <th className="px-4 py-2.5 text-right font-medium">Payments</th>
                <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">
                  Period
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {members.map((m) => (
                <tr key={m.member} className="hover:bg-stone-50">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/zcg/recipient?r=${encodeURIComponent(m.member)}`}
                      className="font-medium text-stone-800 hover:text-amber-700"
                    >
                      {m.member}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-amber-700/90 tnum">
                    {formatUsdCents(m.totalUsd, { compact: true })}
                  </td>
                  <td className="px-4 py-2.5 text-right text-stone-600 tnum">
                    {m.payments}
                  </td>
                  <td className="hidden px-4 py-2.5 text-right text-xs text-stone-400 tnum sm:table-cell">
                    {m.firstPaid ? m.firstPaid.slice(0, 7) : "?"} →{" "}
                    {m.lastPaid ? m.lastPaid.slice(0, 7) : "?"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-stone-500">
            No monthly stipend rows are present in the ledger yet.
          </p>
        </Card>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Badge tone="violet">Committee salaries</Badge>
        <p className="text-xs text-stone-500">
          These are internal ZCG payments and are excluded from the external
          recipient tables.
        </p>
      </div>

      <Synced className="mt-6" />
    </>
  );
}
