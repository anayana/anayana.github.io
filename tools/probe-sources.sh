#!/usr/bin/env bash
# Fetch each candidate address and say what came back, the same way the app's
# check button does: by looking at the body, not at the status code.
# One request per address, all of them at once, so a host that hangs costs
# twenty seconds rather than holding up the rest.
set -u
list="${1:?usage: probe-sources.sh <list-file>}"
work=$(mktemp -d)

probe_one() {
  local label="$1" url="$2" out="$3"
  local body code
  body=$(curl -sSL --max-time 25 -A 'Mozilla/5.0 (compatible; vta-field source probe)' \
              -w '\n@@HTTP@@%{http_code}' "$url" 2>/dev/null)
  code="${body##*@@HTTP@@}"
  body="${body%$'\n'@@HTTP@@*}"
  body=$(printf '%s' "$body" | head -c 300000)
  printf '%-30s %-4s  %s\n' "$label" "${code:-000}" "$(classify "$body")" > "$out"
}

classify() {
  local body="$1" head
  head=$(printf '%s' "$body" | head -c 600 | tr -d '\r' | tr '\n' ' ')
  [ -z "${head// }" ] && { echo "NO ANSWER"; return; }
  case "$head" in
    *'<!DOCTYPE'*|*'<!doctype'*|*'<html'*|*'<HTML'*) echo "HTML page, not data"; return;;
  esac
  if printf '%s' "$body" | grep -qi 'WFS_Capabilities'; then
    local lay
    lay=$(printf '%s' "$body" \
      | grep -oiE '<(wfs:)?Name>[^<]*(baum|tree|arbre|arbrat|arbol|boom|puu|albero|drzew|strom|trad|drevo|arvore)[^<]*</(wfs:)?Name>' \
      | sed -E 's#</?[Ww][Ff][Ss]?:?[Nn]ame>##g' | sort -u | paste -sd, - | cut -c1-220)
    echo "WFS · tree layers: ${lay:-NONE FOUND}"; return
  fi
  if printf '%s' "$head" | grep -qE '"(currentVersion|serviceDescription|geometryType|folders)"'; then
    local lay
    lay=$(printf '%s' "$body" | grep -oE '"name"[[:space:]]*:[[:space:]]*"[^"]*"' \
      | head -14 | sed 's/.*: *//' | tr -d '"' | paste -sd, - | cut -c1-220)
    echo "ArcGIS · ${lay:-no layer names}"; return
  fi
  if printf '%s' "$head" | grep -qE '"type"[[:space:]]*:[[:space:]]*"(FeatureCollection|Feature)"'; then
    local n
    n=$(printf '%s' "$body" | grep -o '"type"[[:space:]]*:[[:space:]]*"Feature"' | wc -l | tr -d ' ')
    echo "GeoJSON · ${n}+ features in this answer"; return
  fi
  case "$head" in
    '{'*|'['*) echo "JSON, not GeoJSON: $(printf '%s' "$head" | cut -c1-110)"; return;;
    '<?xml'*|'<'*) echo "XML, not WFS caps: $(printf '%s' "$head" | cut -c1-110)"; return;;
  esac
  if printf '%s' "$body" | head -1 | grep -qE '([^,;\t]+[,;\t]){2,}'; then
    echo "CSV · first line: $(printf '%s' "$body" | head -1 | cut -c1-110)"; return
  fi
  echo "unreadable: $(printf '%s' "$head" | cut -c1-110)"
}
export -f probe_one classify

i=0
while IFS='|' read -r label url; do
  case "$label" in ''|\#*) continue;; esac
  label="${label%"${label##*[![:space:]]}"}"
  url="${url//[[:space:]]/}"
  [ -z "$url" ] && continue
  i=$((i+1))
  printf '%s\t%s\t%s\n' "$label" "$url" "$work/$(printf '%03d' $i)"
done < "$list" | while IFS=$'\t' read -r l u o; do
  printf '%s\t%s\t%s\0' "$l" "$u" "$o"
done | xargs -0 -P 12 -I{} bash -c 'IFS=$'"'"'\t'"'"' read -r l u o <<< "{}"; probe_one "$l" "$u" "$o"'

echo
echo "=========== WHAT EACH ADDRESS ACTUALLY ANSWERS WITH ==========="
cat "$work"/* 2>/dev/null | sort
echo "==============================================================="
echo
echo "with data:  $(cat "$work"/* 2>/dev/null | grep -cE 'WFS ·|ArcGIS ·|GeoJSON ·|CSV ·')"
echo "html/none:  $(cat "$work"/* 2>/dev/null | grep -cE 'HTML page|NO ANSWER')"
rm -rf "$work"
