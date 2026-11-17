/* Chatbot im Browser: ein kleines Sprachmodell läuft per WebGPU auf dem Rechner
   der Nutzerin (WebLLM). Es bekommt den aktuellen Stand der Seite als Text
   (window.Atlas.kontext) und erklärt ihn; gerechnet wird nur in app.js.
   Die Bibliothek wird erst beim Start geladen, die Modelldateien kommen beim
   ersten Start von Hugging Face und liegen danach im Browser-Cache. */

const MODELLE = [
  { id: "Ministral-3-3B-Instruct-2512-BF16-q4f16_1-MLC", label: "Ministral 3 (3B) von Mistral, Frankreich", groesse: "ca. 2 GB" },
  { id: "gemma-2-2b-it-q4f16_1-MLC", label: "Gemma 2 (2B) von Google", groesse: "ca. 1,5 GB" },
  { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 (1B) von Meta, schnell, schwächeres Deutsch", groesse: "ca. 0,7 GB" },
];

const VORSCHLAEGE = [
  "Warum liegt Platz 1 vorn?",
  "Was spricht hier gegen biozidhaltige Anstriche?",
  "Was sollte ich jetzt im Herbst tun?",
  "Warum wurden Optionen ausgeschlossen?",
];

const REGELN = `Du bist der Assistent des Antifouling-Atlas, eines Prototyps mit Beispieldaten. Du erklärst Bootsbesitzern die Bewertung, die auf der Seite gerade angezeigt wird.
Regeln:
- Antworte auf Deutsch, kurz und klar: höchstens fünf Sätze oder eine kurze Liste.
- Stütze dich nur auf die Angaben unter STAND. Erfinde keine Zahlen, Produkte, Marken, Vorschriften oder Quellen.
- Steht die Antwort nicht im STAND, sag das offen und verweise auf das Umweltbundesamt, die Zulassungsdatenbank der BAuA oder den Hafen.
- Gib keine Rechtsberatung und empfiehl keine Marken.
- Die Rangliste berechnet die Seite, nicht du. Wer andere Prioritäten hat, kann die Vorlagen oder Regler bei „Gewichtung“ nutzen.
- Weise darauf hin, dass es Beispieldaten sind, wenn jemand die Werte als Tatsache nehmen will.`;

const $ = (s) => document.querySelector(s);
let engine = null;
let geladenesModell = null;
let laeuft = false;
const verlauf = [];

function nachricht(rolle, text) {
  const li = document.createElement("li");
  li.className = "msg msg-" + rolle;
  const who = document.createElement("span");
  who.className = "msg-who";
  who.textContent = rolle === "user" ? "Sie" : rolle === "bot" ? "Assistent (KI)" : "Hinweis";
  const body = document.createElement("div");
  body.className = "msg-body";
  body.textContent = text;
  li.append(who, body);
  $("#chat-log").appendChild(li);
  li.scrollIntoView({ block: "nearest" });
  return body;
}

function status(text) {
  $("#chat-status").textContent = text;
}

async function starten() {
  if (laeuft) return;
  const modell = $("#chat-modell").value;
  if (engine && geladenesModell === modell) return;
  if (!("gpu" in navigator)) {
    status("Ihr Browser unterstützt WebGPU nicht. Bitte ein aktuelles Chrome oder Edge am Computer verwenden.");
    return;
  }
  laeuft = true;
  $("#chat-start").disabled = true;
  $("#chat-progress").hidden = false;
  try {
    status("Bibliothek wird geladen …");
    const webllm = await import("../vendor/web-llm/index.js");
    const fortschritt = (r) => {
      $("#chat-progress").value = r.progress || 0;
      status(r.text || "Modell wird geladen …");
    };
    if (engine) await engine.reload(modell);
    else engine = await webllm.CreateMLCEngine(modell, { initProgressCallback: fortschritt });
    geladenesModell = modell;
    $("#chat-form").hidden = false;
    $("#chat-vorschlaege").hidden = false;
    status("Bereit. Das Modell läuft auf Ihrem Rechner, nichts wird verschickt.");
    $("#chat-input").focus();
  } catch (e) {
    console.error(e);
    status("Das Modell ließ sich nicht starten: " + (e && e.message ? e.message : e) + ". Ein kleineres Modell oder ein anderer Browser hilft oft.");
    engine = null;
  } finally {
    laeuft = false;
    $("#chat-start").disabled = false;
    $("#chat-progress").hidden = true;
    $("#chat-start").textContent = engine ? "Modell wechseln" : "Chat starten";
  }
}

async function fragen(frage) {
  if (!engine || laeuft || !frage.trim()) return;
  laeuft = true;
  $("#chat-send").disabled = true;
  nachricht("user", frage);
  const body = nachricht("bot", "…");
  // Der Stand wird bei jeder Frage neu gelesen, weil sich die Auswahl geändert haben kann.
  const messages = [
    { role: "system", content: REGELN + "\n\nSTAND:\n" + (window.Atlas ? window.Atlas.kontext() : "") },
    ...verlauf.slice(-4),
    { role: "user", content: frage },
  ];
  let antwort = "";
  try {
    const stream = await engine.chat.completions.create({ messages, stream: true, temperature: 0.3, max_tokens: 400 });
    for await (const teil of stream) {
      antwort += (teil.choices[0] && teil.choices[0].delta && teil.choices[0].delta.content) || "";
      body.textContent = antwort || "…";
    }
    verlauf.push({ role: "user", content: frage }, { role: "assistant", content: antwort });
  } catch (e) {
    console.error(e);
    body.textContent = "Fehler bei der Antwort: " + (e && e.message ? e.message : e);
  } finally {
    laeuft = false;
    $("#chat-send").disabled = false;
  }
}

function init() {
  const sel = $("#chat-modell");
  if (!sel) return;
  sel.innerHTML = MODELLE.map((m) => `<option value="${m.id}">${m.label} – ${m.groesse}</option>`).join("");
  $("#chat-vorschlaege").innerHTML = VORSCHLAEGE.map((v) => `<button type="button" class="btn-ghost">${v}</button>`).join("");
  $("#chat-vorschlaege").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => fragen(b.textContent)));
  $("#chat-start").addEventListener("click", starten);
  $("#chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = $("#chat-input");
    const f = inp.value;
    inp.value = "";
    fragen(f);
  });
  if (!("gpu" in navigator)) {
    status("Hinweis: Ihr Browser unterstützt kein WebGPU. Der Chat läuft in aktuellem Chrome oder Edge am Computer.");
  }
}

init();
