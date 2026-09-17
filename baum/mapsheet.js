/* ============================================================================
   MAP SHEETS TO PRINT

   A map that has been squeezed onto one page until the whole job fits is not a
   map, it is a smudge with dots on it. A map sheet is the other way round: the
   scale is chosen first, because the scale is what decides whether a person
   standing in the park can tell which tree is which - and then as many sheets
   are made as that scale needs.

   What the background can actually do, said plainly: the tiles stop at zoom
   19, which is about 18 cm of ground per tile pixel at European latitudes. Put
   that on paper at 1:1000 and it prints at about 140 dpi, which is honest
   detail. Ask for 1:500 and the same pixels are stretched to 70 dpi - a bigger
   blur, not more information. So 1:1000 is the largest scale offered, and the
   dpi of whatever is chosen is printed in the margin so nobody has to guess.

   The dots, the numbers and the sheet furniture are not tiles. They are drawn
   by the browser at the printer's own resolution, so they stay sharp at every
   scale - which is the part that matters for telling tree 114 from tree 115.

   Every tile is fetched once and written into the file as data, so the sheet
   prints in a hut with no signal, and mails as one file that still works.
   ========================================================================= */

const SHEET_PAPER = {
  a4l: { w: 297, h: 210, name: 'A4 landscape' },
  a4p: { w: 210, h: 297, name: 'A4 portrait' },
  a3l: { w: 420, h: 297, name: 'A3 landscape' },
  a3p: { w: 297, h: 420, name: 'A3 portrait' }
};
const SHEET_MARGIN = 10;        // mm of white all round
const SHEET_FOOT = 16;          // mm kept at the bottom for the furniture
const SHEET_SCALES = [1000, 2000, 5000, 10000];
const SHEET_OVERLAP = 0.04;     // sheets share a little edge, so nothing falls in a gap
const SHEET_TILE_MAX = 600;     // somebody else's tile server, and a phone's memory

/* The zoom whose pixels land closest to a good print resolution at that
   scale. 1 mm on paper is S mm on the ground; a tile pixel should be about a
   fifth of a millimetre. */
function sheetZoom(lat, scale) {
  let best = 19, bestErr = 1e9;
  for (let z = 14; z <= MAPZ.max; z++) {
    const dpi = 25.4 / (mapMPP(lat, z) / scale * 1000);
    const err = Math.abs(dpi - 190);
    if (err < bestErr) { bestErr = err; best = z; }
  }
  return best;
}
function sheetDpi(lat, z, scale) { return 25.4 / (mapMPP(lat, z) / scale * 1000); }

/* ---- what has to be on the paper -------------------------------------- */
function sheetBounds() {
  let n = -90, s = 90, e = -180, w = 180, k = 0;
  CAT.features.forEach(f => {
    if (!f.geometry || f.geometry.type !== 'Point') return;
    const c = f.geometry.coordinates;
    if (!isFinite(c[0]) || !isFinite(c[1])) return;
    n = Math.max(n, c[1]); s = Math.min(s, c[1]);
    e = Math.max(e, c[0]); w = Math.min(w, c[0]); k++;
  });
  return k ? { n: n, s: s, e: e, w: w, n_: k } : null;
}

/* The grid of sheets: the ground each one covers at that scale, laid over the
   register's own extent with a little overlap. */
function sheetPlan(o) {
  o = o || {};
  const paper = SHEET_PAPER[o.paper || 'a4l'] || SHEET_PAPER.a4l;
  const b = sheetBounds();
  if (!b) return null;
  const mid = (b.n + b.s) / 2;
  const mapW = paper.w - 2 * SHEET_MARGIN;
  const mapH = paper.h - 2 * SHEET_MARGIN - SHEET_FOOT;
  const maxSheets = Math.max(1, +o.maxSheets || 12);

  const tryScale = scale => {
    const gw = mapW / 1000 * scale, gh = mapH / 1000 * scale;      // ground metres on one sheet
    const stepW = gw * (1 - SHEET_OVERLAP), stepH = gh * (1 - SHEET_OVERLAP);
    const totW = Math.max(1, distBear(mid, b.w, mid, b.e).d) + gw * 0.12;
    const totH = Math.max(1, distBear(b.s, (b.e + b.w) / 2, b.n, (b.e + b.w) / 2).d) + gh * 0.12;
    const cols = Math.max(1, Math.ceil(totW / stepW));
    const rows = Math.max(1, Math.ceil(totH / stepH));
    return { scale: scale, cols: cols, rows: rows, gw: gw, gh: gh,
             stepW: stepW, stepH: stepH, count: cols * rows };
  };

  let fit = null;
  if (o.scale && +o.scale) fit = tryScale(+o.scale);
  else {
    /* the most detail that still fits the budget of sheets; if nothing does,
       the coarsest offered, and the caller is told how many that is */
    for (const s of SHEET_SCALES) { const t = tryScale(s); if (t.count <= maxSheets) { fit = t; break; } }
    if (!fit) fit = tryScale(SHEET_SCALES[SHEET_SCALES.length - 1]);
  }

  const z = sheetZoom(mid, fit.scale);
  const mpp = mapMPP(mid, fit.scale && z);
  /* centre the grid on the register's middle, so the margin is shared evenly */
  const cLat = mid, cLon = (b.e + b.w) / 2;
  const mPerDegLat = 111132.0, mPerDegLon = 111320.0 * Math.cos(mid * Math.PI / 180);
  const sheets = [];
  for (let r = 0; r < fit.rows; r++) {
    for (let c = 0; c < fit.cols; c++) {
      const dx = (c - (fit.cols - 1) / 2) * fit.stepW;
      const dy = ((fit.rows - 1) / 2 - r) * fit.stepH;
      sheets.push({ no: sheets.length + 1, row: r, col: c,
                    lat: cLat + dy / mPerDegLat, lon: cLon + dx / mPerDegLon });
    }
  }
  return { paper: paper, paperKey: o.paper || 'a4l', scale: fit.scale, z: z,
           mapW: mapW, mapH: mapH, gw: fit.gw, gh: fit.gh,
           cols: fit.cols, rows: fit.rows, sheets: sheets,
           dpi: sheetDpi(mid, z, fit.scale), mpp: mpp,
           bounds: b, labels: o.labels !== false };
}

/* ---- the tiles one plan needs ----------------------------------------- */
function sheetTileList(plan) {
  const want = {}, out = [];
  const mmPx = 1000 / plan.scale;                     // ground metres -> mm on paper
  plan.sheets.forEach(s => {
    const mpp = mapMPP(s.lat, plan.z);
    const pw = (plan.mapW / mmPx) / mpp, ph = (plan.mapH / mmPx) / mpp;   // sheet in tile pixels
    const cx = lon2px(s.lon, plan.z), cy = lat2px(s.lat, plan.z);
    const left = cx - pw / 2, top = cy - ph / 2;
    const n = Math.pow(2, plan.z);
    for (let tx = Math.floor(left / 256); tx <= Math.floor((left + pw) / 256); tx++)
      for (let ty = Math.floor(top / 256); ty <= Math.floor((top + ph) / 256); ty++) {
        if (ty < 0 || ty >= n) continue;
        const x = ((tx % n) + n) % n;
        const k = plan.z + '/' + x + '/' + ty;
        if (want[k]) continue;
        want[k] = 1;
        out.push({ key: k, z: plan.z, x: x, y: ty,
                   url: TILE.replace('{z}', plan.z).replace('{x}', x).replace('{y}', ty) });
      }
  });
  return out;
}
/* Fetched one at a time and turned into data, because the sheet has to print
   where there is no signal. A tile that will not come is left white rather
   than failing the whole job. */
async function sheetFetchTiles(list, onStep) {
  const out = {};
  let done = 0;
  for (const t of list) {
    try {
      const r = await fetch(t.url, { mode: 'cors' });
      if (r.ok) {
        const blob = await r.blob();
        out[t.key] = await new Promise(res => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result);
          fr.onerror = () => res(null);
          fr.readAsDataURL(blob);
        });
      }
    } catch (e) {}
    done++;
    if (onStep && (done % 3 === 0 || done === list.length)) onStep(done, list.length);
  }
  return out;
}

/* ---- drawing one sheet ------------------------------------------------- */
function sheetTrees(plan, s) {
  const mmPx = 1000 / plan.scale;
  const mpp = mapMPP(s.lat, plan.z);
  const cx = lon2px(s.lon, plan.z), cy = lat2px(s.lat, plan.z);
  const pw = (plan.mapW / mmPx) / mpp, ph = (plan.mapH / mmPx) / mpp;
  const left = cx - pw / 2, top = cy - ph / 2;
  const out = [];
  CAT.features.forEach((f, i) => {
    if (!f.geometry || f.geometry.type !== 'Point') return;
    const c = f.geometry.coordinates;
    const x = (lon2px(c[0], plan.z) - left) / pw * plan.mapW;
    const y = (lat2px(c[1], plan.z) - top) / ph * plan.mapH;
    if (x < -2 || y < -2 || x > plan.mapW + 2 || y > plan.mapH + 2) return;
    const p = props(i), a = assess(p);
    out.push({ x: x, y: y, lvl: a.lvl, id: p.tag_no || p.tree_id || '', i: i });
  });
  return out;
}
function sheetTileImgs(plan, s, tiles) {
  const mmPx = 1000 / plan.scale;
  const mpp = mapMPP(s.lat, plan.z);
  const cx = lon2px(s.lon, plan.z), cy = lat2px(s.lat, plan.z);
  const pw = (plan.mapW / mmPx) / mpp, ph = (plan.mapH / mmPx) / mpp;
  const left = cx - pw / 2, top = cy - ph / 2;
  const n = Math.pow(2, plan.z);
  const tmm = 256 / pw * plan.mapW;                   // one tile, in mm on this paper
  let html = '';
  for (let tx = Math.floor(left / 256); tx <= Math.floor((left + pw) / 256); tx++)
    for (let ty = Math.floor(top / 256); ty <= Math.floor((top + ph) / 256); ty++) {
      if (ty < 0 || ty >= n) continue;
      const x = ((tx % n) + n) % n;
      const src = tiles[plan.z + '/' + x + '/' + ty];
      if (!src) continue;
      const lx = (tx * 256 - left) / pw * plan.mapW;
      const ly = (ty * 256 - top) / ph * plan.mapH;
      html += '<img class="t" src="' + src + '" style="left:' + lx.toFixed(3) + 'mm;top:' +
              ly.toFixed(3) + 'mm;width:' + tmm.toFixed(3) + 'mm;height:' + tmm.toFixed(3) + 'mm">';
    }
  return html;
}
/* A bar whose length is a round number of metres on the ground. */
function sheetScaleBar(plan) {
  const want = plan.mapW * 0.22 / 1000 * plan.scale;             // about a fifth of the sheet
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  let m = steps[0];
  steps.forEach(s => { if (Math.abs(s - want) < Math.abs(m - want)) m = s; });
  const mm = m / plan.scale * 1000;
  return '<div class="bar"><div class="b" style="width:' + mm.toFixed(2) + 'mm">' +
         '<i style="width:' + (mm / 2).toFixed(2) + 'mm"></i></div>' +
         '<div class="bl"><span>0</span><span>' + m + ' m</span></div></div>';
}
function sheetOverview(plan, tiles) {
  if (plan.sheets.length < 2) return '';
  /* the whole job small, with the sheet grid over it, so a person knows which
     sheet to take out of the folder */
  const b = plan.bounds;
  const cells = plan.sheets.map(s =>
    '<div class="cell" style="left:' + (s.col / plan.cols * 100).toFixed(2) + '%;top:' +
    (s.row / plan.rows * 100).toFixed(2) + '%;width:' + (100 / plan.cols).toFixed(2) +
    '%;height:' + (100 / plan.rows).toFixed(2) + '%"><span>' + s.no + '</span></div>').join('');
  return '<section class="sheet"><div class="hd"><b>' + esc(sheetTitle()) + '</b>' +
    '<span>Sheet layout · ' + plan.sheets.length + ' sheets · 1:' + plan.scale + '</span></div>' +
    '<div class="ov"><div class="grid">' + cells + '</div></div>' +
    '<div class="ft"><span>' + esc(sheetTitle()) + '</span><span>' +
    plan.cols + ' × ' + plan.rows + ' sheets · ' + (b.n_ || 0) + ' trees</span></div></section>';
}
function sheetTitle() {
  const h = (typeof rHead === 'function') ? rHead() : {};
  return h.object || (CAT.name || 'Tree register');
}

function buildSheets(plan, tiles) {
  const P = plan.paper;
  const legend = [0, 1, 2, 3].map(l =>
    '<span class="lg"><i style="background:' + LVLCOL[l] + '"></i>' + l + ' ' + esc(LVLTXT[l]) + '</span>').join('');
  const date = (typeof rHead === 'function' && rHead().date) || new Date().toISOString().slice(0, 10);

  const pages = plan.sheets.map(s => {
    const trees = sheetTrees(plan, s);
    const dots = trees.map(t =>
      '<div class="d l' + t.lvl + '" style="left:' + t.x.toFixed(2) + 'mm;top:' + t.y.toFixed(2) + 'mm"></div>' +
      (plan.labels && t.id ? '<div class="n" style="left:' + t.x.toFixed(2) + 'mm;top:' +
        t.y.toFixed(2) + 'mm">' + esc(String(t.id)) + '</div>' : '')).join('');
    const near = plan.sheets.filter(o => Math.abs(o.row - s.row) + Math.abs(o.col - s.col) === 1)
      .map(o => (o.row < s.row ? '↑' : o.row > s.row ? '↓' : o.col < s.col ? '←' : '→') + ' ' + o.no)
      .join('  ');
    return '<section class="sheet">' +
      '<div class="hd"><b>' + esc(sheetTitle()) + '</b>' +
      '<span>Sheet ' + s.no + ' of ' + plan.sheets.length + ' · 1:' + plan.scale + '</span></div>' +
      '<div class="map" style="width:' + plan.mapW + 'mm;height:' + plan.mapH + 'mm">' +
      sheetTileImgs(plan, s, tiles) +
      '<div class="pin">' + dots + '</div>' +
      '<div class="north">N<br>↑</div>' +
      '<div class="attr">© OpenStreetMap contributors</div>' +
      '</div>' +
      '<div class="ft">' + sheetScaleBar(plan) +
      '<div class="lgs">' + legend + '</div>' +
      '<div class="meta">' + esc(date) + ' · ' + trees.length + ' trees on this sheet · ' +
      Math.round(plan.dpi) + ' dpi' + (near ? ' · next: ' + esc(near) : '') + '</div>' +
      '</div></section>';
  }).join('');

  return '<!doctype html><html lang="' + (typeof uiLang === 'function' ? uiLang() : 'en') + '">' +
    '<meta charset="utf-8"><title>' + esc(sheetTitle()) + ' – map sheets</title><style>' +
    '@page{size:' + P.w + 'mm ' + P.h + 'mm;margin:' + SHEET_MARGIN + 'mm}' +
    'html,body{margin:0;padding:0;background:#f4f4f2;font:10pt/1.35 system-ui,Segoe UI,Arial,sans-serif;color:#111}' +
    '.sheet{width:' + (P.w - 2 * SHEET_MARGIN) + 'mm;height:' + (P.h - 2 * SHEET_MARGIN) + 'mm;' +
      'margin:' + SHEET_MARGIN + 'mm auto;background:#fff;box-sizing:border-box;position:relative;' +
      'page-break-after:always;display:flex;flex-direction:column}' +
    '.hd{display:flex;justify-content:space-between;align-items:baseline;font-size:9pt;' +
      'padding-bottom:1.6mm;border-bottom:.4mm solid #222;margin-bottom:1.6mm}' +
    '.map{position:relative;overflow:hidden;border:.3mm solid #444;flex:0 0 auto}' +
    '.map img.t{position:absolute;image-rendering:auto}' +
    '.pin{position:absolute;inset:0}' +
    '.d{position:absolute;width:2.6mm;height:2.6mm;margin:-1.3mm 0 0 -1.3mm;border-radius:50%;' +
      'border:.35mm solid #fff;box-shadow:0 0 0 .25mm rgba(0,0,0,.65)}' +
    '.n{position:absolute;margin:-4.6mm 0 0 1.6mm;font-size:6.5pt;font-weight:700;color:#111;' +
      'background:rgba(255,255,255,.82);border:.15mm solid #777;border-radius:.6mm;padding:0 .5mm;' +
      'white-space:nowrap}' +
    '.d.l0{background:' + LVLCOL[0] + '}.d.l1{background:' + LVLCOL[1] + '}' +
    '.d.l2{background:' + LVLCOL[2] + '}.d.l3{background:' + LVLCOL[3] + '}' +
    '.north{position:absolute;right:2mm;top:2mm;font-size:7pt;font-weight:700;text-align:center;' +
      'line-height:1;background:rgba(255,255,255,.85);border:.2mm solid #333;padding:.8mm 1.2mm}' +
    '.attr{position:absolute;right:0;bottom:0;font-size:5.5pt;background:rgba(255,255,255,.8);padding:0 .8mm}' +
    '.ft{flex:1 1 auto;display:flex;align-items:center;gap:5mm;padding-top:1.6mm;font-size:7.5pt}' +
    '.bar .b{height:2mm;border:.25mm solid #111;background:#fff;position:relative}' +
    '.bar .b i{position:absolute;left:0;top:0;bottom:0;background:#111}' +
    '.bar .bl{display:flex;justify-content:space-between;font-size:6.5pt}' +
    '.lgs{display:flex;gap:3mm;flex-wrap:wrap}' +
    '.lg{display:inline-flex;align-items:center;gap:1mm;font-size:6.5pt}' +
    '.lg i{width:2.2mm;height:2.2mm;border-radius:50%;display:inline-block;border:.2mm solid #555}' +
    '.meta{margin-left:auto;font-size:6.5pt;color:#333;text-align:right}' +
    '.ov{flex:0 0 auto;height:' + (P.h - 2 * SHEET_MARGIN - 30) + 'mm;position:relative;' +
      'border:.3mm solid #444;background:#eef1ed}' +
    '.ov .grid{position:absolute;inset:6mm}' +
    '.ov .cell{position:absolute;box-sizing:border-box;border:.3mm dashed #555;' +
      'display:flex;align-items:center;justify-content:center}' +
    '.ov .cell span{font-size:12pt;font-weight:700;color:#333}' +
    '@media screen{body{padding:6mm 0}.sheet{box-shadow:0 2mm 6mm rgba(0,0,0,.25)}}' +
    '@media print{body{background:#fff;padding:0}.sheet{margin:0;box-shadow:none}}' +
    '</style>' + sheetOverview(plan, tiles) + pages;
}

/* ---- the button --------------------------------------------------------- */
function sheetOpts() {
  const p = prefs();
  return { paper: p.sheetPaper || 'a4l', scale: +p.sheetScale || 0,
           labels: p.sheetLabels !== false, maxSheets: 12 };
}
async function sheetMake() {
  if (!CAT.features.length) return toast('No trees to map yet.');
  const plan = sheetPlan(sheetOpts());
  if (!plan) return toast('No tree has a position yet.');
  const list = sheetTileList(plan);
  const b = $('sheetGo');
  const say = t => { const el = $('sheetNote'); if (el) el.textContent = t; };
  if (list.length > SHEET_TILE_MAX)
    return toast(plan.sheets.length + ' sheets would need ' + list.length +
                 ' map tiles. Pick a smaller scale.');
  if (!confirm(plan.sheets.length + ' sheet' + (plan.sheets.length === 1 ? '' : 's') +
               ' at 1:' + plan.scale + ' on ' + plan.paper.name + '\n' +
               Math.round(plan.dpi) + ' dpi · ' + list.length + ' map tiles to fetch\n\n' +
               'Fetch them and build the sheets?')) return;
  if (b) b.disabled = true;
  try {
    say('Fetching map tiles 0/' + list.length + ' …');
    const tiles = await sheetFetchTiles(list, (d, n) => say('Fetching map tiles ' + d + '/' + n + ' …'));
    const missing = list.length - Object.keys(tiles).length;
    say('Building …');
    const html = buildSheets(plan, tiles);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) { dl('map_sheets_' + stamp() + '.html', blob); toast('Sheets saved as a file.'); }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    say(plan.sheets.length + ' sheets · 1:' + plan.scale + ' · ' + Math.round(plan.dpi) + ' dpi' +
        (missing ? ' · ' + missing + ' tiles did not come and are white' : '') +
        ' · printed at ' + plan.paper.name + ' with no margins scaling');
  } catch (e) {
    say('Failed: ' + (e && e.message));
  }
  if (b) b.disabled = false;
}
/* What the choice means, before anything is fetched. */
function sheetPaint() {
  const el = $('sheetPlan'); if (!el) return;
  const sel = $('sheetPaper'); if (sel) sel.value = prefs().sheetPaper || 'a4l';
  const ssc = $('sheetScale'); if (ssc) ssc.value = String(+prefs().sheetScale || 0);
  const lab = $('sheetLabels'); if (lab) lab.checked = prefs().sheetLabels !== false;
  if (!CAT.features.length) { el.textContent = 'No trees yet.'; return; }
  const plan = sheetPlan(sheetOpts());
  if (!plan) { el.textContent = 'No tree has a position yet.'; return; }
  const list = sheetTileList(plan);
  el.innerHTML = '<div class="kv"><span>Sheets</span><span>' + plan.sheets.length +
      ' · ' + plan.cols + ' × ' + plan.rows + '</span></div>' +
    '<div class="kv"><span>Scale</span><span>1:' + plan.scale + '</span></div>' +
    '<div class="kv"><span>One sheet covers</span><span>' + Math.round(plan.gw) + ' × ' +
      Math.round(plan.gh) + ' m</span></div>' +
    '<div class="kv"><span>Print resolution</span><span class="' +
      (plan.dpi >= 120 ? 'ok' : 'wa') + '">' + Math.round(plan.dpi) + ' dpi</span></div>' +
    '<div class="kv"><span>Map tiles to fetch</span><span class="' +
      (list.length > SHEET_TILE_MAX ? 'no' : '') + '">' + list.length + '</span></div>';
}
function wireSheets() {
  if (!$('sheetGo')) return;
  $('sheetPaper').onchange = () => { setPref('sheetPaper', $('sheetPaper').value); sheetPaint(); };
  $('sheetScale').onchange = () => { setPref('sheetScale', +$('sheetScale').value); sheetPaint(); };
  $('sheetLabels').onchange = () => { setPref('sheetLabels', $('sheetLabels').checked); sheetPaint(); };
  $('sheetGo').onclick = sheetMake;
  sheetPaint();
}
