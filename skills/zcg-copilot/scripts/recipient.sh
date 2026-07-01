#!/usr/bin/env bash
# Recipient summary: totals + payment trail from the OpenZcash ledger.
# Usage: scripts/recipient.sh <name-or-fragment>
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: $0 <name-or-fragment>" >&2
  exit 1
fi

NAME="$*"
REC_JSON=$(curl -sf "https://openzcash.org/api/zcg/data/recipients")
DISB_JSON=$(curl -sf "https://openzcash.org/api/zcg/data/disbursements?limit=3000")

NAME="$NAME" python3 - "$REC_JSON" "$DISB_JSON" <<'PY'
import json, os, sys

name = os.environ["NAME"].lower()

def items(raw, *keys):
    d = json.loads(raw)
    if isinstance(d, list):
        return d
    for k in keys:
        if k in d:
            return d[k]
    return []

recs = items(sys.argv[1], "recipients", "items", "data")
disb = items(sys.argv[2], "disbursements", "items", "data")

matches = [r for r in recs if name in (r.get("recipient") or "").lower()]
if not matches:
    print(f"No recipient matching {name!r}. Try a shorter fragment.")
    sys.exit(0)

for r in matches:
    flag = " [internal/committee-ops]" if r.get("isInternal") else ""
    print(f"# {r['recipient']}{flag}")
    print(
        f"total ${r.get('usd', 0):,.0f} | {r.get('zec', 0):,.2f} ZEC | "
        f"{r.get('grants')} grants | {r.get('payments')} payments | last paid {r.get('lastPaid')}"
    )
    trail = [
        d
        for d in disb
        if (r.get("recipient") or "").lower() in (d.get("recipient") or "").lower()
    ]
    for d in sorted(trail, key=lambda d: d.get("paidOutDate") or "")[-15:]:
        print(
            f"- {d.get('paidOutDate')} | {d.get('project') or d.get('milestone') or d.get('type') or ''} | "
            f"${d.get('amountUsd', 0):,.2f} | {d.get('zec', 0):,.2f} ZEC"
        )
    if len(trail) > 15:
        print(f"  (showing last 15 of {len(trail)} payments)")
    print()

print("sources: https://openzcash.org/api/zcg/data/recipients + /api/zcg/data/disbursements")
PY
