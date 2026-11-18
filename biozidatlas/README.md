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
  index.html              Atlas (Karte, Bewertung, Chat)
  hafen.html              Hafenseiten: Übersicht und je Hafen eine Seite
  eingabe.html            Eingabeformulare für Beiträge und Bewuchstafeln
  datenbank.html          Alle Daten als SQLite-Datenbank im Browser
  style.css               Gestaltung (hell und dunkel)
  js/mcda.js              Verfahren: gewichtete Summe, TOPSIS, PROMETHEE II, Borda-Konsens, Robustheit
  js/live.js              PEGELONLINE und Open-Meteo, nächste Messstelle, Faustregel zur Saison
  js/app.js               Karte, Regeln, Darstellung, Stand als Text für Druck und Chat
  js/zugang.js            Anmeldung und Rollen (Demo)
  js/assistent.js         Assistent: Fragen, Rundgänge, optional KI-Modell
  js/sprache.js           Spracheingabe: Mikrofon, Pausenerkennung, Vorlesen
  js/sprache-worker.js    Spracherkennung mit Whisper im Hintergrund (transformers.js)
  vendor/transformers/    transformers.js 4.3.1 (Apache-2.0)
  modelle/                Whisper Base und ONNX Runtime; nicht in main, siehe „Spracheingabe“
  tools/sprachmodell_holen.py  Holt Modell und Laufzeit für den Zweig biozidatlas-modelle
  anleitung.html          Anleitungsvideo mit Kapiteln und Demo-Zugang
  tools/video/            Drehbuch, Aufnahme, Stimme und Schnitt des Anleitungsvideos
  video/                  Das fertige Video; nicht in main, siehe „Anleitungsvideo“
  js/daten.js             Gemeinsamer Code der Unterseiten: Laden, lokale Einträge, Darstellung
  js/hafenseite.js        Hafenseiten
  js/eingabe.js           Eingabe, Prüfung, Speichern und Einreichen
  js/datenbank.js         Aufbau der Datenbank, Tabellen, Abfragen
  data/schema.sql         Datenbankschema (SQLite, nach PostgreSQL übertragbar)
  data/hilfe.json         Hilfetexte des Assistenten
  data/rundgaenge.json    Rundgänge des Assistenten
  data/bewuchstafeln.json Ablesungen von Bewuchstafeln (Beispieldaten)
  data/beitraege.json     Beiträge der Hafenseiten (Beispieldaten)
  data/bilder/            Bilder zu Beiträgen und Tafeln
  tools/eingabe_uebernehmen.py  Übernahme freigegebener Einreichungen
  data/*.json             Beispieldaten (siehe unten)
  data/osm-haefen.json    Häfen aus OpenStreetMap (vom GitHub-Actions-Job geschrieben)
  tools/osm_haefen.py     Overpass-Abfrage für data/osm-haefen.json
  data/copernicus.json    Meeresdaten von Copernicus (vom GitHub-Actions-Job geschrieben)
  tools/copernicus.py     Abfrage bei Copernicus Marine für data/copernicus.json
  vendor/leaflet/         Leaflet 1.9.4 (BSD-2-Clause)
  vendor/web-llm/         WebLLM 0.2.86 (Apache-2.0)
  vendor/sql.js/          sql.js 1.13.0, SQLite im Browser (MIT)
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

## Hafenseiten, Eingabe und Datenbank

**Hafenseiten** (`hafen.html#<hafen-id>`): Jeder Hafen, auch aus
OpenStreetMap, hat eine Seite mit Grunddaten, Bewuchskalender, Messwerten von
Copernicus, der Bewuchsintensität aus den Bewuchstafeln (Kennzahl, Verlauf je
Ablesung, Karten der einzelnen Ablesungen) und Beiträgen. Ohne Kennung zeigt
`hafen.html` eine Übersicht mit Suche. Im Atlas führt „Hafenseite“ im
Steckbrief dorthin.

**Beiträge** haben immer denselben Aufbau: Überschrift, Unterüberschrift,
Metadaten (Autor/in, Datum, Quelle, Lizenz, Schlagworte), Bild mit
Bildbeschreibung und Bildnachweis, Erklärung. So können Mitarbeitende die
Seiten ergänzen, ohne an der Gestaltung etwas zu ändern. Nur Beiträge mit
Status `veroeffentlicht` erscheinen.

**Bewuchstafeln** (Citizen Science): je Ablesung Tafel, Datum des Ausbringens
und Ablesens, Tiefe, bewachsener Anteil und Zusammensetzung des Bewuchses.
Ohne eigenes Foto zeigt die Seite ein Beispielfoto des häufigsten Organismus
von Wikimedia Commons, mit Urheber und Lizenz.

**Fotos** (`data/fotos.json`, `data/bilder/fotos/`): ausgewählte Fotos von
Wikimedia Commons, nur Public Domain, CC0, CC BY und CC BY-SA, Urheber und
Lizenz aus der Commons-API. Neue Kandidaten holt der Workflow „Antifouling-Atlas
- Fotos von Wikimedia Commons“ nach `data/fotos-kandidaten.json`; ausgewählt wird
von Hand. Beiträge verweisen mit `bild.foto` auf ein Foto oder mit
`bild.datei` auf ein eigenes Bild.

**Eingabe** (`eingabe.html`): Formulare mit genau den Feldern der Tabellen
`beitraege` und `bewuchstafeln`, Live-Vorschau, Prüfung der Pflichtfelder und
Regeln, Bild-Upload (auf 900 px verkleinert). Speichern geht im Prototyp auf
zwei Wegen:

1. **Im Browser speichern:** Der Eintrag erscheint gekennzeichnet auf der
   Hafenseite, aber nur im eigenen Browser (localStorage).
2. **Zur Prüfung einreichen:** öffnet einen vorausgefüllten Vorgang (Issue)
   auf GitHub mit dem Datensatz als JSON; ein Bild wird dort hineingezogen.
   Gibt die Redaktion den Vorgang frei (Label `freigegeben` oder Workflow
   „Antifouling-Atlas - Eingabe übernehmen“ von Hand mit der Vorgangsnummer),
   prüft `tools/eingabe_uebernehmen.py` den Datensatz nach denselben Regeln,
   lädt das Bild herunter, vergibt eine Kennung, schreibt den Eintrag in die
   Daten, kommentiert und schließt den Vorgang und veröffentlicht die Seite
   neu. Labels setzen und Workflows starten können nur Personen mit Rechten
   am Repository; ohne Freigabe kommt nichts hinein.

Später ersetzt eine Verwaltungsoberfläche mit Anmeldung (z. B. Directus) an
der echten Datenbank beide Wege. Jeder übernommene Eintrag trägt die Nummer
seines Vorgangs (`vorgang`); ein Vorgang wird nur einmal übernommen.

**Datenbank** (`datenbank.html`): baut beim Öffnen mit sql.js eine
SQLite-Datenbank nach `data/schema.sql` und füllt sie aus allen JSON-Dateien
(12 Tabellen, gut 2.000 Zeilen). Die Seite zeigt, woher die Daten kommen, und alle
Tabellen mit Filter und Blättern.

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

## Assistent und Rundgänge

Auf jeder Seite sitzt unten rechts ein Knopf mit Muschel und Fragezeichen.
Der Assistent beantwortet Fragen aus den Hilfetexten in `data/hilfe.json`
(Suche über Stichworte, ohne Download) und startet Rundgänge aus
`data/rundgaenge.json`: Ein Rundgang hebt Schritt für Schritt ein Element der
Seite hervor und erklärt es; liegt er auf einer anderen Seite, wechselt der
Assistent dorthin. Rundgänge für alle: „Den Atlas kennenlernen“ und „Eine
Hafenseite lesen“; für Wissenschaft zusätzlich „Einen Beitrag eingeben“, „Eine
Ablesung eingeben“ (Feld für Feld) und „Die Datenbank“. Beim Öffnen bietet der
Assistent oben gleich den Rundgang und die häufigen Fragen zu dem Bereich an, in
dem man gerade ist, in der Eingabe passend zum offenen Reiter; die übrigen
Rundgänge stehen eingeklappt unter „Andere Rundgänge“. Auf einer geöffneten
Hafenseite läuft der Hafen-Rundgang auf diesem Hafen.

Das Gespräch bleibt beim Wechsel zwischen den Seiten erhalten (sessionStorage,
bis der Tab geschlossen wird). Gehört eine Frage zur Eingabe oder Datenbank,
bietet der Assistent die Anmeldung an und beantwortet die Frage danach sofort,
ohne dass man sie noch einmal stellen muss.

Auf Wunsch lädt der Assistent ein offenes Sprachmodell im Browser (WebLLM;
Ministral 3 3B von Mistral, Gemma 2 2B oder Llama 3.2 1B, je in 16- und
32-Bit-Variante mit automatischem Ausweichen). Es antwortet dann frei, aber nur
aus den passenden Hilfetexten und dem Stand der Seite (`window.Atlas.kontext()`
im Atlas, sonst dem Text der Seite).

## Spracheingabe

Im Assistenten steht neben „Fragen“ ein Mikrofon; im Rundgang gibt es ein
eigenes. Ein Tipp darauf startet das Gespräch: Der Assistent hört zu, erkennt
das Ende des Satzes an der Pause, wandelt die Sprache in Text um, antwortet,
liest die Antwort vor und hört danach weiter zu. Er hört auf bei „stopp“ oder
„danke“, bei einem weiteren Tipp aufs Mikrofon, beim Schließen des Fensters
oder wenn neun Sekunden lang niemand spricht.

Was der Assistent per Sprache versteht:

- Fragen wie beim Tippen, etwa „Wo kommen die Daten her?“
- im Rundgang: „weiter“, „zurück“, „wiederholen“, „beenden“; jeder Schritt
  wird vorgelesen
- „Rundgang“, „Atlas“, „Hafenseiten“, „Eingabe“, „Datenbank“
- Häfen: „Hafen Husum“ wählt im Atlas den Hafen und liest die Kurzantwort
  „Geht es hier ohne Biozid?“ vor; auf den Hafenseiten oder mit „Hafenseite
  Warnemünde“ öffnet sich die Seite des Hafens. Weil die Erkennung Ortsnamen
  oft falsch schreibt, vergleicht der Assistent sie auch nach Klang (Kölner
  Phonetik): „Wahrne Monday“ wird Warnemünde, „Hafenkühl“ wird Kiel.
- „Freizeitboot“, „Berufsschifffahrt“

Technik: Whisper Base von OpenAI (MIT-Lizenz, 8 Bit, 77 MB) läuft über
transformers.js und ONNX Runtime (WebAssembly) in einem Web Worker im Browser.
Whisper bekommt das Vokabular des Atlas als Vorab-Text, das verbessert kurze
Befehle deutlich. Vorgelesen wird nur mit Stimmen, die auf dem Gerät laufen;
gibt es keine deutsche, entfällt „vorlesen“. Weder Audio noch Text verlassen
den Rechner. Beim ersten Mal lädt der Browser etwa 100 MB, jede Datei genau
einmal (der Worker lädt die großen Dateien selbst, sonst holt transformers.js
sie doppelt) und legt sie im Speicher des Browsers ab (Cache API); ab dem
zweiten Mal ist die Erkennung nach wenigen Sekunden bereit. Eine Äußerung braucht auf einem 4-Kern-Server ohne
Grafikkarte rund 4 Sekunden; mehr Tempo brächten WebGPU oder Threads, die aber
besondere Server-Kopfzeilen brauchen, die GitHub Pages nicht setzt.

Die Modelldateien liegen nicht in main, sondern auf dem Zweig
`biozidatlas-modelle` (Workflow `biozidatlas-sprachmodell.yml`, Aufruf von
Hand). `publish.yml` kopiert sie beim Veröffentlichen nach
`biozidatlas/modelle/`. Für einen lokalen Test:

    git fetch origin biozidatlas-modelle
    mkdir -p biozidatlas/modelle && git archive FETCH_HEAD | tar -x -C biozidatlas/modelle

Grenzen: Mikrofon braucht HTTPS oder localhost. Nach einem Seitenwechsel per
Sprache verlangen die meisten Browser einen neuen Tipp aufs Mikrofon.
Whisper Base irrt sich bei einzelnen Wörtern öfter als bei ganzen Sätzen.

## Anleitungsvideo

`anleitung.html` zeigt ein Video von etwa acht Minuten durch den ganzen Atlas
(Atlas, Hafenseiten, Assistent, Anmeldung mit Demo-Zugang, Eingabe,
Datenbank), mit Kapiteln zum Springen, Untertiteln und den Zugangsdaten für
die Wissenschaft daneben.

Das Video wird nicht von Hand geschnitten, sondern erzeugt
(Workflow `biozidatlas-video.yml`, Aufruf von Hand):

1. `tools/video/video.mjs texte` schreibt die Sprechtexte des Drehbuchs.
2. `tools/video/sprechen.py` spricht sie mit Piper und der freien Stimme
   „Thorsten“ (Thorsten-Voice, CC0); ohne Piper mit pico2wave.
3. `tools/video/video.mjs aufnahme` bedient die veröffentlichte Seite mit
   Playwright, Szene für Szene so lange wie der gesprochene Text, und nimmt
   sie in Full HD auf. `tools/video/overlay.js` blendet Untertitel, einen
   sichtbaren Mauszeiger, einen Rahmen um das erklärte Element und
   Titelkarten ein.
4. `tools/video/schnitt.py` setzt Bilder und Sprachspur zu `anleitung.mp4`
   zusammen und schreibt Titelbild, Kapitel und Untertitel.

Das Ergebnis liegt auf dem Zweig `biozidatlas-video`; `publish.yml` kopiert
es nach `biozidatlas/video/`. Ändert sich der Atlas, genügt ein neuer Lauf
des Workflows. Sprechtexte und Abläufe stehen in `SZENEN` in
`tools/video/video.mjs`.

## Anmeldung und Rollen

Atlas und Hafenseiten sind für alle offen. Eingabe und Datenbank erscheinen
erst nach der Anmeldung als Wissenschaftlerin oder Wissenschaftler
(`js/zugang.js`); ohne Anmeldung zeigen diese Seiten einen Hinweis, und auf den
Hafenseiten fehlen die Knöpfe zum Eingeben. Im Prototyp ist das eine
Demo-Anmeldung (Benutzer `wissenschaft`, Passwort `atlas`), die sich die Rolle
nur im Browser merkt. Sie schützt keine Daten: Die Dateien bleiben abrufbar.
Im echten Betrieb gehört eine Anmeldung über das Dienstkonto mit Prüfung auf
dem Server dazu.

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
