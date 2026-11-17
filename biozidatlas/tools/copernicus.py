"""Meerestemperatur, Salzgehalt und Chlorophyll von Copernicus Marine für die
Küstenhäfen des Antifouling-Atlas.

Nutzt die Analyse- und Vorhersagemodelle für die Nordsee (Nordwesteuropäischer
Schelf) und die Ostsee. Für jedes Modell wird im Katalog der Datensatz mit
Tagesmitteln gesucht, der die Variable enthält; so hängt das Skript nicht an
Datensatznamen, die Copernicus von Version zu Version ändert. Aus einem
Ausschnitt um die deutsche Küste wird für jeden Hafen der nächste
Gitterpunkt mit Wasser genommen (höchstens 15 km entfernt).

Braucht die Zugangsdaten in COPERNICUSMARINE_SERVICE_USERNAME und
COPERNICUSMARINE_SERVICE_PASSWORD. Läuft auf einem GitHub-Runner
(.github/workflows/biozidatlas-copernicus.yml) und schreibt
data/copernicus.json.
"""

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import copernicusmarine as cm

HERE = Path(__file__).resolve().parent.parent
OUT = HERE / "data" / "copernicus.json"

REGIONEN = {
    "nordsee": {
        "reviere": {"nordsee", "aestuar"},
        "box": (5.8, 9.8, 53.2, 55.4),  # Länge min, max, Breite min, max
        "produkte": {"phy": "NWSHELF_ANALYSISFORECAST_PHY_004_013", "bgc": "NWSHELF_ANALYSISFORECAST_BGC_004_002"},
    },
    "ostsee": {
        "reviere": {"ostsee-west", "ostsee-mitte", "ostsee-ost", "bodden"},
        "box": (9.2, 14.8, 53.4, 55.2),
        "produkte": {"phy": "BALTICSEA_ANALYSISFORECAST_PHY_003_006", "bgc": "BALTICSEA_ANALYSISFORECAST_BGC_003_007"},
    },
}

# Atlas-Feld: (Produktart, Variablenname im Modell)
VARIABLEN = {"temp": ("phy", "thetao"), "salz": ("phy", "so"), "chl": ("bgc", "chl")}

MAX_KM = 15


def produkt(product_id):
    """Produkt aus dem Katalog; fehlt die Kennung, über Stichworte suchen."""
    kat = cm.describe(product_id=product_id, disable_progress_bar=True)
    if kat.products:
        return kat.products[0]
    teile = product_id.split("_")
    kat = cm.describe(contains=[teile[0]], disable_progress_bar=True)
    for p in kat.products:
        if p.product_id.startswith(teile[0]) and "ANALYSISFORECAST" in p.product_id and teile[2] in p.product_id:
            print(f"{product_id} nicht gefunden, nehme {p.product_id}")
            return p
    raise RuntimeError(f"Produkt {product_id} nicht im Katalog")


def variablen_von(dataset):
    namen = set()
    for v in dataset.versions:
        for part in v.parts:
            for s in part.services:
                namen.update(var.short_name for var in s.variables)
    return namen


def datensatz(product_id, variable):
    """Datensatz mit der Variablen, bevorzugt Tagesmittel (P1D) und 2D/Oberfläche."""
    p = produkt(product_id)
    kandidaten = [d for d in p.datasets if variable in variablen_von(d)]
    if not kandidaten:
        raise RuntimeError(f"Keine Variable {variable} in {p.product_id}")

    def rang(d):
        i = d.dataset_id
        return (0 if "P1D" in i else 1 if "PT1H" in i or "PT15M" in i else 2, 0 if "2D" in i else 1, i)

    return sorted(kandidaten, key=rang)[0].dataset_id


def oberflaeche(dataset_id, variable, box, jetzt):
    lon0, lon1, lat0, lat1 = box
    args = dict(
        dataset_id=dataset_id, variables=[variable],
        minimum_longitude=lon0, maximum_longitude=lon1, minimum_latitude=lat0, maximum_latitude=lat1,
        start_datetime=(jetzt - timedelta(days=2)).strftime("%Y-%m-%dT00:00:00"),
        end_datetime=(jetzt + timedelta(days=1)).strftime("%Y-%m-%dT00:00:00"),
        coordinates_selection_method="outside",
    )
    try:
        ds = cm.open_dataset(minimum_depth=0, maximum_depth=3, **args)
    except Exception as e:  # Datensatz ohne Tiefe
        print(f"{dataset_id}: ohne Tiefenauswahl ({e})")
        ds = cm.open_dataset(**args)
    da = ds[variable]
    if "time" in da.dims:
        da = da.sel(time=np.datetime64(jetzt.replace(tzinfo=None)), method="nearest")
    for dim in ("depth", "elevation"):
        if dim in da.dims:
            da = da.isel({dim: 0})
    zeit = str(np.datetime_as_string(da["time"].values, unit="D")) if "time" in da.coords else None
    lat = da["latitude"].values
    lon = da["longitude"].values
    werte = np.asarray(da.values, dtype=float)
    if werte.shape != (lat.size, lon.size):
        werte = werte.reshape(lat.size, lon.size)
    return lat, lon, werte, zeit


def naechster(lat, lon, werte, plat, plon):
    """Nächster Gitterpunkt mit Wert; (wert, km) oder (None, None)."""
    glon, glat = np.meshgrid(lon, lat)
    r = np.pi / 180
    a = (np.sin((glat - plat) * r / 2) ** 2
         + np.cos(plat * r) * np.cos(glat * r) * np.sin((glon - plon) * r / 2) ** 2)
    km = 2 * 6371 * np.arcsin(np.sqrt(a))
    km[~np.isfinite(werte)] = np.inf
    i = np.unravel_index(np.argmin(km), km.shape)
    if not np.isfinite(km[i]) or km[i] > MAX_KM:
        return None, None
    return float(werte[i]), float(km[i])


def haefen():
    liste = json.loads((HERE / "data" / "haefen.json").read_text(encoding="utf-8"))["haefen"]
    osm = HERE / "data" / "osm-haefen.json"
    if osm.exists():
        liste += json.loads(osm.read_text(encoding="utf-8"))["haefen"]
    return liste


def main():
    jetzt = datetime.now(timezone.utc)
    alle = haefen()
    werte, quellen, fehler = {}, {}, []
    for name, reg in REGIONEN.items():
        hs = [h for h in alle if h["revier"] in reg["reviere"]]
        quellen[name] = {}
        for feld, (art, variable) in VARIABLEN.items():
            try:
                ds_id = datensatz(reg["produkte"][art], variable)
                lat, lon, gitter, zeit = oberflaeche(ds_id, variable, reg["box"], jetzt)
            except Exception as e:
                fehler.append(f"{name}/{feld}: {e}")
                print(f"FEHLER {name}/{feld}: {e}", file=sys.stderr)
                continue
            quellen[name][feld] = {"datensatz": ds_id, "zeit": zeit}
            treffer = 0
            for h in hs:
                v, km = naechster(lat, lon, gitter, h["lat"], h["lon"])
                if v is None:
                    continue
                eintrag = werte.setdefault(h["id"], {"region": name})
                eintrag[feld] = round(v, 2 if feld == "chl" else 1)
                eintrag["km"] = round(max(eintrag.get("km", 0), km), 1)
                eintrag["zeit"] = zeit
                treffer += 1
            print(f"{name}/{feld}: {ds_id}, Stand {zeit}, {treffer} von {len(hs)} Häfen")
    if not werte:
        sys.exit("Keine Werte von Copernicus Marine: " + "; ".join(fehler))
    OUT.write_text(json.dumps({
        "_hinweis": "Modellwerte von Copernicus Marine (E.U. Copernicus Marine Service Information): "
                    "Meerestemperatur (°C), Salzgehalt (PSU) und Chlorophyll-a (mg/m³) an der Oberfläche, "
                    "Tagesmittel am nächsten Gitterpunkt mit Wasser; km = größter Abstand dieses Punkts zum Hafen.",
        "stand": jetzt.strftime("%Y-%m-%d"),
        "quellen": quellen,
        "fehler": fehler,
        "werte": werte,
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(werte)} Häfen mit Werten geschrieben" + (f", {len(fehler)} Fehler" if fehler else ""))


if __name__ == "__main__":
    main()
