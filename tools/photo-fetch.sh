#!/usr/bin/env bash
# =============================================================================
# BRING IN THE PICTURES THAT WERE PICKED
#
# Reads tools/photo-picks.txt - one line per case, "key|File:Name.jpg" - and
# for each one asks Wikimedia Commons for the file itself and for who made it
# and under what licence. Nothing is written unless all three come back: a
# picture with no readable author and licence is not shipped.
#
# The file is fetched at 900 px wide (the app never shows it larger) and
# written as vta/cases/<key>.jpg, with everything needed to credit it properly
# collected in vta/cases/credits.json. The app shows that credit under every
# photograph, because these are other people's photographs.
# =============================================================================
set -u
UA='vta-field-app/1.0 (https://anayana.github.io/vta/; tree inspection teaching app)'
API='https://commons.wikimedia.org/w/api.php'
OUT=vta/cases
PICKS="${1:-tools/photo-picks.txt}"

mkdir -p "$OUT"
tmp=$(mktemp -d)
echo '{' > "$tmp/credits.json"
first=1
kept=0; dropped=0

while IFS='|' read -r key title; do
  [ -z "${key:-}" ] && continue
  case "$key" in \#*) continue ;; esac
  title=$(printf '%s' "$title" | sed 's/^ *//; s/ *$//')
  [ -z "$title" ] && continue

  meta=$(curl -sS --max-time 60 -A "$UA" --get "$API" \
      --data-urlencode 'action=query' \
      --data-urlencode 'format=json' \
      --data-urlencode 'prop=imageinfo' \
      --data-urlencode 'iiprop=url|extmetadata' \
      --data-urlencode 'iiurlwidth=900' \
      --data-urlencode "titles=$title" \
    | python3 -c '
import sys, json, re
d = json.load(sys.stdin)
for p in d.get("query", {}).get("pages", {}).values():
    if "missing" in p: sys.exit(0)
    ii = (p.get("imageinfo") or [{}])[0]
    em = ii.get("extmetadata", {}) or {}
    def g(k):
        v = (em.get(k) or {}).get("value", "")
        return " ".join(re.sub(r"<[^>]+>", "", str(v)).split())
    print("\t".join([ii.get("thumburl",""), g("LicenseShortName"), g("Artist"),
                     g("LicenseUrl"), ii.get("descriptionurl","")]))
' 2>/dev/null)

  url=$(printf '%s' "$meta" | cut -f1)
  lic=$(printf '%s' "$meta" | cut -f2)
  who=$(printf '%s' "$meta" | cut -f3)
  lurl=$(printf '%s' "$meta" | cut -f4)
  page=$(printf '%s' "$meta" | cut -f5)

  low=$(printf '%s' "$lic" | tr '[:upper:]' '[:lower:]')
  case "$low" in *nc*|*nd*) echo "DROP $key - licence $lic"; dropped=$((dropped+1)); continue ;; esac
  if [ -z "$url" ] || [ -z "$lic" ] || [ -z "$who" ]; then
    echo "DROP $key - no file, no licence or no author ($title)"; dropped=$((dropped+1)); continue
  fi

  if ! curl -sS --max-time 90 -A "$UA" -o "$tmp/$key.img" "$url"; then
    echo "DROP $key - the file did not come down"; dropped=$((dropped+1)); continue
  fi
  # a picture, and a real one: anything under 20 kB is an error page
  sz=$(wc -c < "$tmp/$key.img")
  if [ "$sz" -lt 20000 ]; then echo "DROP $key - only $sz bytes"; dropped=$((dropped+1)); continue; fi
  CONV=convert; command -v convert >/dev/null || CONV=magick
  "$CONV" "$tmp/$key.img" -resize '900x900>' -strip -interlace Plane -quality 78 "$OUT/$key.jpg" \
    || { echo "DROP $key - could not be converted"; dropped=$((dropped+1)); continue; }

  [ $first -eq 0 ] && echo ',' >> "$tmp/credits.json"
  first=0
  python3 - "$key" "$title" "$lic" "$who" "$lurl" "$page" >> "$tmp/credits.json" <<'PY'
import json, sys
k, title, lic, who, lurl, page = sys.argv[1:7]
print(json.dumps(k) + ': ' + json.dumps({
    'file': title, 'licence': lic, 'by': who, 'licenceUrl': lurl, 'page': page
}, ensure_ascii=False), end='')
PY
  kept=$((kept+1))
  printf 'KEEP %-14s %-18s %s\n' "$key" "$lic" "$who"
done < "$PICKS"

printf '\n}\n' >> "$tmp/credits.json"
python3 - "$tmp/credits.json" "$OUT/credits.json" "vta/photos.js" <<'PY'
import json, sys
src, dst, js = sys.argv[1:4]
d = json.load(open(src))
json.dump(d, open(dst, 'w'), ensure_ascii=False, indent=1)
with open(js, 'w', encoding='utf-8') as f:
    f.write('/* Written by tools/photo-fetch.sh from what Wikimedia Commons said.\n'
            '   Every picture here is somebody else\'s work: the app shows the name\n'
            '   and the licence under it, and links the file page. Not edited by hand -\n'
            '   if a credit is wrong here, it is wrong at the source. */\n')
    f.write('const CASE_PHOTOS = ' + json.dumps(d, ensure_ascii=False, indent=2) + ';\n')
print('credits written for', len(d), 'pictures')
PY
echo
echo "kept $kept, dropped $dropped"
ls -la "$OUT" | tail -n +2
