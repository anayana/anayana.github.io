#!/usr/bin/env bash
# Read off what the catalogues actually hold, so an address is copied rather
# than invented. Nothing here ships.
set -u
titles() {
  echo "=== $1"
  curl -sSL --max-time 35 "$2" 2>/dev/null \
    | python3 -c '
import json,sys
try: j=json.load(sys.stdin)
except Exception as e: print("   not JSON:", e); raise SystemExit
res=(j.get("result") or {})
rows=res.get("results") or res.get("result") or []
print("   hits:", res.get("count", len(rows)))
for d in rows[:12]:
    t=d.get("title") or d.get("name")
    print("   *", t)
    for r in (d.get("resources") or [])[:6]:
        f=(r.get("format") or "?").upper()
        u=r.get("url") or ""
        if f in ("WFS","GEOJSON","JSON","CSV","WMS","API","ZIP","SHP"):
            print("       ", f, u[:150])
'
  echo
}
layers() {
  echo "=== $1 · layers whose name mentions a tree"
  curl -sSL --max-time 35 "$2" 2>/dev/null \
    | grep -oE '<[A-Za-z]*:?Name>[^<]+</[A-Za-z]*:?Name>' \
    | sed -E 's#</?[A-Za-z]*:?Name>##g' | sort -u \
    | grep -iE 'puu|baum|tree|kasvi|viher' | head -25
  echo "   (total layers: $(curl -sSL --max-time 35 "$2" 2>/dev/null | grep -coE '<[A-Za-z]*:?Name>[^<]+</[A-Za-z]*:?Name>'))"
  echo
}
titles "Finland, national catalogue: puurekisteri" 'https://www.avoindata.fi/data/api/3/action/package_search?q=puurekisteri&rows=20'
titles "Finland, national catalogue: puut"         'https://www.avoindata.fi/data/api/3/action/package_search?q=puut&rows=20'
titles "Germany, GovData: Baumkataster"            'https://ckan.govdata.de/api/3/action/package_search?q=baumkataster&rows=20'
titles "Germany, GovData: Tharandt"                'https://ckan.govdata.de/api/3/action/package_search?q=Tharandt&rows=10'
layers "Tampere geoserver"  'https://geodata.tampere.fi/geoserver/ows?service=WFS&request=GetCapabilities'
layers "Joensuu geoserver"  'https://kartta.joensuu.fi/geoserver/ows?service=WFS&request=GetCapabilities'
