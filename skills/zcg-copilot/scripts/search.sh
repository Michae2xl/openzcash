#!/usr/bin/env bash
# One-shot topic search across the ZCG funding data:
#   funded grants (ledger) + payment ledger + proposals under review right now.
# Usage: scripts/search.sh <keyword> [keyword2 ...]   (keywords are OR-matched)
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: $0 <keyword> [keyword2 ...]" >&2
  exit 1
fi

TERMS="$*"
GRANTS_JSON=$(curl -sf "https://openzcash.org/api/zcg/data/grants")
DISB_JSON=$(curl -sf "https://openzcash.org/api/zcg/data/disbursements?limit=2000")
OFFICE_JSON=$(curl -sf "https://openzcash.org/api/zcg/office")

TERMS="$TERMS" python3 - "$GRANTS_JSON" "$DISB_JSON" "$OFFICE_JSON" <<'PY'
import json, os, re, sys

terms = [t.lower() for t in os.environ["TERMS"].split()]
# Word-start matching: "pos" hits "POS" but not "proPOSal"; "payment" hits "payments".
patterns = [re.compile(r"\b" + re.escape(t)) for t in terms]
def hit(*fields):
    blob = " ".join(str(f or "") for f in fields).lower()
    return any(p.search(blob) for p in patterns)

def items(raw, *keys):
    d = json.loads(raw)
    if isinstance(d, list):
        return d
    for k in keys:
        if k in d:
            return d[k]
    return []

grants = items(sys.argv[1], "grants", "items", "data")
disb = items(sys.argv[2], "disbursements", "items", "data")
office = items(sys.argv[3], "proposals")

print(f"# Topic search: {' OR '.join(terms)}")
print()

g = [x for x in grants if hit(x.get("grant"), x.get("grantee"), x.get("category"))]
print(f"## Funded grants in the ledger ({len(g)})")
for x in sorted(g, key=lambda x: -(x.get("usd") or 0)):
    print(
        f"- {x['grant']} — {x['grantee']} | program {x.get('program')} | "
        f"status {x.get('status')} | ${x.get('usd', 0):,.0f} budgeted | "
        f"{x.get('zec', 0):,.2f} ZEC paid | milestones {x.get('milestonesPaid')}/{x.get('milestones')} | "
        f"first {x.get('firstPaid')} last {x.get('lastPaid')}"
    )
print("  source: https://openzcash.org/api/zcg/data/grants")
print()

d = [x for x in disb if hit(x.get("recipient"), x.get("project"), x.get("milestone"))]
paid = sum(x.get("amountUsd") or 0 for x in d if x.get("isPaid"))
print(f"## Matching ledger payments ({len(d)} rows, ${paid:,.0f} paid)")
for x in sorted(d, key=lambda x: x.get("paidOutDate") or "")[-12:]:
    print(
        f"- {x.get('paidOutDate')} | {x.get('recipient')} | {x.get('project') or x.get('milestone') or ''} | "
        f"${x.get('amountUsd', 0):,.2f} | {x.get('zec', 0):,.2f} ZEC"
    )
if len(d) > 12:
    print(f"  (showing last 12 of {len(d)})")
print("  source: https://openzcash.org/api/zcg/data/disbursements?search=...")
print()

o = [x for x in office if hit(x.get("title"), x.get("applicant"))]
print(f"## Under review RIGHT NOW ({len(o)})")
for x in o:
    amt = f"${x['amount']:,}" if x.get("amount") is not None else "n/a"
    print(
        f"- #{x['number']} {x['title']} — @{x.get('applicant')} | requested {amt} | "
        f"https://github.com/ZcashCommunityGrants/zcashcommunitygrants/issues/{x['number']}"
    )
print("  source: https://openzcash.org/api/zcg/office")
PY
