#!/usr/bin/env bash
# One applicant's full diligence picture:
#   entry in the open round + prior Coinholder verdicts + ZCG ledger history
#   + actual payment trail.
# Usage: scripts/diligence.sh <name or keyword> [keyword2 ...]  (OR-matched)
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: $0 <name or keyword> [keyword2 ...]" >&2
  exit 1
fi

SHEET_CSV_URL="https://docs.google.com/spreadsheets/d/1FQ28rDCyRW0TiNxrm3rgD8ai2KGUsXAjPieQmI1kKKg/export?format=csv&gid=1847584751"

TERMS="$*"
ROUND_JSON=$(curl -sf "https://openzcash.org/api/zcg/coinholder/round")
GRANTS_JSON=$(curl -sf "https://openzcash.org/api/zcg/data/grants")
RECIP_JSON=$(curl -sf "https://openzcash.org/api/zcg/data/recipients")
DISB_JSON=$(curl -sf "https://openzcash.org/api/zcg/data/disbursements?limit=2000")
PRIOR_CSV=$(curl -sfL "$SHEET_CSV_URL")

TERMS="$TERMS" PRIOR_CSV="$PRIOR_CSV" python3 - "$ROUND_JSON" "$GRANTS_JSON" "$RECIP_JSON" "$DISB_JSON" <<'PY'
import csv, io, json, os, sys

terms = [t.lower() for t in os.environ["TERMS"].split()]
def hit(*fields):
    blob = " ".join(str(f or "") for f in fields).lower()
    return any(t in blob for t in terms)

def items(raw, *keys):
    d = json.loads(raw)
    if isinstance(d, list):
        return d
    for k in keys:
        if k in d:
            return d[k]
    return []

rnd = json.loads(sys.argv[1])
grants = items(sys.argv[2], "data", "grants")
recips = items(sys.argv[3], "data", "recipients")
disb = items(sys.argv[4], "data", "disbursements")
prior = list(csv.DictReader(io.StringIO(os.environ["PRIOR_CSV"])))

print(f"# Diligence: {' OR '.join(terms)}")
print()

m = [p for p in rnd["proposals"] if hit(p["project"], p["org"], p["summary"])]
print(f"## In the open round ({rnd['round']['label']}) — {len(m)} match(es)")
for p in m:
    print(f"- #{p['rank']} {p['project']} — {p['org']} | ${p['requestedUsd']:,.2f} requested | band {p['band']}")
    print(f"    {p['summary']}")
    print(f"    thread: {p['threadUrl']}")
    print(f"    github: {p['githubUrl']}")
print("  source: https://openzcash.org/api/zcg/coinholder/round")
print()

pm = [q for q in prior if hit(q.get("Proposal Title ", ""), q.get("Applicant(s)", ""))]
print(f"## Prior Coinholder submissions ({len(pm)})")
for q in pm:
    title = (q.get("Proposal Title ", "") or "").strip()
    print(
        f"- {q.get('Date Submitted', '?')} | {title} — {(q.get('Applicant(s)', '') or '').strip()} | "
        f"{q.get('USD Amount', '?')} | verdict: {(q.get('Approved / Rejected / Withdrawn', '') or '?').strip()}"
    )
print("  source: ZCG sheet, Coinholder proposals tab (gid=1847584751)")
print()

gm = [g for g in grants if hit(g.get("grant"), g.get("grantee"))]
print(f"## ZCG ledger grants ({len(gm)})")
for g in sorted(gm, key=lambda x: -(x.get("usd") or 0)):
    print(
        f"- {g['grant']} — {g['grantee']} | program {g.get('program')} | status {g.get('status')} | "
        f"${g.get('usd') or 0:,.0f} budgeted | {g.get('zec') or 0:,.2f} ZEC paid | "
        f"milestones {g.get('milestonesPaid')}/{g.get('milestones')}"
    )
rm = [r for r in recips if hit(r.get("recipient"))]
for r in rm:
    print(
        f"- RECIPIENT TOTAL: {r['recipient']} | ${r.get('usd') or 0:,.0f} budgeted | "
        f"{r.get('zec') or 0:,.2f} ZEC settled | {r.get('grants')} grants | {r.get('payments')} payments"
    )
if not gm and not rm:
    print("- No public ZCG/Coinholder ledger history (a finding, not an error — see rule 9).")
print("  source: https://openzcash.org/api/zcg/data/grants · /api/zcg/data/recipients")
print()

dm = [x for x in disb if hit(x.get("recipient"), x.get("project"), x.get("milestone"))]
paid = sum(x.get("amountUsd") or 0 for x in dm if x.get("isPaid"))
print(f"## Payment trail ({len(dm)} rows, ${paid:,.0f} actually paid)")
for x in sorted(dm, key=lambda x: x.get("paidOutDate") or "")[-10:]:
    print(
        f"- {x.get('paidOutDate')} | {x.get('recipient')} | {x.get('project') or x.get('milestone') or ''} | "
        f"${x.get('amountUsd') or 0:,.2f} | {x.get('zec') or 0:,.2f} ZEC | sheet {x.get('sourceSheet')}"
    )
if len(dm) > 10:
    print(f"  (showing last 10 of {len(dm)})")
print("  source: https://openzcash.org/api/zcg/data/disbursements?search=...&limit=2000")
PY
