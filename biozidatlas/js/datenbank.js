/* Datenbank: baut aus den JSON-Dateien des Atlas eine SQLite-Datenbank im
   Browser (sql.js) nach dem Schema in data/schema.sql und zeigt Tabellen,
   Abfragen und das Schema. */
(function () {
  "use strict";

  const A = window.Atlasdaten;
  const { esc, zahl } = A;
  const $ = (s) => document.querySelector(s);
  const SEITE = 50;

  const BESCHREIBUNG = {
    reviere: "Reviere mit Gewässertyp und Bewuchsdruck",
    bewuchskalender: "Stärke des Bewuchses je Revier und Monat",
    haefen: "Beispielhäfen und Häfen aus OpenStreetMap",
    optionen: "Bewuchsschutz-Optionen",
    optionswerte: "Kennwerte je Option, teils je Bewuchsdruck",
    kriterien: "Bewertungskriterien je Profil",
    produktkategorien: "Biozidhaltige Produktkategorien (keine Marken)",
    wirkstoffe: "Wirkstoffe je Produktkategorie",
    messwerte: "Copernicus Marine, je Küstenhafen",
    bewuchstafeln: "Ablesungen von Bewuchstafeln (Citizen Science)",
    tafel_organismen: "Zusammensetzung des Bewuchses je Ablesung",
    beitraege: "Beiträge auf den Hafenseiten",
  };

  const BEISPIELE = [
    {
      label: "Bewuchsintensität je Hafen",
      sql: `SELECT h.name AS hafen, COUNT(*) AS ablesungen,
       MAX(t.bedeckung_prozent) AS hoechste_bedeckung,
       MAX(t.abgelesen) AS letzte_ablesung
FROM bewuchstafeln t JOIN haefen h ON h.id = t.hafen_id
GROUP BY h.name ORDER BY hoechste_bedeckung DESC;`,
    },
    {
      label: "Häufigste Organismen",
      sql: `SELECT organismus, COUNT(*) AS ablesungen, ROUND(AVG(anteil_prozent), 1) AS mittlerer_anteil
FROM tafel_organismen GROUP BY organismus ORDER BY ablesungen DESC;`,
    },
    {
      label: "Wärmste Küstenhäfen heute",
      sql: `SELECT h.name, r.name AS revier, m.temp_c, m.salz_psu, m.chl_mg_m3
FROM messwerte m JOIN haefen h ON h.id = m.hafen_id JOIN reviere r ON r.id = h.revier_id
ORDER BY m.temp_c DESC LIMIT 15;`,
    },
    {
      label: "Wirksamkeit bei hohem Bewuchsdruck",
      sql: `SELECT o.name, o.kategorie, w.wert AS wirksamkeit
FROM optionen o JOIN optionswerte w ON w.option_id = o.id
WHERE w.feld = 'wirksamkeit' AND w.bewuchsdruck = 3
ORDER BY w.wert DESC;`,
    },
    {
      label: "Beiträge je Hafen",
      sql: `SELECT h.name AS hafen, b.status, COUNT(*) AS beitraege
FROM beitraege b JOIN haefen h ON h.id = b.hafen_id
GROUP BY h.name, b.status ORDER BY h.name;`,
    },
    {
      label: "Häfen je Revier und Quelle",
      sql: `SELECT r.name AS revier, h.quelle, COUNT(*) AS haefen
FROM haefen h JOIN reviere r ON r.id = h.revier_id
GROUP BY r.name, h.quelle ORDER BY r.name, h.quelle;`,
    },
  ];

  let db = null;
  let aktiv = { tabelle: null, seite: 0, filter: "" };

  const janein = (b) => (b === true ? 1 : b === false ? 0 : null);

  // Füllt alle Tabellen aus den JSON-Dateien in einer Transaktion.
  function befuellen(D, kr, op, pk) {
    const ins = (tabelle, zeilen) => {
      if (!zeilen.length) return;
      const spalten = Object.keys(zeilen[0]);
      const st = db.prepare(`INSERT INTO ${tabelle} (${spalten.join(",")}) VALUES (${spalten.map(() => "?").join(",")})`);
      zeilen.forEach((z) => st.run(spalten.map((s) => (z[s] === undefined ? null : z[s]))));
      st.free();
    };
    db.run("BEGIN");
    ins("reviere", D.reviereListe.map((r) => ({
      id: r.id, name: r.name, wassertyp: r.wassertyp, salz_min_psu: r.salzgehalt_psu[0], salz_max_psu: r.salzgehalt_psu[1],
      bewuchsdruck: r.bewuchsdruck, hauptbewuchs: r.hauptbewuchs, regeln: r.regeln.join(","),
    })));
    ins("bewuchskalender", D.reviereListe.flatMap((r) => r.bewuchs_kalender.map((s, i) => ({ revier_id: r.id, monat: i + 1, staerke: s }))));
    ins("haefen", D.beispielhaefen.concat(D.osmhaefen).map((h) => ({
      id: h.id, name: h.name, revier_id: h.revier, lat: h.lat, lon: h.lon, quelle: h.quelle,
      waschanlage: janein(h.infrastruktur.waschanlage), kran: janein(h.infrastruktur.kran),
      trockenliegeplatz: janein(h.infrastruktur.trockenliegeplatz), slipanlage: janein(h.infrastruktur.slipanlage),
    })));
    ins("optionen", op.optionen.map((o) => ({
      id: o.id, name: o.name, kategorie: o.kategorie, kurz: o.kurz, zielgruppen: o.zielgruppen.join(","), nur_auf_wunsch: o.nur_auf_wunsch ? 1 : 0,
    })));
    ins("optionswerte", op.optionen.flatMap((o) => Object.entries(o.werte).flatMap(([feld, v]) => {
      if (feld === "kosten_aufteilung") {
        return Object.entries(v).filter(([, x]) => x != null).map(([k, x]) => ({ option_id: o.id, feld: "kosten_" + k, bewuchsdruck: null, wert: x }));
      }
      if (typeof v === "object") return Object.entries(v).map(([d, x]) => ({ option_id: o.id, feld, bewuchsdruck: Number(d), wert: x }));
      return [{ option_id: o.id, feld, bewuchsdruck: null, wert: v }];
    })));
    ins("kriterien", ["freizeit", "beruf"].flatMap((p) => kr[p].map((c) => ({
      profil: p, key: c.key, label: c.label, feld: c.feld, richtung: c.richtung, bereich_min: c.bereich[0], bereich_max: c.bereich[1],
      gewicht: c.gewicht, untergrenze: c.untergrenze == null ? null : c.untergrenze, mindestwert: c.mindestwert == null ? null : c.mindestwert,
    }))));
    ins("produktkategorien", pk.kategorien.map((p) => ({
      id: p.id, bezeichnung: p.bezeichnung, verwender: p.verwender, gewaesser: p.gewaesser.join(","), bootslaenge: p.bootslaenge,
      max_laenge_m: p.max_laenge_m == null ? null : p.max_laenge_m, anwendung: p.anwendung,
    })));
    ins("wirkstoffe", pk.kategorien.flatMap((p) => p.wirkstoffe.map((w) => ({
      produktkategorie_id: p.id, name: w.name, gehalt_min_pct: w.gehalt_prozent[0], gehalt_max_pct: w.gehalt_prozent[1],
    }))));
    ins("messwerte", Object.entries(D.cop).filter(([id]) => D.hafen[id]).map(([id, c]) => ({
      hafen_id: id, quelle: "copernicus", datum: c.zeit, temp_c: c.temp == null ? null : c.temp, salz_psu: c.salz == null ? null : c.salz,
      chl_mg_m3: c.chl == null ? null : c.chl, abstand_km: c.km,
    })));
    ins("bewuchstafeln", D.tafeln.map((t) => ({
      id: t.id, hafen_id: t.hafen_id, tafel: t.tafel, ausgebracht: t.ausgebracht, abgelesen: t.abgelesen, tiefe_m: t.tiefe_m,
      bedeckung_prozent: t.bedeckung_prozent, bild: t.bild, melder: t.melder, geprueft: t.geprueft ? 1 : 0, bemerkung: t.bemerkung,
    })));
    ins("tafel_organismen", D.tafeln.flatMap((t) => t.organismen.map((o) => ({ tafel_id: t.id, organismus: o.name, anteil_prozent: o.anteil_prozent }))));
    ins("beitraege", D.beitraege.map((b) => ({
      id: b.id, hafen_id: b.hafen_id, reihenfolge: b.reihenfolge, status: b.status, ueberschrift: b.ueberschrift, unterueberschrift: b.unterueberschrift,
      autor: b.metadaten.autor, datum: b.metadaten.datum, quelle: b.metadaten.quelle, lizenz: b.metadaten.lizenz,
      schlagworte: (b.metadaten.schlagworte || []).join(","), bild: b.bild ? b.bild.datei : null,
      bild_alt: b.bild ? b.bild.alt : null, bildnachweis: b.bild ? b.bild.bildnachweis : null, text: b.text,
    })));
    db.run("COMMIT");
  }

  function tabelleHTML(res, max = Infinity) {
    if (!res) return "<tbody><tr><td>Keine Zeilen.</td></tr></tbody>";
    const zeilen = res.values.slice(0, max);
    const zelle = (v) => (v === null ? '<span class="leer">NULL</span>' : typeof v === "number" ? `<span class="num-v">${esc(zahl(v, Number.isInteger(v) ? 0 : 2))}</span>` : esc(String(v).length > 140 ? String(v).slice(0, 140) + " …" : v));
    return `<thead><tr>${res.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${zeilen.map((z) => `<tr>${z.map((v) => `<td>${zelle(v)}</td>`).join("")}</tr>`).join("")}</tbody>`;
  }

  function tabellenUebersicht() {
    const namen = db.exec("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY rowid")[0].values.map((v) => v[0]);
    $("#tabellen").innerHTML = `<thead><tr><th>Tabelle</th><th class="num">Zeilen</th><th>Inhalt</th></tr></thead><tbody>${namen
      .map((n) => {
        const anzahl = db.exec(`SELECT COUNT(*) FROM ${n}`)[0].values[0][0];
        return `<tr><td><a href="#${n}">${n}</a></td><td class="num">${zahl(anzahl)}</td><td>${esc(BESCHREIBUNG[n] || "")}</td></tr>`;
      })
      .join("")}</tbody>`;
    return namen;
  }

  function ansicht() {
    const t = aktiv.tabelle;
    const spalten = db.exec(`PRAGMA table_info(${t})`)[0].values.map((v) => v[1]);
    const where = aktiv.filter ? `WHERE ${spalten.map((s) => `CAST(${s} AS TEXT) LIKE $f`).join(" OR ")}` : "";
    const params = aktiv.filter ? { $f: "%" + aktiv.filter + "%" } : {};
    const st = db.prepare(`SELECT COUNT(*) FROM ${t} ${where}`);
    st.bind(params); st.step();
    const gesamt = st.get()[0]; st.free();
    const res = db.exec(`SELECT * FROM ${t} ${where} LIMIT ${SEITE} OFFSET ${aktiv.seite * SEITE}`, params)[0];
    $("#ansicht-titel").textContent = `Tabelle ${t} (${zahl(gesamt)} Zeilen)`;
    $("#ansicht").innerHTML = tabelleHTML(res);
    const seiten = Math.max(1, Math.ceil(gesamt / SEITE));
    $("#blaettern").innerHTML = seiten > 1
      ? `<button type="button" class="btn-ghost" id="zurueck"${aktiv.seite === 0 ? " disabled" : ""}>zurück</button>
         <span class="hint">Seite ${aktiv.seite + 1} von ${seiten}</span>
         <button type="button" class="btn-ghost" id="weiter"${aktiv.seite >= seiten - 1 ? " disabled" : ""}>weiter</button>`
      : "";
    if (seiten > 1) {
      $("#zurueck").addEventListener("click", () => { aktiv.seite--; ansicht(); });
      $("#weiter").addEventListener("click", () => { aktiv.seite++; ansicht(); });
    }
  }

  function zeigeTabelle(namen) {
    const t = decodeURIComponent(location.hash.slice(1));
    aktiv = { tabelle: namen.includes(t) ? t : "bewuchstafeln", seite: 0, filter: "" };
    $("#filter").value = "";
    ansicht();
    if (namen.includes(t)) $("#ansicht-card").scrollIntoView({ block: "start" });
  }

  function ausfuehren() {
    const sql = $("#sql").value;
    try {
      const t0 = performance.now();
      const res = db.exec(sql);
      const letzte = res[res.length - 1];
      $("#ergebnis").innerHTML = letzte ? tabelleHTML(letzte, 500) : "";
      $("#sql-meldung").textContent = letzte
        ? `${zahl(letzte.values.length)} Zeilen in ${zahl(performance.now() - t0)} ms${letzte.values.length > 500 ? ", die ersten 500 angezeigt" : ""}.`
        : "Ausgeführt, kein Ergebnis zum Anzeigen.";
    } catch (e) {
      $("#ergebnis").innerHTML = "";
      $("#sql-meldung").textContent = "Fehler: " + e.message;
    }
  }

  async function init() {
    const [SQL, D, schema, kr, op, pk] = await Promise.all([
      initSqlJs({ locateFile: (f) => "vendor/sql.js/" + f }),
      A.ladeAlles(),
      fetch("data/schema.sql?v=1").then((r) => r.text()),
      A.loadJSON("kriterien"), A.loadJSON("optionen"), A.loadJSON("produktkategorien"),
    ]);
    db = new SQL.Database();
    db.run(schema);
    befuellen(D, kr, op, pk);
    $("#schema").textContent = schema;
    const namen = tabellenUebersicht();
    const summe = namen.reduce((s, n) => s + db.exec(`SELECT COUNT(*) FROM ${n}`)[0].values[0][0], 0);
    $("#db-status").textContent = `${namen.length} Tabellen, ${zahl(summe)} Zeilen`;
    zeigeTabelle(namen);
    window.addEventListener("hashchange", () => zeigeTabelle(namen));
    $("#filter").addEventListener("input", (e) => { aktiv.filter = e.target.value.trim(); aktiv.seite = 0; ansicht(); });
    $("#beispiele").innerHTML = BEISPIELE.map((b, i) => `<button type="button" class="btn-ghost" data-i="${i}">${esc(b.label)}</button>`).join("");
    $("#beispiele").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { $("#sql").value = BEISPIELE[b.dataset.i].sql; ausfuehren(); }));
    $("#sql").value = BEISPIELE[0].sql;
    $("#ausfuehren").addEventListener("click", ausfuehren);
    ausfuehren();
  }

  init().catch((e) => {
    $("#db-status").textContent = "Fehler beim Aufbau: " + e.message;
    console.error(e);
  });
})();
