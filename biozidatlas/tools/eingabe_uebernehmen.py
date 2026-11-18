"""Übernimmt eine freigegebene Eingabe aus einem GitHub-Vorgang in die Daten.

Die Eingabeseite (eingabe.html) legt einen Vorgang an, der den Datensatz als
JSON-Block enthält. Gibt die Redaktion ihn frei (Label „freigegeben“ oder
Workflow von Hand mit der Vorgangsnummer), prüft dieses Skript den Datensatz
nach denselben Regeln wie das Formular, lädt ein angehängtes Bild herunter,
vergibt eine Kennung und schreibt den Eintrag nach data/beitraege.json bzw.
data/bewuchstafeln.json. Danach kommentiert es den Vorgang und schließt ihn.

Läuft im Workflow .github/workflows/biozidatlas-eingabe.yml. Erwartet
ISSUE_NUMBER und GH_TOKEN; schreibt die Commit-Nachricht nach
$RUNNER_TEMP/eingabe-commit.txt.
"""

import json
import os
import re
import subprocess
import sys
import urllib.request
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
DATA = HERE / "data"

ORGANISMEN = {"Seepocken", "Miesmuscheln", "Dreikantmuscheln", "Quaggamuscheln", "Moostierchen",
              "Seescheiden", "Grünalgen", "Algen", "Biofilm"}
LIZENZEN = {"CC BY 4.0", "CC0 1.0", "eigene Aufnahme", "intern"}
BILDTYPEN = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}
BILD_URL = re.compile(r"https://(?:github\.com/user-attachments/assets/[\w-]+|(?:private-)?user-images\.githubusercontent\.com/[^\s\")>]+)")


def gh(*args, eingabe=None):
    return subprocess.run(["gh", *args], check=True, capture_output=True, text=True, input=eingabe).stdout


def laden(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def speichern(name, inhalt):
    (DATA / name).write_text(json.dumps(inhalt, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def ist_datum(s):
    try:
        date.fromisoformat(s)
        return True
    except (TypeError, ValueError):
        return False


def text(d, feld, mindest, hoechst, fehler, name):
    v = d.get(feld)
    if v is None:
        v = ""
    if not isinstance(v, str) or not (mindest <= len(v.strip()) <= hoechst):
        fehler.append(f"{name}: {mindest} bis {hoechst} Zeichen nötig")
        return ""
    return v.strip()


def beitrag_pruefen(d, fehler):
    m = d.get("metadaten") or {}
    out = {
        "ueberschrift": text(d, "ueberschrift", 1, 120, fehler, "Überschrift"),
        "unterueberschrift": text(d, "unterueberschrift", 0, 160, fehler, "Unterüberschrift"),
        "status": d.get("status") if d.get("status") in ("entwurf", "veroeffentlicht") else fehler.append("Status ungültig"),
        "metadaten": {
            "autor": text(m, "autor", 1, 120, fehler, "Autor/in"),
            "datum": m.get("datum") if ist_datum(m.get("datum")) else fehler.append("Datum ungültig"),
            "quelle": text(m, "quelle", 0, 200, fehler, "Quelle"),
            "lizenz": m.get("lizenz") if m.get("lizenz") in LIZENZEN else fehler.append("Lizenz ungültig"),
            "schlagworte": [s.strip() for s in (m.get("schlagworte") or []) if isinstance(s, str) and s.strip()][:10],
        },
        "text": text(d, "text", 20, 5000, fehler, "Erklärung"),
    }
    bild = d.get("bild")
    if bild:
        out["bild"] = {
            "datei": None,
            "alt": text(bild, "alt", 1, 200, fehler, "Bildbeschreibung"),
            "bildnachweis": text(bild, "bildnachweis", 0, 120, fehler, "Bildnachweis"),
        }
    else:
        out["bild"] = None
    return out


def tafel_pruefen(d, fehler):
    out = {
        "tafel": text(d, "tafel", 1, 20, fehler, "Tafel-Nummer"),
        "ausgebracht": d.get("ausgebracht") if ist_datum(d.get("ausgebracht")) else fehler.append("Datum ausgebracht ungültig"),
        "abgelesen": d.get("abgelesen") if ist_datum(d.get("abgelesen")) else fehler.append("Datum abgelesen ungültig"),
        "melder": text(d, "melder", 1, 120, fehler, "Gemeldet von"),
        "bemerkung": text(d, "bemerkung", 0, 1000, fehler, "Bemerkung"),
        "bild": "angehängt" if d.get("bild") else None,
        "geprueft": True,
    }
    if out["ausgebracht"] and out["abgelesen"] and out["abgelesen"] < out["ausgebracht"]:
        fehler.append("Abgelesen liegt vor dem Ausbringen")
    try:
        out["tiefe_m"] = float(d.get("tiefe_m"))
        out["bedeckung_prozent"] = float(d.get("bedeckung_prozent"))
    except (TypeError, ValueError):
        fehler.append("Tiefe oder Bedeckung ist keine Zahl")
        return out
    if not 0 < out["tiefe_m"] <= 20:
        fehler.append("Tiefe muss zwischen 0,1 und 20 m liegen")
    if not 0 <= out["bedeckung_prozent"] <= 100:
        fehler.append("Bedeckung muss zwischen 0 und 100 % liegen")
    org = []
    for o in d.get("organismen") or []:
        if o.get("name") not in ORGANISMEN:
            fehler.append(f"Unbekannter Organismus: {o.get('name')}")
            continue
        try:
            a = float(o.get("anteil_prozent"))
        except (TypeError, ValueError):
            fehler.append("Anteil ist keine Zahl")
            continue
        org.append({"name": o["name"], "anteil_prozent": a})
    if org and abs(sum(o["anteil_prozent"] for o in org) - 100) > 0.5:
        fehler.append("Die Anteile der Organismen ergeben nicht 100 %")
    if out["bedeckung_prozent"] > 0 and not org:
        fehler.append("Zusammensetzung des Bewuchses fehlt")
    out["organismen"] = org
    return out


def bild_laden(body, kennung):
    m = BILD_URL.search(body)
    if not m:
        return None
    req = urllib.request.Request(m.group(0), headers={"User-Agent": "antifouling-atlas", "Authorization": "token " + os.environ["GH_TOKEN"]})
    with urllib.request.urlopen(req, timeout=60) as res:
        typ = res.headers.get_content_type()
        daten = res.read(5 * 1024 * 1024 + 1)
    if typ not in BILDTYPEN or len(daten) > 5 * 1024 * 1024:
        raise ValueError(f"Bild nicht übernommen ({typ}, {len(daten)} Bytes; erlaubt JPG, PNG, WebP, GIF bis 5 MB)")
    name = f"bilder/eingabe-{kennung}.{BILDTYPEN[typ]}"
    (DATA / name).write_bytes(daten)
    return name


def naechste_id(eintraege, praefix):
    zahlen = [int(e["id"][1:]) for e in eintraege if re.fullmatch(praefix + r"\d+", e.get("id", ""))]
    return f"{praefix}{(max(zahlen) if zahlen else 0) + 1:03d}"


def main():
    nummer = os.environ["ISSUE_NUMBER"]
    vorgang = json.loads(gh("issue", "view", nummer, "--json", "body,title,state"))
    body = vorgang["body"] or ""

    def abbrechen(grund):
        gh("issue", "comment", nummer, "--body-file", "-",
           eingabe=f"Die Eingabe konnte nicht übernommen werden:\n\n{grund}\n\nBitte korrigieren und erneut freigeben.\n\n---\n_Automatisch erzeugt vom Workflow „Antifouling-Atlas - Eingabe übernehmen“_")
        sys.exit(grund)

    if "<!-- atlas-eingabe -->" not in body:
        abbrechen("Der Vorgang stammt nicht aus dem Eingabeformular.")
    block = re.search(r"```json\s*(\{.*?\})\s*```", body, re.S)
    if not block:
        abbrechen("Kein Datensatz (JSON-Block) gefunden.")
    try:
        eingabe = json.loads(block.group(1))
    except json.JSONDecodeError as e:
        abbrechen(f"Der Datensatz ist kein gültiges JSON: {e}")

    art, d = eingabe.get("art"), eingabe.get("datensatz") or {}
    haefen = {h["id"] for h in laden("haefen.json")["haefen"]}
    if (DATA / "osm-haefen.json").exists():
        haefen |= {h["id"] for h in laden("osm-haefen.json")["haefen"]}

    fehler = []
    if d.get("hafen_id") not in haefen:
        fehler.append(f"Unbekannter Hafen: {d.get('hafen_id')}")
    if art == "beitrag":
        datei, liste, praefix = "beitraege.json", "beitraege", "b"
        eintrag = beitrag_pruefen(d, fehler)
    elif art == "tafel":
        datei, liste, praefix = "bewuchstafeln.json", "tafeln", "t"
        eintrag = tafel_pruefen(d, fehler)
    else:
        fehler.append(f"Unbekannte Art: {art}")
    if fehler:
        abbrechen("\n".join(f"- {f}" for f in fehler))

    inhalt = laden(datei)
    kennung = naechste_id(inhalt[liste], praefix)
    eintrag = {"id": kennung, "hafen_id": d["hafen_id"], **eintrag}

    hinweis = ""
    if (art == "beitrag" and eintrag["bild"]) or (art == "tafel" and eintrag["bild"]):
        try:
            pfad = bild_laden(body, kennung)
        except Exception as e:
            pfad, hinweis = None, f"\n\nHinweis: {e}"
        if not pfad and not hinweis:
            hinweis = "\n\nHinweis: Ein Bild war angekündigt, im Vorgang aber nicht angehängt; der Eintrag ist ohne Bild übernommen."
        if art == "beitrag":
            if pfad:
                eintrag["bild"]["datei"] = pfad
            else:
                eintrag["bild"] = None
        else:
            eintrag["bild"] = pfad

    if art == "beitrag":
        eigene = [b["reihenfolge"] for b in inhalt[liste] if b["hafen_id"] == eintrag["hafen_id"]]
        eintrag = {"id": kennung, "hafen_id": eintrag["hafen_id"], "reihenfolge": max(eigene, default=0) + 1, **{k: v for k, v in eintrag.items() if k not in ("id", "hafen_id")}}
        titel = f"Beitrag „{eintrag['ueberschrift']}“"
    else:
        titel = f"Bewuchstafel {eintrag['tafel']} vom {eintrag['abgelesen']}"

    inhalt[liste].append(eintrag)
    speichern(datei, inhalt)

    Path(os.environ.get("RUNNER_TEMP", "/tmp"), "eingabe-commit.txt").write_text(
        f"Antifouling-Atlas: Eingabe #{nummer} übernommen\n\n{titel} für {eintrag['hafen_id']}, Kennung {kennung}.\n",
        encoding="utf-8")
    gh("issue", "comment", nummer, "--body-file", "-",
       eingabe=f"Übernommen als {kennung}: {titel}. Die Hafenseite wird gerade neu veröffentlicht."
               f"{hinweis}\n\n---\n_Automatisch erzeugt vom Workflow „Antifouling-Atlas - Eingabe übernehmen“_")
    gh("issue", "close", nummer)
    print(f"{kennung} übernommen: {titel}")


if __name__ == "__main__":
    main()
