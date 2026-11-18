/* Anmeldung und Rollen (Demo). Atlas und Hafenseiten sind für alle, Eingabe
   und Datenbank nur für angemeldete Wissenschaftlerinnen und Wissenschaftler.

   Auf GitHub Pages gibt es keinen Server: Die Anmeldung merkt sich die Rolle
   nur im Browser und blendet Bereiche ein oder aus. Sie schützt keine Daten,
   die Dateien bleiben technisch abrufbar. Im echten Betrieb übernimmt das eine
   Anmeldung über das Dienstkonto (z. B. Keycloak) mit Prüfung auf dem Server.

   Wird im <head> geladen, damit die Rolle schon vor dem ersten Zeichnen am
   <html>-Element steht und nichts kurz aufblitzt. */
(function (root) {
  "use strict";

  const KEY = "biozidatlas.rolle.v1";
  // Demo-Zugang; steht bewusst auch im Anmeldefenster.
  const DEMO = { benutzer: "wissenschaft", passwort: "atlas" };

  function rolle() {
    try {
      return localStorage.getItem(KEY) === "wissenschaft" ? "wissenschaft" : "oeffentlich";
    } catch (e) {
      return "oeffentlich";
    }
  }

  function setzen(r) {
    try {
      if (r === "wissenschaft") localStorage.setItem(KEY, r);
      else localStorage.removeItem(KEY);
    } catch (e) { /* ohne Speicher bleibt man öffentlich */ }
  }

  const darf = (r) => r !== "wissenschaft" || rolle() === "wissenschaft";

  document.documentElement.dataset.rolle = rolle();

  function dialog() {
    let d = document.getElementById("anmelden-dialog");
    if (d) return d;
    d = document.createElement("dialog");
    d.id = "anmelden-dialog";
    d.className = "anmelden";
    d.innerHTML = `
      <form method="dialog" id="anmelden-form">
        <h2>Anmelden für Wissenschaft</h2>
        <p class="hint">Mit der Anmeldung werden Eingabe und Datenbank sichtbar. Der Atlas und die Hafenseiten sind ohne Anmeldung für alle offen.</p>
        <div class="field"><label for="anm-benutzer">Benutzername</label><input id="anm-benutzer" autocomplete="username" required></div>
        <div class="field"><label for="anm-passwort">Passwort</label><input id="anm-passwort" type="password" autocomplete="current-password" required></div>
        <p class="fehler" id="anm-fehler" hidden>Benutzername oder Passwort stimmen nicht.</p>
        <p class="demo-hinweis"><b>Demo-Zugang:</b> Benutzername <code>${DEMO.benutzer}</code>, Passwort <code>${DEMO.passwort}</code>.
          Die Demo-Anmeldung schützt keine Daten; im echten Betrieb meldet man sich mit dem Dienstkonto an.</p>
        <div class="aktionen">
          <button type="submit" class="btn" value="ok">Anmelden</button>
          <button type="button" class="btn-ghost" id="anm-abbrechen">Abbrechen</button>
        </div>
      </form>`;
    document.body.appendChild(d);
    d.querySelector("#anm-abbrechen").addEventListener("click", () => d.close());
    d.querySelector("#anmelden-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const ok = d.querySelector("#anm-benutzer").value.trim() === DEMO.benutzer && d.querySelector("#anm-passwort").value === DEMO.passwort;
      if (!ok) {
        d.querySelector("#anm-fehler").hidden = false;
        return;
      }
      setzen("wissenschaft");
      location.reload();
    });
    return d;
  }

  function anmelden() {
    const d = dialog();
    d.querySelector("#anm-fehler").hidden = true;
    if (typeof d.showModal === "function") d.showModal();
    else d.setAttribute("open", "");
    d.querySelector("#anm-benutzer").focus();
  }

  function abmelden() {
    setzen("oeffentlich");
    if (document.body.dataset.nur === "wissenschaft") location.href = "index.html";
    else location.reload();
  }

  function kopf() {
    const nav = document.querySelector(".hauptnav");
    if (!nav) return;
    const span = document.createElement("span");
    span.className = "zugang";
    if (rolle() === "wissenschaft") {
      span.innerHTML = `<span class="chip">Wissenschaft</span><button type="button" class="btn-ghost" id="abmelden">Abmelden</button>`;
      span.querySelector("#abmelden").addEventListener("click", abmelden);
    } else {
      span.innerHTML = `<button type="button" class="btn-ghost" id="anmelden">Anmelden</button>`;
      span.querySelector("#anmelden").addEventListener("click", anmelden);
    }
    nav.appendChild(span);
  }

  // Geschützte Seite ohne passende Rolle: Inhalt durch einen Hinweis ersetzen.
  function sperre() {
    if (document.body.dataset.nur !== "wissenschaft" || darf("wissenschaft")) return;
    const main = document.querySelector("main");
    main.innerHTML = `
      <section class="card sperre">
        <h2>Nur für Wissenschaftlerinnen und Wissenschaftler</h2>
        <p>Dieser Bereich ist für Fachleute, die Daten eingeben und pflegen. Bitte melden Sie sich an.</p>
        <div class="aktionen"><button type="button" class="btn" id="sperre-anmelden">Anmelden</button><a class="btn-ghost" href="index.html">Zum Atlas</a></div>
      </section>`;
    main.querySelector("#sperre-anmelden").addEventListener("click", anmelden);
  }

  document.addEventListener("DOMContentLoaded", () => {
    kopf();
    sperre();
  });

  root.Zugang = { rolle, darf, anmelden, abmelden };
})(window);
