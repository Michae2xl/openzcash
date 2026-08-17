# zechub-copilot

An [agent skill](https://skills.sh) that turns any coding agent (Claude Code, Cursor,
Codex, …) into a **copilot for ZecHub** — the community-owned Zcash education DAO. It
answers governance and treasury questions from live on-chain and public data, with
citations, instead of stale training data.

## Why

ZecHub decides its funding on-chain, and the rule that decides a vote is not the one
people assume. A proposal needs **67% of yes+no** _and_ **40% turnout** — so a clear
yes-majority can still lose. It has happened 25 times: proposal A116 died at 12 yes to
6 no (66.67%, one hundredth of a point short), and A166 died at 71.4% approval because
only 39.1% of members showed up. An agent that eyeballs the tally gets these wrong.

The treasury has the same shape of trap: three separate pots where the biggest one
isn't spendable working capital, a "Paid Out" total that covers one reporting period
while the payout rows are cumulative (they differ by $5,200), and milestones marked
`Complete` next to money still pending. This skill encodes where the data lives and
every trap in it.

## Install

```bash
npx skills add Michae2xl/openzcash --skill zechub-copilot
```

Add `-a claude-code` (or `cursor`, `codex`, …) to target a specific agent, `-g` for
global install.

## Ask things like

- "Did proposal A172 pass, and why?"
- "What is ZecHub voting on right now, and what does it still need to pass?"
- "How much can ZecHub actually spend?"
- "What has ZecHub paid contributors this year?"
- "Who are the DAO members?"
- "How much has ZCG granted ZecHub?"

## Data sources

- ZecHub treasury mirror (`openzcash.org/api/zechub/treasury`, refreshed every 6h)
- DAO DAO indexer + Juno LCD — proposals, votes, members, on-chain messages
- OpenZcash ZCG ledger — the grants that fund ZecHub itself
- ZecHub wiki and GitHub organization

All public and read-only. The skill never submits or votes.

## Scripts

- `scripts/proposal.sh <id>` — one proposal decided from first principles: quorum and
  threshold math, votes by name, verdict.
- `scripts/treasury.sh` — the three pots, what's spendable, payouts, and the paid-out
  reconciliation.
- `scripts/governance.sh` — members, what's open, recent outcomes, turnout.

Bash + curl + python3, no other dependencies.

## License

MIT — see [LICENSE](./LICENSE).
