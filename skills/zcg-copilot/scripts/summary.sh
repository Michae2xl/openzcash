#!/usr/bin/env bash
# Headline numbers: ledger totals, top ecosystem recipients, live pipeline.
# Usage: scripts/summary.sh
set -euo pipefail

GRANTS_JSON=$(curl -sf "https://openzcash.org/api/zcg/data/grants")
REC_JSON=$(curl -sf "https://openzcash.org/api/zcg/data/recipients")
OFFICE_JSON=$(curl -sf "https://openzcash.org/api/zcg/office")

python3 - "$GRANTS_JSON" "$REC_JSON" "$OFFICE_JSON" <<'PY'
import json, sys

def items(raw, *keys):
    d = json.loads(raw)
    if isinstance(d, list):
        return d
    for k in keys:
        if k in d:
            return d[k]
    return []

grants = items(sys.argv[1], "grants", "items", "data")
recs = items(sys.argv[2], "recipients", "items", "data")
office = items(sys.argv[3], "proposals")

usd = sum(g.get("usd") or 0 for g in grants)
zec = sum(g.get("zec") or 0 for g in grants)
print("# ZCG funding at a glance")
print(f"- grants in ledger: {len(grants)} | ${usd:,.0f} budgeted | {zec:,.2f} ZEC paid")
for prog in ("zcg_regular", "coinholder"):
    p = [g for g in grants if g.get("program") == prog]
    if p:
        print(f"  - {prog}: {len(p)} grants | ${sum(g.get('usd') or 0 for g in p):,.0f}")

eco = [r for r in recs if not r.get("isInternal")]
print(f"- recipients: {len(recs)} total ({len(eco)} ecosystem, {len(recs) - len(eco)} internal/ops)")
print("- top 5 ecosystem recipients:")
for r in sorted(eco, key=lambda r: -(r.get("usd") or 0))[:5]:
    print(f"  - {r['recipient']}: ${r.get('usd', 0):,.0f} across {r.get('grants')} grants")

ask = sum(p.get("amount") or 0 for p in office)
print(f"- under review right now: {len(office)} proposals asking ${ask:,.0f} combined")
print()
print("sources: openzcash.org/api/zcg/data/{grants,recipients} + /api/zcg/office")
PY
