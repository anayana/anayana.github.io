/* Bewertungsverfahren des Antifouling-Atlas: gewichtete Summe, TOPSIS,
   PROMETHEE II, Konsens nach Borda und eine Robustheitsprüfung per
   Monte-Carlo-Simulation. Ohne Abhängigkeiten, im Browser und in Node nutzbar.

   Eine Alternative ist { id, raw: { <kriterium>: Zahl } }, ein Kriterium
   { key, richtung: "min" | "max", bereich: [lo, hi], untergrenze? }. */
(function (root) {
  "use strict";

  // Fester Wertebereich je Kriterium: Die Punkte einer Option ändern sich
  // nicht, wenn andere Optionen hinzukommen oder ausgeschlossen werden.
  function normalize(value, crit) {
    const [lo, hi] = crit.bereich;
    const v = Math.min(1, Math.max(0, (value - lo) / (hi - lo)));
    return crit.richtung === "min" ? 1 - v : v;
  }

  // Aus Wichtigkeiten (beliebige Zahlen >= 0) werden Gewichte mit Summe 1.
  // Hat ein Kriterium eine Untergrenze, wird es darauf angehoben und die
  // übrigen werden anteilig gekürzt.
  function weightsFrom(importance, criteria) {
    const keys = criteria.map((c) => c.key);
    const sum = keys.reduce((s, k) => s + Math.max(0, importance[k] || 0), 0);
    const w = {};
    keys.forEach((k) => { w[k] = sum > 0 ? Math.max(0, importance[k] || 0) / sum : 1 / keys.length; });
    let floored = null;
    criteria.forEach((c) => {
      if (!c.untergrenze || w[c.key] >= c.untergrenze) return;
      const rest = 1 - w[c.key];
      keys.forEach((k) => {
        if (k === c.key) return;
        w[k] = rest > 0 ? (w[k] * (1 - c.untergrenze)) / rest : (1 - c.untergrenze) / (keys.length - 1);
      });
      w[c.key] = c.untergrenze;
      floored = c.key;
    });
    return { weights: w, floored };
  }

  function weightedSum(alts, criteria, w) {
    return alts.map((a) => {
      const parts = {};
      let score = 0;
      criteria.forEach((c) => {
        parts[c.key] = w[c.key] * normalize(a.raw[c.key], c);
        score += parts[c.key];
      });
      return { id: a.id, score, parts };
    });
  }

  // TOPSIS: Vektornormierung, Abstand zur besten und zur schlechtesten Lösung.
  function topsis(alts, criteria, w) {
    if (!alts.length) return [];
    const v = alts.map(() => ({}));
    const best = {}, worst = {};
    criteria.forEach((c) => {
      const norm = Math.sqrt(alts.reduce((s, a) => s + a.raw[c.key] ** 2, 0));
      alts.forEach((a, i) => { v[i][c.key] = norm > 0 ? (w[c.key] * a.raw[c.key]) / norm : 0; });
      const col = v.map((r) => r[c.key]);
      const hi = Math.max(...col), lo = Math.min(...col);
      best[c.key] = c.richtung === "max" ? hi : lo;
      worst[c.key] = c.richtung === "max" ? lo : hi;
    });
    return alts.map((a, i) => {
      let dp = 0, dm = 0;
      criteria.forEach((c) => {
        dp += (v[i][c.key] - best[c.key]) ** 2;
        dm += (v[i][c.key] - worst[c.key]) ** 2;
      });
      dp = Math.sqrt(dp); dm = Math.sqrt(dm);
      return { id: a.id, score: dp + dm > 0 ? dm / (dp + dm) : 1 };
    });
  }

  // PROMETHEE II mit linearer Präferenzfunktion auf den normierten Werten:
  // Unterschiede bis q zählen nicht, ab p voll.
  function promethee(alts, criteria, w, q = 0.05, p = 0.4) {
    const n = alts.length;
    if (n < 2) return alts.map((a) => ({ id: a.id, score: 0 }));
    const norm = alts.map((a) => {
      const r = {};
      criteria.forEach((c) => { r[c.key] = normalize(a.raw[c.key], c); });
      return r;
    });
    const pref = (d) => (d <= q ? 0 : d >= p ? 1 : (d - q) / (p - q));
    const pi = (i, j) => criteria.reduce((s, c) => s + w[c.key] * pref(norm[i][c.key] - norm[j][c.key]), 0);
    return alts.map((a, i) => {
      let plus = 0, minus = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        plus += pi(i, j);
        minus += pi(j, i);
      }
      return { id: a.id, score: (plus - minus) / (n - 1) };
    });
  }

  const METHODS = { wsm: weightedSum, topsis, promethee };

  // Rang 1 = beste Option; bei Gleichstand entscheidet die Reihenfolge der Eingabe.
  function ranks(results) {
    const order = results.map((r, i) => ({ ...r, i })).sort((a, b) => b.score - a.score || a.i - b.i);
    const out = {};
    order.forEach((r, k) => { out[r.id] = k + 1; });
    return out;
  }

  // Borda: Jede Methode vergibt n − Rang Punkte. Gleichstand löst der Rang der ersten Methode.
  function consensus(rankMaps, ids) {
    const n = ids.length;
    const pts = ids.map((id) => ({
      id,
      points: rankMaps.reduce((s, m) => s + (n - m[id]), 0),
      first: rankMaps[0][id],
    }));
    pts.sort((a, b) => b.points - a.points || a.first - b.first);
    const out = {};
    pts.forEach((p, k) => { out[p.id] = k + 1; });
    return out;
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Wie oft bleibt Platz 1 vorn, wenn Gewichte um ±25 % und Werte um ±15 %
  // schwanken? Fester Startwert, damit dieselbe Eingabe dasselbe Ergebnis gibt.
  function robustness(alts, criteria, importance, method, runs = 400, seed = 7) {
    if (alts.length < 2) return { share: 1, runs: 0 };
    const fn = METHODS[method];
    const base = ranks(fn(alts, criteria, weightsFrom(importance, criteria).weights));
    const topId = Object.keys(base).find((id) => base[id] === 1);
    const rnd = mulberry32(seed);
    let same = 0;
    for (let r = 0; r < runs; r++) {
      const imp = {};
      criteria.forEach((c) => { imp[c.key] = (importance[c.key] || 0) * (0.75 + 0.5 * rnd()); });
      const w = weightsFrom(imp, criteria).weights;
      const pert = alts.map((a) => {
        const raw = {};
        criteria.forEach((c) => { raw[c.key] = a.raw[c.key] * (0.85 + 0.3 * rnd()); });
        return { id: a.id, raw };
      });
      const rk = ranks(fn(pert, criteria, w));
      if (rk[topId] === 1) same++;
    }
    return { share: same / runs, runs, topId };
  }

  const api = { normalize, weightsFrom, weightedSum, topsis, promethee, METHODS, ranks, consensus, robustness };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MCDA = api;
})(typeof window !== "undefined" ? window : globalThis);
