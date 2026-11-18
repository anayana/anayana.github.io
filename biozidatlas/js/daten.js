/* Gemeinsamer Code für Hafenseite, Eingabe und Datenbank: Daten laden,
   Einträge aus diesem Browser verwalten und Beiträge sowie Bewuchstafeln in
   einheitlicher Form darstellen. Alle Fachwerte sind Beispieldaten. */
(function (root) {
  "use strict";

  const WASSER = { salz: "Salzwasser", brack: "Brackwasser", suess: "Süßwasser" };
  const DRUCK = { 1: "gering", 2: "mittel", 3: "hoch" };
  const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const ORGANISMEN = ["Seepocken", "Miesmuscheln", "Dreikantmuscheln", "Quaggamuscheln", "Moostierchen", "Seescheiden", "Grünalgen", "Algen", "Biofilm"];
  const LIZENZEN = ["CC BY 4.0", "CC0 1.0", "eigene Aufnahme", "intern"];

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const zahl = (n, d = 0) => Number(n).toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const datum = (iso) => (iso ? new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "");

  async function loadJSON(name, pflicht = true) {
    try {
      const res = await fetch("data/" + name + ".json?v=8");
      if (!res.ok) throw new Error(name + ".json: " + res.status);
      return await res.json();
    } catch (e) {
      if (pflicht) throw e;
      return null;
    }
  }

  async function ladeAlles() {
    const [rv, hf, osm, cop, tf, bt, fo] = await Promise.all([
      loadJSON("reviere"), loadJSON("haefen"), loadJSON("osm-haefen", false),
      loadJSON("copernicus", false), loadJSON("bewuchstafeln"), loadJSON("beitraege"), loadJSON("fotos", false),
    ]);
    FOTOS = fo ? fo.fotos : {};
    const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
    const beispiel = hf.haefen.map((h) => ({ ...h, quelle: "beispiel" }));
    const osmHaefen = (osm ? osm.haefen : []).map((h) => ({ ...h, quelle: "osm" }));
    return {
      reviere: byId(rv.reviere),
      reviereListe: rv.reviere,
      regeltexte: rv.regeltexte,
      beispielhaefen: beispiel,
      osmhaefen: osmHaefen,
      hafen: { ...byId(osmHaefen), ...byId(beispiel) },
      cop: cop ? cop.werte : {},
      copStand: cop ? cop.stand : null,
      tafeln: tf.tafeln,
      beitraege: bt.beitraege,
    };
  }

  /* ---------- Einträge aus diesem Browser (Demo ohne Datenbank) ---------- */

  const LOKAL_KEY = "biozidatlas.eingaben.v1";

  function lokal() {
    try {
      const d = JSON.parse(localStorage.getItem(LOKAL_KEY) || "null");
      if (d && Array.isArray(d.beitraege) && Array.isArray(d.tafeln)) return d;
    } catch (e) { /* kein Speicher verfügbar */ }
    return { beitraege: [], tafeln: [] };
  }

  function lokalSpeichern(d) {
    try {
      localStorage.setItem(LOKAL_KEY, JSON.stringify(d));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- Bewuchstafeln ---------- */

  function klasse(bed) {
    return bed < 30 ? { stufe: 1, text: "gering" } : bed <= 60 ? { stufe: 2, text: "mittel" } : { stufe: 3, text: "hoch" };
  }

  // Zusammenfassung je Hafen: letzte Ablesung, Höchstwert der Saison.
  function intensitaet(tafeln) {
    if (!tafeln.length) return null;
    const sortiert = tafeln.slice().sort((a, b) => a.abgelesen.localeCompare(b.abgelesen));
    const letzte = sortiert[sortiert.length - 1];
    const max = sortiert.reduce((m, t) => (t.bedeckung_prozent > m.bedeckung_prozent ? t : m), sortiert[0]);
    return { letzte, max, anzahl: sortiert.length, klasse: klasse(letzte.bedeckung_prozent), sortiert };
  }

  function organismenText(t) {
    return (t.organismen || []).map((o) => `${o.name} ${zahl(o.anteil_prozent)} %`).join(" · ");
  }

  // Fotos von Wikimedia Commons (data/fotos.json): je Organismus der erste Kandidat.
  const FOTO_KEY = {
    Seepocken: "seepocken", Miesmuscheln: "miesmuscheln", Dreikantmuscheln: "dreikantmuscheln",
    Quaggamuscheln: "quaggamuscheln", Moostierchen: "moostierchen", Seescheiden: "seescheiden",
    "Grünalgen": "gruenalgen", Algen: "algen", Biofilm: "biofilm",
  };
  let FOTOS = {};

  function foto(key) {
    const liste = FOTOS[key];
    return liste && liste.length ? liste[0] : null;
  }

  function nachweis(f) {
    return `Foto: ${esc(f.autor)}, <a href="${esc(f.quelle_url)}" target="_blank" rel="noopener">${esc(f.lizenz)}</a>, Wikimedia Commons`;
  }

  // Eigenes Foto der Tafel, sonst ein Beispielfoto des häufigsten Organismus.
  function tafelBild(t) {
    if (t.bild) {
      const src = t.bild.startsWith("data:") ? t.bild : "data/" + t.bild;
      return { html: `<img src="${esc(src)}" alt="Foto der Tafel ${esc(t.tafel)} vom ${esc(datum(t.abgelesen))}">`, text: "Foto der Tafel" };
    }
    const haupt = (t.organismen || []).slice().sort((a, b) => b.anteil_prozent - a.anteil_prozent)[0];
    const f = haupt ? foto(FOTO_KEY[haupt.name]) : null;
    if (!f) return null;
    return { html: `<img src="data/${esc(f.datei)}" alt="Beispielfoto: ${esc(haupt.name)}" loading="lazy">`, text: `Beispielfoto ${esc(haupt.name)}. ${nachweis(f)}` };
  }

  function renderTafel(t, opts = {}) {
    const k = klasse(t.bedeckung_prozent);
    const bild = tafelBild(t);
    return `<article class="tafel${opts.lokal ? " is-lokal" : ""}${bild ? "" : " ohne-bild"}">
      ${bild ? `<div class="tafel-bild">${bild.html}</div>` : ""}
      <div class="tafel-text">
        <div class="tafel-kopf"><b>${esc(datum(t.abgelesen))}</b> <span class="chip"><span class="dot druck-${k.stufe}"></span>${zahl(t.bedeckung_prozent)} % bewachsen</span></div>
        <div class="tafel-meta">Tafel ${esc(t.tafel)} · ${zahl(t.tiefe_m, 1)} m tief · ausgebracht ${esc(datum(t.ausgebracht))}</div>
        <div class="tafel-org">${esc(organismenText(t))}</div>
        <div class="tafel-meta">Gemeldet von ${esc(t.melder)} · ${t.geprueft ? "geprüft" : "noch nicht geprüft"}</div>
        ${bild ? `<div class="tafel-meta">${bild.text}</div>` : ""}
        ${t.bemerkung ? `<div class="tafel-meta">${esc(t.bemerkung)}</div>` : ""}
        ${opts.lokal ? `<div class="lokal-hinweis">Nur in diesem Browser gespeichert</div>` : ""}
      </div>
    </article>`;
  }

  /* ---------- Beiträge ---------- */

  function absaetze(text) {
    return String(text || "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  function renderBeitrag(b, opts = {}) {
    const m = b.metadaten || {};
    let bildSrc = null;
    let bildNachweis = "";
    if (b.bild && b.bild.foto && foto(b.bild.foto)) {
      const f = foto(b.bild.foto);
      bildSrc = "data/" + f.datei;
      bildNachweis = nachweis(f);
    } else if (b.bild && b.bild.datei) {
      bildSrc = b.bild.datei.startsWith("data:") ? b.bild.datei : "data/" + b.bild.datei;
      bildNachweis = esc(b.bild.bildnachweis || "");
    }
    const meta = [
      m.autor ? esc(m.autor) : "",
      m.datum ? esc(datum(m.datum)) : "",
      m.quelle ? "Quelle: " + esc(m.quelle) : "",
      m.lizenz ? "Lizenz: " + esc(m.lizenz) : "",
    ].filter(Boolean).join(" · ");
    const tags = (m.schlagworte || []).map((s) => `<span class="chip">${esc(s)}</span>`).join("");
    return `<article class="beitrag${opts.lokal ? " is-lokal" : ""}${b.status === "entwurf" ? " is-entwurf" : ""}">
      <header>
        <h3>${esc(b.ueberschrift) || "<span class=\"leer\">Überschrift</span>"}</h3>
        ${b.unterueberschrift ? `<p class="unterzeile">${esc(b.unterueberschrift)}</p>` : ""}
        <p class="beitrag-meta">${meta}</p>
        ${tags ? `<div class="chips">${tags}</div>` : ""}
      </header>
      ${bildSrc ? `<figure><img src="${esc(bildSrc)}" alt="${esc(b.bild.alt || "")}"><figcaption>${bildNachweis}</figcaption></figure>` : ""}
      <div class="beitrag-text">${absaetze(b.text) || "<p class=\"leer\">Erklärung</p>"}</div>
      ${b.status === "entwurf" ? `<div class="lokal-hinweis">Entwurf, nicht veröffentlicht</div>` : ""}
      ${opts.lokal ? `<div class="lokal-hinweis">Nur in diesem Browser gespeichert</div>` : ""}
    </article>`;
  }

  root.Atlasdaten = {
    WASSER, DRUCK, MONATE, ORGANISMEN, LIZENZEN,
    esc, zahl, datum, loadJSON, ladeAlles, lokal, lokalSpeichern,
    klasse, intensitaet, organismenText, foto, renderTafel, renderBeitrag,
  };
})(window);
