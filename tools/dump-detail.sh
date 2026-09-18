#!/usr/bin/env bash
# For the addresses the probe left unresolved: print what they actually
# contain, so the right layer or resource url can be read off rather than
# guessed. Nothing here ships; it only tells the probe list what to ask next.
set -u
grep_layers() {
  echo "--- $1 · every layer whose name mentions a tree"
  curl -sSL --max-time 30 "$2" 2>/dev/null \
    | grep -oE '<[A-Za-z]*:?Name>[^<]+</[A-Za-z]*:?Name>' \
    | sed -E 's#</?[A-Za-z]*:?Name>##g' | sort -u \
    | grep -iE 'baum|tree|traeer|traer|arbre|arbrat|arbol|boom|puu|albero|drzew|strom|drevo|arvore' \
    | head -30
  echo "    (total layers: $(curl -sSL --max-time 30 "$2" 2>/dev/null | grep -coE '<[A-Za-z]*:?Name>[^<]+</[A-Za-z]*:?Name>'))"
  echo
}
head_of() {
  echo "--- $1 · first 700 characters as they come"
  curl -sSL --max-time 30 "$2" 2>/dev/null | head -c 700 | tr -d '\0'
  echo; echo
}
grep_layers "Hamburg"    'https://geodienste.hamburg.de/HH_WFS_Strassenbaumkataster?SERVICE=WFS&REQUEST=GetCapabilities'
grep_layers "Copenhagen" 'https://wfs-kbhkort.kk.dk/k101/ows?service=WFS&request=GetCapabilities'
head_of "Hamburg raw"    'https://geodienste.hamburg.de/HH_WFS_Strassenbaumkataster?SERVICE=WFS&REQUEST=GetCapabilities'
head_of "Barcelona JSON" 'https://opendata-ajuntament.barcelona.cat/data/dataset/27b3f8a7-e536-4eea-b025-ce094817b2bd/resource/a8f8f4bf-5295-46d9-93ab-7eebb165ca52/download'
head_of "Barcelona CSV"  'https://opendata-ajuntament.barcelona.cat/data/dataset/27b3f8a7-e536-4eea-b025-ce094817b2bd/resource/23124fd5-521f-40f8-85b8-efb1e71c2ec8/download'
