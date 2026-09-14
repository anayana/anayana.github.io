/* ============================================================================
   READING SOMEBODY ELSE'S TREE REGISTER

   Every municipality names its columns differently, and none of them asked us.
   Berlin writes art_bot and kennzeich, Vienna baumnummer and gattung_art,
   Amsterdam boomnummer and boomsoort, London gla_tree_group and taxon_name,
   New York spc_latin and tree_dbh. The data underneath is the same handful of
   facts.

   So the file is not parsed against a fixed schema. Each incoming column is
   scored against every field the app knows, in five languages, and the best
   guess is offered to the inspector BEFORE anything is imported. Nothing is
   written until a human has looked at the table and said yes. A guess that is
   silently wrong is worse than no guess at all: it puts a stem diameter in the
   height column and nobody notices for a year.
   ========================================================================= */

/* ---- synonyms ----------------------------------------------------------
   Lower case, punctuation stripped. Order does not matter; the scorer
   handles exact hits, prefixes and contained words separately. */
const COLSYN = {
  tree_id: ['puu_id', 'puuid', 'objekt_id', 'kood', 'puu_nr', 'nr_kaardil', 'tree_id', 'treeid', 'id', 'nr', 'baum_id', 'baumid', 'baumnummer', 'baum_nr', 'baumnr',
            'gla_tree_group', 'tree_group', 'treegroup', 'asset_id', 'assetid',
            'kennzeich', 'kennzeichen', 'standortnr', 'standort_nr', 'boomnummer', 'boom_id',
            'objectid', 'objnr', 'inventarnr', 'nummer', 'no', 'ref', 'unique_id', 'gid'],
  tag_no: ['silt', 'sildi_nr', 'tag_no', 'tagno', 'schild', 'schildnr', 'plakette', 'plaketten_nr', 'baumschild',
           'plaatje', 'label', 'tag', 'plate', 'plaquette'],
  species: ['liik', 'puuliik', 'taksoni_nimi', 'ladina_nimi', 'liik_lad', 'liik_ladina', 'taimeliik', 'species', 'art', 'baum', 'baumart', 'art_bot', 'artbot', 'botanischer_name', 'botanical_name', 'lat_name',
            'latname', 'spc_latin', 'taxon_name', 'taxon', 'wiss_name', 'gattung_art',
            'gattungart', 'gattung', 'boomsoort', 'soort', 'latijnse_naam', 'nom_latin',
            'especie', 'scientific_name', 'sciname', 'botanic'],
  name_en: ['liik_eesti', 'eesti_nimi', 'eestikeelne_nimi', 'nimetus', 'name_en', 'common_name', 'commonname', 'art_dtsch', 'artdtsch', 'deutscher_name',
            'trivialname', 'spc_common', 'nederlandse_naam', 'nom_commun', 'volksname'],
  lat: ['laius', 'laiuskraad', 'y_lest', 'lat', 'latitude', 'breite', 'y', 'y_coord', 'ycoord', 'geo_breite', 'wgs84_lat',
        'nord', 'northing', 'breitengrad'],
  lon: ['pikkuskraad', 'x_lest', 'lon', 'lng', 'long', 'longitude', 'laenge', 'länge', 'x', 'x_coord', 'xcoord',
        'geo_laenge', 'wgs84_lon', 'ost', 'easting', 'laengengrad'],
  planted: ['istutusaasta', 'istutatud', 'istutamise_aasta', 'planted', 'pflanzjahr', 'pflanzdatum', 'standalter', 'jahr', 'year_planted',
            'plantjaar', 'planting_year', 'pflanzung', 'baumjahr', 'annee_plantation'],
  girth_cm: ['umbermoot', 'ümbermõõt', 'tyve_umbermoot', 'tüve_ümbermõõt', 'rinnasumbermoot', 'girth_cm', 'girth', 'stammumfg', 'stammumfang', 'umfang', 'umfg', 'stamomtrek',
             'omtrek', 'circumference', 'circonference'],
  dbh_cm: ['labimoot', 'läbimõõt', 'tyve_labimoot', 'tüve_läbimõõt', 'rinnasdiameeter', 'rinnasdiam', 'dbh_cm', 'dbh', 'bhd', 'stammdurchmesser', 'durchmesser', 'tree_dbh', 'diameter',
           'diam', 'stamdiameter', 'dbh_mm', 'd13', 'bhd_cm', 'diametre'],
  height_m: ['korgus', 'kõrgus', 'puu_korgus', 'puu_kõrgus', 'height_m', 'height', 'baumhoehe', 'baumhöhe', 'hoehe', 'höhe', 'tree_height',
             'boomhoogte', 'hoogte', 'hauteur', 'altura'],
  crown_d_m: ['vora_labimoot', 'võra_läbimõõt', 'vora', 'võra', 'vora_laius', 'crown_d_m', 'kronendurchmesser', 'krone', 'kronendm', 'crown_diameter',
              'crown_spread', 'kroondiameter', 'kroon', 'couronne'],
  crown_base_m: ['crown_base_m', 'kronenansatz', 'kronansatz', 'crown_base', 'kroonaanzet'],
  area: ['linnaosa', 'asum', 'aadress', 'tanav', 'tänav', 'asukoht', 'area', 'bezirk', 'ortsteil', 'revier', 'gebiet', 'stadtteil', 'district', 'borough',
         'wijk', 'buurt', 'zone', 'quartier', 'strasse', 'straße', 'street', 'address',
         'adresse', 'standort', 'location', 'locatie', 'lage'],
  vitality_roloff: ['vitality_roloff', 'vitalitaet', 'vitalität', 'vitalitaetsstufe', 'roloff',
                    'vitalitaetsklasse'],
  vitality_5: ['seisund', 'seisukord', 'tervislik_seisund', 'elujoulisus', 'elujõulisus', 'vitality_5', 'vitality', 'condition', 'health', 'zustand', 'conditie',
               'baumzustand', 'zustandsklasse', 'etat'],
  crown_dieback_pct: ['crown_dieback_pct', 'kronenverlichtung', 'totholz', 'dieback',
                      'kronenschaden', 'blattverlust', 'defoliation'],
  damage_class: ['kahjustus', 'kahjustused', 'kahjustuse_aste', 'damage_class', 'schadstufe', 'schadensklasse', 'schaden', 'damage',
                 'schade', 'schadeklasse', 'problems'],
  traffic_safety: ['traffic_safety', 'verkehrssicherheit', 'verkehrssicher', 'vs',
                   'sicherheit', 'veiligheid'],
  bvc_result: ['bvc_result', 'bvc', 'boomveiligheidscontrole', 'uitkomst', 'resultaat',
               'attentieboom', 'risicoboom'],
  urgency: ['urgency', 'dringlichkeit', 'prioritaet', 'priorität', 'priority', 'prioriteit',
            'frist', 'urgentie'],
  actions: ['actions', 'massnahme', 'maßnahme', 'massnahmen', 'maßnahmen', 'action',
            'empfehlung', 'maatregel', 'maatregelen', 'work', 'works', 'pflegemassnahme'],
  inspection_type: ['inspection_type', 'kontrollart', 'art_der_kontrolle', 'controletype',
                    'inspection', 'kontrolltyp'],
  last_inspection: ['kuupaev', 'kuupäev', 'inventeerimise_kuupaev', 'inventeerimise_kuupäev', 'inventeeritud', 'last_inspection', 'kontrolldatum', 'letzte_kontrolle', 'datum',
                    'date', 'inspection_date', 'controledatum', 'erfassungsdatum',
                    'created_at', 'aufnahmedatum', 'begehung'],
  next_inspection: ['next_inspection', 'naechste_kontrolle', 'nächste_kontrolle', 'wiedervorlage',
                    'folgekontrolle', 'volgende_controle', 'due', 'next_due'],
  interval_months: ['interval_months', 'intervall', 'kontrollintervall', 'turnus', 'interval',
                    'cyclus', 'frequency'],
  inspector: ['inventeerija', 'dendroloog', 'koostaja', 'inspector', 'kontrolleur', 'bearbeiter', 'pruefer', 'prüfer', 'sachbearbeiter',
              'controleur', 'surveyor', 'assessor', 'erfasser'],
  remarks: ['markus', 'märkus', 'markused', 'märkused', 'kommentaar', 'remarks', 'bemerkung', 'bemerkungen', 'anmerkung', 'notiz', 'kommentar',
            'opmerking', 'opmerkingen', 'notes', 'note', 'comment', 'comments', 'freitext'],
  position_accuracy_m: ['position_accuracy_m', 'lagegenauigkeit', 'genauigkeit', 'accuracy',
                        'nauwkeurigheid', 'gps_acc']
};

/* Columns that are real data but not ours: kept on the tree as-is so nothing
   is lost, rather than silently dropped. */
const KEEP_PREFIX = 'src_';

function normKey(s) {
  return String(s == null ? '' : s).toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/õ/g, 'o').replace(/[éèê]/g, 'e').replace(/[áàâ]/g, 'a').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/* ---- scoring one column name against one field ------------------------
   0 = no relation, 100 = certain. Deliberately conservative: a contained
   word scores low, because "baumhoehe_ueber_grund" and "hoehe_ueber_nn" are
   not the same thing and the inspector should look. */
function scoreCol(col, key) {
  const c = normKey(col);
  if (!c) return 0;
  /* A column actually called tree_id is tree_id, even though "id" is a synonym
     of it too and scores just as well. The canonical name outranks every
     synonym so the two never have to be separated by sort order. */
  if (c === normKey(key)) return 105;
  const syn = COLSYN[key] || [];
  let best = 0;
  for (const raw of syn) {
    const s = normKey(raw);
    if (!s) continue;
    if (c === s) { best = Math.max(best, 100); continue; }
    if (c.startsWith(s + '_') || c.endsWith('_' + s)) { best = Math.max(best, 82); continue; }
    if (('_' + c + '_').indexOf('_' + s + '_') >= 0) { best = Math.max(best, 78); continue; }
    if (s.length >= 5 && c.indexOf(s) >= 0) { best = Math.max(best, 58); continue; }
    if (c.length >= 5 && s.indexOf(c) >= 0) best = Math.max(best, 52);
  }
  return best;
}

/* ---- does the content agree with the guess? ---------------------------
   A column called "nummer" full of decimals between 0 and 3 is more likely a
   vitality class than an identifier. The values get a vote. */
function contentHint(key, vals) {
  const v = vals.filter(x => x != null && String(x).trim() !== '').slice(0, 60);
  if (!v.length) return 0;
  const nums = v.map(x => parseFloat(String(x).replace(',', '.'))).filter(x => isFinite(x));
  const numeric = nums.length / v.length;
  const within = (lo, hi) => nums.filter(x => x >= lo && x <= hi).length / Math.max(1, nums.length);
  switch (key) {
    case 'lat': return numeric > 0.9 && within(-90, 90) > 0.95 ? 14 : (numeric > 0.9 ? -20 : -30);
    case 'lon': return numeric > 0.9 && within(-180, 180) > 0.95 ? 14 : (numeric > 0.9 ? -20 : -30);
    case 'dbh_cm': return numeric > 0.8 && within(1, 400) > 0.8 ? 10 : -8;
    case 'girth_cm': return numeric > 0.8 && within(3, 1300) > 0.8 ? 10 : -8;
    case 'height_m': return numeric > 0.8 && within(0.5, 80) > 0.8 ? 10 : -8;
    case 'crown_d_m': return numeric > 0.8 && within(0.5, 50) > 0.8 ? 10 : -8;
    case 'planted': return numeric > 0.8 && within(1400, 2100) > 0.8 ? 16 : -14;
    case 'vitality_roloff': return numeric > 0.8 && within(0, 3) > 0.9 ? 16 : -14;
    case 'crown_dieback_pct': return numeric > 0.8 && within(0, 100) > 0.9 ? 8 : -8;
    case 'last_inspection': case 'next_inspection':
      return v.filter(x => /\d{4}-\d{2}-\d{2}|\d{2}[.\/]\d{2}[.\/]\d{4}/.test(String(x))).length / v.length > 0.6 ? 16 : -10;
    case 'tree_id': case 'tag_no':
      return (new Set(v.map(String)).size / v.length) > 0.95 ? 8 : -12;
    case 'species':
      return v.filter(x => /^[A-Z][a-z]+ [a-z]/.test(String(x).trim())).length / v.length > 0.5 ? 18 : 0;
    default: return 0;
  }
}

/* ---- the whole file ---------------------------------------------------
   Returns one row per incoming column: what it is called, what we think it
   is, how sure we are, and three example values so the inspector can judge
   without opening the file elsewhere. */
function planMapping(cols, rows) {
  const keys = Object.keys(COLSYN);
  const taken = {};
  const plan = cols.map(c => {
    const vals = rows.map(r => r[c]);
    let best = null, bestScore = 0, second = 0;
    keys.forEach(k => {
      const sc = scoreCol(c, k);
      if (!sc) return;
      /* the ceiling is above 100 on purpose: a column whose name IS the field
         name must be able to out-score a mere synonym that also scored 100 */
      const total = Math.max(0, Math.min(120, sc + contentHint(k, vals)));
      if (total > bestScore) { second = bestScore; bestScore = total; best = k; }
      else if (total > second) second = total;
    });
    return {
      col: c, key: bestScore >= 50 ? best : '', conf: Math.min(100, Math.round(bestScore)),
      rank: bestScore,
      rival: second >= 50 && bestScore - second < 12,
      sample: vals.filter(v => v != null && String(v).trim() !== '').slice(0, 3).map(String)
    };
  });
  /* one target field can only be filled once: the highest score wins it and
     the others fall back to being kept as source columns */
  plan.sort((a, b) => b.rank - a.rank).forEach(r => {
    if (!r.key) return;
    if (taken[r.key]) { r.dup = taken[r.key]; r.key = ''; r.conf = 0; }
    else taken[r.key] = r.col;
  });

  /* ---- what the values give away -----------------------------------
     A register from a country whose language nobody here speaks has column
     names that match nothing. But "Quercus robur" is a species in every
     language, a number between 1400 and 2100 in every row is a planting year,
     and a column of values between -90 and 90 paired with one between -180 and
     180 is a position. Where a field is still unclaimed, the content alone may
     nominate a column - always flagged, never above 64 %, because this is a
     guess from shape rather than from meaning. */
  const RESCUE = ['species', 'lat', 'lon', 'planted'];
  RESCUE.forEach(k => {
    if (taken[k]) return;
    let pick = null, pickScore = 0;
    plan.forEach(r => {
      if (r.key) return;
      /* a year is a year, but a scan year, a survey date or a load date is
         not a planting year, however well its values fit the range */
      if (k === 'planted' && /(scan|skaneer|aufnahm|erfass|kontroll|inventeer|load|creat|updat|datum|date|kuupaev)/.test(normKey(r.col))) return;
      const vals = rows.map(x => x[r.col]).filter(v => v != null && String(v).trim() !== '');
      if (vals.length < 4) return;            // too few values to tell anything from
      const h = contentHint(k, vals);
      if (h >= 14 && h > pickScore) { pickScore = h; pick = r; }
    });
    if (!pick) return;
    pick.key = k; pick.conf = Math.min(64, 46 + pickScore); pick.rival = true;
    pick.guessed = true; taken[k] = pick.col;
  });

  return cols.map(c => plan.find(r => r.col === c));
}

/* ---- CSV ---------------------------------------------------------------
   Separator sniffed from the header line, quotes per RFC 4180, BOM dropped.
   Municipal exports are semicolon-separated more often than not. */
function parseDelim(text) {
  let t = String(text).replace(/^﻿/, '');
  const head = t.slice(0, t.indexOf('\n') < 0 ? t.length : t.indexOf('\n'));
  const counts = [[';', 0], [',', 0], ['\t', 0], ['|', 0]];
  let q = false;
  for (const ch of head) {
    if (ch === '"') q = !q;
    if (q) continue;
    const hit = counts.find(x => x[0] === ch);
    if (hit) hit[1]++;
  }
  counts.sort((a, b) => b[1] - a[1]);
  const sep = counts[0][1] ? counts[0][0] : ';';
  const rows = [];
  let row = [], cell = '', inQ = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQ) {
      if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
      else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); cell = ''; rows.push(row); row = []; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const clean = rows.filter(r => r.some(x => String(x).trim() !== ''));
  if (!clean.length) throw new Error('the file has no rows');
  const cols = clean[0].map(x => String(x).trim());
  const out = clean.slice(1).map(r => {
    const o = {}; cols.forEach((c, i) => { o[c] = r[i] == null ? '' : String(r[i]).trim(); });
    return o;
  });
  return { cols: cols, rows: out, sep: sep };
}

/* GeoJSON arrives as properties plus a geometry; the geometry is turned into
   two ordinary columns so the same mapping table can describe it. */
function parseGeoJSON(obj) {
  const feats = (obj.features || []).filter(f => f && f.geometry &&
    (f.geometry.type === 'Point' || f.geometry.type === 'MultiPoint'));
  if (!feats.length) throw new Error('no point features in the file');
  const cols = [];
  const rows = feats.map(f => {
    const p = Object.assign({}, f.properties || {});
    const c = f.geometry.type === 'Point' ? f.geometry.coordinates : f.geometry.coordinates[0];
    p.__lon = c[0]; p.__lat = c[1];
    Object.keys(p).forEach(k => { if (cols.indexOf(k) < 0) cols.push(k); });
    return p;
  });
  return { cols: cols, rows: rows, geo: true };
}

function parseRegisterFile(text) {
  const t = String(text).trim();
  if (t.startsWith('{') || t.startsWith('[')) {
    const j = JSON.parse(t);
    if (j.type === 'FeatureCollection' || Array.isArray(j.features)) return parseGeoJSON(j);
    if (Array.isArray(j)) {
      const cols = [];
      j.forEach(o => Object.keys(o || {}).forEach(k => { if (cols.indexOf(k) < 0) cols.push(k); }));
      return { cols: cols, rows: j };
    }
    throw new Error('JSON that is neither GeoJSON nor a list of records');
  }
  return parseDelim(t);
}

/* ---- values ------------------------------------------------------------ */
function coerce(key, raw) {
  const v = String(raw == null ? '' : raw).trim();
  if (v === '') return null;
  const num = () => { const n = parseFloat(v.replace(',', '.')); return isFinite(n) ? n : null; };
  switch (key) {
    case 'lat': case 'lon': case 'dbh_cm': case 'girth_cm': case 'height_m':
    case 'crown_d_m': case 'crown_base_m': case 'crown_dieback_pct':
    case 'position_accuracy_m':
      return num();
    case 'planted': case 'interval_months': {
      const n = num(); return n == null ? null : Math.round(n);
    }
    case 'vitality_roloff': {
      const n = num(); return n == null ? null : Math.max(0, Math.min(3, Math.round(n)));
    }
    case 'last_inspection': case 'next_inspection': {
      const m = v.match(/(\d{2})[.\/](\d{2})[.\/](\d{4})/);
      if (m) return m[3] + '-' + m[2] + '-' + m[1];
      const d = v.match(/(\d{4})-(\d{2})-(\d{2})/);
      return d ? d[0] : v.slice(0, 10);
    }
    case 'actions':
      return v.split(/\s*[;|]\s*|\s*,\s(?=[A-ZÄÖÜ])/).filter(Boolean);
    default:
      return v;
  }
}

/* Turn the confirmed plan into features the register understands. Columns
   with no target are not thrown away - they ride along under src_, so a
   handover back to the client keeps their own fields. */
function applyMapping(parsed, plan, opts) {
  const o = opts || {};
  const feats = [], skipped = [];
  const byKey = {};
  plan.forEach(r => { if (r.key) byKey[r.key] = r.col; });
  parsed.rows.forEach((row, n) => {
    const p = {};
    plan.forEach(r => {
      if (!r.key) {
        const v = String(row[r.col] == null ? '' : row[r.col]).trim();
        if (v !== '' && o.keepUnmapped !== false) p[KEEP_PREFIX + normKey(r.col)] = v;
        return;
      }
      const val = coerce(r.key, row[r.col]);
      if (val != null && val !== '') p[r.key] = val;
    });
    let lon = byKey.lon ? coerce('lon', row[byKey.lon]) : null;
    let lat = byKey.lat ? coerce('lat', row[byKey.lat]) : null;
    if (parsed.geo && row.__lon != null) { lon = +row.__lon; lat = +row.__lat; }
    delete p.lon; delete p.lat;
    if (lon == null || lat == null || !isFinite(lon) || !isFinite(lat) ||
        Math.abs(lat) > 90 || Math.abs(lon) > 180 || (lon === 0 && lat === 0)) {
      skipped.push(p.tree_id || ('row ' + (n + 2))); return;
    }
    if (!p.tree_id) p.tree_id = p.tag_no || ('IMP-' + String(n + 1).padStart(5, '0'));
    p.tree_id = String(p.tree_id);
    if (p.girth_cm && !p.dbh_cm) p.dbh_cm = Math.round(p.girth_cm / Math.PI * 10) / 10;
    if (!p.geometry_source) p.geometry_source = 'imported register';
    feats.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [+(+lon).toFixed(7), +(+lat).toFixed(7)] },
      properties: p
    });
  });
  return { features: feats, skipped: skipped };
}
