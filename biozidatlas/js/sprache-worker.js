/* Spracherkennung im Hintergrund: Whisper Base (8 Bit) über transformers.js
   und ONNX Runtime (WebAssembly). Alle Dateien kommen von dieser Seite
   (modelle/), nichts geht an andere Server; das Audio verlässt den Rechner nicht. */
import { pipeline, env } from "../vendor/transformers/transformers.min.js";

const basis = new URL("../modelle/", import.meta.url).href;
env.allowRemoteModels = false;
env.allowLocalModels = true;
// Als Pfad, nicht als volle Adresse: sonst hält transformers.js 4.3 lokale
// Dateien wie preprocessor_config.json für nicht vorhanden.
env.localModelPath = new URL(basis).pathname;
env.useBrowserCache = typeof caches !== "undefined";
env.backends.onnx.wasm.wasmPaths = {
  mjs: basis + "ort/ort-wasm-simd-threaded.asyncify.mjs",
  wasm: basis + "ort/ort-wasm-simd-threaded.asyncify.wasm",
};

let asr = null;
let T = null; // Sondertokens von Whisper

async function laden() {
  if (asr) return;
  T = await (await fetch(basis + "whisper-base/added_tokens.json")).json();
  asr = await pipeline("automatic-speech-recognition", "whisper-base", {
    dtype: "q8",
    device: "wasm",
    progress_callback: (p) => {
      if (p.status === "progress_total") self.postMessage({ typ: "fortschritt", wert: (p.progress || 0) / 100 });
    },
  });
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
