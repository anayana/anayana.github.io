/* =====================================================================
   VTA Field - visual tree assessment with AR
   No build step. three.js r128 (served locally), WebXR immersive-ar with a
   camera + compass fallback. All data stays on the device.
   ===================================================================== */
'use strict';
const APP_VERSION = '1.8.0';
const $ = id => document.getElementById(id);

/* ============================ SCHEMA ============================ */

const SYMPTOMS = [
  ['Trunk / root collar', [
    ['t_longcrack', 'Longitudinal crack'],
    ['t_transcrack', 'Transverse crack (breakage risk)'],
    ['t_rib', 'Rib or bulge (reaction wood)'],
    ['t_swelling', 'Swelling, deformation'],
    ['t_cavity', 'Cavity or open decay'],
    ['t_bark', 'Bark or cambium damage'],
    ['t_lightning', 'Lightning scar'],
    ['t_bleeding', 'Resin or slime flux'],
    ['t_fork', 'Fork with included bark'],
    ['t_fungi', 'Fruiting bodies of wood-decay fungi'],
    ['t_lean', 'Lean or change of inclination']
  ]],
  ['Root zone / rooting space', [
    ['r_damage', 'Root damage, excavation, trenching'],
    ['r_heave', 'Soil heave, tension cracks in the soil'],
    ['r_flare', 'Root flare missing or one-sided'],
    ['r_compaction', 'Soil compaction or sealing'],
    ['r_fungi', 'Fruiting bodies in the root zone']
  ]],
  ['Crown', [
    ['c_deadwood', 'Deadwood > 3 cm'],
    ['c_hanger', 'Hangers, loose branches'],
    ['c_breakage', 'Branch failures, breakage points'],
    ['c_dieback', 'Crown dieback'],
    ['c_watershoots', 'Water shoots, crown restructuring'],
    ['c_topping', 'Topping cuts, decay at pruning wounds']
  ]]
];
const SYM_LABEL = {};
SYMPTOMS.forEach(g => g[1].forEach(s => { SYM_LABEL[s[0]] = s[1]; }));

/* Species offered for picking. Northern and central European street, park and
   forest trees - free text still wins, this only saves the typing. */
const SPECIES = [
  ['Acer platanoides', 'Norway maple'], ['Acer pseudoplatanus', 'Sycamore'],
  ['Acer saccharinum', 'Silver maple'], ['Aesculus hippocastanum', 'Horse chestnut'],
  ['Alnus glutinosa', 'Black alder'], ['Alnus incana', 'Grey alder'],
  ['Betula pendula', 'Silver birch'], ['Betula pubescens', 'Downy birch'],
  ['Carpinus betulus', 'Hornbeam'], ['Castanea sativa', 'Sweet chestnut'],
  ['Corylus avellana', 'Hazel'], ['Crataegus monogyna', 'Hawthorn'],
  ['Fagus sylvatica', 'Beech'], ['Fraxinus excelsior', 'Ash'],
  ['Juglans regia', 'Walnut'], ['Larix decidua', 'European larch'],
  ['Larix sibirica', 'Siberian larch'], ['Malus domestica', 'Apple'],
  ['Picea abies', 'Norway spruce'], ['Pinus sylvestris', 'Scots pine'],
  ['Pinus cembra', 'Swiss pine'], ['Platanus x hispanica', 'London plane'],
  ['Populus tremula', 'Aspen'], ['Populus nigra', 'Black poplar'],
  ['Prunus avium', 'Wild cherry'], ['Prunus padus', 'Bird cherry'],
  ['Pseudotsuga menziesii', 'Douglas fir'], ['Quercus petraea', 'Sessile oak'],
  ['Quercus robur', 'Pedunculate oak'], ['Quercus rubra', 'Red oak'],
  ['Robinia pseudoacacia', 'Black locust'], ['Salix alba', 'White willow'],
  ['Salix caprea', 'Goat willow'], ['Sorbus aucuparia', 'Rowan'],
  ['Sorbus intermedia', 'Swedish whitebeam'], ['Taxus baccata', 'Yew'],
  ['Thuja occidentalis', 'White cedar'], ['Tilia cordata', 'Small-leaved lime'],
  ['Tilia platyphyllos', 'Large-leaved lime'], ['Tilia x europaea', 'Common lime'],
  ['Ulmus glabra', 'Wych elm'], ['Ulmus laevis', 'European white elm']
];

/* ---- wood-decay fungi ----
   A fruiting body is not a symptom like any other: which fungus it is decides
   the kind of decay, where in the tree it sits, and therefore whether the
   tree fails by uprooting or by snapping - and how much warning there will be.
   So the finding is recorded as a species and the consequence is drawn from
   it, rather than everything collapsing into one "fungi seen" tick.

   Determination stays with the inspector. The app carries what each find
   means, not what it looks like: telling species apart from a photograph is a
   job for a mycologist, and a wrong answer here is a felled healthy tree or a
   standing dangerous one.
   [key, scientific, common, where, rot, minimum level, what it does] */
const FUNGI = [
  ['kdeu', 'Kretzschmaria deusta', 'Brittle cinder', 'root', 'soft rot', 3,
   'Brittle failure of the butt with almost no external warning and no reaction growth. Easily overlooked as a crust. One of the most dangerous finds on beech and lime.'],
  ['mgig', 'Meripilus giganteus', 'Giant polypore', 'root', 'white rot', 3,
   'Advanced decay of the major roots by the time it fruits. Uprooting, often without a lean beforehand.'],
  ['arme', 'Armillaria spp.', 'Honey fungus', 'root', 'white rot', 3,
   'Kills and rots the root plate. Anchorage lost progressively; check for rhizomorphs under the bark.'],
  ['gads', 'Ganoderma adspersum', 'Southern bracket', 'root', 'white rot', 3,
   'Aggressive butt rot with little compartmentalisation. Both uprooting and stem failure.'],
  ['gapp', 'Ganoderma applanatum', 'Artist\u2019s bracket', 'root', 'white rot', 3,
   'Butt and lower stem rot, slower than G. adspersum but the section loss is real.'],
  ['hann', 'Heterobasidion annosum', 'Root and butt rot', 'root', 'white rot', 3,
   'Conifers. Hollows the butt from inside; spruce snaps at the base in wind.'],
  ['pfra', 'Perenniporia fraxinea', 'Ash bracket', 'root', 'white rot', 3,
   'Butt rot of ash, plane and robinia. Severe strength loss low on the stem.'],
  ['pschw', 'Phaeolus schweinitzii', 'Dyer\u2019s polypore', 'root', 'brown rot', 3,
   'Conifers. Brown cubical rot of roots and butt - brittle, low warning.'],
  ['gfro', 'Grifola frondosa', 'Hen of the woods', 'root', 'white rot', 2,
   'Usually oak, slow butt rot. Watch rather than panic, but measure the residual wall.'],
  ['rulm', 'Rigidoporus ulmarius', 'Giant elm bracket', 'root', 'white rot', 2,
   'Butt rot, often on elm and horse chestnut. Long-lived, slow.'],
  ['ffom', 'Fomes fomentarius', 'Tinder fungus', 'stem', 'white rot', 3,
   'Birch and beech. Extensive stem decay by the time brackets show; stem failure.'],
  ['fpin', 'Fomitopsis pinicola', 'Red-belted conk', 'stem', 'brown rot', 3,
   'Brown rot leaves brittle, cubically cracked wood with little residual strength.'],
  ['ihis', 'Inonotus hispidus', 'Shaggy bracket', 'stem', 'white rot', 3,
   'Ash and plane. Localised soft white rot at branch unions - branch and stem failure.'],
  ['lsul', 'Laetiporus sulphureus', 'Chicken of the woods', 'stem', 'brown rot', 2,
   'Brown cubical rot of the heartwood. Oak often compartmentalises well; judge by the residual wall, not the bracket.'],
  ['psqu', 'Polyporus squamosus', 'Dryad\u2019s saddle', 'stem', 'white rot', 2,
   'Enters through wounds; decay usually local to the wound but can be extensive.'],
  ['post', 'Pleurotus ostreatus', 'Oyster mushroom', 'stem', 'white rot', 2,
   'Often follows other damage. Take it as a sign to look for the wound that let it in.'],
  ['iobl', 'Inonotus obliquus', 'Chaga', 'stem', 'white rot', 2,
   'Birch. The sterile mass marks long-standing internal decay.'],
  ['gres', 'Ganoderma resinaceum', 'Lacquered bracket', 'stem', 'white rot', 2,
   'Lower stem of oak and plane. Slower than G. adspersum.'],
  ['tver', 'Trametes versicolor', 'Turkey tail', 'stem', 'white rot', 1,
   'Mostly on dead wood and dying parts. On living tissue, look for what killed it first.'],
  ['badu', 'Bjerkandera adusta', 'Smoky bracket', 'stem', 'white rot', 1,
   'Usually a secondary coloniser of already dead wood.'],
  ['scom', 'Schizophyllum commune', 'Split gill', 'stem', 'white rot', 1,
   'Weak parasite on stressed or damaged wood; a stress indicator more than a hazard.'],
  ['cpur', 'Chondrostereum purpureum', 'Silver leaf', 'crown', 'white rot', 2,
   'Enters through pruning wounds; dieback and brittle branches above the infection.']
];
const FUNGI_BY = {};
FUNGI.forEach(f => { FUNGI_BY[f[0]] = f; });
const FUNGI_WHERE = { root: 'Root plate and butt', stem: 'Stem', crown: 'Crown and branches' };

const SAFE = ['adequate', 'restricted', 'not given'];
const F_VTA = [
  ['inspection_type', 'Inspection type', 'select', ['Routine inspection', 'Visual inspection', 'Detailed assessment', 'Post-storm inspection']],
  ['last_inspection', 'Inspection date', 'date'],
  ['inspector', 'Inspector', 'text'],
  ['vitality_roloff', 'Vitality (Roloff 0–3)', 'select', [0, 1, 2, 3]],
  ['crown_dieback_pct', 'Crown dieback (%)', 'number'],
  ['damage_class', 'Damage class', 'select', ['none', 'slight', 'moderate', 'severe']],
  ['cavity', 'Cavity / decay pocket', 'select', ['no', 'yes']],
  ['wall_t_cm', 'Residual wall t (cm)', 'number'],
  ['radius_r_cm', 'Stem radius R (cm)', 'number'],
  ['stability', 'Stability (uprooting)', 'select', SAFE],
  ['breakage_resistance', 'Breakage resistance', 'select', SAFE],
  ['target_type', 'Target', 'select', ['none', 'path', 'road', 'parking', 'building', 'playground', 'other']],
  ['target_distance_m', 'Distance to target (m)', 'number'],
  ['traffic_safety', 'Traffic safety', 'select', SAFE],
  ['urgency', 'Urgency', 'select', ['none', 'next growing season', '3 months', '1 month', 'immediate']],
  ['actions', 'Actions', 'list'],
  ['interval_months', 'Interval (months)', 'number'],
  ['next_inspection', 'Next inspection', 'date'],
  ['remarks', 'Remarks', 'area']
];
const F_BASE = [
  ['tree_id', 'Tree ID', 'text'],
  ['tag_no', 'Number on the trunk', 'text'],
  ['species', 'Species (scientific)', 'species'],
  ['name_en', 'Common name', 'text'],
  ['name_fi', 'Name (Finnish)', 'text'],
  ['planted', 'Year planted', 'number'],
  ['girth_cm', 'Girth at 1.0 m (cm)', 'number'],
  ['dbh_cm', 'DBH at 1.3 m (cm)', 'number'],
  ['height_m', 'Height (m)', 'number'],
  ['crown_d_m', 'Crown diameter (m)', 'number'],
  ['crown_base_m', 'Crown base (m)', 'number'],
  ['tree_pit_m2', 'Tree pit (m²)', 'number'],
  ['location', 'Location', 'text'],
  ['position_accuracy_m', 'Position accuracy (m)', 'number']
];
const LVLCOL = ['#4caf7d', '#9ccc52', '#e8c15a', '#e2704a'];
const LVLTXT = ['inconspicuous', 'minor findings', 'conspicuous – review measures', 'urgent – detailed assessment'];

/* ============================ STORAGE ============================ */

const K_CAT = 'vta_catalog_v1', K_EDIT = 'vta_edits_v1', K_REF = 'vta_refs_v1',
      K_NIA = 'vta_nia_v1';
let mem = {};                                  // fallback when localStorage is blocked
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] || null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } }

let CAT, edits;
function loadAll() {
  CAT = null;
  const raw = lsGet(K_CAT);
  if (raw) { try { CAT = JSON.parse(raw); } catch (e) { CAT = null; } }
  if (!CAT || !CAT.features) CAT = JSON.parse(JSON.stringify(TREES_DEFAULT));
  edits = {};
  const re = lsGet(K_EDIT);
  if (re) { try { edits = JSON.parse(re) || {}; } catch (e) { edits = {}; } }
}
/* The app used to ship three OSM demo trees. They are gone from the shipped
   catalogue, but a phone that ran an earlier version still has them in its
   stored one, where they only get in the way of a real survey. Drop them once,
   matched on the OSM node id, which nothing recorded in the field carries. */
const DEMO_OSM = ['12498051519', '12498051520', '12498051521'];
function dropDemoTrees() {
  if (!CAT || !CAT.features) return 0;
  const gone = [];
  CAT.features = CAT.features.filter(f => {
    const p = f.properties || {};
    if (DEMO_OSM.indexOf(String(p.osm_id)) >= 0) {      // nothing you record has an osm_id
      gone.push(p.tree_id); return false;
    }
    return true;
  });
  if (!gone.length) return 0;
  gone.forEach(id => { delete edits[id]; });
  saveCat(); saveEdits();
  return gone.length;
}
function saveCat() { lsSet(K_CAT, JSON.stringify(CAT)); }
function saveEdits() { lsSet(K_EDIT, JSON.stringify(edits)); }
function tid(i) { return (CAT.features[i].properties || {}).tree_id || ('#' + i); }
function props(i) { return Object.assign({}, CAT.features[i].properties, edits[tid(i)] || {}); }
function isEdited(i) { return !!edits[tid(i)]; }

/* --------- photos in IndexedDB --------- */
let PDB = null, photosOk = ('indexedDB' in window);
function pdb() {
  return new Promise((res, rej) => {
    if (PDB) return res(PDB);
    const r = indexedDB.open('vta-photos', 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('photos')) {
        const s = db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
        s.createIndex('tree', 'tree');
      }
    };
    r.onsuccess = () => { PDB = r.result; res(PDB); };
    r.onerror = () => rej(r.error);
  });
}
async function photoAdd(tree, url, meta) {
  const db = await pdb();
  const rec = Object.assign({ tree: tree, url: url, ts: new Date().toISOString() }, meta || {});
  return new Promise((res, rej) => {
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').add(rec);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}
async function photoList(tree) {
  const db = await pdb();
  return new Promise((res, rej) => {
    const q = db.transaction('photos').objectStore('photos').index('tree').getAll(tree);
    q.onsuccess = () => res(q.result || []); q.onerror = () => rej(q.error);
  });
}
async function photoAll() {
  const db = await pdb();
  return new Promise((res, rej) => {
    const q = db.transaction('photos').objectStore('photos').getAll();
    q.onsuccess = () => res(q.result || []); q.onerror = () => rej(q.error);
  });
}
async function photoDel(id) {
  const db = await pdb();
  return new Promise((res, rej) => {
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').delete(id);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}
function shrink(file, max, q) {
  return new Promise(res => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', q));
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(null); };
    img.src = url;
  });
}

/* ========================= VTA EVALUATION ========================= */

function num(v) { const n = parseFloat(v); return isFinite(n) ? n : null; }
function assess(p) {
  const notes = [], sym = p.symptoms || [];
  const has = k => sym.indexOf(k) >= 0;
  let lvl = 0;
  const up = (n, txt) => { lvl = Math.max(lvl, n); if (txt) notes.push(txt); };

  const t = num(p.wall_t_cm), R = num(p.radius_r_cm);
  let tr = null;
  if (t > 0 && R > 0) {
    tr = t / R;
    if (tr < 0.30) up(3, 't/R = ' + tr.toFixed(2) + ' – below 0.30. Critical residual wall thickness after Mattheck; detailed assessment required.');
    else if (tr < 0.35) up(2, 't/R = ' + tr.toFixed(2) + ' – close to the 0.30 threshold, track the development.');
    else notes.push('t/R = ' + tr.toFixed(2) + ' – above the 0.30 threshold.');
  } else if (p.cavity === 'yes') {
    up(2, 'Cavity recorded but t and R are missing – t/R cannot be checked. Measure the residual wall.');
  }

  const h = num(p.height_m), d = num(p.dbh_cm);
  let hd = null;
  if (h > 0 && d > 0) {
    hd = h * 100 / d;
    if (hd > 80) up(1, 'h/d = ' + hd.toFixed(0) + ' – slender stem, raised sensitivity to wind and snow load.');
  }

  const fun = p.fungi || [];
  fun.forEach(k => {
    const f = FUNGI_BY[k]; if (!f) return;
    up(f[5], f[1] + ' (' + f[2] + ') – ' + f[4] + ' in the ' +
       (f[3] === 'root' ? 'root plate or butt' : f[3] === 'stem' ? 'stem' : 'crown') + '. ' + f[6]);
  });
  if (!fun.length && (has('t_fungi') || has('r_fungi')))
    up(3, 'Fruiting bodies of wood-decay fungi, species not recorded – assume decay and identify the fungus, the species decides how the tree fails.');
  if (has('r_heave')) up(3, 'Soil heave or tension cracks – indication of root failure, check stability now.');
  if (has('t_lean')) up(3, 'Lean or change of inclination – check stability now.');
  if (has('c_hanger')) up(3, 'Hangers or loose branches – immediate hazard, remove without delay.');
  if (has('t_transcrack')) up(2, 'Transverse crack – risk of stem failure.');
  if (has('t_cavity')) up(2, 'Open cavity – loss of cross-section, determine the residual wall thickness.');
  if (has('t_fork')) up(1, 'Fork with included bark – risk of splitting, consider a crown brace.');
  if (has('r_damage')) up(2, 'Root damage – loss of anchorage, establish the extent.');
  if (has('t_rib') || has('t_swelling')) up(1, 'Reaction wood (rib or swelling) – the tree is compensating for a weak spot underneath.');

  const vit = num(p.vitality_roloff);
  if (vit === 3) up(2, 'Vitality stage 3 (resignation) – regenerative capacity exhausted.');
  else if (vit === 2) up(1, 'Vitality stage 2 (stagnation).');
  const cd = num(p.crown_dieback_pct);
  if (cd >= 60) up(2, 'Crown dieback ' + cd + ' % – severely damaged crown.');
  else if (cd >= 30) up(1, 'Crown dieback ' + cd + ' %.');

  const tgt = num(p.target_distance_m);
  if (tgt != null && h > 0 && p.target_type && p.target_type !== 'none' && tgt <= h) {
    // a target inside the fall zone does not make the tree worse, it makes a
    // failure more costly - so it only sharpens an already conspicuous tree
    if (lvl >= 2) up(3, 'Target (' + p.target_type + ') ' + tgt.toFixed(1) + ' m from the stem, inside the fall zone of a ' + h.toFixed(1) + ' m tree.');
    else notes.push('Target (' + p.target_type + ') inside the fall zone – a failure would be costly.');
  }

  if (p.traffic_safety === 'not given') up(3, 'Traffic safety rated as not given.');
  else if (p.traffic_safety === 'restricted') up(2, 'Traffic safety rated as restricted.');
  if (p.stability === 'not given' || p.breakage_resistance === 'not given') up(3, null);

  if (p.next_inspection) {
    const dd = new Date(p.next_inspection);
    if (!isNaN(dd) && dd < new Date()) up(1, 'Inspection overdue (was due ' + p.next_inspection + ').');
  }
  return { lvl: lvl, tr: tr, hd: hd, notes: notes };
}

/* ========================== GEODESY ========================== */

/* Metres per degree, as a function of latitude. The flat constants this
   replaces (110540 / 111320) are the values for about 45 degrees; at 62 north
   the latitude one is 0.8 % short, which is 0.4 m over a fifty-metre stand and
   grows with every metre of it. */
function mLat(lat) {
  const r = lat * Math.PI / 180;
  return 111132.92 - 559.82 * Math.cos(2 * r) + 1.175 * Math.cos(4 * r) - 0.0023 * Math.cos(6 * r);
}
function mLon(lat) {
  const r = lat * Math.PI / 180;
  return 111412.84 * Math.cos(r) - 93.5 * Math.cos(3 * r) + 0.118 * Math.cos(5 * r);
}
function enu(lat, lon, lat0, lon0) {
  return { e: (lon - lon0) * mLon(lat0), n: (lat - lat0) * mLat(lat0) };
}
/* A point in the scene back to WGS84. Accurate relative to everything else in
   the session; in absolute terms it inherits the error of the origin fix. */
function sceneToWgs(v) {
  if (!origin || !world) return null;
  // worldToLocal inverts the cached matrix, and applyYaw() has just turned the
  // world without a render in between - refresh it or the answer is the old
  // heading's answer
  world.updateMatrixWorld(true);
  const l = world.worldToLocal(v.clone());
  return { lat: origin.lat + (-l.z) / mLat(origin.lat),
           lon: origin.lon + l.x / mLon(origin.lat) };
}
/* The inverse: declare that the spot you are standing on has these
   coordinates. The scene's zero point is wherever the session started, not
   where you are now, so the origin is shifted by your offset from it -
   otherwise walking twenty metres before saying "I am at ..." puts the whole
   scene twenty metres out. */
function setOriginHere(lat, lon, acc) {
  if (world && mode) {
    world.updateMatrixWorld(true);
    const l = world.worldToLocal(camPos());
    origin = { lat: lat + l.z / mLat(lat), lon: lon - l.x / mLon(lat) };
  } else {
    origin = { lat: lat, lon: lon };
  }
  originAcc = acc; originPinned = true;
  placeMarkers();
}
function distBear(lat, lon, lat0, lon0) {
  const d = enu(lat, lon, lat0, lon0);
  return { d: Math.hypot(d.e, d.n), b: (Math.atan2(d.e, d.n) * 180 / Math.PI + 360) % 360 };
}

/* ===================== CONTROL POINTS / GEOREFERENCE =====================
   GPS puts the scene within metres and the compass turns it by tens of
   degrees; at 30 m a 20-degree heading error is a 10 m miss, which is what a
   register looks like when every marker is "somehow offset". ARCore's visual
   odometry, by contrast, is good to about a percent of the distance walked -
   centimetres over a stand. So the local frame is the accurate part, and all
   that is missing is where it sits on the earth and which way it points.

   Two known points measured in that frame determine both: three or four
   give a residual that says whether to believe the result. This is the
   surveyor's resection, and the fit below is its least-squares form. */

let REFS = [];                     // known points: { id, lat, lon, note, acc }
const refFix = new Map();          // control key -> { x, z } measured in this session

/* Anything with a coordinate you trust can hold the scene down, and after the
   first survey the trees themselves are the closest such things - which beats
   walking back to a marker post every time a session restarts. Reference
   points first, then the nearest trees. */
function controlList() {
  const out = REFS.map(r => ({ key: 'r:' + r.id, name: r.id, lat: r.lat, lon: r.lon, ref: true }));
  const c = (mode && world) ? camPos() : null;
  const trees = CAT.features.map((f, i) => {
    if (!f.geometry || f.geometry.type !== 'Point') return null;
    const co = f.geometry.coordinates;
    const g = world && world.children.find(o => o.userData.idx === i);
    const d = (c && g) ? c.distanceTo(g.getWorldPosition(new THREE.Vector3())) : 1e9;
    return { key: 't:' + tid(i), name: props(i).tree_id, lat: co[1], lon: co[0], ref: false, d: d };
  }).filter(Boolean);
  trees.sort((a, b) => a.d - b.d);
  return out.concat(trees.slice(0, 8));
}
function controlByKey(k) { return controlList().find(x => x.key === k) || null; }
function loadRefs() {
  REFS = [];
  const raw = lsGet(K_REF);
  if (raw) { try { REFS = JSON.parse(raw) || []; } catch (e) { REFS = []; } }
}
function saveRefs() { lsSet(K_REF, JSON.stringify(REFS)); }
function refById(id) { return REFS.find(r => r.id === id) || null; }

/* Rotation and translation only - the scale is known to be 1, and letting a
   fit absorb scale would quietly hide a bad control point. Complex form:
   s = e^(-i*phi) * (u - u0), with u = e - i*n on the map side and s = x + i*z
   in the scene. */
function fitRigid(pairs) {
  const N = pairs.length;
  if (N < 2) return null;
  let ue = 0, un = 0, sx = 0, sz = 0;
  pairs.forEach(p => { ue += p.u.e; un += p.u.n; sx += p.s.x; sz += p.s.z; });
  ue /= N; un /= N; sx /= N; sz /= N;
  let cr = 0, ci = 0;
  pairs.forEach(p => {
    const ur = p.u.e - ue, ui = -(p.u.n - un);
    const sr = p.s.x - sx, si = p.s.z - sz;
    cr += sr * ur + si * ui; ci += si * ur - sr * ui;      // sum of s * conj(u)
  });
  if (Math.hypot(cr, ci) < 1e-9) return null;              // all points coincide
  const phi = -Math.atan2(ci, cr);
  const cp = Math.cos(phi), sp = Math.sin(phi);
  const e0 = ue - (cp * sx - sp * sz), n0 = un + (sp * sx + cp * sz);
  let sum = 0, mx = 0, worst = null;
  pairs.forEach(p => {
    const ur = p.u.e - e0, ui = -(p.u.n - n0);
    const d = Math.hypot(cp * ur + sp * ui - p.s.x, -sp * ur + cp * ui - p.s.z);
    sum += d * d; if (d > mx) { mx = d; worst = p.id; }
  });
  return { phi: phi, e0: e0, n0: n0, rms: Math.sqrt(sum / N), max: mx, worst: worst, n: N };
}

/* Everything the fit needs is in the session; applying it is just the origin
   and the yaw the rest of the app already runs on. */
function fitFromRefs(quiet) {
  const used = controlList().filter(r => refFix.has(r.key));
  if (used.length === 1) {
    // one point pins the position exactly and leaves the heading to the
    // compass - worse than a real fit, far better than a GPS origin
    const r = used[0], p = refFix.get(r.key);
    if (heading == null) { if (!quiet) toast('One point needs the compass for the heading – no heading yet.'); return null; }
    syncNorth(true);
    const v = new THREE.Vector3(p.x, 0, p.z).applyAxisAngle(_yAx, -THREE.MathUtils.degToRad(worldYaw + headOff));
    origin = { lat: r.lat + v.z / mLat(r.lat), lon: r.lon - v.x / mLon(r.lat) };
    originAcc = null; originPinned = true;
    placeMarkers(); requestAnchors(); lastFit = null; showFit();
    if (!quiet) toast('Position set from ' + r.name + ' – heading still from the compass. One more point fixes it.');
    return null;
  }
  if (used.length < 2) { if (!quiet) toast('Measure at least two control points.'); return null; }
  const lat0 = used.reduce((a, r) => a + r.lat, 0) / used.length;
  const lon0 = used.reduce((a, r) => a + r.lon, 0) / used.length;
  const pairs = used.map(r => ({ id: r.name, u: enu(r.lat, r.lon, lat0, lon0), s: refFix.get(r.key) }));
  const f = fitRigid(pairs);
  if (!f) { if (!quiet) toast('Reference points are too close together.'); return null; }
  applyFit(f, lat0, lon0, false);
  if (!quiet) toast('Fitted on ' + f.n + ' points · residual ' + f.rms.toFixed(2) +
                    ' m, worst ' + f.max.toFixed(2) + ' m (' + f.worst + ')');
  return f;
}
/* Aiming a reticle at a fence post is a lot of ceremony for a number the
   session already knows: where the phone is. Stand on the point, press the
   button. You are within half a metre of it, which over a thirty-metre
   baseline is a degree of heading - the compass is off by twenty. */
/* The one thing the app exists for should not be two menus deep behind a
   reticle. Stand at the stem, press the button. */
function addTreeHere() {
  if (mode !== 'WebXR') return toast('Needs the WebXR mode – its tracking is what places the tree.');
  const g = sceneToWgs(camPos());
  if (!g) return toast('No origin yet – no GPS fix and no fit.');
  const i = addTree(g.lon, g.lat, lastFit ? 'AR, fitted scene' : 'AR, scene from GPS',
                    lastFit ? lastFit.rms : originAcc);
  selectTree(i);
  openPanel(i);
  toast('Tree ' + tid(i) + ' recorded where you stand.');
}

function markControlHere(key) {
  if (mode !== 'WebXR') return toast('Standing needs the WebXR mode – its tracking is what measures the point.');
  const c = controlByKey(key);
  if (!c) return;
  const p = camPos();
  refFix.set(key, { x: p.x, z: p.z });
  const done = controlList().filter(r => refFix.has(r.key)).length;
  fitFromRefs(false);          // one point already moves the scene onto it
  showFit(); buildRefMenu();
}

/* The state of the fit belongs on screen, not in a toast that has scrolled
   away by the time you are standing at the next tree. */
function showFit() {
  const el = $('hFit'); if (!el) return;
  const done = controlList().filter(r => refFix.has(r.key)).length;
  if (!mode) { el.textContent = ''; return; }
  // say what it means for the markers, not what the maths is called
  el.textContent = lastFit
      ? (lastFit.auto ? 'markers aligned by walking' : 'markers aligned ±' + lastFit.rms.toFixed(1) + ' m')
    : done >= 2 ? 'ready – press Apply'
    : done === 1 ? 'markers roughly placed'
    : 'markers not aligned – walk a bit';
  el.className = lastFit ? 'ok' : 'warn';
}
let lastFit = null;

function applyFit(f, lat0, lon0, auto) {
  origin = { lat: lat0 + f.n0 / mLat(lat0), lon: lon0 + f.e0 / mLon(lat0) };
  originAcc = f.rms; originPinned = true;
  worldYaw = ((f.phi * 180 / Math.PI) % 360 + 360) % 360; headOff = 0;
  applyYaw(); placeMarkers(); requestAnchors();
  f.auto = !!auto; lastFit = f;
  showFit();
}

/* ---- the walk as its own control survey ----
   Measuring points by hand is the accurate way and costs a walk every session.
   But a walk is already happening: every GPS fix taken during a session pairs
   a WGS84 position with the camera's position in session coordinates, which is
   exactly the pair the fit consumes. One such pair is a bad control point -
   metres of noise - but thirty of them spread over fifty metres average down
   to about a metre of position and a degree of heading, which beats the
   compass by more than an order of magnitude and asks nothing of the user.
   Hand-measured points still win: as soon as two exist, this stops. */
let track = [];
const T_ACC = 15,      // ignore a fix worse than this
      T_STEP = 2,      // and one taken without having moved
      T_MIN = 8,       // samples before a first fit
      T_SPAN = 12,     // metres of baseline before a first fit
      T_SETTLE = 40;   // after this many, hold still rather than keep nudging
function trackFix(fix) {
  if (mode !== 'WebXR' || !world) return;
  if (!(fix.acc <= T_ACC)) return;
  const p = camPos();
  const last = track[track.length - 1];
  if (last && Math.hypot(p.x - last.x, p.z - last.z) < T_STEP) return;
  track.push({ lat: fix.lat, lon: fix.lon, acc: fix.acc, x: p.x, z: p.z });
  if (track.length > 200) track.shift();
  autoFit();
}
function trackSpan() {
  let mx = 0;
  for (let i = 0; i < track.length; i++)
    for (let j = i + 1; j < track.length; j++)
      mx = Math.max(mx, Math.hypot(track[i].x - track[j].x, track[i].z - track[j].z));
  return mx;
}
function autoFit() {
  if (controlList().filter(r => refFix.has(r.key)).length >= 2) return;   // hand-measured wins
  if (lastFit && !lastFit.auto) return;
  if (track.length < T_MIN || trackSpan() < T_SPAN) return;
  if (lastFit && lastFit.auto && track.length > T_SETTLE) return;         // converged, hold
  const lat0 = track.reduce((a, r) => a + r.lat, 0) / track.length;
  const lon0 = track.reduce((a, r) => a + r.lon, 0) / track.length;
  const f = fitRigid(track.map((r, n) => ({ id: 'fix' + n,
    u: enu(r.lat, r.lon, lat0, lon0), s: { x: r.x, z: r.z } })));
  if (!f) return;
  applyFit(f, lat0, lon0, true);
}

/* ====================== SENSORS: GPS / COMPASS ====================== */

let lastFix = null, gpsAcc = null, watchId = null;
function startGPS() {
  if (!navigator.geolocation || watchId !== null) return;
  watchId = navigator.geolocation.watchPosition(p => {
    gpsAcc = p.coords.accuracy;
    lastFix = { lat: p.coords.latitude, lon: p.coords.longitude, acc: gpsAcc };
    $('hAcc').textContent = gpsAcc.toFixed(0);
    $('gpsBadge').textContent = 'GPS ±' + gpsAcc.toFixed(0) + ' m';
    // The first fix of a session is the cold-start fix and usually the worst
    // of the day, yet everything on screen is drawn relative to the origin.
    // Keep taking the better fix until a session pins the scene down.
    trackFix(lastFix);
    if (!origin || (!mode && !originPinned && originAcc != null && lastFix.acc < originAcc - 1)) {
      origin = { lat: lastFix.lat, lon: lastFix.lon };
      if (!originPinned) originAcc = lastFix.acc;
      placeMarkers();
    }
  }, e => {
    $('gpsBadge').textContent = 'GPS off';
    msg('GPS: ' + e.message);
  }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 });
}

let devQuat = new THREE.Quaternion(), haveOrient = false, heading = null;
let hSin = 0, hCos = 0;                                  // smoothed heading
const _e = new THREE.Euler(),
      _q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)),
      _zAx = new THREE.Vector3(0, 0, 1), _q0 = new THREE.Quaternion(),
      _yAx = new THREE.Vector3(0, 1, 0);
function orientQuat(q, a, b, g, o) {
  _e.set(b, a, -g, 'YXZ');
  q.setFromEuler(_e);
  q.multiply(_q1);
  q.multiply(_q0.setFromAxisAngle(_zAx, -o));
}
/* Held sideways while the screen is locked upright, ARCore builds the camera
   image for a portrait display it no longer has: the passthrough comes out
   rotated against everything drawn on top of it, and no marker can sit on its
   tree. Nothing in the page can correct that, so say so. Detected by taking
   the phone's own top edge from the raw sensor quaternion - the screen
   compensation is exactly what is broken here, so it is left out - and
   comparing it against the orientation the screen claims. */
const _upDev = new THREE.Vector3(), _rawQ = new THREE.Quaternion();
let warnOff = false;
function checkOrientLock(a, b, g) {
  const el = $('hwarn'); if (!el) return;
  if (!el.dataset.wired) {
    el.dataset.wired = '1';
    $('hwarnX').onclick = () => { warnOff = true; el.classList.remove('on'); };
  }
  const ang = screen.orientation ? screen.orientation.angle : (window.orientation || 0);
  orientQuat(_rawQ, a, b, g, 0);
  _upDev.set(0, 1, 0).applyQuaternion(_rawQ);
  const sideways = Math.abs(_upDev.y) < 0.5;
  const bad = mode === 'WebXR' && sideways && (ang % 180 === 0) && !warnOff;
  $('hwarnT').textContent = bad ? 'View 90° out – auto-rotate is off. Hold the phone upright.' : '';
  el.classList.toggle('on', bad);
}
function onOrient(ev) {
  if (ev.alpha == null) return;
  haveOrient = true;
  const o = THREE.MathUtils.degToRad(screen.orientation ? screen.orientation.angle : (window.orientation || 0));
  checkOrientLock(THREE.MathUtils.degToRad(ev.alpha), THREE.MathUtils.degToRad(ev.beta),
                  THREE.MathUtils.degToRad(ev.gamma));
  orientQuat(devQuat, THREE.MathUtils.degToRad(ev.alpha), THREE.MathUtils.degToRad(ev.beta),
             THREE.MathUtils.degToRad(ev.gamma), o);
  const f = new THREE.Vector3(0, 0, -1).applyQuaternion(devQuat);
  const raw = (Math.atan2(f.x, -f.z) * 180 / Math.PI + 360) % 360;
  const r = raw * Math.PI / 180, k = 0.25;
  hSin = hSin + (Math.sin(r) - hSin) * k;
  hCos = hCos + (Math.cos(r) - hCos) * k;
  heading = (Math.atan2(hSin, hCos) * 180 / Math.PI + 360) % 360;
  $('hHead').textContent = heading.toFixed(0);
}
async function startOrient() {
  if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
    try { await DeviceOrientationEvent.requestPermission(); } catch (e) {}
  }
  addEventListener('deviceorientationabsolute', onOrient, true);
  addEventListener('deviceorientation', onOrient, true);
}

/* ============================ SCENE ============================ */

let renderer, scene, camera, world, sprites = [], ray = new THREE.Raycaster();
let origin = null, originAcc = null, originPinned = false, headOff = 0, worldYaw = 0, mode = null, xrSession = null, xrRef = null, lastFrame = null;
let camGps = new THREE.Vector3(0, 1.55, 0);
/* AR tools */
let hitOk = false, hitSource = null, hitPt = null, reticle = null;
let anchorsOk = false, anchorMap = new Map(), anchorsWanted = false;
let camAccessOk = false, shotFor = null, shotKind = null;
let selIdx = null, measure = null, mGroup = null;
let edgeEls = {}, edgeTick = 0;

function buildScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 500);
  world = new THREE.Group(); scene.add(world);
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.domElement.className = 'ar';
  renderer.domElement.style.display = 'none';   // three writes inline display:block, which beats the class
  document.body.appendChild(renderer.domElement);

  // hit-test reticle and the container for measurement lines, both in session space
  reticle = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.13, 32),
    new THREE.MeshBasicMaterial({ color: 0x8fd6a8, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthTest: false }));
  reticle.rotation.x = -Math.PI / 2; reticle.renderOrder = 12; reticle.visible = false;
  scene.add(reticle);
  // Inside world, not in the session frame: a measurement drawn in session
  // coordinates stays where the phone happened to be standing, while the trees
  // move with every fit, yaw re-sync and anchor correction - so the line walks
  // away from the tree it measured.
  mGroup = new THREE.Group(); world.add(mGroup);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function labelTexture(i) {
  const p = props(i), a = assess(p), col = LVLCOL[a.lvl];
  const c = document.createElement('canvas'); c.width = 640; c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(10,16,13,.88)'; roundRect(g, 4, 4, 632, 312, 26); g.fill();
  g.lineWidth = 8; g.strokeStyle = col; roundRect(g, 4, 4, 632, 312, 26); g.stroke();
  g.fillStyle = col; g.beginPath(); g.arc(62, 74, 26, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 46px system-ui,sans-serif';
  g.fillText(p.tag_no ? ('№ ' + p.tag_no) : (p.tree_id || '?'), 104, 90);
  // the species is what you actually look for on a marker, so it gets weight,
  // and its absence gets said rather than left as a blank line
  const sp = (p.species || '').trim(), cn = (p.name_en || '').trim();
  if (sp || cn) {
    g.fillStyle = '#eaf3ee'; g.font = 'italic bold 40px system-ui,sans-serif';
    g.fillText(sp || cn, 32, 154);
    if (sp && cn) {
      const w = g.measureText(sp).width;
      g.fillStyle = '#9fb3a6'; g.font = '30px system-ui,sans-serif';
      g.fillText(' · ' + cn, 32 + w, 154);
    }
  } else {
    g.fillStyle = '#e0a94a'; g.font = 'italic 36px system-ui,sans-serif';
    g.fillText('species not recorded', 32, 154);
  }
  g.fillStyle = '#9fb3a6'; g.font = '32px system-ui,sans-serif';
  g.fillText('DBH ' + (p.dbh_cm == null ? '–' : p.dbh_cm) + ' cm · H ' + (p.height_m == null ? '–' : p.height_m) + ' m', 32, 204);
  g.fillText('Vitality ' + (p.vitality_roloff == null ? '–' : p.vitality_roloff) + ' · ' + (p.damage_class || '–'), 32, 250);
  g.fillStyle = col; g.font = '28px system-ui,sans-serif';
  g.fillText('▸ ' + LVLTXT[a.lvl], 32, 296);
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
}

function buildMarkers() {
  // only the marker groups: mGroup hangs here too and must survive
  world.children.filter(o => o.userData.idx != null).forEach(o => world.remove(o));
  sprites = [];
  CAT.features.forEach((f, i) => {
    if (!f.geometry || f.geometry.type !== 'Point') return;
    const p = props(i), col = LVLCOL[assess(p).lvl];
    const g = new THREE.Group();
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(i), depthTest: false, transparent: true }));
    sp.scale.set(1.7, 0.85, 1); sp.position.y = 1.30; sp.renderOrder = 10;   // breast height
    sp.userData.idx = i; g.add(sp); sprites.push(sp);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1.30, 0)]),
      new THREE.LineBasicMaterial({ color: col, depthTest: false }));
    line.renderOrder = 9; g.add(line);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 40),
      new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: true, opacity: 0.85, depthTest: false }));
    ring.rotation.x = -Math.PI / 2; ring.renderOrder = 9; g.add(ring);
    g.userData.idx = i; world.add(g);
  });
  placeMarkers();
  if (mode) { buildEdge(); buildChooser(); }     // both are keyed by index
}
function placeMarkers() {
  if (!origin || !world) return;
  world.children.forEach(g => {
    const f = CAT.features[g.userData.idx]; if (!f) return;
    const c = f.geometry.coordinates;
    const d = enu(c[1], c[0], origin.lat, origin.lon);
    g.position.set(d.e, 0, -d.n);                 // x = east, z = -north
  });
  requestAnchors();       // old anchors would drag the markers back
}
function refreshMarker(i) {
  const sp = sprites.find(s => s.userData.idx === i);
  if (!sp) return;
  const col = LVLCOL[assess(props(i)).lvl];
  sp.material.map.dispose();
  sp.material.map = labelTexture(i);
  sp.material.needsUpdate = true;
  const g = world.children.find(o => o.userData.idx === i);
  if (g) g.children.forEach(ch => { if (ch.material && ch.material.color) ch.material.color.set(col); });
}

/* ---- north alignment ----
   world.rotation.y = phi maps a bearing beta onto beta - phi. What we need is
   phi = compass heading - view direction in the XR world frame. At session
   start the latter is 0; the same expression lets the user re-sync later when
   the ARCore yaw has drifted. */
function camYawDeg() {
  const cam = (renderer.xr && renderer.xr.isPresenting) ? renderer.xr.getCamera(camera) : camera;
  cam.updateMatrixWorld(true);
  const f = new THREE.Vector3(0, 0, -1).transformDirection(cam.matrixWorld);
  return (Math.atan2(f.x, -f.z) * 180 / Math.PI + 360) % 360;
}
function applyYaw() {
  if (world) world.rotation.y = THREE.MathUtils.degToRad(worldYaw + headOff);
  $('hOff').textContent = Math.round(headOff);
}
function syncNorth(quiet) {
  if (heading == null) { if (!quiet) toast('No compass heading yet – move the phone in a figure of eight.'); return false; }
  worldYaw = ((heading - camYawDeg()) % 360 + 360) % 360;
  applyYaw();
  requestAnchors();       // the markers just turned, their anchors have not
  if (!quiet) toast('North taken from compass (heading ' + heading.toFixed(0) + '°).');
  return true;
}

/* ============================= MODES ============================= */

async function startXR() {
  if (!navigator.xr) throw new Error('navigator.xr missing');
  const ok = await navigator.xr.isSessionSupported('immersive-ar');
  if (!ok) throw new Error('immersive-ar not supported (is Google Play Services for AR installed?)');
  $('xrui').classList.add('on');            // the overlay root has to be visible or Chrome rejects it
  let s;
  try {
    s = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['dom-overlay', 'hit-test', 'anchors', 'camera-access'],
      domOverlay: { root: $('xrui') }
    });
  } catch (err) {
    $('xrui').classList.remove('on');
    throw err;
  }
  xrSession = s; mode = 'WebXR';
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  await renderer.xr.setSession(s);
  xrRef = renderer.xr.getReferenceSpace();
  s.addEventListener('select', onXRSelect);
  s.addEventListener('end', endAR);

  // Optional features are granted per session, so ask the session, not the device.
  const has = f => (s.enabledFeatures ? s.enabledFeatures.indexOf(f) >= 0 : true);
  anchorsOk = has('anchors') && typeof XRFrame !== 'undefined' && 'createAnchor' in XRFrame.prototype;
  camAccessOk = has('camera-access') && typeof XRWebGLBinding !== 'undefined' &&
                'getCameraImage' in XRWebGLBinding.prototype;
  hitOk = has('hit-test') && typeof s.requestHitTestSource === 'function';
  if (hitOk) {
    try {
      const viewerSpace = await s.requestReferenceSpace('viewer');
      hitSource = await s.requestHitTestSource({ space: viewerSpace });
    } catch (e) { hitOk = false; hitSource = null; }
  }

  enterAR();
  // the compass is often not ready at session start: keep trying for ~6 s
  let tries = 0;
  const iv = setInterval(() => { if (syncNorth(true) || ++tries > 12) clearInterval(iv); }, 500);
  renderer.setAnimationLoop((t, frame) => {
    lastFrame = frame;
    if (frame) {
      updateHitTest(frame);
      updateAnchors(frame);
      if (shotFor !== null) takeARPhoto(frame);
    }
    tick(); renderer.render(scene, camera);
  });
}

async function startCam() {
  const v = $('video');
  const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  v.srcObject = st; await v.play(); v.style.display = 'block';
  mode = 'Camera'; enterAR();
  renderer.domElement.addEventListener('pointerdown', onCamTap);
  renderer.setAnimationLoop(() => {
    if (haveOrient) camera.quaternion.copy(devQuat);
    // own position from GPS, rotated the same way as the markers
    if (origin && lastFix && lastFix.acc < 25) {
      const d = enu(lastFix.lat, lastFix.lon, origin.lat, origin.lon);
      const v2 = new THREE.Vector3(d.e, 0, -d.n).applyAxisAngle(_yAx, THREE.MathUtils.degToRad(worldYaw + headOff));
      const tgt = new THREE.Vector3(v2.x, 1.55, v2.z);
      // GPS noise is metres wide, and moving the camera moves the whole scene
      // past you: follow a fix only once it has left the accuracy circle, then
      // ease over rather than jump.
      if (camGps.distanceTo(tgt) > Math.max(1.5, lastFix.acc * 0.5)) camGps.lerp(tgt, 0.02);
    }
    camera.position.copy(camGps);
    tick(); renderer.render(scene, camera);
  });
}

function enterAR() {
  $('app').classList.add('hidden');
  $('xrui').classList.add('on');
  renderer.domElement.style.display = 'block';
  $('hMode').textContent = mode;
  applyYaw();
  selectTree(null);
  buildChooser();
  buildMeasureMenu();
  buildRefMenu();
  refFix.clear(); lastFit = null; track = [];   // a new session, a new local frame
  showFit();
  buildEdge();
  $('bmeas').disabled = !(mode === 'WebXR' && hitOk);
  $('bshot').disabled = $('bbark').disabled = !(mode === 'WebXR' && camAccessOk);
  requestAnchors();
}
function endAR() {
  renderer.setAnimationLoop(null);
  clearMeasure();
  dropAnchors();
  if (hitSource) { try { hitSource.cancel(); } catch (e) {} hitSource = null; }
  hitOk = anchorsOk = camAccessOk = false; shotFor = null; barkFor = null; shotKind = null;
  if (xrSession) { try { xrSession.end(); } catch (e) {} xrSession = null; }
  renderer.xr.enabled = false;
  const v = $('video');
  if (v.srcObject) { v.srcObject.getTracks().forEach(t => t.stop()); v.srcObject = null; v.style.display = 'none'; }
  renderer.domElement.removeEventListener('pointerdown', onCamTap);
  renderer.domElement.style.display = 'none';
  $('xrui').classList.remove('on');
  $('panelXR').classList.remove('on');
  $('chooser').style.display = 'none';
  $('mmenu').style.display = 'none';
  $('refmenu').style.display = 'none';
  $('ctl2').classList.remove('on');
  $('edge').innerHTML = ''; edgeEls = {};
  $('hwarnT').textContent = ''; $('hwarn').classList.remove('on'); warnOff = false;
  $('hud').classList.remove('open');
  $('hFit').textContent = '';
  $('app').classList.remove('hidden');
  mode = null;
  renderList();
}

const _cp = new THREE.Vector3(), _sp = new THREE.Vector3();
const LBL_W = 1.7, LBL_H = 0.85;          // label size in metres at scale 1
const LBL_MAXW = 0.55, LBL_MAXH = 0.34;   // and never more than this share of the screen

/* Sprites are sized in metres, so a label that reads well at 10 m swallows the
   whole display once you walk up to the stem. Cap the scale by what the label
   is allowed to cover on screen: at distance d the viewport is 2*d*tanHalf
   metres wide, so the cap follows the screen, not a guessed minimum. */
function frustumTan(cam) {
  const pc = (cam.cameras && cam.cameras.length) ? cam.cameras[0] : cam;
  const e = pc.projectionMatrix.elements;
  return { x: e[0] ? Math.abs(1 / e[0]) : 1, y: e[5] ? Math.abs(1 / e[5]) : 1 };
}
function fitScale(k, d, t, w, h) {
  return Math.min(k, LBL_MAXW * 2 * d * t.x / w, LBL_MAXH * 2 * d * t.y / h);
}

function tick() {
  const cam = (renderer.xr.enabled && renderer.xr.isPresenting) ? renderer.xr.getCamera(camera) : camera;
  _cp.setFromMatrixPosition(cam.matrixWorld);
  const t = frustumTan(cam);
  let best = null, bd = 1e9;
  sprites.forEach(sp => {
    sp.getWorldPosition(_sp);
    const d = _cp.distanceTo(_sp);
    const k = THREE.MathUtils.clamp(d / 7, 0.7, 3.4);      // keep the label readable at distance
    const s = fitScale(k, d, t, LBL_W, LBL_H);
    sp.scale.set(LBL_W * s, LBL_H * s, 1);
    if (d < bd) { bd = d; best = sp; }
  });
  // measurement read-outs sit wherever you tapped, sometimes at arm's length
  mObjs.forEach(o => {
    const b = o.userData.base; if (!b) return;
    o.getWorldPosition(_sp);
    const s = fitScale(1, _cp.distanceTo(_sp), t, b[0], b[1]);
    o.scale.set(b[0] * s, b[1] * s, 1);
  });
  if ($('hud').classList.contains('open'))
    $('hNear').textContent = best ? (props(best.userData.idx).tree_id + ' ' + bd.toFixed(1) + ' m') : '';
  if (barkFor != null && (edgeTick % 4 === 2)) barkHint();
  if (mode && ((edgeTick++) % 4 === 0)) updateEdge();
}

/* ---- tapping ---- */
function pickFromRay(o, d) {
  ray.set(o, d);
  const hit = ray.intersectObjects(sprites, false);
  if (hit.length) return hit[0].object.userData.idx;
  let best = null, ba = Infinity;                          // tolerance: nearest sprite within 12 degrees
  sprites.forEach(sp => {
    sp.getWorldPosition(_sp);
    const v = _sp.clone().sub(o).normalize();
    const a = Math.acos(Math.min(1, Math.max(-1, v.dot(d)))) * 180 / Math.PI;
    if (a < ba) { ba = a; best = sp; }
  });
  return (best && ba < 12) ? best.userData.idx : null;
}
function onXRSelect(e) {
  if (!lastFrame || !xrRef) return;
  if (measure) { measureTap(); return; }          // a tap belongs to the tool that is running
  const pose = lastFrame.getPose(e.inputSource.targetRaySpace, xrRef);
  if (!pose) return;
  const m = new THREE.Matrix4().fromArray(pose.transform.matrix);
  const o = new THREE.Vector3().setFromMatrixPosition(m);
  const d = new THREE.Vector3(0, 0, -1).transformDirection(m);
  const i = pickFromRay(o, d);
  if (i !== null) { selectTree(i); openPanel(i); }
}
function onCamTap(ev) {
  const nx = (ev.clientX / innerWidth) * 2 - 1, ny = -(ev.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera({ x: nx, y: ny }, camera);
  const i = pickFromRay(ray.ray.origin.clone(), ray.ray.direction.clone());
  if (i !== null) { selectTree(i); openPanel(i); }
}

/* ======================= AR TOOLS (WebXR only) =======================
   Hit-test gives a point on a real surface, which is what turns the app from
   a viewer into a measuring device. Everything here degrades quietly: without
   the feature the buttons stay disabled rather than misbehaving. */

function xrCam() {
  const c = (renderer.xr.enabled && renderer.xr.isPresenting) ? renderer.xr.getCamera(camera) : camera;
  return (c.cameras && c.cameras.length) ? c.cameras[0] : c;
}
function camPos() { return new THREE.Vector3().setFromMatrixPosition(xrCam().matrixWorld); }
function camDir() { return new THREE.Vector3(0, 0, -1).transformDirection(xrCam().matrixWorld); }

function updateHitTest(frame) {
  if (!hitSource) { hitPt = null; reticle.visible = false; return; }
  const res = frame.getHitTestResults(hitSource);
  if (res.length) {
    const p = res[0].getPose(xrRef);
    if (p) {
      hitPt = new THREE.Vector3(p.transform.position.x, p.transform.position.y, p.transform.position.z);
      reticle.position.copy(hitPt);
      reticle.visible = !!(measure && measure.wantsHit);
      return;
    }
  }
  hitPt = null; reticle.visible = false;
}

/* ---- anchors: let ARCore hold the markers in place ----
   Without them the markers sit at fixed session coordinates and inherit every
   bit of tracking drift; anchored, ARCore re-localises them as you walk. */
const ANCH_DEAD = 0.30;    // ignore anchor offsets below this - jitter, not drift
const ANCH_RATE = 0.10;    // and correct the rest at most this fast (m/s)
let anchTime = 0;
function requestAnchors() { if (anchorsOk) { anchorsWanted = true; anchTime = 0; } }
function dropAnchors() {
  anchorMap.forEach(a => { try { a.delete(); } catch (e) {} });
  anchorMap.clear();
}
function updateAnchors(frame) {
  if (!anchorsOk || !origin || !world) return;
  world.updateMatrixWorld(true);
  if (anchorsWanted) {
    anchorsWanted = false;
    dropAnchors();
    const cp = camPos();
    world.children.forEach(g => {
      const wp = g.getWorldPosition(new THREE.Vector3());
      if (wp.distanceTo(cp) > 60) return;              // distant anchors buy nothing
      let pr;
      try {
        pr = frame.createAnchor(new XRRigidTransform({ x: wp.x, y: wp.y, z: wp.z }), xrRef);
      } catch (e) { anchorsOk = false; return; }
      if (pr && pr.then) pr.then(a => anchorMap.set(g.userData.idx, a)).catch(() => {});
    });
    return;
  }
  const now = performance.now();
  const dt = anchTime ? Math.min(0.1, (now - anchTime) / 1000) : 0;
  anchTime = now;
  anchorMap.forEach((a, idx) => {
    const pose = frame.getPose(a.anchorSpace, xrRef);
    if (!pose) return;
    const g = world.children.find(o => o.userData.idx === idx);
    if (!g) return;
    const p = pose.transform.position;
    const tgt = world.worldToLocal(new THREE.Vector3(p.x, p.y, p.z));
    // A marker that follows its anchor frame by frame twitches with every
    // re-localisation, and ARCore re-localises hardest where the camera has the
    // most detail - right in front of the tree you are standing at. Correct
    // real drift only, and slowly enough that nothing visibly slides.
    const off = tgt.sub(g.position);
    const len = off.length();
    if (len < ANCH_DEAD) return;
    g.position.addScaledVector(off, Math.min(len - ANCH_DEAD, ANCH_RATE * dt) / len);
  });
}

/* ---- selection ---- */
function selectTree(i) {
  selIdx = i;
  $('hSel').textContent = i == null ? '' : ('sel ' + props(i).tree_id);
}
function nearestTree() {
  const c = camPos();
  let best = null, bd = 1e9;
  sprites.forEach(sp => {
    const d = c.distanceTo(sp.getWorldPosition(new THREE.Vector3()));
    if (d < bd) { bd = d; best = sp.userData.idx; }
  });
  return best;
}

/* ---- measurement ---- */
const MEAS = {
  height:    { label: 'Tree height',      field: 'height_m',          hits: 1, aim: true },
  crownbase: { label: 'Crown base',       field: 'crown_base_m',      hits: 1, aim: true },
  crown:     { label: 'Crown diameter',   field: 'crown_d_m',         hits: 2, aim: false },
  target:    { label: 'Distance to target', field: 'target_distance_m', hits: 1, aim: false },
  stem:      { label: 'Stem position',    field: null,                hits: 1, aim: false },
  newtree:   { label: 'New tree here',    field: null,                hits: 1, aim: false },
  ref:       { label: 'Reference point',  field: null,                hits: 1, aim: false },
  tape:      { label: 'Tape',             field: null,                hits: 2, aim: false }
};
function mbar(txt, buttons) {
  $('mtxt').innerHTML = txt;
  const box = $('mbtn'); box.innerHTML = '';
  (buttons || []).forEach(b => {
    const el = document.createElement('button');
    el.textContent = b[0]; if (b[2]) el.className = b[2];
    el.onclick = b[1]; box.appendChild(el);
  });
  $('mbar').classList.add('on');
}
let mObjs = [];                    // what was drawn, and where it was hung
function clearMeasure() {
  measure = null;
  reticle.visible = false;
  $('mbar').classList.remove('on');
  mObjs.forEach(c => {
    if (c.material) { if (c.material.map) c.material.map.dispose(); c.material.dispose(); }
    if (c.geometry) c.geometry.dispose();
    if (c.parent) c.parent.remove(c);
  });
  mObjs = [];
}
/* A measurement of a tree hangs on that tree, so an anchor correction moves
   both together; a free tape hangs on the world, which is still georeferenced.
   Points come in as session coordinates and are converted to the parent's. */
function mParent(tree) {
  const g = (tree != null && world) ? world.children.find(o => o.userData.idx === tree) : null;
  return g || mGroup;
}
function valueSprite(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(10,16,13,.9)'; roundRect(g, 2, 2, 508, 124, 20); g.fill();
  g.lineWidth = 5; g.strokeStyle = '#8fd6a8'; roundRect(g, 2, 2, 508, 124, 20); g.stroke();
  g.fillStyle = '#dff0e6'; g.font = 'bold 58px system-ui,sans-serif'; g.textAlign = 'center';
  g.fillText(text, 256, 86);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  sp.scale.set(1.2, 0.3, 1); sp.renderOrder = 13;
  sp.userData.base = [1.2, 0.3];            // tick() caps this against the screen
  return sp;
}
function drawSegment(a, b, text, tree) {
  const parent = mParent(tree);
  parent.updateMatrixWorld(true);
  const la = parent.worldToLocal(a.clone()), lb = parent.worldToLocal(b.clone());
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([la, lb]),
    new THREE.LineBasicMaterial({ color: 0x8fd6a8, depthTest: false }));
  line.renderOrder = 12;
  parent.add(line); mObjs.push(line);
  const sp = valueSprite(text);
  sp.position.copy(la.clone().add(lb).multiplyScalar(0.5));
  parent.add(sp); mObjs.push(sp);
}

function startMeasure(kind, refArg) {
  if (mode !== 'WebXR') return toast('Measuring needs the WebXR mode.');
  if (!hitOk) return toast('Hit-test unavailable in this session.');
  $('mmenu').style.display = 'none';
  $('refmenu').style.display = 'none';
  $('ctl2').classList.remove('on');
  clearMeasure();
  const cfg = MEAS[kind];
  let tree = selIdx;
  if (cfg.field || kind === 'stem') {
    if (tree == null) { tree = nearestTree(); selectTree(tree); }
    if (tree == null) return toast('No tree to measure.');
  }
  measure = { kind: kind, cfg: cfg, tree: tree, step: 0, pts: [], wantsHit: true, refId: refArg };
  const who = kind === 'ref' ? ' · ' + ((controlByKey(refArg) || {}).name || '')
            : (tree == null || kind === 'newtree') ? '' : ' · ' + props(tree).tree_id;
  const ask = cfg.aim ? 'Aim at the stem base and tap'
            : kind === 'target' ? 'Aim at the target on the ground and tap'
            : kind === 'ref' ? 'Aim at the point itself and tap – or cancel and stand on it instead'
            : (kind === 'stem' || kind === 'newtree') ? 'Aim at the stem base and tap'
            : 'Aim at the first point and tap';
  mbar('<b>' + cfg.label + who + '</b><br>' + ask, [['Cancel', clearMeasure]]);
}

function measureTap() {
  const m = measure, cfg = m.cfg;
  if (m.wantsHit && !hitPt) { toast('No surface found – aim at the ground.'); return; }

  if (cfg.aim) {
    if (m.step === 0) {                                   // remember the base, then aim high
      m.pts[0] = hitPt.clone();
      m.step = 1; m.wantsHit = false; reticle.visible = false;
      mbar('<b>' + cfg.label + '</b><br>Now aim at the ' +
           (m.kind === 'height' ? 'treetop' : 'lowest live branch') + ' and tap',
           [['Cancel', clearMeasure]]);
      return;
    }
    const base = m.pts[0], c = camPos(), d = camDir();
    const horiz = Math.hypot(c.x - base.x, c.z - base.z);
    const el = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
    if (horiz < 1.5) return mbar('<b>Too close</b><br>Step back – at least a few metres from the stem.',
                                 [['Again', () => startMeasure(m.kind)], ['Cancel', clearMeasure]]);
    if (el < 0.09) return mbar('<b>Aim higher</b><br>The sightline is almost level, the result would be meaningless.',
                               [['Again', () => startMeasure(m.kind)], ['Cancel', clearMeasure]]);
    const top = c.y + horiz * Math.tan(el);
    const h = top - base.y;
    drawSegment(base, new THREE.Vector3(base.x, top, base.z), h.toFixed(1) + ' m', m.tree);
    finishMeasure(h, cfg.label + ' ' + h.toFixed(1) + ' m<br><span class="small">' +
      horiz.toFixed(1) + ' m from the stem, ' + (el * 180 / Math.PI).toFixed(0) + '° up</span>');
    return;
  }

  if (m.kind === 'stem') {
    const g = sceneToWgs(hitPt);
    if (!g) { toast('No origin yet – no GPS fix.'); return clearMeasure(); }
    setCoords(m.tree, g.lon, g.lat, 'AR hit-test', originAcc);
    toast('Stem position of ' + props(m.tree).tree_id + ' set.');
    requestAnchors();
    clearMeasure();
    return;
  }

  if (m.kind === 'ref') {
    // stored in session coordinates, not as a lat/lon: the fit is about to
    // move the world under this point, and the measurement must not move with
    // it. Height is dropped - the fit is a two-dimensional one.
    refFix.set(m.refId, { x: hitPt.x, z: hitPt.z });
    clearMeasure();
    const c = controlByKey(m.refId);
    const done = controlList().filter(r => refFix.has(r.key)).length;
    if (done < 2) toast((c ? c.name : 'Point') + ' measured – one more and it fits.');
    else fitFromRefs(false);
    showFit(); buildRefMenu();
    $('refmenu').style.display = 'block';       // stay open: the next point is one tap away
    return;
  }

  if (m.kind === 'newtree') {
    const g = sceneToWgs(hitPt);
    if (!g) { toast('No origin yet – no GPS fix.'); return clearMeasure(); }
    const i = addTree(g.lon, g.lat, 'AR hit-test', originAcc);
    selectTree(i);
    clearMeasure();
    toast('New tree ' + props(i).tree_id + ' placed where you aimed.');
    openPanel(i);
    return;
  }

  if (m.kind === 'target') {
    const g = world.children.find(o => o.userData.idx === m.tree);
    if (!g) return clearMeasure();
    const stem = g.getWorldPosition(new THREE.Vector3());
    const d = Math.hypot(hitPt.x - stem.x, hitPt.z - stem.z);
    drawSegment(new THREE.Vector3(stem.x, hitPt.y, stem.z), hitPt.clone(), d.toFixed(1) + ' m', m.tree);
    const h = num(props(m.tree).height_m);
    const zone = (h && d <= h) ? '<br><span class="small">inside the fall zone (' + h.toFixed(0) + ' m tree)</span>' : '';
    finishMeasure(d, 'Distance to target ' + d.toFixed(1) + ' m' + zone);
    return;
  }

  // two free points: crown diameter or plain tape
  if (m.step === 0) {
    m.pts[0] = hitPt.clone(); m.step = 1;
    mbar('<b>' + cfg.label + '</b><br>Aim at the second point and tap', [['Cancel', clearMeasure]]);
    return;
  }
  const a = m.pts[0], b = hitPt.clone();
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  drawSegment(a, b, d.toFixed(1) + ' m', m.kind === 'crown' ? m.tree : null);
  finishMeasure(d, cfg.label + ' ' + d.toFixed(1) + ' m');
}

function finishMeasure(value, html) {
  const m = measure;
  m.value = value; m.wantsHit = false;
  reticle.visible = false;
  const btns = [];
  if (m.cfg.field) {
    html = props(m.tree).tree_id + ' · ' + html;
    btns.push(['Apply', () => {
      const patch = {};
      patch[m.cfg.field] = Math.round(value * 10) / 10;
      setEdit(m.tree, patch);
      toast(m.cfg.label + ' saved to ' + props(m.tree).tree_id + '.');
      clearMeasure();
    }, 'p']);
  }
  btns.push(['Again', () => startMeasure(m.kind)]);
  btns.push(['Close', clearMeasure]);
  mbar(html, btns);
}

function buildMeasureMenu() {
  const el = $('mmenu');
  el.innerHTML = '';
  const row = document.createElement('div'); row.className = 'btnrow';
  [['height', 'Height'], ['crownbase', 'Crown base'], ['crown', 'Crown Ø'],
   ['target', 'Target dist.'], ['stem', 'Stem position'], ['newtree', '+ New tree'],
   ['tape', 'Tape']].forEach(k => {
    const b = document.createElement('button');
    b.className = 'sm'; b.textContent = k[1];
    b.onclick = () => startMeasure(k[0]);
    row.appendChild(b);
  });
  const c = document.createElement('button');
  c.className = 'sm'; c.textContent = 'Cancel';
  c.onclick = () => { el.style.display = 'none'; };
  row.appendChild(c);
  el.appendChild(row);
}

/* ---- bark photograph at breast height ----
   The field rule: photograph the bark at 1.30 m on the side the number tag
   hangs, so next year's photograph shows the same patch of the same trunk and
   the two can be compared. Bark is individual, but only if the frame is
   repeatable, so the three things that decide the frame are gated here rather
   than left to the eye: how high the camera is, whether it is level, and which
   way it faces. WebXR gives all three - local-floor makes the camera's y a
   height above the ground, and the world is north-aligned once fitted.

   The first bark photograph of a tree defines its side; later ones are held to
   it. */
const BARK_H = 1.30, BARK_H_TOL = 0.12, BARK_PITCH_TOL = 8, BARK_BEAR_TOL = 22;
let barkFor = null, barkRef = null;

function camPitchDeg() {
  const d = camDir();
  return Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)) * 180 / Math.PI;
}
function barkState() {
  const h = camPos().y, pitch = camPitchDeg();
  const bear = (camYawDeg() + worldYaw + headOff) % 360;
  const dh = h - BARK_H;
  let db = null;
  if (barkRef != null) {
    db = ((bear - barkRef + 540) % 360) - 180;
  }
  return {
    h: h, dh: dh, pitch: pitch, bearing: bear, dBear: db,
    okH: Math.abs(dh) <= BARK_H_TOL,
    okP: Math.abs(pitch) <= BARK_PITCH_TOL,
    okB: db == null || Math.abs(db) <= BARK_BEAR_TOL
  };
}
function barkHint() {
  if (barkFor == null) return;
  const st = barkState();
  const arrow = v => v > 0 ? '↓ lower' : '↑ raise';
  const parts = [
    (st.okH ? '✓ ' : '') + st.h.toFixed(2) + ' m' + (st.okH ? '' : ' – ' + arrow(st.dh)),
    (st.okP ? '✓ level' : (st.pitch > 0 ? 'tilt down' : 'tilt up') + ' ' + Math.abs(st.pitch).toFixed(0) + '°')
  ];
  if (st.dBear != null)
    parts.push(st.okB ? '✓ right side'
      : 'go ' + (st.dBear > 0 ? 'left' : 'right') + ' ' + Math.abs(st.dBear).toFixed(0) + '° round the stem');
  else parts.push('side: where the number hangs');
  const ready = st.okH && st.okP && st.okB;
  mbar('<b>Bark at 1.30 m · ' + (props(barkFor).tag_no || props(barkFor).tree_id) + '</b><br>' +
       parts.join(' · '),
       [[ready ? 'Take it' : 'Not yet', ready ? () => { shotFor = barkFor; shotKind = 'bark';
            barkFor = null; clearMeasure(); toast('Bark photo …'); } : () => {}, ready ? 'p' : ''],
        ['Cancel', () => { barkFor = null; clearMeasure(); }]]);
}
function startBark(tree) {
  if (mode !== 'WebXR') return toast('Bark photos need the WebXR mode – it is what measures the height.');
  if (!camAccessOk) return toast('This session did not grant camera access.');
  clearMeasure();
  barkFor = tree; barkRef = null;
  photoList(props(tree).tree_id).then(ps => {
    const b = ps.filter(x => x.kind === 'bark' && x.bearing != null)
               .sort((x, y) => (x.ts < y.ts ? 1 : -1))[0];
    barkRef = b ? b.bearing : null;
    if (b) toast('Earlier bark photo from ' + b.bearing + '° – line up with it.');
  }).catch(() => {});
}

/* ---- photo from inside the session ----
   Without camera-access the file dialog is the only route, and Chrome blocks
   that during an immersive session. */
function takeARPhoto(frame) {
  const tree = shotFor; shotFor = null;
  try {
    const pose = frame.getViewerPose(xrRef);
    if (!pose || !pose.views.length) throw new Error('no viewer pose');
    const view = pose.views[0];
    if (!view.camera) throw new Error('no camera image in this frame');
    const gl = renderer.getContext();
    const tex = new XRWebGLBinding(xrSession, gl).getCameraImage(view.camera);
    const w = view.camera.width, h = view.camera.height;
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
    if (renderer.resetState) renderer.resetState();
    else if (renderer.state && renderer.state.reset) renderer.state.reset();

    const src = document.createElement('canvas'); src.width = w; src.height = h;
    const ctx = src.getContext('2d');
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {                       // GL reads bottom-up
      const s = (h - 1 - y) * w * 4, t = y * w * 4;
      img.data.set(px.subarray(s, s + w * 4), t);
    }
    ctx.putImageData(img, 0, 0);
    const k = Math.min(1, 1440 / Math.max(w, h));
    const out = document.createElement('canvas');
    out.width = Math.round(w * k); out.height = Math.round(h * k);
    out.getContext('2d').drawImage(src, 0, 0, out.width, out.height);

    const meta = { mode: 'AR' };
    const c = camPos();
    const gp = sceneToWgs(c);
    if (gp) { meta.lat = +gp.lat.toFixed(7); meta.lon = +gp.lon.toFixed(7); }
    meta.bearing = Math.round((camYawDeg() + worldYaw + headOff) % 360);
    meta.h = +c.y.toFixed(2);
    meta.pitch = Math.round(camPitchDeg());
    if (shotKind) { meta.kind = shotKind; shotKind = null; }
    const g = world.children.find(o => o.userData.idx === tree);
    if (g) meta.dist = +c.distanceTo(g.getWorldPosition(new THREE.Vector3())).toFixed(1);

    photoAdd(props(tree).tree_id, out.toDataURL('image/jpeg', 0.72), meta)
      .then(() => toast('Photo of ' + props(tree).tree_id + ' stored.'))
      .catch(e => toast('Photo storage: ' + e.message));
  } catch (e) {
    toast('Camera capture failed: ' + e.message);
  }
}

/* ---- direction arrows for markers outside the view ---- */
function buildEdge() {
  const box = $('edge'); box.innerHTML = ''; edgeEls = {};
  CAT.features.forEach((f, i) => {
    const d = document.createElement('div'); d.className = 'ea';
    d.innerHTML = '<span class="g">➤</span><span class="l"></span>';
    box.appendChild(d); edgeEls[i] = d;
  });
}
function updateEdge() {
  const cam = xrCam(), cw = innerWidth, ch = innerHeight;
  const c = camPos();
  // own inverse: matrixWorldInverse is only refreshed inside render(), which
  // runs after this, so using it would lag a frame and be wrong on the first
  const inv = new THREE.Matrix4().copy(cam.matrixWorld).invert();
  const off = [];
  sprites.forEach(sp => {
    const el = edgeEls[sp.userData.idx];
    if (!el) return;
    const wp = sp.getWorldPosition(new THREE.Vector3());
    const dist = c.distanceTo(wp);
    if (dist < 2) { el.classList.remove('on'); return; }   // you are standing at it
    const eye = wp.clone().applyMatrix4(inv);
    let x, y, on = false;
    if (eye.z < -0.05) {                                   // in front: project normally
      const ndc = eye.clone().applyMatrix4(cam.projectionMatrix);
      x = ndc.x; y = ndc.y;
      on = Math.abs(x) <= 1 && Math.abs(y) <= 1;
    } else {
      // on the camera plane the projection divides by zero, and behind it the
      // sign flips - take the direction straight from eye space instead
      const len = Math.hypot(eye.x, eye.y) || 1;
      x = eye.x / len * 2; y = eye.y / len * 2;
    }
    if (on) { el.classList.remove('on'); return; }
    off.push({ el: el, x: x, y: y, d: dist, idx: sp.userData.idx });
  });
  off.sort((a, b) => a.d - b.d);
  const placed = [];
  off.forEach((o, n) => {
    if (n > 2) { o.el.classList.remove('on'); return; }   // three at most, or it is a mess
    const m = Math.max(Math.abs(o.x), Math.abs(o.y)) || 1;
    const x = o.x / m, y = o.y / m;
    const mg = 54;
    const left = Math.min(cw - mg, Math.max(mg, (x * 0.5 + 0.5) * cw));
    let top = Math.min(ch - mg, Math.max(mg, (-y * 0.5 + 0.5) * ch));
    // trees in the same direction land on the same spot - stack them instead
    while (placed.some(p => Math.abs(p.left - left) < 60 && Math.abs(p.top - top) < 34)) {
      top += 34;
      if (top > ch - mg) { top = mg; break; }
    }
    placed.push({ left: left, top: top });
    o.el.style.left = left + 'px'; o.el.style.top = top + 'px';
    o.el.querySelector('.g').style.transform = 'rotate(' + (Math.atan2(-y, x) * 180 / Math.PI) + 'deg)';
    o.el.querySelector('.l').textContent = props(o.idx).tree_id + ' ' + o.d.toFixed(0) + ' m';
    o.el.classList.add('on');
  });
}

/* ---- "I am standing at ..." (prompt() is blocked inside the AR overlay) ---- */
function buildRefMenu() {
  const el = $('refmenu');
  el.innerHTML = '';
  const list = controlList();
  const done = list.filter(r => refFix.has(r.key)).length;

  const head = document.createElement('div');
  head.innerHTML = '<b>Georeference</b>';
  el.appendChild(head);
  const st = document.createElement('div'); st.className = 'small'; st.style.margin = '2px 0 8px';
  st.innerHTML = lastFit
    ? (lastFit.auto
        ? '<b style="color:#8fd6a8">Markers aligned by walking</b> · from ' + lastFit.n +
          ' GPS fixes · direction good, position within a few metres'
        : '<b style="color:#8fd6a8">Markers aligned</b> · ' + lastFit.n + ' points · ±' +
          lastFit.rms.toFixed(2) + ' m · worst ' + lastFit.worst + ' ' + lastFit.max.toFixed(2) + ' m')
    : done === 1 ? '<b>1 point</b> · markers sit on it, direction still from the compass'
    : done ? '<b>' + done + ' points</b> · press Apply'
    : 'Markers not aligned · walk a bit, or stand on a point and press below';
  el.appendChild(st);

  const rows = document.createElement('div');
  list.forEach(r => {
    const has = refFix.has(r.key);
    const line = document.createElement('div'); line.className = 'refrow' + (has ? ' has' : '');
    const nm = document.createElement('span'); nm.className = 'nm';
    nm.textContent = (has ? '✓ ' : '') + r.name + (r.ref ? '' : ' ⌇');
    const here = document.createElement('button'); here.className = 'sm p';
    here.textContent = has ? 'Again' : 'I stand here';
    here.onclick = () => markControlHere(r.key);
    const aim = document.createElement('button'); aim.className = 'sm';
    aim.textContent = 'Aim'; aim.title = 'for a point you cannot stand on';
    aim.disabled = !hitOk;
    aim.onclick = () => startMeasure('ref', r.key);
    line.appendChild(nm); line.appendChild(here); line.appendChild(aim);
    rows.appendChild(line);
  });
  if (!list.length) {
    const e = document.createElement('div'); e.className = 'small';
    e.textContent = 'No points yet – set them on the map tab.';
    rows.appendChild(e);
  }
  el.appendChild(rows);

  const act = document.createElement('div'); act.className = 'btnrow'; act.style.marginTop = '8px';
  const ap = document.createElement('button');
  ap.className = done >= 2 ? 'p' : ''; ap.disabled = done < 2;
  ap.textContent = done >= 2 ? 'Apply and close' : 'Apply (needs 2)';
  ap.onclick = () => {
    if (!fitFromRefs(false)) return;
    el.style.display = 'none';
  };
  act.appendChild(ap);
  if (done) {
    const c = document.createElement('button'); c.className = 'x'; c.textContent = 'Start over';
    c.onclick = () => {
      refFix.clear(); lastFit = null; track = []; showFit(); buildRefMenu();
      toast('Measurements cleared – walking will fit the scene again.');
    };
    act.appendChild(c);
  }
  const x = document.createElement('button'); x.textContent = 'Close';
  x.onclick = () => { el.style.display = 'none'; };
  act.appendChild(x);
  el.appendChild(act);
}

function buildChooser() {
  const c = $('chooser');
  c.innerHTML = '';
  const row = document.createElement('div'); row.className = 'btnrow';
  CAT.features.forEach((f, i) => {
    const b = document.createElement('button');
    b.className = 'sm'; b.textContent = props(i).tree_id;
    b.onclick = () => {
      const co = f.geometry.coordinates;
      setOriginHere(co[1], co[0], num(props(i).position_accuracy_m));
      requestAnchors(); c.style.display = 'none';
      selectTree(i);
      toast('You are at ' + props(i).tree_id + ' – scene re-hung on it.');
    };
    row.appendChild(b);
  });
  if (!CAT.features.length) {
    const e = document.createElement('span'); e.className = 'small';
    e.textContent = 'No trees in the register yet. ';
    row.appendChild(e);
  }
  const ab = document.createElement('button');
  ab.className = 'sm'; ab.textContent = 'Cancel';
  ab.onclick = () => { c.style.display = 'none'; };
  row.appendChild(ab);
  c.appendChild(row);
}

/* ============================== MAP ==============================
   A slippy map is a few lines of Web Mercator and a grid of images, and a
   library would be a bigger dependency than the whole feature. Tiles come from
   OpenStreetMap and are cached by the service worker, so an area you have
   looked at once is there again without a network. */

const TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAPZ = { min: 12, max: 19 };
let mapView = null, mapTiles = {}, mapDrag = null, mapPinch = null;

function lon2px(lon, z) { return (lon + 180) / 360 * 256 * Math.pow(2, z); }
function lat2px(lat, z) {
  const s = Math.sin(Math.max(-85, Math.min(85, lat)) * Math.PI / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256 * Math.pow(2, z);
}
function px2lon(x, z) { return x / (256 * Math.pow(2, z)) * 360 - 180; }
function px2lat(y, z) {
  const n = Math.PI - 2 * Math.PI * y / (256 * Math.pow(2, z));
  return 180 / Math.PI * Math.atan(Math.sinh(n));
}
function mapCentre() {
  if (mapView) return mapView;
  const c = (REFS[0] && { lat: REFS[0].lat, lon: REFS[0].lon }) ||
            (CAT.features[0] && { lat: CAT.features[0].geometry.coordinates[1],
                                  lon: CAT.features[0].geometry.coordinates[0] }) ||
            (lastFix && { lat: lastFix.lat, lon: lastFix.lon }) || { lat: 51.0, lon: 10.0 };
  mapView = { lat: c.lat, lon: c.lon, z: (REFS[0] || CAT.features[0] || lastFix) ? 18 : 6 };
  return mapView;
}
function drawMap() {
  const box = $('mapBox'); if (!box || !box.offsetWidth) return;
  const v = mapCentre(), w = box.clientWidth, h = box.clientHeight, sc = Math.pow(2, v.z);
  const cx = lon2px(v.lon, v.z), cy = lat2px(v.lat, v.z);
  const left = cx - w / 2, top = cy - h / 2;
  const t0x = Math.floor(left / 256), t1x = Math.floor((left + w) / 256);
  const t0y = Math.floor(top / 256), t1y = Math.floor((top + h) / 256);
  const layer = $('mapTiles'), seen = {};
  for (let tx = t0x; tx <= t1x; tx++) {
    for (let ty = t0y; ty <= t1y; ty++) {
      if (ty < 0 || ty >= sc) continue;
      const wx = ((tx % sc) + sc) % sc;                    // wrap around the globe
      const key = v.z + '/' + wx + '/' + ty;
      seen[key] = 1;
      let img = mapTiles[key];
      if (!img) {
        img = document.createElement('img');
        img.src = TILE.replace('{z}', v.z).replace('{x}', wx).replace('{y}', ty);
        img.alt = ''; img.loading = 'eager'; img.draggable = false;
        img.onerror = () => { img.style.visibility = 'hidden'; };
        mapTiles[key] = img; layer.appendChild(img);
      }
      img.style.left = (tx * 256 - left) + 'px';
      img.style.top = (ty * 256 - top) + 'px';
    }
  }
  Object.keys(mapTiles).forEach(k => {
    if (!seen[k]) { mapTiles[k].remove(); delete mapTiles[k]; }
  });
  drawMapMarks(left, top, v.z);
  $('mapInfo').textContent = v.lat.toFixed(6) + ', ' + v.lon.toFixed(6) + '  ·  z' + v.z +
    (lastFix ? '  ·  GPS ±' + lastFix.acc.toFixed(0) + ' m' : '');
  if (mapSel != null) syncMapSel();
}
let mapSel = null;                 // index of the tree picked on the map
function mapMPP(lat, z) { return 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, z); }
function drawMapMarks(left, top, z) {
  const layer = $('mapMarks');
  layer.innerHTML = '';
  // the phone's own accuracy claim, drawn to scale: a fix is a circle, and
  // seeing it beside the building says more than a number in the header
  if (lastFix && lastFix.acc) {
    const r = lastFix.acc / mapMPP(lastFix.lat, z);
    const c = document.createElement('div'); c.className = 'acc';
    c.style.left = (lon2px(lastFix.lon, z) - left) + 'px';
    c.style.top = (lat2px(lastFix.lat, z) - top) + 'px';
    c.style.width = c.style.height = (r * 2) + 'px';
    c.style.margin = (-r) + 'px 0 0 ' + (-r) + 'px';
    layer.appendChild(c);
  }
  const put = (lat, lon, cls, label) => {
    const d = document.createElement('div'); d.className = 'mk ' + cls;
    d.style.left = (lon2px(lon, z) - left) + 'px';
    d.style.top = (lat2px(lat, z) - top) + 'px';
    if (label) { const t = document.createElement('span'); t.textContent = label; d.appendChild(t); }
    layer.appendChild(d);
  };
  CAT.features.forEach((f, i) => {
    if (!f.geometry || f.geometry.type !== 'Point') return;
    const c = f.geometry.coordinates;
    put(c[1], c[0], 'mkT' + (i === mapSel ? ' sel' : ''), (z >= 18 || i === mapSel) ? props(i).tree_id : '');
  });
  REFS.forEach(r => put(r.lat, r.lon, 'mkR', r.id));
  if (lastFix) put(lastFix.lat, lastFix.lon, 'mkMe', '');
}
function mapMoveBy(dx, dy) {
  const v = mapCentre();
  const cx = lon2px(v.lon, v.z) - dx, cy = lat2px(v.lat, v.z) - dy;
  v.lon = px2lon(cx, v.z); v.lat = px2lat(cy, v.z);
  drawMap();
}
function mapZoom(dz) {
  const v = mapCentre();
  const z = Math.max(MAPZ.min, Math.min(MAPZ.max, v.z + dz));
  if (z === v.z) return;
  v.z = z; drawMap();
}
function wireMap() {
  const box = $('mapBox');
  box.addEventListener('pointerdown', e => {
    box.setPointerCapture(e.pointerId);
    if (mapDrag && mapDrag.id !== e.pointerId) {          // second finger: pinch
      mapPinch = { a: mapDrag, b: { id: e.pointerId, x: e.clientX, y: e.clientY }, d: 0 };
      mapPinch.d = Math.hypot(mapPinch.a.x - mapPinch.b.x, mapPinch.a.y - mapPinch.b.y);
      return;
    }
    mapDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY };
  });
  box.addEventListener('pointermove', e => {
    if (mapPinch) {
      const p = (e.pointerId === mapPinch.a.id) ? mapPinch.a : (e.pointerId === mapPinch.b.id) ? mapPinch.b : null;
      if (!p) return;
      p.x = e.clientX; p.y = e.clientY;
      const d = Math.hypot(mapPinch.a.x - mapPinch.b.x, mapPinch.a.y - mapPinch.b.y);
      if (mapPinch.d && d / mapPinch.d > 1.6) { mapZoom(1); mapPinch.d = d; }
      if (mapPinch.d && d / mapPinch.d < 0.62) { mapZoom(-1); mapPinch.d = d; }
      return;
    }
    if (!mapDrag || e.pointerId !== mapDrag.id) return;
    mapMoveBy(e.clientX - mapDrag.x, e.clientY - mapDrag.y);
    mapDrag.x = e.clientX; mapDrag.y = e.clientY;
  });
  const up = e => {
    if (mapPinch && (e.pointerId === mapPinch.a.id || e.pointerId === mapPinch.b.id)) { mapPinch = null; mapDrag = null; return; }
    if (mapDrag && e.pointerId === mapDrag.id) {
      if (Math.hypot(e.clientX - mapDrag.x0, e.clientY - mapDrag.y0) < 7) mapPick(e);
      mapDrag = null;
    }
  };
  box.addEventListener('pointerup', up);
  box.addEventListener('pointercancel', up);
  addEventListener('resize', () => { if ($('sc-map').classList.contains('on')) drawMap(); });

  $('mZin').onclick = () => mapZoom(1);
  $('mZout').onclick = () => mapZoom(-1);
  $('mMe').onclick = () => {
    if (!lastFix) return toast('No GPS fix.');
    const v = mapCentre(); v.lat = lastFix.lat; v.lon = lastFix.lon; v.z = Math.max(v.z, 18); drawMap();
  };
  $('mAddRef').onclick = () => {
    const v = mapCentre();
    const id = ($('mRefId').value || '').trim() || ('P' + (REFS.length + 1));
    if (refById(id)) return toast('A reference point called ' + id + ' already exists.');
    REFS.push({ id: id, lat: +v.lat.toFixed(7), lon: +v.lon.toFixed(7),
                note: 'picked on the map', acc: null });
    saveRefs(); $('mRefId').value = ''; drawMap(); renderRefs();
    toast('Reference point ' + id + ' set at the crosshair.');
  };
  $('mMove').onclick = () => {
    if (mapSel == null) return;
    const v = mapCentre(), id = tid(mapSel);
    setCoords(mapSel, v.lon, v.lat, 'moved on the map', null);
    drawMap(); syncMapSel();
    toast(id + ' moved to the crosshair.');
  };
  $('mAddTree').onclick = () => {
    const v = mapCentre();
    const i = addTree(v.lon, v.lat, 'picked on the map', null);
    drawMap(); openPanel(i, 'base');
  };
}
/* A tap that did not pan is a pick: take the nearest tree within a thumb's
   width, so a shifted marker can be dragged onto the truth without leaving
   the map. */
function mapPick(e) {
  const box = $('mapBox'), r = box.getBoundingClientRect();
  const v = mapCentre(), w = box.clientWidth, h = box.clientHeight;
  const left = lon2px(v.lon, v.z) - w / 2, top = lat2px(v.lat, v.z) - h / 2;
  const px = e.clientX - r.left, py = e.clientY - r.top;
  let best = null, bd = 26;
  CAT.features.forEach((f, i) => {
    if (!f.geometry || f.geometry.type !== 'Point') return;
    const c = f.geometry.coordinates;
    const d = Math.hypot(lon2px(c[0], v.z) - left - px, lat2px(c[1], v.z) - top - py);
    if (d < bd) { bd = d; best = i; }
  });
  mapSel = (best === mapSel) ? null : best;
  drawMap(); syncMapSel();
}
function syncMapSel() {
  const b = $('mMove'), info = $('mSel');
  if (mapSel == null || !CAT.features[mapSel]) {
    mapSel = null; b.style.display = 'none'; info.textContent = 'Tap a tree on the map to pick it.';
    return;
  }
  const v = mapCentre(), c = CAT.features[mapSel].geometry.coordinates;
  const d = distBear(c[1], c[0], v.lat, v.lon).d;
  b.style.display = ''; b.textContent = 'Move ' + tid(mapSel) + ' here (' + d.toFixed(1) + ' m)';
  info.textContent = tid(mapSel) + ' picked · ' + (props(mapSel).species || 'no species');
}
function renderRefs() {
  const box = $('refList'); if (!box) return;
  box.innerHTML = '';
  if (!REFS.length) {
    box.innerHTML = '<p class="small">None yet. Pan the crosshair onto something you can ' +
      'stand on and recognise – a path junction, a building corner, a post – and set a point.</p>';
    return;
  }
  REFS.forEach(r => {
    const row = document.createElement('div'); row.className = 'kv';
    const a = document.createElement('span');
    a.innerHTML = '<b>' + r.id + '</b> <span class="small">' + r.lat.toFixed(6) + ', ' +
                  r.lon.toFixed(6) + '</span>';
    const bs = document.createElement('span');
    const go = document.createElement('button'); go.className = 'sm'; go.textContent = 'Show';
    go.onclick = () => { const v = mapCentre(); v.lat = r.lat; v.lon = r.lon; v.z = 19; drawMap(); };
    const del = document.createElement('button'); del.className = 'sm x'; del.textContent = 'Delete';
    del.onclick = () => {
      REFS = REFS.filter(x => x.id !== r.id); refFix.delete(r.id); saveRefs();
      drawMap(); renderRefs(); toast(r.id + ' deleted.');
    };
    bs.appendChild(go); bs.appendChild(del);
    row.appendChild(a); row.appendChild(bs);
    box.appendChild(row);
  });
}

/* ============================ PANEL ============================ */

let openIdx = null, panelEl = null, panelTab = 'vta';
function panelTarget() { return (mode ? $('panelXR') : $('panelHome')); }

function fieldRow(k, lab, typ, opt, p) {
  const r = document.createElement('div');
  r.className = 'row' + (typ === 'area' || typ === 'list' ? ' wide' : '');
  const l = document.createElement('label'); l.textContent = lab; r.appendChild(l);
  let inp;
  if (typ === 'select') {
    inp = document.createElement('select');
    opt.forEach(o => { const e2 = document.createElement('option'); e2.value = o; e2.textContent = o; inp.appendChild(e2); });
    inp.value = p[k];
  } else if (typ === 'area') {
    inp = document.createElement('textarea'); inp.value = p[k] == null ? '' : p[k];
  } else if (typ === 'list') {
    inp = document.createElement('textarea'); inp.value = (p[k] || []).join('\n');
    inp.placeholder = 'one entry per line';
  } else if (typ === 'species') {
    // a datalist is a suggestion the browser may or may not show - Chrome on
    // Android often shows nothing at all - so the list is a real select, with
    // the text field kept beside it for anything the list does not have
    const box = document.createElement('div'); box.className = 'spbox';
    const sel = document.createElement('select');
    const none = document.createElement('option');
    none.value = ''; none.textContent = 'Pick a species…'; sel.appendChild(none);
    SPECIES.forEach(x => {
      const o = document.createElement('option');
      o.value = x[0]; o.textContent = x[0] + ' · ' + x[1]; sel.appendChild(o);
    });
    inp = document.createElement('input'); inp.type = 'text';
    inp.value = p[k] == null ? '' : p[k];
    inp.placeholder = 'or type it';
    inp.setAttribute('autocapitalize', 'words');
    sel.value = SPECIES.some(x => x[0] === inp.value) ? inp.value : '';
    sel.onchange = () => {
      if (!sel.value) return;
      inp.value = sel.value;
      const hit = SPECIES.find(x => x[0] === sel.value);
      const cn = panelEl && panelEl.querySelector('[data-k="name_en"]');
      if (hit && cn && !cn.value.trim()) cn.value = hit[1];
    };
    inp.onchange = () => {
      sel.value = SPECIES.some(x => x[0] === inp.value.trim()) ? inp.value.trim() : '';
    };
    box.appendChild(sel); box.appendChild(inp);
    inp.dataset.k = k; inp.dataset.t = 'text';
    r.appendChild(box);
    return r;
  } else {
    inp = document.createElement('input'); inp.type = typ;
    inp.value = p[k] == null ? '' : p[k];
    if (typ === 'number') inp.setAttribute('inputmode', 'decimal');
  }
  inp.dataset.k = k; inp.dataset.t = typ;
  r.appendChild(inp);
  return r;
}

/* ------------------ position editor (stem base) ------------------
   The shipped coordinates are crown centres digitised from aerial imagery, so
   every stem needs correcting once. Three ways in, all writing straight to the
   catalogue: type the coordinate, average a series of GPS fixes while standing
   at the stem, or nudge the point in metres. */
function setCoords(i, lon, lat, source, acc) {
  const f = CAT.features[i];
  if (!f.properties.orig_coordinates) f.properties.orig_coordinates = f.geometry.coordinates.slice();
  f.geometry.coordinates = [+(+lon).toFixed(7), +(+lat).toFixed(7)];
  if (source) f.properties.geometry_source = source;
  if (acc != null) {
    f.properties.position_accuracy_m = Math.round(acc * 10) / 10;
    // a stale accuracy in the field record would shadow the new one
    if (edits[tid(i)] && 'position_accuracy_m' in edits[tid(i)]) {
      delete edits[tid(i)].position_accuracy_m; saveEdits();
    }
  }
  saveCat(); placeMarkers(); renderList(); syncGeo(i);
}
function syncGeo(i) {
  if (!panelEl || openIdx !== i) return;
  const f = CAT.features[i], c = f.geometry.coordinates;
  const lonI = panelEl.querySelector('[data-geo="lon"]'), latI = panelEl.querySelector('[data-geo="lat"]');
  if (lonI && document.activeElement !== lonI) lonI.value = c[0];
  if (latI && document.activeElement !== latI) latI.value = c[1];
  const info = panelEl.querySelector('#geoInfo');
  if (!info) return;
  const o = f.properties.orig_coordinates;
  const moved = o ? distBear(c[1], c[0], o[1], o[0]).d : 0;
  info.innerHTML =
    '<div class="kv"><span>Source</span><span>' + (f.properties.geometry_source || '–') + '</span></div>' +
    '<div class="kv"><span>Accuracy</span><span>±' + (f.properties.position_accuracy_m == null ? '?' : f.properties.position_accuracy_m) + ' m</span></div>' +
    (o ? '<div class="kv"><span>Moved from catalogue</span><span>' + moved.toFixed(2) + ' m</span></div>' : '');
}
/* A new tree is only ever as good as the position it is given, so record where
   it came from and let the caller pick the source. */
function addTree(lon, lat, source, acc) {
  const id = 'NEW-' + stamp().replace(/-/g, '').slice(4, 12) + '-' + Math.random().toString(36).slice(2, 5);
  const today = new Date().toISOString().slice(0, 10);
  CAT.features.push({
    type: 'Feature', geometry: { type: 'Point', coordinates: [+(+lon).toFixed(7), +(+lat).toFixed(7)] },
    properties: {
      tree_id: id, species: '', name_en: '', inspector: '', geometry_source: source,
      position_accuracy_m: acc == null ? null : Math.round(acc * 10) / 10, vitality_roloff: 0,
      crown_dieback_pct: 0, damage_class: 'none', cavity: 'no',
      stability: 'adequate', breakage_resistance: 'adequate', traffic_safety: 'adequate',
      urgency: 'none', inspection_type: 'Routine inspection', last_inspection: today,
      interval_months: 12, symptoms: [], actions: [], remarks: '', history: []
    }
  });
  saveCat(); buildMarkers(); renderList();
  return CAT.features.length - 1;
}

/* Removing a tree shifts every index above it, and half the app holds indices:
   the panel, the selection, a running measurement, the AR overlay lists. Drop
   all of them rather than trying to renumber. */
function deleteTree(i) {
  const id = tid(i);
  CAT.features.splice(i, 1);
  if (edits[id]) { delete edits[id]; saveEdits(); }
  saveCat();
  closePanel();
  if (measure) clearMeasure();
  selectTree(null);
  buildMarkers(); renderList(); renderStats();
  return id;
}
function emptyRegister() {
  CAT.features = [];
  edits = {}; saveEdits(); saveCat();
  closePanel();
  if (measure) clearMeasure();
  selectTree(null);
  buildMarkers(); renderList(); renderStats();
}

function gpsAverage(i, btn) {
  if (!navigator.geolocation) return toast('No geolocation on this device.');
  const samples = [];
  const label = btn.textContent;
  btn.disabled = true;
  const id = navigator.geolocation.watchPosition(p => {
    samples.push({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy });
    btn.textContent = 'averaging … ' + samples.length + ' fixes';
  }, () => {}, { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 });
  setTimeout(() => {
    navigator.geolocation.clearWatch(id);
    btn.disabled = false; btn.textContent = label;
    if (!samples.length) return toast('No GPS fix while averaging.');
    let sw = 0, la = 0, lo = 0, am = 0;
    samples.forEach(s => {                       // weighted by 1/acc^2
      const w = 1 / Math.max(1, s.acc * s.acc);
      sw += w; la += s.lat * w; lo += s.lon * w; am += s.acc;
    });
    // GNSS errors are correlated between fixes, so the reported accuracy is the
    // mean of the fixes - averaging does not divide it by sqrt(n).
    setCoords(i, lo / sw, la / sw, 'GPS averaged, ' + samples.length + ' fixes', am / samples.length);
    toast('Position set from ' + samples.length + ' fixes (±' + (am / samples.length).toFixed(0) + ' m).');
  }, 10000);
}
function geoEditor(i) {
  const wrap = document.createElement('div');
  const f = CAT.features[i], c = f.geometry.coordinates;
  const h = document.createElement('h3'); h.textContent = 'Position (stem base)';
  wrap.appendChild(h);

  [['lon', 'Longitude (WGS84)', c[0]], ['lat', 'Latitude (WGS84)', c[1]]].forEach(g => {
    const r = document.createElement('div'); r.className = 'row';
    const l = document.createElement('label'); l.textContent = g[1];
    const inp = document.createElement('input');
    inp.type = 'number'; inp.step = '0.0000001'; inp.value = g[2];
    inp.setAttribute('inputmode', 'decimal'); inp.dataset.geo = g[0];
    inp.onchange = () => {
      const lon = parseFloat(wrap.querySelector('[data-geo="lon"]').value);
      const lat = parseFloat(wrap.querySelector('[data-geo="lat"]').value);
      if (!isFinite(lon) || !isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        toast('Coordinate out of range.'); syncGeo(i); return;
      }
      setCoords(i, lon, lat, 'entered by hand');
      toast('Coordinate applied.');
    };
    r.appendChild(l); r.appendChild(inp); wrap.appendChild(r);
  });

  const info = document.createElement('div'); info.id = 'geoInfo'; info.style.margin = '8px 0';
  wrap.appendChild(info);

  const row1 = document.createElement('div'); row1.className = 'btnrow';
  const bnow = document.createElement('button'); bnow.className = 'sm'; bnow.textContent = 'GPS now';
  bnow.onclick = () => {
    if (!lastFix) return toast('No GPS fix.');
    setCoords(i, lastFix.lon, lastFix.lat, 'single GPS fix', lastFix.acc);
    toast('Position set (±' + lastFix.acc.toFixed(0) + ' m).');
  };
  const bavg = document.createElement('button'); bavg.className = 'sm p'; bavg.textContent = 'GPS average (10 s)';
  bavg.onclick = () => gpsAverage(i, bavg);
  row1.appendChild(bnow); row1.appendChild(bavg);
  wrap.appendChild(row1);

  let step = 0.5;
  const pad = document.createElement('div'); pad.className = 'pad';
  const mk = (txt, de, dn) => {
    const b = document.createElement('button'); b.className = 'sm'; b.textContent = txt;
    if (de === 0 && dn === 0) { b.className = 'sm mid'; }
    b.onclick = () => {
      const cc = CAT.features[i].geometry.coordinates;
      const dLat = (dn * step) / mLat(cc[1]);
      const dLon = (de * step) / mLon(cc[1]);
      setCoords(i, cc[0] + dLon, cc[1] + dLat, 'adjusted in the field');
    };
    return b;
  };
  const spacer = () => { const d = document.createElement('span'); return d; };
  const stepSel = document.createElement('select');
  [0.1, 0.25, 0.5, 1, 2, 5].forEach(s => {
    const o = document.createElement('option'); o.value = s; o.textContent = s + ' m'; stepSel.appendChild(o);
  });
  stepSel.value = '0.5';
  stepSel.style.cssText = 'width:100%;background:#131b17;border:1px solid #2f4137;color:#e8ece9;border-radius:8px;padding:7px 4px;text-align:center';
  stepSel.onchange = () => { step = parseFloat(stepSel.value); };
  pad.appendChild(spacer()); pad.appendChild(mk('N ↑', 0, 1)); pad.appendChild(spacer());
  pad.appendChild(mk('← W', -1, 0)); pad.appendChild(stepSel); pad.appendChild(mk('E →', 1, 0));
  pad.appendChild(spacer()); pad.appendChild(mk('S ↓', 0, -1)); pad.appendChild(spacer());
  wrap.appendChild(pad);

  const row2 = document.createElement('div'); row2.className = 'btnrow';
  const bres = document.createElement('button'); bres.className = 'sm'; bres.textContent = 'Undo position change';
  bres.onclick = () => {
    const o = CAT.features[i].properties.orig_coordinates;
    if (!o) return toast('Position was never changed.');
    CAT.features[i].geometry.coordinates = o.slice();
    delete CAT.features[i].properties.orig_coordinates;
    CAT.features[i].properties.geometry_source = 'as recorded';
    saveCat(); placeMarkers(); renderList(); syncGeo(i);
    toast('Position as first recorded.');
  };
  row2.appendChild(bres);
  wrap.appendChild(row2);

  setTimeout(() => syncGeo(i), 0);
  return wrap;
}

function openPanel(i, tab) {
  openIdx = i; panelTab = tab || 'vta';
  const p = props(i);
  const el = panelTarget(); panelEl = el;
  el.innerHTML = '';

  const ph = document.createElement('div'); ph.className = 'ph';
  ph.innerHTML = '<div><h2></h2><div class="sub"></div></div>';
  ph.querySelector('h2').textContent = (p.tree_id || '?') + ' · ' + (p.name_en || '');
  ph.querySelector('.sub').textContent = (p.species || '') +
    ' · position ±' + (p.position_accuracy_m == null ? '?' : p.position_accuracy_m) + ' m';
  const bc = document.createElement('button'); bc.textContent = 'Close';
  bc.onclick = closePanel; ph.appendChild(bc);
  el.appendChild(ph);

  const tabs = document.createElement('div'); tabs.className = 'ptabs';
  const body = document.createElement('div'); body.className = 'pb';
  const secs = {};
  [['vta', 'VTA'], ['base', 'Base data'], ['hist', 'History'], ['photo', 'Photos']].forEach(pair => {
    const k = pair[0], lab = pair[1];
    const b = document.createElement('button'); b.textContent = lab; b.dataset.tab = k;
    if (k === panelTab) b.className = 'on';
    b.onclick = () => {
      panelTab = k;
      tabs.querySelectorAll('button').forEach(x => x.className = (x.dataset.tab === k ? 'on' : ''));
      Object.keys(secs).forEach(x => secs[x].style.display = (x === k ? 'block' : 'none'));
      body.scrollTop = 0;
    };
    tabs.appendChild(b);
    const s = document.createElement('div'); s.style.display = (k === panelTab ? 'block' : 'none');
    secs[k] = s; body.appendChild(s);
  });
  el.appendChild(tabs); el.appendChild(body);

  /* --- VTA --- */
  const v = secs.vta;
  const vd = document.createElement('div'); vd.id = 'verdictBox'; v.appendChild(vd);
  const h1 = document.createElement('h3'); h1.textContent = 'Inspection'; v.appendChild(h1);
  F_VTA.forEach(f => v.appendChild(fieldRow(f[0], f[1], f[2], f[3], p)));
  const h2 = document.createElement('h3'); h2.textContent = 'Symptoms (VTA)'; v.appendChild(h2);
  const sel = p.symptoms || [];
  SYMPTOMS.forEach(pair => {
    const grp = pair[0], list = pair[1];
    const gh = document.createElement('div');
    gh.className = 'small'; gh.style.margin = '10px 0 2px'; gh.textContent = grp;
    v.appendChild(gh);
    const box = document.createElement('div'); box.className = 'sym';
    list.forEach(s => {
      const l = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.dataset.sym = s[0]; cb.checked = sel.indexOf(s[0]) >= 0;
      cb.onchange = () => updateVerdict();
      l.appendChild(cb);
      const sp2 = document.createElement('span'); sp2.textContent = s[1]; l.appendChild(sp2);
      box.appendChild(l);
    });
    v.appendChild(box);
  });
  const h2f = document.createElement('h3'); h2f.textContent = 'Wood-decay fungi'; v.appendChild(h2f);
  const funBox = document.createElement('div'); funBox.id = 'funBox'; v.appendChild(funBox);
  const funSel = document.createElement('select');
  const fh = document.createElement('option'); fh.value = ''; fh.textContent = 'Add a fruiting body…';
  funSel.appendChild(fh);
  ['root', 'stem', 'crown'].forEach(w => {
    const gr = document.createElement('optgroup'); gr.label = FUNGI_WHERE[w];
    FUNGI.filter(f => f[3] === w).forEach(f => {
      const o = document.createElement('option'); o.value = f[0];
      o.textContent = f[1] + ' · ' + f[2]; gr.appendChild(o);
    });
    funSel.appendChild(gr);
  });
  funSel.onchange = () => {
    if (!funSel.value) return;
    if (!funList.includes(funSel.value)) funList.push(funSel.value);
    funSel.value = ''; renderFungi(); updateVerdict();
  };
  v.appendChild(funSel);
  let funList = (p.fungi || []).slice();
  function renderFungi() {
    funBox.innerHTML = '';
    if (!funList.length) {
      funBox.innerHTML = '<p class="small">None recorded. The species decides whether the tree ' +
        'uproots or snaps – it is worth naming.</p>';
      return;
    }
    funList.forEach(k => {
      const f = FUNGI_BY[k]; if (!f) return;
      const d = document.createElement('div'); d.className = 'funrow';
      d.innerHTML = '<div><b>' + f[1] + '</b> <span class="small">' + f[2] + '</span>' +
        '<div class="small">' + FUNGI_WHERE[f[3]] + ' · ' + f[4] + ' · level ' + f[5] + '</div>' +
        '<div class="small dim">' + f[6] + '</div></div>';
      const hid = document.createElement('input');
      hid.type = 'hidden'; hid.dataset.fun = k; d.appendChild(hid);
      const ref = document.createElement('a');
      ref.className = 'sm reflink'; ref.textContent = '↗';
      ref.title = 'Look the species up';
      ref.href = 'https://www.inaturalist.org/search?q=' + encodeURIComponent(f[1]);
      ref.target = '_blank'; ref.rel = 'noopener';
      d.appendChild(ref);
      const x = document.createElement('button'); x.className = 'sm x'; x.textContent = '×';
      x.onclick = () => { funList = funList.filter(y => y !== k); renderFungi(); updateVerdict(); };
      d.appendChild(x);
      funBox.appendChild(d);
    });
  }
  renderFungi();

  v.querySelectorAll('[data-k]').forEach(inp => inp.addEventListener('change', updateVerdict));

  /* --- base data --- */
  F_BASE.forEach(f => secs.base.appendChild(fieldRow(f[0], f[1], f[2], f[3], p)));
  secs.base.appendChild(geoEditor(i));

  /* --- history --- */
  const hs = secs.hist;
  const tb = document.createElement('table'); tb.className = 'hist';
  tb.innerHTML = '<tr><th>Year</th><th>Girth cm</th><th>Vit.</th><th>Inspected</th><th>Finding</th></tr>' +
    (p.history || []).map(r => '<tr><td>' + r.year + '</td><td>' + (r.girth_cm == null ? '' : r.girth_cm) + '</td><td>' +
      (r.vitality_roloff == null ? '' : r.vitality_roloff) + '</td><td>' + (r.inspection || '') + '</td><td>' + (r.finding || '') + '</td></tr>').join('');
  hs.appendChild(tb);
  const badd = document.createElement('button');
  badd.className = 'sm'; badd.style.marginTop = '10px';
  badd.textContent = 'Add current inspection to history';
  badd.onclick = () => {
    savePanel(true);
    const q = props(i), hist = (q.history || []).slice();
    hist.push({
      year: new Date().getFullYear(),
      girth_cm: num(q.girth_cm),
      vitality_roloff: num(q.vitality_roloff),
      inspection: q.last_inspection || new Date().toISOString().slice(0, 10),
      finding: (q.inspection_type || 'Inspection') + (q.remarks ? ': ' + q.remarks : '')
    });
    setEdit(i, { history: hist });
    toast('Added to history.');
    openPanel(i);
  };
  hs.appendChild(badd);

  /* --- photos --- */
  const fs = secs.photo;
  if (!photosOk) {
    fs.innerHTML = '<p class="small">Photo storage (IndexedDB) is not available on this device.</p>';
  } else {
    const inb = document.createElement('button');
    inb.className = 'p'; inb.textContent = '📷 Take or choose a photo';
    const fi = document.createElement('input');
    fi.type = 'file'; fi.accept = 'image/*'; fi.setAttribute('capture', 'environment'); fi.style.display = 'none';
    fi.onchange = async () => {
      const f = fi.files && fi.files[0]; if (!f) return;
      const url = await shrink(f, 1440, 0.72);
      if (!url) return toast('Could not read the image.');
      const meta = lastFix ? { lat: +lastFix.lat.toFixed(7), lon: +lastFix.lon.toFixed(7) } : {};
      try { await photoAdd(p.tree_id, url, meta); toast('Photo stored.'); renderPhotos(p.tree_id, gal); }
      catch (e) { toast('Photo storage: ' + e.message); }
      fi.value = '';
    };
    inb.onclick = () => fi.click();
    inb.disabled = !!mode;          // the file dialog is blocked inside a session
    fs.appendChild(inb); fs.appendChild(fi);
    var gal = document.createElement('div'); gal.className = 'photos';
    fs.appendChild(gal);
    renderPhotos(p.tree_id, gal);
  }

  const pf = document.createElement('div'); pf.className = 'pf';
  const bs = document.createElement('button'); bs.className = 'p'; bs.textContent = 'Save';
  bs.onclick = () => { savePanel(); closePanel(); };
  const br2 = document.createElement('button'); br2.textContent = 'Reset';
  br2.onclick = () => {
    delete edits[tid(i)]; saveEdits(); refreshMarker(i); renderList(); openPanel(i);
    toast('Field record reset.');
  };
  const bd = document.createElement('button'); bd.className = 'x'; bd.textContent = 'Delete';
  bd.onclick = () => {
    if (!confirm('Delete ' + tid(i) + ' from the register? Photos of it are kept.')) return;
    toast(deleteTree(i) + ' deleted.');
  };
  pf.appendChild(bs); pf.appendChild(br2); pf.appendChild(bd);
  el.appendChild(pf);

  el.classList.add('on');
  updateVerdict();
}
function closePanel() { if (panelEl) panelEl.classList.remove('on'); openIdx = null; }

function collect() {
  const o = {};
  panelEl.querySelectorAll('[data-k]').forEach(inp => {
    const k = inp.dataset.k, t = inp.dataset.t;
    o[k] = t === 'list' ? inp.value.split('\n').map(s => s.trim()).filter(Boolean)
         : t === 'number' ? (inp.value === '' ? null : Number(inp.value))
         : inp.value;
  });
  const sym = [];
  panelEl.querySelectorAll('[data-sym]').forEach(cb => { if (cb.checked) sym.push(cb.dataset.sym); });
  o.symptoms = sym;
  o.symptom_labels = sym.map(k => SYM_LABEL[k]).filter(Boolean);
  const fun = [];
  panelEl.querySelectorAll('[data-fun]').forEach(el => fun.push(el.dataset.fun));
  o.fungi = fun;
  o.fungi_labels = fun.map(k => FUNGI_BY[k] && FUNGI_BY[k][1]).filter(Boolean);
  return o;
}
function setEdit(i, patch) {
  edits[tid(i)] = Object.assign({}, edits[tid(i)] || {}, patch);
  saveEdits(); refreshMarker(i); renderList(); renderStats();
}
function savePanel(silent) {
  if (openIdx === null) return;
  setEdit(openIdx, collect());
  if (!silent) toast('Saved.');
}
function updateVerdict() {
  if (!panelEl || openIdx === null) return;
  const box = panelEl.querySelector('#verdictBox'); if (!box) return;
  const p = Object.assign({}, props(openIdx), collect());
  const a = assess(p), col = LVLCOL[a.lvl];
  box.className = 'verdict';
  box.style.borderColor = col; box.style.background = col + '18';
  let html = '<b style="color:' + col + '">Level ' + a.lvl + ' · ' + LVLTXT[a.lvl] + '</b>';
  const kv = [];
  if (a.tr != null) kv.push('t/R ' + a.tr.toFixed(2));
  if (a.hd != null) kv.push('h/d ' + a.hd.toFixed(0));
  if (kv.length) html += '<div class="small">' + kv.join(' · ') + '</div>';
  html += a.notes.length ? '<ul>' + a.notes.map(n => '<li>' + n + '</li>').join('') + '</ul>'
                         : '<div class="small">No triggering criteria recorded.</div>';
  box.innerHTML = html;
}

async function renderPhotos(tree, gal) {
  if (!gal) return;
  let list = [];
  try { list = await photoList(tree); } catch (e) { gal.innerHTML = '<p class="small">Photos could not be read.</p>'; return; }
  gal.innerHTML = '';
  if (!list.length) { gal.innerHTML = '<p class="small">No photos yet.</p>'; return; }
  list.sort((a, b) => ((b.kind === 'bark') - (a.kind === 'bark')) || (a.ts < b.ts ? 1 : -1));
  list.forEach(f => {
    const fig = document.createElement('figure');
    const im = document.createElement('img'); im.src = f.url; im.alt = tree;
    im.onclick = () => { $('lbImg').src = f.url; $('lightbox').style.display = 'flex'; };
    const db2 = document.createElement('button'); db2.className = 'del sm'; db2.textContent = '×';
    db2.onclick = async () => { await photoDel(f.id); renderPhotos(tree, gal); };
    const cap = document.createElement('figcaption');
    if (f.kind === 'bark') fig.className = 'bark';
    // Hand the picture to whatever identification app is on the phone. No API
    // key, no terms to agree to, and the inspector picks the tool they trust -
    // which is the right split, because the answer still has to be judged.
    if (navigator.share) {
      const sh = document.createElement('button'); sh.className = 'idbtn sm'; sh.textContent = 'ID…';
      sh.title = 'Send this photo to an identification app';
      sh.onclick = async () => {
        try {
          const blob = await (await fetch(f.url)).blob();
          const file = new File([blob], tree + '-' + (f.id || '') + '.jpg',
                                { type: blob.type || 'image/jpeg' });
          if (navigator.canShare && !navigator.canShare({ files: [file] }))
            throw new Error('this phone cannot share a file');
          await navigator.share({ files: [file], title: tree,
            text: tree + (f.kind === 'bark' ? ' · bark at 1.30 m' : '') });
        } catch (e) {
          if (e && e.name === 'AbortError') return;
          toast('Sharing failed: ' + (e.message || e));
        }
      };
      fig.appendChild(sh);
    }
    const nia = document.createElement('button'); nia.className = 'niabtn sm'; nia.textContent = 'NIA';
    nia.title = 'Ask the identification service for candidates';
    nia.onclick = async () => {
      const idx = CAT.features.findIndex((x, n) => tid(n) === tree);
      nia.disabled = true; nia.textContent = '…';
      try {
        const blob = await (await fetch(f.url)).blob();
        niaSheet(idx, await niaIdentify(blob));
      } catch (e) {
        toast('Identification: ' + (e.message === 'Failed to fetch'
          ? 'no answer – no network, or the service does not allow browser requests' : e.message));
      }
      nia.disabled = false; nia.textContent = 'NIA';
    };
    fig.appendChild(nia);
    cap.textContent = (f.kind === 'bark' ? 'BARK 1.30 m · ' : '') +
      (f.ts || '').slice(0, 16).replace('T', ' ') +
      (f.bearing != null ? ' · ' + f.bearing + '°' : '') +
      (f.h != null ? ' · ' + f.h.toFixed(2) + ' m' : '') +
      (f.dist != null ? ' · ' + f.dist + ' m' : '');
    fig.appendChild(im); fig.appendChild(db2); fig.appendChild(cap);
    gal.appendChild(fig);
  });
}

/* ========================= LIST / SCREENS ========================= */

let sortByDist = true;
function renderList() {
  const box = $('listBox'); if (!box) return;
  const rows = CAT.features.map((f, i) => {
    const c = f.geometry.coordinates;
    const db3 = lastFix ? distBear(c[1], c[0], lastFix.lat, lastFix.lon) : null;
    return { i: i, d: db3 ? db3.d : null, b: db3 ? db3.b : null };
  });
  if (sortByDist && lastFix) rows.sort((a, b) => a.d - b.d);
  box.innerHTML = '';
  rows.forEach(o => {
    const p = props(o.i), a = assess(p);
    const b = document.createElement('button'); b.className = 'tree';
    b.innerHTML =
      '<span class="dot" style="background:' + LVLCOL[a.lvl] + '"></span>' +
      '<span class="m"><span class="t1">' + (p.tree_id || '?') + (isEdited(o.i) ? ' ·' : '') + '</span>' +
      '<span class="t2">' + (p.species || '') + '</span>' +
      '<span class="t3">DBH ' + (p.dbh_cm == null ? '–' : p.dbh_cm) + ' cm · H ' + (p.height_m == null ? '–' : p.height_m) +
      ' m · vit ' + (p.vitality_roloff == null ? '–' : p.vitality_roloff) + '</span></span>' +
      '<span class="nav"><span class="arr" data-b="' + (o.b == null ? '' : o.b) + '">' + (o.b == null ? '·' : '↑') + '</span>' +
      '<span class="dist">' + (o.d == null ? '– m' : o.d.toFixed(o.d < 100 ? 1 : 0) + ' m') + '</span></span>';
    b.onclick = () => openPanel(o.i);
    box.appendChild(b);
  });
  $('listCount').textContent = '(' + CAT.features.length + ')';
  updateArrows();
}
function updateArrows() {
  if (heading == null) return;
  document.querySelectorAll('#listBox .arr[data-b]').forEach(el => {
    const b = parseFloat(el.dataset.b);
    if (!isFinite(b)) return;
    el.style.transform = 'rotate(' + (((b - heading) % 360 + 360) % 360) + 'deg)';
  });
}
setInterval(() => { if ($('sc-list').classList.contains('on') && !mode) updateArrows(); }, 250);
setInterval(() => { if ($('sc-list').classList.contains('on') && !mode && lastFix) renderList(); }, 5000);

function showScreen(k) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === 'sc-' + k));
  document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.sc === k));
  if (k === 'list') { startGPS(); startOrient(); renderList(); }   // sensors only on a user action
  if (k === 'data') renderStats();
  if (k === 'map') { startGPS(); drawMap(); renderRefs(); syncMapSel(); }
}
function renderStats() {
  const n = CAT.features.length;
  let ed = 0; const lv = [0, 0, 0, 0];
  CAT.features.forEach((f, i) => { if (isEdited(i)) ed++; lv[assess(props(i)).lvl]++; });
  const base = '<div class="kv"><span>App version</span><span>' + APP_VERSION + '</span></div>' +
               '<div class="kv"><span>Trees in catalogue</span><span>' + n + '</span></div>' +
               '<div class="kv"><span>Edited in the field</span><span>' + ed + '</span></div>' +
               '<div class="kv"><span>Levels 0 / 1 / 2 / 3</span><span>' + lv.join(' / ') + '</span></div>';
  photoAll().then(ps => {
    $('stats').innerHTML = base + '<div class="kv"><span>Photos stored</span><span>' + ps.length + '</span></div>';
  }).catch(() => { $('stats').innerHTML = base; });
}

function toast(t) {
  const el = $('toast'); el.textContent = t; el.style.display = 'block';
  clearTimeout(toast._t); toast._t = setTimeout(() => { el.style.display = 'none'; }, 2600);
}
function msg(t) { $('msg').textContent = t; }

/* ================= IDENTIFICATION SERVICE (NIA) =================
   Observation.org / Naturalis run a recognition model over some forty thousand
   European taxa, fungi among them. It answers with candidates and
   probabilities, and that is all it is used for here: a suggestion, ranked,
   that the inspector accepts or ignores. Nothing it says reaches the
   assessment on its own - the species drives the hazard rating, and a model
   that has never seen a Kretzschmaria crust in situ has no business setting
   that on its own.

   The public endpoint allows ten identifications a day; a token raises it.
   Both are settings, so neither is baked in. */
const NIA_DEFAULT = 'https://multi-source.identify.biodiversityanalysis.eu/v2/observation/identify';
function niaCfg() {
  try { return JSON.parse(lsGet(K_NIA)) || {}; } catch (e) { return {}; }
}
function niaSave(c) { lsSet(K_NIA, JSON.stringify(c)); }

/* The response schema is the service's to change, and this app cannot be
   redeployed from a wood, so read it by shape rather than by field name:
   anything carrying a name and a number between zero and one is a candidate. */
function niaParse(j) {
  const out = [];
  const nameOf = o => o.scientific_name || o.scientificName || o.name || o.species ||
                      (o.taxon && (o.taxon.scientific_name || o.taxon.name));
  const probOf = o => [o.probability, o.score, o.confidence, o.certainty, o.p]
                        .find(v => typeof v === 'number');
  (function walk(o, depth) {
    if (!o || typeof o !== 'object' || depth > 8) return;
    if (Array.isArray(o)) { o.forEach(x => walk(x, depth + 1)); return; }
    const n = nameOf(o), p = probOf(o);
    if (typeof n === 'string' && n.trim() && typeof p === 'number') out.push({ name: n.trim(), p: p });
    Object.keys(o).forEach(k => walk(o[k], depth + 1));
  })(j, 0);
  const seen = {};
  const uniq = out.filter(x => { const k = x.name.toLowerCase();
    if (seen[k]) return false; seen[k] = 1; return true; });
  const mx = uniq.reduce((a, x) => Math.max(a, x.p), 0);
  if (mx > 1) uniq.forEach(x => { x.p = x.p / 100; });          // percentages
  return uniq.sort((a, b) => b.p - a.p).slice(0, 8);
}

/* Map a suggested name onto the fungi this app knows how to assess. An exact
   binomial wins; failing that a genus match, because "Armillaria spp." is how
   the table carries a group that is not separable in the field anyway. */
const FUNGI_SYN = {
  'ustulina deusta': 'kdeu', 'hypoxylon deustum': 'kdeu', 'ustulina maxima': 'kdeu',
  'ganoderma lipsiense': 'gapp', 'ganoderma australe': 'gads',
  'armillaria mellea': 'arme', 'armillaria ostoyae': 'arme', 'armillaria gallica': 'arme',
  'armillaria borealis': 'arme', 'heterobasidion parviporum': 'hann',
  'phaeolus spadiceus': 'pschw', 'polyporus sulphureus': 'lsul',
  'cerrena unicolor': 'tver', 'coriolus versicolor': 'tver',
  'stereum purpureum': 'cpur', 'fomes annosus': 'hann'
};
function niaMatch(name) {
  const n = name.toLowerCase().trim();
  const hit = FUNGI.find(f => f[1].toLowerCase() === n);
  if (hit) return { key: hit[0], exact: true };
  if (FUNGI_SYN[n]) return { key: FUNGI_SYN[n], exact: true };
  // a genus alone leaves the species open, and within Ganoderma or Inonotus the
  // species is the difference between watching and acting - so take the worst
  // of the genus and say plainly that this is what happened
  const gen = n.split(/\s+/)[0];
  const same = FUNGI.filter(f => f[1].toLowerCase().split(/\s+/)[0] === gen);
  if (!same.length) return null;
  const worst = same.reduce((a, f) => (f[5] > a[5] ? f : a), same[0]);
  return { key: worst[0], exact: false, ambiguous: same.length > 1 };
}

async function niaIdentify(blob) {
  const c = niaCfg();
  const url = (c.url || NIA_DEFAULT).trim();
  const fd = new FormData();
  fd.append('image', blob, 'photo.jpg');
  const headers = {};
  if (c.token) headers['Authorization'] = 'Token ' + c.token.trim();
  const r = await fetch(url, { method: 'POST', body: fd, headers: headers });
  if (r.status === 401 || r.status === 403)
    throw new Error('the service refused the request – check the token (' + r.status + ')');
  if (r.status === 429)
    throw new Error('daily limit reached – the public endpoint allows ten a day, a token raises it');
  if (!r.ok) throw new Error('the service answered ' + r.status);
  const j = await r.json();
  const list = niaParse(j);
  if (!list.length) throw new Error('the answer held no recognisable candidates');
  return list;
}

/* The suggestions are shown, never applied. Adding one is a separate tap, and
   a genus-only match says so rather than pretending to a species. */
function niaSheet(tree, list) {
  const el = $('niaBox');
  el.innerHTML = '';
  const h = document.createElement('div');
  h.innerHTML = '<b>Suggestions</b> <span class="small">· model, not a determination · ' +
                'confirm before recording</span>';
  el.appendChild(h);
  list.forEach(c => {
    const m = niaMatch(c.name);
    const row = document.createElement('div'); row.className = 'niarow';
    const pct = (c.p * 100).toFixed(c.p >= 0.1 ? 0 : 1) + ' %';
    row.innerHTML = '<div><b>' + c.name + '</b> <span class="small">' + pct + '</span>' +
      (m ? '<div class="small dim">' + FUNGI_BY[m.key][2] + ' · ' + FUNGI_BY[m.key][4] +
           ' · level ' + FUNGI_BY[m.key][5] +
           (m.exact ? '' : m.ambiguous ? ' · genus only – the worst of the genus is assumed'
                                       : ' · genus match') + '</div>'
         : '<div class="small dim">not one of the decay fungi this app assesses</div>') + '</div>';
    const bar = document.createElement('div'); bar.className = 'niabar';
    const fill = document.createElement('i'); fill.style.width = Math.round(c.p * 100) + '%';
    bar.appendChild(fill); row.appendChild(bar);
    if (m) {
      const add = document.createElement('button'); add.className = 'sm p'; add.textContent = 'Record';
      add.onclick = () => {
        const id = tid(tree);
        const cur = (props(tree).fungi || []).slice();
        if (!cur.includes(m.key)) cur.push(m.key);
        edits[id] = Object.assign({}, edits[id], { fungi: cur,
          fungi_labels: cur.map(k => FUNGI_BY[k] && FUNGI_BY[k][1]).filter(Boolean) });
        saveEdits(); refreshMarker(tree); renderList();
        if (openIdx === tree) openPanel(tree);
        toast(FUNGI_BY[m.key][1] + ' recorded for ' + id + '.');
        el.style.display = 'none';
      };
      row.appendChild(add);
    }
    el.appendChild(row);
  });
  const close = document.createElement('button'); close.textContent = 'Close';
  close.onclick = () => { el.style.display = 'none'; };
  el.appendChild(close);
  el.style.display = 'block';
}

/* ========================= IMPORT / EXPORT ========================= */

function merged() {
  const out = JSON.parse(JSON.stringify(CAT));
  out.features.forEach((f, i) => { Object.assign(f.properties, edits[tid(i)] || {}); });
  // control points travel with the register - they are the work of a morning
  // and losing them costs more than losing a tree record
  REFS.forEach(r => out.features.push({
    type: 'Feature', geometry: { type: 'Point', coordinates: [r.lon, r.lat] },
    properties: { tree_id: r.id, is_reference: true, geometry_source: r.note || 'reference point',
                  position_accuracy_m: r.acc == null ? undefined : r.acc }
  }));
  return out;
}
function dl(name, content, mime) {
  const blob = (content instanceof Blob) ? content : new Blob([content], { type: mime || 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
const CSVCOLS = ['tree_id', 'lon', 'lat', 'species', 'name_en', 'planted', 'girth_cm', 'dbh_cm',
  'height_m', 'crown_d_m', 'vitality_roloff', 'crown_dieback_pct', 'damage_class', 'cavity',
  'wall_t_cm', 'radius_r_cm', 't_R', 'h_d', 'level', 'target_type', 'target_distance_m', 'stability', 'breakage_resistance',
  'traffic_safety', 'urgency', 'symptoms', 'fungi_labels', 'actions', 'inspection_type', 'last_inspection',
  'next_inspection', 'interval_months', 'inspector', 'remarks'];
function csv() {
  const q = v => {
    if (v == null) return '';
    const s = Array.isArray(v) ? v.join(' | ') : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const rows = [CSVCOLS.join(',')];
  CAT.features.forEach((f, i) => {
    const p = props(i), a = assess(p), c = f.geometry.coordinates;
    const r = CSVCOLS.map(k => {
      if (k === 'lon') return c[0];
      if (k === 'lat') return c[1];
      if (k === 't_R') return a.tr == null ? '' : a.tr.toFixed(3);
      if (k === 'h_d') return a.hd == null ? '' : a.hd.toFixed(1);
      if (k === 'level') return a.lvl;
      if (k === 'symptoms') return (p.symptoms || []).map(s => SYM_LABEL[s] || s);
      return p[k];
    });
    rows.push(r.map(q).join(','));
  });
  return rows.join('\r\n');
}
function stamp() { return new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'); }

/* ============================ START ============================ */

function chk(state, txt) {
  const d = document.createElement('div'); d.className = 'chk';
  d.innerHTML = '<span class="i ' + state + '">' + (state === 'ok' ? '✔' : state === 'no' ? '✘' : '!') + '</span><span>' + txt + '</span>';
  $('checks').appendChild(d);
}
async function checks() {
  $('checks').innerHTML = '';
  chk(isSecureContext ? 'ok' : 'no', 'Secure connection' + (isSecureContext ? '' : ' – AR, camera and GPS need HTTPS'));
  chk(navigator.geolocation ? 'ok' : 'no', 'Location');
  chk(navigator.mediaDevices ? 'ok' : 'no', 'Camera');
  chk(('ondeviceorientationabsolute' in window) ? 'ok' : 'wa', 'Compass');
  let xrOk = false;
  if (navigator.xr) {
    try { xrOk = await navigator.xr.isSessionSupported('immersive-ar'); } catch (e) {}
  }
  chk(xrOk ? 'ok' : 'wa', 'AR tracking' + (xrOk ? '' : ' – unavailable, use camera mode'));
  $('bxr').disabled = !xrOk;
  $('bcam').disabled = !navigator.mediaDevices;
  chk(photosOk ? 'ok' : 'wa', 'Photo storage');
  chk('serviceWorker' in navigator ? 'ok' : 'wa', 'Offline use');
}

function wire() {
  document.querySelectorAll('#tabbar button').forEach(b => b.onclick = () => showScreen(b.dataset.sc));

  $('bxr').onclick = async () => {
    msg('starting …');
    try { await startOrient(); startGPS(); await startXR(); msg(''); }
    catch (e) { msg('WebXR: ' + e.message + ' → try camera mode'); }
  };
  $('bcam').onclick = async () => {
    msg('starting …');
    try { await startOrient(); startGPS(); await startCam(); msg(''); }
    catch (e) { msg('Camera: ' + e.message); }
  };
  $('bl').onclick = () => { headOff -= 5; applyYaw(); requestAnchors(); };
  $('br').onclick = () => { headOff += 5; applyYaw(); requestAnchors(); };
  $('bsync').onclick = () => { headOff = 0; syncNorth(false); requestAnchors(); };
  $('bo').onclick = () => {
    if (!lastFix) return toast('No GPS fix.');
    setOriginHere(lastFix.lat, lastFix.lon, lastFix.acc);
    requestAnchors();
    toast('Scene re-hung on your GPS position (±' + lastFix.acc.toFixed(0) + ' m).');
  };
  $('hud').onclick = () => $('hud').classList.toggle('open');
  $('bnew').onclick = addTreeHere;
  $('bref').onclick = () => {
    const el = $('refmenu');
    const open = el.style.display !== 'block';
    if (open) buildRefMenu();
    el.style.display = open ? 'block' : 'none';
    $('mmenu').style.display = 'none'; $('chooser').style.display = 'none';
  };
  $('bstand').onclick = () => {
    const c = $('chooser');
    c.style.display = (c.style.display === 'block' ? 'none' : 'block');
    $('mmenu').style.display = 'none';
  };
  $('bmeas').onclick = () => {
    const m = $('mmenu');
    if (m.style.display === 'block') { m.style.display = 'none'; return; }
    buildMeasureMenu();
    m.style.display = 'block';
    $('chooser').style.display = 'none';
  };
  $('bshot').onclick = () => {
    const t = selIdx == null ? nearestTree() : selIdx;
    if (t == null) return toast('No tree selected.');
    selectTree(t); shotFor = t; shotKind = null;
    toast('Capturing photo of ' + props(t).tree_id + ' …');
  };
  $('bbark').onclick = () => {
    const t = selIdx == null ? nearestTree() : selIdx;
    if (t == null) return toast('No tree selected.');
    selectTree(t); startBark(t);
  };
  $('bmore').onclick = () => {
    $('ctl2').classList.toggle('on');
    $('mmenu').style.display = 'none';
  };
  $('bq').onclick = () => {
    // the control measurements only exist inside this session's frame - leaving
    // throws them away, and there is no getting them back
    const done = controlList().filter(r => refFix.has(r.key)).length;
    if (done && !confirm('Leave AR?\n\n' + done + ' control point' + (done > 1 ? 's' : '') +
        ' measured in this session' + (lastFit ? ' (fit ±' + lastFit.rms.toFixed(2) + ' m)' : '') +
        '. They are tied to this session and cannot be carried into the next one – ' +
        'you would measure them again.')) return;
    endAR();
  };

  $('bSort').onclick = () => {
    sortByDist = !sortByDist;
    $('bSort').textContent = sortByDist ? 'by distance' : 'by catalogue';
    renderList();
  };
  $('bNew').onclick = () => {
    if (!lastFix) return toast('No GPS fix – a new tree needs a position.');
    const i = addTree(lastFix.lon, lastFix.lat, 'GPS in the field', lastFix.acc);
    openPanel(i, 'base');            // straight to the position, it needs fixing
    toast('Recorded at your own position (±' + lastFix.acc.toFixed(0) +
          ' m) – average it at the stem, or place it in AR.');
  };

  $('bNewXY').onclick = () => {
    const box = $('newXY');
    const open = box.style.display !== 'block';
    box.style.display = open ? 'block' : 'none';
    if (open && lastFix) {                       // a starting point to correct, not a proposal
      $('nxLon').placeholder = lastFix.lon.toFixed(7);
      $('nxLat').placeholder = lastFix.lat.toFixed(7);
    }
  };
  $('nxCancel').onclick = () => { $('newXY').style.display = 'none'; };
  $('nxOk').onclick = () => {
    const lon = parseFloat($('nxLon').value), lat = parseFloat($('nxLat').value);
    if (!isFinite(lon) || !isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
      return toast('Enter longitude and latitude in decimal degrees.');
    const i = addTree(lon, lat, 'entered by hand', null);
    $('nxLon').value = ''; $('nxLat').value = ''; $('newXY').style.display = 'none';
    openPanel(i, 'base');
    toast('Tree ' + tid(i) + ' created at the coordinate you entered.');
  };

  $('bExpGeo').onclick = () => dl('tree_register_' + stamp() + '.geojson', JSON.stringify(merged(), null, 1), 'application/geo+json');
  $('bExpCsv').onclick = () => dl('tree_register_' + stamp() + '.csv', csv(), 'text/csv');
  $('bExpPhotos').onclick = async () => {
    let ps = [];
    try { ps = await photoAll(); } catch (e) {}
    if (!ps.length) return toast('No photos stored.');
    toast('Saving ' + ps.length + ' photos …');
    for (let n = 0; n < ps.length; n++) {
      const b = await (await fetch(ps[n].url)).blob();
      dl(ps[n].tree + '_' + (n + 1) + '.jpg', b, 'image/jpeg');
      await new Promise(r => setTimeout(r, 350));
    }
  };
  $('bImp').onclick = () => $('fileImp').click();
  $('fileImp').onchange = () => {
    const f = $('fileImp').files && $('fileImp').files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const j = JSON.parse(rd.result);
        const all = (j.features || []).filter(x => x.geometry && x.geometry.type === 'Point');
        if (!all.length) throw new Error('no point features found');
        const refs = all.filter(x => x.properties && x.properties.is_reference);
        const feats = all.filter(x => !(x.properties && x.properties.is_reference));
        feats.forEach((x, n) => {
          if (!x.properties) x.properties = {};
          if (!x.properties.tree_id) x.properties.tree_id = x.properties.baum_id || ('IMP-' + (n + 1));
        });
        CAT = { type: 'FeatureCollection', name: j.name || f.name, features: feats };
        saveCat();
        if (refs.length) {
          refs.forEach(x => {
            const id = x.properties.tree_id || ('P' + (REFS.length + 1));
            if (refById(id)) return;
            REFS.push({ id: id, lon: x.geometry.coordinates[0], lat: x.geometry.coordinates[1],
                        note: x.properties.geometry_source || 'imported',
                        acc: x.properties.position_accuracy_m == null ? null : +x.properties.position_accuracy_m });
          });
          saveRefs(); renderRefs();
        }
        buildMarkers(); renderList(); renderStats();
        toast(feats.length + ' trees' + (refs.length ? ' and ' + refs.length + ' reference points' : '') + ' loaded.');
      } catch (e) { toast('Import failed: ' + e.message); }
      $('fileImp').value = '';
    };
    rd.readAsText(f);
  };
  $('bResetEdits').onclick = () => {
    if (!confirm('Delete every inspection record captured in the field?')) return;
    edits = {}; lsDel(K_EDIT); buildMarkers(); renderList(); renderStats(); toast('Field records deleted.');
  };
  const nc = niaCfg();
  $('niaUrl').value = nc.url || '';
  $('niaTok').value = nc.token || '';
  $('niaSave').onclick = () => {
    niaSave({ url: $('niaUrl').value.trim(), token: $('niaTok').value.trim() });
    toast('Identification service saved.');
  };
  $('bUpdate').onclick = async () => {
    // A stale service worker keeps serving yesterday's app and no amount of
    // reloading helps, so throw the worker and every cache away and come back
    // on a URL the caches have never seen. Trees and photos are untouched.
    $('bUpdate').disabled = true; toast('Fetching the current version …');
    try {
      if ('serviceWorker' in navigator) {
        const rs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(rs.map(r => r.unregister()));
      }
      if (window.caches) {
        const ks = await caches.keys();
        await Promise.all(ks.map(k => caches.delete(k)));
      }
    } catch (e) {}
    location.replace(location.pathname + '?u=' + Date.now());
  };
  $('bEmpty').onclick = () => {
    if (!CAT.features.length) return toast('The register is already empty.');
    if (!confirm('Delete all ' + CAT.features.length + ' trees and start an empty register? Photos are kept.')) return;
    emptyRegister();
    toast('Register emptied – record your first tree by coordinates.');
  };
  $('lbClose').onclick = () => { $('lightbox').style.display = 'none'; $('lbImg').src = ''; };
  $('lightbox').onclick = e => { if (e.target.id === 'lightbox') $('lbClose').click(); };

  let deferred = null;
  addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferred = e;
    const b = $('bInstall'); b.style.display = '';
    b.onclick = async () => { b.style.display = 'none'; deferred.prompt(); await deferred.userChoice; deferred = null; };
  });
}

loadAll();
loadRefs();
const _demo = dropDemoTrees();
buildScene();
buildMarkers();
wire();
wireMap();
checks();
renderList();
renderStats();
$('about').textContent = 'VTA Field ' + APP_VERSION;
if (_demo) toast(_demo + ' demo trees removed – the register is yours now.');
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
