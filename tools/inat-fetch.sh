#!/usr/bin/env bash
# =============================================================================
# BRING DOWN CANDIDATES, NOT FINISHED PICTURES
#
# iNaturalist has the photographs the university repositories do not, but a
# research-grade observation is identified correctly - not framed usefully.
# Half of them are a close-up of pores on a table. So this does not put
# anything into the app: it fetches a handful of candidates per case into
# vta/cases/cand/, with the credit for each, and a human looks at every one
# before a single picture is moved into place by tools/inat-pick.py.
#
# Each photograph is checked on its OWN licence. photo_license= filters the
# observation, and an observation can qualify on its second picture while the
# first is all rights reserved.
#
# No licence version is written. iNaturalist states the licence as a code and
# not as a version, so the app says what iNaturalist says - "CC BY" - and links
# the observation, where the licence is shown at the source.
# =============================================================================
set -u
UA='vta-field-app/1.0 (https://anayana.github.io/vta/; tree inspection teaching app)'
API='https://api.inaturalist.org/v1/observations'
PICKS="${1:-tools/inat-picks.txt}"
OUT="${2:-vta/cases/cand}"

mkdir -p "$OUT"
: > "$OUT/found.tsv"

while IFS='|' read -r key taxon want; do
  [ -z "${key:-}" ] && continue
  case "$key" in \#*) continue ;; esac
  taxon=$(printf '%s' "$taxon" | sed 's/^ *//; s/ *$//')
  want=$(printf '%s' "${want:-3}" | tr -dc '0-9'); want="${want:-3}"
  echo "=== $key   ($taxon, up to $want)"

  curl -sS --max-time 60 -A "$UA" --get "$API" \
      --data-urlencode "taxon_name=$taxon" \
      --data-urlencode 'quality_grade=research' \
      --data-urlencode 'photo_license=cc0,cc-by,cc-by-sa' \
      --data-urlencode 'photos=true' \
      --data-urlencode 'order_by=votes' \
      --data-urlencode 'per_page=30' \
    | python3 - "$key" "$want" "$OUT" <<'PY'
import json, re, sys
key, want, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
OK = {'cc0': 'CC0', 'cc-by': 'CC BY', 'cc-by-sa': 'CC BY-SA'}
d = json.load(sys.stdin)
print('    %s research-grade observations offered' % d.get('total_results', '?'))
n = 0
rows = []
for o in d.get('results', []):
    if n >= want:
        break
    for p in (o.get('photos') or []):
        lic = (p.get('license_code') or '').lower()
        if lic not in OK:
            continue
        url = (p.get('url') or '').replace('/square.', '/large.')
        if not url:
            continue
        att = (p.get('attribution') or '').strip()
        # "(c) Some Name, some rights reserved (CC BY)" -> "Some Name"
        m = re.match(r'^\(c\)\s*(.+?),\s*(?:some|no|all)\s+rights', att, re.I)
        who = (m.group(1) if m else att).strip()
        if not who:
            continue
        n += 1
        rows.append('\t'.join([key + '-' + str(n), url, OK[lic], who,
                               o.get('uri') or '',
                               str(o.get('id') or ''),
                               (o.get('species_guess') or '').replace('\t', ' ')]))
        break
if not rows:
    print('    nothing with a usable licence and a readable author')
open(out + '/found.tsv', 'a', encoding='utf-8').write('\n'.join(rows) + ('\n' if rows else ''))
for r in rows:
    print('    ' + r.split('\t')[0] + '  ' + r.split('\t')[2] + '  ' + r.split('\t')[3])
PY
  echo
done < "$PICKS"

# --- and now the files themselves ------------------------------------------
kept=0; dropped=0
: > "$OUT/credits-cand.json.part"
while IFS=$'\t' read -r name url lic who page oid guess; do
  [ -z "${name:-}" ] && continue
  if ! curl -sS --max-time 90 -A "$UA" -o "$OUT/$name.img" "$url"; then
    echo "DROP $name - did not come down"; dropped=$((dropped+1)); continue
  fi
  sz=$(wc -c < "$OUT/$name.img")
  if [ "$sz" -lt 20000 ]; then echo "DROP $name - only $sz bytes"; dropped=$((dropped+1)); rm -f "$OUT/$name.img"; continue; fi
  python3 - "$OUT/$name.img" "$OUT/$name.jpg" <<'PY' || { echo "DROP $name - not a picture"; dropped=$((dropped+1)); rm -f "$OUT/$name.img"; continue; }
import sys
from PIL import Image
src, dst = sys.argv[1:3]
im = Image.open(src).convert('RGB')
im.thumbnail((900, 900))
im.save(dst, 'JPEG', quality=78, optimize=True, progressive=True)
PY
  rm -f "$OUT/$name.img"
  python3 - "$name" "$lic" "$who" "$page" "$oid" "$guess" >> "$OUT/credits-cand.json.part" <<'PY'
import json, sys
name, lic, who, page, oid, guess = sys.argv[1:7]
print(json.dumps(name) + ': ' + json.dumps({
    'file': 'iNaturalist observation ' + oid + (' (' + guess + ')' if guess else ''),
    'licence': lic, 'by': who, 'page': page
}, ensure_ascii=False))
PY
  kept=$((kept+1))
  printf 'KEEP %-16s %-10s %s\n' "$name" "$lic" "$who"
done < "$OUT/found.tsv"

python3 - "$OUT/credits-cand.json.part" "$OUT/credits-cand.json" <<'PY'
import json, sys
src, dst = sys.argv[1:3]
d = {}
for line in open(src, encoding='utf-8'):
    line = line.strip().rstrip(',')
    if not line:
        continue
    k, _, v = line.partition(': ')
    d[json.loads(k)] = json.loads(v)
json.dump(d, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('credits for', len(d), 'candidates')
PY
rm -f "$OUT/credits-cand.json.part"
echo
echo "kept $kept, dropped $dropped - now LOOK at them before any of them ships"
ls -la "$OUT" | tail -n +2
