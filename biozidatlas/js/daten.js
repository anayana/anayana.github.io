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
      const res = await fetch("data/" + name + ".json?v=7");
      if (!res.ok) throw new Error(name + ".json: " + res.status);
      return await res.json();
    } catch (e) {
      if (pflicht) throw e;
      return null;
    }
  }

  async function ladeAlles() {
    const [rv, hf, osm, cop, tf, bt] = await Promise.all([
      loadJSON("reviere"), loadJSON("haefen"), loadJSON("osm-haefen", false),
      loadJSON("copernicus", false), loadJSON("bewuchstafeln"), loadJSON("beitraege"),
    ]);
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

  // Symbolbild einer Tafel aus Bedeckung und Organismen, wenn kein Foto da ist.
  // Fester Zufall je Ablesung, damit das Bild bei jedem Laden gleich aussieht.
  function tafelSVG(t) {
    let seed = 0;
    for (const c of String(t.id || "x")) seed = (seed * 31 + c.charCodeAt(0)) | 0;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
    const flaeche = Math.max(0, Math.min(100, Number(t.bedeckung_prozent) || 0));
    const teile = [];
    (t.organismen || []).forEach((o) => {
      const n = Math.round((flaeche / 100) * (o.anteil_prozent / 100) * 90);
      const name = o.name.toLowerCase();
      for (let i = 0; i < n; i++) {
        const x = 12 + rnd() * 136, y = 12 + rnd() * 136;
        if (name.includes("seepocke")) teile.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(4 + rnd() * 4).toFixed(1)}" fill="#f3efe6" stroke="#8d8576" stroke-width="1.5"/>`);
        else if (name.includes("muschel")) teile.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(5 + rnd() * 3).toFixed(1)}" ry="${(3 + rnd() * 2).toFixed(1)}" transform="rotate(${Math.round(rnd() * 180)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${name.includes("mies") ? "#2c3440" : "#6b5a3a"}"/>`);
        else if (name.includes("alge")) teile.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(5 + rnd() * 6).toFixed(1)}" ry="${(2 + rnd() * 3).toFixed(1)}" fill="#3f8a4a" opacity="0.75"/>`);
        else if (name.includes("seescheide")) teile.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(4 + rnd() * 4).toFixed(1)}" fill="#e2a15a" opacity="0.7"/>`);
        else if (name.includes("moos")) teile.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(3 + rnd() * 3).toFixed(1)}" fill="none" stroke="#d9c9a3" stroke-width="2"/>`);
        else teile.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(6 + rnd() * 6).toFixed(1)}" fill="#8a6d3b" opacity="0.25"/>`);
      }
    });
    return `<svg viewBox="0 0 160 160" role="img" aria-label="Symbolbild der Tafel: ${zahl(flaeche)} % bewachsen">
      <rect width="160" height="160" fill="#b9c0c4"/><circle cx="12" cy="12" r="4" fill="#7d878c"/>${teile.join("")}</svg>`;
  }

  function tafelBild(t) {
    if (t.bild) return `<img src="${esc(t.bild.startsWith("data:") ? t.bild : "data/" + t.bild)}" alt="Foto der Tafel ${esc(t.tafel)} vom ${esc(datum(t.abgelesen))}">`;
    return tafelSVG(t);
  }

  function renderTafel(t, opts = {}) {
    const k = klasse(t.bedeckung_prozent);
    return `<article class="tafel${opts.lokal ? " is-lokal" : ""}">
      <div class="tafel-bild">${tafelBild(t)}</div>
      <div class="tafel-text">
        <div class="tafel-kopf"><b>${esc(datum(t.abgelesen))}</b> <span class="chip"><span class="dot druck-${k.stufe}"></span>${zahl(t.bedeckung_prozent)} % bewachsen</span></div>
        <div class="tafel-meta">Tafel ${esc(t.tafel)} · ${zahl(t.tiefe_m, 1)} m tief · ausgebracht ${esc(datum(t.ausgebracht))}</div>
        <div class="tafel-org">${esc(organismenText(t))}</div>
        <div class="tafel-meta">Gemeldet von ${esc(t.melder)} · ${t.geprueft ? "geprüft" : "noch nicht geprüft"}${t.bild ? "" : " · Symbolbild aus den Angaben"}</div>
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
    const bildSrc = b.bild && b.bild.datei ? (b.bild.datei.startsWith("data:") ? b.bild.datei : "data/" + b.bild.datei) : null;
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
      ${bildSrc ? `<figure><img src="${esc(bildSrc)}" alt="${esc(b.bild.alt || "")}"><figcaption>${esc(b.bild.bildnachweis || "")}</figcaption></figure>` : ""}
      <div class="beitrag-text">${absaetze(b.text) || "<p class=\"leer\">Erklärung</p>"}</div>
      ${b.status === "entwurf" ? `<div class="lokal-hinweis">Entwurf, nicht veröffentlicht</div>` : ""}
      ${opts.lokal ? `<div class="lokal-hinweis">Nur in diesem Browser gespeichert</div>` : ""}
    </article>`;
  }

  root.Atlasdaten = {
    WASSER, DRUCK, MONATE, ORGANISMEN, LIZENZEN,
    esc, zahl, datum, loadJSON, ladeAlles, lokal, lokalSpeichern,
    klasse, intensitaet, organismenText, tafelSVG, renderTafel, renderBeitrag,
  };
})(window);
