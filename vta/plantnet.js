/* ============================================================================
   SPECIES FROM SEVERAL ORGANS - Pl@ntNet

   One bark photograph is a weak witness; the same tree's leaf, its flower,
   its fruit and its habit together are a strong one. That is how Tree-Quest
   (IIASA) does it, over the Pl@ntNet API, and it is how this does it: every
   photograph of a tree carries which organ it shows, and any number of them
   go to the service in one request. Back come species with probabilities,
   the first ten, and the inspector picks or ignores.

   The API wants a key. It is free for non-commercial use with a daily quota,
   and it is a setting here, never baked in. Without a key the button says so
   and does nothing else. Without a signal it says that instead. Nothing the
   service says is written to the record on its own.
   ========================================================================= */

const K_PNET = 'vta_plantnet_v1';
const PNET_URL = 'https://my-api.plantnet.org/v2/identify/all';
const ORGANS = [
  ['leaf', 'Leaf', 'Blatt'], ['flower', 'Flower', 'Blüte'], ['fruit', 'Fruit', 'Frucht'],
  ['bark', 'Bark', 'Rinde'], ['habit', 'Whole tree', 'Habitus'], ['other', 'Other', 'Sonstiges']
];
function pnetCfg() { try { return JSON.parse(lsGet(K_PNET)) || {}; } catch (e) { return {}; } }
function pnetSave(c) { lsSet(K_PNET, JSON.stringify(c)); }

/* The answer, read by shape: results[].score and results[].species. */
function pnetParse(j) {
  const out = [];
  const rs = (j && (j.results || j.candidates)) || [];
  rs.forEach(r => {
    const sp = r.species || r.taxon || {};
    const name = sp.scientificNameWithoutAuthor || sp.scientificName || sp.name || r.name;
    const p = +(r.score != null ? r.score : r.probability);
    if (!name || !(p >= 0 && p <= 1)) return;
    const cns = sp.commonNames || sp.common_names || [];
    out.push({ name: String(name).trim(), p: p, common: cns.length ? String(cns[0]) : '',
               genus: sp.genus && (sp.genus.scientificNameWithoutAuthor || sp.genus.name) || '',
               family: sp.family && (sp.family.scientificNameWithoutAuthor || sp.family.name) || '' });
  });
  out.sort((a, b) => b.p - a.p);
  return out.slice(0, 10);
}

/* photos: [{ blob, organ }] */
async function pnetIdentify(photos) {
  const c = pnetCfg();
  const key = (c.key || '').trim();
  if (!key) throw new Error('no Pl@ntNet key – Data → App holds the field');
  if (!photos || !photos.length) throw new Error('no photographs to send');
  const fd = new FormData();
  photos.slice(0, 5).forEach((ph, n) => {
    fd.append('images', ph.blob, 'photo' + n + '.jpg');
    fd.append('organs', ORGANS.some(o => o[0] === ph.organ) ? (ph.organ === 'other' ? 'auto' : ph.organ) : 'auto');
  });
  const lang = (c.lang || (typeof voiceLang === 'function' && voiceLang().slice(0, 2)) || 'de');
  const url = PNET_URL + '?include-related-images=false&no-reject=false&lang=' + encodeURIComponent(lang) +
              '&api-key=' + encodeURIComponent(key);
  const r = await fetch(url, { method: 'POST', body: fd });
  if (r.status === 401) throw new Error('the key was refused (401)');
  if (r.status === 404) throw new Error('no species found for these pictures');
  if (r.status === 429) throw new Error('daily quota used up – it resets tomorrow');
  if (!r.ok) throw new Error('the service answered ' + r.status);
  const list = pnetParse(await r.json());
  if (!list.length) throw new Error('the answer held no candidates');
  return list;
}

/* Shown, never applied on its own. Setting the species is a separate tap. */
function pnetSheet(tree, list, sent) {
  const el = $('niaBox');
  el.innerHTML = '';
  const h = document.createElement('div');
  h.innerHTML = '<b>Pl@ntNet</b> <span class="small">· from ' + sent + ' photograph' + (sent === 1 ? '' : 's') +
                ' · a model, not a determination</span>';
  el.appendChild(h);
  list.forEach(c => {
    const row = document.createElement('div'); row.className = 'niarow';
    const pct = (c.p * 100).toFixed(c.p >= 0.1 ? 0 : 1) + ' %';
    row.innerHTML = '<div><b><i>' + esc(c.name) + '</i></b> <span class="small">' + pct + '</span>' +
      '<div class="small dim">' + esc(c.common || '') + (c.family ? (c.common ? ' · ' : '') + esc(c.family) : '') + '</div></div>';
    const bar = document.createElement('div'); bar.className = 'niabar';
    const fill = document.createElement('i'); fill.style.width = Math.round(c.p * 100) + '%';
    bar.appendChild(fill); row.appendChild(bar);
    const b = document.createElement('button'); b.className = 'sm p'; b.textContent = 'Set species';
    b.onclick = () => {
      const patch = { species: c.name };
      if (c.common && !(props(tree).name_en || '').trim()) patch.name_en = c.common;
      patch.species_source = 'Pl@ntNet ' + Math.round(c.p * 100) + ' % from ' + sent + ' photo' + (sent === 1 ? '' : 's');
      setEdit(tree, patch);
      if (openIdx === tree && panelEl) openPanel(tree, panelTab);
      el.style.display = 'none';
      toast('Species set to ' + c.name + '.');
    };
    row.appendChild(b);
    el.appendChild(row);
  });
  const act = document.createElement('div'); act.className = 'btnrow';
  const cl = document.createElement('button'); cl.textContent = 'Close';
  cl.onclick = () => el.style.display = 'none';
  act.appendChild(cl); el.appendChild(act);
  el.style.display = 'block';
}

/* Gather this tree's photographs that carry an organ, or let the inspector
   tag the untagged ones on the spot, then send the lot. */
async function pnetForTree(tree) {
  const id = tid(tree);
  let list = [];
  try { list = await photoList(id); } catch (e) { return toast('Photos could not be read.'); }
  const pics = list.filter(f => f.kind !== 'audio' && f.kind !== 'tag');
  if (!pics.length) return toast('No photographs of ' + id + ' yet – take a leaf, the bark, the whole tree.');
  const el = $('niaBox');
  el.innerHTML = '';
  const h = document.createElement('div');
  h.innerHTML = '<b>Which organ is on each picture?</b> <span class="small">· up to five go together</span>';
  el.appendChild(h);
  const chosen = [];
  pics.slice(0, 8).forEach(f => {
    const row = document.createElement('div'); row.className = 'niarow';
    const im = document.createElement('img'); im.src = f.url; im.style.cssText = 'width:56px;height:56px;object-fit:cover;border-radius:7px;margin-right:8px';
    const sel = document.createElement('select');
    const none = document.createElement('option'); none.value = ''; none.textContent = '— leave out —'; sel.appendChild(none);
    ORGANS.forEach(o => { const op = document.createElement('option'); op.value = o[0]; op.textContent = o[1] + ' · ' + o[2]; sel.appendChild(op); });
    sel.value = f.kind && ORGANS.some(o => o[0] === f.kind) ? f.kind : (f.kind === 'bark' ? 'bark' : '');
    const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;align-items:center;gap:6px';
    wrap.appendChild(im); wrap.appendChild(sel); row.appendChild(wrap);
    chosen.push({ f: f, sel: sel });
    el.appendChild(row);
  });
  const act = document.createElement('div'); act.className = 'btnrow';
  const go = document.createElement('button'); go.className = 'p'; go.textContent = 'Identify';
  go.onclick = async () => {
    const send = chosen.filter(c => c.sel.value);
    if (!send.length) return toast('Pick at least one picture.');
    go.disabled = true; go.textContent = '…';
    try {
      const photos = [];
      for (const c of send.slice(0, 5)) photos.push({ blob: await (await fetch(c.f.url)).blob(), organ: c.sel.value });
      const res = await pnetIdentify(photos);
      auditAdd({ what: 'identified', tree: id, detail: 'Pl@ntNet: ' + res[0].name + ' ' + Math.round(res[0].p * 100) + ' %' });
      pnetSheet(tree, res, photos.length);
    } catch (e) {
      toast('Pl@ntNet: ' + (e.message === 'Failed to fetch' ? 'no answer – no signal, or the service is down' : e.message));
      go.disabled = false; go.textContent = 'Identify';
    }
  };
  const cl = document.createElement('button'); cl.textContent = 'Close';
  cl.onclick = () => el.style.display = 'none';
  act.appendChild(go); act.appendChild(cl); el.appendChild(act);
  el.style.display = 'block';
}
