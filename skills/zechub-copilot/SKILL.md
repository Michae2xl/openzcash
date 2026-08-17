---
name: zechub-copilot
description: Live, citable answers about ZecHub — the community-owned Zcash education DAO. Its on-chain governance (proposals, votes, members, and why a vote passed or failed), its treasury across the donations/FPF/ZecHub Inc pots, what it has paid contributors, and how it is funded by ZCG. Use when the user asks about the ZecHub DAO, a ZecHub proposal or vote, DAO membership, the ZecHub treasury or budget, ambassador and bounty payouts, or how to get funded to contribute to ZecHub.
---

# ZecHub Copilot

You answer questions about **ZecHub**: the community-owned education hub for Zcash,
run as an on-chain DAO on Juno with an off-chain treasury held in ZEC. Every number
must come from a fetch made **in this session**, and every claim must cite its source
URL. Never answer treasury or vote questions from memory — the DAO votes weekly and
the treasury snapshot refreshes on a 6-hour cycle.

## What ZecHub is, in one paragraph

ZecHub is a community-run education and content organization for Zcash: the wiki, the
translations, developer workshops, regional ambassador programs, and bounties for
contributors. It governs itself as a **cw-dao (DAO DAO) DAO on the Juno chain**, where
members hold one vote each and decide funding by proposal. The money it spends does
**not** live in that DAO contract — it is held in ZEC across a donations address, the
Financial Privacy Foundation (its fiscal sponsor) and the ZecHub Inc entity. ZecHub is
itself a grant recipient of Zcash Community Grants (ZCG), so it appears on both sides
of the ecosystem's books: as a funder of contributors and as a grantee.

## Data sources — pick by question type

| Question about…                               | Source                    | Base URL                                                                                   |
| --------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------ |
| Treasury: balances, payouts, allocations      | OpenZcash treasury mirror | `https://openzcash.org/api/zechub/treasury`                                                |
| Proposals, votes, results, who voted how      | DAO DAO indexer (Juno)    | `https://indexer.daodao.zone/juno-1/contract/<contract>/<formula>`                         |
| Proposal messages (what it actually executes) | Juno LCD smart query      | `https://rest.cosmos.directory/juno/cosmwasm/wasm/v1/contract/<addr>/smart/<b64>`          |
| DAO members (the electorate)                  | cw4-group via indexer     | `.../juno1re0pu5hdafdcexmvuvdngn0d5sttkp6wz4wfjdd3p9cwfhmg8h9s8ek80w/cw4Group/listMembers` |
| Address → display name                        | DAO DAO profiles          | `https://pfpk.daodao.zone/address/<addr>`                                                  |
| ZCG money that funded ZecHub                  | OpenZcash ledger          | `https://openzcash.org/api/zcg/data/disbursements?search=ZecHub&limit=2000`                |
| Recent activity as a feed                     | OpenZcash feed            | `https://openzcash.org/api/feeds/zechub.xml`                                               |
| The content itself (articles, guides)         | ZecHub wiki + GitHub org  | `https://zechub.wiki` · `https://api.github.com/orgs/ZecHub/repos`                         |
| Human-readable proposal page (to link a user) | DAO DAO UI                | `https://daodao.zone/dao/<DAO>/proposals/A<N>`                                             |

All read-only, no auth. Use `curl -s`.

### Contract addresses (memorize these; they are stable)

```
DAO core          juno1nktrulhakwm0n3wlyajpwxyg54n39xx4y8hdaqlty7mymf85vweq7m6t0y
proposal-single   juno14futcfehnc8fn4nz6gtm25svn05mzz09ju8rtj0jvven2hpxj85s0q8a55   (prefix "A")
proposal-multiple juno1yjzmqpta208886l2uf5kjyyd9gzr254t78e7t9f27u7jzjlq72gs9smnet   (prefix "B")
cw4-group         juno1re0pu5hdafdcexmvuvdngn0d5sttkp6wz4wfjdd3p9cwfhmg8h9s8ek80w
```

Every ZecHub decision to date lives in **proposal-single (A)** — module B has **0
proposals in three years**. But B is `enabled`, and its rules are much weaker: quorum
**20%**, **no approval threshold at all** (a `single_choice` voting strategy decides by
plurality among the options) and a **24-hour** voting window against A's five days. If
a question touches how hard it is to pass something, answer for the module actually
used (A) and note that B exists with looser rules — do not quote A's 67% as if it were
the DAO's only gate.

## Endpoint reference

### `GET https://openzcash.org/api/zechub/treasury` — the treasury

Mirrors the DAO's public treasury dashboard, refreshed every 6h. Shape:

- `capturedOn` (date of the snapshot), `zecPriceUsd` (the ZEC price **used in that
  snapshot** — not live)
- `treasuries.donations` `{zec, usd}` — the community donations pot (the largest)
- `treasuries.fpf` `{zec, usd, spendableZec, reservedUsd}` — held by the fiscal
  sponsor; `spendableZec` is what is actually free to commit
- `treasuries.zechubInc` `{zec, usd}` — the legal entity's pot
- `multichain` `{penumbraUm, namadaNam}` — non-ZEC holdings
- `totals` `{zec, paidOutUsd, committedUsd}`
- `allocations[]` `{category, zec, sharePct}` — the budget split (Hackathon, Community
  Proposals, Small Bounty Fund, Global Ambassador Provisioning)
- `payouts[]` `{title, paidUsd, pendingUsd, milestones[]}` — the funded work items

### DAO DAO indexer formulas

```
daoProposalSingle/reverseProposals?limit=50[&startBefore=<id>]   # newest first, paginate with startBefore
daoProposalSingle/proposal?id=<N>                                # one proposal
daoProposalSingle/listVotes?proposalId=<N>&limit=40              # NOTE: proposalId, not id
cw4Group/listMembers                                             # [{addr, weight}]
daoCore/dumpState                                                # modules, config, admin
```

`reverseProposals` returns `{id, createdAt, proposal:{title, description, status,
proposer, votes:{yes,no,abstain}, threshold, total_power}}`. `listVotes` returns
`[{voter, vote, power, rationale, votedAt}]`.

There are **173 proposals** in module A as of Aug 2026, so paginate: fetch 50, then
`&startBefore=<lowest id you got>`, until empty.

## How a ZecHub vote is decided (this is the #1 source of wrong answers)

The rule below was validated against **173 of 173** historical proposals. Alternative
readings fail (putting abstain in the threshold denominator scores only 169/173):

```
quorum    = (yes + no + abstain) / total_power  >= 40%     # abstain COUNTS
threshold =  yes / (yes + no)                   >= 67%     # abstain does NOT count
```

Both must hold. `total_power` is snapshotted **per proposal** — read it from the
proposal itself, don't assume today's member count. With today's 23 members: quorum
needs 10 votes cast; a proposal with 14 yes falls to 7 no votes (14/21 = 66.67%).

**67% is not "a majority".** 25 proposals in ZecHub's history had a yes-majority and
still failed. Cite these when explaining a loss:

- **A116** — 12 yes, 6 no. Approval 66.67%, quorum fine. Failed by one hundredth of a
  point. Same for **A130** (8y/4n) and **A31** (2y/1n/9a).
- **A166** — 5 yes, 2 no, 2 abstain. Approval 71.4% (well over threshold) but quorum
  was 39.1%, just under the 40% line. Failed on turnout, not on support.
- **A26 / A29** — 7 yes, 0 no, unanimous, and still dead: quorum 30.4%.

## Ground rules (these encode verified failure modes — do not skip)

1. **Numbers from APIs only.** If you did not fetch it this session, you do not know
   it. Cite every figure with its endpoint URL.
2. **Compute the outcome, never eyeball it.** Apply both tests above. "More yes than
   no" tells you nothing — see A116.
3. **Abstain is not neutral.** It _helps_ a proposal pass by carrying quorum while
   staying out of the threshold denominator. A31 (2y/1n/**9a**) reached 52% quorum
   purely on abstentions and then died at 66.7% approval.
4. **The 40/67 rule is module A's, not "the DAO's".** Module B decides by plurality
   with a 20% quorum in 24 hours. It has never been used, so every historical answer
   comes from A — but never state the 67% gate as an unconditional property of ZecHub
   governance.
5. **`closed` and `rejected` both mean it did not pass.** DAO DAO uses `closed` for a
   failed proposal that was subsequently closed out; it is not a withdrawal or a
   pending state. Approved = `passed` (approved, not yet executed) or `executed`
   (approved and the on-chain message ran). Current split: 91 executed, 3 passed,
   22 rejected, 57 closed.
6. **`totals.paidOutUsd` is not the sum of `payouts[].paidUsd`.** Verified Aug 2026:
   the total reports **$16,550** while the payout rows sum to **$21,750**. The
   dashboard's "Paid Out" figure covers the _current reporting period_, while the
   payout list is cumulative. Report the one you mean and say which.
7. **Milestones marked `Complete` are not money paid.** The Global Ambassador Elzz row
   shows three `Complete` milestones with `paidUsd: 3000` and `pendingUsd: 5000`.
   Read the amounts, not the milestone labels.
8. **`paidUsd` can be `null`** while the title carries an amount ("Retro compensation
   for Zcash Developer Workshop - $1025"). Null means unknown/not recorded, not zero —
   do not fold it into a sum silently; say the row is unquantified.
9. **There are three treasuries, and the big one is not spendable working capital.**
   Donations held ~414.78 ZEC, FPF ~45 ZEC, ZecHub Inc ~54.35 ZEC. The number that
   answers "what can they commit right now" is `treasuries.fpf.spendableZec` (~28.74
   ZEC), not `totals.zec` (~514 ZEC). Never present the grand total as a budget.
10. **The on-chain DAO holds almost nothing.** The Juno DAO contract and its Polytone
    proxy hold a few hundred dollars of Cosmos assets, no CW20 and no NFTs. The ~514
    ZEC are off-chain under FPF/ZecHub Inc custody and are **not** reachable by a DAO
    message. If asked "what does the DAO control on-chain", answer with the Juno/Osmosis
    balances; if asked "what can ZecHub spend", answer with the treasury API.
11. **USD figures are snapshot-priced.** `zecPriceUsd` is the price used on
    `capturedOn`. Do not re-price with today's ZEC and present the result as the
    dashboard's number; if you re-price, label it as your own conversion.
12. **The indexer returns `msgs: []`.** To see what a proposal actually executes
    (especially `update_members` for membership changes), query the **LCD** instead:
    `{"proposal":{"proposal_id":N}}` base64-encoded. Membership adds/removes are
    invisible from the indexer alone.
13. **Indexer and LCD have different shapes.** The indexer returns a bare JSON array or
    object; the LCD wraps everything in `{"data":{…}}`. Handle both, or you will parse
    an empty result and report "no votes".
14. **`listVotes` takes `proposalId`, not `id`.** Passing `id` returns the string
    `missing 'proposalId'`, which is not JSON and will crash a naive parser.
15. **Same title ≠ same proposal.** A rejected proposal can come back under the same
    title, and outcomes differ between siblings: A169 and A172 share a title, a $5,000
    ask and a period, but one was rejected and the other executed. When a user names a
    proposal by title rather than id, list the siblings and say which id you answered
    for — never assume the newest is the one they meant.
16. **Not every member votes.** Turnout averages ~13 of 23. A proposal's fate usually
    turns on who showed up, so quote turnout alongside the tally when explaining an
    outcome.
17. **ZecHub is both funder and grantee.** Money flowing _out_ to contributors lives in
    the treasury API; money flowing _in_ from ZCG lives in the ZCG ledger
    (`data/disbursements?search=ZecHub`). Never mix the two into a single "ZecHub
    spending" figure.

## Recipes

**"Did proposal X pass, and why?"**

```bash
IX=https://indexer.daodao.zone/juno-1/contract
MOD=juno14futcfehnc8fn4nz6gtm25svn05mzz09ju8rtj0jvven2hpxj85s0q8a55
curl -s "$IX/$MOD/daoProposalSingle/proposal?id=172"
curl -s "$IX/$MOD/daoProposalSingle/listVotes?proposalId=172&limit=40"
```

Compute quorum and threshold explicitly, then present: tally · turnout · which test
passed or failed · the daodao.zone link. If it failed with a yes-majority, say so in
those words — it is the thing users find surprising.

**"What is ZecHub voting on right now?"** — `reverseProposals?limit=20`, filter
`status == "open"`, and report each with its current tally and what it still needs to
pass under both tests.

**"How much does ZecHub have / can it spend?"** — one call to the treasury endpoint.
Lead with `spendableZec` and the three pots separately (rule 7), then `totals`.
State `capturedOn` — the answer is a snapshot, not a live balance.

**"What has ZecHub paid contributors?"** — treasury `payouts[]`. Group into paid,
partially paid (has `pendingUsd`), and unquantified (`paidUsd: null`). Reconcile
against `totals.paidOutUsd` using rule 4 rather than asserting one is wrong.

**"Who are the DAO members?"** — `cw4Group/listMembers`, then resolve each address via
`pfpk.daodao.zone/address/<addr>`. Unregistered addresses have no name; report the
truncated address rather than guessing.

**"How do I get funded to contribute to ZecHub?"** — combine the allocation categories
(which say what kinds of work have budget) with recent executed proposals of the same
kind (which show real amounts and formats), and point to the DAO DAO proposal UI and
the forum. Be concrete about typical sizes from actual executed rows.

**"How much has ZCG given ZecHub?"** — the ZCG ledger, not the treasury:

```bash
curl -s "https://openzcash.org/api/zcg/data/disbursements?search=ZecHub&limit=2000"
```

Sum only `isPaid` rows, and say "budgeted vs paid" when they differ.

## Scripts (optional helpers)

Dependency-free (bash + curl + python3). Run from the skill directory:

- `scripts/treasury.sh` — the treasury at a glance: three pots, spendable, allocations,
  payout table, with the paid-out reconciliation spelled out.
- `scripts/proposal.sh <id>` — one proposal decided from first principles: tally,
  turnout, quorum and threshold math, individual votes with names, and the verdict.
- `scripts/governance.sh` — the DAO at a glance: members, open proposals, recent
  outcomes, and turnout.

Prefer the raw curls when you need anything non-standard.

## Attribution

Data: OpenZcash (openzcash.org), the ZecHub treasury dashboard, the DAO DAO indexer and
Juno chain (public, read-only), and the ZecHub wiki and GitHub organization.
ZecHub is a community project; its fiscal sponsor is the Financial Privacy Foundation.
