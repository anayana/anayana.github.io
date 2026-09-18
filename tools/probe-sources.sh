#!/usr/bin/env bash
# Fetch each candidate address and say what came back, the same way the app's
# check button does: by looking at the body, not at the status code.
set -u
list="${1:?usage: probe-sources.sh <list-file>}"

classify() {
  local body="$1"
  local head; head=$(printf '%s' "$body" | head -c 400 | tr -d '\r' | tr '\n' ' ')
  case "$head" in
    *'<!DOCTYPE'*|*'<!doctype'*|*'<html'*|*'<HTML'*) echo "HTML page (not data)"; return;;
  esac
  if printf '%s' "$head" | grep -qi 'WFS_Capabilities'; then
    local lay; lay=$(printf '%s' "$body" | grep -oiE '<(wfs:)?Name>[^<]*(baum|tree|arbre|arbrat|boom|puu|arbol|albero|drzew|strom|tra|drevo)[^<]*</(wfs:)?Name>' \
      | sed -E 's#</?(wfs:)?Name>##g' | sort -u | paste -sd, - | cut -c1-200)
    echo "WFS · tree layers: ${lay:-none found}"; return
  fi
  if printf '%s' "$head" | grep -qE '"(currentVersion|layers|serviceDescription|geometryType|fields)"'; then
    local lay; lay=$(printf '%s' "$body" | grep -oE '"name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -12 | sed 's/.*: *//' | paste -sd, - | cut -c1-200)
    echo "ArcGIS · ${lay:-no layer names}"; return
  fi
  if printf '%s' "$head" | grep -qE '"type"[[:space:]]*:[[:space:]]*"(FeatureCollection|Feature)"'; then
    local n; n=$(printf '%s' "$body" | grep -o '"type"[[:space:]]*:[[:space:]]*"Feature"' | wc -l | tr -d ' ')
    echo "GeoJSON · ${n} features in this answer"; return
  fi
  case "$head" in
    '{'*|'['*) echo "JSON, but not GeoJSON/ArcGIS: $(printf '%s' "$head" | cut -c1-90)"; return;;
  esac
  if printf '%s' "$head" | head -1 | grep -qE '([^,;\t]+[,;\t]){2,}'; then
    echo "CSV · first line: $(printf '%s' "$body" | head -1 | cut -c1-90)"; return
  fi
  echo "unreadable: $(printf '%s' "$head" | cut -c1-90)"
}

fail=0; ok=0
while IFS='|' read -r label url; do
  [ -z "${label// }" ] && continue
  case "$label" in \#*) continue;; esac
  url="${url// }"
  body=$(curl -sSL --max-time 45 --retry 1 -A 'vta-field source probe' "$url" 2>/dev/null | head -c 300000)
  code=$(curl -sSL -o /dev/null -w '%{http_code}' --max-time 45 -A 'vta-field source probe' "$url" 2>/dev/null)
  if [ -z "$body" ]; then
    printf '%-34s %-4s  NO ANSWER\n' "$label" "${code:-000}"; fail=$((fail+1)); continue
  fi
  printf '%-34s %-4s  %s\n' "$label" "${code:-000}" "$(classify "$body")"
  ok=$((ok+1))
done < "$list"
echo
echo "answered: $ok   silent: $fail"
