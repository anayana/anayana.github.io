#!/usr/bin/env bash
# =============================================================================
# WHAT TEACHING MATERIAL ON TREES AND TREE DAMAGE IS OPENLY LICENSED
#
# OERSI is the search index for open educational resources at German
# universities, run by the hbz and the TIB. It harvests the regional
# repositories - ZOERR in Baden-Wuerttemberg, twillo in Lower Saxony,
# ORCA.nrw and the rest - so asking it once asks all of them. It has an open
# API; this uses it, because the sandbox cannot reach any host itself.
#
# What this can and cannot do, said plainly. It finds lecture material:
# slide decks, scripts, whole courses. Those carry a licence for the work as
# a whole. A photograph inside a deck is often NOT covered by that licence -
# the author licensed it from somewhere else, and the deck says so in a
# corner, or does not say at all. So this reports what exists and under what
# licence, and the pictures inside still have to be checked one at a time
# before any of them is used. It does not download anything.
# =============================================================================
set -u
UA='vta-field-app/1.0 (https://anayana.github.io/vta/; tree inspection teaching app)'
API='https://oersi.org/resources/api/search/oer_data/_search'
API2='https://oersi.org/api/search/oer_data/_search'
TERMS="${1:-tools/oer-terms.txt}"
SIZE="${2:-15}"

ask() {   # $1 = query string
  local q="$1" body
  body=$(python3 -c '
import json, sys
q = sys.argv[1]
print(json.dumps({
  "size": int(sys.argv[2]),
  "query": {"bool": {"must": [{"simple_query_string": {"query": q,
                     "fields": ["name", "description", "keywords"],
                     "default_operator": "or"}}]}},
  "_source": ["name", "id", "license", "provider", "creator", "keywords",
              "inLanguage", "learningResourceType", "description"],
  "track_total_hits": True
}))' "$q" "$SIZE")
  for url in "$API" "$API2"; do
    out=$(curl -sS --max-time 45 -A "$UA" -H 'Content-Type: application/json' \
          -X POST --data "$body" "$url" 2>/dev/null)
    if printf '%s' "$out" | head -c 1 | grep -q '{'; then
      if printf '%s' "$out" | grep -q '"hits"'; then printf '%s' "$out"; return 0; fi
    fi
  done
  return 1
}

while IFS= read -r term; do
  [ -z "${term:-}" ] && continue
  case "$term" in \#*) continue ;; esac
  echo "=== $term"
  res=$(ask "$term") || { echo "    (the index did not answer)"; echo; continue; }
  printf '%s' "$res" | python3 -c '
import sys, json, re
d = json.load(sys.stdin)
tot = d.get("hits", {}).get("total", {})
tot = tot.get("value") if isinstance(tot, dict) else tot
hits = d.get("hits", {}).get("hits", [])
print("    %s in the index" % (tot if tot is not None else "?"))
if not hits:
    print("    (nothing)")
for h in hits:
    s = h.get("_source", {})
    lic = ((s.get("license") or {}).get("id") or "") if isinstance(s.get("license"), dict) else (s.get("license") or "")
    lic = str(lic)
    short = re.sub(r"^https?://creativecommons\.org/(licenses|publicdomain)/", "", lic).strip("/")
    bad = bool(re.search(r"\bnc\b|\bnd\b", short, re.I))
    prov = s.get("provider")
    prov = prov.get("name") if isinstance(prov, dict) else (prov or "")
    who = s.get("creator") or []
    who = ", ".join(x.get("name", "") for x in who if isinstance(x, dict))[:60]
    typ = s.get("learningResourceType") or []
    typ = ", ".join(x.get("prefLabel", {}).get("de", "") if isinstance(x, dict) else str(x) for x in typ)[:40]
    print("    %-4s %-22s %-18s %s" % ("--" if bad else "OK", short or "?", (prov or "?")[:18],
                                       (s.get("name") or "?")[:70]))
    if who: print("         by %s   %s" % (who, typ))
    print("         %s" % (s.get("id") or ""))
'
  echo
done < "$TERMS"
