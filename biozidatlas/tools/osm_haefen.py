"""Häfen aus OpenStreetMap für den Antifouling-Atlas.

Fragt per Overpass alle Sportboothäfen (leisure=marina) mit Namen in
Deutschland ab, liest aus den Tags, was über Kran, Slipanlage und
Waschanlage eingetragen ist, und ordnet jedem Hafen das Revier des
nächsten Beispielhafens aus data/haefen.json zu (höchstens 30 km entfernt;
weiter entfernte Häfen werden weggelassen). Schreibt data/osm-haefen.json.

Läuft auf einem GitHub-Runner (.github/workflows/biozidatlas-osm.yml),
weil die Entwicklungsumgebung OpenStreetMap nicht erreicht.
"""

import json
import math
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
OUT = HERE / "data" / "osm-haefen.json"
BEISPIEL = HERE / "data" / "haefen.json"

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

QUERY = """
[out:json][timeout:180];
area["ISO3166-1"="DE"][admin_level=2]->.de;
nwr["leisure"="marina"]["name"](area.de);
out center tags;
"""

MAX_KM = 30


def overpass():
    data = urllib.parse.urlencode({"data": QUERY}).encode()
    for url in ENDPOINTS:
        for versuch in range(3):
            try:
                req = urllib.request.Request(url, data=data, headers={"User-Agent": "antifouling-atlas-prototyp"})
                with urllib.request.urlopen(req, timeout=240) as res:
                    return json.load(res)
            except Exception as e:  # nächster Versuch, dann nächster Server
                print(f"{url} Versuch {versuch + 1}: {e}", file=sys.stderr)
                time.sleep(10 * (versuch + 1))
    sys.exit("Overpass nicht erreichbar")


def km(lat1, lon1, lat2, lon2):
    r = math.pi / 180
    a = (math.sin((lat2 - lat1) * r / 2) ** 2
         + math.cos(lat1 * r) * math.cos(lat2 * r) * math.sin((lon2 - lon1) * r / 2) ** 2)
    return 2 * 6371 * math.asin(math.sqrt(a))


# Tags, die auf eine Einrichtung hinweisen; fehlt ein Hinweis, bleibt der Wert
# None (unbekannt), denn in OpenStreetMap fehlt vieles einfach.
def eingetragen(tags, woerter):
    text = " ".join(f"{k}={v}" for k, v in tags.items()).lower()
    return True if any(w in text for w in woerter) else None


def main():
    beispiele = json.loads(BEISPIEL.read_text(encoding="utf-8"))["haefen"]
    roh = overpass()
    haefen, ohne_revier = [], 0
    for el in roh.get("elements", []):
        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lon = el.get("lon") or (el.get("center") or {}).get("lon")
        tags = el.get("tags", {})
        if lat is None or lon is None or not tags.get("name"):
            continue
        naechster = min(beispiele, key=lambda b: km(lat, lon, b["lat"], b["lon"]))
        abstand = km(lat, lon, naechster["lat"], naechster["lon"])
        if abstand > MAX_KM:
            ohne_revier += 1
            continue
        haefen.append({
            "id": f"osm-{el['type'][0]}{el['id']}",
            "name": tags["name"],
            "revier": naechster["revier"],
            "revier_von": naechster["name"],
            "revier_km": round(abstand, 1),
            "lat": round(lat, 4),
            "lon": round(lon, 4),
            "infrastruktur": {
                "waschanlage": eingetragen(tags, ["boat_wash", "boatwash", "boat_washing"]),
                "kran": eingetragen(tags, ["crane", "hoist", "travel_lift", "travellift", "boat_lift"]),
                "slipanlage": eingetragen(tags, ["slipway"]),
                "trockenliegeplatz": eingetragen(tags, ["dry_stack", "boat_storage", "dry_storage"]),
            },
        })
    haefen.sort(key=lambda h: h["name"])
    OUT.write_text(json.dumps({
        "_hinweis": "Sportboothäfen aus OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL). "
                    "Infrastruktur: true = in OSM eingetragen, null = nicht eingetragen (unbekannt). "
                    f"Revier vom nächsten Beispielhafen übernommen, höchstens {MAX_KM} km entfernt.",
        "stand": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "anzahl": len(haefen),
        "weggelassen_zu_weit": ohne_revier,
        "haefen": haefen,
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(haefen)} Häfen geschrieben, {ohne_revier} weiter als {MAX_KM} km von einem Beispielhafen")


if __name__ == "__main__":
    main()
