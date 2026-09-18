#!/usr/bin/env bash
# Print what the still-open addresses actually contain, so the next address
# is read off rather than invented. Nothing here ships.
set -u
head_of() {
  echo "--- $1"
  curl -sSL --max-time 30 "$2" 2>/dev/null | head -c "${3:-700}" | tr -d '\0'
  echo; echo
}
echo "--- Hamburg 1.1.0 · layer names"
curl -sSL --max-time 30 'https://geodienste.hamburg.de/HH_WFS_Strassenbaumkataster?SERVICE=WFS&VERSION=1.1.0&REQUEST=GetCapabilities' 2>/dev/null \
  | grep -oE '<[A-Za-z]*:?Name>[^<]+</[A-Za-z]*:?Name>' | sed -E 's#</?[A-Za-z]*:?Name>##g' | sort -u | head -20
echo
head_of "Utrecht one feature, so its geometry type is visible" \
  'https://geodata.utrecht.nl/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=Signalen:BOOM_BEHEERGU&count=1&outputFormat=application/json&srsName=EPSG:4326' 900
head_of "Camden one feature" \
  'https://opendata.camden.gov.uk/resource/csqp-kdss.geojson?%24limit=1' 900
head_of "Copenhagen gadetraer one feature" \
  'https://wfs-kbhkort.kk.dk/k101/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=k101:gadetraer&count=1&outputFormat=application/json&srsName=EPSG:4326' 900
