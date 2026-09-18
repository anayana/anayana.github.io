#!/usr/bin/env bash
set -u
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
head_of() { echo "=== $1"; curl -sSL --max-time 35 -A "$UA" "$2" 2>/dev/null | head -c "${3:-800}" | tr -d '\0'; echo; echo; }
head_of "Norderstedt asked in EPSG:4326 - are the numbers lat/lon now?" \
  'https://geoservice.norderstedt.de/geoserver/gru/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=gru:gruen_baum&outputFormat=application/json&srsName=EPSG:4326&count=1'
head_of "Frankfurt (Oder) capabilities, as they come" \
  'https://geoportal.frankfurt-oder.de/wss/service/WFS_Baumkataster/guest?service=WFS&version=1.1.0&request=GetCapabilities' 1400
head_of "Turku, whatever it will serve" \
  'https://opaskartta.turku.fi/TeklaOGCWeb/WFS.ashx?service=WFS&version=1.1.0&request=GetFeature&typeName=GIS:Puut&maxFeatures=1' 700
echo "=== Joensuu, one last try with a browser agent"
curl -sSL --max-time 35 -A "$UA" 'https://www.avoindata.fi/data/en/api/3/action/package_search?q=Joensuu&rows=20' 2>/dev/null \
  | python3 -c '
import json,sys
raw=sys.stdin.read()
try: j=json.loads(raw)
except Exception: print("   refused again, first bytes:", raw[:100].replace("\n"," ")); raise SystemExit
res=j.get("result") or {}
print("   hits:", res.get("count"))
for d in (res.get("results") or [])[:20]: print("   *", d.get("title"))
'
