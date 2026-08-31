/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  recipientTotals,
  type RecipientTotal,
} from "@/lib/zcg/disbursements-repo";
import { cached, LEDGER_TTL_MS } from "@/lib/cache/memo";
import {
  MEMBERS,
  OFFICIAL_LEDGER_URL,
  type FactTone,
  type LedgerFact,
  type Member,
} from "./current-committee-data";

/**
 * The ZCG committee seated from July 2026: the June 2026 cohort (terms to
 * June 2027) plus the December 2025 cohort (terms to December 2026). Each
 * member links to their official Zcash Community Forum profile, shown with
 * their real forum avatar (mirrored locally under /committee) ringed by their
 * cohort colour.
 *
 * Profile tags are narrow, source-linked facts: a public role, project, alias,
 * or election record. They are not assessments of a member. Ledger tags are a
 * separate layer derived from the same imported ZCG ledger used by
 * /zcg/recipients. Member-to-recipient bindings are deliberately curated: a
 * missing exact-name/known-alias match does not mean no relationship exists.
 */

const FACT_STYLE: Record<FactTone, string> = {
  current:
    "bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100",
  past: "bg-stone-100 text-stone-700 ring-stone-200 hover:bg-stone-200",
  identity: "bg-sky-50 text-sky-800 ring-sky-200 hover:bg-sky-100",
};

const LEDGER_FACT_STYLE: Record<LedgerFact["tone"], string> = {
  open: "bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100",
  history: "bg-sky-50 text-sky-800 ring-sky-200 hover:bg-sky-100",
};

// All five hold active seats — every member gets the emerald "seated" ring.
const RING = "from-emerald-300 to-emerald-500";

function ForumGlyph() {
  const cls = "h-3 w-3";
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.03 2 11c0 2.79 1.4 5.28 3.6 6.93V22l3.93-2.16c.79.2 1.62.31 2.47.31 5.523 0 10-4.03 10-9S17.523 2 12 2z" />
    </svg>
  );
}

function MemberCard({
  m,
  record,
  ledgerAvailable,
}: {
  m: Member;
  record?: RecipientTotal;
  ledgerAvailable: boolean;
}) {
  const hasGrantHistory = (record?.grantCount ?? 0) > 0;
  const hasPublicLedgerHistory =
    record != null &&
    (record.externalUsdCents > 0n || record.externalZecZat > 0n);

  return (
    <article className="group flex h-full flex-col rounded-xl border border-stone-200/80 bg-white p-3 transition-colors hover:border-amber-300/70">
      <div className="flex items-start gap-3">
        <a
          href={m.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`${m.name} on Zcash Community Forum`}
          className="relative shrink-0"
        >
          <span
            className={cn(
              "block rounded-full bg-gradient-to-br p-[2.5px] shadow-sm transition-transform duration-200 group-hover:scale-105",
              RING,
            )}
          >
            <img
              src={m.img}
              alt={m.name}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full border-2 border-white object-cover"
            />
          </span>
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm transition-colors group-hover:text-amber-700">
            <ForumGlyph />
          </span>
        </a>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <a
              href={m.url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm font-semibold text-stone-900 group-hover:text-amber-700"
            >
              {m.name}
            </a>
            <span className="tnum shrink-0 text-[11px] font-medium text-stone-600">
              {m.term}
            </span>
          </div>
          <div
            className="mt-1.5 flex flex-wrap gap-1"
            aria-label={`${m.name} source-linked public facts`}
          >
            {m.facts.map((fact) => (
              <a
                key={fact.label}
                href={fact.source}
                target="_blank"
                rel="noreferrer"
                title={`Source: ${fact.sourceLabel}`}
                aria-label={`${fact.label} — source: ${fact.sourceLabel}`}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset transition-colors",
                  FACT_STYLE[fact.tone],
                )}
              >
                {fact.label} ↗
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto min-h-[58px] border-t border-stone-100 pt-2.5">
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-500">
          Official ledger
        </p>
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-wrap gap-1">
            {record && m.ledger ? (
              <>
                {hasGrantHistory ? (
                  <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800 ring-1 ring-inset ring-sky-200">
                    {record.grantCount} grant projects
                  </span>
                ) : hasPublicLedgerHistory ? (
                  <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800 ring-1 ring-inset ring-sky-200">
                    Public ledger history
                  </span>
                ) : null}
                {m.ledger.relation === "organization" ? (
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                    grant-linked org · {m.ledger.relationLabel}
                  </span>
                ) : null}
              </>
            ) : m.ledger && !ledgerAvailable ? (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                Ledger temporarily unavailable
              </span>
            ) : (
              <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600 ring-1 ring-inset ring-stone-200">
                No external ledger match
              </span>
            )}
            {m.ledgerFacts?.map((fact) => (
              fact.href ? (
                <Link
                  key={fact.label}
                  href={fact.href}
                  aria-label={`${m.name}: ${fact.label} — open OpenZcash ledger record`}
                  title={`Open OpenZcash record · source: ${fact.sourceLabel}`}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset transition-colors",
                    LEDGER_FACT_STYLE[fact.tone],
                  )}
                >
                  {fact.label} →
                </Link>
              ) : (
                <a
                  key={fact.label}
                  href={fact.source}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${m.name}: ${fact.label} — source: ${fact.sourceLabel}`}
                  title={`Source: ${fact.sourceLabel}`}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset transition-colors",
                    LEDGER_FACT_STYLE[fact.tone],
                  )}
                >
                  {fact.label} ↗
                </a>
              )
            ))}
          </div>
          {record && m.ledger ? (
            <Link
              href={`/zcg/recipient?r=${encodeURIComponent(record.recipientKey)}`}
              className="shrink-0 text-[10px] font-semibold text-amber-700 hover:text-amber-900"
            >
              Open record →
            </Link>
          ) : (
            <a
              href={OFFICIAL_LEDGER_URL}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-[10px] font-semibold text-stone-500 hover:text-amber-800"
            >
              Open source ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export async function CurrentCommittee() {
  const recipients = await cached(
    "recipientTotals",
    LEDGER_TTL_MS,
    recipientTotals,
  ).catch(() => null);
  const recordsByName = new Map(
    (recipients ?? []).map((r) => [r.recipientName.toLowerCase(), r]),
  );

  return (
    <section className="mb-8" data-testid="current-committee">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-700">
          Current committee
        </h2>
        <span className="text-xs font-medium text-stone-600">
          5 seats · from July 2026
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {MEMBERS.map((m) => (
          <MemberCard
            key={m.name}
            m={m}
            ledgerAvailable={recipients !== null}
            record={
              m.ledger
                ? recordsByName.get(m.ledger.recipient.toLowerCase())
                : undefined
            }
          />
        ))}
      </div>

      <p className="mt-3 text-xs text-stone-600">
        All five hold active seats · profile tags link to public sources. Ledger
        matching uses exact names and known aliases; no match is not proof that
        no relationship exists, and no tag is a conflict-of-interest verdict.
      </p>
    </section>
  );
}
