# Antifouling-Atlas (Prototyp)

Interaktiver Prototyp: Welcher Bewuchsschutz passt zu welchem Liegeplatz?
Karte der Häfen, Ausschluss nach Regeln, Bewertung mit drei MCDA-Verfahren
und Live-Wassertemperatur von PEGELONLINE. Statische Seite ohne Server,
läuft auf GitHub Pages.

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
  js/live.js              PEGELONLINE-Abfrage, nächste Messstelle, Faustregel zur Saison
  js/app.js               Karte, Regeln, Darstellung
  data/*.json             Beispieldaten (siehe unten)
  vendor/leaflet/         Leaflet 1.9.4 (BSD-2-Clause)
```

## Ablauf der Bewertung

1. **Ausschluss:** Optionen, die rechtlich oder technisch nicht passen, fallen
   heraus (Gewässertyp, regionale Regel, Bootslänge, fehlende Waschanlage oder
   fehlender Kran). Ausschluss wird nie gewichtet.
2. **Bewertung:** Jeder Wert wird über einen festen Wertebereich auf 0–1
   normiert und mit dem Gewicht verrechnet. Wählbar: gewichtete Summe, TOPSIS,
   PROMETHEE II (lineare Präferenz, q = 0,05, p = 0,4).
3. **Robustheit:** 400 Durchläufe mit Gewichten ±25 % und Werten ±15 %;
   angezeigt wird, wie oft Platz 1 vorn bleibt.

Die Umwelt behält immer mindestens 20 % des Gewichts (`untergrenze` in
`kriterien.json`).

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

Werte: `umwelt`, `gesundheit`, `invasiv` als Belastungsindex 0–10 (0 = keine);
`wirksamkeit` als Index 0–10 je Bewuchsdruck `{"1":…, "2":…, "3":…}`;
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

Echte Quelle später: AHP-Workshop mit Fachleuten.

### `produktkategorien.json`

Keine Produkte, sondern Kategorien mit den Feldern einer Zulassung für
Produktart 21: `bezeichnung`, `produktart`, `verwender` (`Laie` oder
`berufsmäßig`), `wirkstoffe` (`name`, `gehalt_prozent` als Spanne),
`gewaesser`, `bootslaenge`, `anwendung`, `hinweise`. Die Wirkstoffe sind in der
EU für Produktart 21 genehmigt, die Gehalte sind Beispielspannen.

Echte Quelle später: Zulassungsdaten von BAuA bzw. ECHA.

## Live-Daten

`js/live.js` fragt direkt aus dem Browser die offene REST-API von PEGELONLINE ab
(Messstellen mit Wassertemperatur, Kürzel `WT`), speichert das Ergebnis
15 Minuten in der Sitzung und ordnet jedem Hafen die nächste Messstelle im
Umkreis von 40 km zu. Werte unter −2 °C oder über 35 °C werden verworfen,
Werte älter als 6 Stunden gekennzeichnet. Ist PEGELONLINE nicht erreichbar,
läuft die Bewertung ohne Live-Daten weiter.

Quelle: PEGELONLINE, Wasserstraßen- und Schifffahrtsverwaltung des Bundes.
Lizenz- und Nutzungsbedingungen vor einer Veröffentlichung prüfen.
