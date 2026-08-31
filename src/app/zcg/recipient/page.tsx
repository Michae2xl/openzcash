import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { recipientMilestones } from "@/lib/zcg/grants-repo";
import { normalizeKey } from "@/lib/zcg/normalize";
import { formatUsdCents } from "@/lib/zcg/format";
import { canonicalRecipient } from "@/lib/zcg/recipient-aliases";
import { recipientEntryPresentation } from "@/lib/zcg/recipient-entry";
import { formatZec } from "@/lib/zcash/units";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recipient ledger · OpenZcash" };

type RecipientEntry = Awaited<ReturnType<typeof recipientMilestones>>[number];

function LedgerEntryName({ entry }: { entry: RecipientEntry }) {
  const presentation = recipientEntryPresentation(entry);
  const label = presentation.isGrant ? (
    <Link
      href={`/zcg/grant?g=${encodeURIComponent(entry.project ?? "")}`}
      className="block truncate hover:text-amber-700"
    >
      {presentation.label}
    </Link>
  ) : (
    <span className="block truncate">{presentation.label}</span>
  );

  return (
    <div className="min-w-0">
      {label}
      {presentation.detail ? (
        <span className="mt-0.5 block truncate text-[11px] font-normal text-stone-500">
          {presentation.detail}
        </span>
      ) : null}
    </div>
  );
}

export default async function RecipientPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const { r } = await searchParams;
  if (!r) notFound();

  const rows = await recipientMilestones(normalizeKey(r));
  if (rows.length === 0) notFound();

  const name = canonicalRecipient(
    rows.find((m) => m.recipientNameRaw)?.recipientNameRaw ?? r,
  );
  const open = rows.filter((m) => !m.isPaid);
  const paid = rows.filter((m) => m.isPaid);
  const sum = (xs: typeof rows) =>
    xs.reduce((s, m) => s + (m.amountUsdCents ?? 0n), 0n);

  return (
    <>
      <Link
        href="/zcg/recipients"
        className="mb-4 inline-block text-xs text-stone-600 hover:text-stone-800"
      >
        ‹ Recipients
      </Link>

      <PageHeader
        title={name}
        subtitle={`${open.length} upcoming and ${paid.length} paid entries in the official ZCG public ledger. Committee stipends, grants and reimbursements are consolidated here.`}
      />

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Future entries"
          value={formatUsdCents(sum(open), { compact: true })}
          sub={`${open.length} open`}
        />
        <Stat
          label="Paid to date"
          value={formatUsdCents(sum(paid), { compact: true })}
          sub={`${paid.length} entries`}
        />
      </section>

      {open.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700">
            Upcoming entries
            <Badge tone="amber">{open.length}</Badge>
          </h2>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-stone-600">
                <tr className="border-b border-stone-200">
                  <th className="px-4 py-3 font-medium">Record</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Budgeted USD
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    Estimated date
                  </th>
                </tr>
              </thead>
              <tbody>
                {open.map((m) => (
                  <tr
                    key={m.id}
                    className="tbl-row border-b border-stone-200 last:border-0"
                  >
                    <td className="max-w-[18rem] px-4 py-2.5 font-medium text-stone-900">
                      <LedgerEntryName entry={m} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-amber-700/90 tnum">
                      {formatUsdCents(m.amountUsdCents)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-stone-600 tnum">
                      {(m.estimatedPayoutDate ?? m.paidOutRaw) || "TBD"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700">
          Paid entries
          <Badge tone="emerald">{paid.length}</Badge>
        </h2>
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-stone-600">
              <tr className="border-b border-stone-200">
                <th className="px-4 py-3 font-medium">Record</th>
                <th className="px-4 py-3 text-right font-medium">USD</th>
                <th className="px-4 py-3 text-right font-medium">ZEC</th>
                <th className="px-4 py-3 text-right font-medium">Paid on</th>
              </tr>
            </thead>
            <tbody>
              {paid.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-stone-600"
                  >
                    No paid entries yet.
                  </td>
                </tr>
              ) : null}
              {paid.map((m) => (
                <tr
                  key={m.id}
                  className="tbl-row border-b border-stone-200 last:border-0"
                >
                  <td className="max-w-[18rem] px-4 py-2.5 font-medium text-stone-900">
                    <LedgerEntryName entry={m} />
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-amber-700/90 tnum">
                    {formatUsdCents(m.amountUsdCents)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-stone-700 tnum">
                    {m.zecDisbursedZat != null
                      ? formatZec(m.zecDisbursedZat, { symbol: false })
                      : "·"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-stone-600 tnum">
                    {m.paidOutDate ?? m.paidOutRaw ?? "·"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </>
  );
}
