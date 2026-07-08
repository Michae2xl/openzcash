# zcg-copilot

An [agent skill](https://skills.sh) that turns any coding agent (Claude Code, Cursor,
Codex, …) into a **Zcash Community Grants copilot**: ask about grants, spending,
recipients, proposals under review, requested vs paid amounts — and get answers grounded
in live public APIs, with citations, instead of stale training data.

## Why

Grant data changes weekly and lives in several places (the Grant Dashboard
spreadsheet, which is the source of truth, plus GitHub issues, the community
forum, and side tooling). LLMs answer questions
about it from memory — confidently and wrong. This skill wires your agent to the live
sources and encodes the domain's real failure modes (same-title collisions between
re-applications, requested-vs-paid confusion, milestone double-counting) so the answers
are right, current, and citable.

**BYO-LLM**: there is no hosted service and no API key. Your agent does the reasoning;
the skill provides the sources and the rules.

## Install

```bash
npx skills add Michae2xl/openzcash --skill zcg-copilot
```

Uses the [`skills`](https://github.com/vercel-labs/skills) CLI, which discovers
skills under the repo's `skills/` directory. Works with Claude Code, Cursor,
opencode, and the other agents it supports. You can also just copy this folder
into your agent's skills directory.

## Ask things like

- _"Find any grants having to do with tools for merchants to accept Zcash"_ — returns
  the funded history with exact paid totals AND what's under review right now.
- _"How much has ZCG paid to QEDIT, across how many grants?"_
- _"What proposals are under review and what's the combined ask?"_
- _"Was Zenith Full-node Wallet 2026 funded?"_ (a trap — there are two distinct
  Zenith items; the skill knows to distinguish them)
- _"What's the monthly burn rate this year?"_

## Data sources (all public, read-only, no auth)

- **OpenZcash** — https://openzcash.org — audited mirror of the official ZCG public
  spreadsheet + live on-chain Dev Fund data. JSON/CSV API under `/api/zcg/*`.
- **ZCG grants prototype** — https://zcg.pgpz.org — a committee member's side
  project exposing requested/approved amounts and stable IDs at
  `/api/public/grants` (supplementary; the spreadsheet remains authoritative).
- **GitHub** — `ZcashCommunityGrants/zcashcommunitygrants` issues (the applications
  themselves).
- **Zcash Community Forum** — discussion threads.

## Contents

- `SKILL.md` — the skill: source map, endpoint reference, ground rules, recipes.
- `scripts/search.sh <keyword…>` — topic search across funded + paid + under-review.
- `scripts/recipient.sh <name>` — recipient totals + payment trail.
- `scripts/summary.sh` — headline numbers.

Scripts are dependency-free (bash + curl + python3) and optional — the SKILL.md curl
recipes cover everything.

## License

MIT. Data attribution: OpenZcash (methodology: https://openzcash.org/zcg/methodology),
the ZCG grants prototype (zcg.pgpz.org), GitHub, and the Zcash Community Forum.
