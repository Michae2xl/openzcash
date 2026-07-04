# OpenZcash

**Public, verifiable transparency for the Zcash Dev Fund.** OpenZcash mirrors the
official Zcash Community Grants (ZCG) spreadsheet, audits it against the on-chain
Dev Fund Lockbox, and serves the result as dashboards, a read-only API, and an
agent skill — so anyone (or any AI) can ask where the money goes and get a cited
answer.

Live: **[openzcash.org](https://openzcash.org)**

> Read-only by design. The system never holds spend keys. On-chain reads use a
> public lightwalletd and viewing keys only.

## What's inside

- **Grants ledger** — the ZCG public spreadsheet, normalized into grants,
  milestones, payments and recipients, and reconciled milestone-by-milestone so
  totals can't silently drift.
- **On-chain Lockbox** — the Dev Fund pool value live from the chain tip
  (deterministic block-reward math + lightwalletd), cross-checked against the
  off-chain ledger.
- **Live pipeline** — proposals under review right now, read first-hand from the
  ZCG GitHub issue tracker.
- **Public API** — every figure available as JSON and CSV, no key required.
- **ZCG Copilot** — an [agent skill](skills/zcg-copilot) that turns any coding
  agent into a grounded grants copilot (see below).
- **ZCG Office** — a playful 3D room where each proposal under review walks the
  floor as a zebra.

## Public API

All read-only, public, no auth. Amounts are USD (dollars) and ZEC.

| Endpoint                          | Returns                                                                       |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `GET /api/zcg`                    | Self-describing index of the data endpoints                                   |
| `GET /api/zcg/data/grants`        | Per-grant aggregation (milestones, paid, status)                              |
| `GET /api/zcg/data/disbursements` | The payment ledger (filters: `search`, `grant`, `category`, `sheet`, `limit`) |
| `GET /api/zcg/data/recipients`    | Per-recipient totals                                                          |
| `GET /api/zcg/office`             | Proposals under review right now                                              |
| `GET /api/chain-tip`              | Current block height                                                          |

Append `?format=csv` to the `data/*` endpoints for CSV. Methodology:
[openzcash.org/zcg/methodology](https://openzcash.org/zcg/methodology).

## ZCG Copilot (agent skill)

```bash
npx skills add Michae2xl/openzcash --skill zcg-copilot
```

Ask your agent about grants, spending, recipients, and proposals under review;
answers come from the live API above with a citation on every figure, never from
the model's memory. BYO-LLM — no hosted service, no key. See
[`skills/zcg-copilot`](skills/zcg-copilot).

## Local development

Requires Node 20.9+ and Postgres.

```bash
cp .env.example .env.local   # fill in DATABASE_URL (the rest is optional)
npm install
npm run db:migrate           # apply the schema
npm run import-zcg           # mirror the ZCG spreadsheet into the DB
npm run dev                  # http://localhost:3000
```

The public read side needs only `DATABASE_URL` and a seeded ledger. Admin
features, treasury onboarding, and self-hosted node reads are all optional and
degrade gracefully when their env vars are unset (see `.env.example`).

```bash
npm run typecheck && npm test && npm run build
```

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Postgres + Drizzle ·
Tailwind · React Three Fiber (the 3D office) · deployed on Railway.

## Security model

- **Read-only.** No spend keys anywhere. Shielded reads use viewing keys; on-chain
  reads use a public lightwalletd.
- **Public by default, admin-gated writes.** Middleware stamps an unforgeable
  `x-admin` header; only management routes require a signed-in admin.
- **Secrets live only in `.env.local`** (gitignored). `.env.example` is names and
  placeholders only.

## License

MIT — see [LICENSE](LICENSE). Data is mirrored from the ZCG public spreadsheet,
the ZCG GitHub issue tracker, and the Zcash Community Forum.
