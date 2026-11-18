-- Datenbankschema des Antifouling-Atlas (Prototyp).
-- Läuft im Browser als SQLite (datenbank.html) und ist so gehalten, dass es
-- mit wenigen Typänderungen auch in PostgreSQL/PostGIS übernommen werden kann.
-- Die Daten kommen im Prototyp aus den JSON-Dateien in data/.

-- Reviere mit Bewuchsdruck (Ampel) und Gewässertyp
CREATE TABLE reviere (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  wassertyp       TEXT NOT NULL CHECK (wassertyp IN ('salz', 'brack', 'suess')),
  salz_min_psu    REAL,
  salz_max_psu    REAL,
  bewuchsdruck    INTEGER NOT NULL CHECK (bewuchsdruck BETWEEN 1 AND 3),
  hauptbewuchs    TEXT,
  regeln          TEXT            -- Kennungen regionaler Regeln, kommagetrennt
);

-- Bewuchskalender: Stärke des Bewuchses je Monat (0 kein bis 3 stark)
CREATE TABLE bewuchskalender (
  revier_id       TEXT NOT NULL REFERENCES reviere(id),
  monat           INTEGER NOT NULL CHECK (monat BETWEEN 1 AND 12),
  staerke         INTEGER NOT NULL CHECK (staerke BETWEEN 0 AND 3),
  PRIMARY KEY (revier_id, monat)
);

-- Häfen: Beispielhäfen und Häfen aus OpenStreetMap
CREATE TABLE haefen (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  revier_id         TEXT NOT NULL REFERENCES reviere(id),
  lat               REAL NOT NULL,
  lon               REAL NOT NULL,
  quelle            TEXT NOT NULL CHECK (quelle IN ('beispiel', 'osm')),
  waschanlage       INTEGER,        -- 1 ja, 0 nein, NULL unbekannt
  kran              INTEGER,
  trockenliegeplatz INTEGER,
  slipanlage        INTEGER
);

-- Bewuchsschutz-Optionen
CREATE TABLE optionen (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  kategorie       TEXT NOT NULL CHECK (kategorie IN ('biozidfrei', 'mechanisch', 'biozid')),
  kurz            TEXT,
  zielgruppen     TEXT NOT NULL,  -- freizeit, beruf (kommagetrennt)
  nur_auf_wunsch  INTEGER NOT NULL DEFAULT 0
);

-- Kennwerte der Optionen; bewuchsdruck NULL = gilt für alle Stufen
CREATE TABLE optionswerte (
  option_id       TEXT NOT NULL REFERENCES optionen(id),
  feld            TEXT NOT NULL,  -- z. B. umwelt, wirksamkeit, kosten_eur_10m, aufwand_h
  bewuchsdruck    INTEGER CHECK (bewuchsdruck BETWEEN 1 AND 3),
  wert            REAL NOT NULL
);

-- Bewertungskriterien je Profil
CREATE TABLE kriterien (
  profil          TEXT NOT NULL CHECK (profil IN ('freizeit', 'beruf')),
  key             TEXT NOT NULL,
  label           TEXT NOT NULL,
  feld            TEXT NOT NULL,
  richtung        TEXT NOT NULL CHECK (richtung IN ('min', 'max')),
  bereich_min     REAL NOT NULL,
  bereich_max     REAL NOT NULL,
  gewicht         REAL NOT NULL,
  untergrenze     REAL,
  mindestwert     REAL,
  PRIMARY KEY (profil, key)
);

-- Biozidhaltige Produktkategorien (Produktart 21), keine Marken
CREATE TABLE produktkategorien (
  id              TEXT PRIMARY KEY,
  bezeichnung     TEXT NOT NULL,
  verwender       TEXT NOT NULL CHECK (verwender IN ('Laie', 'berufsmäßig')),
  gewaesser       TEXT NOT NULL,
  bootslaenge     TEXT,
  max_laenge_m    REAL,
  anwendung       TEXT
);

CREATE TABLE wirkstoffe (
  produktkategorie_id TEXT NOT NULL REFERENCES produktkategorien(id),
  name            TEXT NOT NULL,
  gehalt_min_pct  REAL,
  gehalt_max_pct  REAL
);

-- Messwerte von Copernicus Marine (täglich, Tagesmittel am nächsten Gitterpunkt)
CREATE TABLE messwerte (
  hafen_id        TEXT NOT NULL REFERENCES haefen(id),
  quelle          TEXT NOT NULL,
  datum           TEXT NOT NULL,
  temp_c          REAL,
  salz_psu        REAL,
  chl_mg_m3       REAL,
  abstand_km      REAL,
  PRIMARY KEY (hafen_id, quelle, datum)
);

-- Citizen Science: je Zeile eine Ablesung einer Bewuchstafel
CREATE TABLE bewuchstafeln (
  id                TEXT PRIMARY KEY,
  hafen_id          TEXT NOT NULL REFERENCES haefen(id),
  tafel             TEXT NOT NULL,
  ausgebracht       TEXT NOT NULL,  -- Datum JJJJ-MM-TT
  abgelesen         TEXT NOT NULL,
  tiefe_m           REAL NOT NULL,
  bedeckung_prozent REAL NOT NULL CHECK (bedeckung_prozent BETWEEN 0 AND 100),
  bild              TEXT,
  melder            TEXT NOT NULL,
  geprueft          INTEGER NOT NULL DEFAULT 0,
  bemerkung         TEXT,
  CHECK (abgelesen >= ausgebracht)
);

-- Zusammensetzung des Bewuchses je Ablesung (Anteile summieren sich auf 100)
CREATE TABLE tafel_organismen (
  tafel_id        TEXT NOT NULL REFERENCES bewuchstafeln(id),
  organismus      TEXT NOT NULL,
  anteil_prozent  REAL NOT NULL CHECK (anteil_prozent BETWEEN 0 AND 100)
);

-- Beiträge auf den Hafenseiten, immer im selben Aufbau
CREATE TABLE beitraege (
  id                TEXT PRIMARY KEY,
  hafen_id          TEXT NOT NULL REFERENCES haefen(id),
  reihenfolge       INTEGER NOT NULL DEFAULT 1,
  status            TEXT NOT NULL CHECK (status IN ('entwurf', 'veroeffentlicht')),
  ueberschrift      TEXT NOT NULL,
  unterueberschrift TEXT,
  autor             TEXT NOT NULL,
  datum             TEXT NOT NULL,
  quelle            TEXT,
  lizenz            TEXT,
  schlagworte       TEXT,           -- kommagetrennt
  bild              TEXT,           -- Pfad unter data/
  bild_alt          TEXT,
  bildnachweis      TEXT,
  text              TEXT NOT NULL
);
