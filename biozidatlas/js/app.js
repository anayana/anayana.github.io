/* Antifouling-Atlas (Prototyp): Karte, Ausschluss nach Regeln, Bewertung mit
   drei MCDA-Verfahren und Live-Wassertemperatur. Alle Fachwerte kommen aus
   data/*.json und sind Beispieldaten. */
(function () {
  "use strict";

  const WASSER = { salz: "Salzwasser", brack: "Brackwasser", suess: "Süßwasser" };
  const DRUCK = { 1: "gering", 2: "mittel", 3: "hoch" };
  const KAT = { biozidfrei: "biozidfrei", mechanisch: "ohne Anstrich", biozid: "biozidhaltig" };
  const KURZ = {
    umwelt: "Umwelt", wirksamkeit: "Wirksamkeit", kosten: "Kosten", aufwand: "Aufwand",
    gesundheit: "Gesundheit", treibstoff: "Treibstoff", standzeit: "Standzeit", invasiv: "Arten",
  };
  const METHODEN = ["wsm", "topsis", "promethee"];
  const METHODE_KURZ = { wsm: "Summe", topsis: "TOPSIS", promethee: "PROMETHEE" };
  const LAENGE = { freizeit: 9, beruf: 90 };

  const state = {
    profil: "freizeit",
    laenge: { ...LAENGE },
    hafenId: "kiel-schilksee",
    aufWunsch: [],
    methode: "wsm",
    importance: {},
    live: { status: "laden", data: null },
  };

  let D = null;
  let map = null;
  const markers = {};
  let pegelLayer = null;
  let liveStatusEl = null;

  const $ = (s) => document.querySelector(s);
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const zahl = (n, d = 0) => n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });

  /* ---------- Daten ---------- */

  async function loadJSON(name) {
    const res = await fetch("data/" + name + ".json?v=3");
    if (!res.ok) throw new Error(name + ".json: " + res.status);
    return res.json();
  }

  async function loadData() {
    const [rv, hf, op, kr, pk] = await Promise.all(
      ["reviere", "haefen", "optionen", "kriterien", "produktkategorien"].map(loadJSON)
    );
    const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
    return {
      reviere: byId(rv.reviere),
      reviereListe: rv.reviere,
      regeltexte: rv.regeltexte,
      haefen: hf.haefen,
      hafen: byId(hf.haefen),
      optionen: op.optionen,
      kriterien: kr,
      pk: byId(pk.kategorien),
    };
  }

  function defaultImportance(profil) {
    return Object.fromEntries(D.kriterien[profil].map((c) => [c.key, c.gewicht]));
  }

  /* ---------- Bewertung ---------- */

  function gruende(o, hafen, revier, laenge) {
    const b = o.bedingungen || {};
    const out = [];
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
      if (!hafen.infrastruktur[x]) {
        out.push(x === "waschanlage" ? "Keine Waschanlage im Hafen (Beispielwert)" : "Kein Kran im Hafen (Beispielwert)");
      }
    });
    return out;
  }

  function rohwerte(o, crit, revier) {
    const raw = {};
    crit.forEach((c) => {
      raw[c.key] = c.feld === "wirksamkeit" ? o.werte.wirksamkeit[String(revier.bewuchsdruck)] : o.werte[c.feld];
    });
    return raw;
  }

  function evaluate() {
    const hafen = D.hafen[state.hafenId];
    const revier = D.reviere[hafen.revier];
    const crit = D.kriterien[state.profil];
    const laenge = state.laenge[state.profil];
    const importance = state.importance[state.profil];

    const erlaubt = [];
    const ausgeschlossen = [];
    D.optionen
      .filter((o) => o.zielgruppen.includes(state.profil))
      .filter((o) => !o.nur_auf_wunsch || state.aufWunsch.includes(o.id))
      .forEach((o) => {
        const g = gruende(o, hafen, revier, laenge);
        (g.length ? ausgeschlossen : erlaubt).push(g.length ? { o, gruende: g } : o);
      });

    const alts = erlaubt.map((o) => ({ id: o.id, raw: rohwerte(o, crit, revier) }));
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

    return { hafen, revier, crit, laenge, erlaubt, ausgeschlossen, alts, weights, floored, res, rk, kons, robust, opt };
  }

  /* ---------- Darstellung ---------- */

  function wertText(c, v) {
    switch (c.feld) {
      case "kosten_eur_10m": return zahl(v) + " €/Saison";
      case "aufwand_h": return zahl(v) + " h/Saison";
      case "treibstoff_pct": return "+" + zahl(v) + " %";
      case "standzeit_jahre": return zahl(v) + " Jahre";
      default: return zahl(v) + "/10";
    }
  }

  function renderSteckbrief(ctx) {
    const { hafen, revier } = ctx;
    const inf = hafen.infrastruktur;
    const janein = (b) => (b ? "ja" : "nein");
    const [smin, smax] = revier.salzgehalt_psu;
    $("#steckbrief").innerHTML = `
      <h2>${state.profil === "beruf" ? "Heimathafen" : "Liegeplatz"}</h2>
      <div class="hafen-name">${esc(hafen.name)}</div>
      <div class="hafen-revier">${esc(revier.name)}</div>
      <div class="chips">
        <span class="chip"><span class="dot druck-${revier.bewuchsdruck}"></span>Bewuchsdruck ${DRUCK[revier.bewuchsdruck]}</span>
        <span class="chip">${WASSER[revier.wassertyp]}, ${zahl(smin, smin % 1 ? 1 : 0)}–${zahl(smax, smax % 1 ? 1 : 0)} PSU</span>
      </div>
      <dl class="facts">
        <dt>Hauptbewuchs</dt><dd>${esc(revier.hauptbewuchs)}</dd>
        <dt>Typisch</dt><dd>${esc(revier.organismen.join(", "))}</dd>
        <dt>Im Hafen</dt><dd>Waschanlage ${janein(inf.waschanlage)} · Kran ${janein(inf.kran)} · Trockenliegeplatz ${janein(inf.trockenliegeplatz)}</dd>
      </dl>
      <div class="example">Bewuchsdruck und Hafen-Infrastruktur: Beispielwerte.</div>
      <div class="live" id="live-box">${liveHTML(hafen)}</div>`;
  }

  function liveHTML(hafen) {
    const tag = `<span class="live-tag">Live · PEGELONLINE</span>`;
    if (state.live.status === "laden") return `${tag}<span class="live-meta">Wassertemperatur wird abgefragt …</span>`;
    if (state.live.status === "fehler") {
      return `${tag}<span class="live-meta">PEGELONLINE ist gerade nicht erreichbar. Die Bewertung funktioniert auch ohne Live-Daten.</span>`;
    }
    const st = Live.nearest(hafen.lat, hafen.lon, state.live.data.stationen, 40);
    if (!st) return `${tag}<span class="live-meta">Keine Messstelle mit Wassertemperatur im Umkreis von 40 km.</span>`;
    const zeit = st.zeit
      ? new Date(st.zeit).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
      : "unbekannt";
    const s = Live.saison(st.wert);
    return `${tag}
      <span class="live-value">${zahl(st.wert, 1)} °C</span>
      <span class="live-meta">Messstelle ${esc(st.name)}${st.gewaesser ? " (" + esc(st.gewaesser) + ")" : ""}, ${zahl(st.km)} km entfernt · Stand ${zeit}${st.veraltet ? " · älter als 6 Stunden" : ""}</span>
      <span>${esc(s.text)} <span class="example">(Faustregel)</span></span>`;
  }

  function renderKernfrage(ctx) {
    const el = $("#kernfrage");
    const order = rangfolge(ctx);
    const wsm = Object.fromEntries(ctx.res.wsm.map((r) => [r.id, r.score]));
    let cls, head, text;
    if (!order.length) {
      cls = "nein"; head = "Keine Option passt";
      text = "Für diese Kombination aus Revier, Bootslänge und Hafen bleibt keine Option übrig.";
    } else if (ctx.revier.regeln.includes("biozid_verboten")) {
      const best = ctx.opt[order[0]];
      cls = "ja"; head = "Ja, und hier sogar vorgeschrieben";
      text = `${D.regeltexte.biozid_verboten} Bestbewertet: ${best.name}.`;
    } else {
      const top = ctx.opt[order[0]];
      const frei = order.find((id) => ctx.opt[id].kategorie !== "biozid");
      if (top.kategorie !== "biozid") {
        cls = "ja"; head = "Ja, biozidfrei geht hier";
        text = `Die bestbewertete Option kommt ohne Biozid aus: ${top.name}.`;
      } else if (frei && wsm[frei] >= 0.9 * wsm[top.id]) {
        cls = "teils"; head = "Ja, mit kleinen Abstrichen";
        text = `Platz 1 ist biozidhaltig, aber ${ctx.opt[frei].name} erreicht ${zahl((100 * wsm[frei]) / wsm[top.id])} % der Punkte.`;
      } else {
        cls = "nein"; head = "Eher nicht";
        text = frei
          ? `Bei diesem Bewuchsdruck und dieser Gewichtung liegen biozidhaltige Anstriche vorn. Beste biozidfreie Option: ${ctx.opt[frei].name}.`
          : "Unter den passenden Optionen ist keine biozidfreie.";
      }
    }
    el.className = "card kernfrage " + cls;
    el.innerHTML = `<h2>Geht es hier ohne Biozid?</h2><div class="kf-head">${esc(head)}</div><p class="kf-text">${esc(text)}</p>`;
  }

  function rangfolge(ctx) {
    const rk = ctx.rk[state.methode];
    return ctx.alts.map((a) => a.id).sort((a, b) => rk[a] - rk[b]);
  }

  function renderRangliste(ctx) {
    const m = state.methode;
    const order = rangfolge(ctx);
    const score = Object.fromEntries(ctx.res[m].map((r) => [r.id, r]));
    if (!order.length) {
      $("#rangliste").innerHTML = `<p class="hint">Keine Option übrig. Siehe „Ausgeschlossen“.</p>`;
      return;
    }

    const legend =
      m === "wsm"
        ? `<div class="legend" aria-hidden="true">${ctx.crit
            .map((c) => `<span><i class="swatch" style="background:var(--c-${c.key})"></i>${KURZ[c.key]}</span>`)
            .join("")}</div>`
        : "";

    const items = order
      .map((id, i) => {
        const o = ctx.opt[id];
        const r = score[id];
        let bar, val;
        if (m === "wsm") {
          bar = `<div class="bar" title="Anteil der Kriterien an der Punktzahl">${ctx.crit
            .map((c) => `<span style="width:${(100 * r.parts[c.key]).toFixed(2)}%;background:var(--c-${c.key})"></span>`)
            .join("")}</div>`;
          val = zahl(100 * r.score) + " P.";
        } else if (m === "topsis") {
          bar = `<div class="bar bar-single"><span style="width:${(100 * r.score).toFixed(2)}%"></span></div>`;
          val = zahl(r.score, 2);
        } else {
          bar = `<div class="bar bar-single"><span style="width:${(50 * (r.score + 1)).toFixed(2)}%"></span></div>`;
          val = (r.score >= 0 ? "+" : "−") + zahl(Math.abs(r.score), 2);
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
          <span class="rank-score">${val}</span>
        </li>`;
      })
      .join("");

    const rb = ctx.robust;
    let robust = "";
    if (order.length > 1) {
      const pct = Math.round(100 * rb.share);
      const tag = pct >= 80 ? ["stabil", "stabil"] : pct >= 60 ? ["knapp", "knapp"] : ["unsicher", "unsicher"];
      robust = `<div class="robust"><span class="tag tag-${tag[0]}">${tag[1]}</span>
        <span>Platz 1 bleibt in <b>${pct} %</b> von ${rb.runs} Durchläufen vorn, wenn Gewichte um ±25 % und Werte um ±15 % schwanken.</span></div>`;
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
        : "Kosten pro Saison für ein 10-m-Boot, Anschaffung umgelegt · Indizes 0–10 · Beispielwerte";

    $("#rangliste").innerHTML = `${legend}<p class="hint">${scale} ${einheiten}.</p><ol class="rank-list">${items}</ol>${robust}`;
  }

  function buildGewichte() {
    const crit = D.kriterien[state.profil];
    const imp = state.importance[state.profil];
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

  function renderGewichte(ctx) {
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
    const card = $("#ausschluss-card");
    card.hidden = !ctx.ausgeschlossen.length;
    $("#ausschluss").innerHTML = `<ul class="excl-list">${ctx.ausgeschlossen
      .map(
        (x) => `<li><span class="excl-name">${esc(x.o.name)} <span class="kat kat-${x.o.kategorie}">${KAT[x.o.kategorie]}</span></span>
          <span class="excl-why">${x.gruende.map(esc).join(" · ")}</span></li>`
      )
      .join("")}</ul>`;
  }

  function renderProdukte(ctx) {
    const verwender = state.profil === "beruf" ? "berufsmäßig" : "Laie";
    const ids = [];
    ctx.erlaubt
      .filter((o) => o.kategorie === "biozid")
      .forEach((o) => (o.produktkategorien || []).forEach((p) => { if (!ids.includes(p)) ids.push(p); }));
    const pks = ids.map((id) => D.pk[id]).filter((p) => p && p.verwender === verwender);
    if (!pks.length) {
      $("#produkte").innerHTML = `<p>An diesem Liegeplatz kommt kein biozidhaltiges Produkt in Frage.</p>`;
      return;
    }
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
          <ul>${p.wirkstoffe
            .map((w) => `<li>${esc(w.name)} ${zahl(w.gehalt_prozent[0], w.gehalt_prozent[0] % 1 ? 1 : 0)}–${zahl(w.gehalt_prozent[1], w.gehalt_prozent[1] % 1 ? 1 : 0)} %</li>`)
            .join("")}</ul>
          <div class="pk-sub">Anwendung</div>
          <ul><li>${esc(p.anwendung)}</li>${p.hinweise.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
        </article>`
      )
      .join("")}</div>`;
  }

  function render(rebuildWeights = true) {
    const ctx = evaluate();
    if (rebuildWeights) buildGewichte();
    renderSteckbrief(ctx);
    renderKernfrage(ctx);
    renderRangliste(ctx);
    renderGewichte(ctx);
    renderVergleich(ctx);
    renderAusschluss(ctx);
    renderProdukte(ctx);
    updateMarkers();
  }

  /* ---------- Karte ---------- */

  function druckFarbe(d) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(d === 3 ? "--rot" : d === 2 ? "--gelb" : "--gruen");
    return v.trim() || "#888";
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
    L.control.layers(null, { "Seezeichen (OpenSeaMap)": seezeichen, "Messstellen Wassertemperatur": pegelLayer }, { collapsed: true }).addTo(map);

    D.haefen.forEach((h) => {
      const m = L.circleMarker([h.lat, h.lon], { radius: 7, weight: 1.5, color: "#ffffff", fillOpacity: 0.95 });
      m.bindTooltip(h.name, { direction: "top", offset: [0, -6] });
      m.on("click", () => selectHafen(h.id));
      m.addTo(map);
      markers[h.id] = m;
    });
    map.fitBounds(L.latLngBounds(D.haefen.map((h) => [h.lat, h.lon])), { padding: [24, 24] });

    const legend = L.control({ position: "bottomleft" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "map-legend");
      div.innerHTML = `<b>Bewuchsdruck</b>
        <span class="row"><span class="dot druck-1"></span>gering</span>
        <span class="row"><span class="dot druck-2"></span>mittel</span>
        <span class="row"><span class="dot druck-3"></span>hoch</span>
        <span class="muted">Beispielwerte je Revier</span>
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

  function updateMarkers() {
    if (!map) return;
    D.haefen.forEach((h) => {
      const sel = h.id === state.hafenId;
      const d = D.reviere[h.revier].bewuchsdruck;
      markers[h.id].setStyle({
        fillColor: druckFarbe(d),
        color: sel ? "#0b1f28" : "#ffffff",
        weight: sel ? 3 : 1.5,
      });
      markers[h.id].setRadius(sel ? 11 : 7);
      if (sel) markers[h.id].bringToFront();
    });
  }

  function selectHafen(id) {
    state.hafenId = id;
    $("#hafen").value = id;
    render(false);
    setCompact(true);
  }

  // Schmale Karte mit dem gewählten Hafen im Blick, oder ganz Deutschland.
  function setCompact(on) {
    const layout = $(".layout");
    layout.classList.toggle("compact", on);
    const btn = document.getElementById("map-toggle");
    if (btn) btn.textContent = on ? "Karte vergrößern" : "Karte verkleinern";
    setTimeout(() => {
      map.invalidateSize();
      const h = D.hafen[state.hafenId];
      if (on) map.setView([h.lat, h.lon], 8);
      else map.fitBounds(L.latLngBounds(D.haefen.map((x) => [x.lat, x.lon])), { padding: [24, 24] });
    }, 280);
  }

  /* ---------- Live-Daten ---------- */

  async function loadLive() {
    try {
      state.live.data = await Live.load();
      state.live.status = "ok";
      const n = state.live.data.stationen.length;
      if (liveStatusEl) {
        const t = new Date(state.live.data.fetched).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
        liveStatusEl.textContent = `${n} Messstellen, abgefragt ${t} Uhr`;
      }
      state.live.data.stationen.forEach((s) => {
        L.circleMarker([s.lat, s.lon], {
          radius: 3, weight: 1, color: "#ffffff", fillColor: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#0d6a80", fillOpacity: s.veraltet ? 0.3 : 0.7,
        })
          .bindTooltip(`${esc(s.name)}: ${zahl(s.wert, 1)} °C`, { direction: "top" })
          .addTo(pegelLayer);
      });
      D.haefen.forEach((h) => markers[h.id].bringToFront());
      markers[state.hafenId].bringToFront();
    } catch (e) {
      state.live.status = "fehler";
      if (liveStatusEl) liveStatusEl.textContent = "PEGELONLINE nicht erreichbar";
      console.warn("Live-Daten:", e);
    }
    const box = document.getElementById("live-box");
    if (box) box.innerHTML = liveHTML(D.hafen[state.hafenId]);
  }

  /* ---------- Bedienung ---------- */

  function syncLaengeFeld() {
    const inp = $("#laenge");
    inp.value = state.laenge[state.profil];
    $("#laenge-label").textContent = state.profil === "beruf" ? "Schiffslänge (m)" : "Bootslänge (m)";
    $("#hafen-label").textContent = state.profil === "beruf" ? "Heimathafen bzw. Fahrtgebiet" : "Liegeplatz";
    const wunsch = D.optionen.filter((o) => o.nur_auf_wunsch && o.zielgruppen.includes(state.profil));
    $("#wunsch").hidden = !wunsch.length;
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
    sel.value = state.hafenId;
    sel.addEventListener("change", () => {
      selectHafen(sel.value);
    });

    document.querySelectorAll('input[name="profil"]').forEach((r) =>
      r.addEventListener("change", () => {
        state.profil = r.value;
        syncLaengeFeld();
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

    D.optionen
      .filter((o) => o.nur_auf_wunsch)
      .forEach((o) => {
        const row = document.createElement("div");
        row.className = "check";
        row.innerHTML = `<input type="checkbox" id="wunsch-${o.id}" value="${o.id}"><label for="wunsch-${o.id}">${esc(o.name)}</label>`;
        row.querySelector("input").addEventListener("change", (e) => {
          state.aufWunsch = e.target.checked
            ? [...state.aufWunsch, o.id]
            : state.aufWunsch.filter((id) => id !== o.id);
          render(false);
        });
        $("#wunsch").appendChild(row);
      });

    $("#methode").addEventListener("change", (e) => {
      state.methode = e.target.value;
      render(false);
    });

    $("#reset").addEventListener("click", () => {
      state.importance[state.profil] = defaultImportance(state.profil);
      render(true);
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
    syncLaengeFeld();
    bindControls();
    initMap();
    render(true);
    loadLive();
  }

  init();
})();
