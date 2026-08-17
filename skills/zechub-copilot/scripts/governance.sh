#!/usr/bin/env bash
# The ZecHub DAO at a glance: members, what is open for voting right now (with what
# each proposal still needs to pass), and recent outcomes with turnout.
# Usage: scripts/governance.sh [how-many-recent]      default 12
set -euo pipefail

N="${1:-12}"
IX="https://indexer.daodao.zone/juno-1/contract"
MOD="juno14futcfehnc8fn4nz6gtm25svn05mzz09ju8rtj0jvven2hpxj85s0q8a55"
CW4="juno1re0pu5hdafdcexmvuvdngn0d5sttkp6wz4wfjdd3p9cwfhmg8h9s8ek80w"
DAO="juno1nktrulhakwm0n3wlyajpwxyg54n39xx4y8hdaqlty7mymf85vweq7m6t0y"

PROPS=$(curl -sf "$IX/$MOD/daoProposalSingle/reverseProposals?limit=50")
MEMBERS=$(curl -sf "$IX/$CW4/cw4Group/listMembers")

NAMES=""
for addr in $(printf '%s' "$MEMBERS" | python3 -c "
import json,sys
d=json.load(sys.stdin)
m=d if isinstance(d,list) else d.get('data',{}).get('members',[])
print('\n'.join(x['addr'] for x in m))
"); do
  n=$(curl -sf "https://pfpk.daodao.zone/address/$addr" 2>/dev/null \
      | python3 -c "import json,sys;print(json.load(sys.stdin).get('name') or '')" 2>/dev/null || true)
  NAMES="${NAMES}${addr}|${n}
"
done

export PROPS MEMBERS NAMES N DAO
python3 <<'PY'
import json, os

def unwrap(raw, key=None):
    d = json.loads(raw)
    if isinstance(d, list):
        return d
    inner = d.get('data', d)
    return inner.get(key, inner) if key else inner

props = unwrap(os.environ['PROPS'])
members = unwrap(os.environ['MEMBERS'], 'members')
names = {}
for line in os.environ['NAMES'].splitlines():
    if '|' in line:
        a, n = line.split('|', 1)
        names[a] = n or (a[:14] + '…')

QUORUM, THRESHOLD = 0.40, 0.67
total = len(members)

print(f"# ZecHub DAO — {total} members, one vote each")
print(f"https://daodao.zone/dao/{os.environ['DAO']}")
print()
print("## members")
labels = sorted(names.get(m['addr'], m['addr'][:14] + '…') for m in members)
for i in range(0, len(labels), 4):
    print("  " + "  ".join(f"{x:<16}" for x in labels[i:i + 4]))
print()

def tests(p):
    v = p['proposal']['votes']
    y, n, a = int(v['yes']), int(v['no']), int(v['abstain'])
    power = int(p['proposal'].get('total_power') or total)
    cast = y + n + a
    q = cast / power if power else 0
    t = y / (y + n) if (y + n) else 0
    return y, n, a, cast, power, q, t

open_props = [p for p in props if p['proposal']['status'] == 'open']
print(f"## open right now ({len(open_props)})")
if not open_props:
    print("  nothing open.")
for p in open_props:
    y, n, a, cast, power, q, t = tests(p)
    print(f"  A{p['id']} — {p['proposal']['title'][:56]}")
    print(f"     {y}y {n}n {a}a · turnout {cast}/{power} ({q*100:.0f}%)")
    needs = []
    if q < QUORUM:
        more = -(-int(QUORUM * power * 100) // 100) - cast
        needs.append(f"{max(1, more)} more vote(s) for quorum")
    if t < THRESHOLD:
        k = 0
        while (y + k) / (y + k + n) < THRESHOLD:
            k += 1
        needs.append(f"{k} more yes for the 67% bar")
    print("     needs: " + ("; ".join(needs) if needs else "nothing — currently passing"))
print()

decided = [p for p in props if p['proposal']['status'] != 'open'][:int(os.environ['N'])]
print(f"## last {len(decided)} decided")
print(f"  {'id':<6}{'outcome':<10}{'tally':<12}{'turnout':<10}{'approval':<10}title")
for p in decided:
    y, n, a, cast, power, q, t = tests(p)
    st = p['proposal']['status']
    ok = "approved" if st in ('passed', 'executed') else "rejected"
    print(f"  A{p['id']:<5}{ok:<10}{f'{y}y {n}n {a}a':<12}{f'{cast}/{power}':<10}"
          f"{t*100:>6.1f}%   {p['proposal']['title'][:44]}")
print()

turns = [tests(p)[3] / tests(p)[4] for p in decided if tests(p)[4]]
if turns:
    print(f"average turnout over these {len(turns)}: {sum(turns)/len(turns)*100:.0f}% of members")
print()
print("Decision rule (module A): quorum (yes+no+abstain)/total >= 40% AND yes/(yes+no) >= 67%.")
print("A yes-majority alone does not pass. 'closed' and 'rejected' both mean it did not pass.")
print("source: indexer.daodao.zone · reverseProposals + cw4Group/listMembers")
PY
