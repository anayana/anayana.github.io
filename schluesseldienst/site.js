// Schlüsseldienst – kleine Helfer für alle Seiten:
// Hell/Dunkel umschalten, Menü auf dem Handy, Anzeige „Jetzt erreichbar“.
// Gespeichert wird nur die Wahl „Dunkel“, und nur im eigenen Browser.
(function () {
  var html = document.documentElement;

  // ---------- Hell / Dunkel ----------
  // Standard ist hell. Wer auf „Dunkel“ schaltet, dem merkt sich der Browser das.
  function anwenden(thema) {
    html.setAttribute("data-theme", thema);
    var knopf = document.querySelector(".theme");
    if (knopf) {
      var ziel = thema === "dark" ? "Hell" : "Dunkel";
      knopf.querySelector(".lbl").textContent = ziel;
      knopf.setAttribute("aria-label", "Auf " + ziel + " umschalten");
    }
  }

  anwenden(html.getAttribute("data-theme") === "dark" ? "dark" : "light");
  var knopf = document.querySelector(".theme");
  if (knopf) knopf.addEventListener("click", function () {
    var neu = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    try { neu === "dark" ? localStorage.setItem("theme", "dark") : localStorage.removeItem("theme"); } catch (e) {}
    anwenden(neu);
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
  // Dazu die Feiertage in Baden-Württemberg: Heilige Drei Könige, Allerheiligen
  // (fest, "MM-TT") und Fronleichnam (60 Tage nach Ostersonntag).
  var LAND_FEST = ["01-06", "11-01"], LAND_OSTERN = [60];
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
