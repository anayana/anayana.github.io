"""Fotos von Bewuchsorganismen von Wikimedia Commons für den Antifouling-Atlas.

Sucht je Stichwort Dateien auf Commons, liest Lizenz und Urheber aus der
Commons-API und lädt nur Fotos unter Public Domain, CC0, CC BY oder CC BY-SA
herunter (kein NC, kein ND, nichts ohne lesbare Lizenz), 800 px breit, nach
data/bilder/fotos-kandidaten/, mit Lizenz und Urheber in
data/fotos-kandidaten.json. Ausgewählte Fotos kommen von Hand nach
data/bilder/fotos/ und data/fotos.json; die Seiten nennen den Nachweis unter
jedem Bild.

Läuft auf einem GitHub-Runner (.github/workflows/biozidatlas-fotos.yml), weil
die Entwicklungsumgebung Commons nicht erreicht. Es lädt je Stichwort mehrere
Kandidaten; welche genutzt werden, entscheidet danach ein Mensch.
"""

import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
# Kandidaten landen getrennt von der Auswahl in data/fotos.json, damit ein neuer
# Lauf nichts überschreibt, was schon ausgewählt ist.
ZIEL = HERE / "data" / "bilder" / "fotos-kandidaten"
LISTE = HERE / "data" / "fotos-kandidaten.json"
API = "https://commons.wikimedia.org/w/api.php"
UA = "antifouling-atlas-prototyp/1.0 (https://anayana.github.io/biozidatlas/)"
JE_STICHWORT = 4

STICHWORTE = {
    "seepocken": ["Semibalanus balanoides", "Amphibalanus improvisus", "barnacles"],
    "miesmuscheln": ["Mytilus edulis"],
    "dreikantmuscheln": ["Dreissena polymorpha"],
    "quaggamuscheln": ["Dreissena bugensis", "quagga mussel"],
    "gruenalgen": ["Ulva intestinalis", "Ulva lactuca"],
    "algen": ["Cladophora glomerata", "filamentous algae"],
    "moostierchen": ["Membranipora membranacea", "bryozoan colony"],
    "seescheiden": ["Ciona intestinalis", "Botryllus schlosseri"],
    "biofilm": ["biofouling", "biofilm on stone"],
    "bewuchstafel": ["settlement plate fouling", "fouling panel"],
    "rumpf": ["boat hull fouling", "barnacles on boat hull"],
}


def api(**params):
    params.update(format="json")
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as res:
        return json.load(res)


def lizenz_ok(name):
    l = (name or "").lower()
    if re.search(r"\bnc\b|noncommercial|\bnd\b|noderiv", l):
        return False
    return bool(re.search(r"cc0|public domain|^pd|cc by|cc-by", l))


def text(meta, feld):
    roh = (meta.get(feld) or {}).get("value", "")
    return html.unescape(re.sub(r"<[^>]+>", "", roh)).strip()


def main():
    ZIEL.mkdir(parents=True, exist_ok=True)
    fotos = {}
    for key, begriffe in STICHWORTE.items():
        kandidaten = []
        gesehen = set()
        for begriff in begriffe:
            if len(kandidaten) >= JE_STICHWORT:
                break
            treffer = api(action="query", list="search", srnamespace=6, srlimit=12,
                          srsearch=f"{begriff} filetype:bitmap").get("query", {}).get("search", [])
            titel = [t["title"] for t in treffer if t["title"] not in gesehen]
            if not titel:
                continue
            seiten = api(action="query", prop="imageinfo", iiprop="url|size|extmetadata|mime",
                         iiurlwidth=800, titles="|".join(titel[:12])).get("query", {}).get("pages", {})
            for s in seiten.values():
                if len(kandidaten) >= JE_STICHWORT:
                    break
                info = (s.get("imageinfo") or [{}])[0]
                meta = info.get("extmetadata", {})
                lizenz = text(meta, "LicenseShortName")
                if info.get("mime") not in ("image/jpeg", "image/png") or not lizenz_ok(lizenz):
                    continue
                if info.get("width", 0) < 600:
                    continue
                gesehen.add(s["title"])
                n = len(kandidaten) + 1
                datei = f"bilder/fotos-kandidaten/{key}-{n}.{'png' if info['mime'] == 'image/png' else 'jpg'}"
                req = urllib.request.Request(info["thumburl"], headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=60) as res:
                    (HERE / "data" / datei).write_bytes(res.read())
                kandidaten.append({
                    "datei": datei,
                    "titel": s["title"],
                    "beschreibung": text(meta, "ImageDescription")[:300],
                    "autor": text(meta, "Artist")[:200] or "unbekannt",
                    "lizenz": lizenz,
                    "lizenz_url": text(meta, "LicenseUrl"),
                    "quelle_url": info.get("descriptionurl", ""),
                    "suchbegriff": begriff,
                })
                time.sleep(1)
        fotos[key] = kandidaten
        print(f"{key}: {len(kandidaten)} Fotos")
    LISTE.write_text(json.dumps({
        "_hinweis": "Kandidaten von Wikimedia Commons, nur Public Domain, CC0, CC BY und CC BY-SA, "
                    "mit Urheber und Lizenz. Ausgewählte Fotos stehen in data/fotos.json.",
        "fotos": fotos,
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    if not any(fotos.values()):
        sys.exit("Keine Fotos gefunden")


if __name__ == "__main__":
    main()
