/* ============================================================================
   VOICE

   A hand on the bark and a hand on the phone is one hand short. So the record
   can be spoken: the tree by its number, the finding by the name of the field
   and one of its values, and the phone reads back what it took and asks for
   the next thing that is still open. The list scrolls itself (see followForm).

   What makes this reliable rather than a party trick is that almost nothing
   is free text. The tree number is matched against the register, the field
   against the profile's own list, the value against that field's own options
   - a closed vocabulary, in German and English, with the misfires the
   recogniser actually makes ("Vita Lität", "Ballon" for "Baum") folded in.
   Remarks are the one open field, and they are read back before being kept.

   The recogniser itself is the browser's. On Chrome for Android it runs on
   Google's servers, so it needs a signal; the page says so on the bar rather
   than failing quietly in the wood. Everything here works without it - the
   parser is plain text in, an action out, and is tested that way.
   ========================================================================= */

/* ---- numbers in words ------------------------------------------------ */
const NUM_DE = {
  null: 0, nul: 0, eins: 1, ein: 1, eine: 1, zwei: 2, zwo: 2, drei: 3, vier: 4, fuenf: 5, fünf: 5,
  sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwoelf: 12, zwölf: 12, dreizehn: 13,
  vierzehn: 14, fuenfzehn: 15, fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19,
  zwanzig: 20, dreissig: 30, dreißig: 30, vierzig: 40, fuenfzig: 50, fünfzig: 50, sechzig: 60,
  siebzig: 70, achtzig: 80, neunzig: 90, hundert: 100, tausend: 1000
};
const NUM_EN = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000
};
const NUM_ET = {
  null: 0, üks: 1, uks: 1, kaks: 2, kolm: 3, neli: 4, viis: 5, kuus: 6, seitse: 7, kaheksa: 8,
  üheksa: 9, uheksa: 9, kümme: 10, kumme: 10, üksteist: 11, kaksteist: 12, kolmteist: 13,
  neliteist: 14, viisteist: 15, kuusteist: 16, seitseteist: 17, kaheksateist: 18, üheksateist: 19,
  kakskümmend: 20, kakskummend: 20, kolmkümmend: 30, kolmkummend: 30, nelikümmend: 40,
  viiskümmend: 50, viiskummend: 50, kuuskümmend: 60, seitsekümmend: 70, kaheksakümmend: 80,
  üheksakümmend: 90, sada: 100, tuhat: 1000
};
/* "einundfünfzig" -> 51, "zweihundertdrei" -> 203, "fifty one" -> 51,
   "five one" -> "51" (spoken digit by digit: the plate is read out that way). */
function wordsToNumber(str) {
  const s = String(str || '').toLowerCase().replace(/-/g, ' ').trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  // German compound: split on "und", and on hundert/tausend
  const de = s;
  if (/^[a-zäöüß]+$/.test(de) && /(und|hundert|tausend|zig|zehn|ein|zwei|drei|vier|fünf|fuenf|sechs|sieben|acht|neun|null|elf|zwölf|zwoelf)/.test(de)) {
    let total = 0, cur = 0, rest = de, guard = 0;
    while (rest && guard++ < 20) {
      let hit = null;
      for (const w of Object.keys(NUM_DE).sort((a, b) => b.length - a.length))
        if (rest.startsWith(w)) { hit = w; break; }
      if (!hit) { if (rest.startsWith('und')) { rest = rest.slice(3); continue; } break; }
      const v = NUM_DE[hit]; rest = rest.slice(hit.length);
      if (v === 1000) { total += (cur || 1) * 1000; cur = 0; }
      else if (v === 100) { cur = (cur || 1) * 100; }
      else cur += v;
    }
    if (!rest) return total + cur;
  }
  // English / space-separated: "fifty one", "two hundred and three", "five one"
  const toks = s.split(/\s+/).filter(t => t !== 'and' && t !== 'und');
  let total = 0, cur = 0, digitsOnly = true, digits = '';
  for (const t of toks) {
    const v = /^\d+$/.test(t) ? parseInt(t, 10)
            : (NUM_EN[t] != null ? NUM_EN[t] : NUM_DE[t] != null ? NUM_DE[t] : NUM_ET[t]);
    if (v == null) return null;
    if (v > 9) digitsOnly = false; else digits += String(v);
    if (v === 1000) { total += (cur || 1) * 1000; cur = 0; }
    else if (v === 100) { cur = (cur || 1) * 100; }
    else cur += v;
  }
  // "five one" is 51 the way a plate is read, not 6
  if (digitsOnly && toks.length > 1) return parseInt(digits, 10);
  return total + cur;
}

/* ---- the vocabulary ---------------------------------------------------
   One entry per field the voice can fill. Names as they are said, values as
   they are said, mapped to the options the form actually stores. */
const VOICE_FIELDS = [
  { k: 'vitality_roloff', say: ['vitalität', 'vitalitaet', 'vita lität', 'vitality', 'roloff'],
    kind: 'int', min: 0, max: 3, ask: { de: 'Vitalität, null bis drei?', en: 'Vitality, zero to three?' } },
  { k: 'vitality_5', say: ['vitalität', 'vitality', 'zustand', 'condition', 'seisund', 'conditie'],
    kind: 'opt', opts: { good: ['gut', 'good', 'hea', 'goed'], moderate: ['mäßig', 'maessig', 'mittel', 'moderate', 'rahuldav', 'matig'],
      poor: ['schlecht', 'poor', 'gering', 'halb', 'slecht'], dying: ['absterbend', 'dying', 'hääbuv'], dead: ['tot', 'abgestorben', 'dead', 'kuivanud', 'surnud', 'dood'] },
    ask: { de: 'Vitalität: gut, mäßig, schlecht, absterbend oder tot?', en: 'Vitality: good, moderate, poor, dying or dead?',
           et: 'Seisund: hea, rahuldav, halb, hääbuv või kuivanud?', nl: 'Conditie: goed, matig, slecht, afstervend of dood?' } },
  { k: 'crown_dieback_pct', say: ['kronenverlichtung', 'verlichtung', 'totholz', 'dieback', 'crown dieback', 'hõrenemine', 'võra hõrenemine'],
    kind: 'int', min: 0, max: 100, ask: { de: 'Kronenverlichtung in Prozent?', en: 'Crown dieback, percent?', et: 'Võra hõrenemine protsentides?', nl: 'Kroonsterfte in procent?' } },
  { k: 'damage_class', say: ['schadklasse', 'schadensklasse', 'schaden', 'schadstufe', 'damage', 'damage class', 'kahjustus', 'kahjustused', 'kahjustuse aste', 'schade'],
    kind: 'opt', opts: { none: ['keine', 'kein', 'ohne', 'none', 'no', 'puudub', 'geen'], slight: ['gering', 'leicht', 'slight', 'minor', 'kerge', 'licht'],
      moderate: ['mäßig', 'maessig', 'mittel', 'moderate', 'keskmine', 'matig'], severe: ['stark', 'schwer', 'severe', 'heavy', 'tugev', 'raske', 'ernstig'] },
    ask: { de: 'Schadklasse: keine, gering, mäßig oder stark?', en: 'Damage class: none, slight, moderate or severe?',
           et: 'Kahjustuse aste: puudub, kerge, keskmine või tugev?', nl: 'Schadeklasse: geen, licht, matig of ernstig?' } },
  { k: 'traffic_safety', say: ['verkehrssicherheit', 'verkehrssicher', 'sicherheit', 'traffic safety', 'safety'],
    kind: 'opt', opts: { adequate: ['gegeben', 'gewährleistet', 'ja', 'ok', 'adequate', 'given', 'yes'],
      restricted: ['eingeschränkt', 'eingeschraenkt', 'bedingt', 'restricted', 'reduced'],
      'not given': ['nicht gegeben', 'nein', 'nicht', 'not given', 'no'] },
    ask: { de: 'Verkehrssicherheit: gegeben, eingeschränkt oder nicht gegeben?', en: 'Traffic safety: adequate, restricted or not given?' } },
  { k: 'bvc_result', say: ['ergebnis', 'uitkomst', 'resultaat', 'result', 'befund'],
    kind: 'opt', opts: { 'no findings': ['ohne befund', 'geen bevindingen', 'no findings', 'nichts'],
      'attention tree': ['attentieboom', 'attention', 'aufmerksamkeit', 'beobachten'],
      'risk tree': ['risicoboom', 'risiko', 'risk'], 'further investigation needed': ['nader onderzoek', 'untersuchung', 'further', 'investigation'] },
    ask: { de: 'Ergebnis: ohne Befund, Attentieboom, Risicoboom oder Untersuchung?', en: 'Result: no findings, attention tree, risk tree or investigation?' } },
  { k: 'urgency', say: ['dringlichkeit', 'frist', 'urgency', 'priorität', 'prioritaet', 'kiireloomulisus', 'urgentie'],
    kind: 'opt', opts: { none: ['keine', 'none', 'nichts', 'puudub', 'geen'], 'next growing season': ['vegetationsperiode', 'nächste vegetation', 'next season', 'growing season', 'nächstes jahr', 'vegetatsiooniperiood', 'groeiseizoen'],
      '3 months': ['drei monate', 'drei monaten', 'three months', '3 monate', 'kolm kuud', 'drie maanden'], '1 month': ['ein monat', 'einen monat', 'one month', '1 monat', 'üks kuu', 'een maand'],
      immediate: ['sofort', 'umgehend', 'immediate', 'immediately', 'now', 'kohe', 'onmiddellijk'] },
    ask: { de: 'Dringlichkeit: keine, Vegetationsperiode, drei Monate, ein Monat oder sofort?', en: 'Urgency: none, next season, three months, one month or immediate?',
           et: 'Kiireloomulisus: puudub, vegetatsiooniperiood, kolm kuud, üks kuu või kohe?', nl: 'Urgentie: geen, groeiseizoen, drie maanden, een maand of onmiddellijk?' } },
  { k: 'dbh_cm', say: ['durchmesser', 'bhd', 'brusthöhendurchmesser', 'dbh', 'diameter', 'diameeter', 'rinnasdiameeter'],
    kind: 'int', min: 1, max: 400, ask: { de: 'Durchmesser in Zentimetern?', en: 'Diameter, centimetres?', et: 'Diameeter sentimeetrites?', nl: 'Diameter in centimeter?' } },
  { k: 'girth_cm', say: ['umfang', 'stammumfang', 'girth', 'circumference', 'ümbermõõt', 'umbermoot', 'omtrek'],
    kind: 'int', min: 3, max: 1300, ask: { de: 'Stammumfang in Zentimetern?', en: 'Girth, centimetres?', et: 'Ümbermõõt sentimeetrites?', nl: 'Stamomtrek in centimeter?' } },
  { k: 'crown_d_m', say: ['kronendurchmesser', 'krone', 'crown diameter', 'crown', 'võra', 'vora', 'võra läbimõõt', 'kroon'],
    kind: 'int', min: 1, max: 50, ask: { de: 'Kronendurchmesser in Metern?', en: 'Crown diameter, metres?', et: 'Võra läbimõõt meetrites?', nl: 'Kroondiameter in meter?' } },
  { k: 'value_class', say: ['wertklasse', 'value class', 'väärtusklass', 'väärtus klass', 'vaartusklass', 'waardeklasse', 'klass'],
    kind: 'roman', ask: { de: 'Wertklasse, eins bis fünf?', en: 'Value class, one to five?', et: 'Väärtusklass, üks kuni viis?', nl: 'Waardeklasse, een tot vijf?' } },
  { k: 'recommendation', say: ['empfehlung', 'recommendation', 'soovitus', 'aanbeveling'],
    kind: 'opt', opts: { keep: ['erhalten', 'keep', 'retain', 'säilitada', 'behouden'], maintain: ['pflegen', 'maintain', 'prune', 'hooldada', 'onderhouden'],
      remove: ['entfernen', 'fällen', 'remove', 'fell', 'eemaldada', 'verwijderen'], replace: ['ersetzen', 'replace', 'asendada', 'vervangen'] },
    ask: { de: 'Empfehlung: erhalten, pflegen, entfernen oder ersetzen?', en: 'Recommendation: keep, maintain, remove or replace?', et: 'Soovitus: säilitada, hooldada, eemaldada või asendada?', nl: 'Aanbeveling: behouden, onderhouden, verwijderen of vervangen?' } },
  { k: 'height_m', say: ['höhe', 'hoehe', 'baumhöhe', 'height', 'kõrgus', 'korgus', 'hoogte'],
    kind: 'int', min: 1, max: 80, ask: { de: 'Höhe in Metern?', en: 'Height, metres?', et: 'Kõrgus meetrites?', nl: 'Hoogte in meter?' } },
  { k: 'cavity', say: ['höhlung', 'hoehlung', 'höhle', 'cavity', 'faulstelle', 'õõnsus', 'oonsus', 'holte'],
    kind: 'opt', opts: { yes: ['ja', 'yes', 'vorhanden', 'jah', 'on'], no: ['nein', 'no', 'keine', 'ei', 'nee'] },
    ask: { de: 'Höhlung, ja oder nein?', en: 'Cavity, yes or no?', et: 'Õõnsus, jah või ei?', nl: 'Holte, ja of nee?' } },
  { k: 'remarks', say: ['bemerkung', 'bemerkungen', 'anmerkung', 'notiz', 'remark', 'remarks', 'note', 'märkus', 'markus', 'opmerking'],
    kind: 'text', ask: { de: 'Bemerkung?', en: 'Remarks?', et: 'Märkus?', nl: 'Opmerking?' } }
];
const VOICE_CTL = {
  next: ['weiter', 'nächste', 'naechste', 'next', 'skip', 'überspringen', 'edasi', 'järgmine', 'volgende'],
  repeat: ['wiederholen', 'nochmal', 'repeat', 'again', 'was'],
  save: ['speichern', 'sichern', 'save', 'salvesta', 'opslaan'],
  photo: ['foto', 'photo', 'bild', 'picture'],
  stop: ['stop', 'stopp', 'fertig', 'ende', 'aus', 'done', 'finish', 'lõpeta', 'valmis', 'klaar'],
  which: ['welcher baum', 'which tree', 'wo bin ich', 'where am i']
};

/* "three", "drei", "kolm", "3", "III", "esimene" -> I..V */
function romanOf(str) {
  const t = vNorm(str).replace(/\b(klasse|klass|class)\b/g, ' ').trim();
  const R = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };
  if (R[t]) return ['I', 'II', 'III', 'IV', 'V'][R[t] - 1];
  const ord = { erste: 1, zweite: 2, dritte: 3, vierte: 4, fünfte: 5, first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
                esimene: 1, teine: 2, kolmas: 3, neljas: 4, viies: 5, eerste: 1, tweede: 2, derde: 3, vierde: 4, vijfde: 5 };
  if (ord[t]) return ['I', 'II', 'III', 'IV', 'V'][ord[t] - 1];
  const n = wordsToNumber(t);
  return (n >= 1 && n <= 5) ? ['I', 'II', 'III', 'IV', 'V'][n - 1] : null;
}
function vNorm(s) {
  return String(s || '').toLowerCase().replace(/[.,!?]/g, ' ').replace(/\s+/g, ' ').trim();
}
/* The recogniser's own habits. "Baum" comes back as "Ballon", "Bauer",
   "Traum"; "Vitalität" as two words. Folded in before matching. */
function vFix(s) {
  return vNorm(s)
    .replace(/\b(ballon|bauer|traum|raum|baumnummer|baum nummer|nummer)\b/g, 'baum')
    .replace(/\bvita\s+lit[aä]t\b/g, 'vitalität')
    .replace(/\bprozent\b|\bpercent\b|%/g, '')
    .replace(/\bzentimeter\b|\bcentimet(er|re)s?\b|\bcm\b/g, '')
    .replace(/\bmeter\b|\bmetres?\b/g, '');
}

/* ---- text in, action out ------------------------------------------------
   ctx: { fields: [field keys in the current form], open: [keys still empty] }
   Returns one of
     { act:'tree', n }              a tree number
     { act:'set', k, v, kind }      a field and its value
     { act:'next'|'repeat'|'save'|'photo'|'stop'|'which' }
     { act:'unknown', heard }       nothing matched                         */
function voiceParse(text, ctx) {
  const t = vFix(text);
  if (!t) return { act: 'unknown', heard: text };
  const fields = (ctx && ctx.fields) || VOICE_FIELDS.map(f => f.k);

  for (const k of Object.keys(VOICE_CTL))
    if (VOICE_CTL[k].some(w => t === w || t.startsWith(w + ' ') || t.endsWith(' ' + w) || t === w + ' bitte'))
      return { act: k };

  // "baum 51", "tree fifty one", "baum fünf eins"
  const m = t.match(/^(?:baum|tree|boom|arbre|puu)\s+(.+)$/);
  if (m) { const n = wordsToNumber(m[1]); if (n != null) return { act: 'tree', n: n }; }

  // a field name followed by its value, in either order the recogniser gives
  for (const f of VOICE_FIELDS) {
    if (fields.indexOf(f.k) < 0) continue;
    const name = f.say.find(w => t === w || t.startsWith(w + ' ') || t.endsWith(' ' + w) || t.indexOf(' ' + w + ' ') >= 0);
    if (!name) continue;
    let rest = t.replace(name, ' ').replace(/\b(ist|is|gleich|equals|auf|to|von|of)\b/g, ' ').replace(/\s+/g, ' ').trim();
    if (f.kind === 'text') return { act: 'set', k: f.k, v: rest, kind: 'text' };
    if (f.kind === 'roman') {
      const n = romanOf(rest);
      if (!n) return { act: 'ask', k: f.k };
      return { act: 'set', k: f.k, v: n, kind: 'opt' };
    }
    if (f.kind === 'int') {
      const n = wordsToNumber(rest);
      if (n == null || n < f.min || n > f.max) return { act: 'ask', k: f.k };
      return { act: 'set', k: f.k, v: n, kind: 'int' };
    }
    if (f.kind === 'opt') {
      let best = null, bl = 0;
      Object.keys(f.opts).forEach(v => f.opts[v].forEach(w => {
        if ((rest === w || rest.indexOf(w) >= 0) && w.length > bl) { best = v; bl = w.length; }
      }));
      if (best == null) return { act: 'ask', k: f.k };
      return { act: 'set', k: f.k, v: best, kind: 'opt' };
    }
  }

  // a bare value while a question is open: "zwei", "gering", "sofort"
  if (ctx && ctx.asking) {
    const f = VOICE_FIELDS.find(x => x.k === ctx.asking);
    if (f && f.kind === 'roman') { const n = romanOf(t); if (n) return { act: 'set', k: f.k, v: n, kind: 'opt' }; }
    if (f && f.kind === 'int') { const n = wordsToNumber(t); if (n != null && n >= f.min && n <= f.max) return { act: 'set', k: f.k, v: n, kind: 'int' }; }
    if (f && f.kind === 'opt') {
      let best = null, bl = 0;
      Object.keys(f.opts).forEach(v => f.opts[v].forEach(w => {
        if ((t === w || t.indexOf(w) >= 0) && w.length > bl) { best = v; bl = w.length; }
      }));
      if (best != null) return { act: 'set', k: f.k, v: best, kind: 'opt' };
    }
    if (f && f.kind === 'text') return { act: 'set', k: f.k, v: t, kind: 'text' };
  }
  // a bare number with no question open is a tree number
  const n = wordsToNumber(t);
  if (n != null) return { act: 'tree', n: n };
  return { act: 'unknown', heard: text };
}

/* ---- speaking ---------------------------------------------------------- */
const LANG_TAG = { en: 'en-GB', de: 'de-DE', nl: 'nl-NL', et: 'et-EE' };
function voiceLang() {
  const v = (typeof prefs === 'function' && prefs().voiceLang) || 'auto';
  if (v !== 'auto') return v;
  return LANG_TAG[(typeof uiLang === 'function') ? uiLang() : 'en'] || 'en-GB';
}
function askIn(f) {
  const l = voiceLang().slice(0, 2);
  return f.ask[l] || f.ask.en;
}
/* What is read back is read back in the language that was spoken, not the
   one on the form: an English speaker hears "damage class moderate" while
   the Estonian form shows keskmine. Both are the same stored value. */
function nameIn(k) {
  const l = voiceLang().slice(0, 2);
  const base = (typeof FIELDS !== 'undefined' && FIELDS[k]) ? FIELDS[k][1]
             : (typeof F_BASE !== 'undefined' && (F_BASE.find(f => f[0] === k) || [])[1]) || k;
  return (l !== 'en' && typeof FIELD_L !== 'undefined' && FIELD_L[k] && FIELD_L[k][l]) || base;
}
function valueIn(k, v) {
  const l = voiceLang().slice(0, 2);
  const t = (typeof OPT_L !== 'undefined' && OPT_L[k] && OPT_L[k][v]) || null;
  return (l !== 'en' && t && t[l]) || v;
}
function say(text, cb) {
  if (!('speechSynthesis' in window)) { if (cb) cb(); return; }
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voiceLang(); u.rate = 1.05;
    if (cb) { u.onend = cb; u.onerror = cb; }
    speechSynthesis.speak(u);
  } catch (e) { if (cb) cb(); }
}
/* A Latin name is read badly by a German voice and worse by an English one;
   the common name, when there is one, is what a person wants to hear. */
function speciesSpoken(p) {
  const de = voiceLang().startsWith('de');
  const cn = (p.name_en || '').trim(), sp = (p.species || '').trim();
  if (!sp && !cn) return de ? 'Art nicht erfasst' : 'species not recorded';
  return cn ? (cn + (sp ? ', ' + sp : '')) : sp;
}

/* ---- the runtime ------------------------------------------------------- */
let vRec = null, vOn = false, vTree = null, vAsking = null, vPendingText = null;
function speechOk() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
function speechFieldsNow() {
  const n = (typeof curNorm === 'function') ? curNorm() : null;
  const keys = n ? n.quick.concat([].concat.apply([], n.groups.map(g => g[1]))) : VOICE_FIELDS.map(f => f.k);
  return VOICE_FIELDS.map(f => f.k).filter(k => keys.indexOf(k) >= 0);
}
function speechOpenFields(i) {
  const p = props(i), n = curNorm();
  return n.quick.filter(k => VOICE_FIELDS.some(f => f.k === k)).filter(k => {
    const v = p[k];
    return v == null || v === '' || (k === 'damage_class' && v === 'none' && !p.edited_at) ||
           (k === 'urgency' && v === 'none' && !p.edited_at);
  });
}
function speechBar(txt, cls) {
  let el = document.getElementById('speechbar');
  if (!el) {
    el = document.createElement('div'); el.id = 'speechbar';
    document.body.appendChild(el);
  }
  const want = (typeof mode !== 'undefined' && mode === 'WebXR') ? document.getElementById('xrbot') : document.body;
  if (want && el.parentNode !== want) want.appendChild(el);
  el.className = cls || '';
  el.innerHTML = '<span class="dot"></span><span class="t">' + txt + '</span>' +
                 '<button class="x sm" id="speechOff">Stop</button>';
  el.style.display = 'flex';
  const off = document.getElementById('speechOff'); if (off) off.onclick = speechStop;
}
function speechStart(i) {
  if (vOn) return speechStop();
  if (!speechOk()) return toast('This browser has no speech recognition. Chrome on Android does.');
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  vRec = new R();
  vRec.lang = voiceLang(); vRec.continuous = true; vRec.interimResults = false; vRec.maxAlternatives = 3;
  vRec.onresult = ev => {
    const r = ev.results[ev.results.length - 1];
    if (!r || !r.isFinal) return;
    const alts = []; for (let k = 0; k < r.length; k++) alts.push(r[k].transcript);
    speechHeard(alts);
  };
  vRec.onerror = ev => {
    if (ev.error === 'not-allowed') { speechBar('Microphone refused – allow it for this site.', 'bad'); vOn = false; return; }
    if (ev.error === 'network') { speechBar('No signal – the recogniser needs the network on this phone.', 'bad'); return; }
  };
  vRec.onend = () => { if (vOn) { try { vRec.start(); } catch (e) {} } };
  vOn = true; vTree = i == null ? (typeof openIdx !== 'undefined' ? openIdx : null) : i; vAsking = null;
  try { vRec.start(); } catch (e) { vOn = false; return toast('Voice could not start: ' + e.message); }
  speechBar('Listening … say “Baum 51”, or a field and its value.');
  if (vTree != null) speechAnnounce(vTree);
  else say(voiceLang().startsWith('de') ? 'Welcher Baum?' : 'Which tree?');
  auditAdd({ what: 'voice on' });
}
function speechStop() {
  vOn = false; vAsking = null; vPendingText = null;
  if (vRec) { try { vRec.onend = null; vRec.stop(); } catch (e) {} vRec = null; }
  const el = document.getElementById('speechbar'); if (el) el.style.display = 'none';
  try { speechSynthesis.cancel(); } catch (e) {}
}
/* The tree is named, its species read out, and the first open field asked. */
function speechAnnounce(i) {
  vTree = i;
  const p = props(i), de = voiceLang().startsWith('de');
  const open = speechOpenFields(i);
  const head = (de ? 'Baum ' : 'Tree ') + (p.tag_no || p.tree_id) + '. ' + speciesSpoken(p) + '. ';
  const last = p.traffic_safety && p.edited_at
    ? (de ? 'Zuletzt: Verkehrssicherheit ' + p.traffic_safety + '. ' : 'Last: traffic safety ' + p.traffic_safety + '. ') : '';
  speechBar((p.tag_no || p.tree_id) + ' · ' + speciesSpoken(p) + (open.length ? ' · ' + open.length + ' open' : ' · complete'));
  say(head + last, () => speechAskNext(i));
}
function speechAskNext(i) {
  const open = speechOpenFields(i);
  const de = voiceLang().startsWith('de');
  if (!open.length) { vAsking = null; say(de ? 'Alles erfasst. Nächster Baum?' : 'All recorded. Next tree?'); return; }
  const f = VOICE_FIELDS.find(x => x.k === open[0]);
  vAsking = f.k;
  say(askIn(f));
}
function speechHeard(alts) {
  const ctx = { fields: speechFieldsNow(), open: vTree != null ? speechOpenFields(vTree) : [], asking: vAsking };
  let a = null;
  for (const t of alts) { a = voiceParse(t, ctx); if (a.act !== 'unknown') break; }
  const de = voiceLang().startsWith('de');
  const bar = document.getElementById('speechbar');
  if (bar) bar.querySelector('.t').textContent = '“' + alts[0] + '”';
  switch (a.act) {
    case 'tree': {
      const hits = findByNumber(String(a.n));
      if (!hits.length) { say((de ? 'Kein Baum ' : 'No tree ') + a.n); return; }
      const i = hits[0].i;
      if (typeof mode !== 'undefined' && !mode) showScreen('list');
      openPanel(i, 'quick');
      speechAnnounce(i);
      return;
    }
    case 'set': {
      if (vTree == null) { say(de ? 'Erst den Baum nennen.' : 'Name the tree first.'); return; }
      if (a.kind === 'text') {
        // read back before keeping: this is the one open field
        vPendingText = a.v;
        say((de ? 'Bemerkung: ' : 'Remark: ') + a.v + (de ? '. Richtig?' : '. Correct?'));
        vAsking = '__confirm';
        return;
      }
      speechApply(vTree, a.k, a.v);
      const f = VOICE_FIELDS.find(x => x.k === a.k);
      say(nameIn(a.k) + ' ' + valueIn(a.k, a.v) + '.', () => speechAskNext(vTree));
      return;
    }
    case 'ask': {
      const f = VOICE_FIELDS.find(x => x.k === a.k);
      vAsking = a.k; say(askIn(f));
      return;
    }
    case 'next': {
      if (vTree == null) return;
      const open = speechOpenFields(vTree);
      if (vAsking && open.indexOf(vAsking) >= 0) {     // skip the one asked: mark it looked at
        const nx = open.filter(k => k !== vAsking);
        if (!nx.length) { say(de ? 'Nichts mehr offen.' : 'Nothing left open.'); vAsking = null; return; }
        const f = VOICE_FIELDS.find(x => x.k === nx[0]); vAsking = f.k; say(askIn(f));
      } else speechAskNext(vTree);
      return;
    }
    case 'repeat': if (vTree != null) speechAnnounce(vTree); return;
    case 'save': if (vTree != null) { savePanel(true); say(de ? 'Gespeichert.' : 'Saved.'); } return;
    case 'photo': if (vTree != null) takePhotoOf(vTree, null); return;
    case 'stop': say(de ? 'Sprache aus.' : 'Voice off.'); speechStop(); return;
    case 'which': {
      const v = (typeof treeInView === 'function') ? treeInView() : null;
      say(v ? ((de ? 'Vermutlich ' : 'Probably ') + tid(v.i)) : (de ? 'Nicht ausgerichtet.' : 'Not aligned.'));
      return;
    }
    default: {
      if (vAsking === '__confirm' && vPendingText != null) {
        const t = vFix(alts[0]);
        if (/^(ja|richtig|stimmt|yes|correct|ok)/.test(t)) {
          speechApply(vTree, 'remarks', vPendingText); vPendingText = null;
          say(de ? 'Notiert.' : 'Noted.', () => speechAskNext(vTree)); return;
        }
        vPendingText = null; vAsking = 'remarks'; say(de ? 'Verworfen. Bemerkung?' : 'Dropped. Remarks?'); return;
      }
      say(de ? 'Nicht verstanden.' : 'Not understood.');
    }
  }
}
/* Written the way a finger would: into the form field if it is on screen,
   so the autoscroll and the verdict follow, else straight to the record. */
function speechApply(i, k, v) {
  const inp = (typeof panelEl !== 'undefined' && panelEl && openIdx === i) ? panelEl.querySelector('[data-k="' + k + '"]') : null;
  if (inp) {
    inp.value = String(v);
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    savePanel(true);
  } else {
    const patch = {}; patch[k] = v; setEdit(i, patch);
  }
  auditAdd({ what: 'voice set', tree: tid(i), detail: k + ' = ' + v });
}
