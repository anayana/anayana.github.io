/* Live-Daten: aktuelle Wassertemperatur von PEGELONLINE (Wasserstraßen- und
   Schifffahrtsverwaltung des Bundes). Der Browser fragt die offene REST-API
   direkt ab; Ergebnis wird 15 Minuten in der Sitzung zwischengespeichert. */
(function (root) {
  "use strict";

  const URL =
    "https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations.json" +
    "?timeseries=WT&includeTimeseries=true&includeCurrentMeasurement=true";
  const CACHE_KEY = "biozidatlas.pegel.v1";
  const CACHE_MS = 15 * 60 * 1000;
  const STALE_MS = 6 * 60 * 60 * 1000;

  function readCache() {
    try {
      const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (c && Date.now() - c.fetched < CACHE_MS) return c;
    } catch (e) { /* kein Speicher verfügbar */ }
    return null;
  }

  function writeCache(c) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) { /* egal */ }
  }

  // Nur Stationen mit Koordinaten und einem plausiblen, aktuellen Messwert.
  function parse(json) {
    const out = [];
    (json || []).forEach((s) => {
      if (typeof s.latitude !== "number" || typeof s.longitude !== "number") return;
      const ts = (s.timeseries || []).find((t) => t.shortname === "WT");
      const m = ts && ts.currentMeasurement;
      if (!m || typeof m.value !== "number") return;
      if (m.value < -2 || m.value > 35) return;
      const time = Date.parse(m.timestamp);
      out.push({
        name: s.longname || s.shortname,
        gewaesser: s.water ? s.water.longname || s.water.shortname : "",
        lat: s.latitude,
        lon: s.longitude,
        wert: m.value,
        zeit: isNaN(time) ? null : time,
        veraltet: isNaN(time) || Date.now() - time > STALE_MS,
      });
    });
    return out;
  }

  async function load() {
    const cached = readCache();
    if (cached) return cached;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(URL, { signal: ctrl.signal });
      if (!res.ok) throw new Error("PEGELONLINE antwortet mit " + res.status);
      const result = { fetched: Date.now(), stationen: parse(await res.json()) };
      writeCache(result);
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  function distanceKm(lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180;
    const a =
      Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
      Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(a));
  }

  function nearest(lat, lon, stationen, maxKm = 40) {
    let best = null;
    stationen.forEach((s) => {
      const d = distanceKm(lat, lon, s.lat, s.lon);
      if (d <= maxKm && (!best || d < best.km)) best = { ...s, km: d };
    });
    return best;
  }

  // Faustregel für den Prototyp, keine fachliche Schwelle.
  function saison(temp) {
    if (temp >= 15) return { stufe: 3, text: "Hauptbewuchsphase: Larven von Seepocken und Muscheln setzen sich jetzt bevorzugt fest." };
    if (temp >= 8) return { stufe: 2, text: "Übergangszeit: Bewuchs setzt ein oder lässt nach." };
    return { stufe: 1, text: "Kaltes Wasser: kaum neuer Bewuchs." };
  }

  root.Live = { load, nearest, saison, distanceKm };
})(window);
