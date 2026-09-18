#!/usr/bin/env bash
# For the addresses the probe left unresolved: print what they actually
# contain, so the right layer or resource URL can be read off rather than
# guessed. Nothing here ships; it only tells the probe list what to ask next.
set -u
show_wfs() {
  echo "--- $1"
  curl -sSL --max-time 30 "$2" 2>/dev/null \
    | grep -oE '<(wfs:)?Name>[^<]+</(wfs:)?Name>' \
    | sed -E 's#</?[Ww][Ff][Ss]?:?[Nn]ame>##g' | sort -u | head -60
  echo
}
show_json_urls() {
  echo "--- $1"
  curl -sSL --max-time 30 "$2" 2>/dev/null \
    | grep -oE '"(url|name|format)"[[:space:]]*:[[:space:]]*"[^"]*"' | head -60
  echo
}
show_wfs  "Hamburg"    'https://geodienste.hamburg.de/HH_WFS_Strassenbaumkataster?SERVICE=WFS&REQUEST=GetCapabilities'
show_wfs  "Cologne"    'https://geoportal.stadt-koeln.de/arcgis/services/basiskarten/kgg/MapServer/WFSServer?service=WFS&request=GetCapabilities'
show_wfs  "Copenhagen" 'https://wfs-kbhkort.kk.dk/k101/ows?service=WFS&request=GetCapabilities'
show_wfs  "Milan"      'https://geoportale.comune.milano.it/geoserver/ows?service=WFS&request=GetCapabilities'
show_json_urls "Barcelona arbrat-viari" 'https://opendata-ajuntament.barcelona.cat/data/api/3/action/package_show?id=arbrat-viari'
show_json_urls "London street trees"    'https://data.london.gov.uk/api/3/action/package_search?q=street+trees&rows=3'
