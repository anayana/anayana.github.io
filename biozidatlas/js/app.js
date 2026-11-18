/* Antifouling-Atlas (Prototyp): Karte, Ausschluss nach Regeln, Bewertung mit
   drei MCDA-Verfahren, Bewuchskalender, Kosten über 5 Jahre und Live-Daten.
   Alle Fachwerte kommen aus data/*.json und sind Beispieldaten. Für den
   Chatbot (js/chat.js) stellt window.Atlas den aktuellen Stand als Text bereit. */
(function () {
  "use strict";

  const WASSER = { salz: "Salzwasser", brack: "Brackwasser", suess: "Süßwasser" };
  const DRUCK = { 1: "gering", 2: "mittel", 3: "hoch" };
  const KAT = { biozidfrei: "biozidfrei", mechanisch: "ohne Anstrich", biozid: "biozidhaltig" };
  const KURZ = {
    umwelt: "Umwelt", wirksamkeit: "Wirksamkeit", kosten: "Kosten", aufwand: "Aufwand",
    gesundheit: "Gesundheit", treibstoff: "Treibstoff", standzeit: "Standzeit", invasiv: "Arten",
  };
  const BOOTSTYP = {
    segel: "Segelboot",
    "motor-langsam": "Motorboot, langsam (Verdränger)",
    "motor-schnell": "Motorboot, schnell (Gleiter)",
  };
  const METHODEN = ["wsm", "topsis", "promethee"];
  const METHODE_KURZ = { wsm: "Summe", topsis: "TOPSIS", promethee: "PROMETHEE" };
  const METHODE_NAME = { wsm: "Gewichtete Summe", topsis: "TOPSIS", promethee: "PROMETHEE II" };
  const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const JAHRE = 5;

  const state = {
    profil: "freizeit",
    laenge: { freizeit: 9, beruf: 90 },
    bootstyp: "segel",
    monate: 6,
    hafenId: "kiel-schilksee",
    aufWunsch: [],
    methode: "wsm",
    importance: {},
    live: { status: "laden", data: null },
    see: { status: "laden", data: null },
  };

  let D = null;
  let map = null;
  let lastCtx = null;
  const markers = {};
  let pegelLayer = null;
  let osmLayer = null;
  let liveStatusEl = null;

  const $ = (s) => document.querySelector(s);
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const zahl = (n, d = 0) => n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const euro = (v) => zahl(Math.max(10, Math.round(v / 10) * 10)) + " €";

  /* ---------- Daten ---------- */

  async function loadJSON(name) {
    const res = await fetch("data/" + name + ".json?v=6");
    if (!res.ok) throw new Error(name + ".json: " + res.status);
    return res.json();
  }

  async function loadData() {
    const [rv, hf, op, kr, pk] = await Promise.all(
      ["reviere", "haefen", "optionen", "kriterien", "produktkategorien"].map(loadJSON)
    );
    // Häfen aus OpenStreetMap schreibt ein GitHub-Actions-Job; fehlt die Datei, geht es ohne.
    const osm = await loadJSON("osm-haefen").catch(() => null);
    // Meeresdaten von Copernicus schreibt ebenfalls ein Job; ohne Datei geht es mit Open-Meteo.
    const cop = await loadJSON("copernicus").catch(() => null);
    const tafeln = await loadJSON("bewuchstafeln").catch(() => null);
    const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
    const osmHaefen = (osm ? osm.haefen : []).map((h) => ({ ...h, quelle: "osm" }));
    return {
      reviere: byId(rv.reviere),
      reviereListe: rv.reviere,
      regeltexte: rv.regeltexte,
      haefen: hf.haefen,
      hafen: { ...byId(osmHaefen), ...byId(hf.haefen) },
      osm: { haefen: osmHaefen, stand: osm ? osm.stand : null },
      cop: cop ? cop.werte : {},
      tafeln: tafeln ? tafeln.tafeln : [],
      optionen: op.optionen,
      kriterien: kr,
      pk: byId(pk.kategorien),
    };
  }

  function defaultImportance(profil) {
    return { ...D.kriterien.vorlagen[profil][0].werte };
  }

  /* ---------- Bewertung ---------- */

  // Wie lange das Boot im Wasser liegt, verschiebt den Bewuchsdruck um eine Stufe.
  function druckFuer(revier) {
    const d = revier.bewuchsdruck;
    if (state.profil !== "freizeit") return d;
    if (state.monate <= 4) return Math.max(1, d - 1);
    if (state.monate >= 10) return Math.min(3, d + 1);
    return d;
  }

  // Ein Wert ist eine Zahl oder ein Objekt mit einem Wert je Bewuchsdruck.
  function wert(o, feld, druck) {
    const v = o.werte[feld];
    let w = typeof v === "object" ? v[String(druck)] : v;
    if (feld === "wirksamkeit" && o.wirksamkeit_bonus && state.profil === "freizeit") {
      w = Math.min(10, w + (o.wirksamkeit_bonus[state.bootstyp] || 0));
    }
    return w;
  }

  function gruende(o, hafen, revier, druck, laenge, crit) {
    const b = o.bedingungen || {};
    const out = [];
    crit.forEach((c) => {
      if (c.mindestwert == null) return;
      const w = wert(o, c.feld, druck);
      if (w < c.mindestwert) {
        out.push(`Wirkt bei Bewuchsdruck ${DRUCK[druck]} nicht ausreichend (${w}/10, mindestens ${c.mindestwert})`);
      }
    });
    if (b.gewaesser && !b.gewaesser.includes(revier.wassertyp)) {
      out.push(
        o.kategorie === "biozid"
          ? `Keine Zulassung für ${WASSER[revier.wassertyp]} (Beispielregel)`
          : `Nicht für ${WASSER[revier.wassertyp]} geeignet`
      );
    }
    (b.nicht_bei_regel || []).forEach((r) => {
      if (revier.regeln.includes(r)) out.push(D.regeltexte[r]);
    });
    if (b.max_laenge_m && laenge > b.max_laenge_m) out.push(`Nur für Boote bis ${b.max_laenge_m} m`);
    (b.braucht || []).forEach((x) => {
      if (hafen.infrastruktur[x] === true) return;
      if (hafen.quelle === "osm") out.push(`${x === "waschanlage" ? "Waschanlage" : "Kran"} in OpenStreetMap nicht eingetragen`);
      else out.push(x === "waschanlage" ? "Keine Waschanlage im Hafen (Beispielwert)" : "Kein Kran im Hafen (Beispielwert)");
    });
    return out;
  }

  function evaluate() {
    const hafen = D.hafen[state.hafenId];
    const revier = D.reviere[hafen.revier];
    const druck = druckFuer(revier);
    const crit = D.kriterien[state.profil];
    const laenge = state.laenge[state.profil];
    const importance = state.importance[state.profil];

    const erlaubt = [];
    const ausgeschlossen = [];
    D.optionen
      .filter((o) => o.zielgruppen.includes(state.profil))
      .filter((o) => !o.nur_auf_wunsch || state.aufWunsch.includes(o.id))
      .forEach((o) => {
        const g = gruende(o, hafen, revier, druck, laenge, crit);
        if (g.length) ausgeschlossen.push({ o, gruende: g });
        else erlaubt.push(o);
      });

    const alts = erlaubt.map((o) => ({ id: o.id, raw: Object.fromEntries(crit.map((c) => [c.key, wert(o, c.feld, druck)])) }));
    const { weights, floored } = MCDA.weightsFrom(importance, crit);
    const res = {};
    const rk = {};
    METHODEN.forEach((m) => {
      res[m] = MCDA.METHODS[m](alts, crit, weights);
      rk[m] = MCDA.ranks(res[m]);
    });
    const ids = alts.map((a) => a.id);
    const kons = ids.length ? MCDA.consensus(METHODEN.map((m) => rk[m]), ids) : {};
    const robust = MCDA.robustness(alts, crit, importance, state.methode);
    const opt = Object.fromEntries(erlaubt.map((o) => [o.id, o]));
    const order = ids.slice().sort((a, b) => rk[state.methode][a] - rk[state.methode][b]);

    return { hafen, revier, druck, crit, laenge, erlaubt, ausgeschlossen, alts, weights, floored, res, rk, kons, robust, opt, order };
  }

  /* ---------- Hilfen für die Darstellung ---------- */

  // Kosten sind für ein 10-m-Boot hinterlegt; für die Anzeige grob nach
  // Rumpffläche (Länge zum Quadrat) auf das eigene Boot umgerechnet.
  function kostenFaktor() {
    return state.profil === "freizeit" ? (state.laenge.freizeit / 10) ** 2 : 1;
  }

  function wertText(c, v) {
    switch (c.feld) {
      case "kosten_eur_10m": return "≈ " + euro(v * kostenFaktor()) + "/Saison";
      case "aufwand_h": return zahl(v) + " h/Saison";
      case "treibstoff_pct": return "+" + zahl(v) + " %";
      case "standzeit_jahre": return zahl(v) + " Jahre";
      default: return zahl(v) + "/10";
    }
  }

  function punkte(m, r) {
    if (m === "wsm") return zahl(100 * r.score) + " P.";
    if (m === "topsis") return zahl(r.score, 2);
    return (r.score >= 0 ? "+" : "−") + zahl(Math.abs(r.score), 2);
  }

  function druckText(ctx) {
    const basis = ctx.revier.bewuchsdruck;
    if (ctx.druck === basis) return `Bewuchsdruck ${DRUCK[basis]}`;
    const grund = state.monate <= 4 ? `nur ${state.monate} Monate im Wasser` : `${state.monate} Monate im Wasser`;
    return `Bewuchsdruck ${DRUCK[basis]}, für Ihr Boot ${DRUCK[ctx.druck]} (${grund})`;
  }

  // Wassertemperatur: an der Küste Copernicus (Tagesmittel), sonst Open-Meteo
  // (stündlich), sonst die nächste PEGELONLINE-Messstelle.
  function temperatur(hafen) {
    const cop = D.cop[hafen.id] || null;
    const see = state.see.status === "ok" ? state.see.data.werte[hafen.id] : null;
    const pegel = state.live.status === "ok" ? Live.nearest(hafen.lat, hafen.lon, state.live.data.stationen, 60) : null;
    const wert = cop && cop.temp != null ? cop.temp : see ? see.wert : pegel ? pegel.wert : null;
    return { cop, see, pegel, wert };
  }

  // Grobe Einordnung für Küstengewässer, Faustregel für den Prototyp: Nord- und
  // Ostseeküste liegen meist bei 3 bis 10 mg/m³, nährstoffreiche Bodden darüber.
  function chlText(c) {
    return c < 3 ? "niedrig" : c <= 10 ? "mittel" : "hoch, nährstoffreich";
  }

  function datumText(iso) {
    return iso ? new Date(iso + "T00:00:00Z").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) : "unbekannt";
  }

  // Letzte Ablesung einer Bewuchstafel im Hafen (Citizen Science, Beispieldaten).
  function tafelInfo(hafen) {
    const ts = D.tafeln.filter((t) => t.hafen_id === hafen.id).sort((a, b) => a.abgelesen.localeCompare(b.abgelesen));
    if (!ts.length) return null;
    const max = ts.reduce((m, t) => Math.max(m, t.bedeckung_prozent), 0);
    return { letzte: ts[ts.length - 1], max, anzahl: ts.length };
  }

  function zeitText(t) {
    return t ? new Date(t).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "unbekannt";
  }

  /* ---------- Steckbrief, Kalender, Live ---------- */

  function renderSteckbrief(ctx) {
    const { hafen, revier } = ctx;
    const inf = hafen.infrastruktur;
    const osm = hafen.quelle === "osm";
    const janein = (b) => (b === true ? "ja" : osm ? "unbekannt" : "nein");
    const [smin, smax] = revier.salzgehalt_psu;
    $("#steckbrief").innerHTML = `
      <div class="card-head">
        <h2>${state.profil === "beruf" ? "Heimathafen" : "Liegeplatz"}${osm ? " aus OpenStreetMap" : ""}</h2>
        <span class="aktionen no-print">
          <a class="btn-ghost" href="hafen.html#${esc(hafen.id)}">Hafenseite</a>
          <button type="button" class="btn-ghost" id="drucken">Steckbrief drucken</button>
        </span>
      </div>
      <div class="hafen-name">${esc(hafen.name)}</div>
      <div class="hafen-revier">${esc(revier.name)}${osm ? ` <span class="example">(Revier vom Beispielhafen ${esc(hafen.revier_von)}, ${zahl(hafen.revier_km)} km)</span>` : ""}</div>
      <div class="chips">
        <span class="chip"><span class="dot druck-${ctx.druck}"></span>${esc(druckText(ctx))}</span>
        <span class="chip">${WASSER[revier.wassertyp]}, ${zahl(smin, smin % 1 ? 1 : 0)}–${zahl(smax, smax % 1 ? 1 : 0)} PSU</span>
      </div>
      <dl class="facts">
        <dt>Typisch</dt><dd>${esc(revier.organismen.join(", "))}</dd>
        <dt>Im Hafen</dt><dd>Waschanlage ${janein(inf.waschanlage)} · Kran ${janein(inf.kran)} · Trockenliegeplatz ${janein(inf.trockenliegeplatz)}</dd>
      </dl>
      <div class="example">${osm ? "Lage und Infrastruktur aus OpenStreetMap (unbekannt = nicht eingetragen); Bewuchsdruck: Beispielwert." : "Bewuchsdruck und Hafen-Infrastruktur: Beispielwerte."}</div>
      ${tafelHTML(hafen)}
      <div class="kalender-box" id="kalender-box">${kalenderHTML(revier)}</div>
      <div class="live" id="live-box">${liveHTML(hafen)}</div>`;
    $("#drucken").addEventListener("click", () => window.print());
  }

  function tafelHTML(hafen) {
    const ti = tafelInfo(hafen);
    if (!ti) return "";
    const d = new Date(ti.letzte.abgelesen + "T12:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    return `<p class="tafel-kurz"><b>Bewuchstafel:</b> am ${d} zu ${zahl(ti.letzte.bedeckung_prozent)} % bewachsen, Höchstwert ${zahl(ti.max)} % (${ti.anzahl} Ablesungen, Beispieldaten). <a href="hafen.html#${esc(hafen.id)}">Ablesungen ansehen</a></p>`;
  }

  function kalenderHTML(revier) {
    const k = revier.bewuchs_kalender;
    const jetzt = new Date().getMonth();
    const staerke = ["kein", "wenig", "mittlerer", "starker"];
    const cells = k
      .map((s, i) => `<span class="k k${s}${i === jetzt ? " now" : ""}" title="${MONATE[i]}: ${staerke[s]} Bewuchs">${MONATE[i][0]}</span>`)
      .join("");
    return `<div class="kal-head"><span>Bewuchskalender</span><span class="example">am stärksten ${esc(revier.hauptbewuchs)}</span></div>
      <div class="kalender" role="img" aria-label="Bewuchs nach Monaten, am stärksten ${esc(revier.hauptbewuchs)}">${cells}</div>
      <div class="kal-legend" aria-hidden="true"><span><i class="k k0"></i>kein</span><span><i class="k k1"></i>wenig</span><span><i class="k k2"></i>mittel</span><span><i class="k k3"></i>stark</span></div>
      <p class="kal-jetzt"><b>Jetzt (${MONATE[jetzt]}):</b> ${esc(jetztHinweis(revier, jetzt))}</p>`;
  }

  function jetztHinweis(revier, m) {
    const k = revier.bewuchs_kalender;
    const temp = lastCtx ? temperatur(lastCtx.hafen).wert : null;
    let t;
    if (k[m] >= 2) t = "Hauptbewuchszeit. Biozidfreie Rümpfe alle zwei bis drei Wochen reinigen oder durch die Waschanlage fahren.";
    else if (k[(m + 1) % 12] > k[m]) t = "Der Bewuchs beginnt bald. Unterwasserschiff vorbereiten und die Beschichtung prüfen.";
    else if (k[m] === 1) t = "Der Bewuchs lässt nach. Beim Auskranen den Rumpf reinigen und die Reste auffangen.";
    else t = "Kaum Bewuchs. Gute Zeit für Arbeiten am Unterwasserschiff an Land.";
    if (temp != null && temp >= 15 && k[m] < 2) t += ` Das Wasser ist mit ${zahl(temp, 1)} °C aber noch warm, mit Bewuchs ist zu rechnen.`;
    return t;
  }

  function liveHTML(hafen) {
    const t = temperatur(hafen);
    const kueste = D.reviere[hafen.revier].wassertyp !== "suess";
    const teile = [];
    if (t.cop) {
      const c = t.cop;
      const mehr = [
        c.salz != null ? `Salzgehalt ${zahl(c.salz, 1)} PSU` : "",
        c.chl != null ? `Chlorophyll ${zahl(c.chl, 1)} mg/m³ (${chlText(c.chl)})` : "",
      ].filter(Boolean).join(" · ");
      teile.push(`<span class="live-tag">Copernicus Marine · Modell, Tagesmittel vom ${datumText(c.zeit)}</span>
        ${c.temp != null ? `<span class="live-value">${zahl(c.temp, 1)} °C</span>` : ""}
        <span class="live-meta">${mehr ? mehr + " · " : ""}Gitterpunkt ${zahl(c.km, 1)} km vom Hafen</span>`);
    }
    if (t.see && !(t.cop && t.cop.temp != null)) {
      teile.push(`<span class="live-tag">Live · Meerestemperatur (Modell, Open-Meteo)</span>
        <span class="live-value">${zahl(t.see.wert, 1)} °C</span>
        <span class="live-meta">Modellwert am Hafen · Stand ${zeitText(t.see.zeit)}</span>`);
    } else if (kueste && !t.cop && state.see.status === "laden") {
      teile.push(`<span class="live-tag">Live · Meerestemperatur</span><span class="live-meta">wird abgefragt …</span>`);
    }
    if (t.pegel) {
      const ort = `Messstelle ${esc(t.pegel.name)}${t.pegel.gewaesser ? " (" + esc(t.pegel.gewaesser) + ")" : ""}, ${zahl(t.pegel.km)} km entfernt${t.pegel.km > 25 ? " (nur grober Anhalt)" : ""} · Stand ${zeitText(t.pegel.zeit)}${t.pegel.veraltet ? " · älter als 6 Stunden" : ""}`;
      teile.push(t.see
        ? `<span class="live-tag">Live · PEGELONLINE</span><span class="live-meta">${zahl(t.pegel.wert, 1)} °C an der ${ort}</span>`
        : `<span class="live-tag">Live · PEGELONLINE</span><span class="live-value">${zahl(t.pegel.wert, 1)} °C</span><span class="live-meta">${ort}</span>`);
    } else if (state.live.status === "laden") {
      teile.push(`<span class="live-tag">Live · PEGELONLINE</span><span class="live-meta">wird abgefragt …</span>`);
    }
    if (t.wert != null) {
      teile.push(`<span>${esc(Live.saison(t.wert).text)} <span class="example">(Faustregel)</span></span>`);
    } else if (state.live.status !== "laden" && state.see.status !== "laden") {
      teile.push(`<span class="live-tag">Live</span><span class="live-meta">Für diesen Hafen liegt gerade keine Wassertemperatur vor${kueste ? "" : " (keine PEGELONLINE-Messstelle im Umkreis von 60 km)"}.</span>`);
    }
    return teile.join("");
  }

  function refreshLive() {
    if (!lastCtx) return;
    const box = document.getElementById("live-box");
    if (box) box.innerHTML = liveHTML(lastCtx.hafen);
    const kal = document.getElementById("kalender-box");
    if (kal) kal.innerHTML = kalenderHTML(lastCtx.revier);
  }

  /* ---------- Kernfrage, Rangliste, Kosten ---------- */

  function kernfrage(ctx) {
    const order = ctx.order;
    const wsm = Object.fromEntries(ctx.res.wsm.map((r) => [r.id, r.score]));
    if (!order.length) {
      return { cls: "nein", head: "Keine Option passt", text: "Für diese Kombination aus Revier, Bootslänge und Hafen bleibt keine Option übrig." };
    }
    if (ctx.revier.regeln.includes("biozid_verboten")) {
      return { cls: "ja", head: "Ja, und hier sogar vorgeschrieben", text: `${D.regeltexte.biozid_verboten} Bestbewertet: ${ctx.opt[order[0]].name}.` };
    }
    const top = ctx.opt[order[0]];
    const frei = order.find((id) => ctx.opt[id].kategorie !== "biozid");
    if (top.kategorie !== "biozid") {
      return { cls: "ja", head: "Ja, biozidfrei geht hier", text: `Die bestbewertete Option kommt ohne Biozid aus: ${top.name}.` };
    }
    if (frei && wsm[frei] >= 0.9 * wsm[top.id]) {
      return {
        cls: "teils", head: "Ja, mit kleinen Abstrichen",
        text: `Platz 1 ist biozidhaltig, aber ${ctx.opt[frei].name} erreicht ${zahl((100 * wsm[frei]) / wsm[top.id])} % der Punkte.`,
      };
    }
    return {
      cls: "nein", head: "Eher nicht",
      text: frei
        ? `Bei diesem Bewuchsdruck und dieser Gewichtung liegen biozidhaltige Anstriche vorn. Beste biozidfreie Option: ${ctx.opt[frei].name}.`
        : "Unter den passenden Optionen ist keine biozidfreie.",
    };
  }

  function renderKernfrage(ctx) {
    const k = kernfrage(ctx);
    const el = $("#kernfrage");
    el.className = "card kernfrage " + k.cls;
    el.innerHTML = `<h2>Geht es hier ohne Biozid?</h2><div class="kf-head">${esc(k.head)}</div><p class="kf-text">${esc(k.text)}</p>`;
  }

  function renderRangliste(ctx) {
    const m = state.methode;
    const score = Object.fromEntries(ctx.res[m].map((r) => [r.id, r]));
    if (!ctx.order.length) {
      $("#rangliste").innerHTML = `<p class="hint">Keine Option übrig. Siehe „Ausgeschlossen“.</p>`;
      return;
    }

    const legend =
      m === "wsm"
        ? `<div class="legend" aria-hidden="true">${ctx.crit
            .map((c) => `<span><i class="swatch" style="background:var(--c-${c.key})"></i>${KURZ[c.key]}</span>`)
            .join("")}</div>`
        : "";

    const items = ctx.order
      .map((id, i) => {
        const o = ctx.opt[id];
        const r = score[id];
        let bar;
        if (m === "wsm") {
          bar = `<div class="bar" title="Anteil der Kriterien an der Punktzahl">${ctx.crit
            .map((c) => `<span style="width:${(100 * r.parts[c.key]).toFixed(2)}%;background:var(--c-${c.key})"></span>`)
            .join("")}</div>`;
        } else {
          const w = m === "topsis" ? 100 * r.score : 50 * (r.score + 1);
          bar = `<div class="bar bar-single"><span style="width:${w.toFixed(2)}%"></span></div>`;
        }
        const raw = ctx.alts.find((a) => a.id === id).raw;
        const values = ctx.crit.map((c) => `<span>${KURZ[c.key]} ${wertText(c, raw[c.key])}</span>`).join("");
        return `<li class="rank-item${i === 0 ? " top" : ""}">
          <span class="rank-no">${i + 1}</span>
          <div class="rank-main">
            <div class="rank-title">${esc(o.name)} <span class="kat kat-${o.kategorie}">${KAT[o.kategorie]}</span></div>
            <p class="rank-desc">${esc(o.kurz)}</p>
            ${bar}
            <div class="values">${values}</div>
          </div>
          <span class="rank-score">${punkte(m, r)}</span>
        </li>`;
      })
      .join("");

    let robust = "";
    if (ctx.order.length > 1) {
      const pct = Math.round(100 * ctx.robust.share);
      const tag = pct >= 80 ? "stabil" : pct >= 60 ? "knapp" : "unsicher";
      robust = `<div class="robust"><span class="tag tag-${tag}">${tag}</span>
        <span>Platz 1 bleibt in <b>${pct} %</b> von ${ctx.robust.runs} Durchläufen vorn, wenn Gewichte um ±25 % und Werte um ±15 % schwanken.</span></div>`;
    }

    const scale =
      m === "wsm"
        ? "Punkte 0–100, der Balken zeigt den Beitrag jedes Kriteriums."
        : m === "topsis"
        ? "Nähe zur Ideallösung, 0 bis 1."
        : "Nettofluss von −1 bis +1: Wie oft eine Option andere übertrifft, minus wie oft sie unterliegt.";
    const einheiten =
      state.profil === "beruf"
        ? "Kosten als Index 0–10 · Treibstoff: Mehrverbrauch gegenüber sauberem Rumpf · Beispielwerte"
        : `Kosten pro Saison für ein ${zahl(state.laenge.freizeit)}-m-Boot, Anschaffung umgelegt, grob nach Rumpffläche umgerechnet · Indizes 0–10 · Beispielwerte`;

    $("#rangliste").innerHTML = `${legend}<p class="hint">${scale} ${einheiten}.</p><ol class="rank-list">${items}</ol>${robust}`;
  }

  // Ausgaben über JAHRE Saisons: Anschaffung zu Beginn und erneut, wenn die
  // Nutzungsdauer abläuft, dazu die laufenden Kosten jeder Saison.
  function fuenfJahre(o) {
    const k = o.werte.kosten_aufteilung;
    if (!k) return null;
    const f = kostenFaktor();
    const kaeufe = k.anschaffung > 0 ? Math.ceil(JAHRE / (k.nutzungsdauer_jahre || JAHRE)) : 0;
    const anschaffung = kaeufe * k.anschaffung * f;
    const laufend = JAHRE * k.laufend * f;
    return { anschaffung, laufend, summe: anschaffung + laufend, kaeufe, k };
  }

  function renderKosten(ctx) {
    const card = $("#kosten-card");
    const rows = ctx.erlaubt.map((o) => ({ o, c: fuenfJahre(o) })).filter((x) => x.c).sort((a, b) => a.c.summe - b.c.summe);
    card.hidden = state.profil !== "freizeit" || !rows.length;
    if (card.hidden) return;
    const max = Math.max(...rows.map((x) => x.c.summe));
    $("#kosten").innerHTML = `
      <div class="legend"><span><i class="swatch" style="background:var(--c-anschaffung)"></i>Anschaffung</span><span><i class="swatch" style="background:var(--c-laufend)"></i>laufende Kosten</span></div>
      <ul class="cost-list">${rows
        .map(({ o, c }) => {
          const tip = `${o.name}: Anschaffung ≈ ${euro(c.anschaffung)}${c.kaeufe > 1 ? ` (${c.kaeufe}×, Nutzungsdauer ${c.k.nutzungsdauer_jahre} Jahre)` : ""}, laufend ≈ ${euro(c.laufend / JAHRE)} pro Saison, zusammen ≈ ${euro(c.summe)}`;
          const seg = (v, token) => (v > 0 ? `<span style="width:${((100 * v) / max).toFixed(2)}%;background:var(${token})"></span>` : "");
          return `<li class="cost-row" title="${esc(tip)}">
            <span class="cost-name">${esc(o.name)}</span>
            <span class="cost-bar">${seg(c.anschaffung, "--c-anschaffung")}${seg(c.laufend, "--c-laufend")}</span>
            <span class="cost-sum">≈ ${euro(c.summe)}</span>
          </li>`;
        })
        .join("")}</ul>
      <p class="hint">Ausgaben in ${JAHRE} Saisons für ein ${zahl(state.laenge.freizeit)}-m-Boot, grob nach Rumpffläche umgerechnet. Läuft die Nutzungsdauer vorher ab, wird neu angeschafft. Beispielwerte.</p>`;
  }

  /* ---------- Gewichte, Vergleich, Ausschluss, Produkte ---------- */

  function buildGewichte() {
    const crit = D.kriterien[state.profil];
    const imp = state.importance[state.profil];
    $("#vorlagen").innerHTML = D.kriterien.vorlagen[state.profil]
      .map((v) => `<button type="button" class="btn-ghost" data-vorlage="${v.id}" aria-pressed="false">${esc(v.label)}</button>`)
      .join("");
    $("#vorlagen").querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = D.kriterien.vorlagen[state.profil].find((x) => x.id === btn.dataset.vorlage);
        state.importance[state.profil] = { ...v.werte };
        render(true);
      });
    });
    $("#gewichte").innerHTML = crit
      .map(
        (c) => `<div class="weight-row">
          <label for="w-${c.key}"><i class="swatch" style="background:var(--c-${c.key})"></i>${esc(c.label)}</label>
          <input type="range" id="w-${c.key}" data-key="${c.key}" min="0" max="50" step="5" value="${imp[c.key]}">
          <span class="weight-pct" id="wp-${c.key}"></span>
        </div>`
      )
      .join("");
    $("#gewichte").querySelectorAll("input[type=range]").forEach((inp) => {
      inp.addEventListener("input", () => {
        state.importance[state.profil][inp.dataset.key] = Number(inp.value);
        render(false);
      });
    });
  }

  function aktiveVorlage(ctx) {
    const imp = state.importance[state.profil];
    return D.kriterien.vorlagen[state.profil].find((v) => ctx.crit.every((c) => v.werte[c.key] === imp[c.key])) || null;
  }

  function renderGewichte(ctx) {
    const aktiv = aktiveVorlage(ctx);
    $("#vorlagen").querySelectorAll("button").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(!!aktiv && aktiv.id === btn.dataset.vorlage));
    });
    ctx.crit.forEach((c) => {
      const el = document.getElementById("wp-" + c.key);
      if (el) el.textContent = zahl(100 * ctx.weights[c.key]) + " %";
    });
    const note = $("#floor-note");
    note.hidden = !ctx.floored;
    if (ctx.floored) note.textContent = "Die Umwelt wurde auf ihren Mindestanteil von 20 % angehoben; die übrigen Gewichte sind anteilig gekürzt.";
  }

  function renderVergleich(ctx) {
    if (!ctx.alts.length) { $("#vergleich").innerHTML = ""; return; }
    const ids = ctx.alts.map((a) => a.id).sort((a, b) => ctx.kons[a] - ctx.kons[b]);
    const rows = ids
      .map((id) => {
        const cells = METHODEN.map((m) => {
          const r = ctx.rk[m][id];
          const cls = ["num", r === 1 ? "first" : "", r !== ctx.kons[id] ? "diff" : ""].join(" ").trim();
          return `<td class="${cls}">${r}</td>`;
        }).join("");
        return `<tr><td>${esc(ctx.opt[id].name)}</td>${cells}<td class="num${ctx.kons[id] === 1 ? " first" : ""}">${ctx.kons[id]}</td></tr>`;
      })
      .join("");
    $("#vergleich").innerHTML = `<table>
      <thead><tr><th>Option</th>${METHODEN.map((m) => `<th class="num">${METHODE_KURZ[m]}</th>`).join("")}<th class="num">Konsens</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p class="hint">Hervorgehoben: Platz weicht vom Konsens ab.</p>`;
  }

  function renderAusschluss(ctx) {
    $("#ausschluss-card").hidden = !ctx.ausgeschlossen.length;
    $("#ausschluss").innerHTML = `<ul class="excl-list">${ctx.ausgeschlossen
      .map(
        (x) => `<li><span class="excl-name">${esc(x.o.name)} <span class="kat kat-${x.o.kategorie}">${KAT[x.o.kategorie]}</span></span>
          <span class="excl-why">${x.gruende.map(esc).join(" · ")}</span></li>`
      )
      .join("")}</ul>`;
  }

  function produkte(ctx) {
    const verwender = state.profil === "beruf" ? "berufsmäßig" : "Laie";
    const ids = [];
    ctx.erlaubt
      .filter((o) => o.kategorie === "biozid")
      .forEach((o) => (o.produktkategorien || []).forEach((p) => { if (!ids.includes(p)) ids.push(p); }));
    const passend = ids.map((id) => D.pk[id]).filter((p) => p && p.verwender === verwender);
    const pks = passend.filter((p) => !p.max_laenge_m || ctx.laenge <= p.max_laenge_m);
    return { passend, pks };
  }

  function renderProdukte(ctx) {
    const { passend, pks } = produkte(ctx);
    if (!pks.length) {
      $("#produkte").innerHTML = passend.length
        ? `<p>Laienprodukte sind nur für Boote bis 25 m zugelassen. Bei ${zahl(ctx.laenge)} m darf nur ein Fachbetrieb biozidhaltig streichen.</p>`
        : `<p>An diesem Liegeplatz kommt kein biozidhaltiges Produkt in Frage.</p>`;
      return;
    }
    const gehalt = (g) => zahl(g, g % 1 ? 1 : 0);
    $("#produkte").innerHTML = `<div class="pk-list">${pks
      .map(
        (p) => `<article class="pk">
          <div class="pk-name">${esc(p.bezeichnung)}</div>
          <div class="chips">
            <span class="chip">Produktart 21</span>
            <span class="chip">${p.verwender === "Laie" ? "Laienanwendung" : "nur berufsmäßig"}</span>
            <span class="chip">${p.gewaesser.map((g) => WASSER[g]).join(", ")}</span>
            <span class="chip">${esc(p.bootslaenge)}</span>
          </div>
          <div class="pk-sub">Wirkstoffe</div>
          <ul>${p.wirkstoffe.map((w) => `<li>${esc(w.name)} ${gehalt(w.gehalt_prozent[0])}–${gehalt(w.gehalt_prozent[1])} %</li>`).join("")}</ul>
          <div class="pk-sub">Anwendung</div>
          <ul><li>${esc(p.anwendung)}</li>${p.hinweise.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
        </article>`
      )
      .join("")}</div>`;
  }

  /* ---------- Stand als Text (Druck, Chatbot) ---------- */

  function profilText() {
    if (state.profil === "beruf") return `Berufsschifffahrt, Schiff ${zahl(state.laenge.beruf)} m`;
    return `Freizeitboot, ${zahl(state.laenge.freizeit)} m, ${BOOTSTYP[state.bootstyp]}, ${state.monate} Monate im Jahr im Wasser`;
  }

  function renderDruckkopf(ctx) {
    const aktiv = aktiveVorlage(ctx);
    $("#print-meta").textContent =
      `${profilText()} · Gewichtung: ${aktiv ? aktiv.label : "eigene Einstellung"} · Verfahren: ${METHODE_NAME[state.methode]} · ` +
      `Stand: ${new Date().toLocaleDateString("de-DE")} · ${location.href}`;
  }

  // Kompakte Zusammenfassung für das Sprachmodell; es hat nur 4.096 Tokens Kontext.
  function kontext() {
    const ctx = lastCtx;
    if (!ctx) return "";
    const { hafen, revier } = ctx;
    const inf = hafen.infrastruktur;
    const janein = (b) => (b === true ? "ja" : hafen.quelle === "osm" ? "unbekannt" : "nein");
    const t = temperatur(hafen);
    const k = kernfrage(ctx);
    const aktiv = aktiveVorlage(ctx);
    const score = Object.fromEntries(ctx.res[state.methode].map((r) => [r.id, r]));
    const monat = new Date().getMonth();
    const z = [];
    z.push(`Hafen: ${hafen.name}; Revier: ${revier.name}; ${WASSER[revier.wassertyp]} ${revier.salzgehalt_psu.join("–")} PSU.`);
    z.push(`${druckText(ctx)}. Stärkster Bewuchs: ${revier.hauptbewuchs}. Typisch: ${revier.organismen.join(", ")}.`);
    z.push(`Im Hafen: Waschanlage ${janein(inf.waschanlage)}, Kran ${janein(inf.kran)}, Trockenliegeplatz ${janein(inf.trockenliegeplatz)}.`);
    if (t.wert != null) {
      const q = t.cop && t.cop.temp != null ? "Copernicus Marine, Tagesmittel" : t.see ? "Modellwert Open-Meteo" : "PEGELONLINE, " + zahl(t.pegel.km) + " km entfernt";
      z.push(`Wassertemperatur jetzt: ${zahl(t.wert, 1)} °C (${q}).`);
    }
    if (t.cop && t.cop.salz != null) z.push(`Salzgehalt laut Copernicus: ${zahl(t.cop.salz, 1)} PSU.`);
    if (t.cop && t.cop.chl != null) z.push(`Chlorophyll laut Copernicus: ${zahl(t.cop.chl, 1)} mg/m³ (${chlText(t.cop.chl)}); mehr Nährstoffe bedeuten eher mehr Bewuchs.`);
    z.push(`Jetzt (${MONATE[monat]}): ${jetztHinweis(revier, monat)}`);
    const ti = tafelInfo(hafen);
    if (ti) z.push(`Bewuchstafel im Hafen (Citizen Science): letzte Ablesung ${ti.letzte.abgelesen} mit ${zahl(ti.letzte.bedeckung_prozent)} % Bedeckung (${ti.letzte.organismen.map((o) => o.name).join(", ")}), Höchstwert der Saison ${zahl(ti.max)} %.`);
    z.push(`Nutzer: ${profilText()}.`);
    z.push(`Gewichtung: ${aktiv ? aktiv.label + ": " : ""}${ctx.crit.map((c) => `${c.label} ${zahl(100 * ctx.weights[c.key])} %`).join(", ")}. Verfahren: ${METHODE_NAME[state.methode]}.`);
    z.push(`Antwort auf "Geht es ohne Biozid?": ${k.head}. ${k.text}`);
    z.push("Rangliste:");
    ctx.order.forEach((id, i) => {
      const o = ctx.opt[id];
      const raw = ctx.alts.find((a) => a.id === id).raw;
      z.push(`${i + 1}. ${o.name} (${KAT[o.kategorie]}), ${punkte(state.methode, score[id])}: ${ctx.crit.map((c) => `${KURZ[c.key]} ${wertText(c, raw[c.key])}`).join(", ")}. ${o.kurz}`);
    });
    if (ctx.order.length > 1) z.push(`Robustheit: Platz 1 bleibt in ${Math.round(100 * ctx.robust.share)} % der Durchläufe vorn.`);
    if (ctx.ausgeschlossen.length) {
      z.push("Ausgeschlossen:");
      ctx.ausgeschlossen.forEach((x) => z.push(`- ${x.o.name}: ${x.gruende.join("; ")}`));
    }
    const { pks } = produkte(ctx);
    if (pks.length) z.push(`Zulässige biozidhaltige Produktkategorien (keine Marken): ${pks.map((p) => `${p.bezeichnung} (${p.wirkstoffe.map((w) => w.name).join(", ")})`).join("; ")}.`);
    z.push("Alle Fachwerte sind Beispieldaten eines Prototyps, keine geprüften Angaben.");
    return z.join("\n");
  }

  window.Atlas = { kontext };

  function render(rebuildWeights = true) {
    const ctx = evaluate();
    lastCtx = ctx;
    if (rebuildWeights) buildGewichte();
    renderSteckbrief(ctx);
    renderKernfrage(ctx);
    renderRangliste(ctx);
    renderKosten(ctx);
    renderGewichte(ctx);
    renderVergleich(ctx);
    renderAusschluss(ctx);
    renderProdukte(ctx);
    renderDruckkopf(ctx);
    updateMarkers();
  }

  /* ---------- Karte ---------- */

  function farbe(token, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
  }

  function druckFarbe(d) {
    return farbe(d === 3 ? "--rot" : d === 2 ? "--gelb" : "--gruen", "#888");
  }

  // Hinweis beim Darüberfahren: Name, Bewuchsdruck und, sobald geladen, die
  // Wassertemperatur. Als Funktion, damit sie beim Öffnen aktuell ist.
  function hafenTooltip(h) {
    const t = temperatur(h);
    let s = `<b>${esc(h.name)}</b>${h.quelle === "osm" ? " (OpenStreetMap)" : ""}<br>Bewuchsdruck ${DRUCK[D.reviere[h.revier].bewuchsdruck]}`;
    if (t.cop && t.cop.temp != null) {
      s += `<br>Meerestemperatur ${zahl(t.cop.temp, 1)} °C (Copernicus)`;
      if (t.cop.salz != null) s += `<br>Salzgehalt ${zahl(t.cop.salz, 1)} PSU`;
    } else if (t.see) s += `<br>Meerestemperatur ${zahl(t.see.wert, 1)} °C (Modell)`;
    else if (t.pegel) s += `<br>Wassertemperatur ${zahl(t.pegel.wert, 1)} °C (Messstelle, ${zahl(t.pegel.km)} km)`;
    return s;
  }

  function alleBeispielhaefen() {
    return L.latLngBounds(D.haefen.map((x) => [x.lat, x.lon]));
  }

  function initMap() {
    map = L.map("map", { zoomControl: true, scrollWheelZoom: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-Mitwirkende',
    }).addTo(map);
    const seezeichen = L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '<a href="https://www.openseamap.org" target="_blank" rel="noopener">OpenSeaMap</a>',
    });
    pegelLayer = L.layerGroup().addTo(map);
    const overlays = { "Seezeichen (OpenSeaMap)": seezeichen, "Messstellen Wassertemperatur": pegelLayer };

    // Häfen aus OpenStreetMap: klein und grau, auf Canvas gezeichnet, weil es viele sind.
    if (D.osm.haefen.length) {
      osmLayer = L.layerGroup().addTo(map);
      const canvas = L.canvas({ padding: 0.5 });
      const grau = farbe("--muted", "#566b75");
      D.osm.haefen.forEach((h) => {
        L.circleMarker([h.lat, h.lon], { renderer: canvas, radius: 3.5, weight: 1, color: "#ffffff", fillColor: grau, fillOpacity: 0.8 })
          .bindTooltip(() => hafenTooltip(h), { direction: "top" })
          .on("click", () => selectHafen(h.id))
          .addTo(osmLayer);
      });
      overlays[`Weitere Häfen aus OpenStreetMap (${zahl(D.osm.haefen.length)})`] = osmLayer;
    }
    L.control.layers(null, overlays, { collapsed: true }).addTo(map);

    D.haefen.forEach((h) => {
      const m = L.circleMarker([h.lat, h.lon], { radius: 7, weight: 1.5, color: "#ffffff", fillOpacity: 0.95 });
      m.bindTooltip(() => hafenTooltip(h), { direction: "top", offset: [0, -6] });
      m.on("click", () => selectHafen(h.id));
      m.addTo(map);
      markers[h.id] = m;
    });
    map.fitBounds(alleBeispielhaefen(), { padding: [24, 24] });

    const legend = L.control({ position: "bottomleft" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "map-legend");
      div.innerHTML = `<b>Bewuchsdruck</b>
        <span class="row"><span class="dot druck-1"></span>gering</span>
        <span class="row"><span class="dot druck-2"></span>mittel</span>
        <span class="row"><span class="dot druck-3"></span>hoch</span>
        <span class="muted">Beispielwerte je Revier</span>
        ${D.osm.haefen.length ? `<span class="row"><span class="dot osm-dot"></span>weitere Häfen (OpenStreetMap)</span>` : ""}
        <span class="row"><span class="dot pegel-dot"></span>Wassertemperatur, live</span>
        <span class="muted" id="live-status">PEGELONLINE wird abgefragt …</span>`;
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    legend.addTo(map);
    liveStatusEl = document.getElementById("live-status");

    const toggle = L.control({ position: "topleft" });
    toggle.onAdd = () => {
      const btn = L.DomUtil.create("button", "map-toggle");
      btn.type = "button";
      btn.id = "map-toggle";
      btn.textContent = "Karte verkleinern";
      L.DomEvent.disableClickPropagation(btn);
      btn.addEventListener("click", () => setCompact(!$(".layout").classList.contains("compact")));
      return btn;
    };
    toggle.addTo(map);

    window.addEventListener("resize", () => map.invalidateSize());
  }

  // Ein gewählter Hafen aus OpenStreetMap bekommt einen eigenen, hervorgehobenen Marker.
  let osmAuswahl = null;

  function updateMarkers() {
    if (!map) return;
    D.haefen.forEach((h) => {
      const sel = h.id === state.hafenId;
      markers[h.id].setStyle({
        fillColor: druckFarbe(D.reviere[h.revier].bewuchsdruck),
        color: sel ? "#0b1f28" : "#ffffff",
        weight: sel ? 3 : 1.5,
      });
      markers[h.id].setRadius(sel ? 11 : 7);
      if (sel) markers[h.id].bringToFront();
    });
    if (osmAuswahl) { osmAuswahl.remove(); osmAuswahl = null; }
    const h = D.hafen[state.hafenId];
    if (h.quelle === "osm") {
      osmAuswahl = L.circleMarker([h.lat, h.lon], {
        radius: 10, weight: 3, color: "#0b1f28", fillColor: druckFarbe(D.reviere[h.revier].bewuchsdruck), fillOpacity: 0.95,
      }).bindTooltip(() => hafenTooltip(h), { direction: "top", offset: [0, -6] }).addTo(map);
    }
  }

  function selectHafen(id) {
    state.hafenId = id;
    syncHafenAuswahl();
    try { history.replaceState(null, "", "#" + id); } catch (e) { /* ohne Adresszeile */ }
    render(false);
    setCompact(true);
  }

  // Schmale Karte mit dem gewählten Hafen im Blick, oder ganz Deutschland.
  function setCompact(on) {
    $(".layout").classList.toggle("compact", on);
    const btn = document.getElementById("map-toggle");
    if (btn) btn.textContent = on ? "Karte vergrößern" : "Karte verkleinern";
    setTimeout(() => {
      map.invalidateSize();
      const h = D.hafen[state.hafenId];
      if (on) map.setView([h.lat, h.lon], Math.max(map.getZoom(), 9));
      else map.fitBounds(alleBeispielhaefen(), { padding: [24, 24] });
    }, 280);
  }

  /* ---------- Live-Daten ---------- */

  async function loadLive() {
    try {
      state.live.data = await Live.load();
      state.live.status = "ok";
      const t = new Date(state.live.data.fetched).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      if (liveStatusEl) liveStatusEl.textContent = `${state.live.data.stationen.length} Messstellen, abgefragt ${t} Uhr`;
      const blau = farbe("--accent", "#0d6a80");
      state.live.data.stationen.forEach((s) => {
        L.circleMarker([s.lat, s.lon], { radius: 3, weight: 1, color: "#ffffff", fillColor: blau, fillOpacity: s.veraltet ? 0.3 : 0.7 })
          .bindTooltip(`Messstelle ${esc(s.name)}<br>Wassertemperatur ${zahl(s.wert, 1)} °C`, { direction: "top" })
          .addTo(pegelLayer);
      });
      D.haefen.forEach((h) => markers[h.id].bringToFront());
    } catch (e) {
      state.live.status = "fehler";
      if (liveStatusEl) liveStatusEl.textContent = "PEGELONLINE nicht erreichbar";
      console.warn("PEGELONLINE:", e);
    }
    refreshLive();
  }

  // Meerestemperatur für alle Küstenhäfen der Beispieldaten auf einmal; ein
  // Hafen aus OpenStreetMap wird beim Auswählen nachgeladen.
  async function loadSee() {
    const kueste = D.haefen.filter((h) => D.reviere[h.revier].wassertyp !== "suess");
    try {
      state.see.data = await Live.loadSee(kueste);
      state.see.status = "ok";
    } catch (e) {
      state.see.status = "fehler";
      console.warn("Open-Meteo:", e);
    }
    const h = D.hafen[state.hafenId];
    if (h.quelle === "osm") seeFuerOsm(h);
    refreshLive();
  }

  async function seeFuerOsm(h) {
    if (state.see.status !== "ok" || h.id in state.see.data.werte || D.reviere[h.revier].wassertyp === "suess") return;
    try {
      const r = await Live.loadSee([h]);
      state.see.data.werte[h.id] = r.werte[h.id];
      refreshLive();
    } catch (e) { /* ohne Meerestemperatur weiter */ }
  }

  /* ---------- Bedienung ---------- */

  function syncProfilFelder() {
    $("#laenge").value = state.laenge[state.profil];
    $("#laenge-label").textContent = state.profil === "beruf" ? "Schiffslänge (m)" : "Bootslänge (m)";
    $("#hafen-label").textContent = state.profil === "beruf" ? "Heimathafen bzw. Fahrtgebiet" : "Liegeplatz";
    $("#boot-felder").hidden = state.profil !== "freizeit";
    $("#wunsch").hidden = !D.optionen.some((o) => o.nur_auf_wunsch && o.zielgruppen.includes(state.profil));
  }

  function syncHafenAuswahl() {
    const sel = $("#hafen");
    const alt = sel.querySelector("optgroup[data-osm]");
    if (alt) alt.remove();
    const h = D.hafen[state.hafenId];
    if (h.quelle === "osm") {
      const g = document.createElement("optgroup");
      g.label = "Aus OpenStreetMap";
      g.dataset.osm = "1";
      g.innerHTML = `<option value="${esc(h.id)}">${esc(h.name)}</option>`;
      sel.appendChild(g);
      seeFuerOsm(h);
    }
    sel.value = state.hafenId;
  }

  function bindControls() {
    const sel = $("#hafen");
    sel.innerHTML = D.reviereListe
      .map((r) => {
        const hs = D.haefen.filter((h) => h.revier === r.id);
        return hs.length
          ? `<optgroup label="${esc(r.name)}">${hs.map((h) => `<option value="${h.id}">${esc(h.name)}</option>`).join("")}</optgroup>`
          : "";
      })
      .join("");
    syncHafenAuswahl();
    sel.addEventListener("change", () => selectHafen(sel.value));

    document.querySelectorAll('input[name="profil"]').forEach((r) =>
      r.addEventListener("change", () => {
        state.profil = r.value;
        syncProfilFelder();
        render(true);
      })
    );

    $("#laenge").addEventListener("input", (e) => {
      const v = Number(e.target.value);
      if (v > 0) {
        state.laenge[state.profil] = v;
        render(false);
      }
    });

    $("#bootstyp").addEventListener("change", (e) => {
      state.bootstyp = e.target.value;
      render(false);
    });

    $("#monate").addEventListener("input", (e) => {
      const v = Math.round(Number(e.target.value));
      if (v >= 1 && v <= 12) {
        state.monate = v;
        render(false);
      }
    });

    D.optionen
      .filter((o) => o.nur_auf_wunsch)
      .forEach((o) => {
        const row = document.createElement("div");
        row.className = "check";
        row.innerHTML = `<input type="checkbox" id="wunsch-${o.id}" value="${o.id}"><label for="wunsch-${o.id}">${esc(o.name)}</label>`;
        row.querySelector("input").addEventListener("change", (e) => {
          state.aufWunsch = e.target.checked ? [...state.aufWunsch, o.id] : state.aufWunsch.filter((id) => id !== o.id);
          render(false);
        });
        $("#wunsch").appendChild(row);
      });

    $("#methode").addEventListener("change", (e) => {
      state.methode = e.target.value;
      render(false);
    });
  }

  async function init() {
    try {
      D = await loadData();
    } catch (e) {
      const el = $("#load-error");
      el.hidden = false;
      el.textContent =
        location.protocol === "file:"
          ? "Die Beispieldaten lassen sich nicht direkt aus einer lokalen Datei laden. Bitte über einen Webserver öffnen, z. B. mit „python -m http.server“ im Ordner biozidatlas."
          : "Die Beispieldaten konnten nicht geladen werden: " + e.message;
      return;
    }
    state.importance = { freizeit: defaultImportance("freizeit"), beruf: defaultImportance("beruf") };
    const ausAdresse = decodeURIComponent(location.hash.slice(1));
    if (D.hafen[ausAdresse]) state.hafenId = ausAdresse;
    $("#bootstyp").value = state.bootstyp;
    $("#monate").value = state.monate;
    syncProfilFelder();
    bindControls();
    initMap();
    render(true);
    if (D.hafen[ausAdresse]) setCompact(true);
    window.addEventListener("hashchange", () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (D.hafen[id] && id !== state.hafenId) selectHafen(id);
    });
    if (D.osm.stand) $("#osm-stand").textContent = ` (Stand ${new Date(D.osm.stand).toLocaleDateString("de-DE")}, ${zahl(D.osm.haefen.length)} Häfen)`;
    loadLive();
    loadSee();
  }

  init();
})();
