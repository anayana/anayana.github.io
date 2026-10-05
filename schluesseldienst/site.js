// Schlüsseldienst – kleine Helfer für alle Seiten:
// Hell/Dunkel umschalten, Menü auf dem Handy, Anzeige „Jetzt erreichbar“.
// Gespeichert wird nur die Hell/Dunkel-Wahl, und nur im eigenen Browser.
(function () {
  var html = document.documentElement;

  // ---------- Hell / Dunkel ----------
  // "auto": tagsüber (TAG_AB bis NACHT_AB Uhr) hell, sonst dunkel.
  var TAG_AB = 7, NACHT_AB = 19;
  var MODI = ["auto", "light", "dark"];
  var NAMEN = { auto: "Automatisch", light: "Hell", dark: "Dunkel" };

  function anwenden(modus) {
    var h = new Date().getHours();
    html.setAttribute("data-mode", modus);
    html.setAttribute("data-theme", modus === "auto" ? (h >= TAG_AB && h < NACHT_AB ? "light" : "dark") : modus);
    var knopf = document.querySelector(".theme");
    if (knopf) {
      knopf.querySelector(".lbl").textContent = NAMEN[modus];
      knopf.setAttribute("aria-label", "Darstellung: " + NAMEN[modus] + " – umschalten");
    }
  }

  function gespeichert() {
    try { return localStorage.getItem("theme") || "auto"; } catch (e) { return "auto"; }
  }

  var modus = gespeichert();
  anwenden(modus);
  var knopf = document.querySelector(".theme");
  if (knopf) knopf.addEventListener("click", function () {
    modus = MODI[(MODI.indexOf(modus) + 1) % MODI.length];
    try { modus === "auto" ? localStorage.removeItem("theme") : localStorage.setItem("theme", modus); } catch (e) {}
    anwenden(modus);
  });

  // ---------- Menü auf dem Handy ----------
  var menu = document.querySelector(".menu"), nav = document.querySelector(".nav");
  if (menu && nav) menu.addEventListener("click", function () {
    var auf = nav.classList.toggle("open");
    menu.setAttribute("aria-expanded", auf ? "true" : "false");
  });

  // ---------- Jetzt erreichbar? ----------
  // Gerechnet wird mit deutscher Zeit. Werktags ab ABENDS bis MORGENS Uhr,
  // Sa/So und Feiertage ganztägig.
  var ABENDS = 18, MORGENS = 8;
  // Landesfeiertage hier ergänzen: feste Tage als "MM-TT" (z. B. "01-06"),
  // bewegliche als Abstand zu Ostersonntag (z. B. 60 = Fronleichnam).
  var LAND_FEST = [], LAND_OSTERN = [];
  var BUND_FEST = ["01-01", "05-01", "10-03", "12-25", "12-26"];
  var BUND_OSTERN = [-2, 1, 39, 50];

  function ostersonntag(j) {
    var a = j % 19, b = Math.floor(j / 100), c = j % 100, d = Math.floor(b / 4), e = b % 4,
        f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
        h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
        l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
        x = h + l - 7 * m + 114;
    return Date.UTC(j, Math.floor(x / 31) - 1, (x % 31) + 1);
  }
  function zwei(n) { return (n < 10 ? "0" : "") + n; }
  function feiertag(j, m, t) {
    if (BUND_FEST.concat(LAND_FEST).indexOf(zwei(m) + "-" + zwei(t)) >= 0) return true;
    var ab = Math.round((Date.UTC(j, m - 1, t) - ostersonntag(j)) / 864e5);
    return BUND_OSTERN.concat(LAND_OSTERN).indexOf(ab) >= 0;
  }
  function erreichbar() {
    var p = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", year: "numeric", month: "numeric",
      day: "numeric", hour: "numeric", hourCycle: "h23", weekday: "short" })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    var wt = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday), h = +p.hour;
    return wt === 0 || wt === 6 || feiertag(+p.year, +p.month, +p.day) || h >= ABENDS || h < MORGENS;
  }

  function aktualisieren() {
    if (modus === "auto") anwenden("auto");
    if (!window.Intl) return;
    var offen = erreichbar();
    document.querySelectorAll(".state").forEach(function (el) {
      el.className = "state " + (offen ? "open" : "closed");
      el.textContent = offen ? "Jetzt erreichbar" : "Wieder erreichbar ab " + ABENDS + ":00 Uhr";
      el.hidden = false;
    });
  }
  aktualisieren();
  setInterval(aktualisieren, 60000);

  document.querySelectorAll(".year").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
