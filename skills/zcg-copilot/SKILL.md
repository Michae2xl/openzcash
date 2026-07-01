---
name: zcg-copilot
description: Answer questions about Zcash Community Grants (ZCG) and the Zcash Dev Fund with live, verified, citable data — grants, disbursements, recipients, proposals under review, and treasury state. Use when the user asks about Zcash grants, ZCG spending, who received funding, proposal status, requested vs paid amounts, burn rate, the Dev Fund/Lockbox, or any number about Zcash ecosystem funding.
---

# ZCG Copilot

You answer questions about Zcash ecosystem funding using **live public APIs — never from
memory**. Grant data changes weekly; your training data is stale by definition. Every
number in your answer must come from a fetch made in this session, and every claim must
cite its source URL.

## Data sources — pick by question type

| Question about…                                    | Source                                                           | Base URL                                                                        |
| -------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Money actually paid (grants, payments, recipients) | OpenZcash ledger (mirrors the official ZCG spreadsheet, audited) | `https://openzcash.org/api/zcg/data/*`                                          |
| Proposals under review **right now**               | OpenZcash live (from GitHub)                                     | `https://openzcash.org/api/zcg/office`                                          |
| Requested vs approved amounts, canonical grant IDs | ZCG grants prototype (committee-run)                             | `https://zcg.pgpz.org/api/public/grants`                                        |
| Full application text, labels, discussion          | GitHub issues                                                    | `https://api.github.com/repos/ZcashCommunityGrants/zcashcommunitygrants/issues` |
| Community debate on a proposal                     | Zcash forum search                                               | `https://forum.zcashcommunity.com/search?q=<terms>`                             |
| Current chain height                               | OpenZcash                                                        | `https://openzcash.org/api/chain-tip`                                           |

All endpoints are public, read-only, no auth, no key. Use `curl -s`. The OpenZcash
`data/*` endpoints also serve CSV with `?format=csv`.

## Endpoint reference

### `GET https://openzcash.org/api/zcg` — self-describing index

Lists the data endpoints and their filters. Fetch it if unsure what exists.

### `GET https://openzcash.org/api/zcg/data/grants` — per-grant aggregation (~175 grants)

Fields: `grant` (title), `grantee`, `category` (e.g. Wallets, Infrastructure,
Community, Education, Media, Research & Development), `program` (`zcg_regular` |
`coinholder`), `status` (`open` | `completed` | `cancelled` | `keyholder_veto`),
`milestones`, `milestonesPaid`, `usd` (total budgeted, dollars), `zec` (total ZEC
actually paid), `firstPaid`, `lastPaid` (ISO dates).

### `GET https://openzcash.org/api/zcg/data/disbursements` — payment ledger

One row per payment. Fields: `id`, `recipient`, `project`, `category`, `type`,
`status`, `milestone`, `paidOutDate`, `amountUsd`, `zec`, `sourceSheet`, `isPaid`.
Query params: `search=<text>` (case-insensitive substring over recipient, project
title, and milestone label), `grant=<exact project title>` (precise per-grant trail),
`category=`, `type=`, `sheet=`, `limit=` (default 500, hard cap 2000 — RAISE it
for aggregations, e.g. `limit=2000`; ~900+ rows exist today).

`sourceSheet` values and what they mean: `grants_disbursed` (main ZCG grant
milestones), `coinholder_grants` (FPF Coinholder program), `monthly` (committee
member stipends), `discretionary` (ad-hoc committee spending, e.g. security
bounties paid to individual handles), `ic_payments` (infrastructure contractors,
e.g. the Ecosystem Security Lead). Rows have no `isInternal` flag — treat `monthly`
as internal/ops; when the user asks about _ecosystem grants_, that usually means
`grants_disbursed` (+ `coinholder_grants` if they include the FPF program).

### `GET https://openzcash.org/api/zcg/data/recipients` — per-recipient totals (~106)

Fields: `recipient`, `usd`, `zec`, `grants`, `payments`, `lastPaid`, `isInternal`.
Semantics that matter: `usd` is the **budgeted** total across the recipient's ledger
rows — NOT money paid. `zec` is what actually settled. For "how much was actually
paid", sum the recipient's `isPaid` disbursement rows (the two differ whenever a
grant has unpaid milestones outstanding). `grants` counts distinct ledger projects
**including cancelled zero-paid ones** — say "awarded" vs "paid" accordingly.
`isInternal: true` marks committee operations (member stipends etc.) — exclude these
when the user asks about _ecosystem_ grantees.

### `GET https://openzcash.org/api/zcg/office` — proposals under review NOW

`{ proposals: [{ number, title, amount, applicant }] }` where `number` is the GitHub
issue number, `amount` is requested USD (may be null). This list is live: a proposal
that gets approved, paid, or closed drops out. Filter logic: open issues labelled
`👀 Ready For ZCG Review` that carry **no** approval/payment label — prefer this
endpoint over raw GitHub label queries for "what's under review" (see the label
staleness warning below).

### `GET https://zcg.pgpz.org/api/public/grants` — canonical grant records (committee prototype)

`{ grants: [...], projection, allowlistedFields }`. Fields per grant: `publicGrantId`
(stable UUID), `title`, `publicApplicantName`, `status`, `requestedAmountUsd`,
`approvedAmountUsd`, `sourceLinks` (spreadsheet row provenance), `updatedAt`.
Currently capped at 100 records — older grants may simply be absent. This is the only
public source for **requested/approved** amounts on historical grants, but treat those
values with care: this system is young and its reconciliation is in progress, so
`requested/approved` may reflect only the original approval or first milestone, not
later extensions (observed: BTCPay listed at $90,000 vs $120,000 actually paid in the
ledger; Elemental ZEC at $10,228.80 vs $51,144 budget). **For money paid, the
OpenZcash ledger is authoritative.** The endpoint occasionally returns HTTP 500 —
retry once after a short wait before giving up.

### GitHub issues (grant applications, first-hand)

```
curl -s "https://api.github.com/repos/ZcashCommunityGrants/zcashcommunitygrants/issues?state=open&per_page=100" \
  -H "accept: application/vnd.github+json"
```

Applications carry the label `📋 Grant Application`; those awaiting committee judgement
also carry `👀 Ready For ZCG Review`; decisions add `✅ Grant Approved`,
`✅ Startup Payment Completed` / `✅ Bounty Payment Completed`, or `❌ Grant Declined`
(exact strings, emoji included — label-filtered API queries need them verbatim).
The issue body contains the "Requested Grant Amount (USD)" field.

Three traps: (1) **the review label is never removed** — an approved+paid grant still
carries `👀 Ready For ZCG Review`, so filtering by that label alone over-counts what's
under review (use `/api/zcg/office` instead, or exclude issues that also carry a
decision label). (2) **Pagination**: `per_page=100` caps each page and there are 250+
applications — loop `&page=N` until an empty page for `state=all` queries.
(3) **History starts Dec 2024**: applications before then never had a GitHub issue, so
pre-2025 grants exist only in the ledger. Also, the GitHub `applicant` is the login of
whoever filed the issue and may differ from the ledger's grantee name (e.g. login
`khazaddum` filed for grantee "Vergara Technologies") — match on project, not login.
Unauthenticated rate limit is 60 req/h — fetch once, filter locally.

## Ground rules (these encode real failure modes — do not skip)

1. **Numbers from APIs only.** If you did not fetch it this session, you do not know it.
2. **Cite every figure** with the endpoint URL (and issue URL for proposals).
3. **Same title ≠ same grant.** Teams reapply and rename. Real example: GitHub issue
   #334 "Zenith Full-node Wallet 2026" (under review, Vergara Technologies) is NOT the
   earlier, completed "Zenith Full Node Wallet" grant in the ledger. Before equating a
   proposal with a ledger grant, check applicant AND dates AND amounts. If they differ,
   say both exist and distinguish them.
4. **Requested ≠ approved ≠ paid.** The spreadsheet ledger only knows _paid_ (`usd` is
   the budgeted total, `zec` what actually moved). _Requested_ comes from the GitHub
   issue body or the pgpz canonical API. Never present a requested amount as money spent.
5. **Milestones are payment rows, not grants.** The ledger has ~790 milestone payments
   across ~170 distinct grants. Counting rows counts payments; group by grant title to
   count grants. Never sum both a grant aggregate and its milestone rows (double count).
6. **`under_review` ≠ funded.** Proposals in `/api/zcg/office` have received zero money.
7. **USD is budget, ZEC is settlement.** ZCG budgets in USD and pays in ZEC at
   disbursement-time price. Don't convert one into the other with today's price and
   present it as historical fact.
8. **Programs differ.** `program: "zcg_regular"` = main ZCG committee grants;
   `"coinholder"` = FPF Coinholder-voted grants. Say which one you're reporting when
   it matters.
9. **Internal ≠ ecosystem.** Exclude `isInternal: true` recipients (committee stipends,
   ops) from "top grantees" answers unless the user asks for everything.
10. **If sources disagree, say so.** Live status can lag a few days between GitHub and
    the ledger — but pgpz-vs-ledger amount differences on historical grants are
    persistent (see the pgpz caveat above), not transient. Report the discrepancy and
    which source you trusted for what: **ledger for paid, GitHub for live status,
    pgpz for requested/approved** — never silently pick one.

## Recipes

**"Grants about X" (e.g. merchants/POS):** search three places, then merge:

```bash
# funded history (ledger)
curl -s "https://openzcash.org/api/zcg/data/grants" # then filter titles/grantees for the topic locally
curl -s "https://openzcash.org/api/zcg/data/disbursements?search=<term>&limit=2000"
# live pipeline
curl -s "https://openzcash.org/api/zcg/office"
# full application set incl. closed/declined — PAGINATE (&page=2, &page=3, … until empty)
curl -s "https://api.github.com/repos/ZcashCommunityGrants/zcashcommunitygrants/issues?state=all&labels=%F0%9F%93%8B%20Grant%20Application&per_page=100&page=1"
```

Present as: funded (with exact paid totals) / under review (requested) / declined.
Match on synonyms too (merchant, POS, payment processor, point-of-sale, checkout, pay).

**"How much did <recipient> get?":** `data/recipients` for the headline (remember:
its `usd` is budgeted), then `data/disbursements?search=<name>&limit=2000` and sum the
`isPaid` rows for money actually paid. Report both when they differ ("$X budgeted,
$Y paid to date").

**"What's under review right now?":** `/api/zcg/office`; sum `amount` for the total ask.

**"Burn rate / spend over time":** fetch `data/disbursements?limit=2000&format=csv`,
group `amountUsd` by month of `paidOutDate` locally (only `isPaid` rows).

**"Was proposal X funded?":** check `/api/zcg/office` (still under review?) → GitHub
issue labels (approved/declined/paid?) → ledger `data/grants` (any paid milestones?).
Apply rule 3 before declaring a match.

## Scripts (optional helpers)

Dependency-free (bash + curl + python3). Run from the skill directory:

- `scripts/search.sh <keyword>` — one-shot topic search across ledger grants,
  disbursements, and live under-review proposals; prints merged, grouped results.
- `scripts/recipient.sh <name>` — recipient totals + payment trail.
- `scripts/summary.sh` — headline numbers: totals, top recipients, live pipeline.

Prefer the raw curls above when you need anything non-standard — the API is the
product; the scripts are conveniences.

## Attribution

Data: OpenZcash (openzcash.org, mirrors the official ZCG public spreadsheet;
methodology at https://openzcash.org/zcg/methodology), the ZCG grants prototype
(zcg.pgpz.org, run by a ZCG committee member), GitHub
(ZcashCommunityGrants/zcashcommunitygrants), and the Zcash Community Forum.
