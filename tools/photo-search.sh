#!/usr/bin/env bash
# =============================================================================
# WHAT PICTURES OF TREE DAMAGE ARE ACTUALLY OUT THERE, AND UNDER WHAT LICENCE
#
# The sandbox this app is developed in cannot reach any host on the internet -
# the egress proxy refuses the CONNECT for every one of them. A GitHub runner
# can. So the search itself runs here rather than being guessed: for each term
# it asks Wikimedia Commons what files exist, then asks for each file's licence
# and author, and prints only the ones that may actually be shipped.
#
# What may be shipped: public domain, CC0, CC BY, CC BY-SA. Not NC (the app is
# free but a licence that forbids commercial use would forbid an arborist using
# it at work), not ND (we resize), and nothing whose licence cannot be read.
#
# Nothing is downloaded here. This only reports, so a human picks.
# =============================================================================
set -u
UA='vta-field-app/1.0 (https://anayana.github.io/vta/; tree inspection teaching app)'
API='https://commons.wikimedia.org/w/api.php'

TERMS_FILE="${1:-tools/photo-terms.txt}"
PER="${2:-6}"

ok_licence() {
  # $1 = licence short name as Commons states it
  local l
  l=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')
  case "$l" in
    *nc*|*noncommercial*|*nd*|*noderiv*) return 1 ;;
    *cc0*|*"public domain"*|*pd-*|*cc\ by*|*cc-by*) return 0 ;;
    *) return 1 ;;
  esac
}

printf '%s\n' "=== files on Wikimedia Commons, with licence and author"
printf '%s\n' "=== only public domain / CC0 / CC BY / CC BY-SA are listed"
echo

while IFS='|' read -r key term; do
  [ -z "${key:-}" ] && continue
  case "$key" in \#*) continue ;; esac
  echo "--- $key   ($term)"
  hits=$(curl -sS --max-time 40 -A "$UA" --get "$API" \
      --data-urlencode 'action=query' \
      --data-urlencode 'format=json' \
      --data-urlencode 'list=search' \
      --data-urlencode 'srnamespace=6' \
      --data-urlencode "srsearch=$term filetype:bitmap" \
      --data-urlencode "srlimit=$PER" \
    | python3 -c 'import sys,json;d=json.load(sys.stdin);print("\n".join(x["title"] for x in d.get("query",{}).get("search",[])))' 2>/dev/null)

  if [ -z "$hits" ]; then echo "    (nothing found)"; echo; continue; fi

  while IFS= read -r title; do
    [ -z "$title" ] && continue
    meta=$(curl -sS --max-time 40 -A "$UA" --get "$API" \
        --data-urlencode 'action=query' \
        --data-urlencode 'format=json' \
        --data-urlencode 'prop=imageinfo' \
        --data-urlencode 'iiprop=url|size|extmetadata' \
        --data-urlencode 'iiurlwidth=900' \
        --data-urlencode "titles=$title" \
      | python3 -c '
import sys, json, re
d = json.load(sys.stdin)
for p in d.get("query", {}).get("pages", {}).values():
    ii = (p.get("imageinfo") or [{}])[0]
    em = ii.get("extmetadata", {}) or {}
    def g(k):
        v = (em.get(k) or {}).get("value", "")
        v = re.sub(r"<[^>]+>", "", str(v))
        return " ".join(v.split())[:90]
    print("\t".join([g("LicenseShortName") or "?", g("Artist") or "?",
                     ii.get("thumburl", "") or "", str(ii.get("width", "")) + "x" + str(ii.get("height", "")),
                     g("LicenseUrl")]))
' 2>/dev/null)
    lic=$(printf '%s' "$meta" | cut -f1)
    who=$(printf '%s' "$meta" | cut -f2)
    url=$(printf '%s' "$meta" | cut -f3)
    dim=$(printf '%s' "$meta" | cut -f4)
    [ -z "$lic" ] && continue
    if ok_licence "$lic"; then
      printf '    OK  %-28s %-24s %s\n' "$lic" "$dim" "${title#File:}"
      printf '        by %s\n' "$who"
      printf '        %s\n' "$url"
    else
      printf '    --  %-28s %s\n' "$lic" "${title#File:} (not usable)"
    fi
  done <<EOF
$hits
EOF
  echo
done < "$TERMS_FILE"
