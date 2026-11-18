/* Assistent: ein Knopf unten rechts auf jeder Seite. Er beantwortet Fragen aus
   den Hilfetexten (data/hilfe.json), führt durch Rundgänge (data/rundgaenge.json)
   und kann auf Wunsch ein Sprachmodell im Browser laden (WebLLM), das dann
   frei formuliert, aber nur aus Hilfetexten und dem Stand der Seite antwortet.
   Über das Mikrofon geht alles auch per Sprache (js/sprache.js): Fragen,
   Rundgänge („weiter“, „zurück“, „beenden“), Seiten und Häfen.
   Was jemand sieht, hängt von der Rolle ab (js/zugang.js). */
(function () {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const ruhig = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));

  // Je Modell eine 16-Bit-Variante (braucht shader-f16) und eine 32-Bit-Variante.
  const MODELLE = [
    { key: "ministral", label: "Ministral 3 (3B) von Mistral – ca. 2 GB", f16: "Ministral-3-3B-Instruct-2512-BF16-q4f16_1-MLC", f32: "Ministral-3-3B-Instruct-2512-BF16-q4f32_1-MLC" },
    { key: "gemma", label: "Gemma 2 (2B) von Google – ca. 1,5 GB", f16: "gemma-2-2b-it-q4f16_1-MLC", f32: "gemma-2-2b-it-q4f32_1-MLC" },
    { key: "llama", label: "Llama 3.2 (1B) von Meta – ca. 0,7 GB", f16: "Llama-3.2-1B-Instruct-q4f16_1-MLC", f32: "Llama-3.2-1B-Instruct-q4f32_1-MLC" },
  ];

  const STOPP = new Set(("der die das den dem des ein eine einen einer und oder aber ist sind bin wie was wo wer wann warum wieso " +
    "ich du sie es man wir mein meine meinen mir mich hier da dort mit fuer auf zu zum zur im in an am von vom bei " +
    "kann koennen darf soll muss will gibt geht nicht noch auch nur schon so dann denn ob als wenn bitte mal").split(" "));

  let HILFE = [];
  let RUNDGAENGE = [];
  let HAEFEN = [];

  // Gespräch, offenes Fenster und eine wegen fehlender Anmeldung offene Frage
  // überstehen Seitenwechsel und das Neuladen nach der Anmeldung (nur in diesem Tab).
  const SPEICHER = "biozidatlas.assistent.v1";
  const zustand = (() => {
    try {
      const z = JSON.parse(sessionStorage.getItem(SPEICHER) || "null");
      if (z && Array.isArray(z.log)) return z;
    } catch (e) { /* kein Speicher verfügbar */ }
    return { log: [], offen: false, offeneFrage: null };
  })();
  if (zustand.vorlesen === undefined) zustand.vorlesen = true;

  function sichern() {
    try { sessionStorage.setItem(SPEICHER, JSON.stringify(zustand)); } catch (e) { /* egal */ }
  }
  let engine = null;
  let geladen = null;
  let laeuft = false;
  const verlauf = [];
  // Spracheingabe: an = Gespräch läuft; token bricht veraltete Runden ab.
  const SP = { an: false, token: 0, fehl: 0, status: "", zustand: "" };
  let letzteAntwort = "";

  const rolle = () => (window.Zugang ? window.Zugang.rolle() : "oeffentlich");
  const erlaubt = (r) => r === "alle" || rolle() === "wissenschaft";
  const seite = () => location.pathname.split("/").pop() || "index.html";

  /* ---------- Hilfetexte finden ---------- */

  function norm(s) {
    return String(s).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  }

  function woerter(s) {
    return norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOPP.has(w));
  }

  function suchen(frage, alle = false) {
    const ws = woerter(frage);
    return HILFE.filter((e) => alle || erlaubt(e.rolle))
      .map((e) => {
        const stich = e.stichworte.map(norm);
        const titel = norm(e.frage);
        let punkte = 0;
        ws.forEach((w) => {
          if (stich.includes(w)) punkte += 3;
          else if (w.length >= 5 && stich.some((s) => s.length >= 5 && (s.startsWith(w.slice(0, 5)) || w.startsWith(s.slice(0, 5))))) punkte += 2;
          if (titel.includes(w)) punkte += 1;
        });
        return { e, punkte };
      })
      .filter((x) => x.punkte > 0)
      .sort((a, b) => b.punkte - a.punkte);
  }

  /* ---------- Oberfläche ---------- */

  const MUSCHEL = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 3.2c-4.7 0-8.5 3.5-8.9 8-.1.8.3 1.6.9 2.1l4.8 3.9v1.4c0 .8.7 1.5 1.5 1.5h3.4c.8 0 1.5-.7 1.5-1.5v-1.4l4.8-3.9c.6-.5 1-1.3.9-2.1-.4-4.5-4.2-8-8.9-8z" fill="currentColor"/>
    <path d="M12 4.8v11.6M9.3 5.3l1.5 11M14.7 5.3l-1.5 11M6.5 7l3.1 9.3M17.5 7l-3.1 9.3M4.8 9.6l4 6.6M19.2 9.6l-4 6.6" class="rippe"/>
  </svg>`;

  const MIKRO = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" fill="currentColor"/>
    <path d="M6 11a6 6 0 0 0 12 0M12 17v4M8.5 21h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;

  const sprachOk = () => !!(window.Sprache && window.Sprache.verfuegbar());

  function aufbauen() {
    const knopf = document.createElement("button");
    knopf.type = "button";
    knopf.id = "assistent-knopf";
    knopf.className = "assistent-knopf no-print";
    knopf.setAttribute("aria-label", "Assistent öffnen: Fragen und Rundgänge");
    knopf.setAttribute("aria-expanded", "false");
    knopf.innerHTML = `${MUSCHEL}<span class="frage" aria-hidden="true">?</span>`;

    const panel = document.createElement("section");
    panel.id = "assistent";
    panel.className = "assistent no-print";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Assistent");
    panel.hidden = true;
    panel.innerHTML = `
      <header class="as-kopf">
        <div><b>Assistent</b><span class="as-unter">${rolle() === "wissenschaft" ? "für Wissenschaft" : "Fragen zum Atlas"}</span></div>
        <button type="button" class="as-zu" aria-label="Assistent schließen">×</button>
      </header>
      <div class="as-inhalt">
        <div class="as-hier"></div>
        <ol class="as-log" aria-live="polite"></ol>
        <div class="as-vorschlaege"></div>
        <details class="as-andere"><summary>Andere Rundgänge</summary><div class="presets"></div></details>
      </div>
      <form class="as-form">
        <label for="as-frage" class="sr-only">Ihre Frage</label>
        <input id="as-frage" autocomplete="off" placeholder="Frage stellen, z. B. „Was bedeuten die Farben?“">
        ${sprachOk() ? `<button type="button" class="as-mikro" id="as-mikro" aria-pressed="false" aria-label="Per Sprache fragen" title="Per Sprache fragen">${MIKRO}</button>` : ""}
        <button type="submit" class="btn">Fragen</button>
      </form>
      ${sprachOk() ? `<div class="as-sprachzeile" id="as-sprachzeile" hidden>
        <span class="as-pegel" aria-hidden="true"><i></i></span>
        <span class="as-sprachstatus" id="as-sprachstatus" aria-live="polite"></span>
        <label class="as-vorlesen"><input type="checkbox" id="as-vorlesen"${zustand.vorlesen ? " checked" : ""}> vorlesen</label>
      </div>` : ""}
      <details class="as-ki">
        <summary>Freie Fragen mit KI-Modell</summary>
        <p class="hint">Ohne Modell antworte ich aus festen Hilfetexten. Ein Sprachmodell im Browser formuliert freier, kennt aber auch nur diese Texte und den Stand der Seite. Es wird einmalig heruntergeladen und läuft auf Ihrem Rechner; nichts wird verschickt.</p>
        <div class="as-ki-zeile">
          <label for="as-modell" class="sr-only">Modell</label>
          <select id="as-modell">${MODELLE.map((m) => `<option value="${m.key}">${esc(m.label)}</option>`).join("")}</select>
          <button type="button" class="btn-ghost" id="as-laden">Laden</button>
        </div>
        <progress id="as-fortschritt" max="1" value="0" hidden></progress>
        <p class="hint" id="as-status"></p>
      </details>`;

    document.body.append(knopf, panel);
    knopf.addEventListener("click", () => (panel.hidden ? oeffnen() : schliessen()));
    $(".as-zu", panel).addEventListener("click", schliessen);
    $(".as-form", panel).addEventListener("submit", (e) => {
      e.preventDefault();
      const inp = $("#as-frage");
      const f = inp.value.trim();
      inp.value = "";
      if (f) fragen(f);
    });
    $("#as-laden", panel).addEventListener("click", modellLaden);
    if (sprachOk()) {
      $("#as-mikro", panel).addEventListener("click", sprachKnopf);
      $("#as-vorlesen", panel).addEventListener("change", (e) => {
        zustand.vorlesen = e.target.checked;
        sichern();
        if (!e.target.checked) window.Sprache.still();
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.hidden && !tour) schliessen();
    });

    hierZeigen();
    if (zustand.log.length) zustand.log.forEach((m) => nachricht(m.wer, m.html, false));
    else begruessen();
    // Anmelde-Knopf in Antworten, auch in wiederhergestellten
    $(".as-log").addEventListener("click", (e) => {
      if (e.target.closest("[data-aktion=anmelden]") && window.Zugang) window.Zugang.anmelden();
    });
    // Wechselt der Bereich (anderer Hafen, anderer Reiter der Eingabe), passt sich das Angebot an.
    window.addEventListener("hashchange", hierZeigen);
    document.querySelectorAll('input[name="art"]').forEach((r) => r.addEventListener("change", hierZeigen));
  }

  function oeffnen(fokus = true) {
    hierZeigen();
    $("#assistent").hidden = false;
    $("#assistent-knopf").setAttribute("aria-expanded", "true");
    const inhalt = $(".as-inhalt");
    inhalt.scrollTop = inhalt.scrollHeight;
    if (fokus && !SP.an) $("#as-frage").focus();
    zustand.offen = true;
    sichern();
  }

  function schliessen() {
    if (SP.an) sprachAus("");
    zustand.offen = false;
    sichern();
    $("#assistent").hidden = true;
    $("#assistent-knopf").setAttribute("aria-expanded", "false");
    $("#assistent-knopf").focus();
  }

  // Was gerade offen ist: Seite, bei der Eingabe auch der Reiter, beim Hafen die Einzelseite.
  function hier() {
    const s = seite();
    if (s.startsWith("eingabe")) {
      const r = document.querySelector('input[name="art"]:checked');
      return r && r.value === "tafel"
        ? { name: "Eingabe: Ablesung einer Bewuchstafel", rundgang: "eingabe-tafel", fragen: ["eingabe-tafel", "anteil-schaetzen", "bilder", "pflichtfelder", "speichern-einreichen"] }
        : { name: "Eingabe: Beitrag für eine Hafenseite", rundgang: "eingabe-beitrag", fragen: ["eingabe-beitrag", "bilder", "pflichtfelder", "speichern-einreichen", "freigeben"] };
    }
    if (s.startsWith("anleitung")) return { name: "Anleitung", rundgang: "atlas", fragen: ["anleitung", "anmelden", "sprache", "herkunft", "beispieldaten"] };
    if (s.startsWith("datenbank")) return { name: "Datenbank", rundgang: "datenbank", fragen: ["datenbank", "freigeben", "beispieldaten"] };
    if (s.startsWith("hafen")) {
      return location.hash.length > 1
        ? { name: "Hafenseite", rundgang: "hafen", fragen: ["hafenseite", "bewuchstafel", "intensitaet", "messwerte", "beispieldaten"] }
        : { name: "Hafenseiten", rundgang: "hafen", fragen: ["hafenseite", "hafen-waehlen", "bewuchstafel", "beispieldaten"] };
    }
    return { name: "Atlas", rundgang: "atlas", fragen: ["bewuchsdruck", "kernfrage", "rangliste", "gewichtung", "ausgeschlossen", "sprache"] };
  }

  function fragenKnoepfe(box) {
    box.querySelectorAll("[data-frage]").forEach((b) =>
      b.addEventListener("click", () => {
        const e = HILFE.find((x) => x.id === b.dataset.frage);
        nachricht("user", esc(e.frage));
        antwortZeigen(e, suchen(e.frage).filter((x) => x.e.id !== e.id).slice(0, 3).map((x) => x.e));
      })
    );
  }

  // Rundgang und Fragen zum aktuellen Bereich oben, alle anderen Rundgänge eingeklappt darunter.
  function hierZeigen() {
    const box = $(".as-hier");
    if (!box) return;
    const h = hier();
    const t = RUNDGAENGE.find((r) => r.id === h.rundgang && erlaubt(r.rolle));
    box.innerHTML = `
      <div class="as-titel">Hier: ${esc(h.name)}</div>
      ${t ? `<button type="button" class="btn as-start" data-rundgang="${esc(t.id)}">Rundgang starten: ${esc(t.titel)}</button>` : ""}
      <div class="presets">${startfragen().map((e) => `<button type="button" class="btn-ghost" data-frage="${esc(e.id)}">${esc(e.frage)}</button>`).join("")}</div>`;
    fragenKnoepfe(box);
    const andere = RUNDGAENGE.filter((r) => erlaubt(r.rolle) && (!t || r.id !== t.id));
    const det = $(".as-andere");
    det.hidden = !andere.length;
    $(".presets", det).innerHTML = andere.map((r) => `<button type="button" class="btn-ghost" data-rundgang="${esc(r.id)}">${esc(r.titel)}</button>`).join("");
    $("#assistent").querySelectorAll("[data-rundgang]").forEach((b) => { b.onclick = () => rundgangStarten(b.dataset.rundgang); });
  }

  // Text einer Antwort zum Vorlesen: ohne Knöpfe und Auszeichnung.
  function vorlesbar(html) {
    const d = document.createElement("div");
    d.innerHTML = String(html).replace(/<button[\s\S]*?<\/button>/g, "");
    return d.textContent.replace(/\s+/g, " ").trim();
  }

  function nachricht(wer, html, merken = true) {
    if (wer !== "user") letzteAntwort = vorlesbar(html);
    if (merken) {
      zustand.log.push({ wer, html });
      zustand.log = zustand.log.slice(-40);
      sichern();
    }
    const li = document.createElement("li");
    li.className = "as-msg as-" + wer;
    li.innerHTML = `<span class="as-wer">${wer === "user" ? "Sie" : wer === "ki" ? "Assistent (KI)" : "Assistent"}</span><div class="as-text">${html}</div>`;
    $(".as-log").appendChild(li);
    li.scrollIntoView({ block: "nearest" });
    return $(".as-text", li);
  }

  function vorschlaege(eintraege) {
    const box = $(".as-vorschlaege");
    box.innerHTML = eintraege.length
      ? `<div class="as-titel">Passt vielleicht auch</div><div class="presets">${eintraege.map((e) => `<button type="button" class="btn-ghost" data-frage="${esc(e.id)}">${esc(e.frage)}</button>`).join("")}</div>`
      : "";
    fragenKnoepfe(box);
  }

  function startfragen() {
    return hier().fragen.map((id) => HILFE.find((e) => e.id === id)).filter((e) => e && erlaubt(e.rolle));
  }

  function begruessen() {
    nachricht("bot", sprachOk()
      ? "Hallo! Oben stehen der Rundgang und häufige Fragen zu dem Bereich, in dem Sie gerade sind. Sie können auch eine Frage eintippen oder auf das Mikrofon tippen und sprechen."
      : "Hallo! Oben stehen der Rundgang und häufige Fragen zu dem Bereich, in dem Sie gerade sind. Sie können auch einfach eine Frage eintippen.");
  }

  function antwortZeigen(e, aehnlich) {
    nachricht("bot", esc(e.antwort));
    vorschlaege(aehnlich);
  }

  /* ---------- Fragen beantworten ---------- */

  function seitenstand() {
    if (window.Atlas && typeof window.Atlas.kontext === "function") return window.Atlas.kontext();
    const main = document.querySelector("main");
    return main ? main.innerText.replace(/\n{2,}/g, "\n").slice(0, 2000) : "";
  }

  async function fragen(frage, zeigeFrage = true) {
    if (zeigeFrage) nachricht("user", esc(frage));
    const treffer = suchen(frage);
    // Gehört die Frage eindeutig zur Eingabe oder Datenbank und ist niemand angemeldet:
    // auf die Anmeldung verweisen und die Frage danach von selbst beantworten.
    const ohneRolle = suchen(frage, true)[0];
    const bester = treffer.length ? treffer[0].punkte : 0;
    if (ohneRolle && !erlaubt(ohneRolle.e.rolle) && ohneRolle.punkte >= Math.max(3, bester + 2)) {
      zustand.offeneFrage = frage;
      nachricht("bot", 'Das gehört zur Eingabe für Wissenschaftlerinnen und Wissenschaftler. Nach der Anmeldung beantworte ich Ihre Frage sofort. <button type="button" class="btn-ghost" data-aktion="anmelden">Jetzt anmelden</button>');
      vorschlaege(startfragen());
      return;
    }
    if (engine && !laeuft) return kiAntwort(frage, treffer.slice(0, 3).map((x) => x.e));
    if (treffer.length && treffer[0].punkte >= 2) {
      antwortZeigen(treffer[0].e, treffer.slice(1, 4).map((x) => x.e));
    } else {
      nachricht("bot", "Dazu habe ich keine passende Antwort gefunden. Versuchen Sie es mit anderen Worten, wählen Sie eine der Fragen unten, oder laden Sie unten das KI-Modell für freie Fragen.");
      vorschlaege(startfragen());
    }
  }

  async function kiAntwort(frage, hilfen) {
    laeuft = true;
    const body = nachricht("ki", "…", false);
    const system = `Du bist der Assistent des Antifouling-Atlas, eines Prototyps mit Beispieldaten. Die Person ist ${rolle() === "wissenschaft" ? "Wissenschaftlerin oder Wissenschaftler und darf Daten eingeben" : "öffentliche Nutzerin oder öffentlicher Nutzer"}. Sie ist auf der Seite „${document.title}“.
Regeln: Antworte auf Deutsch, kurz, höchstens fünf Sätze. Stütze dich nur auf HILFE und STAND. Erfinde keine Zahlen, Marken, Vorschriften oder Funktionen. Steht die Antwort nicht darin, sag das offen. Keine Rechtsberatung.

HILFE:
${hilfen.map((e) => `- ${e.frage} ${e.antwort}`).join("\n") || "(keine passenden Hilfetexte)"}

STAND:
${seitenstand().slice(0, 2500)}`;
    try {
      const stream = await engine.chat.completions.create({
        messages: [{ role: "system", content: system }, ...verlauf.slice(-4), { role: "user", content: frage }],
        stream: true, temperature: 0.3, max_tokens: 350,
      });
      let text = "";
      for await (const teil of stream) {
        text += (teil.choices[0] && teil.choices[0].delta && teil.choices[0].delta.content) || "";
        body.textContent = text || "…";
      }
      verlauf.push({ role: "user", content: frage }, { role: "assistant", content: text });
      letzteAntwort = text;
      zustand.log.push({ wer: "ki", html: esc(text) });
      sichern();
      vorschlaege(hilfen.slice(0, 3));
    } catch (e) {
      body.textContent = "Fehler bei der Antwort: " + (e && e.message ? e.message : e);
    } finally {
      laeuft = false;
    }
  }

  async function kannF16() {
    try {
      const a = await navigator.gpu.requestAdapter();
      return !!a && a.features.has("shader-f16");
    } catch (e) {
      return false;
    }
  }

  async function modellLaden() {
    const status = (t) => { $("#as-status").textContent = t; };
    if (laeuft) return;
    if (!("gpu" in navigator)) {
      status("Dieser Browser unterstützt kein WebGPU. Das Modell läuft in aktuellem Chrome oder Edge am Computer.");
      return;
    }
    const key = $("#as-modell").value;
    if (engine && geladen && geladen.m.key === key) return;
    laeuft = true;
    $("#as-laden").disabled = true;
    $("#as-fortschritt").hidden = false;
    try {
      status("Bibliothek wird geladen …");
      const webllm = await import(new URL("vendor/web-llm/index.js", location.href).href);
      const gewaehlt = MODELLE.find((m) => m.key === key);
      const liste = [];
      if (await kannF16()) liste.push({ m: gewaehlt, id: gewaehlt.f16, bits: 16 });
      liste.push({ m: gewaehlt, id: gewaehlt.f32, bits: 32 });
      MODELLE.filter((m) => m !== gewaehlt).forEach((m) => liste.push({ m, id: m.f32, bits: 32 }));
      let fehler = null;
      for (const v of liste) {
        if (engine) { try { await engine.unload(); } catch (e) { /* egal */ } engine = null; }
        try {
          if (fehler) status(`Das hat nicht geklappt, versuche ${v.m.label} (${v.bits} Bit) …`);
          engine = await webllm.CreateMLCEngine(v.id, {
            initProgressCallback: (r) => { $("#as-fortschritt").value = r.progress || 0; status(r.text || "Modell wird geladen …"); },
          });
          geladen = v;
          break;
        } catch (e) {
          console.warn("Modell " + v.id + ":", e);
          fehler = e;
          engine = null;
        }
      }
      if (!engine) throw fehler;
      $("#as-modell").value = geladen.m.key;
      status(`Bereit: ${geladen.m.label.split(" – ")[0]}, ${geladen.bits} Bit. Ab jetzt beantwortet das Modell Ihre Fragen.`);
    } catch (e) {
      const t = e && e.message ? e.message : String(e);
      status(/fetch|network/i.test(t) ? "Die Modelldateien ließen sich nicht herunterladen. Bitte die Internetverbindung prüfen." : "Kein Modell ließ sich starten (" + t + ").");
      engine = null;
    } finally {
      laeuft = false;
      $("#as-laden").disabled = false;
      $("#as-fortschritt").hidden = true;
    }
  }


  /* ---------- Sprache ---------- */

  // Vorab-Text für Whisper: Wörter, die im Atlas oft fallen.
  const VOKABULAR = "Antifouling-Atlas. Rundgang, weiter, zurück, wiederholen, beenden, stopp. Atlas, Hafenseite, Hafenseiten, Eingabe, Datenbank. Bewuchsdruck, Bewuchstafel, Biozid, biozidfrei, Freizeitboot, Berufsschifffahrt.";

  // Kölner Phonetik: gleich klingende deutsche Wörter bekommen denselben Code
  // („Warnemünde“ und „Wahrne Monday“ beide 376662). Für Hafennamen, die
  // die Erkennung falsch schreibt.
  function klang(wort) {
    const s = norm(wort).replace(/[^a-z]/g, "");
    let code = "";
    for (let i = 0; i < s.length; i++) {
      const c = s[i], v = s[i - 1] || "", n = s[i + 1] || "";
      if ("aeijouy".includes(c)) code += "0";
      else if (c === "h") continue;
      else if (c === "b") code += "1";
      else if (c === "p") code += n === "h" ? "3" : "1";
      else if (c === "d" || c === "t") code += n && "csz".includes(n) ? "8" : "2";
      else if ("fvw".includes(c)) code += "3";
      else if ("gkq".includes(c)) code += "4";
      else if (c === "c") code += i === 0 ? (n && "ahkloqrux".includes(n) ? "4" : "8") : (v && "sz".includes(v) ? "8" : n && "ahkoqux".includes(n) ? "4" : "8");
      else if (c === "x") code += v && "ckq".includes(v) ? "8" : "48";
      else if (c === "l") code += "5";
      else if (c === "m" || c === "n") code += "6";
      else if (c === "r") code += "7";
      else if (c === "s" || c === "z") code += "8";
    }
    let r = "";
    for (const ch of code) if (ch !== r[r.length - 1]) r += ch;
    return r ? r[0] + r.slice(1).replace(/0/g, "") : "";
  }

  function mikroZustand(z) {
    SP.zustand = z;
    document.querySelectorAll(".as-mikro").forEach((b) => {
      b.dataset.zustand = z;
      b.setAttribute("aria-pressed", SP.an ? "true" : "false");
    });
  }

  function sprachStatus(t) {
    SP.status = t;
    const zeile = $("#as-sprachzeile");
    if (zeile) zeile.hidden = !t;
    document.querySelectorAll(".as-sprachstatus").forEach((el) => { el.textContent = t; });
    const rg = $(".rg-sprache");
    if (rg) rg.hidden = !t;
  }

  function pegel(w, spricht) {
    document.querySelectorAll(".as-pegel i").forEach((i) => {
      i.style.width = Math.round(w * 100) + "%";
      i.classList.toggle("spricht", !!spricht);
    });
  }

  function vorlesen() {
    return zustand.vorlesen !== false && window.Sprache.kannSprechen();
  }

  function sprachKnopf() {
    if (SP.an) sprachAus("Spracheingabe aus. Mikrofon antippen, um wieder zu sprechen.");
    else sprachStart();
  }

  async function sprachStart() {
    if (!sprachOk()) return;
    SP.an = true;
    SP.fehl = 0;
    mikroZustand("laedt");
    sprachStatus("Spracherkennung wird geladen …");
    try {
      await window.Sprache.laden((w, phase) => sprachStatus(phase === "start"
        ? "Spracherkennung startet …"
        : `Spracherkennung wird geladen: ${Math.round(w * 100)} % (beim ersten Mal etwa 100 MB, danach aus dem Speicher des Browsers)`));
    } catch (e) {
      SP.an = false;
      mikroZustand("");
      sprachStatus(e.message === "ohne-modell"
        ? "Die Spracherkennung ist auf dieser Seite noch nicht eingerichtet."
        : "Die Spracherkennung ließ sich nicht starten (" + e.message + ").");
      return;
    }
    if (!SP.an) return;
    // „vorlesen“ nur anbieten, wenn der Rechner eine deutsche Stimme hat.
    const vl = $(".as-vorlesen");
    if (vl) vl.hidden = !window.Sprache.kannSprechen();
    zustand.sprache = true;
    sichern();
    sprachRunde(tour ? schrittText() : null);
  }

  function sprachAus(text) {
    SP.an = false;
    SP.token++;
    if (window.Sprache) { window.Sprache.abbrechen(); window.Sprache.mikrofonZu(); }
    zustand.sprache = false;
    sichern();
    mikroZustand("");
    sprachStatus(text || "");
  }

  // Eine Runde: vorlesen, zuhören, verstehen, ausführen. Danach beginnt die nächste.
  async function sprachRunde(text) {
    const t = ++SP.token;
    const S = window.Sprache;
    S.abbrechen();
    if (text && vorlesen()) {
      mikroZustand("spricht");
      sprachStatus("Ich lese vor … (Mikrofon antippen beendet die Spracheingabe)");
      await S.sprechen(text);
      if (t !== SP.token || !SP.an) return;
    }
    if (!SP.an) return;
    mikroZustand("hoert");
    sprachStatus(tour ? "Ich höre zu: „weiter“, „zurück“, „wiederholen“, „beenden“ oder eine Frage." : "Ich höre zu … Ihre Frage, oder z. B. „Hafen Kiel“, „Rundgang“, „Hafenseiten“, „stopp“.");
    let audio;
    try {
      audio = await S.aufnehmen({ onPegel: pegel, onSprache: () => { if (t === SP.token) sprachStatus("Ich höre …"); } });
    } catch (e) {
      if (t !== SP.token) return;
      if (e && e.message === "braucht-klick") return sprachAus("Mikrofon antippen, um per Sprache weiterzumachen.");
      return sprachAus(e && (e.name === "NotAllowedError" || e.name === "SecurityError")
        ? "Kein Zugriff aufs Mikrofon. Bitte im Browser für diese Seite erlauben."
        : "Kein Mikrofon gefunden.");
    }
    if (t !== SP.token || !SP.an) return;
    if (!audio) return sprachAus("Ich höre nicht mehr zu. Mikrofon antippen, um weiterzusprechen.");
    mikroZustand("denkt");
    sprachStatus("Einen Moment, ich verstehe …");
    let gehoert = "";
    try {
      gehoert = await S.erkennen(audio, VOKABULAR);
    } catch (e) {
      if (t === SP.token) sprachAus("Die Erkennung hat nicht geklappt (" + (e && e.message ? e.message : e) + ").");
      return;
    }
    if (t !== SP.token || !SP.an) return;
    if (!gehoert) {
      if (++SP.fehl >= 2) return sprachAus("Ich habe nichts verstanden. Mikrofon antippen, um es noch einmal zu versuchen.");
      return sprachRunde("Das habe ich nicht verstanden. Bitte noch einmal.");
    }
    SP.fehl = 0;
    console.debug("Spracheingabe:", gehoert);
    const b = befehl(gehoert);
    if (b) return b(gehoert);
    // Sonst ist es eine Frage.
    if (tour) beenden(true);
    if ($("#assistent").hidden) oeffnen(false);
    letzteAntwort = "";
    await fragen(gehoert);
    if (t !== SP.token || !SP.an) return;
    sprachRunde(letzteAntwort);
  }

  const ALLGEMEIN = new Set(["hafen", "stadthafen", "marina", "sporthafen", "schutzhafen", "suedhafen", "winterhafen", "nassauhafen",
    "city", "holstein", "ruegen", "stettiner", "haff", "schlei", "hohe", "duene", "peenestrom", "chiemsee", "muritz", "mueritz", "sylt", "meer"]);
  const FUELLWORT = new Set(["zur", "zum", "den", "die", "der", "das", "dem", "von", "nach", "auf", "und", "mir", "bitte", "hafen",
    "hafenseite", "seite", "zeig", "zeige", "oeffne", "waehle", "nimm", "geh", "gehe"]);
  const hafenTeile = (h) => norm(h.name).split(/[^a-z0-9]+/).filter((x) => x.length >= 4 && !ALLGEMEIN.has(x));

  function eindeutig(bewerten) {
    let best = null, punkte = 0, gleich = false;
    HAEFEN.forEach((h) => {
      const p = bewerten(h);
      if (p > punkte) { best = h; punkte = p; gleich = false; } else if (p && p === punkte) gleich = true;
    });
    return punkte && !gleich ? best : null;
  }

  // Erst exakt nach Namen, dann nach Klang (auch zwei Wörter zusammen: „Waren, Mönde“).
  function hafenFinden(t, nachKlang = false) {
    if (!nachKlang) {
      const gesagt = new Set(t.split(" "));
      return eindeutig((h) => hafenTeile(h).filter((x) => gesagt.has(x)).length);
    }
    // Kurze Codes (Kiel = 45) nur, wenn „Hafen“ fällt; sonst würde z. B. „blau“ zu Plau.
    const mindest = /\bhafen/.test(t) ? 2 : 3;
    const alle = t.split(" ");
    const w = alle.map((x) => x.replace(/^hafen(?=[a-z]{3})/, "")).filter((x) => x.length >= 2 && !FUELLWORT.has(x));
    const codes = new Set(w.map(klang));
    alle.forEach((x, i) => { if (alle[i + 1]) codes.add(klang(x + alle[i + 1])); });
    w.forEach((x, i) => { if (w[i + 1]) codes.add(klang(x + w[i + 1])); });
    // Längere Codes sind genauer und zählen mehr (Warnemünde vor Waren).
    return eindeutig((h) => hafenTeile(h).map(klang).filter((k) => k.length >= mindest && codes.has(k)).reduce((a, k) => a + k.length, 0));
  }

  function hafenOeffnen(h, t) {
    const s = seite();
    if (s.startsWith("index") && !/hafenseite/.test(t) && $("#hafen")) {
      const sel = $("#hafen");
      sel.value = h.id;
      sel.dispatchEvent(new Event("change"));
      const k = $("#kernfrage");
      setTimeout(() => {
        const kurz = k ? vorlesbar(k.innerHTML) : "";
        nachricht("bot", esc(`${h.name} ist gewählt.`));
        sprachRunde(`${h.name} ist gewählt. ${kurz}`);
      }, 300);
      return;
    }
    if (s.startsWith("hafen")) {
      location.hash = h.id;
      nachricht("bot", esc(`Hier ist die Hafenseite von ${h.name}.`));
      return sprachRunde(`Hier ist die Hafenseite von ${h.name}.`);
    }
    seiteOeffnen(`hafen.html#${h.id}`, `die Hafenseite von ${h.name}`);
  }

  async function seiteOeffnen(ziel, name) {
    const datei = ziel.split("#")[0];
    if (/^(eingabe|datenbank)/.test(datei) && !erlaubt("wissenschaft")) {
      nachricht("bot", 'Eingabe und Datenbank sind für Wissenschaftlerinnen und Wissenschaftler. Bitte zuerst anmelden. <button type="button" class="btn-ghost" data-aktion="anmelden">Jetzt anmelden</button>');
      return sprachRunde(letzteAntwort);
    }
    if (seite() === datei && !ziel.includes("#") && location.hash.length <= 1) {
      nachricht("bot", "Diese Seite ist schon offen.");
      return sprachRunde(letzteAntwort);
    }
    const t = SP.token;
    nachricht("bot", esc(`Ich öffne ${name}.`));
    if (vorlesen()) await window.Sprache.sprechen(`Ich öffne ${name}.`);
    if (t !== SP.token) return;
    zustand.sprache = true;
    zustand.offen = true;
    sichern();
    location.href = ziel;
  }

  // Kurze Sätze und Aufforderungen sind Befehle; alles andere ist eine Frage.
  function befehl(text) {
    const t = norm(text).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
    const n = t ? t.split(" ").length : 0;
    const kurz = n <= 4;
    const frage = /^(was|wie|wo|woher|wohin|warum|wieso|weshalb|welche[rsnm]?|wann|wer|wem|wen|kann|koennen|darf|gibt|muss|soll|ist|sind|bedeutet|heisst|brauche|habe)\b/.test(t);
    const auf = /^(oeffne|oeffnen|zeig|zeige|zeigen|geh|gehe|gehen|wechsle|wechsel|wechseln|waehle|waehlen|nimm|zur|zum|zu|starte|starten|start|bitte|jetzt|und|dann)\b/.test(t);
    if (tour && kurz) {
      if (/^(weiter|naechste[rsnm]?|vor|vorwaerts|ja|ok|okay|gut|klar|verstanden)\b/.test(t)) {
        return () => {
          if (schritt >= tour.schritte.length - 1) return beenden();
          weiter(1);
        };
      }
      if (/^(zurueck|vorherige[rsnm]?)\b/.test(t)) return () => (schritt > 0 ? weiter(-1) : sprachRunde("Das ist der erste Schritt."));
      if (/^(wiederhole|wiederholen|nochmal|noch mal|nochmals|wie bitte)\b/.test(t)) return () => sprachRunde(schrittText());
      if (/^(beenden|beende|stopp|stop|ende|abbrechen|schluss|fertig|aus|tschuess|danke)\b/.test(t)) return () => beenden();
    }
    if (kurz && /^(stopp|stop|ende|beenden|aufhoeren|hoer auf|danke|vielen dank|tschuess|ruhe|schluss|aus|nichts)\b/.test(t)) {
      return (txt) => {
        nachricht("user", esc(txt));
        sprachAus("Spracheingabe aus. Mikrofon antippen, um wieder zu sprechen.");
        if (vorlesen()) window.Sprache.sprechen("Gern.");
      };
    }
    if (frage || !(kurz || auf)) return null;
    const zeigen = (txt) => nachricht("user", esc(txt));
    if (/\b(rundgang|fuehrung|tour)\b/.test(t)) {
      return (txt) => {
        zeigen(txt);
        const h = hier();
        if (RUNDGAENGE.find((r) => r.id === h.rundgang && erlaubt(r.rolle))) rundgangStarten(h.rundgang);
        else { nachricht("bot", "Für diesen Bereich gibt es keinen Rundgang."); sprachRunde(letzteAntwort); }
      };
    }
    const h = hafenFinden(t);
    if (h) return (txt) => { zeigen(txt); hafenOeffnen(h, t); };
    const ziele = [
      [/\b(atlas|karte|startseite|bewertung)\b/, "index.html", "den Atlas"],
      [/\b(hafenseite|hafenseiten|haefen|hafenliste)\b/, "hafen.html", "die Hafenseiten"],
      [/\b(eingabe|eingeben|formular)\b/, "eingabe.html", "die Eingabe"],
      [/\b(datenbank|tabelle|tabellen)\b/, "datenbank.html", "die Datenbank"],
      [/\b(anleitung|video|tutorial)\b/, "anleitung.html", "die Anleitung"],
    ];
    for (const [re, ziel, name] of ziele) if (re.test(t)) return (txt) => { zeigen(txt); seiteOeffnen(ziel, name); };
    if (seite().startsWith("index") && $("#profil-freizeit")) {
      const profil = /\b(freizeit|freizeitboot|sportboot|segelboot|motorboot)\b/.test(t) ? "freizeit" : /\b(beruf|berufsschifffahrt|berufsschiff|frachter|schiff)\b/.test(t) ? "beruf" : null;
      if (profil) {
        return (txt) => {
          zeigen(txt);
          $("#profil-" + profil).click();
          nachricht("bot", profil === "beruf" ? "Berufsschifffahrt ist gewählt." : "Freizeitboot ist gewählt.");
          sprachRunde(letzteAntwort);
        };
      }
    }
    const hk = hafenFinden(t, true);
    if (hk) return (txt) => { zeigen(txt); hafenOeffnen(hk, t); };
    return null;
  }

  /* ---------- Rundgänge ---------- */

  let tour = null;
  let schritt = 0;
  let zielEl = null;

  function sichtbar(el) {
    return el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  }

  async function warteAuf(sel, ms = 6000) {
    const ende = Date.now() + ms;
    while (Date.now() < ende) {
      const el = document.querySelector(sel);
      if (sichtbar(el)) return el;
      await pause(120);
    }
    return null;
  }

  function rundgangStarten(id) {
    const t = RUNDGAENGE.find((r) => r.id === id);
    if (!t || !erlaubt(t.rolle)) return;
    const [ziel, hash] = t.seite.split("#");
    if (seite() !== ziel) {
      location.href = `${ziel}?rundgang=${encodeURIComponent(id)}${hash ? "#" + hash : ""}`;
      return;
    }
    if (hash && !(t.jeder_hafen && location.hash.length > 1) && location.hash.slice(1) !== hash) location.hash = hash;
    $("#assistent").hidden = true;
    $("#assistent-knopf").setAttribute("aria-expanded", "false");
    tour = t;
    schritt = 0;
    overlay();
    zeigeSchritt();
  }

  function overlay() {
    if ($("#rg-rahmen")) return;
    const rahmen = document.createElement("div");
    rahmen.id = "rg-rahmen";
    rahmen.className = "rg-rahmen no-print";
    const box = document.createElement("div");
    box.id = "rg-box";
    box.className = "rg-box no-print";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-live", "polite");
    document.body.append(rahmen, box);
    window.addEventListener("scroll", platzieren, { passive: true });
    window.addEventListener("resize", platzieren);
    document.addEventListener("keydown", tasten);
  }

  function tasten(e) {
    if (!tour) return;
    if (e.key === "Escape") beenden();
    else if (e.key === "ArrowRight") weiter(1);
    else if (e.key === "ArrowLeft") weiter(-1);
  }

  async function zeigeSchritt() {
    const s = tour.schritte[schritt];
    $("#rg-box").innerHTML = `<p class="hint">Einen Moment …</p>`;
    if (s.klick) {
      const k = document.querySelector(s.klick);
      if (k) k.click();
    }
    zielEl = await warteAuf(s.ziel);
    if (!tour) return;
    if (!zielEl) {
      // Element gibt es hier nicht (z. B. keine Ausschlüsse): Schritt überspringen.
      if (schritt < tour.schritte.length - 1) { schritt++; return zeigeSchritt(); }
      return beenden();
    }
    zielEl.scrollIntoView({ block: "center", behavior: ruhig ? "auto" : "smooth" });
    await pause(ruhig ? 0 : 380);
    const n = tour.schritte.length;
    $("#rg-box").innerHTML = `
      <div class="rg-kopf"><span class="as-titel">${esc(tour.titel)} · Schritt ${schritt + 1} von ${n}</span>
        <button type="button" class="as-zu" id="rg-ende" aria-label="Rundgang beenden">×</button></div>
      <h3>${esc(s.titel)}</h3>
      <p>${esc(s.text)}</p>
      <div class="aktionen">
        ${schritt > 0 ? `<button type="button" class="btn-ghost" id="rg-zurueck">Zurück</button>` : ""}
        <button type="button" class="btn" id="rg-weiter">${schritt < n - 1 ? "Weiter" : "Fertig"}</button>
        <button type="button" class="btn-ghost" id="rg-frage">Frage dazu</button>
        ${sprachOk() ? `<button type="button" class="as-mikro" id="rg-mikro" aria-pressed="${SP.an}" aria-label="Rundgang per Sprache steuern" title="Per Sprache: „weiter“, „zurück“, „beenden“">${MIKRO}</button>` : ""}
      </div>
      ${sprachOk() ? `<p class="rg-sprache" ${SP.an ? "" : "hidden"}><span class="as-pegel" aria-hidden="true"><i></i></span><span class="as-sprachstatus">${esc(SP.status)}</span></p>` : ""}`;
    $("#rg-ende").addEventListener("click", beenden);
    $("#rg-weiter").addEventListener("click", () => weiter(1));
    const z = $("#rg-zurueck");
    if (z) z.addEventListener("click", () => weiter(-1));
    $("#rg-frage").addEventListener("click", () => {
      beenden();
      oeffnen();
      $("#as-frage").value = s.titel + ": ";
      $("#as-frage").focus();
    });
    if (sprachOk()) $("#rg-mikro").addEventListener("click", sprachKnopf);
    mikroZustand(SP.zustand);
    platzieren();
    $("#rg-weiter").focus();
    if (SP.an) sprachRunde(schrittText());
  }

  function schrittText() {
    const s = tour && tour.schritte[schritt];
    return s ? `${s.titel}. ${s.text}` : "";
  }

  function weiter(d) {
    const neu = schritt + d;
    if (neu < 0) return;
    if (neu >= tour.schritte.length) return beenden();
    schritt = neu;
    zeigeSchritt();
  }

  function platzieren() {
    if (!tour || !zielEl) return;
    const r = zielEl.getBoundingClientRect();
    const rahmen = $("#rg-rahmen");
    const pad = 6;
    Object.assign(rahmen.style, {
      top: r.top - pad + "px", left: r.left - pad + "px",
      width: r.width + 2 * pad + "px", height: r.height + 2 * pad + "px",
    });
    const box = $("#rg-box");
    const bw = box.offsetWidth, bh = box.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    if (vw < 600) {
      Object.assign(box.style, { left: "", top: "", right: "", bottom: "" });
      box.classList.add("unten");
      return;
    }
    box.classList.remove("unten");
    let top = r.bottom + 14;
    if (top + bh > vh - 12) top = Math.max(12, r.top - bh - 14);
    if (top + bh > vh - 12) top = vh - bh - 12;
    let left = Math.min(Math.max(12, r.left), vw - bw - 12);
    Object.assign(box.style, { top: top + "px", left: left + "px", right: "", bottom: "" });
  }

  function beenden(leise = false) {
    const lief = !!tour;
    tour = null;
    zielEl = null;
    const r = $("#rg-rahmen"), b = $("#rg-box");
    if (r) r.remove();
    if (b) b.remove();
    window.removeEventListener("scroll", platzieren);
    window.removeEventListener("resize", platzieren);
    document.removeEventListener("keydown", tasten);
    // Läuft die Spracheingabe, geht es im Fenster weiter.
    if (SP.an && lief) {
      oeffnen(false);
      if (!leise) sprachRunde("Rundgang beendet. Was möchten Sie wissen?");
    }
  }

  /* ---------- Start ---------- */

  async function start() {
    try {
      const [h, r] = await Promise.all([
        fetch("data/hilfe.json?v=4").then((x) => x.json()),
        fetch("data/rundgaenge.json?v=2").then((x) => x.json()),
      ]);
      HILFE = h.eintraege;
      RUNDGAENGE = r.rundgaenge;
      fetch("data/haefen.json").then((x) => x.json()).then((d) => { HAEFEN = d.haefen || []; }).catch(() => {});
    } catch (e) {
      console.warn("Assistent:", e);
    }
    aufbauen();
    if (zustand.offen) oeffnen(!zustand.sprache);
    // Kam man per Sprache hierher, geht es per Sprache weiter, sofern der Browser
    // das Mikrofon ohne neuen Klick freigibt; sonst genügt ein Tipp aufs Mikrofon.
    if (zustand.sprache && sprachOk() && !new URLSearchParams(location.search).get("rundgang")) {
      zustand.sprache = false;
      sichern();
      oeffnen(false);
      sprachStart();
    }
    // Nach der Anmeldung: die Frage beantworten, die vorher an der Anmeldung hing.
    if (zustand.offeneFrage && erlaubt("wissenschaft")) {
      const f = zustand.offeneFrage;
      zustand.offeneFrage = null;
      oeffnen();
      nachricht("bot", `Sie sind angemeldet. Hier die Antwort auf Ihre Frage „${esc(f)}“:`);
      fragen(f, false);
    }
    const param = new URLSearchParams(location.search).get("rundgang");
    if (param) {
      try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) { /* egal */ }
      rundgangStarten(param);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
