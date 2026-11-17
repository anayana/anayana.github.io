# Antifouling-Atlas (Prototyp)

Interaktiver Prototyp: Welcher Bewuchsschutz passt zu welchem Liegeplatz?
Karte der Häfen, Ausschluss nach Regeln, Bewertung mit drei MCDA-Verfahren,
Bewuchskalender, Kosten über 5 Jahre, Live-Wassertemperatur und ein Chatbot,
der im Browser läuft. Statische Seite ohne Server, läuft auf GitHub Pages.

**Beispieldaten, keine Empfehlung.** Echt sind nur die Lage der Häfen
(gerundet) und die Wassertemperatur von PEGELONLINE. Bewuchsdruck,
Infrastruktur, Kosten, Bewertungen, Kriterien und Gewichte sind Beispielwerte.
Produktnamen gibt es keine, nur beschreibende Produktkategorien.

## Lokal starten

Die Seite lädt ihre Daten per `fetch`, braucht also einen Webserver:

```bash
cd biozidatlas
python -m http.server 8000
# dann http://localhost:8000 öffnen
```

## Aufbau

```
biozidatlas/
  index.html              Seite
  style.css               Gestaltung (hell und dunkel)
  js/mcda.js              Verfahren: gewichtete Summe, TOPSIS, PROMETHEE II, Borda-Konsens, Robustheit
  js/live.js              PEGELONLINE und Open-Meteo, nächste Messstelle, Faustregel zur Saison
  js/app.js               Karte, Regeln, Darstellung, Stand als Text für Druck und Chat
  js/chat.js              Chatbot im Browser (WebLLM)
  data/*.json             Beispieldaten (siehe unten)
  data/osm-haefen.json    Häfen aus OpenStreetMap (vom GitHub-Actions-Job geschrieben)
  tools/osm_haefen.py     Overpass-Abfrage für data/osm-haefen.json
  data/copernicus.json    Meeresdaten von Copernicus (vom GitHub-Actions-Job geschrieben)
  tools/copernicus.py     Abfrage bei Copernicus Marine für data/copernicus.json
  vendor/leaflet/         Leaflet 1.9.4 (BSD-2-Clause)
  vendor/web-llm/         WebLLM 0.2.86 (Apache-2.0)
```

## Ablauf der Bewertung

1. **Ausschluss:** Optionen, die rechtlich oder technisch nicht passen, fallen
   heraus (Gewässertyp, regionale Regel, Bootslänge, fehlende Waschanlage oder
   fehlender Kran), ebenso Optionen, die beim örtlichen Bewuchsdruck nicht
   ausreichend wirken (Wirksamkeit unter 5 von 10). Ausschluss wird nie
   gewichtet.
2. **Bewertung:** Jeder Wert wird über einen festen Wertebereich auf 0–1
   normiert und mit dem Gewicht verrechnet. Wählbar: gewichtete Summe, TOPSIS,
   PROMETHEE II (lineare Präferenz, q = 0,05, p = 0,4).
3. **Robustheit:** 400 Durchläufe mit Gewichten ±25 % und Werten ±15 %;
   angezeigt wird, wie oft Platz 1 vorn bleibt.

Die Umwelt behält immer mindestens 20 % des Gewichts (`untergrenze` in
`kriterien.json`). Drei Vorlagen setzen die Gewichte auf einen Schlag:
„Umwelt zuerst“ (Standard), „Ausgewogen“ und „Wirksamkeit und Kosten
zuerst“ bzw. „Wirtschaftlich zuerst“ für die Berufsschifffahrt.

Bootslift, Kranen nach jedem Törn und Ultraschall werden nur bewertet, wenn
sie im Bedienfeld angekreuzt sind (`nur_auf_wunsch`).

Kosten sind für ein 10-m-Boot hinterlegt und werden in der Anzeige grob nach
Rumpffläche (Länge zum Quadrat) auf die eingegebene Bootslänge umgerechnet.
Die Rangfolge ändert das nicht.

**Angaben zum Boot** (nur Freizeit): Liegt das Boot höchstens 4 Monate im
Wasser, sinkt der Bewuchsdruck um eine Stufe, ab 10 Monaten steigt er um eine.
Der Bootstyp ändert die Wirksamkeit über `wirksamkeit_bonus`, z. B. wirkt
Silikon bei schnellen Motorbooten deutlich besser.

**Kosten in 5 Jahren:** aus `kosten_aufteilung` (Anschaffung, Nutzungsdauer,
laufende Kosten); läuft die Nutzungsdauer vor 5 Jahren ab, wird neu
angeschafft.

**Bewuchskalender:** Stärke des Bewuchses je Monat aus `bewuchs_kalender`,
dazu ein Hinweis für den laufenden Monat.

**Steckbrief drucken:** Die Druckansicht zeigt Hafen, Kernfrage, Gewichtung,
Rangliste, Kosten und Ausschlüsse ohne Karte und Bedienung, mit den gewählten
Einstellungen und dem Link.

Der gewählte Hafen steht in der Adresse (z. B. `#cuxhaven`), so lässt sich
eine Ansicht als Link weitergeben.

## Datenstruktur

Die Felder sind so gewählt, wie sie später mit echten Daten befüllt würden.

### `reviere.json`

| Feld | Bedeutung |
|---|---|
| `id`, `name` | Kennung, Anzeigename |
| `wassertyp` | `salz`, `brack` oder `suess` |
| `salzgehalt_psu` | Spanne `[min, max]` |
| `bewuchsdruck` | 1 gering, 2 mittel, 3 hoch (Ampel) |
| `hauptbewuchs` | Zeitraum als Text |
| `organismen` | typische Bewuchsorganismen |
| `regeln` | Kennungen regionaler Regeln, Text in `regeltexte` |

Echte Quelle später: UBA-Bewuchsatlas, Bewuchsplatten-Monitoring, BSH/Copernicus für den Salzgehalt.

### `haefen.json`

| Feld | Bedeutung |
|---|---|
| `id`, `name` | Kennung, Anzeigename |
| `revier` | Verweis auf `reviere.id` |
| `lat`, `lon` | Lage (WGS 84, gerundet) |
| `infrastruktur` | `waschanlage`, `kran`, `trockenliegeplatz` (ja/nein) |

Echte Quelle später: OpenStreetMap (`leisure=marina`), Hafenverzeichnisse, Abfrage bei Häfen und Verbänden.

### `optionen.json`

| Feld | Bedeutung |
|---|---|
| `id`, `name`, `kurz` | Kennung, Name, Kurzbeschreibung |
| `kategorie` | `biozidfrei`, `mechanisch` (ohne Anstrich) oder `biozid` |
| `zielgruppen` | `freizeit`, `beruf` |
| `bedingungen` | `gewaesser` (erlaubte Wassertypen), `nicht_bei_regel`, `max_laenge_m`, `braucht` (Infrastruktur) |
| `produktkategorien` | Verweise auf `produktkategorien.json` (nur biozidhaltig) |
| `werte` | Kriterienwerte, siehe unten |

`nur_auf_wunsch: true` heißt: nur bewerten, wenn angekreuzt.

Werte: `umwelt`, `gesundheit`, `invasiv` als Belastungsindex 0–10 (0 = keine);
`wirksamkeit` als Index 0–10 je Bewuchsdruck `{"1":…, "2":…, "3":…}`
(diese Form ist bei jedem Wert möglich, z. B. beim Aufwand);
`kosten_eur_10m` (€ pro Saison, 10-m-Boot), `aufwand_h` (Stunden pro Saison),
`kosten_index` (0–10, Berufsschifffahrt), `treibstoff_pct` (% Mehrverbrauch),
`standzeit_jahre`.

Echte Quelle später: Gutachten bzw. Fachmodell des UBA.

### `kriterien.json`

Je Profil (`freizeit`, `beruf`) eine Liste:

| Feld | Bedeutung |
|---|---|
| `key`, `label` | Kennung, Anzeigename |
| `feld` | welcher Wert aus `optionen.werte` |
| `richtung` | `min` (weniger ist besser) oder `max` |
| `einheit`, `bereich` | Einheit und fester Wertebereich für die Normierung |
| `gewicht` | Standardgewicht (relativ) |
| `untergrenze` | Mindestanteil am Gesamtgewicht (optional) |
| `mindestwert` | Mindestanforderung; darunter wird die Option ausgeschlossen (optional) |

Unter `vorlagen` stehen je Profil die wählbaren Gewichtungen.

Echte Quelle später: AHP-Workshop mit Fachleuten.

### `produktkategorien.json`

Keine Produkte, sondern Kategorien mit den Feldern einer Zulassung für
Produktart 21: `bezeichnung`, `produktart`, `verwender` (`Laie` oder
`berufsmäßig`), `wirkstoffe` (`name`, `gehalt_prozent` als Spanne),
`gewaesser`, `bootslaenge`, `max_laenge_m`, `anwendung`, `hinweise`. Die Wirkstoffe sind in der
EU für Produktart 21 genehmigt, die Gehalte sind Beispielspannen.

Echte Quelle später: Zulassungsdaten von BAuA bzw. ECHA.

## Häfen aus OpenStreetMap

Der Workflow `.github/workflows/biozidatlas-osm.yml` (monatlich und von Hand
startbar) fragt per Overpass alle Sportboothäfen mit Namen in Deutschland ab
und schreibt `data/osm-haefen.json`. Aus den Tags wird gelesen, ob Kran,
Slipanlage, Waschanlage oder Trockenliegeplatz eingetragen sind; was nicht
eingetragen ist, gilt als unbekannt. Das Revier übernimmt jeder Hafen vom
nächsten Beispielhafen (höchstens 30 km entfernt), weiter entfernte Häfen
werden weggelassen. Auf der Karte erscheinen sie als kleine graue Punkte.

## Meeresdaten von Copernicus

Der Workflow `.github/workflows/biozidatlas-copernicus.yml` (täglich und von
Hand startbar) holt mit der Copernicus Marine Toolbox Meerestemperatur
(`thetao`), Salzgehalt (`so`) und Chlorophyll-a (`chl`) an der Oberfläche aus
den Analyse- und Vorhersagemodellen für den Nordwesteuropäischen Schelf
(Nordsee) und die Ostsee. Den passenden Datensatz mit Tagesmitteln sucht das
Skript im Katalog selbst. Für jeden Küstenhafen, auch aus OpenStreetMap, wird
der nächste Gitterpunkt mit Wasser genommen (höchstens 15 km). Die
Zugangsdaten stehen als Repository-Secrets `COPERNICUSMARINE_SERVICE_USERNAME`
und `COPERNICUSMARINE_SERVICE_PASSWORD`. Die Seite zeigt die Werte im
Steckbrief und beim Darüberfahren; die Meerestemperatur von Open-Meteo dient
nur noch als Ersatz, wenn für einen Hafen kein Copernicus-Wert vorliegt.
Chlorophyll wird grob für Küstengewässer eingeordnet: unter 3 mg/m³ niedrig,
bis 10 mittel, darüber hoch (Faustregel; nährstoffreiche Bodden liegen oft
deutlich darüber).

## Chatbot

`js/chat.js` lädt beim Klick auf „Chat starten“ WebLLM und ein offenes Modell
(Standard: Ministral 3 3B von Mistral; wählbar Gemma 2 2B, Llama 3.2 1B). Das
Modell läuft per WebGPU im Browser, die Modelldateien kommen beim ersten Start
von Hugging Face und bleiben im Browser-Cache. Bei jeder Frage bekommt das
Modell den aktuellen Stand der Seite als Text (`window.Atlas.kontext()`) und
feste Regeln: nur aus diesem Stand antworten, nichts erfinden, keine Marken,
keine Rechtsberatung. Gerechnet wird nur in `js/app.js`. Braucht ein aktuelles
Chrome oder Edge mit WebGPU und einige GB freien Grafikspeicher.

## Live-Daten

`js/live.js` fragt direkt aus dem Browser die offene REST-API von PEGELONLINE ab
(Messstellen mit Wassertemperatur, Kürzel `WT`), speichert das Ergebnis
15 Minuten in der Sitzung und ordnet jedem Hafen die nächste Messstelle im
Umkreis von 60 km zu; ab 25 km Entfernung gilt der Wert nur als grober Anhalt.
PEGELONLINE misst vor allem an Flüssen und Kanälen, an der Küste fehlen
deshalb oft Werte. Werte unter −2 °C oder über 35 °C werden verworfen,
Werte älter als 6 Stunden gekennzeichnet. Ist PEGELONLINE nicht erreichbar,
läuft die Bewertung ohne Live-Daten weiter.

Für die Küstenhäfen kommt zusätzlich die Meerestemperatur aus dem
Marine-Modell von Open-Meteo (eine Abfrage für alle Küstenhäfen, 30 Minuten
zwischengespeichert). Den Salzgehalt liefert Open-Meteo nicht; dafür wäre
Copernicus Marine nötig, das eine Registrierung verlangt.

Quellen: PEGELONLINE, Wasserstraßen- und Schifffahrtsverwaltung des Bundes;
Open-Meteo (CC BY 4.0).
Lizenz- und Nutzungsbedingungen vor einer Veröffentlichung prüfen.
