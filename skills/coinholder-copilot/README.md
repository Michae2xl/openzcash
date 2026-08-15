# coinholder-copilot

An [agent skill](https://skills.sh) that turns any coding agent (Claude Code, Cursor,
Codex, …) into a **pre-vote diligence copilot** for the Zcash Coinholder-Directed
Retroactive Grants Program (CDRGP): the open review round, each applicant's prior
funding history across ZCG and Coinholder rounds, repeat submissions, and what was
actually paid — grounded in live public APIs, with citations, instead of stale
training data.

## Why

CDRGP rounds are big (Q3 2026: 37 proposals asking $9.0M) and retroactive — the vote
is about work already done. Judging that means cross-referencing each applicant
against the audited payment ledger, prior round verdicts (rejections and late
submissions never show up in the ledger), and the application's own evidence. This
skill encodes where that data lives and the traps in it: announcement-vs-spreadsheet
drift, same-org multiple asks, third-party bonus nominations, and the keyholder veto
that already zeroed out one coinholder-approved $2.67M grant.

## Install

```bash
npx skills add Michae2xl/openzcash --skill coinholder-copilot
```

Add `-a claude-code` (or `cursor`, `codex`, …) to target a specific agent, `-g` for
global install.

## Ask things like

- "Run diligence on the Nozy Wallet proposal."
- "Who in this round already received grants before, and did they deliver?"
- "What are the round's key dates, and how does the ballot work?"
- "What has the Coinholder program actually paid out so far?"

## Data sources

- OpenZcash round mirror + ledger APIs (openzcash.org — mirrors the official ZCG
  public spreadsheet; methodology at https://openzcash.org/zcg/methodology)
- ZCG public spreadsheet, Coinholder proposals tab (prior rounds' verdicts)
- FPF GitHub (Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram)
- Zcash Community Forum (per-proposal threads)

## Scripts

- `scripts/round.sh` — the open round at a glance.
- `scripts/diligence.sh <name>` — one applicant's full picture.

Bash + curl + python3, no other dependencies.

## License

MIT — see [LICENSE](./LICENSE).
