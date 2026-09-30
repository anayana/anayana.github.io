#!/usr/bin/env bash
# =============================================================================
# THE SOURCE THAT ACTUALLY HAS PICTURES OF THIS
#
# The university repositories have nothing: OERSI, which harvests ZOERR,
# twillo and ORCA.nrw, returns one hit for "arboriculture" in its whole index
# and it is about silkworms. Wikimedia Commons has the common fungi and not
# much else.
#
# iNaturalist has millions of observations, each one a photograph of a named
# organism in the field, and a research-grade observation has had its
# identification confirmed by other people. Its API can be asked for only the
# licences that may be shipped, and it hands back the attribution with the
# picture.
#
# What it cannot give: a defect that is not an organism. Nobody photographs
# "included bark" and tags it as a species. Those cases keep their drawings.
# =============================================================================
set -u
UA='vta-field-app/1.0 (https://anayana.github.io/vta/; tree inspection teaching app)'
API='https://api.inaturalist.org/v1/observations'
TERMS="${1:-tools/inat-terms.txt}"
PER="${2:-8}"

while IFS='|' read -r key taxon; do
  [ -z "${key:-}" ] && continue
  case "$key" in \#*) continue ;; esac
  taxon=$(printf '%s' "$taxon" | sed 's/^ *//; s/ *$//')
  echo "=== $key   ($taxon)"
  curl -sS --max-time 45 -A "$UA" --get "$API" \
      --data-urlencode "taxon_name=$taxon" \
      --data-urlencode 'quality_grade=research' \
      --data-urlencode 'photo_license=cc0,cc-by,cc-by-sa' \
      --data-urlencode 'photos=true' \
      --data-urlencode 'order_by=votes' \
      --data-urlencode "per_page=$PER" \
    | python3 -c '
import sys, json
d = json.load(sys.stdin)
print("    %s research-grade observations with a usable licence" % d.get("total_results", "?"))
OK_LIC = {"cc0", "cc-by", "cc-by-sa"}
for o in d.get("results", []):
    # photo_license filters the OBSERVATION, not each picture: an observation
    # can qualify on its second photograph while its first is all rights
    # reserved. One of those was in the first report. Every picture is checked
    # on its own licence here.
    for p in (o.get("photos") or []):
        lic = (p.get("license_code") or "").lower()
        if lic not in OK_LIC:
            continue
        url = (p.get("url") or "").replace("/square.", "/large.")
        print("    OK  %-10s %-34s %s" % (lic.upper(),
                                          (p.get("attribution") or "?")[:34], url))
        print("        %s   %s" % ((o.get("species_guess") or "?")[:30],
                                   o.get("uri") or ""))
        break
' 2>/dev/null || echo "    (no answer)"
  echo
done < "$TERMS"
