#!/usr/bin/env bash
# One ZecHub DAO proposal, decided from first principles: tally, turnout, the quorum
# and threshold math, every individual vote with a display name, and the verdict.
# Usage: scripts/proposal.sh <proposal-id>        e.g. scripts/proposal.sh 172
set -euo pipefail

ID="${1:?usage: proposal.sh <proposal-id>}"
IX="https://indexer.daodao.zone/juno-1/contract"
MOD="juno14futcfehnc8fn4nz6gtm25svn05mzz09ju8rtj0jvven2hpxj85s0q8a55"
CW4="juno1re0pu5hdafdcexmvuvdngn0d5sttkp6wz4wfjdd3p9cwfhmg8h9s8ek80w"
DAO="juno1nktrulhakwm0n3wlyajpwxyg54n39xx4y8hdaqlty7mymf85vweq7m6t0y"

PROP=$(curl -sf "$IX/$MOD/daoProposalSingle/proposal?id=$ID")
VOTES=$(curl -sf "$IX/$MOD/daoProposalSingle/listVotes?proposalId=$ID&limit=60")
MEMBERS=$(curl -sf "$IX/$CW4/cw4Group/listMembers" || echo '[]')

# Resolve voter addresses to display names (best effort; unregistered stay truncated).
NAMES=""
for addr in $(printf '%s' "$VOTES" | python3 -c "
import json,sys
d=json.load(sys.stdin)
v=d if isinstance(d,list) else d.get('data',{}).get('votes',[])
print('\n'.join(x['voter'] for x in v))
"); do
  n=$(curl -sf "https://pfpk.daodao.zone/address/$addr" 2>/dev/null \
      | python3 -c "import json,sys;print(json.load(sys.stdin).get('name') or '')" 2>/dev/null || true)
  NAMES="${NAMES}${addr}|${n}
"
done

export PROP VOTES MEMBERS NAMES ID DAO
python3 <<'PY'
import json, os

def unwrap(raw, key=None):
    d = json.loads(raw)
    if isinstance(d, list):
        return d
    if 'data' in d:
        inner = d['data']
        return inner.get(key, inner) if key else inner
    return d

prop = unwrap(os.environ['PROP'], 'proposal')
if 'proposal' in prop:
    prop = prop['proposal']
votes = unwrap(os.environ['VOTES'], 'votes')
members = unwrap(os.environ['MEMBERS'], 'members')
names = {}
for line in os.environ['NAMES'].splitlines():
    if '|' in line:
        a, n = line.split('|', 1)
        names[a] = n or (a[:14] + '…')

pid = os.environ['ID']
v = prop['votes']
yes, no, abst = int(v['yes']), int(v['no']), int(v['abstain'])
cast = yes + no + abst
power = int(prop.get('total_power') or len(members) or 0)

QUORUM, THRESHOLD = 0.40, 0.67
q = cast / power if power else 0
t = yes / (yes + no) if (yes + no) else 0

print(f"# A{pid} — {prop['title'].strip()}")
print(f"status: {prop['status']}   proposer: {prop.get('proposer','?')}")
print(f"https://daodao.zone/dao/{os.environ['DAO']}/proposals/A{pid}")
print()
print(f"tally    {yes} yes · {no} no · {abst} abstain")
print(f"turnout  {cast} of {power} members ({q*100:.1f}%)")
print()
print("## decision tests (both must hold)")
print(f"  quorum     (yes+no+abstain)/total = {cast}/{power} = {q*100:5.1f}%  >= 40%  ->  "
      f"{'PASS' if q >= QUORUM else 'FAIL'}")
den = yes + no
print(f"  threshold  yes/(yes+no)           = {yes}/{den} = {t*100:5.1f}%  >= 67%  ->  "
      f"{'PASS' if t >= THRESHOLD else 'FAIL'}"
      if den else "  threshold  no yes/no votes cast -> FAIL")
print()
verdict = "APPROVED" if (q >= QUORUM and t >= THRESHOLD) else "NOT APPROVED"
why = ""
if q < QUORUM and t >= THRESHOLD:
    why = "  (enough support, not enough turnout)"
elif q >= QUORUM and t < THRESHOLD and yes > no:
    why = "  (a yes-majority is NOT enough — the bar is 67%)"
print(f"=> {verdict}{why}")
print(f"   on-chain status: {prop['status']}"
      "   [passed/executed = approved · rejected/closed = not approved]")
print()

print("## votes")
for kind in ('yes', 'no', 'abstain'):
    who = [names.get(x['voter'], x['voter'][:14] + '…') for x in votes if x['vote'] == kind]
    if who:
        print(f"  {kind:8} ({len(who):2}) " + ", ".join(sorted(who)))
silent = power - cast
if silent > 0:
    print(f"  did not vote ({silent})")
print()
print(f"source: {os.environ.get('IX','indexer.daodao.zone')} · proposal + listVotes for A{pid}")
PY
