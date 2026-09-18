#!/usr/bin/env bash
# Read off what the catalogues actually hold, so an address is copied rather
# than invented. Nothing here ships.
set -u
UA='Mozilla/5.0 (compatible; vta-field/1.0; +https://anayana.github.io/vta/)'
titles() {
  echo "=== $1"
  curl -sSL --max-time 35 -A "$UA" "$2" 2>/dev/null \
    | python3 -c '
import json,sys
try: j=json.load(sys.stdin)
except Exception as e: print("   not JSON:", e); raise SystemExit
res=(j.get("result") or {})
rows=res.get("results") or res.get("result") or []
print("   hits:", res.get("count", len(rows)))
for d in rows[:14]:
    print("   *", d.get("title") or d.get("name"))
    for r in (d.get("resources") or [])[:8]:
        u=r.get("url") or ""
        if u: print("       ", (r.get("format") or "?").upper(), u[:160])
'
  echo
}
layers() {
  echo "=== $1 · layers whose name mentions a tree"
  curl -sSL --max-time 35 -A "$UA" "$2" 2>/dev/null \
    | grep -oE '<[A-Za-z]*:?Name>[^<]+</[A-Za-z]*:?Name>' \
    | sed -E 's#</?[A-Za-z]*:?Name>##g' | sort -u \
    | grep -iE 'puu|baum|tree|kasvi' | head -25
  echo
}
layers "Turku"                 'https://opaskartta.turku.fi/TeklaOGCWeb/WFS.ashx?service=WFS&request=GetCapabilities'
titles "Tampere, city catalogue"   'https://data.tampere.fi/data/api/3/action/package_search?q=puu&rows=15'
titles "Tampere in avoindata.fi"   'https://www.avoindata.fi/data/api/3/action/package_search?q=Tampere%20puu&rows=15'
titles "Joensuu in avoindata.fi"   'https://www.avoindata.fi/data/api/3/action/package_search?q=Joensuu&rows=15'
titles "GovData: Baumkataster Frankfurt (Oder)" 'https://ckan.govdata.de/api/3/action/package_search?q=Baumkataster+Frankfurt+Oder&rows=5'
titles "GovData: Baumkataster Norderstedt"      'https://ckan.govdata.de/api/3/action/package_search?q=Baumkataster+Norderstedt&rows=5'
titles "GovData: Forstbotanischer Garten"       'https://ckan.govdata.de/api/3/action/package_search?q=Forstbotanischer+Garten&rows=10'
