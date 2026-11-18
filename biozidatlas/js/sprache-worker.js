/* Spracherkennung im Hintergrund: Whisper Base (8 Bit) über transformers.js
   und ONNX Runtime (WebAssembly). Alle Dateien kommen von dieser Seite
   (modelle/), nichts geht an andere Server; das Audio verlässt den Rechner nicht.

   Die drei großen Dateien (Encoder, Decoder, WebAssembly, zusammen etwa
   100 MB) lädt dieser Worker selbst, genau einmal und mit Fortschritt, und legt
   sie in den Zwischenspeicher des Browsers (Cache API). transformers.js holt sie
   von dort; ohne das lädt es jede große Datei doppelt. Ab dem zweiten Besuch
   kommt alles aus dem Speicher. */
import { pipeline, env } from "../vendor/transformers/transformers.min.js";

const basis = new URL("../modelle/", import.meta.url).href;
const GROSS = [
  "whisper-base/onnx/encoder_model_quantized.onnx",
  "whisper-base/onnx/decoder_model_merged_quantized.onnx",
  "ort/ort-wasm-simd-threaded.asyncify.wasm",
];
const speicher = new Map(); // Adresse -> ArrayBuffer, nur bis das Modell läuft
let dauer = null; // Cache API, falls verfügbar

env.allowRemoteModels = false;
env.allowLocalModels = true;
// Als Pfad, nicht als volle Adresse: sonst hält transformers.js 4.3 lokale
// Dateien wie preprocessor_config.json für nicht vorhanden.
env.localModelPath = new URL(basis).pathname;
env.useBrowserCache = false;
env.useCustomCache = true;
env.customCache = {
  async match(key) {
    const url = new URL(String(key), self.location.href).href;
    const b = speicher.get(url);
    if (b) return new Response(b, { status: 200, headers: { "content-length": String(b.byteLength) } });
    if (dauer) {
      try { return (await dauer.match(url)) || undefined; } catch (e) { /* weiter ohne */ }
    }
    return undefined;
  },
  async put(key, response) {
    if (!dauer) return;
    try { await dauer.put(new URL(String(key), self.location.href).href, response); } catch (e) { /* Speicher voll: egal */ }
  },
};
env.backends.onnx.wasm.wasmPaths = {
  mjs: basis + "ort/ort-wasm-simd-threaded.asyncify.mjs",
  wasm: basis + "ort/ort-wasm-simd-threaded.asyncify.wasm",
};

let asr = null;
let T = null; // Sondertokens von Whisper

async function vorladen(manifest) {
  const name = "biozidatlas-sprache-" + String((manifest.whisper && manifest.whisper.revision) || "x").slice(0, 12);
  try {
    if (typeof caches !== "undefined") {
      dauer = await caches.open(name);
      for (const k of await caches.keys()) if (k.startsWith("biozidatlas-sprache-") && k !== name) caches.delete(k);
    }
  } catch (e) {
    dauer = null;
  }
  const groesse = Object.fromEntries((manifest.dateien || []).map((d) => [d.datei, d.bytes]));
  const gesamt = GROSS.reduce((a, f) => a + (groesse[f] || 0), 0) || 1;
  const stand = {};
  let zuletzt = -1;
  const melden = () => {
    const w = Math.min(1, Object.values(stand).reduce((a, b) => a + b, 0) / gesamt);
    if (w - zuletzt >= 0.01 || w === 1) { zuletzt = w; self.postMessage({ typ: "fortschritt", wert: w, phase: "laden" }); }
  };
  await Promise.all(GROSS.map(async (f) => {
    const url = basis + f;
    let r = null;
    if (dauer) {
      try { r = await dauer.match(url); } catch (e) { r = null; }
    }
    if (r) {
      const b = await r.arrayBuffer();
      speicher.set(url, b);
      stand[f] = b.byteLength;
      melden();
      return;
    }
    r = await fetch(url);
    if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
    const leser = r.body.getReader();
    const teile = [];
    let n = 0;
    for (;;) {
      const { done, value } = await leser.read();
      if (done) break;
      teile.push(value);
      n += value.length;
      stand[f] = n;
      melden();
    }
    const b = await new Blob(teile).arrayBuffer();
    speicher.set(url, b);
    if (dauer) {
      try { await dauer.put(url, new Response(b.slice(0), { headers: { "content-length": String(b.byteLength) } })); } catch (e) { /* Speicher voll */ }
    }
  }));
}

async function laden() {
  if (asr) return;
  const manifest = await (await fetch(basis + "manifest.json", { cache: "no-cache" })).json();
  await vorladen(manifest);
  T = await (await fetch(basis + "whisper-base/added_tokens.json")).json();
  self.postMessage({ typ: "fortschritt", wert: 1, phase: "start" });
  asr = await pipeline("automatic-speech-recognition", "whisper-base", { dtype: "q8", device: "wasm" });
  speicher.clear();
}

/* Mit prompt bekommt Whisper das Vokabular des Atlas vorab (wie ein vorheriger
   Satz). Das hilft bei kurzen Befehlen wie „Rundgang“ oder „beenden“ sehr. */
async function erkennen(audio, prompt) {
  if (!prompt) {
    const r = await asr(audio, { language: "german", task: "transcribe" });
    return (r && r.text) || "";
  }
  const inp = await asr.processor(audio);
  const vorab = asr.tokenizer.encode(" " + prompt, { add_special_tokens: false });
  const start = [T["<|startofprev|>"], ...vorab, T["<|startoftranscript|>"], T["<|de|>"], T["<|transcribe|>"], T["<|notimestamps|>"]];
  const out = await asr.model.generate({ inputs: inp.input_features, decoder_input_ids: start, max_new_tokens: 64 });
  const ids = out.tolist()[0].map(Number).slice(start.length);
  const text = asr.tokenizer.decode(ids, { skip_special_tokens: true });
  // Wiederholt Whisper nur den Prompt (passiert bei Rauschen), zählt das als nichts.
  const woerter = new Set(prompt.toLowerCase().split(/[^a-zäöüß]+/).filter((w) => w.length > 3));
  const treffer = text.toLowerCase().split(/[^a-zäöüß]+/).filter((w) => woerter.has(w)).length;
  return treffer >= 4 && (text.match(/,/g) || []).length >= 3 ? "" : text;
}

self.onmessage = async (e) => {
  const { typ, id, audio, prompt } = e.data || {};
  try {
    if (typ === "laden") {
      await laden();
      self.postMessage({ typ: "bereit", id });
    } else if (typ === "erkennen") {
      await laden();
      self.postMessage({ typ: "text", id, text: await erkennen(audio, prompt) });
    }
  } catch (err) {
    self.postMessage({ typ: "fehler", id, text: err && err.message ? err.message : String(err) });
  }
};
