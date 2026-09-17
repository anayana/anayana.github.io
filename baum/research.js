/* ============================================================================
   RESEARCH EXPORT

   The interesting part of this app, for anyone building tools, is not the
   inspection. It is what the phone saw while the inspection was made: a
   photograph that somebody labelled with the organ on it and then with a
   species they stood in front of, and a horizontal slice of a trunk measured
   by the depth camera next to the diameter a tape gave for the same tree. One
   is training data for identification, the other is ground truth for measuring
   a stem from a phone. Both are rare because both are expensive to collect,
   and an inspector collects them anyway, as a by-product of the day's work.

   So the app can hand them over - and only if asked. Off until switched on;
   nothing is sent anywhere by itself, ever; the export is a file the surveyor
   saves and gives to whom they choose. What goes in it is the tree and the
   measurement, never the inspection: no name, no remark, no verdict, no
   photograph of a person. The condition ratings can be added on purpose, by a
   second switch, because a tree's vitality is worth something to research too
   and worth nothing at all to anyone it was not given to.
   ========================================================================= */

const K_RES = 'vta_research_v1';
const RES_LICENCE = 'CC BY 4.0';
const RES_CONSENT =
  'I am giving these measurements and photographs for research. I have the ' +
  'right to give them: they were recorded by me, not taken from a register.';

function resCfg() { try { return JSON.parse(lsGet(K_RES)) || {}; } catch (e) { return {}; } }
function resSave(c) { lsSet(K_RES, JSON.stringify(c)); }
function resOn() { return resCfg().on === true; }

/* ---- what the phone is ------------------------------------------------- */
function resDevice() {
  return {
    ua: navigator.userAgent,
    platform: navigator.platform || null,
    screen: [screen.width, screen.height, window.devicePixelRatio || 1],
    memory_gb: navigator.deviceMemory || null,
    webxr: !!navigator.xr,
    depth: depthOk === true,
    app: 'VTA Field ' + APP_VERSION
  };
}

/* ---- the stem scans ----------------------------------------------------
   Written where the caliper finishes, so a scan is kept exactly when the
   diameter it produced was kept. Points are millimetres relative to the
   fitted centre: the plot's own coordinates say where the tree stands, and a
   cloud of absolute metres would only say it again in seven decimal places. */
async function resScanAdd(tree, c, r) {
  if (!resOn() || !c || !c.fit) return null;
  const f = c.fit;
  const mm = v => Math.round(v * 1000);
  const rec = {
    kind: 'scan', tree: tid(tree), ts: new Date().toISOString(),
    height_m: STEM_H, band_m: STEM_BAND,
    centre: [+f.cx.toFixed(3), +f.cy.toFixed(3)],
    fit: { r_mm: mm(f.r), rms_mm: mm(f.rms), n: f.n },
    arc_deg: r.arc, worst_mm: r.worst_mm, frames: c.frames,
    dbh_cm: r.dbh_cm,
    bins: c.bins.slice(),
    /* [dx, dz] in millimetres from the centre, one pair per depth sample */
    points: c.pts.map(p => [mm(p.x - f.cx), mm(p.y - f.cy)]),
    device: resDevice()
  };
  try { return await photoAdd(rec.tree, '', rec); } catch (e) { return null; }
}

/* ---- the bundle --------------------------------------------------------- */
/* Everything a tree may carry into research: what it is and how big, never
   how it was judged. The ratings join only when the second switch says so. */
const RES_TREE = ['tree_id', 'species', 'name_en', 'species_source', 'genus',
  'dbh_cm', 'dbh_source', 'girth_cm', 'height_m', 'crown_d_m', 'planted',
  'geometry_source', 'position_accuracy_m', 'lx', 'ly'];
const RES_RATINGS = ['vitality_roloff', 'vitality_5', 'condition_class',
  'crown_dieback_pct', 'damage_class', 'cavity'];

async function resBundle(opts) {
  const o = opts || {}, c = resCfg();
  let all = [];
  try { all = await photoAll(); } catch (e) {}
  const scans = all.filter(r => r.kind === 'scan');
  const pics = all.filter(r => r.kind !== 'scan' && r.kind !== 'audio' && r.url);
  const own = new Set();
  const trees = [];
  CAT.features.forEach((f, i) => {
    const p = props(i);
    if (!resGiveable(i)) return;
    own.add(p.tree_id);
    const t = { lat: +f.geometry.coordinates[1], lon: +f.geometry.coordinates[0] };
    RES_TREE.forEach(k => { if (p[k] !== undefined && p[k] !== '' && p[k] !== null) t[k] = p[k]; });
    if (o.ratings) RES_RATINGS.forEach(k => { if (p[k] !== undefined && p[k] !== '' && p[k] !== null) t[k] = p[k]; });
    t.country = countryOf(t.lat, t.lon) || null;
    t.norm = curNorm().id;
    trees.push(t);
  });
  const photos = pics.filter(r => own.has(r.tree)).map(r => ({
    file: 'photo_' + r.id + '.jpg', tree: r.tree, ts: r.ts,
    organ: r.organ || (ORGANS.some(x => x[0] === r.kind) ? r.kind : null),
    species: resSpeciesOf(r.tree), species_source: resSourceOf(r.tree),
    lat: r.lat == null ? null : r.lat, lon: r.lon == null ? null : r.lon,
    distance_m: r.dist == null ? null : r.dist
  }));
  return {
    format: 'vta-field-research-1',
    exported: new Date().toISOString(),
    licence: RES_LICENCE,
    contributor: (c.contributor || '').trim() || 'anonymous',
    consent: { text: RES_CONSENT, given: c.consent_at || null },
    contains: { trees: trees.length, photographs: photos.length, stem_scans: scans.filter(s => own.has(s.tree)).length,
                ratings: !!o.ratings },
    device: resDevice(),
    trees: trees,
    photographs: photos,
    stem_scans: scans.filter(s => own.has(s.tree)).map(s => {
      const i = CAT.features.findIndex((f, n) => props(n).tree_id === s.tree);
      const p = i >= 0 ? props(i) : {};
      const o2 = Object.assign({}, s); delete o2.kind; delete o2.id; delete o2.tree; delete o2.url;
      o2.tree_id = s.tree;
      /* what the same tree measures by hand, so the scan can be scored */
      o2.reference = { dbh_cm: p.dbh_cm == null ? null : p.dbh_cm,
                       girth_cm: p.girth_cm == null ? null : p.girth_cm,
                       source: p.dbh_source || null };
      return o2;
    })
  };
}
function resSpeciesOf(id) {
  const i = CAT.features.findIndex((f, n) => props(n).tree_id === id);
  return i < 0 ? null : (props(i).species || null);
}
function resSourceOf(id) {
  const i = CAT.features.findIndex((f, n) => props(n).tree_id === id);
  return i < 0 ? null : (props(i).species_source || 'entered by the inspector');
}
/* The same licence question as OpenStreetMap, and the same answer: a register
   belongs to the city that made it, so nothing from one leaves in a bundle. */
function resGiveable(i) {
  const p = props(i);
  if (p.osm_own === true) return true;
  if (/^AR survey|GPS in the field|entered by hand|picked on the map/.test(String(p.geometry_source || ''))) return true;
  return false;
}
function resCount() {
  let all = [];
  const mine = new Set();
  CAT.features.forEach((f, i) => { if (resGiveable(i)) mine.add(props(i).tree_id); });
  return photoAll().then(rows => {
    all = rows.filter(r => mine.has(r.tree));
    return { trees: mine.size,
             photographs: all.filter(r => r.kind !== 'scan' && r.kind !== 'audio' && r.url).length,
             labelled: all.filter(r => (r.organ || ORGANS.some(x => x[0] === r.kind)) && r.url).length,
             scans: all.filter(r => r.kind === 'scan').length };
  }).catch(() => ({ trees: mine.size, photographs: 0, labelled: 0, scans: 0 }));
}

/* ---- saving it ---------------------------------------------------------- */
async function resExport(withPhotos, ratings) {
  const b = await resBundle({ ratings: ratings });
  const stamp = new Date().toISOString().slice(0, 10);
  dl('vta-research-' + stamp + '.json', JSON.stringify(b, null, 1), 'application/json');
  if (!withPhotos) return b;
  let all = [];
  try { all = await photoAll(); } catch (e) {}
  const want = new Set(b.photographs.map(p => p.file));
  for (const r of all) {
    const name = 'photo_' + r.id + '.jpg';
    if (!want.has(name)) continue;
    try {
      const blob = await (await fetch(r.url)).blob();
      dl(name, blob, 'image/jpeg');
      await new Promise(res => setTimeout(res, 350));
    } catch (e) {}
  }
  return b;
}
