#!/usr/bin/env bash
set -u
UA='Mozilla/5.0 (compatible; vta-field/1.0; +https://anayana.github.io/vta/)'
head_of() { echo "=== $1"; curl -sSL --max-time 35 -A "$UA" "$2" 2>/dev/null | head -c "${3:-900}" | tr -d '\0'; echo; echo; }
layers()  { echo "=== $1 · tree layers"
  curl -sSL --max-time 35 -A "$UA" "$2" 2>/dev/null \
    | grep -oE '<[A-Za-z]*:?Name>[^<]+</[A-Za-z]*:?Name>' | sed -E 's#</?[A-Za-z]*:?Name>##g' \
    | sort -u | grep -iE 'baum|tree|puu' | head -20; echo; }
head_of "Turku GIS:Puut, one feature"      'https://opaskartta.turku.fi/TeklaOGCWeb/WFS.ashx?service=WFS&version=1.1.0&request=GetFeature&typeName=GIS:Puut&maxFeatures=1&outputFormat=application/json&srsName=EPSG:4326'
head_of "Norderstedt gruen_baum, one"      'https://geoservice.norderstedt.de/geoserver/gru/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=gru:gruen_baum&outputFormat=application/json&maxFeatures=1'
layers  "Frankfurt (Oder)"                 'https://geoportal.frankfurt-oder.de/wss/service/WFS_Baumkataster/guest?service=WFS&request=GetCapabilities'
echo "=== Joensuu in the national catalogue (one query, after a pause)"
sleep 8
curl -sSL --max-time 35 -A "$UA" 'https://www.avoindata.fi/data/api/3/action/package_search?q=Joensuu+puu&rows=20' 2>/dev/null \
  | python3 -c '
import json,sys
try: j=json.load(sys.stdin)
except Exception as e: print("   still refused:", sys.stdin.read()[:120] if False else e); raise SystemExit
res=j.get("result") or {}
print("   hits:", res.get("count"))
for d in (res.get("results") or [])[:14]: print("   *", d.get("title"))
'
