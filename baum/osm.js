/* ============================================================================
   OPENSTREETMAP

   A tree you stood at and recorded yourself is yours to give away. A tree
   that came out of a city's register is not: Berlin's, Tallinn's and
   Tampere's files each carry their own licence, and OpenStreetMap's ODbL
   only takes data whose licence allows it - the Licensing Working Group
   decides that per source, not the person holding the phone. So the gate
   here is hard: a tree goes to OSM only if the app itself recorded its
   position in an AR survey, or the inspector has marked it, by hand, as
   their own observation. Nothing imported passes, whatever it looks like.

   And nothing about the inspection goes either. OSM maps what a tree is -
   species, girth, height, crown - not whether an inspector thought it would
   fall on someone. Findings, verdicts and remarks stay in the register.

   The upload is small by design: at most fifty nodes in a changeset, each
   checked against what is already mapped within three metres so a tree is
   not created twice. Anything larger than a field survey is an import in
   OSM's sense and wants the import guidelines and a conversation first.

   OSM's API takes OAuth 2 only. The app registers nothing on your behalf: the
   client id comes from your own OSM account's application settings, with
   this page as the redirect. Tokens live on the phone.
   ========================================================================= */

const K_OSM = 'vta_osm_v1';
const OSM_HOSTS = {
  live: { web: 'https://www.openstreetmap.org', api: 'https://api.openstreetmap.org' },
  dev: { web: 'https://master.apis.dev.openstreetmap.org', api: 'https://master.apis.dev.openstreetmap.org' }
};
const OSM_MAX = 50;                 // nodes per changeset: a survey, not an import
const OSM_NEAR = 3;                 // metres: closer than this, it is already mapped

function osmCfg() { try { return JSON.parse(lsGet(K_OSM)) || {}; } catch (e) { return {}; } }
function osmSave(c) { lsSet(K_OSM, JSON.stringify(c)); }
function osmHost() { return OSM_HOSTS[osmCfg().host === 'dev' ? 'dev' : 'live']; }
function osmSignedIn() { return !!osmCfg().token; }

/* ---- who may go ------------------------------------------------------- */
function osmUploadable(i) {
  const p = props(i);
  if (p.osm_id) return { ok: false, why: 'already on OSM as node ' + p.osm_id };
  if (p.osm_own === true) return { ok: true, why: 'marked as your own observation' };
  const src = String(p.geometry_source || '');
  if (/^AR survey/.test(src)) return { ok: true, why: 'recorded in an AR survey' };
  if (/imported|register|WFS|arcgis|sample|Berlin|catalogue|kataster/i.test(src) || p.source_id || p.src_gml_id || p.src_objectid)
    return { ok: false, why: 'came from a register – its licence is not yours to give' };
  if (!src) return { ok: false, why: 'origin unknown – mark it as your own if it is' };
  return { ok: false, why: 'origin: ' + src };
}
function osmCandidates() {
  const out = [];
  CAT.features.forEach((f, i) => { const u = osmUploadable(i); if (u.ok) out.push(i); });
  return out;
}

/* ---- what goes: the tree, not the inspection ------------------------- */
function osmTags(p) {
  const t = { natural: 'tree' };
  const sp = (p.species || '').trim();
  if (sp && !/^(unrecorded|unknown|\?)$/i.test(sp)) {
    t.species = sp;
    const g = sp.split(/\s+/)[0];
    if (/^[A-Z][a-z]+$/.test(g)) t.genus = g;
  }
  // The common name is whatever language the survey is being done in, so it is
  // tagged as that language rather than claimed to be English.
  const cn = (p.name_en || '').trim();
  if (cn) t['species:' + (uiLang() || 'en')] = cn;
  // OSM wants metres for circumference, diameter_crown and height
  const num = v => { const n = parseFloat(v); return isFinite(n) && n > 0 ? n : null; };
  const girth = num(p.girth_cm) != null ? num(p.girth_cm) / 100
              : num(p.dbh_cm) != null ? num(p.dbh_cm) / 100 * Math.PI : null;
  if (girth) t.circumference = +girth.toFixed(2);
  if (num(p.height_m)) t.height = num(p.height_m);
  if (num(p.crown_d_m)) t.diameter_crown = num(p.crown_d_m);
  if (num(p.planted)) t.start_date = String(Math.round(num(p.planted)));
  if (p.tag_no) t.ref = String(p.tag_no);
  t.source = 'survey';
  return t;
}
const OSM_TAG_KEYS = ['natural', 'species', 'genus', 'circumference', 'height', 'diameter_crown', 'start_date', 'ref', 'source'];
/* Everything a tree may carry to OSM; anything else is an inspection finding. */
function osmTagAllowed(k) { return OSM_TAG_KEYS.indexOf(k) >= 0 || /^species:[a-z]{2}$/.test(k); }

/* ---- already there? --------------------------------------------------- */
async function osmNearby(lat, lon) {
  const q = '[out:json][timeout:10];node(around:' + OSM_NEAR + ',' + lat + ',' + lon + ')[natural=tree];out;';
  const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q),
                                                                     headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (!r.ok) throw new Error('Overpass answered ' + r.status);
  const j = await r.json();
  return (j.elements || []).map(e => ({ id: e.id, lat: e.lat, lon: e.lon, tags: e.tags || {} }));
}

/* ---- bringing real trees in ---------------------------------------------
   The other direction, and the more useful one to begin with: OpenStreetMap
   is the one tree dataset that is open by licence everywhere, in one schema,
   reachable from a phone in a park. It is not complete - it holds what
   somebody mapped, which in a well-surveyed park is most of the trees and on
   a random street is none - and the app says so rather than letting anybody
   believe a downloaded park is the park.

   What comes back is real data under ODbL: it carries its node id, it is
   never offered back to OSM as new, and the attribution rides along in the
   record so it survives into any export. */
const OSM_GET_MAX = 4000;
function osmBboxQuery(b) {
  return '[out:json][timeout:90];node(' + b.s + ',' + b.w + ',' + b.n + ',' + b.e +
         ')[natural=tree];out body ' + OSM_GET_MAX + ';';
}
async function osmTreesIn(b) {
  const r = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', body: 'data=' + encodeURIComponent(osmBboxQuery(b)),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (!r.ok) throw new Error('Overpass answered ' + r.status +
    (r.status === 429 ? ' – too many requests, wait a minute' : ''));
  const j = await r.json();
  return (j.elements || []).filter(e => e.type === 'node' && isFinite(e.lat) && isFinite(e.lon));
}
/* The tags OSM uses for a tree, into the fields this app inspects with.
   Nothing is invented on the way: a tag that is not there leaves the field
   empty, and everything unmapped rides along as src_* so it is not lost. */
const OSM_MAPPED = ['natural', 'species', 'genus', 'circumference', 'height', 'diameter_crown',
                    'start_date', 'ref', 'source', 'name', 'taxon', 'leaf_type', 'leaf_cycle'];
function osmTreeProps(e) {
  const t = e.tags || {}, n = v => { const x = parseFloat(v); return isFinite(x) ? x : null; };
  const p = {
    tree_id: 'OSM-' + e.id, osm_id: String(e.id),
    species: t.species || t.taxon || t.genus || '',
    name_en: t['species:en'] || t.name || '',
    geometry_source: 'OpenStreetMap',
    licence: 'ODbL 1.0, © OpenStreetMap contributors',
    inspection_type: '', symptoms: [], actions: [], history: [], remarks: ''
  };
  if (t.ref) p.tag_no = String(t.ref);
  if (n(t.circumference)) p.girth_cm = Math.round(n(t.circumference) * 100);
  if (n(t.height)) p.height_m = n(t.height);
  if (n(t.diameter_crown)) p.crown_d_m = n(t.diameter_crown);
  if (/^\d{4}/.test(t.start_date || '')) p.planted = parseInt(t.start_date, 10);
  Object.keys(t).forEach(k => {
    if (OSM_MAPPED.indexOf(k) < 0 && !/^species:/.test(k)) p['src_' + k.replace(/[^a-z0-9_]/gi, '_')] = t[k];
  });
  return p;
}
/* returns { found, added, already } */
async function osmImportTrees(b) {
  const rows = await osmTreesIn(b);
  const have = new Set();
  CAT.features.forEach((f, i) => { const p = props(i); if (p.osm_id) have.add(String(p.osm_id)); });
  let added = 0, already = 0;
  rows.forEach(e => {
    if (have.has(String(e.id))) { already++; return; }
    CAT.features.push({ type: 'Feature',
      geometry: { type: 'Point', coordinates: [+(+e.lon).toFixed(7), +(+e.lat).toFixed(7)] },
      properties: osmTreeProps(e) });
    added++;
  });
  if (added) { saveCat(); auditAdd({ what: 'osm import', detail: added + ' trees from OpenStreetMap' }); }
  return { found: rows.length, added: added, already: already, capped: rows.length >= OSM_GET_MAX };
}

/* ---- OAuth 2 with PKCE, in the page ----------------------------------- */
function b64url(buf) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function pkcePair() {
  const raw = new Uint8Array(32); crypto.getRandomValues(raw);
  const verifier = b64url(raw);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier: verifier, challenge: b64url(digest) };
}
function osmRedirectUri() { return location.origin + location.pathname; }
async function osmConnect() {
  const c = osmCfg();
  if (!(c.clientId || '').trim()) throw new Error('no OSM client id – register this page under your OSM account\'s OAuth 2 applications and paste the id');
  const pk = await pkcePair();
  const state = b64url(crypto.getRandomValues(new Uint8Array(12)));
  c.verifier = pk.verifier; c.state = state; osmSave(c);
  const u = osmHost().web + '/oauth2/authorize?response_type=code&client_id=' + encodeURIComponent(c.clientId.trim()) +
    '&redirect_uri=' + encodeURIComponent(osmRedirectUri()) + '&scope=' + encodeURIComponent('read_prefs write_api') +
    '&code_challenge=' + pk.challenge + '&code_challenge_method=S256&state=' + state;
  location.assign(u);
}
/* Back from OSM with ?code=… : swap it for a token, then clean the address. */
async function osmFinishLogin() {
  const q = new URLSearchParams(location.search);
  const code = q.get('code');
  if (!code) return false;
  const c = osmCfg();
  if (q.get('state') && c.state && q.get('state') !== c.state) throw new Error('the sign-in did not match the one started here');
  const body = new URLSearchParams({ grant_type: 'authorization_code', code: code, redirect_uri: osmRedirectUri(),
                                     client_id: c.clientId.trim(), code_verifier: c.verifier || '' });
  const r = await fetch(osmHost().web + '/oauth2/token', { method: 'POST', body: body,
                                                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (!r.ok) throw new Error('OSM refused the token (' + r.status + ')');
  const j = await r.json();
  c.token = j.access_token; delete c.verifier; delete c.state; osmSave(c);
  try { history.replaceState(null, '', osmRedirectUri()); } catch (e) {}
  try {
    const me = await fetch(osmHost().api + '/api/0.6/user/details.json', { headers: { Authorization: 'Bearer ' + c.token } });
    if (me.ok) { const u = await me.json(); c.user = u.user && u.user.display_name; osmSave(c); }
  } catch (e) {}
  return true;
}
function osmSignOut() { const c = osmCfg(); delete c.token; delete c.user; osmSave(c); }

/* ---- the upload ------------------------------------------------------- */
function xmlEsc(s) { return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch])); }
function osmChangeXml(csId, items) {
  return '<osmChange version="0.6" generator="VTA Field ' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '') + '"><create>' +
    items.map((it, n) => '<node id="-' + (n + 1) + '" changeset="' + csId + '" lat="' + it.lat + '" lon="' + it.lon + '">' +
      Object.keys(it.tags).map(k => '<tag k="' + xmlEsc(k) + '" v="' + xmlEsc(it.tags[k]) + '"/>').join('') + '</node>').join('') +
    '</create></osmChange>';
}
/* returns { uploaded: [{i, id}], skipped: [{i, why}] } */
async function osmUpload(indices, opts) {
  const o = opts || {};
  const c = osmCfg();
  if (!c.token) throw new Error('not signed in to OSM');
  const chosen = indices.filter(i => osmUploadable(i).ok).slice(0, OSM_MAX);
  if (!chosen.length) throw new Error('nothing eligible: only trees you recorded yourself, without an OSM id, go up');
  const skipped = [], items = [];
  for (const i of chosen) {
    const f = CAT.features[i], p = props(i), cc = f.geometry.coordinates;
    if (!o.skipNearby) {
      try {
        const near = await osmNearby(cc[1], cc[0]);
        if (near.length) { skipped.push({ i: i, why: 'a tree is mapped ' + OSM_NEAR + ' m away already (node ' + near[0].id + ')', near: near[0].id }); continue; }
      } catch (e) { skipped.push({ i: i, why: 'could not check OSM for a tree nearby: ' + e.message }); continue; }
    }
    items.push({ i: i, lat: +(+cc[1]).toFixed(7), lon: +(+cc[0]).toFixed(7), tags: osmTags(p) });
  }
  if (!items.length) return { uploaded: [], skipped: skipped, changeset: null };
  const H = { Authorization: 'Bearer ' + c.token, 'Content-Type': 'text/xml' };
  const api = osmHost().api + '/api/0.6';
  const csXml = '<osm><changeset><tag k="created_by" v="VTA Field ' + xmlEsc(typeof APP_VERSION !== 'undefined' ? APP_VERSION : '') + '"/>' +
    '<tag k="comment" v="' + xmlEsc(o.comment || ('Trees surveyed on site: ' + items.length + ' natural=tree with species and girth')) + '"/>' +
    '<tag k="source" v="survey"/></changeset></osm>';
  let r = await fetch(api + '/changeset/create', { method: 'PUT', headers: H, body: csXml });
  if (!r.ok) throw new Error('changeset refused (' + r.status + ')');
  const csId = (await r.text()).trim();
  r = await fetch(api + '/changeset/' + csId + '/upload', { method: 'POST', headers: H, body: osmChangeXml(csId, items) });
  if (!r.ok) {
    try { await fetch(api + '/changeset/' + csId + '/close', { method: 'PUT', headers: H }); } catch (e) {}
    throw new Error('upload refused (' + r.status + '): ' + (await r.text()).slice(0, 200));
  }
  const diff = await r.text();
  const ids = [];
  const re = /<node old_id="-(\d+)" new_id="(\d+)"/g; let m;
  while ((m = re.exec(diff))) ids[+m[1] - 1] = m[2];
  try { await fetch(api + '/changeset/' + csId + '/close', { method: 'PUT', headers: H }); } catch (e) {}
  const uploaded = [];
  items.forEach((it, n) => {
    if (!ids[n]) return;
    setEdit(it.i, { osm_id: ids[n], osm_changeset: csId, osm_at: new Date().toISOString() });
    uploaded.push({ i: it.i, id: ids[n] });
  });
  auditAdd({ what: 'osm upload', detail: uploaded.length + ' nodes, changeset ' + csId });
  return { uploaded: uploaded, skipped: skipped, changeset: csId };
}
