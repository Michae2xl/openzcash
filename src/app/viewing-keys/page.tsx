import Link from "next/link";
import { IconAlert, IconKey, IconShield } from "@/components/icons";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { TreasuryTypeSelect } from "@/components/treasury-type-select";
import { TreasuryAdminControls } from "@/components/treasury-admin-controls";
import { loadAudit } from "@/lib/app-data";
import { formatDateTime } from "@/lib/format";
import { summarizeTreasuries } from "@/lib/accounting/treasuries";
import { formatZec, formatZecCompact } from "@/lib/zcash/units";
import { currentZecUsdCents, zatToUsdCents } from "@/lib/pricing/live-price";
import { formatUsdCents } from "@/lib/zcg/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Treasuries · OpenZcash" };
export const dynamic = "force-dynamic";

export default async function ViewingKeysPage() {
  const { viewingKeys, access, recon, realBalanceZat } = await loadAudit();
  const liveCents = await currentZecUsdCents();
  const labelById = new Map(viewingKeys.map((v) => [v.id, v.accountLabel]));
  const treasuries = summarizeTreasuries(viewingKeys, recon.entries);

  const consolidated =
    realBalanceZat ?? treasuries.reduce((s, t) => s + t.balanceZat, 0n);
  // inZat/outZat are already EXTERNAL (internal flow is counted separately).
  const totalIn = treasuries.reduce((s, t) => s + t.inZat, 0n);
  const totalOut = treasuries.reduce((s, t) => s + t.outZat, 0n);
  const internalVolume = treasuries.reduce((s, t) => s + t.internalOutZat, 0n);

  return (
    <>
      <PageHeader
        title="Treasuries"
        subtitle="Each treasury is a viewing key (shielded) or a transparent address (public). The system pulls and refreshes each one, splits transactions by treasury, and consolidates the balance, without ever holding spend keys."
        actions={
          <Link
            href="/onboarding"
            className="rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-medium text-stone-900 shadow-sm shadow-amber-900/20 transition hover:bg-amber-400"
          >
            + Add treasury
          </Link>
        }
      />

      <section
        className={cn(
          "mb-8 grid grid-cols-2 gap-4",
          internalVolume > 0n ? "lg:grid-cols-5" : "lg:grid-cols-4",
        )}
      >
        <Stat
          label="Treasuries"
          value={String(treasuries.length)}
          sub="active sources (VK + t-addr)"
        />
        <Stat
          label="Consolidated balance"
          value={formatZecCompact(consolidated, { symbol: false })}
          sub={
            liveCents != null
              ? formatUsdCents(zatToUsdCents(consolidated, liveCents))
              : undefined
          }
        />
        <Stat
          label="External inflows"
          value={formatZecCompact(totalIn, { symbol: false })}
          sub="third-party flow only"
          tone="in"
        />
        <Stat
          label="External outflows"
          value={formatZecCompact(totalOut, { symbol: false })}
          sub="third-party flow only"
          tone="out"
        />
        {internalVolume > 0n ? (
          <Stat
            label="Internal movement"
            value={formatZecCompact(internalVolume, { symbol: false })}
            sub="between your treasuries"
          />
        ) : null}
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-2">
        {viewingKeys.map((vk) => {
          const t = treasuries.find((x) => x.id === vk.id);
          const balanceZat = t?.balanceZat ?? 0n;
          return (
            <Card key={vk.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
                    <IconKey className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      {vk.accountLabel}
                    </p>
                    <p className="text-xs text-stone-600">
                      {t?.txCount ?? 0} movements · {vk.scope}
                    </p>
                  </div>
                </div>
                <TreasuryTypeSelect
                  id={vk.id}
                  type={vk.treasuryType ?? "outro"}
                />
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-stone-600">
                    Balance
                  </p>
                  <p className="mt-0.5 text-2xl font-semibold tracking-tight text-stone-900 tnum">
                    {formatZec(balanceZat)}
                  </p>
                  <p className="text-xs text-stone-600 tnum">
                    ≈{" "}
                    {liveCents != null
                      ? formatUsdCents(zatToUsdCents(balanceZat, liveCents))
                      : "—"}
                  </p>
                </div>
                <div className="text-right text-xs tnum">
                  <p className="text-emerald-600">
                    ↓ {formatZec(t?.inZat ?? 0n, { symbol: false })}
                  </p>
                  <p className="mt-0.5 text-rose-600">
                    ↑ {formatZec(t?.outZat ?? 0n, { symbol: false })}
                  </p>
                  {t && (t.internalInZat > 0n || t.internalOutZat > 0n) ? (
                    <p className="mt-0.5 text-amber-700">
                      ↹{" "}
                      {formatZec(t.internalInZat + t.internalOutZat, {
                        symbol: false,
                      })}
                    </p>
                  ) : null}
                  {t && t.exceptionCount > 0 ? (
                    <p className="mt-1 text-amber-700">
                      {t.exceptionCount} exceptions
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge tone={vk.kind === "ufvk" ? "amber" : "zinc"}>
                  {vk.kind.toUpperCase()}
                </Badge>
                {vk.pools.map((p) => (
                  <Badge key={p} tone="zinc">
                    {p}
                  </Badge>
                ))}
                <Badge tone={vk.status === "active" ? "emerald" : "rose"}>
                  {vk.status === "active" ? "active" : "revoked"}
                </Badge>
              </div>

              <p className="mt-3 break-all rounded-md bg-white px-3 py-2 font-mono text-xs text-stone-600">
                {vk.ufvkMasked}
              </p>
              <p className="mt-2 text-xs text-stone-500">
                imported on {formatDateTime(vk.importedAt)}
              </p>

              <TreasuryAdminControls
                id={vk.id}
                name={vk.accountLabel}
                isPublic={vk.isPublic ?? false}
              />
            </Card>
          );
        })}
      </section>

      <Card className="mb-8 flex items-start gap-3 border-amber-500/20 bg-amber-500/5">
        <IconAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div className="text-sm text-amber-800/80">
          <p className="font-medium text-amber-800">
            The UFVK is a highly privileged, irrevocable secret.
          </p>
          <p className="mt-1 text-amber-800/70">
            It reveals the entire financial history and the memos (including
            salaries). If it leaks, there is no revocation, only a migration of
            funds. Never distribute it to third parties; grant access to the
            data <strong>through an application with RBAC</strong>, decrypting
            and filtering on the server side.
          </p>
        </div>
      </Card>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700">
          <IconShield className="h-4 w-4 text-stone-600" /> Access log
        </h2>
        <Card className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-600">
              <tr>
                <th className="px-5 py-3 font-medium">Principal</th>
                <th className="px-5 py-3 font-medium">Treasury</th>
                <th className="px-5 py-3 font-medium">Scope</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">
                  Reason
                </th>
                <th className="px-5 py-3 text-right font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {access.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-4 text-center text-xs text-stone-500"
                  >
                    No access recorded.
                  </td>
                </tr>
              ) : (
                access.map((a) => (
                  <tr key={a.id} className="text-stone-700">
                    <td className="px-5 py-3 font-medium text-stone-900">
                      {a.principal}
                    </td>
                    <td className="px-5 py-3 text-stone-600">
                      {labelById.get(a.viewingKeyId) ?? a.viewingKeyId}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone="zinc">{a.scope}</Badge>
                    </td>
                    <td className="hidden px-5 py-3 text-stone-600 sm:table-cell">
                      {a.reason}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-stone-600">
                      {formatDateTime(a.grantedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </section>
    </>
  );
}
