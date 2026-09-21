#!/usr/bin/env bash
set -u
UA='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36'
echo "=== what the live site serves, with no cache in the way"
for u in https://anayana.github.io/vta/version.txt \
         https://anayana.github.io/baum/version.txt; do
  printf '%-52s %s\n' "$u" "$(curl -sSL --max-time 30 -A "$UA" -H 'Cache-Control: no-cache' "$u" | tr -d '\n')"
done
echo
echo "=== the version the served app.js declares"
for u in https://anayana.github.io/vta/app.js https://anayana.github.io/baum/app.js; do
  printf '%-44s %s\n' "$u" "$(curl -sSL --max-time 60 -A "$UA" "$u" | grep -m1 'const APP_VERSION' || echo 'NOT FOUND')"
done
echo
echo "=== what index.html asks for, and its cache headers"
curl -sSIL --max-time 30 -A "$UA" https://anayana.github.io/vta/index.html \
  | grep -iE '^(HTTP|cache-control|etag|last-modified|age)' | sed 's/^/   /'
echo
echo "   script tags:"
curl -sSL --max-time 30 -A "$UA" https://anayana.github.io/vta/index.html \
  | grep -oE '(src|href)="[^"]*\?v=[^"]*"' | head -6 | sed 's/^/   /'
echo
echo "=== is the measure button in the served app.js?"
curl -sSL --max-time 60 -A "$UA" https://anayana.github.io/vta/app.js > /tmp/served.js 2>/dev/null
for needle in "Take the point" "measureAnchor" "userData.dot = 1" "m.done = true" "Trees will not stay put"; do
  printf '   %-26s %s\n' "$needle" "$(grep -c "$needle" /tmp/served.js) occurrences"
done
