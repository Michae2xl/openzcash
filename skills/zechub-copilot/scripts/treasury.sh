#!/usr/bin/env bash
# The ZecHub treasury at a glance: the three pots, what is actually spendable,
# the budget allocations, the payout table, and the paid-out reconciliation.
# Usage: scripts/treasury.sh
set -euo pipefail

DATA=$(curl -sf "https://openzcash.org/api/zechub/treasury")

python3 - "$DATA" <<'PY'
import json, sys

d = json.loads(sys.argv[1])
if not d.get("ok"):
    sys.exit(f"treasury endpoint returned: {d}")

t, tot = d["treasuries"], d["totals"]
print(f"# ZecHub treasury — snapshot of {d['capturedOn']} (ZEC valued at ${d['zecPriceUsd']:,.2f})")
print()
print("## the three pots (they are NOT one budget)")
don, fpf, inc = t["donations"], t["fpf"], t["zechubInc"]
print(f"  donations    {don['zec']:>10,.2f} ZEC   ${don['usd']:>12,.2f}")
print(f"  FPF          {fpf['zec']:>10,.2f} ZEC   ${fpf['usd']:>12,.2f}"
      f"   spendable {fpf['spendableZec']:,.2f} ZEC · reserved ${fpf['reservedUsd']:,.2f}")
print(f"  ZecHub Inc   {inc['zec']:>10,.2f} ZEC   ${inc['usd']:>12,.2f}")
print(f"  {'':12}{'-'*10}")
print(f"  total        {tot['zec']:>10,.2f} ZEC")
print()
print(f"  => what ZecHub can commit right now is FPF spendable: {fpf['spendableZec']:,.2f} ZEC")
print(f"     (~${fpf['spendableZec'] * d['zecPriceUsd']:,.2f} at the snapshot price), NOT the total.")
mc = d.get("multichain") or {}
if any(mc.values()):
    print(f"  also held: {mc.get('penumbraUm', 0):,.2f} UM (Penumbra) · {mc.get('namadaNam', 0):,.0f} NAM (Namada)")
print()

print("## budget allocations")
for a in d["allocations"]:
    print(f"  {a['category']:<34} {a['zec']:>7,.2f} ZEC   {a['sharePct']:>5.2f}%")
print()

payouts = d["payouts"]
paid = sum(p["paidUsd"] or 0 for p in payouts)
pending = sum(p["pendingUsd"] or 0 for p in payouts)
unquantified = [p for p in payouts if p["paidUsd"] is None]

print(f"## payouts ({len(payouts)} funded work items)")
for p in payouts:
    pd = f"${p['paidUsd']:,.2f}" if p["paidUsd"] is not None else "  (not recorded)"
    pn = f"${p['pendingUsd']:,.2f}" if p["pendingUsd"] else "—"
    ms = "/".join(m[0] for m in (p["milestones"] or [])) or "—"
    print(f"  paid {pd:>15}   pending {pn:>12}   [{ms}]  {p['title'][:52]}")
print()

print("## reconciliation (read this before quoting a 'total paid')")
print(f"  sum of payouts[].paidUsd     ${paid:,.2f}   <- cumulative, all periods")
print(f"  totals.paidOutUsd            ${tot['paidOutUsd']:,.2f}   <- the dashboard's current reporting period")
if abs(paid - tot["paidOutUsd"]) > 0.01:
    print(f"  they differ by               ${abs(paid - tot['paidOutUsd']):,.2f} — this is expected, not an error.")
    print("  Say which one you mean; never present them as the same number.")
print()
print(f"  sum of payouts[].pendingUsd  ${pending:,.2f}")
print(f"  totals.committedUsd          ${tot['committedUsd']:,.2f}")
if unquantified:
    print(f"  {len(unquantified)} row(s) have paidUsd = null (amount only in the title) and are in NO sum:")
    for p in unquantified:
        print(f"     · {p['title'][:66]}")
print()
print("source: https://openzcash.org/api/zechub/treasury")
print(f"Snapshot dated {d['capturedOn']} — not a live balance. Refreshes on a 6h cycle.")
PY
