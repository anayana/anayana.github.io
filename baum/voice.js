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
const NUM_FI = {
  nolla: 0, yksi: 1, kaksi: 2, kolme: 3, neljä: 4, nelja: 4, viisi: 5, kuusi: 6, seitsemän: 7, seitseman: 7,
  kahdeksan: 8, yhdeksän: 9, yhdeksan: 9, kymmenen: 10, yksitoista: 11, kaksitoista: 12, kolmetoista: 13,
  neljätoista: 14, viisitoista: 15, kuusitoista: 16, seitsemäntoista: 17, kahdeksantoista: 18, yhdeksäntoista: 19,
  kaksikymmentä: 20, kaksikymmenta: 20, kolmekymmentä: 30, kolmekymmenta: 30, neljäkymmentä: 40, viisikymmentä: 50,
  viisikymmenta: 50, kuusikymmentä: 60, seitsemänkymmentä: 70, kahdeksankymmentä: 80, yhdeksänkymmentä: 90,
  sata: 100, tuhat: 1000
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
  // Finnish writes "viisikymmentäyksi" as one word: peel the tens off the front
  if (/^[a-zäö]+$/.test(s) && NUM_FI[s] == null) {
    for (const tens of Object.keys(NUM_FI).filter(w => NUM_FI[w] >= 20 && NUM_FI[w] < 100 && s.startsWith(w))) {
      const rest = s.slice(tens.length);
      if (NUM_FI[rest] != null && NUM_FI[rest] < 10) return NUM_FI[tens] + NUM_FI[rest];
    }
    if (s.startsWith('sata') && NUM_FI[s.slice(4)] != null) return 100 + NUM_FI[s.slice(4)];
  }
  // English / space-separated: "fifty one", "two hundred and three", "five one"
  const toks = s.split(/\s+/).filter(t => t !== 'and' && t !== 'und');
  let total = 0, cur = 0, digitsOnly = true, digits = '';
  for (const t of toks) {
    const v = /^\d+$/.test(t) ? parseInt(t, 10)
            : (NUM_EN[t] != null ? NUM_EN[t] : NUM_DE[t] != null ? NUM_DE[t] : NUM_ET[t] != null ? NUM_ET[t] : NUM_FI[t]);
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
  { k: 'vitality_5', say: ['vitalität', 'vitality', 'zustand', 'condition', 'seisund', 'conditie', 'elinvoima'],
    kind: 'opt', opts: { good: ['gut', 'good', 'hea', 'goed', 'hyvä'], moderate: ['mäßig', 'maessig', 'mittel', 'moderate', 'rahuldav', 'matig', 'tyydyttävä'],
      poor: ['schlecht', 'poor', 'gering', 'halb', 'slecht', 'huono'], dying: ['absterbend', 'dying', 'hääbuv'], dead: ['tot', 'abgestorben', 'dead', 'kuivanud', 'surnud', 'dood', 'kuollut'] },
    ask: { de: 'Vitalität: gut, mäßig, schlecht, absterbend oder tot?', en: 'Vitality: good, moderate, poor, dying or dead?',
           et: 'Seisund: hea, rahuldav, halb, hääbuv või kuivanud?', nl: 'Conditie: goed, matig, slecht, afstervend of dood?', fi: 'Elinvoima: hyvä, tyydyttävä, huono, kuoleva vai kuollut?' } },
  { k: 'crown_dieback_pct', say: ['kronenverlichtung', 'verlichtung', 'totholz', 'dieback', 'crown dieback', 'hõrenemine', 'võra hõrenemine', 'harsuuntuminen'],
    kind: 'int', min: 0, max: 100, ask: { de: 'Kronenverlichtung in Prozent?', en: 'Crown dieback, percent?', et: 'Võra hõrenemine protsentides?', nl: 'Kroonsterfte in procent?', fi: 'Harsuuntuminen prosentteina?' } },
  { k: 'damage_class', say: ['schadklasse', 'schadensklasse', 'schaden', 'schadstufe', 'damage', 'damage class', 'kahjustus', 'kahjustused', 'kahjustuse aste', 'schade', 'vaurio', 'vauriot', 'vaurioluokka'],
    kind: 'opt', opts: { none: ['keine', 'kein', 'ohne', 'none', 'no', 'puudub', 'geen', 'ei vaurioita', 'ei'], slight: ['gering', 'leicht', 'slight', 'minor', 'kerge', 'licht', 'lievä'],
      moderate: ['mäßig', 'maessig', 'mittel', 'moderate', 'keskmine', 'matig', 'kohtalainen'], severe: ['stark', 'schwer', 'severe', 'heavy', 'tugev', 'raske', 'ernstig', 'vakava'] },
    ask: { de: 'Schadklasse: keine, gering, mäßig oder stark?', en: 'Damage class: none, slight, moderate or severe?',
           et: 'Kahjustuse aste: puudub, kerge, keskmine või tugev?', nl: 'Schadeklasse: geen, licht, matig of ernstig?', fi: 'Vaurioluokka: ei vaurioita, lievä, kohtalainen vai vakava?' } },
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
  { k: 'urgency', say: ['dringlichkeit', 'frist', 'urgency', 'priorität', 'prioritaet', 'kiireloomulisus', 'urgentie', 'kiireellisyys'],
    kind: 'opt', opts: { none: ['keine', 'none', 'nichts', 'puudub', 'geen', 'ei kiireellinen', 'ei'], 'next growing season': ['vegetationsperiode', 'nächste vegetation', 'next season', 'growing season', 'nächstes jahr', 'vegetatsiooniperiood', 'groeiseizoen', 'kasvukausi', 'seuraava kasvukausi'],
      '3 months': ['drei monate', 'drei monaten', 'three months', '3 monate', 'kolm kuud', 'drie maanden', 'kolme kuukautta'], '1 month': ['ein monat', 'einen monat', 'one month', '1 monat', 'üks kuu', 'een maand', 'yksi kuukausi', 'kuukausi'],
      immediate: ['sofort', 'umgehend', 'immediate', 'immediately', 'now', 'kohe', 'onmiddellijk', 'heti', 'välittömästi'] },
    ask: { de: 'Dringlichkeit: keine, Vegetationsperiode, drei Monate, ein Monat oder sofort?', en: 'Urgency: none, next season, three months, one month or immediate?',
           et: 'Kiireloomulisus: puudub, vegetatsiooniperiood, kolm kuud, üks kuu või kohe?', nl: 'Urgentie: geen, groeiseizoen, drie maanden, een maand of onmiddellijk?', fi: 'Kiireellisyys: ei, seuraava kasvukausi, kolme kuukautta, yksi kuukausi vai heti?' } },
  { k: 'dbh_cm', say: ['durchmesser', 'bhd', 'brusthöhendurchmesser', 'dbh', 'diameter', 'diameeter', 'rinnasdiameeter', 'läpimitta', 'lapimitta'],
    kind: 'int', min: 1, max: 400, ask: { de: 'Durchmesser in Zentimetern?', en: 'Diameter, centimetres?', et: 'Diameeter sentimeetrites?', nl: 'Diameter in centimeter?', fi: 'Läpimitta senttimetreinä?' } },
  { k: 'girth_cm', say: ['umfang', 'stammumfang', 'girth', 'circumference', 'ümbermõõt', 'umbermoot', 'omtrek', 'ympärysmitta', 'ymparysmitta', 'ympärys'],
    kind: 'int', min: 3, max: 1300, ask: { de: 'Stammumfang in Zentimetern?', en: 'Girth, centimetres?', et: 'Ümbermõõt sentimeetrites?', nl: 'Stamomtrek in centimeter?', fi: 'Ympärysmitta senttimetreinä?' } },
  { k: 'crown_d_m', say: ['kronendurchmesser', 'krone', 'crown diameter', 'crown', 'võra', 'vora', 'võra läbimõõt', 'kroon', 'latvus', 'latvuksen leveys'],
    kind: 'int', min: 1, max: 50, ask: { de: 'Kronendurchmesser in Metern?', en: 'Crown diameter, metres?', et: 'Võra läbimõõt meetrites?', nl: 'Kroondiameter in meter?', fi: 'Latvuksen leveys metreinä?' } },
  { k: 'value_class', say: ['wertklasse', 'value class', 'väärtusklass', 'väärtus klass', 'vaartusklass', 'waardeklasse', 'klass'],
    kind: 'roman', ask: { de: 'Wertklasse, eins bis fünf?', en: 'Value class, one to five?', et: 'Väärtusklass, üks kuni viis?', nl: 'Waardeklasse, een tot vijf?', fi: 'Arvoluokka, yksi viiteen?' } },
  { k: 'condition_class', say: ['kuntoluokka', 'kunto', 'condition class', 'zustandsklasse', 'seisundiklass', 'conditieklasse'],
    kind: 'grade4', ask: { de: 'Zustandsklasse, eins bis vier?', en: 'Condition class, one to four?', et: 'Seisundiklass, üks kuni neli?', nl: 'Conditieklasse, een tot vier?', fi: 'Kuntoluokka, yhdestä neljään?' } },
  { k: 'recommendation', say: ['empfehlung', 'recommendation', 'soovitus', 'aanbeveling', 'suositus', 'toimenpide'],
    kind: 'opt', opts: { keep: ['erhalten', 'keep', 'retain', 'säilitada', 'behouden', 'säilytä', 'säilytetään'], maintain: ['pflegen', 'maintain', 'prune', 'hooldada', 'onderhouden', 'hoida', 'hoidetaan', 'leikkaa'],
      remove: ['entfernen', 'fällen', 'remove', 'fell', 'eemaldada', 'verwijderen', 'poista', 'poistetaan', 'kaada'], replace: ['ersetzen', 'replace', 'asendada', 'vervangen', 'korvaa', 'korvataan'] },
    ask: { de: 'Empfehlung: erhalten, pflegen, entfernen oder ersetzen?', en: 'Recommendation: keep, maintain, remove or replace?', et: 'Soovitus: säilitada, hooldada, eemaldada või asendada?', nl: 'Aanbeveling: behouden, onderhouden, verwijderen of vervangen?', fi: 'Suositus: säilytä, hoida, poista vai korvaa?' } },
  { k: 'height_m', say: ['höhe', 'hoehe', 'baumhöhe', 'height', 'kõrgus', 'korgus', 'hoogte', 'korkeus'],
    kind: 'int', min: 1, max: 80, ask: { de: 'Höhe in Metern?', en: 'Height, metres?', et: 'Kõrgus meetrites?', nl: 'Hoogte in meter?', fi: 'Korkeus metreinä?' } },
  { k: 'cavity', say: ['höhlung', 'hoehlung', 'höhle', 'cavity', 'faulstelle', 'õõnsus', 'oonsus', 'holte', 'onkalo', 'laho'],
    kind: 'opt', opts: { yes: ['ja', 'yes', 'vorhanden', 'jah', 'on', 'kyllä'], no: ['nein', 'no', 'keine', 'ei', 'nee'] },
    ask: { de: 'Höhlung, ja oder nein?', en: 'Cavity, yes or no?', et: 'Õõnsus, jah või ei?', nl: 'Holte, ja of nee?', fi: 'Onkalo, kyllä vai ei?' } },
  { k: 'remarks', say: ['bemerkung', 'bemerkungen', 'anmerkung', 'notiz', 'remark', 'remarks', 'note', 'märkus', 'markus', 'opmerking', 'huomautus', 'huomautukset', 'huomio'],
    kind: 'text', ask: { de: 'Bemerkung?', en: 'Remarks?', et: 'Märkus?', nl: 'Opmerking?', fi: 'Huomautus?' } }
];
const VOICE_CTL = {
  next: ['weiter', 'nächste', 'naechste', 'next', 'skip', 'überspringen', 'edasi', 'järgmine', 'volgende', 'seuraava', 'eteenpäin'],
  back: ['zurück', 'zurueck', 'back', 'previous', 'vorheriges', 'nochmal zurück', 'tagasi', 'eelmine', 'terug', 'takaisin', 'edellinen'],
  help: ['hilfe', 'help', 'was kann ich sagen', 'what can i say', 'abi', 'apua'],
  repeat: ['wiederholen', 'nochmal', 'repeat', 'again', 'was'],
  save: ['speichern', 'sichern', 'save', 'salvesta', 'opslaan', 'tallenna'],
  photo: ['foto', 'photo', 'bild', 'picture'],
  stop: ['stop', 'stopp', 'fertig', 'ende', 'aus', 'done', 'finish', 'lõpeta', 'valmis', 'klaar', 'lopeta', 'seis'],
  which: ['welcher baum', 'which tree', 'wo bin ich', 'where am i']
};

/* Species by voice. The list the form offers is Latin with an English common
   name; nobody standing at a birch says Betula pendula. So the genus is named
   in the languages this app is used in, and the rest is matched against both
   halves of the list. Two hits is not a failure - it is a question. */
const GENUS_SAID = {
  Tilia: ['linde', 'lime', 'linden', 'pärn', 'parn', 'lehmus'],
  Quercus: ['eiche', 'oak', 'tamm', 'tammi', 'eik'],
  Betula: ['birke', 'birch', 'kask', 'koivu', 'berk'],
  Acer: ['ahorn', 'maple', 'vaher', 'vaahtera', 'esdoorn'],
  Fagus: ['buche', 'rotbuche', 'beech', 'pöök', 'pook', 'pyökki', 'beuk'],
  Fraxinus: ['esche', 'ash', 'saar', 'saarni', 'es'],
  Aesculus: ['kastanie', 'rosskastanie', 'chestnut', 'horse chestnut', 'kastan', 'hevoskastanja'],
  Platanus: ['platane', 'plane', 'plataan', 'plataani'],
  Pinus: ['kiefer', 'föhre', 'pine', 'mänd', 'mand', 'mänty', 'den'],
  Picea: ['fichte', 'spruce', 'kuusk', 'kuusi', 'spar'],
  Salix: ['weide', 'willow', 'paju', 'wilg'],
  Populus: ['pappel', 'poplar', 'aspen', 'haab', 'haapa', 'populier'],
  Ulmus: ['ulme', 'rüster', 'elm', 'jalakas', 'jalava', 'iep'],
  Alnus: ['erle', 'alder', 'lepp', 'leppä', 'els'],
  Carpinus: ['hainbuche', 'weissbuche', 'hornbeam', 'valgepöök', 'valkopyökki', 'haagbeuk'],
  Robinia: ['robinie', 'akazie', 'locust', 'robinia', 'valeakaasia'],
  Sorbus: ['eberesche', 'vogelbeere', 'rowan', 'pihlakas', 'pihlaja', 'lijsterbes'],
  Prunus: ['kirsche', 'cherry', 'toomingas', 'kirsikka'],
  Malus: ['apfel', 'apple', 'õunapuu', 'ounapuu', 'omenapuu'],
  Larix: ['lärche', 'laerche', 'larch', 'lehis', 'lehtikuusi'],
  Corylus: ['hasel', 'hazel', 'sarapuu', 'pähkinäpensas'],
  Crataegus: ['weissdorn', 'hawthorn', 'viirpuu', 'orapihlaja'],
  Castanea: ['edelkastanie', 'sweet chestnut', 'kastanje']
};
/* [latin, common] pairs whose name contains what was said */
function speciesMatches(said) {
  const q = vNorm(said).replace(/\b(baum|tree|puu|boom)\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q || q.length < 3) return [];
  const list = (typeof SPECIES !== 'undefined') ? SPECIES : [];
  const hit = [];
  list.forEach(sp => {
    const lat = vNorm(sp[0]), com = vNorm(sp[1] || '');
    if (lat === q || com === q) hit.unshift(sp);                      // an exact name wins
    else if (lat.indexOf(q) >= 0 || com.indexOf(q) >= 0) hit.push(sp);
  });
  if (hit.length) return hit;
  /* nothing by name: try the genus somebody actually said */
  const gen = Object.keys(GENUS_SAID).find(g => GENUS_SAID[g].some(w => q === w || q.indexOf(w) >= 0));
  return gen ? list.filter(sp => sp[0].split(' ')[0] === gen) : [];
}

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
/* "two", "kaksi", "tyydyttävä", "gut" -> '1'..'4' */
function grade4Of(str) {
  const t = vNorm(str).replace(/\b(luokka|klasse|klass|class)\b/g, ' ').trim();
  const words = { 'hyvä': 1, 'tyydyttävä': 2, 'välttävä': 3, 'huono': 4, gut: 1, befriedigend: 2, ausreichend: 3, schlecht: 4,
                  good: 1, fair: 2, satisfactory: 2, sufficient: 3, poor: 4, hea: 1, rahuldav: 2, kesine: 3, halb: 4 };
  if (words[t]) return String(words[t]);
  const n = wordsToNumber(t);
  return (n >= 1 && n <= 4) ? String(n) : null;
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
  const m = t.match(/^(?:baum|tree|boom|arbre|puu)\s+(.+)$/);   // puu is both Estonian and Finnish
  if (m) { const n = wordsToNumber(m[1]); if (n != null) return { act: 'tree', n: n }; }

  // "Art Birke", "species birch": the species is the one field whose value is
  // a name rather than a word from a list
  const sm = t.match(/^(?:art|baumart|species|spezies|liik|laji|soort|essence)\s+(.+)$/);
  if (sm) return { act: 'species', q: sm[1] };

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
    if (f.kind === 'grade4') {
      const n = grade4Of(rest);
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

  // a bare name while the species is the open question - but only if it is
  // one: otherwise every misheard sentence becomes "I do not know that
  // species", and the line swallows the whole conversation
  if (ctx && ctx.asking === 'species' && speciesMatches(t).length) return { act: 'species', q: t, bare: true };

  // a bare value while a question is open: "zwei", "gering", "sofort"
  if (ctx && ctx.asking) {
    const f = VOICE_FIELDS.find(x => x.k === ctx.asking);
    if (f && f.kind === 'roman') { const n = romanOf(t); if (n) return { act: 'set', k: f.k, v: n, kind: 'opt' }; }
    if (f && f.kind === 'grade4') { const n = grade4Of(t); if (n) return { act: 'set', k: f.k, v: n, kind: 'opt' }; }
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
const LANG_TAG = { en: 'en-GB', de: 'de-DE', nl: 'nl-NL', et: 'et-EE', fi: 'fi-FI' };
const LANG_SAY = { 'en-GB': 'English', 'de-DE': 'Deutsch', 'nl-NL': 'Nederlands',
                   'et-EE': 'Eesti', 'fi-FI': 'Suomi' };
const LANG_ROUND = ['de-DE', 'en-GB', 'et-EE', 'fi-FI', 'nl-NL'];
/* Which language the phone listens in: the app's, and nothing else.

   It used to be a setting of its own, which meant the app had three
   languages to set and the third one was buried in the settings. It is now
   the one the whole app is in - which, left alone, is the phone's own
   language, because that is the language its owner speaks. The button on the
   microphone bar is still there and still works in the field with one tap;
   it moves the whole app, not just the ear.

   Listening is not restricted to that language. The words of all five are in
   the parser at once, so an English sentence is understood by an Estonian
   form and stored as the same value. Only the recogniser - the thing that
   turns sound into letters - has to be told one language, and getting that
   one wrong is what "it does not hear me" looks like from outside. */
function voiceLang() {
  return LANG_TAG[(typeof uiLang === 'function') ? uiLang() : 'en'] || 'en-GB';
}
function voiceLangNext() {
  const cur = voiceLang();
  const i = LANG_ROUND.indexOf(cur);
  return LANG_ROUND[(i + 1) % LANG_ROUND.length];
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
/* Speaking and listening take turns.

   On a phone the recogniser holds the microphone and the synthesiser holds the
   speaker, and on Android the two fight: an utterance started while the
   recogniser is running is dropped without a word, which is exactly what "the
   phone says nothing" looks like from the outside. So the microphone is closed
   before every sentence and opened again after it, and a watchdog opens it
   again anyway when the browser forgets to say the sentence ended. */
let vSpeaking = false;
function micStop() {
  if (!vRec) return;
  try { vRec.onend = null; vRec.abort ? vRec.abort() : vRec.stop(); } catch (e) {}
}
/* The microphone either starts or it does not, and until now it did not say
   which. Every failure went into an empty catch: no permission, no network,
   no recogniser - the button was pressed, nothing happened, and voice was
   "broken". An InvalidStateError only means it is already listening, which is
   fine; anything else is reported where it can be seen. */
function micStart() {
  if (!vOn || !vRec || vSpeaking) return;
  vRec.onend = () => { if (vOn && !vSpeaking) setTimeout(micStart, 250); };
  try { vRec.start(); }
  catch (e) {
    if (e && e.name === 'InvalidStateError') return;     // already listening
    voiceFailed((e && e.message) || String(e));
  }
}
/* Said in the one place the eye is: inside AR that is the bar under the
   thumb, outside it the voice bar and a toast. Written to the measurement
   trace too, so "voice does not work" arrives with a reason next time. */
function voiceFailed(why) {
  vOn = false;
  try { if (typeof mlog === 'function') mlog('voice did not start - ' + why); } catch (e) {}
  const de = voiceLang().startsWith('de');
  const head = de ? 'Das Mikrofon startet nicht' : 'The microphone will not start';
  try { speechBar(head, 'bad', why); } catch (e) {}
  const body = '<b>' + head + '</b><br>' + esc(why) +
    (de ? '<br>Chrome erkennt Sprache auf einem Server: ohne Netz geht es gar nicht. ' +
          'Und das Mikrofon muss für diese Seite erlaubt sein.'
        : '<br>Chrome recognises speech on a server: with no signal it cannot work ' +
          'at all. And the microphone has to be allowed for this site.');
  try {
    if (typeof mode !== 'undefined' && mode === 'WebXR' && typeof mbar === 'function')
      mbar(body, [['Close', typeof clearMeasure === 'function' ? clearMeasure : function () {}]]);
    else toast(head + ' – ' + why);
  } catch (e) {}
}
function say(text, cb) {
  const done = () => { vSpeaking = false; micStart(); if (cb) cb(); };
  speechSay(text, done);
}
/* The sentence itself, with no microphone in it - used by the test button too. */
function speechSay(text, done) {
  if (!('speechSynthesis' in window)) { if (done) done(); return; }
  vSpeaking = true; micStop();
  let over = false;
  const finish = () => { if (over) return; over = true; if (done) done(); else vSpeaking = false; };
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = voiceLang(); u.rate = 1.0; u.volume = 1;
    u.onend = finish; u.onerror = finish;
    speechSynthesis.speak(u);
    // Chrome on Android pauses the queue when the page loses focus for a moment
    setTimeout(() => { try { speechSynthesis.resume(); } catch (e) {} }, 120);
    // and sometimes never fires onend at all
    setTimeout(finish, 1400 + String(text).length * 75);
  } catch (e) { finish(); }
}

/* A Latin name is read badly by a German voice and worse by an English one;
   the common name, when there is one, is what a person wants to hear. */
function speciesSpoken(p) {
  const de = voiceLang().startsWith('de');
  const cn = (p.name_en || '').trim(), sp = (p.species || '').trim();
  if (!sp && !cn) return de ? 'Art nicht erfasst' : 'species not recorded';
  return cn ? (cn + (sp ? ', ' + sp : '')) : sp;
}

/* ---- the runtime -------------------------------------------------------
   The shape of it: the phone says it is listening, names the tree, then walks
   the form one line at a time. Every line is read out with the words that
   answer it, so nobody has to remember the vocabulary. "Weiter" and "zurück"
   move along the line; naming a field jumps to it; a value answers the line
   that is open. Anything that does not fit is a question, not a shrug. */
let vRec = null, vOn = false, vTree = null, vAsking = null, vPendingText = null;
let vFields = [], vAt = -1, vPendSpecies = null, vMiss = 0;

function speechOk() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
function ttsOk() { return 'speechSynthesis' in window; }
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
/* Every line the voice can fill on this tree, in the order the form shows
   them, with the species at the front because it is what is asked first. */
function speechWalk(i) {
  const n = curNorm();
  const out = n.quick.filter(k => k === 'species' || VOICE_FIELDS.some(f => f.k === k));
  if (out.indexOf('species') < 0) out.unshift('species');
  return out;
}
function vLabel(k) { return k === 'species' ? nameIn('species') : nameIn(k); }
function vAsk(k) {
  if (k === 'species') {
    const de = voiceLang().startsWith('de');
    return de ? 'Art? Zum Beispiel Birke oder Winterlinde.' : 'Species? For example birch, or small-leaved lime.';
  }
  const f = VOICE_FIELDS.find(x => x.k === k);
  return f ? askIn(f) : vLabel(k) + '?';
}
function vValueSaid(k, p) {
  const v = p[k];
  if (v == null || v === '') return null;
  return k === 'species' ? speciesSpoken(p) : valueIn(k, v);
}

function speechBar(txt, cls, sub) {
  let el = document.getElementById('speechbar');
  if (!el) { el = document.createElement('div'); el.id = 'speechbar'; document.body.appendChild(el); }
  const want = (typeof mode !== 'undefined' && mode === 'WebXR') ? document.getElementById('xrbot') : document.body;
  if (want && el.parentNode !== want) want.appendChild(el);
  el.className = cls || '';
  el.innerHTML =
    '<span class="dot"></span>' +
    '<span class="t"><b>' + txt + '</b>' + (sub ? '<i>' + sub + '</i>' : '') + '</span>' +
    '<button class="sm" id="speechLang" title="the language you are speaking">' +
      (voiceLang().slice(0, 2).toUpperCase()) + '</button>' +
    '<button class="sm" id="speechBack" title="back">◀</button>' +
    '<button class="sm" id="speechNext" title="next">▶</button>' +
    '<button class="x sm" id="speechOff">Stop</button>';
  el.style.display = 'flex';
  const b = document.getElementById('speechBack'); if (b) b.onclick = () => vStep(-1);
  const n = document.getElementById('speechNext'); if (n) n.onclick = () => vStep(1);
  const lg = document.getElementById('speechLang'); if (lg) lg.onclick = speechCycleLang;
  const off = document.getElementById('speechOff'); if (off) off.onclick = speechStop;
}
/* One tap on the bar: the next language for the whole app, the recogniser
   restarted on it, and the phone says which one it is now so the choice is
   audible as well. The labels on the form move with it - the man who taps
   this is standing in front of a tree and wants everything in that language,
   not only the ear. */
function speechCycleLang() {
  const nx = voiceLangNext();
  setPref('lang', nx.slice(0, 2));
  if (typeof langChanged === 'function') langChanged();
  vMiss = 0;
  speechBar(vBarHead(), '', LANG_SAY[nx]);
  if (vOn && vRec) { micStop(); vRec.lang = nx; micStart(); }
  say(LANG_SAY[nx] + '.');
}
function vHeardOnBar(txt) {
  const el = document.getElementById('speechbar'); if (!el) return;
  const t = el.querySelector('.t i');
  if (t) t.textContent = '“' + txt + '”'; else speechBar(vBarHead(), '', '“' + txt + '”');
}
function vBarHead() {
  if (vAt < 0 || !vFields[vAt]) return voiceLang().startsWith('de') ? 'Sprachsteuerung an' : 'Voice on';
  return vLabel(vFields[vAt]) + '  (' + (vAt + 1) + '/' + vFields.length + ')';
}

function speechStart(i) {
  if (vOn) return speechStop();
  if (!speechOk()) {
    if (ttsOk()) speechSay(voiceLang().startsWith('de')
      ? 'Dieser Browser hört nicht zu. Chrome für Android kann es.'
      : 'This browser cannot listen. Chrome on Android can.');
    return toast('This browser has no speech recognition. Chrome on Android does.');
  }
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  vRec = new R();
  vRec.lang = voiceLang(); vRec.continuous = true; vRec.interimResults = true; vRec.maxAlternatives = 3;
  vRec.onresult = ev => {
    const r = ev.results[ev.results.length - 1];
    if (!r) return;
    if (!r.isFinal) { vHeardOnBar('… ' + (r[0] && r[0].transcript || '')); return; }
    const alts = []; for (let k = 0; k < r.length; k++) alts.push(r[k].transcript);
    speechHeard(alts);
  };
  vRec.onerror = ev => {
    const de = voiceLang().startsWith('de');
    if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed')
      return voiceFailed(de ? 'Das Mikrofon ist für diese Seite nicht erlaubt.'
                            : 'The microphone is not allowed for this site.');
    if (ev.error === 'network')
      return voiceFailed(de ? 'Kein Netz – die Erkennung läuft auf einem Server.'
                            : 'No signal – the recogniser runs on a server.');
    if (ev.error === 'audio-capture')
      return voiceFailed(de ? 'Kein Mikrofon gefunden.' : 'No microphone found.');
  };
  vOn = true; vTree = i == null ? (typeof openIdx !== 'undefined' ? openIdx : null) : i;
  vAsking = null; vPendingText = null; vPendSpecies = null; vFields = []; vAt = -1;
  micStart();
  const de = voiceLang().startsWith('de');
  speechBar(de ? 'Sprachsteuerung an' : 'Voice on', '',
            (de ? 'Hört auf ' : 'Listening in ') + LANG_SAY[voiceLang()] +
            (de ? '. Wert, „weiter“, „zurück“, „stop“.' : '. Value, “next”, “back”, “stop”.'));
  auditAdd({ what: 'voice on' });
  if (vTree != null) speechAnnounce(vTree);
  else say(de ? 'Sprachsteuerung an. Welcher Baum?' : 'Voice on. Which tree?');
}
function speechStop() {
  const was = vOn;
  vOn = false; vAsking = null; vPendingText = null; vPendSpecies = null; vAt = -1;
  micStop(); vRec = null;
  vRowMark(null);
  const el = document.getElementById('speechbar'); if (el) el.style.display = 'none';
  try { speechSynthesis.cancel(); } catch (e) {}
  vSpeaking = false;
  if (was) auditAdd({ what: 'voice off' });
}

/* The tree is named, what is already known is read back, and the walk starts
   at the first line nobody has answered. */
function speechAnnounce(i) {
  vTree = i;
  const p = props(i), de = voiceLang().startsWith('de');
  vFields = speechWalk(i);
  const open = speechOpenFields(i);
  const known = vFields.map(k => vValueSaid(k, p) ? vLabel(k) + ' ' + vValueSaid(k, p) : null)
                       .filter(Boolean).slice(0, 2).join(', ');
  /* The language is the first thing to say: it is the one setting that makes
     the difference between an app that listens and one that seems deaf. */
  const head = (de ? 'Sprachsteuerung an, ' : 'Voice on, ') + LANG_SAY[voiceLang()] + '. ' +
               (de ? 'Baum ' : 'Tree ') + (p.tag_no || p.tree_id) + '. ' +
               (known ? known + '. ' : (de ? 'Nichts erfasst. ' : 'Nothing recorded. '));
  speechBar(vBarHead(), '', (p.tag_no || p.tree_id) + ' · ' +
            (open.length ? open.length + (de ? ' offen' : ' open') : (de ? 'vollständig' : 'complete')));
  const first = vFields.findIndex(k => !vValueSaid(k, p));
  vAt = (first < 0 ? 0 : first) - 1;
  say(head, () => vStep(1));
}
/* One line forward or back, read out with the words that answer it. */
function vStep(d) {
  if (!vOn || vTree == null) return;
  if (!vFields.length) vFields = speechWalk(vTree);
  const n = vFields.length;
  let at = vAt + d;
  if (at >= n) {
    const de = voiceLang().startsWith('de');
    vAt = n - 1; vAsking = null; vRowMark(null);
    speechBar(de ? 'Ende der Liste' : 'End of the list', '', de ? '„zurück“, „speichern“ oder „stop“' : '“back”, “save” or “stop”');
    say(de ? 'Das war die letzte Zeile. Speichern?' : 'That was the last line. Save?');
    return;
  }
  if (at < 0) at = 0;
  vAt = at;
  const k = vFields[at];
  vAsking = k;
  vRowMark(k);
  const p = props(vTree);
  const had = vValueSaid(k, p);
  speechBar(vBarHead(), '', had ? (voiceLang().startsWith('de') ? 'jetzt: ' : 'now: ') + had : '');
  say(vAsk(k) + (had ? ' ' + (voiceLang().startsWith('de') ? 'Jetzt: ' : 'Currently: ') + had + '.' : ''));
}
/* The line being asked, marked in the form and scrolled under the thumb. */
function vRowMark(k) {
  if (typeof panelEl === 'undefined' || !panelEl) return;
  panelEl.querySelectorAll('.row.asking').forEach(r => r.classList.remove('asking'));
  if (!k) return;
  const inp = panelEl.querySelector('[data-k="' + k + '"]');
  const row = inp && inp.closest ? inp.closest('.row') : null;
  if (!row) return;
  row.classList.add('asking');
  try { row.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { }
}

function speechHeard(alts) {
  const de = voiceLang().startsWith('de');
  vHeardOnBar(alts[0]);
  /* A question the phone asked outranks everything: while it is waiting to be
     told which birch, "one" is the first birch and not tree number one. */
  if (vAsking === '__species' && vPendSpecies) return vPickSpecies(alts[0]);
  if (vAsking === '__confirm' && vPendingText != null) return vConfirmText(alts[0]);
  const ctx = { fields: speechFieldsNow(), open: vTree != null ? speechOpenFields(vTree) : [], asking: vAsking };
  let a = null;
  for (const t of alts) { a = voiceParse(t, ctx); if (a.act !== 'unknown') break; }
  if (a.act !== 'unknown') vMiss = 0;
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
    case 'species': {
      if (vTree == null) { say(de ? 'Erst den Baum nennen.' : 'Name the tree first.'); return; }
      const hits = speciesMatches(a.q);
      if (!hits.length) {
        say((de ? 'Die Art kenne ich nicht: ' : 'I do not know that species: ') + a.q);
        vMiss++; return;
      }
      if (hits.length === 1) { vSetSpecies(hits[0]); return; }
      if (hits.length > 4) { say(de ? 'Zu viele Treffer. Genauer bitte.' : 'Too many matches. Be more precise.'); return; }
      vPendSpecies = hits; vAsking = '__species';
      const list = hits.map((h, n) => (n + 1) + ': ' + (h[1] || h[0])).join(', ');
      speechBar(vBarHead(), 'ask', list);
      say((de ? 'Welche? ' : 'Which one? ') + list);
      return;
    }
    case 'set': {
      if (vTree == null) { say(de ? 'Erst den Baum nennen.' : 'Name the tree first.'); return; }
      if (a.kind === 'text') {
        vPendingText = a.v;
        vAsking = '__confirm';
        speechBar(vBarHead(), 'ask', '“' + a.v + '” – ' + (de ? 'richtig?' : 'correct?'));
        say((de ? 'Bemerkung: ' : 'Remark: ') + a.v + (de ? '. Richtig?' : '. Correct?'));
        return;
      }
      speechApply(vTree, a.k, a.v);
      const at = vFields.indexOf(a.k); if (at >= 0) vAt = at;
      say(nameIn(a.k) + ' ' + valueIn(a.k, a.v) + '.', () => vStep(1));
      return;
    }
    case 'ask': {                                  // a field named without a value
      const at = vFields.indexOf(a.k);
      if (at >= 0) { vAt = at - 1; vStep(1); return; }
      vAsking = a.k; say(vAsk(a.k));
      return;
    }
    case 'next': vStep(1); return;
    case 'back': vStep(-1); return;
    case 'help': {
      say(de ? 'Sagen Sie einen Wert für die Zeile, oder weiter, zurück, wiederholen, Art Birke, Baum 51, Foto, speichern, stop.'
             : 'Say a value for the line, or next, back, repeat, species birch, tree 51, photo, save, stop.');
      return;
    }
    case 'repeat': {
      if (vAt >= 0 && vFields[vAt]) { const k = vFields[vAt]; vAsking = k; say(vAsk(k)); }
      else if (vTree != null) speechAnnounce(vTree);
      return;
    }
    case 'save': if (vTree != null) { savePanel(true); say(de ? 'Gespeichert.' : 'Saved.'); } return;
    case 'photo': if (vTree != null) takePhotoOf(vTree, null); return;
    case 'stop': say(de ? 'Sprache aus.' : 'Voice off.'); setTimeout(speechStop, 700); return;
    case 'which': {
      const v = (typeof treeInView === 'function') ? treeInView() : null;
      say(v ? ((de ? 'Vermutlich ' : 'Probably ') + tid(v.i)) : (de ? 'Nicht ausgerichtet.' : 'Not aligned.'));
      return;
    }
    default: return vMissed();
  }
}
function vMissed() {
  const de = voiceLang().startsWith('de');
  {
    {
      /* Three in a row and the words are not the problem: the recogniser is
         listening in a language nobody in this wood is speaking. Say so, and
         say where the switch is, instead of asking the same question again
         until the battery is flat. */
      vMiss++;
      if (vMiss >= 3) {
        vMiss = 0;
        const nx = LANG_SAY[voiceLangNext()];
        speechBar(vBarHead(), 'ask', (de ? 'Sprache: ' : 'Language: ') + LANG_SAY[voiceLang()] +
                  (de ? ' – auf ' : ' – tap ') + voiceLang().slice(0, 2).toUpperCase() +
                  (de ? ' tippen für ' : ' for ') + nx);
        say(de ? 'Ich höre auf ' + LANG_SAY[voiceLang()] + ' zu. Tippen Sie auf das Sprachfeld in der Leiste, wenn Sie eine andere sprechen.'
               : 'I am listening in ' + LANG_SAY[voiceLang()] + '. Tap the language on the bar if you speak another.');
        return;
      }
      if (vAt >= 0 && vFields[vAt]) {
        say((de ? 'Nicht verstanden. ' : 'Not understood. ') + vAsk(vFields[vAt]));
        return;
      }
      say(de ? 'Nicht verstanden. Sagen Sie Hilfe.' : 'Not understood. Say help.');
    }
  }
}
/* Which of the candidates was meant: the number said, or a word that only one
   of them carries. */
function vPickSpecies(heard) {
  const de = voiceLang().startsWith('de'), t = vFix(heard);
  const n = wordsToNumber(t);
  let pick = (n != null && n >= 1 && n <= vPendSpecies.length) ? vPendSpecies[n - 1] : null;
  if (!pick) {
    const hit = vPendSpecies.filter(h => vNorm(h[0]).indexOf(vNorm(t)) >= 0 || vNorm(h[1] || '').indexOf(vNorm(t)) >= 0);
    if (hit.length === 1) pick = hit[0];
  }
  if (!pick) { say(de ? 'Nicht verstanden. Sagen Sie die Nummer.' : 'Not understood. Say the number.'); return; }
  vSetSpecies(pick);
}
function vSetSpecies(sp) {
  speechApply(vTree, 'species', sp[0]);
  if (sp[1]) speechApply(vTree, 'name_en', sp[1]);
  vPendSpecies = null; vAsking = null;
  const at = vFields.indexOf('species'); if (at >= 0) vAt = at;
  say((voiceLang().startsWith('de') ? 'Art: ' : 'Species: ') + (sp[1] || sp[0]) + '.', () => vStep(1));
}
function vConfirmText(heard) {
  const de = voiceLang().startsWith('de'), t = vFix(heard);
  if (/^(ja|richtig|stimmt|yes|correct|ok|jah|kyllä)/.test(t)) {
    speechApply(vTree, 'remarks', vPendingText); vPendingText = null; vAsking = null;
    const at = vFields.indexOf('remarks'); if (at >= 0) vAt = at;
    say(de ? 'Notiert.' : 'Noted.', () => vStep(1)); return;
  }
  vPendingText = null; vAsking = 'remarks';
  say(de ? 'Verworfen. Bemerkung?' : 'Dropped. Remarks?');
}

/* The walk follows the finger too. Somebody who taps a value into the line
   that is being asked has answered it, and waiting to be pressed forward is
   the app making work for a man with one hand full. The flag keeps the
   change event the voice itself fires from advancing twice. */
let vApplying = false;
function vFollowEdit(k) {
  if (!vOn || vApplying || vTree == null || !k) return;
  const at = vFields.indexOf(k);
  if (at < 0 || at !== vAt) return;            // some other line was edited: stay put
  setTimeout(() => { if (vOn) vStep(1); }, 350);
}

/* Written the way a finger would: into the form field if it is on screen,
   so the autoscroll and the verdict follow, else straight to the record. */
function speechApply(i, k, v) {
  const inp = (typeof panelEl !== 'undefined' && panelEl && openIdx === i) ? panelEl.querySelector('[data-k="' + k + '"]') : null;
  if (inp) {
    vApplying = true;
    inp.value = String(v);
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    savePanel(true);
    vApplying = false;
  } else {
    const patch = {}; patch[k] = v; setEdit(i, patch);
  }
  auditAdd({ what: 'voice set', tree: tid(i), detail: k + ' = ' + v });
}
