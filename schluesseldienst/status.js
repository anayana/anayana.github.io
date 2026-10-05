// Zeigt oben auf der Startseite, ob der Notdienst gerade erreichbar ist.
// Gerechnet wird mit deutscher Zeit, egal wo der Besucher ist. Nichts wird
// gespeichert oder verschickt – alles läuft im Browser.
(function () {
  // Erreichbar werktags ab ABENDS bis MORGENS Uhr, Sa/So und Feiertage ganztägig.
  var ABENDS = 18, MORGENS = 8;

  // Bundesweite Feiertage stehen fest. Landesfeiertage hier ergänzen:
  // feste Tage als "MM-TT" (z. B. "01-06" Heilige Drei Könige),
  // bewegliche als Abstand zu Ostersonntag (z. B. 60 = Fronleichnam).
  var LAND_FEST = [];
  var LAND_OSTERN = [];

  var BUND_FEST = ["01-01", "05-01", "10-03", "12-25", "12-26"];
  var BUND_OSTERN = [-2, 1, 39, 50]; // Karfreitag, Ostermontag, Himmelfahrt, Pfingstmontag

  function ostersonntag(j) {
    var a = j % 19, b = Math.floor(j / 100), c = j % 100, d = Math.floor(b / 4), e = b % 4,
        f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
        h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
        l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
        monat = Math.floor((h + l - 7 * m + 114) / 31), tag = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(j, monat - 1, tag);
  }

  function zwei(n) { return (n < 10 ? "0" : "") + n; }

  function istFeiertag(j, m, t) {
    var mt = zwei(m) + "-" + zwei(t);
    if (BUND_FEST.concat(LAND_FEST).indexOf(mt) >= 0) return true;
    var abstand = Math.round((Date.UTC(j, m - 1, t) - ostersonntag(j)) / 864e5);
    return BUND_OSTERN.concat(LAND_OSTERN).indexOf(abstand) >= 0;
  }

  function jetztInDeutschland() {
    var teile = {};
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin", year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", hourCycle: "h23", weekday: "short"
    }).formatToParts(new Date()).forEach(function (p) { teile[p.type] = p.value; });
    return {
      j: +teile.year, m: +teile.month, t: +teile.day, h: +teile.hour,
      wt: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(teile.weekday)
    };
  }

  function zeigen() {
    var el = document.getElementById("status");
    if (!el || !window.Intl) return;
    var n = jetztInDeutschland();
    var offen = n.wt === 0 || n.wt === 6 || istFeiertag(n.j, n.m, n.t) || n.h >= ABENDS || n.h < MORGENS;
    el.className = "status " + (offen ? "open" : "closed");
    document.getElementById("status-text").textContent = offen
      ? "Jetzt erreichbar – rufen Sie an"
      : "Gerade geschlossen – wieder erreichbar ab " + ABENDS + ":00 Uhr";
    el.hidden = false;
  }

  zeigen();
  setInterval(zeigen, 60000);

  var jahr = document.getElementById("year");
  if (jahr) jahr.textContent = new Date().getFullYear();
})();
