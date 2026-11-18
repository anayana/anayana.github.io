/* Anleitungsvideo des Antifouling-Atlas: Drehbuch und Aufnahme.

   node video.mjs texte  <texte.json>               Sprechtexte für tools/video/sprechen.py
   node video.mjs aufnahme <dauer.json> <ordner>    Aufnahme der Seite (Bilder + Zeiten)

   Die Aufnahme läuft mit Playwright gegen BASIS (Standard: die veröffentlichte
   Seite). Jede Szene dauert so lange wie ihr gesprochener Text. Bilder kommen
   über das Chrome-Screencast-Protokoll in Full HD; tools/video/schnitt.py setzt
   daraus mit der Sprachspur das Video zusammen. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const BASIS = (process.env.BASIS || "https://anayana.github.io/biozidatlas/").replace(/\/?$/, "/");

/* text: Untertitel; sprich: was die Stimme sagt, falls abweichend (Aussprache). */
const SZENEN = [
  // ---------- Einstieg ----------
  { id: "titel", kapitel: "Einstieg", text: "Willkommen beim Antifouling-Atlas. Diese Anleitung zeigt in wenigen Minuten, wie der Atlas funktioniert: für Bootseigner, für alle Interessierten und für die Wissenschaft.",
    tun: async (h) => h.karte(`<h1>Antifouling-Atlas</h1><div>Anleitung zum Prototyp</div><div class="klein">Atlas · Hafenseiten · Assistent · Eingabe · Datenbank</div>`) },
  { id: "frage", text: "Der Atlas beantwortet eine Frage: Welcher Bewuchsschutz passt zu diesem Liegeplatz? Wichtig vorab: Es ist ein Prototyp. Bewuchsdruck, Kosten und Bewertungen sind Beispieldaten.",
    tun: async (h) => { await h.karte(null); await h.zeigen(".banner", { scroll: false }); } },
  { id: "karte", text: "Links die Karte. Die farbigen Punkte sind Beispielhäfen, die Farbe zeigt den Bewuchsdruck im Revier: grün gering, gelb mittel, rot hoch. Graue Punkte sind weitere Häfen aus OpenStreetMap.",
    sprich: "Links die Karte. Die farbigen Punkte sind Beispielhäfen, die Farbe zeigt den Bewuchsdruck im Revier: grün gering, gelb mittel, rot hoch. Graue Punkte sind weitere Häfen aus Open Street Map.",
    tun: async (h) => h.zeigen("#map", { scroll: false }) },

  // ---------- Eingaben ----------
  { id: "profil", kapitel: "Eingaben", text: "Zuerst wählen Sie: Freizeitboot oder Berufsschifffahrt. Davon hängen die Kriterien und die möglichen Optionen ab.",
    tun: async (h) => { await h.zeigen(".controls .seg"); await h.zeigerZu("label[for=profil-freizeit]"); } },
  { id: "hafen", text: "Dann den Liegeplatz: aus der Liste wählen oder in der Karte auf einen Punkt klicken. Wir nehmen Heiligenhafen an der Ostsee.",
    tun: async (h) => { await h.zeigen("#hafen"); await h.waehle("#hafen", "heiligenhafen"); } },
  { id: "boot", text: "Bootslänge, Bootstyp und Monate im Wasser verändern die Bewertung. Wer nur kurz im Wasser liegt, hat weniger Bewuchs.",
    tun: async (h) => { await h.zeigen("#boot-felder"); await h.zeigerZu("#monate"); } },
  { id: "wunsch", text: "Optionen wie Trockenliegeplatz, Bootslift oder Ultraschall bewertet der Atlas nur, wenn Sie sie hier ankreuzen.",
    tun: async (h) => h.zeigen("#wunsch") },

  // ---------- Steckbrief ----------
  { id: "steckbrief", kapitel: "Steckbrief und Messwerte", text: "Der Steckbrief zeigt Revier, Gewässer, Bewuchsdruck, typische Organismen, was es im Hafen gibt, und die letzte Ablesung der Bewuchstafel.",
    tun: async (h) => h.zeigen("#steckbrief .facts, #steckbrief") },
  { id: "kalender", text: "Der Bewuchskalender zeigt, in welchen Monaten im Revier am meisten wächst, und was jetzt zu tun ist.",
    tun: async (h) => h.zeigen("#kalender-box") },
  { id: "messwerte", text: "Darunter aktuelle Messwerte: Meerestemperatur, Salzgehalt und Chlorophyll von Copernicus Marine, täglich aktualisiert. An Flüssen und Seen kommt die Wassertemperatur von PEGELONLINE.",
    sprich: "Darunter aktuelle Messwerte: Meerestemperatur, Salzgehalt und Chlorophyll von Copernicus Marine, täglich aktualisiert. An Flüssen und Seen kommt die Wassertemperatur von Pegel Online.",
    tun: async (h) => h.zeigen("#live-box") },

  // ---------- Bewertung ----------
  { id: "kernfrage", kapitel: "Bewertung", text: "Oben in der Bewertung steht die wichtigste Frage: Geht es hier ohne Biozid? Die Kurzantwort leitet der Atlas aus der Rangliste ab.",
    tun: async (h) => h.zeigen("#kernfrage") },
  { id: "gewichtung", text: "Bei der Gewichtung legen Sie fest, was Ihnen wichtig ist: Umwelt, Wirksamkeit, Kosten, Aufwand, Gesundheit. Vorlagen setzen alle Gewichte auf einmal, Schieberegler einzeln.",
    tun: async (h) => { await h.zeigen("#vorlagen"); await h.klick("#vorlagen button:nth-child(2)"); } },
  { id: "untergrenze", text: "Die Umwelt behält dabei immer mindestens zwanzig Prozent des Gewichts.",
    tun: async (h) => h.zeigen("#gewichte") },
  { id: "rangliste", text: "Die Rangliste zeigt die passenden Optionen, die beste zuerst. Der farbige Balken zeigt, wie viel jedes Kriterium beiträgt; darunter stehen die Werte.",
    tun: async (h) => { await h.sicht("#rangliste"); await h.zeigen("#rangliste .rank-list > :first-child, #rangliste", { scroll: false }); } },
  { id: "robust", text: "Der Robustheitstest prüft, ob Platz eins vorn bleibt, wenn Gewichte und Werte zufällig schwanken.",
    tun: async (h) => h.zeigen("#rangliste .robust, #rangliste") },
  { id: "verfahren", text: "Das Verfahren lässt sich wechseln: gewichtete Summe, TOPSIS oder PROMETHEE. Das sind gängige Verfahren der multikriteriellen Entscheidungsanalyse.",
    sprich: "Das Verfahren lässt sich wechseln: gewichtete Summe, Topsis oder Prometé. Das sind gängige Verfahren der multikriteriellen Entscheidungsanalyse.",
    tun: async (h) => { await h.zeigen("#methode"); await h.waehle("#methode", "topsis"); await h.warte(1500); await h.waehle("#methode", "wsm"); } },
  { id: "kosten", text: "Kosten in fünf Jahren: Anschaffung und laufende Kosten über fünf Saisons, grob nach Bootsgröße umgerechnet.",
    tun: async (h) => h.zeigen("#kosten-card") },
  { id: "vergleich", text: "Der Methodenvergleich zeigt den Platz je Verfahren und den Konsens. Weicht ein Verfahren ab, ist das Feld markiert.",
    tun: async (h) => h.zeigen("#vergleich") },
  { id: "ausschluss", text: "Unter „Ausgeschlossen“ steht, was hier nicht in Frage kommt, und warum.",
    sprich: "Unter Ausgeschlossen steht, was hier nicht in Frage kommt, und warum.",
    tun: async (h) => h.zeigen("#ausschluss-card") },
  { id: "produkte", text: "Für biozidhaltige Anstriche nennt der Atlas zulässige Kategorien statt Produktnamen. Ob ein Produkt zugelassen ist, steht in den Datenbanken von BAuA und ECHA.",
    sprich: "Für biozidhaltige Anstriche nennt der Atlas zulässige Kategorien statt Produktnamen. Ob ein Produkt zugelassen ist, steht in den Datenbanken der Bundesanstalt für Arbeitsschutz und der Europäischen Chemikalienagentur.",
    tun: async (h) => h.zeigen("#produkte-card") },
  { id: "drucken", text: "Mit „Steckbrief drucken“ gibt es alles auf Papier oder als PDF.",
    sprich: "Mit Steckbrief drucken gibt es alles auf Papier oder als P D F.",
    tun: async (h) => h.zeigen("#drucken") },

  // ---------- Hafenseite ----------
  { id: "zur-hafenseite", kapitel: "Hafenseiten", text: "Über „Hafenseite“ geht es zu allen Informationen über den Hafen.",
    sprich: "Über Hafenseite geht es zu allen Informationen über den Hafen.",
    tun: async (h) => { await h.zeigen('#steckbrief a[href^="hafen.html"]'); await h.klick('#steckbrief a[href^="hafen.html"]', { neueSeite: true }); } },
  { id: "hafenkopf", text: "Jeder Hafen hat eine eigene Seite: Grunddaten, Bewuchskalender und Messwerte. Oben rechts geht es zurück in den Atlas.",
    tun: async (h) => h.zeigen(".seite-raster > .card:first-child, .seite-kopf", { scroll: false }) },
  { id: "intensitaet", text: "Die Bewuchsintensität stammt aus Bewuchstafeln: Platten, die im Hafen hängen und regelmäßig abgelesen werden. Ein Balken je Ablesung zeigt den Verlauf über die Saison.",
    tun: async (h) => h.zeigen(".verlauf, .kennzahl") },
  { id: "ablesungen", text: "Darunter jede Ablesung mit Datum, Anteil und Zusammensetzung. Ohne eigenes Foto steht ein Beispielfoto des häufigsten Organismus dabei, mit Urheber und Lizenz.",
    tun: async (h) => h.zeigen(".tafel-liste") },
  { id: "beitraege", text: "Fachleute ergänzen die Seite mit Beiträgen, immer im selben Aufbau: Überschrift, Unterzeile, Autor, Datum, Lizenz, Bild und Erklärung.",
    tun: async (h) => h.zeigen(".beitrag-liste > :first-child, .beitrag-liste") },
  { id: "uebersicht", text: "Die Übersicht listet alle Häfen. Mit der Suche finden Sie einen Hafen schnell.",
    tun: async (h) => { await h.geh("hafen.html"); await h.zeigen("#suche", { scroll: false }); await h.tippe("#suche", "Warne"); await h.warte(600); await h.zeigen("#treffer", { scroll: false }); } },

  // ---------- Assistent ----------
  { id: "muschel", kapitel: "Assistent", text: "Unten rechts sitzt auf jeder Seite der Assistent, die Muschel. Er beantwortet Fragen und führt durch Rundgänge.",
    tun: async (h) => { await h.geh("index.html"); await h.zeigen("#assistent-knopf", { scroll: false }); await h.klick("#assistent-knopf"); } },
  { id: "hier", text: "Oben bietet er gleich den Rundgang und häufige Fragen zu dem Bereich an, in dem Sie gerade sind.",
    tun: async (h) => h.zeigen("#assistent .as-hier", { scroll: false }) },
  { id: "eigene-frage", text: "Sie können auch eine eigene Frage eintippen, zum Beispiel: Wo kommen die Daten her?",
    tun: async (h) => { await h.rahmen(null); await h.tippe("#as-frage", "Wo kommen die Daten her?"); await h.taste("Enter"); await h.warte(500); await h.zeigen("#assistent .as-log > li:last-child", { scroll: false }); } },
  { id: "ki", text: "Die Antworten kommen aus festen Hilfetexten. Auf Wunsch lädt der Assistent ein offenes Sprachmodell, das freier formuliert. Es läuft im Browser; nichts wird verschickt.",
    tun: async (h) => h.zeigen("#assistent .as-ki", { scroll: false }) },
  { id: "mikro", text: "Mit dem Mikrofon geht das auch per Sprache. Auch die Spracherkennung läuft auf Ihrem Rechner; beim ersten Mal lädt sie etwa hundert Megabyte.",
    tun: async (h) => h.zeigen("#as-mikro", { scroll: false }) },

  // ---------- Anmeldung ----------
  { id: "anmelden", kapitel: "Anmeldung für Wissenschaft", text: "Eingabe und Datenbank sind für Wissenschaftlerinnen und Wissenschaftler. Dafür melden Sie sich oben an.",
    tun: async (h) => { await h.klick("#assistent .as-zu"); await h.zeigen("#anmelden", { scroll: false }); await h.klick("#anmelden"); await h.warte(400); await h.nachVorn(); } },
  { id: "zugang", text: "Demo-Zugang für die Wissenschaft: Benutzername „wissenschaft“, Passwort „atlas“. Beides steht auch im Anmeldefenster.",
    sprich: "Für den Prototyp gibt es einen Demo-Zugang. Benutzername: wissenschaft. Passwort: atlas. Beides steht auch im Anmeldefenster.",
    tun: async (h) => h.karte(`<h1>Zugang für Wissenschaft</h1><div>Demo-Zugang des Prototyps</div>
      <div class="zugang"><span>Benutzername</span><code>wissenschaft</code><span>Passwort</span><code>atlas</code></div>
      <div class="klein">Oben rechts auf „Anmelden“ klicken. Die Demo-Anmeldung schützt keine Daten.</div>`) },
  { id: "eintragen", text: "Benutzername und Passwort eintragen, anmelden. Im echten Betrieb meldet man sich mit dem Dienstkonto an.",
    tun: async (h) => {
      await h.karte(null);
      await h.zeigen("#anmelden-dialog .demo-hinweis", { scroll: false });
      await h.tippe("#anm-benutzer", "wissenschaft");
      await h.tippe("#anm-passwort", "atlas");
      await h.warte(500);
      await h.klick('#anmelden-form button[type="submit"]', { neueSeite: true });
    } },
  { id: "neu-im-menue", text: "Jetzt erscheinen oben zusätzlich Eingabe und Datenbank.",
    tun: async (h) => h.zeigen(".hauptnav", { scroll: false }) },

  // ---------- Eingabe ----------
  { id: "eingabe", kapitel: "Eingabe", text: "Die Eingabe erklärt oben den Ablauf: Formular ausfüllen, speichern oder einreichen, die Redaktion prüft und gibt frei, dann steht der Eintrag für alle auf der Hafenseite.",
    tun: async (h) => { await h.klick('.hauptnav a[href="eingabe.html"]', { neueSeite: true }); await h.zeigen(".ablauf", { scroll: false }); } },
  { id: "zwei-formulare", text: "Es gibt zwei Formulare: einen Beitrag für eine Hafenseite und die Ablesung einer Bewuchstafel.",
    tun: async (h) => h.zeigen(".tabs") },
  { id: "beitrag", text: "Beim Beitrag wählen Sie den Hafen aus der Liste und schreiben eine Überschrift. Rechts sehen Sie sofort die Vorschau, so wie es auf der Hafenseite aussehen wird.",
    tun: async (h) => {
      await h.rahmen(null);
      await h.tippe("#b-hafen", "Heiligenhafen");
      await h.tippe("#b-ueberschrift", "Seepocken am Steg B");
      await h.zeigen(".vorschau");
    } },
  { id: "metadaten", text: "Autorin oder Autor und Datum sind Pflicht. Quelle, Lizenz und Schlagworte helfen beim Einordnen und Finden.",
    tun: async (h) => { await h.zeigen("#b-meta"); await h.tippe("#b-autor", "Erika Muster"); } },
  { id: "erklaerung", text: "Dann die Erklärung. Ein Bild ist freiwillig; wer eins hochlädt, ergänzt Bildbeschreibung und Bildnachweis.",
    tun: async (h) => { await h.zeigen("#b-text"); await h.tippe("#b-text", "Ab Mitte Juni setzen sich am Steg B viele junge Seepocken fest."); await h.zeigen("#b-bildgruppe"); } },
  { id: "speichern", text: "„Im Browser speichern“ ist zum Ausprobieren, nur Sie sehen es. „Zur Prüfung einreichen“ legt einen Vorgang an; nach der Freigabe erscheint der Beitrag für alle.",
    sprich: "Im Browser speichern ist zum Ausprobieren, nur Sie sehen es. Zur Prüfung einreichen legt einen Vorgang an; nach der Freigabe erscheint der Beitrag für alle.",
    tun: async (h) => { await h.zeigen("#speichern"); await h.klick("#speichern"); await h.warte(500); await h.zeigen("#lokal-liste"); } },
  { id: "tafel", text: "Die Ablesung einer Bewuchstafel: Hafen, Tafel und Tiefe, wann ausgebracht und wann abgelesen, der bewachsene Anteil und woraus der Bewuchs besteht, zusammen hundert Prozent.",
    tun: async (h) => { await h.sicht(".tabs"); await h.klick("label[for=art-tafel]"); await h.warte(400); await h.zeigen("#form-tafel"); } },
  { id: "anteil", text: "Den Anteil schätzen Sie so: Tafel von oben fotografieren, gedanklich in zehn mal zehn Felder teilen und die bewachsenen Felder zählen.",
    tun: async (h) => h.zeigen("#t-bed") },

  // ---------- Datenbank ----------
  { id: "datenbank", kapitel: "Datenbank", text: "Die Datenbank zeigt alle Daten des Atlas in Tabellen. Oben steht, woher sie kommen: Redaktion, Eingaben, OpenStreetMap und Copernicus.",
    sprich: "Die Datenbank zeigt alle Daten des Atlas in Tabellen. Oben steht, woher sie kommen: Redaktion, Eingaben, Open Street Map und Copernicus.",
    tun: async (h) => { await h.klick('.hauptnav a[href="datenbank.html"]', { neueSeite: true }); await h.warte(1200); await h.zeigen(".fluss", { scroll: false }); } },
  { id: "tabellen", text: "Ein Klick auf eine Tabelle zeigt ihren Inhalt, zum Beispiel die Ablesungen der Bewuchstafeln.",
    tun: async (h) => { await h.zeigen("#tabellen"); await h.klick('#tabellen a[href="#bewuchstafeln"]'); await h.warte(500); await h.zeigen("#ansicht-card"); } },
  { id: "filter", text: "Mit dem Filter suchen Sie in den Zeilen, zum Beispiel nach einem Hafen.",
    tun: async (h) => { await h.zeigen("#filter"); await h.tippe("#filter", "heiligenhafen"); await h.warte(500); await h.zeigen("#ansicht-card"); } },

  // ---------- Schluss ----------
  { id: "abmelden", kapitel: "Abmelden", text: "Abmelden geht oben rechts. Danach sind Eingabe und Datenbank wieder ausgeblendet.",
    tun: async (h) => { await h.sicht("body"); await h.zeigen("#abmelden", { scroll: false }); } },
  { id: "ende", text: "Das war der Rundgang durch den Antifouling-Atlas. Bei Fragen hilft die Muschel unten rechts auf jeder Seite weiter.",
    tun: async (h) => h.karte(`<h1>Antifouling-Atlas</h1><div>Fragen? Die Muschel unten rechts hilft auf jeder Seite.</div>
      <div class="zugang"><span>Wissenschaft</span><code>wissenschaft</code><span>Passwort</span><code>atlas</code></div>
      <div class="klein">Prototyp mit Beispieldaten · anayana.github.io/biozidatlas</div>`) },
];

/* ---------- Texte für die Stimme ---------- */

if (process.argv[2] === "texte") {
  const ziel = process.argv[3] || "texte.json";
  // Aussprache: „Antifouling“ englisch, wie im Fach üblich.
  const sprechbar = (t) => t.replace(/Antifouling/g, "Antifauling");
  fs.writeFileSync(ziel, JSON.stringify(SZENEN.map((s) => ({ id: s.id, text: sprechbar(s.sprich || s.text) })), null, 1));
  console.log(`${SZENEN.length} Szenen -> ${ziel}`);
  process.exit(0);
}

/* ---------- Aufnahme ---------- */

if (process.argv[2] !== "aufnahme") {
  console.error("Aufruf: node video.mjs texte <texte.json> | aufnahme <dauer.json> <ordner>");
  process.exit(1);
}

// require statt import: findet Playwright auch über NODE_PATH oder ein node_modules weiter oben.
const { chromium } = createRequire(import.meta.url)("playwright");
const dauer = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const ordner = process.argv[4] || "aufnahme";
const bilder = path.join(ordner, "bilder");
fs.rmSync(ordner, { recursive: true, force: true });
fs.mkdirSync(bilder, { recursive: true });

// Echte Pixeldichte 1,5 (nicht emuliert): nur so liefert der Screencast 1920 × 1080 Bildpunkte
// bei einem Layout von 1280 × 720.
const browser = await chromium.launch({
  args: ["--force-device-scale-factor=1.5", "--lang=de-DE"],
  // Deutsch auch für Datumsfelder: die richten sich nach der Sprache des Prozesses.
  env: { ...process.env, LANG: "de_DE.UTF-8", LANGUAGE: "de_DE:de", LC_ALL: "de_DE.UTF-8" },
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: "de-DE", timezoneId: "Europe/Berlin" });
await ctx.addInitScript({ path: path.join(HIER, "overlay.js") });
// Frisches Profil: keine Anmeldung, kein Gespräch.
const page = await ctx.newPage();
page.setDefaultTimeout(15000);
const fehler = [];
page.on("pageerror", (e) => fehler.push(e.message));

let untertitel = "";
const nachLaden = async () => {
  await page.waitForLoadState("load");
  await page.waitForTimeout(900);
  await page.evaluate((t) => window.__tut && window.__tut.untertitel(t), untertitel);
};

const h = {
  async geh(p) { await page.goto(BASIS + p); await nachLaden(); },
  async warte(ms) { await page.waitForTimeout(ms); },
  async karte(html) { await page.evaluate((x) => window.__tut.karte(x), html); await page.waitForTimeout(400); },
  async rahmen(sel) { await page.evaluate((s) => window.__tut.rahmen(s), sel); },
  async nachVorn() { await page.evaluate(() => window.__tut.nachVorn()); },
  // Erstes sichtbares Element aus einer Liste von Selektoren (mit Komma getrennt, in Reihenfolge).
  async finde(sel) {
    for (const s of sel.split(/,(?![^(]*\))/).map((x) => x.trim())) {
      const l = page.locator(s).first();
      if ((await l.count()) && (await l.isVisible().catch(() => false))) return s;
    }
    return null;
  },
  async sicht(sel) {
    const s = await h.finde(sel);
    if (!s) return null;
    await page.locator(s).first().evaluate((e) => e.scrollIntoView({ block: "center", behavior: "smooth" }));
    await page.waitForTimeout(800);
    return s;
  },
  async zeigen(sel, { scroll = true } = {}) {
    const s = scroll ? await h.sicht(sel) : await h.finde(sel);
    if (!s) { console.warn("nicht gefunden:", sel); return; }
    await page.evaluate((x) => {
      // Rahmen um genau dieses Element: über eine Markierung, weil :text-is() kein CSS ist.
      document.querySelectorAll("[data-tut-ziel]").forEach((e) => e.removeAttribute("data-tut-ziel"));
    });
    await page.locator(s).first().evaluate((e) => e.setAttribute("data-tut-ziel", ""));
    await h.rahmen("[data-tut-ziel]");
  },
  async zeigerZu(sel) {
    const s = await h.finde(sel);
    if (!s) return null;
    const b = await page.locator(s).first().boundingBox();
    if (b) {
      await page.evaluate(([x, y]) => window.__tut.zeiger(x, y), [b.x + Math.min(b.width / 2, 60), b.y + b.height / 2]);
      await page.waitForTimeout(800);
    }
    return s;
  },
  async klick(sel, { neueSeite = false } = {}) {
    const s = (await h.zeigerZu(sel)) || sel;
    await page.evaluate(() => window.__tut.welle());
    await page.waitForTimeout(250);
    if (neueSeite) {
      await Promise.all([page.waitForEvent("load"), page.locator(s).first().click()]);
      await nachLaden();
    } else {
      await page.locator(s).first().click();
    }
  },
  async tippe(sel, text) {
    const s = (await h.zeigerZu(sel)) || sel;
    await page.locator(s).first().click();
    await page.locator(s).first().pressSequentially(text, { delay: 45 });
  },
  async taste(k) { await page.keyboard.press(k); },
  async waehle(sel, wert) {
    const s = (await h.zeigerZu(sel)) || sel;
    await page.evaluate(() => window.__tut.welle());
    await page.locator(s).first().selectOption(wert);
    await page.waitForTimeout(500);
  },
};

// Bilder per Screencast; höchstens 25 je Sekunde speichern.
const cdp = await ctx.newCDPSession(page);
const liste = [];
let letzte = 0;
let nr = 0;
cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
  cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  const t = metadata.timestamp;
  if (t - letzte < 0.04) return;
  letzte = t;
  const datei = `b${String(++nr).padStart(6, "0")}.jpg`;
  fs.writeFileSync(path.join(bilder, datei), Buffer.from(data, "base64"));
  liste.push({ datei, t });
});
const screencast = () => cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1920, maxHeight: 1080 }).catch(() => {});
page.on("load", screencast);

await page.goto(BASIS + "index.html");
await nachLaden();
await page.waitForTimeout(2500); // Karte und Daten laden
await screencast();
const start = Date.now() / 1000;
const zeiten = [];

for (const s of SZENEN) {
  const t0 = Date.now() / 1000;
  untertitel = s.text;
  await page.evaluate((t) => window.__tut.untertitel(t), s.text);
  try {
    await s.tun(h);
  } catch (e) {
    console.warn(`Szene ${s.id}:`, e.message.split("\n")[0]);
  }
  const soll = (dauer[s.id] || 3) + 0.6;
  const rest = soll - (Date.now() / 1000 - t0);
  if (rest > 0) await page.waitForTimeout(rest * 1000);
  zeiten.push({ id: s.id, titel: s.text, kapitel: s.kapitel || null, start: +(t0 - start).toFixed(3) });
  console.log(`${(t0 - start).toFixed(1).padStart(6)} s  ${s.id}`);
}
await page.evaluate(() => window.__tut.untertitel(""));
await page.waitForTimeout(800);
const ende = Date.now() / 1000;
await cdp.send("Page.stopScreencast").catch(() => {});
await browser.close();

fs.writeFileSync(path.join(ordner, "zeiten.json"), JSON.stringify({ start, ende, szenen: zeiten }, null, 1));
fs.writeFileSync(path.join(ordner, "bilder.json"), JSON.stringify(liste));
console.log(`${liste.length} Bilder, ${(ende - start).toFixed(1)} s`);
if (fehler.length) console.log("Fehler auf der Seite:", fehler.slice(0, 5));
