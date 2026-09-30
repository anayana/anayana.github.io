#!/usr/bin/env bash
# =============================================================================
# THE SAME QUESTION, ASKED OF CATEGORIES INSTEAD OF FILENAMES
#
# Searching Commons by words matches what a file is called, not what it shows -
# which is how "leaning tree trunk" returned a Corot painting and "tree cavity"
# returned a star-forming region. Categories are curated by people who looked
# at the picture. So: find the categories whose names match, then list what is
# actually in them, with the licence.
# =============================================================================
set -u
UA='vta-field-app/1.0 (https://anayana.github.io/vta/; tree inspection teaching app)'
API='https://commons.wikimedia.org/w/api.php'
TERMS="${1:-tools/photo-cats.txt}"
NCAT="${2:-3}"
NFILE="${3:-8}"

ok_licence() {
  local l; l=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')
  case "$l" in
    *nc*|*noncommercial*|*nd*|*noderiv*|*"no restrictions"*) return 1 ;;
    *cc0*|*"public domain"*|*pd-*|*cc\ by*|*cc-by*) return 0 ;;
    *) return 1 ;;
  esac
}
one_file() {   # $1 = File:...
  curl -sS --max-time 40 -A "$UA" --get "$API" \
      --data-urlencode 'action=query' --data-urlencode 'format=json' \
      --data-urlencode 'prop=imageinfo' --data-urlencode 'iiprop=url|size|extmetadata' \
      --data-urlencode 'iiurlwidth=900' --data-urlencode "titles=$1" \
    | python3 -c '
import sys, json, re
d = json.load(sys.stdin)
for p in d.get("query", {}).get("pages", {}).values():
    ii = (p.get("imageinfo") or [{}])[0]
    em = ii.get("extmetadata", {}) or {}
    def g(k):
        v = (em.get(k) or {}).get("value", "")
        return " ".join(re.sub(r"<[^>]+>", "", str(v)).split())[:70]
    print("\t".join([g("LicenseShortName") or "?", g("Artist") or "?",
                     str(ii.get("width","")) + "x" + str(ii.get("height","")),
                     g("ImageDescription")[:70]]))
' 2>/dev/null
}

while IFS='|' read -r key term; do
  [ -z "${key:-}" ] && continue
  case "$key" in \#*) continue ;; esac
  echo "=== $key   ($term)"
  cats=$(curl -sS --max-time 40 -A "$UA" --get "$API" \
      --data-urlencode 'action=query' --data-urlencode 'format=json' \
      --data-urlencode 'list=search' --data-urlencode 'srnamespace=14' \
      --data-urlencode "srsearch=$term" --data-urlencode "srlimit=$NCAT" \
    | python3 -c 'import sys,json;d=json.load(sys.stdin);print("\n".join(x["title"] for x in d.get("query",{}).get("search",[])))' 2>/dev/null)
  if [ -z "$cats" ]; then echo "    (no category)"; echo; continue; fi
  while IFS= read -r cat; do
    [ -z "$cat" ] && continue
    echo "  [$cat]"
    files=$(curl -sS --max-time 40 -A "$UA" --get "$API" \
        --data-urlencode 'action=query' --data-urlencode 'format=json' \
        --data-urlencode 'list=categorymembers' --data-urlencode "cmtitle=$cat" \
        --data-urlencode 'cmtype=file' --data-urlencode "cmlimit=$NFILE" \
      | python3 -c 'import sys,json;d=json.load(sys.stdin);print("\n".join(x["title"] for x in d.get("query",{}).get("categorymembers",[])))' 2>/dev/null)
    [ -z "$files" ] && { echo "      (empty)"; continue; }
    while IFS= read -r f; do
      [ -z "$f" ] && continue
      m=$(one_file "$f"); lic=$(printf '%s' "$m" | cut -f1); who=$(printf '%s' "$m" | cut -f2)
      dim=$(printf '%s' "$m" | cut -f3); desc=$(printf '%s' "$m" | cut -f4)
      if ok_licence "$lic"; then
        printf '      OK  %-16s %-12s %s\n' "$lic" "$dim" "${f#File:}"
        printf '          by %s   %s\n' "$who" "$desc"
      fi
    done <<EOF
$files
EOF
  done <<EOF
$cats
EOF
  echo
done < "$TERMS"
