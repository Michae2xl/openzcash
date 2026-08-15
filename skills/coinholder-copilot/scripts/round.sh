#!/usr/bin/env bash
# The open Coinholder-Directed Retroactive Grants review round at a glance:
# dates, ballot, size bands, and every proposal with its ask.
# Usage: scripts/round.sh
set -euo pipefail

ROUND_JSON=$(curl -sf "https://openzcash.org/api/zcg/coinholder/round")

python3 - "$ROUND_JSON" <<'PY'
import json, sys

d = json.loads(sys.argv[1])
r = d["round"]

print(f"# Coinholder round {r['label']} — {r['proposalCount']} proposals, ${r['totalRequestedUsd']:,.2f} requested")
print()
print(f"Review closes: {r['reviewCloses']}")
print(f"Poll opens:    {r['pollOpens']}")
print(f"Ballot:        {' / '.join(r['ballotOptions'])}")
print("               (both reject options tally as 'no' votes)")
print(f"Announcement:  {r['sourceThreadUrl']}")
print()

for band in d["bands"]:
    print(f"## {band['label']} — {band['count']} proposals · ${band['totalRequestedUsd']:,.2f} ({band['sharePct']}% of total)")
    for p in d["proposals"]:
        if p["band"] != band["key"]:
            continue
        print(f"- #{p['rank']:>2} {p['project']} — {p['org']} | ${p['requestedUsd']:,.2f}")
        print(f"      {p['summary']}")
        print(f"      thread: {p['threadUrl']}")
        print(f"      github: {p['githubUrl']}")
    print()

print("source: https://openzcash.org/api/zcg/coinholder/round")
print("Amounts are REQUESTED, not approved or paid. Nothing in the round has been paid.")
PY
