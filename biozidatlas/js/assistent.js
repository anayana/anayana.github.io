/* Assistent: ein Knopf unten rechts auf jeder Seite. Er beantwortet Fragen aus
   den Hilfetexten (data/hilfe.json), führt durch Rundgänge (data/rundgaenge.json)
   und kann auf Wunsch ein Sprachmodell im Browser laden (WebLLM), das dann
   frei formuliert, aber nur aus Hilfetexten und dem Stand der Seite antwortet.
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
  let engine = null;
  let geladen = null;
  let laeuft = false;
  const verlauf = [];

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
        <div class="as-rundgaenge"></div>
        <ol class="as-log" aria-live="polite"></ol>
        <div class="as-vorschlaege"></div>
      </div>
      <form class="as-form">
        <label for="as-frage" class="sr-only">Ihre Frage</label>
        <input id="as-frage" autocomplete="off" placeholder="Frage stellen, z. B. „Was bedeuten die Farben?“">
        <button type="submit" class="btn">Fragen</button>
      </form>
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
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.hidden && !tour) schliessen();
    });

    rundgangKnoepfe();
    begruessen();
  }

  function oeffnen() {
    $("#assistent").hidden = false;
    $("#assistent-knopf").setAttribute("aria-expanded", "true");
    $("#as-frage").focus();
  }

  function schliessen() {
    $("#assistent").hidden = true;
    $("#assistent-knopf").setAttribute("aria-expanded", "false");
    $("#assistent-knopf").focus();
  }

  function rundgangKnoepfe() {
    const liste = RUNDGAENGE.filter((r) => erlaubt(r.rolle));
    $(".as-rundgaenge").innerHTML = liste.length
      ? `<div class="as-titel">Rundgang starten</div><div class="presets">${liste
          .map((r) => `<button type="button" class="btn-ghost" data-rundgang="${esc(r.id)}">${esc(r.titel)}${r.rolle === "wissenschaft" ? " (Wissenschaft)" : ""}</button>`)
          .join("")}</div>`
      : "";
    $(".as-rundgaenge").querySelectorAll("[data-rundgang]").forEach((b) => b.addEventListener("click", () => rundgangStarten(b.dataset.rundgang)));
  }

  function nachricht(wer, html) {
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
      ? `<div class="as-titel">Häufige Fragen</div><div class="presets">${eintraege.map((e) => `<button type="button" class="btn-ghost" data-frage="${esc(e.id)}">${esc(e.frage)}</button>`).join("")}</div>`
      : "";
    box.querySelectorAll("[data-frage]").forEach((b) =>
      b.addEventListener("click", () => {
        const e = HILFE.find((x) => x.id === b.dataset.frage);
        nachricht("user", esc(e.frage));
        antwortZeigen(e, suchen(e.frage).filter((x) => x.e.id !== e.id).slice(0, 3).map((x) => x.e));
      })
    );
  }

  // Passende Fragen zur aktuellen Seite zuerst.
  function startfragen() {
    const s = seite();
    const ids = s.startsWith("eingabe") ? ["eingabe-beitrag", "eingabe-tafel", "anteil-schaetzen", "speichern-einreichen"]
      : s.startsWith("datenbank") ? ["datenbank", "freigeben", "beispieldaten"]
      : s.startsWith("hafen") ? ["hafenseite", "bewuchstafel", "intensitaet", "beispieldaten"]
      : ["bewuchsdruck", "kernfrage", "rangliste", "gewichtung"];
    return ids.map((id) => HILFE.find((e) => e.id === id)).filter((e) => e && erlaubt(e.rolle));
  }

  function begruessen() {
    const wiss = rolle() === "wissenschaft";
    nachricht("bot", wiss
      ? "Hallo! Ich erkläre den Atlas und zeige Ihnen, wie Sie Beiträge und Ablesungen von Bewuchstafeln eingeben. Starten Sie einen Rundgang oder stellen Sie eine Frage."
      : "Hallo! Fragen Sie mich alles zum Atlas und zu den Hafenseiten, oder starten Sie einen Rundgang.");
    vorschlaege(startfragen());
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

  async function fragen(frage) {
    nachricht("user", esc(frage));
    const treffer = suchen(frage);
    // Gehört die Frage zur Eingabe oder Datenbank, ohne dass jemand angemeldet ist: auf die Anmeldung verweisen.
    const ohneRolle = suchen(frage, true)[0];
    if (ohneRolle && !erlaubt(ohneRolle.e.rolle) && (!treffer.length || ohneRolle.punkte > treffer[0].punkte)) {
      nachricht("bot", "Das gehört zur Eingabe und Datenbank für Wissenschaftlerinnen und Wissenschaftler. Bitte oben rechts anmelden; danach erkläre ich es Ihnen Schritt für Schritt.");
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
    const body = nachricht("ki", "…");
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
    if (hash && location.hash.slice(1) !== hash) location.hash = hash;
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
      </div>`;
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
    platzieren();
    $("#rg-weiter").focus();
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

  function beenden() {
    tour = null;
    zielEl = null;
    const r = $("#rg-rahmen"), b = $("#rg-box");
    if (r) r.remove();
    if (b) b.remove();
    window.removeEventListener("scroll", platzieren);
    window.removeEventListener("resize", platzieren);
    document.removeEventListener("keydown", tasten);
  }

  /* ---------- Start ---------- */

  async function start() {
    try {
      const [h, r] = await Promise.all([
        fetch("data/hilfe.json?v=1").then((x) => x.json()),
        fetch("data/rundgaenge.json?v=1").then((x) => x.json()),
      ]);
      HILFE = h.eintraege;
      RUNDGAENGE = r.rundgaenge;
    } catch (e) {
      console.warn("Assistent:", e);
    }
    aufbauen();
    const param = new URLSearchParams(location.search).get("rundgang");
    if (param) {
      try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) { /* egal */ }
      rundgangStarten(param);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
