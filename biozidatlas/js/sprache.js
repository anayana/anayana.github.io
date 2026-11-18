/* Sprache für den Assistenten: Mikrofon aufnehmen, Sprechpausen erkennen,
   mit Whisper im Browser in Text umwandeln (js/sprache-worker.js) und Antworten
   mit einer deutschen Stimme des Rechners vorlesen. Es werden nur Stimmen
   genutzt, die auf dem Gerät laufen (localService); weder Audio noch Text
   gehen an andere Server. */
(function () {
  "use strict";

  const ZIELRATE = 16000;
  let worker = null;
  let bereit = null;
  let naechsteId = 1;
  const auftraege = new Map();
  let fortschritt = null;

  function verfuegbar() {
    return !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
      window.Worker && window.WebAssembly && (window.AudioContext || window.webkitAudioContext) &&
      (window.OfflineAudioContext || window.webkitOfflineAudioContext));
  }

  function auftrag(typ, daten = {}, transfer = []) {
    return new Promise((resolve, reject) => {
      const id = naechsteId++;
      auftraege.set(id, { resolve, reject });
      worker.postMessage({ typ, id, ...daten }, transfer);
    });
  }

  function laden(onFortschritt) {
    if (onFortschritt) fortschritt = onFortschritt;
    if (bereit) return bereit;
    bereit = (async () => {
      const m = await fetch(new URL("modelle/manifest.json", location.href), { cache: "no-cache" }).catch(() => null);
      if (!m || !m.ok) throw new Error("ohne-modell");
      worker = new Worker(new URL("js/sprache-worker.js?v=4", location.href), { type: "module" });
      worker.onmessage = (e) => {
        const d = e.data || {};
        if (d.typ === "fortschritt") { if (fortschritt) fortschritt(d.wert); return; }
        const a = auftraege.get(d.id);
        if (!a) return;
        auftraege.delete(d.id);
        if (d.typ === "fehler") a.reject(new Error(d.text));
        else a.resolve(d);
      };
      worker.onerror = (e) => {
        auftraege.forEach((a) => a.reject(new Error((e && e.message) || "Spracherkennung abgebrochen")));
        auftraege.clear();
      };
      await auftrag("laden");
    })();
    bereit.catch(() => {
      bereit = null;
      if (worker) { worker.terminate(); worker = null; }
    });
    return bereit;
  }

  // Whisper erfindet bei Rauschen gern Abspanntexte; die zählen als „nichts gesagt“.
  const ERFUNDEN = /untertitel|amara\.org|\bzdf\b|\bswr\b|\bwdr\b|\bard\b|copyright|abonnier|fürs zuschauen|für ihre aufmerksamkeit/i;

  function bereinigen(t) {
    const s = String(t || "").replace(/\[[^\]]*\]|\([^)]*\)|\*[^*]*\*|♪/g, " ").replace(/\s+/g, " ").trim();
    if (!s || ERFUNDEN.test(s) || !/[a-zäöüß]{2}/i.test(s)) return "";
    return s;
  }

  async function erkennen(audio, prompt) {
    await laden();
    const d = await auftrag("erkennen", { audio, prompt: prompt || "" }, [audio.buffer]);
    return bereinigen(d.text);
  }

  /* ---------- Aufnahme mit Pausenerkennung ---------- */

  let strom = null;
  let ctx = null;
  let aufnahme = null;

  async function mikrofon() {
    if (strom && strom.getAudioTracks().some((t) => t.readyState === "live")) return strom;
    strom = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    return strom;
  }

  function mikrofonZu() {
    if (aufnahme) aufnahme.abbrechen();
    if (strom) strom.getTracks().forEach((t) => t.stop());
    strom = null;
  }

  async function umrechnen(teile, rate) {
    const n = teile.reduce((a, t) => a + t.length, 0);
    const alle = new Float32Array(n);
    let o = 0;
    teile.forEach((t) => { alle.set(t, o); o += t.length; });
    if (rate === ZIELRATE) return alle;
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const off = new OAC(1, Math.ceil((n * ZIELRATE) / rate), ZIELRATE);
    const buf = off.createBuffer(1, n, rate);
    buf.getChannelData(0).set(alle);
    const src = off.createBufferSource();
    src.buffer = buf;
    src.connect(off.destination);
    src.start();
    const r = await off.startRendering();
    return new Float32Array(r.getChannelData(0));
  }

  /* Nimmt auf, bis nach dem Sprechen eine Pause kommt. Ergebnis: Float32Array
     mit 16 kHz, oder null, wenn niemand gesprochen hat oder abgebrochen wurde.
     opt: warten (s bis zum Sprechbeginn), max (s Sprechdauer), pause (s Stille
     bis zum Ende), onPegel(0..1, spricht), onSprache() beim Sprechbeginn. */
  function aufnehmen(opt = {}) {
    if (aufnahme) aufnahme.abbrechen();
    const warten = opt.warten || 9, maxDauer = opt.max || 15, pauseEnde = opt.pause || 1.2;
    return new Promise(async (resolve, reject) => {
      let s;
      try { s = await mikrofon(); } catch (e) { reject(e); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!ctx || ctx.state === "closed") ctx = new AC();
      if (ctx.state !== "running") {
        try { await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 400))]); } catch (e) { /* unten geprüft */ }
      }
      if (ctx.state !== "running") { reject(new Error("braucht-klick")); return; }

      const quelle = ctx.createMediaStreamSource(s);
      const proz = ctx.createScriptProcessor(4096, 1, 1);
      const null0 = ctx.createGain();
      null0.gain.value = 0;
      const rate = ctx.sampleRate;
      const block = 4096 / rate;
      const teile = [];
      let vorlauf = [];
      let spricht = false, laut = 0, leise = 0, zeit = 0, boden = 0.004, fertig = false;

      const notbremse = setTimeout(() => ende(spricht), (warten + maxDauer + 2) * 1000);
      function ende(mitAudio) {
        if (fertig) return;
        fertig = true;
        clearTimeout(notbremse);
        proz.onaudioprocess = null;
        try { quelle.disconnect(); proz.disconnect(); null0.disconnect(); } catch (e) { /* egal */ }
        if (aufnahme && aufnahme.proz === proz) aufnahme = null;
        if (opt.onPegel) opt.onPegel(0, false);
        if (!mitAudio || !teile.length) { resolve(null); return; }
        umrechnen(teile, rate).then(resolve, reject);
      }

      proz.onaudioprocess = (e) => {
        if (fertig) return;
        const d = e.inputBuffer.getChannelData(0);
        const kopie = new Float32Array(d);
        let sum = 0;
        for (let i = 0; i < d.length; i++) sum += d[i] * d[i];
        const rms = Math.sqrt(sum / d.length);
        zeit += block;
        const schwelle = Math.max(0.012, boden * 3);
        if (opt.onPegel) opt.onPegel(Math.min(1, rms / 0.12), spricht);
        if (!spricht) {
          vorlauf.push(kopie);
          if (vorlauf.length > 4) vorlauf.shift();
          if (rms > schwelle) {
            if (++laut >= 2) {
              spricht = true;
              zeit = 0;
              teile.push(...vorlauf);
              vorlauf = [];
              if (opt.onSprache) opt.onSprache();
            }
          } else {
            laut = 0;
            boden = rms < boden ? 0.5 * boden + 0.5 * rms : 0.97 * boden + 0.03 * rms;
          }
          if (!spricht && zeit > warten) ende(false);
        } else {
          teile.push(kopie);
          leise = rms < schwelle ? leise + block : 0;
          if (leise >= pauseEnde || zeit > maxDauer) ende(true);
        }
      };
      quelle.connect(proz);
      proz.connect(null0);
      null0.connect(ctx.destination);
      aufnahme = { proz, stopp: () => ende(spricht), abbrechen: () => ende(false) };
    });
  }

  /* ---------- Vorlesen ---------- */

  let stimme = null;

  function stimmeSuchen() {
    if (!("speechSynthesis" in window)) return null;
    const de = speechSynthesis.getVoices().filter((v) => /^de([-_]|$)/i.test(v.lang) && v.localService);
    stimme = de.find((v) => /^de[-_]DE/i.test(v.lang) && v.default) || de.find((v) => /^de[-_]DE/i.test(v.lang)) || de[0] || null;
    return stimme;
  }
  if ("speechSynthesis" in window) {
    stimmeSuchen();
    if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", stimmeSuchen);
  }

  function kannSprechen() {
    return !!(stimme || stimmeSuchen());
  }

  function sprechen(text) {
    return new Promise((resolve) => {
      if (!text || !kannSprechen()) { resolve(); return; }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = stimme;
      u.lang = stimme.lang;
      let fertig = false;
      const ende = () => { if (!fertig) { fertig = true; clearTimeout(t); resolve(); } };
      const t = setTimeout(ende, 3000 + text.length * 110);
      u.onend = ende;
      u.onerror = ende;
      speechSynthesis.speak(u);
    });
  }

  function still() {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }

  window.Sprache = {
    verfuegbar,
    laden,
    erkennen,
    aufnehmen,
    stopp: () => { if (aufnahme) aufnahme.stopp(); },
    abbrechen: () => { if (aufnahme) aufnahme.abbrechen(); still(); },
    mikrofonZu,
    sprechen,
    still,
    kannSprechen,
  };
})();
