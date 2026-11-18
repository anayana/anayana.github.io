/* Hafenseiten: ohne Kennung in der Adresse eine Übersicht mit Suche, mit
   Kennung (hafen.html#kiel-schilksee) die Seite eines Hafens mit Grunddaten,
   Messwerten, Bewuchstafeln und Beiträgen. Einträge aus der Eingabe, die nur
   in diesem Browser gespeichert sind, erscheinen gekennzeichnet mit. */
(function () {
  "use strict";

  const A = window.Atlasdaten;
  const { esc, zahl, datum } = A;
  const $ = (s) => document.querySelector(s);
  let D = null;

  function inhalte(id) {
    const l = A.lokal();
    const beitraege = D.beitraege
      .filter((b) => b.hafen_id === id && b.status === "veroeffentlicht")
      .sort((a, b) => a.reihenfolge - b.reihenfolge)
      .map((b) => ({ b, lokal: false }))
      .concat(l.beitraege.filter((b) => b.hafen_id === id).map((b) => ({ b, lokal: true })));
    const tafeln = D.tafeln
      .filter((t) => t.hafen_id === id)
      .map((t) => ({ t, lokal: false }))
      .concat(l.tafeln.filter((t) => t.hafen_id === id).map((t) => ({ t, lokal: true })));
    return { beitraege, tafeln };
  }

  /* ---------- Übersicht ---------- */

  function hafenZeile(h) {
    const r = D.reviere[h.revier];
    const { beitraege, tafeln } = inhalte(h.id);
    const int = A.intensitaet(tafeln.map((x) => x.t));
    const teile = [];
    if (int) teile.push(`<span class="chip"><span class="dot druck-${int.klasse.stufe}"></span>Tafel: ${zahl(int.letzte.bedeckung_prozent)} %</span>`);
    if (beitraege.length) teile.push(`<span class="chip">${beitraege.length} ${beitraege.length === 1 ? "Beitrag" : "Beiträge"}</span>`);
    return `<li><a href="#${esc(h.id)}">${esc(h.name)}</a> <span class="example">${esc(r.name)}${h.quelle === "osm" ? " · OpenStreetMap" : ""}</span> ${teile.join(" ")}</li>`;
  }

  function uebersicht() {
    document.title = "Hafenseiten – Antifouling-Atlas";
    const mitInhalt = D.beispielhaefen.concat(D.osmhaefen).filter((h) => {
      const i = inhalte(h.id);
      return i.beitraege.length || i.tafeln.length;
    });
    $("#inhalt").innerHTML = `
      <h2 class="seite-titel">Hafenseiten</h2>
      <p class="einleitung">Jeder Hafen hat eine eigene Seite mit Grunddaten, Messwerten, den Ablesungen von Bewuchstafeln und Beiträgen.
        Mitarbeiterinnen und Mitarbeiter ergänzen sie über die <a href="eingabe.html">Eingabe</a>, immer im selben Aufbau.</p>
      <div class="field suche">
        <label for="suche">Hafen suchen (${zahl(D.beispielhaefen.length + D.osmhaefen.length)} Häfen)</label>
        <input type="search" id="suche" placeholder="z. B. Kiel, Wannsee, Konstanz" autocomplete="off">
      </div>
      <ul class="hafenliste" id="treffer" hidden></ul>
      <section class="card" id="mit-inhalt">
        <h2>Häfen mit Bewuchstafeln oder Beiträgen</h2>
        <ul class="hafenliste">${mitInhalt.map(hafenZeile).join("")}</ul>
      </section>
      <section class="card">
        <h2>Alle Beispielhäfen nach Revier</h2>
        ${D.reviereListe
          .map((r) => {
            const hs = D.beispielhaefen.filter((h) => h.revier === r.id);
            return hs.length ? `<h3 class="revier-titel">${esc(r.name)}</h3><ul class="hafenliste">${hs.map(hafenZeile).join("")}</ul>` : "";
          })
          .join("")}
      </section>`;
    const alle = D.beispielhaefen.concat(D.osmhaefen);
    $("#suche").addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      const ul = $("#treffer");
      if (q.length < 2) { ul.hidden = true; return; }
      const t = alle.filter((h) => h.name.toLowerCase().includes(q)).slice(0, 60);
      ul.hidden = false;
      ul.innerHTML = t.length ? t.map(hafenZeile).join("") : `<li class="example">Kein Hafen gefunden.</li>`;
    });
  }

  /* ---------- Seite eines Hafens ---------- */

  function kalender(r) {
    const jetzt = new Date().getMonth();
    return `<div class="kalender">${r.bewuchs_kalender
      .map((s, i) => `<span class="k k${s}${i === jetzt ? " now" : ""}" title="${A.MONATE[i]}">${A.MONATE[i][0]}</span>`)
      .join("")}</div>`;
  }

  function messwerte(h) {
    const c = D.cop[h.id];
    if (!c) return `<p class="hint">Keine Meeresdaten von Copernicus für diesen Hafen (Binnengewässer oder zu weit vom Modellgitter).</p>`;
    const zeilen = [
      c.temp != null ? `<dt>Meerestemperatur</dt><dd>${zahl(c.temp, 1)} °C</dd>` : "",
      c.salz != null ? `<dt>Salzgehalt</dt><dd>${zahl(c.salz, 1)} PSU</dd>` : "",
      c.chl != null ? `<dt>Chlorophyll</dt><dd>${zahl(c.chl, 1)} mg/m³</dd>` : "",
    ].join("");
    return `<dl class="facts">${zeilen}</dl><p class="example">Copernicus Marine, Tagesmittel vom ${esc(datum(c.zeit))}, Gitterpunkt ${zahl(c.km, 1)} km vom Hafen.</p>`;
  }

  // Ein Balken je Ablesung, Höhe = bewachsener Anteil der Tafel.
  function verlauf(tafeln) {
    const balken = tafeln
      .map((t) => {
        const k = A.klasse(t.bedeckung_prozent);
        return `<div class="vb" title="${esc(datum(t.abgelesen))}: ${zahl(t.bedeckung_prozent)} % bewachsen">
          <span class="vb-wert">${zahl(t.bedeckung_prozent)} %</span>
          <span class="vb-saeule druck-${k.stufe}" style="height:${Math.max(2, t.bedeckung_prozent)}%"></span>
          <span class="vb-datum">${esc(datum(t.abgelesen).slice(0, 6))}</span>
        </div>`;
      })
      .join("");
    return `<div class="verlauf" role="img" aria-label="Bedeckung der Tafel je Ablesung">${balken}</div>`;
  }

  function hafenseite(h) {
    const r = D.reviere[h.revier];
    document.title = `${h.name} – Antifouling-Atlas`;
    const { beitraege, tafeln } = inhalte(h.id);
    const int = A.intensitaet(tafeln.map((x) => x.t));
    const lokalIds = new Set(tafeln.filter((x) => x.lokal).map((x) => x.t.id));
    const inf = h.infrastruktur || {};
    const janein = (b) => (b === true ? "ja" : h.quelle === "osm" ? "unbekannt" : "nein");
    const [smin, smax] = r.salzgehalt_psu;

    $("#inhalt").innerHTML = `
      <nav class="crumbs" aria-label="Pfad"><a href="hafen.html">Hafenseiten</a> / ${esc(h.name)}</nav>
      <div class="seite-kopf">
        <div>
          <h2 class="seite-titel">${esc(h.name)}</h2>
          <p class="unterzeile">${esc(r.name)} · ${h.quelle === "osm" ? "Hafen aus OpenStreetMap" : "Beispielhafen"}</p>
        </div>
        <div class="aktionen">
          <a class="btn" href="index.html#${esc(h.id)}">Im Atlas bewerten</a>
          <a class="btn-ghost" href="eingabe.html?hafen=${encodeURIComponent(h.id)}#beitrag">Beitrag hinzufügen</a>
          <a class="btn-ghost" href="eingabe.html?hafen=${encodeURIComponent(h.id)}#tafel">Bewuchstafel melden</a>
        </div>
      </div>

      <div class="seite-raster">
        <section class="card">
          <h2>Grunddaten</h2>
          <dl class="facts">
            <dt>Revier</dt><dd>${esc(r.name)}</dd>
            <dt>Gewässer</dt><dd>${A.WASSER[r.wassertyp]}, ${zahl(smin, smin % 1 ? 1 : 0)}–${zahl(smax, smax % 1 ? 1 : 0)} PSU</dd>
            <dt>Bewuchsdruck</dt><dd><span class="chip"><span class="dot druck-${r.bewuchsdruck}"></span>${A.DRUCK[r.bewuchsdruck]}</span> <span class="example">Beispielwert je Revier</span></dd>
            <dt>Typisch</dt><dd>${esc(r.organismen.join(", "))}</dd>
            <dt>Im Hafen</dt><dd>Waschanlage ${janein(inf.waschanlage)} · Kran ${janein(inf.kran)} · Trockenliegeplatz ${janein(inf.trockenliegeplatz)}</dd>
            <dt>Lage</dt><dd>${zahl(h.lat, 3)}° N, ${zahl(h.lon, 3)}° O · <a href="https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lon}#map=14/${h.lat}/${h.lon}" target="_blank" rel="noopener">Karte</a></dd>
          </dl>
          <div class="kal-head"><span>Bewuchskalender</span><span class="example">am stärksten ${esc(r.hauptbewuchs)}</span></div>
          ${kalender(r)}
          <h2 class="zwischen">Messwerte</h2>
          ${messwerte(h)}
        </section>

        <section class="card">
          <h2>Bewuchsintensität aus Bewuchstafeln</h2>
          ${int
            ? `<div class="kennzahl">
                 <span class="kz-wert">${zahl(int.letzte.bedeckung_prozent)} %</span>
                 <span>der Tafel bewachsen bei der letzten Ablesung am ${esc(datum(int.letzte.abgelesen))}, Intensität <b>${int.klasse.text}</b>.
                 Höchstwert ${zahl(int.max.bedeckung_prozent)} % am ${esc(datum(int.max.abgelesen))}, ${int.anzahl} ${int.anzahl === 1 ? "Ablesung" : "Ablesungen"}.</span>
               </div>
               ${verlauf(int.sortiert)}
               <p class="example">Bürgerwissenschaft: Freiwillige lesen eine Tafel im Hafen regelmäßig ab. Beispieldaten.</p>`
            : `<p>Für diesen Hafen gibt es noch keine Ablesungen. <a href="eingabe.html?hafen=${encodeURIComponent(h.id)}#tafel">Erste Bewuchstafel melden</a></p>`}
        </section>
      </div>

      ${int
        ? `<section class="abschnitt">
             <h2 class="abschnitt-titel">Ablesungen</h2>
             <div class="tafel-liste">${int.sortiert.slice().reverse().map((t) => A.renderTafel(t, { lokal: lokalIds.has(t.id) })).join("")}</div>
           </section>`
        : ""}

      <section class="abschnitt">
        <h2 class="abschnitt-titel">Beiträge</h2>
        ${beitraege.length
          ? `<div class="beitrag-liste">${beitraege.map((x) => A.renderBeitrag(x.b, { lokal: x.lokal })).join("")}</div>`
          : `<p>Noch keine Beiträge. <a href="eingabe.html?hafen=${encodeURIComponent(h.id)}#beitrag">Ersten Beitrag schreiben</a></p>`}
      </section>`;
  }

  function route() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && D.hafen[id]) hafenseite(D.hafen[id]);
    else uebersicht();
    window.scrollTo(0, 0);
  }

  A.ladeAlles()
    .then((d) => {
      D = d;
      route();
      window.addEventListener("hashchange", route);
    })
    .catch((e) => {
      $("#inhalt").innerHTML = `<p class="load-error-inline">Die Daten konnten nicht geladen werden: ${esc(e.message)}</p>`;
    });
})();
