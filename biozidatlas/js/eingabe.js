/* Eingabe: Formulare für Beiträge und Ablesungen von Bewuchstafeln. Die
   Felder entsprechen den Tabellen beitraege und bewuchstafeln (data/schema.sql).
   Im Prototyp wird im eigenen Browser gespeichert oder als Vorgang auf
   GitHub zur Prüfung eingereicht; nach der Freigabe
   übernimmt tools/eingabe_uebernehmen.py die Angaben in die Daten. */
(function () {
  "use strict";

  const A = window.Atlasdaten;
  const { esc, zahl } = A;
  const $ = (s) => document.querySelector(s);
  const REPO = "https://github.com/anayana/anayana.github.io";

  let D = null;
  const anzeigeZuId = {};
  const nameZuIds = {}; // kleingeschriebener Hafenname -> ids (für Eingabe nur des Namens)
  const bilder = { beitrag: null, tafel: null };
  let art = "beitrag";

  const heute = () => new Date().toISOString().slice(0, 10);

  /* ---------- Hafen-Auswahl ---------- */

  function hafenListe() {
    const alle = D.beispielhaefen.concat(D.osmhaefen);
    const gesehen = {};
    const opts = alle.map((h) => {
      let a = `${h.name} · ${D.reviere[h.revier].name}`;
      if (gesehen[a]) a += ` · ${h.id}`;
      gesehen[a] = true;
      anzeigeZuId[a] = h.id;
      const n = h.name.toLowerCase();
      (nameZuIds[n] = nameZuIds[n] || []).push(h.id);
      return `<option value="${esc(a)}"></option>`;
    });
    $("#hafenliste").innerHTML = opts.join("");
  }

  function anzeigeFuer(id) {
    return Object.keys(anzeigeZuId).find((k) => anzeigeZuId[k] === id) || "";
  }

  function hafenId(feld) {
    const v = $(feld).value.trim();
    if (anzeigeZuId[v]) return anzeigeZuId[v];
    if (D.hafen[v]) return v;
    // Nur der Name getippt, ohne aus der Liste zu wählen: gilt, wenn er eindeutig ist.
    const ids = nameZuIds[v.toLowerCase()] || [];
    const beispiel = ids.filter((id) => D.beispielhaefen.some((h) => h.id === id));
    if (ids.length === 1) return ids[0];
    if (beispiel.length === 1) return beispiel[0];
    return null;
  }

  /* ---------- Bilder: verkleinern, damit sie in den Browser-Speicher passen ---------- */

  function bildLaden(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error("Datei nicht lesbar"));
      r.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Kein Bild"));
        img.onload = () => {
          const f = Math.min(1, 900 / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * f);
          c.height = Math.round(img.height * f);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.82));
        };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }

  /* ---------- Organismen der Tafel ---------- */

  function orgZeile(name = "", anteil = "") {
    const div = document.createElement("div");
    div.className = "org-zeile";
    const n = document.querySelectorAll(".org-zeile").length + 1;
    div.innerHTML = `
      <label class="sr-only" for="org-name-${n}">Organismus</label>
      <select id="org-name-${n}" class="org-name">${A.ORGANISMEN.map((o) => `<option${o === name ? " selected" : ""}>${o}</option>`).join("")}</select>
      <label class="sr-only" for="org-anteil-${n}">Anteil in Prozent</label>
      <input id="org-anteil-${n}" class="org-anteil" type="number" min="0" max="100" step="5" value="${esc(anteil)}" placeholder="%">
      <button type="button" class="btn-ghost org-weg" aria-label="Zeile entfernen">entfernen</button>`;
    div.querySelector(".org-weg").addEventListener("click", () => { div.remove(); aktualisieren(); });
    div.querySelectorAll("select, input").forEach((el) => el.addEventListener("input", aktualisieren));
    $("#t-org").appendChild(div);
  }

  /* ---------- Datensätze aus den Formularen ---------- */

  function beitragAusFormular() {
    const schlagworte = $("#b-schlagworte").value.split(",").map((s) => s.trim()).filter(Boolean);
    return {
      id: "neu",
      hafen_id: hafenId("#b-hafen"),
      reihenfolge: 99,
      status: $("#b-status").value,
      ueberschrift: $("#b-ueberschrift").value.trim(),
      unterueberschrift: $("#b-unter").value.trim(),
      metadaten: {
        autor: $("#b-autor").value.trim(),
        datum: $("#b-datum").value,
        quelle: $("#b-quelle").value.trim(),
        lizenz: $("#b-lizenz").value,
        schlagworte,
      },
      bild: bilder.beitrag ? { datei: bilder.beitrag, alt: $("#b-alt").value.trim(), bildnachweis: $("#b-nachweis").value.trim() } : null,
      text: $("#b-text").value.trim(),
    };
  }

  function tafelAusFormular() {
    const organismen = Array.from(document.querySelectorAll(".org-zeile"))
      .map((z) => ({ name: z.querySelector(".org-name").value, anteil_prozent: Number(z.querySelector(".org-anteil").value) }))
      .filter((o) => o.anteil_prozent > 0);
    return {
      id: "neu",
      hafen_id: hafenId("#t-hafen"),
      tafel: $("#t-tafel").value.trim(),
      ausgebracht: $("#t-aus").value,
      abgelesen: $("#t-ab").value,
      tiefe_m: Number($("#t-tiefe").value),
      bedeckung_prozent: Number($("#t-bed").value),
      organismen,
      bild: bilder.tafel,
      melder: $("#t-melder").value.trim(),
      geprueft: false,
      bemerkung: $("#t-bem").value.trim(),
    };
  }

  // Dieselben Regeln prüft tools/eingabe_uebernehmen.py bei der Übernahme.
  function pruefen(d) {
    const f = [];
    if (!d.hafen_id) f.push("Bitte einen Hafen aus der Liste wählen.");
    if (art === "beitrag") {
      if (!d.ueberschrift) f.push("Die Überschrift fehlt.");
      if (!d.metadaten.autor) f.push("Autor/in fehlt.");
      if (!d.metadaten.datum) f.push("Das Datum fehlt.");
      if (d.text.length < 20) f.push("Die Erklärung ist zu kurz (mindestens 20 Zeichen).");
      if (d.bild && !d.bild.alt) f.push("Zum Bild fehlt die Bildbeschreibung.");
    } else {
      if (!d.tafel) f.push("Die Tafel-Nummer fehlt.");
      if (!d.ausgebracht || !d.abgelesen) f.push("Beide Daten (ausgebracht, abgelesen) sind nötig.");
      else if (d.abgelesen < d.ausgebracht) f.push("Abgelesen kann nicht vor dem Ausbringen liegen.");
      if (!(d.tiefe_m > 0 && d.tiefe_m <= 20)) f.push("Die Tiefe muss zwischen 0,1 und 20 m liegen.");
      if (!d.melder) f.push("Bitte angeben, wer abgelesen hat.");
      const summe = d.organismen.reduce((s, o) => s + o.anteil_prozent, 0);
      if (d.bedeckung_prozent > 0 && !d.organismen.length) f.push("Bitte angeben, woraus der Bewuchs besteht.");
      if (d.organismen.length && Math.abs(summe - 100) > 0.5) f.push(`Die Anteile ergeben ${zahl(summe)} % statt 100 %.`);
    }
    return f;
  }

  function aktueller() {
    return art === "beitrag" ? beitragAusFormular() : tafelAusFormular();
  }

  // Für Einreichung und Download ohne eingebettetes Bild; das wird angehängt.
  function ohneBild(d) {
    const c = JSON.parse(JSON.stringify(d));
    if (art === "beitrag" && c.bild) c.bild.datei = "angehängt";
    if (art === "tafel" && c.bild) c.bild = "angehängt";
    delete c.id;
    return c;
  }

  /* ---------- Vorschau ---------- */

  function aktualisieren() {
    const d = aktueller();
    $("#t-bed-wert").textContent = zahl($("#t-bed").value) + " %";
    if (art === "tafel") {
      const summe = d.organismen.reduce((s, o) => s + o.anteil_prozent, 0);
      $("#t-org-summe").textContent = d.organismen.length ? `Summe der Anteile: ${zahl(summe)} %` : "";
    }
    const h = d.hafen_id ? D.hafen[d.hafen_id] : null;
    const kopf = `<p class="hint">${h ? `Hafenseite <a href="hafen.html#${esc(h.id)}">${esc(h.name)}</a>` : "Noch kein Hafen gewählt"}</p>`;
    $("#vorschau").innerHTML = kopf + (art === "beitrag"
      ? A.renderBeitrag(d)
      : A.renderTafel({ ...d, id: "vorschau", tafel: d.tafel || "–", melder: d.melder || "–", abgelesen: d.abgelesen || heute(), ausgebracht: d.ausgebracht || heute() }));
  }

  function lokaleListe() {
    const l = A.lokal();
    const zeilen = []
      .concat(l.beitraege.map((b) => ({ art: "beitraege", id: b.id, hafen: b.hafen_id, titel: b.ueberschrift, wann: b.metadaten.datum })))
      .concat(l.tafeln.map((t) => ({ art: "tafeln", id: t.id, hafen: t.hafen_id, titel: `Tafel ${t.tafel}: ${zahl(t.bedeckung_prozent)} %`, wann: t.abgelesen })));
    if (!zeilen.length) {
      $("#lokal-liste").innerHTML = `<p class="hint">Noch nichts gespeichert. Gespeicherte Einträge erscheinen gekennzeichnet auf der Hafenseite, aber nur in diesem Browser.</p>`;
      return;
    }
    $("#lokal-liste").innerHTML = `<ul class="lokal-liste">${zeilen
      .map((z) => `<li>
        <span><b>${esc(z.titel)}</b><br><span class="example">${esc(D.hafen[z.hafen] ? D.hafen[z.hafen].name : z.hafen)} · ${esc(A.datum(z.wann))}</span></span>
        <span class="aktionen"><a class="btn-ghost" href="hafen.html#${esc(z.hafen)}">ansehen</a>
        <button type="button" class="btn-ghost" data-weg="${esc(z.art)}:${esc(z.id)}">löschen</button></span>
      </li>`)
      .join("")}</ul>`;
    $("#lokal-liste").querySelectorAll("[data-weg]").forEach((b) =>
      b.addEventListener("click", () => {
        const [liste, id] = b.dataset.weg.split(":");
        const l2 = A.lokal();
        l2[liste] = l2[liste].filter((x) => x.id !== id);
        A.lokalSpeichern(l2);
        lokaleListe();
      })
    );
  }

  /* ---------- Aktionen ---------- */

  function meldung(text) { $("#meldung").innerHTML = text; }

  function fehlerZeigen(f) {
    const el = $("#fehler");
    el.hidden = !f.length;
    el.innerHTML = f.length ? `<b>Bitte noch ergänzen:</b><ul>${f.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
    return !f.length;
  }

  function speichern() {
    const d = aktueller();
    if (!fehlerZeigen(pruefen(d))) return;
    d.id = "lokal-" + Date.now().toString(36);
    const l = A.lokal();
    (art === "beitrag" ? l.beitraege : l.tafeln).push(d);
    if (!A.lokalSpeichern(l)) {
      meldung("Der Browser-Speicher ist voll oder gesperrt. Ein kleineres Bild hilft, oder den Eintrag als JSON herunterladen.");
      return;
    }
    meldung(`Gespeichert. <a href="hafen.html#${esc(d.hafen_id)}">Auf der Hafenseite ansehen</a> (nur in diesem Browser sichtbar).`);
    lokaleListe();
  }

  function einreichen() {
    const d = aktueller();
    if (!fehlerZeigen(pruefen(d))) return;
    const h = D.hafen[d.hafen_id];
    const titel = art === "beitrag"
      ? `Atlas-Eingabe: Beitrag „${d.ueberschrift}“ (${h.name})`
      : `Atlas-Eingabe: Bewuchstafel ${d.tafel}, ${A.datum(d.abgelesen)} (${h.name})`;
    const hatBild = art === "beitrag" ? !!d.bild : !!d.bild;
    const body = [
      "<!-- atlas-eingabe -->",
      "Neue Eingabe für den Antifouling-Atlas, erstellt mit dem Eingabeformular.",
      "",
      `**Art:** ${art === "beitrag" ? "Beitrag" : "Ablesung einer Bewuchstafel"}`,
      `**Hafen:** ${h.name} (${h.id})`,
      "",
      hatBild ? "**Bild:** Bitte das Bild direkt unter diese Zeile ziehen (Drag-and-drop)." : "Kein Bild.",
      "",
      "Die Redaktion prüft die Eingabe und übernimmt sie mit dem Workflow „Antifouling-Atlas - Eingabe übernehmen“.",
      "",
      "```json",
      JSON.stringify({ art, datensatz: ohneBild(d) }, null, 2),
      "```",
    ].join("\n");
    const url = `${REPO}/issues/new?title=${encodeURIComponent(titel)}&body=${encodeURIComponent(body)}`;
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
    meldung(`Die Einreichung öffnet sich auf GitHub in einem neuen Tab. Dort auf „Create“ klicken${hatBild ? " und vorher das Bild hineinziehen" : ""}. Dafür ist ein GitHub-Konto nötig.`);
  }

  function leeren() {
    document.querySelectorAll(`#form-${art} input:not([type=range]):not([type=number]), #form-${art} textarea`).forEach((el) => { el.value = ""; });
    bilder[art] = null;
    if (art === "beitrag") { $("#b-datum").value = heute(); $("#b-bild-weg").hidden = true; }
    else { $("#t-org").innerHTML = ""; orgZeile(); $("#t-bed").value = 0; $("#t-bild-weg").hidden = true; }
    fehlerZeigen([]);
    meldung("");
    aktualisieren();
  }

  function artWaehlen(neu) {
    art = neu;
    $("#form-beitrag").hidden = art !== "beitrag";
    $("#form-tafel").hidden = art !== "tafel";
    $("#art-" + art).checked = true;
    try { history.replaceState(null, "", location.search + "#" + art); } catch (e) { /* egal */ }
    fehlerZeigen([]);
    aktualisieren();
  }

  function init() {
    hafenListe();
    $("#b-lizenz").innerHTML = A.LIZENZEN.map((l) => `<option>${esc(l)}</option>`).join("");
    $("#b-datum").value = heute();
    $("#t-ab").value = heute();
    orgZeile();

    const vorwahl = new URLSearchParams(location.search).get("hafen");
    if (vorwahl && D.hafen[vorwahl]) {
      $("#b-hafen").value = anzeigeFuer(vorwahl);
      $("#t-hafen").value = anzeigeFuer(vorwahl);
    }

    document.querySelectorAll("#form-beitrag input, #form-beitrag textarea, #form-beitrag select, #form-tafel input, #form-tafel textarea, #form-tafel select")
      .forEach((el) => el.addEventListener("input", aktualisieren));
    document.querySelectorAll('input[name="art"]').forEach((r) => r.addEventListener("change", () => artWaehlen(r.value)));
    $("#t-org-neu").addEventListener("click", () => { orgZeile(); aktualisieren(); });

    [["beitrag", "#b-bild", "#b-bild-weg"], ["tafel", "#t-bild", "#t-bild-weg"]].forEach(([k, inp, weg]) => {
      $(inp).addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          bilder[k] = await bildLaden(file);
          $(weg).hidden = false;
        } catch (err) {
          meldung("Das Bild ließ sich nicht lesen: " + esc(err.message));
        }
        aktualisieren();
      });
      $(weg).addEventListener("click", () => { bilder[k] = null; $(inp).value = ""; $(weg).hidden = true; aktualisieren(); });
    });

    $("#speichern").addEventListener("click", speichern);
    $("#einreichen").addEventListener("click", einreichen);
    $("#leeren").addEventListener("click", leeren);

    artWaehlen(location.hash === "#tafel" ? "tafel" : "beitrag");
    lokaleListe();
  }

  if (window.Zugang && !window.Zugang.darf("wissenschaft")) return;

  A.ladeAlles()
    .then((d) => { D = d; init(); })
    .catch((e) => { document.querySelector(".seite-inhalt").insertAdjacentHTML("afterbegin", `<p class="load-error-inline">Die Daten konnten nicht geladen werden: ${esc(e.message)}</p>`); });
})();
