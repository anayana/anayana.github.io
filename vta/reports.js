/* ============================================================================
   REPORTS

   The inspection is the work; the report is what anybody else ever sees of it,
   and what gets paid for. It is also the part every client wants differently:
   a city wants its own column order and its own headings, a housing company
   wants three columns and a signature, a court wants everything.

   So there are two halves here.

   The head is the same for everyone: who ordered the work, who did it, which
   job number, which property, the date and place, and who signs. That is an
   ordinary business letter head and it is typed once and kept.

   The body comes from a template, and a template comes from the client's own
   blank form. Paste its headings in - or drop the file on it - and each
   heading is matched against the fields this app holds, using the same
   multilingual table that reads a register (COLSYN and scoreCol in mapper.js,
   which already knows that "Stammumfang", "ymparysmitta" and "girth" are one
   thing). What it is sure about it fills in; what it is not sure about it says
   so about, and the inspector corrects it from a drop-down. That is the whole
   trick, and it is the same trick the register import uses, because it worked
   there.

   No invented client forms ship with this app. The one built-in template is
   the app's own field set, and it says on it that it is not anybody's official
   form. A real one comes from the person who was given it.

   Out: the page (print it, and the phone's print dialogue writes the PDF),
   Word (.docx, written by docx.js), and CSV for a spreadsheet.
   ========================================================================= */

const K_TPL = 'vta_report_tpl_v1', K_RHEAD = 'vta_report_head_v1';

/* ---- the head ---------------------------------------------------------- */
const RHEAD_FIELDS = [
  ['client', 'Client / who ordered it', 'area'],
  ['object', 'Property or site', 'text'],
  ['job', 'Job number', 'text'],
  ['office', 'Contractor / your office', 'area'],
  ['signer', 'Signed by', 'text'],
  ['role', 'Position', 'text'],
  ['place', 'Place', 'text'],
  ['note', 'Note under the head', 'area']
];
function rHead() { try { return JSON.parse(lsGet(K_RHEAD)) || {}; } catch (e) { return {}; } }
function rHeadSet(k, v) { const h = rHead(); if (v) h[k] = v; else delete h[k]; lsSet(K_RHEAD, JSON.stringify(h)); }

/* ---- what a column can be ---------------------------------------------
   Every field of the register, plus the handful a form wants that are not
   properties of a tree at all. */
const REP_EXTRA = {
  rep_no: 'Running number',
  rep_date: 'Report date',
  rep_inspector: 'Inspector (from the head)',
  rep_object: 'Property (from the head)',
  rep_level: 'Level worked out by the app',
  rep_lat: 'Latitude', rep_lon: 'Longitude',
  rep_blank: 'Left empty – filled in by hand'
};
function repFieldList() {
  const seen = {}, out = [];
  const add = (k, label) => { if (k && !seen[k]) { seen[k] = 1; out.push([k, label]); } };
  (typeof FIELDS !== 'undefined' ? Object.keys(FIELDS) : []).forEach(k => add(k, fieldDef(k)[1]));
  (typeof F_BASE !== 'undefined' ? F_BASE : []).forEach(f => add(f[0], fieldDef(f[0])[1]));
  Object.keys(REP_EXTRA).forEach(k => add(k, REP_EXTRA[k]));
  return out;
}
/* The value a column holds for one tree, as text. */
function repValue(key, i, n) {
  const p = props(i), h = rHead();
  if (key === 'rep_no') return String(n + 1);
  if (key === 'rep_blank') return '';
  if (key === 'rep_date') return (rHead().date || new Date().toISOString().slice(0, 10));
  if (key === 'rep_inspector') return h.signer || userName() || '';
  if (key === 'rep_object') return h.object || '';
  if (key === 'rep_level') { const a = assess(p); return a.lvl + ' · ' + LVLTXT[a.lvl]; }
  if (key === 'rep_lat') return CAT.features[i].geometry.coordinates[1].toFixed(6);
  if (key === 'rep_lon') return CAT.features[i].geometry.coordinates[0].toFixed(6);
  const v = p[key];
  if (v == null || v === '') return '';
  if (Array.isArray(v)) return v.map(x => optLabel(key, x)).join(' · ');
  const def = fieldDef(key);
  return (def[2] === 'select') ? String(optLabel(key, v)) : String(v);
}

/* ---- templates --------------------------------------------------------- */
function tplAll() { try { return JSON.parse(lsGet(K_TPL)) || []; } catch (e) { return []; } }
function tplSave(list) { lsSet(K_TPL, JSON.stringify(list)); }
function tplById(id) { return tplAll().find(t => t.id === id) || null; }
/* The one that ships: the app's own fields, in the order the form asks them,
   and it does not pretend to be anybody's official paperwork. */
function tplBuiltIn() {
  const nrm = curNorm();
  const keys = ['rep_no', 'tree_id', 'tag_no', 'species', 'area', 'dbh_cm', 'height_m',
                'vitality_roloff', 'damage_class', 'rep_level', 'recommendation',
                'urgency', 'next_inspection', 'remarks']
    .filter(k => REP_EXTRA[k] || (nrm.fields ? nrm.fields.indexOf(k) >= 0 : true) ||
                 ['tree_id', 'species', 'remarks'].indexOf(k) >= 0);
  return { id: '', name: 'This app\'s own columns', builtin: true, landscape: true,
           cols: keys.map(k => ({ head: (REP_EXTRA[k] || fieldDef(k)[1]), key: k })) };
}
function tplCurrent() {
  const id = prefs().reportTpl;
  return (id && tplById(id)) || tplBuiltIn();
}

/* ---- reading somebody's blank form ------------------------------------
   Anything that has the headings in it: a CSV, a line of tabs pasted out of
   Excel, the header row of an HTML table, or the columns typed one per line.
   A .docx cannot be read here - it is a compressed ZIP and unpacking one on a
   phone needs a decompressor this app does not carry - so for a Word form the
   headings are copied and pasted, which takes ten seconds and always works. */
function tplHeadings(text) {
  const t = String(text || '').replace(/\r/g, '').trim();
  if (!t) return [];
  /* an HTML table */
  if (/<\s*(table|tr|th)\b/i.test(t)) {
    try {
      const doc = new DOMParser().parseFromString(t, 'text/html');
      const tab = doc.querySelector('table');
      if (tab) {
        const row = tab.querySelector('tr');
        const cells = row ? [...row.querySelectorAll('th,td')] : [];
        const heads = cells.map(c => c.textContent.trim()).filter(Boolean);
        if (heads.length > 1) return heads;
      }
    } catch (e) {}
  }
  const lines = t.split('\n').map(l => l.trim()).filter(Boolean);
  /* one heading per line, when that is plainly what it is */
  if (lines.length > 2 && lines.every(l => l.indexOf('\t') < 0 && (l.match(/[;,]/g) || []).length === 0))
    return lines;
  /* otherwise the first line, split on whatever separates it most */
  const first = lines[0];
  const counts = [['\t', (first.match(/\t/g) || []).length],
                  [';', (first.match(/;/g) || []).length],
                  [',', (first.match(/,/g) || []).length]];
  counts.sort((a, b) => b[1] - a[1]);
  if (!counts[0][1]) return [first];
  return first.split(counts[0][0]).map(c => c.trim().replace(/^"|"$/g, '')).filter(Boolean);
}
/* Each heading against every field this app has. The score is the register
   mapper's, so a form that says "Stammumfang" lands on girth_cm without
   anybody teaching it twice. */
/* A column that is only a counter: "Lfd. Nr.", "Pos.", "#", "Jrk nr". It has
   to be decided before anything else, because "Nr." is also a synonym of the
   tree's own number and would otherwise eat it. */
const REP_COUNTER = /^(lfd\.?\s*nr\.?|laufende\s*nr\.?|nr\.?|no\.?|pos\.?|#|zeile|row|jrk\.?\s*nr\.?|juoks\.?\s*nro)$/i;
function tplGuess(heads) {
  const fields = repFieldList();
  const used = {};
  const out = heads.map(h => ({ head: h, key: null, score: 0 }));
  /* first pass: the counters, and only the first of them */
  out.forEach(o => {
    if (!used.rep_no && REP_COUNTER.test(String(o.head).trim())) {
      o.key = 'rep_no'; o.score = 95; used.rep_no = 1;
    }
  });
  /* second pass: everything else, best score first so the confident columns
     claim their field before a doubtful one does */
  const rest = out.filter(o => !o.key).map(o => {
    let best = null, score = 0;
    fields.forEach(f => {
      if (REP_EXTRA[f[0]]) return;                 // the extras are chosen by hand, not guessed
      const s = Math.max(scoreCol(o.head, f[0]), scoreCol(o.head, normKey(f[1])) - 6);
      if (s > score) { score = s; best = f[0]; }
    });
    o.best = best; o.bestScore = score;
    return o;
  });
  rest.sort((a, b) => b.bestScore - a.bestScore);
  rest.forEach(o => {
    if (o.bestScore >= 50 && o.best && !used[o.best]) { o.key = o.best; o.score = o.bestScore; used[o.best] = 1; }
    delete o.best; delete o.bestScore;
  });
  return out;
}

/* ---- the head, drawn the way a letter head is -------------------------- */
function repHeadHtml() {
  const h = rHead(), nrm = curNorm();
  const esc2 = s => esc(String(s || '')).replace(/\n/g, '<br>');
  const date = h.date || new Date().toISOString().slice(0, 10);
  return '<table class="hd"><tr>' +
    '<td class="from">' + (h.office ? esc2(h.office) : '<i>no contractor entered</i>') + '</td>' +
    '<td class="to">' + (h.client ? esc2(h.client) : '<i>no client entered</i>') + '</td>' +
    '</tr></table>' +
    '<table class="job">' +
    (h.object ? '<tr><th>' + esc(T('Property')) + '</th><td>' + esc(h.object) + '</td></tr>' : '') +
    (h.job ? '<tr><th>' + esc(T('Job no.')) + '</th><td>' + esc(h.job) + '</td></tr>' : '') +
    '<tr><th>' + esc(T('Date')) + '</th><td>' + esc(date) + '</td></tr>' +
    '<tr><th>' + esc(T('Standard')) + '</th><td>' + esc(nrm.label) + ' · ' + esc(nrm.source) + '</td></tr>' +
    '<tr><th>' + esc(T('Trees')) + '</th><td>' + CAT.features.length + '</td></tr>' +
    '</table>' +
    (h.note ? '<p class="note">' + esc2(h.note) + '</p>' : '');
}
function repSignHtml() {
  const h = rHead();
  const date = h.date || new Date().toISOString().slice(0, 10);
  return '<div class="sign"><div class="line"></div>' +
    '<div>' + esc((h.place ? h.place + ', ' : '') + date) + '</div>' +
    '<div><b>' + esc(h.signer || userName() || '') + '</b>' +
    (h.role ? ' · ' + esc(h.role) : '') + '</div></div>';
}

/* ---- the table report, in the client's own columns --------------------- */
function repRows(tpl) {
  const cols = tpl.cols || [];
  return CAT.features.map((f, i) => cols.map(c => c.key ? repValue(c.key, i, i) : ''));
}
function repTableHtml(tpl) {
  const cols = tpl.cols || [];
  const rows = repRows(tpl);
  return '<table class="rep"><thead><tr>' +
    cols.map(c => '<th>' + esc(c.head) + '</th>').join('') + '</tr></thead><tbody>' +
    rows.map(r => '<tr>' + r.map(v => '<td>' + esc(v) + '</td>').join('') + '</tr>').join('') +
    '</tbody></table>';
}
function repHtml(tpl) {
  tpl = tpl || tplCurrent();
  const nrm = curNorm(), h = rHead();
  return '<!doctype html><html lang="' + uiLang() + '"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(h.object || nrm.reportTitle) + '</title><style>' +
    '@page{size:' + (tpl.landscape ? 'A4 landscape' : 'A4') + ';margin:16mm}' +
    'body{font:12px/1.45 system-ui,Segoe UI,Arial,sans-serif;color:#111;margin:20px;max-width:1100px}' +
    'h1{font-size:19px;margin:18px 0 4px}' +
    'table{border-collapse:collapse;width:100%}' +
    'table.hd{margin-bottom:14px}table.hd td{vertical-align:top;width:50%;padding:0}' +
    'table.hd .to{padding-left:18px}' +
    'table.job{width:auto;margin:0 0 14px}table.job th{text-align:left;padding:1px 14px 1px 0;font-weight:600;color:#444}' +
    'table.job td{padding:1px 0}' +
    'table.rep th,table.rep td{border:1px solid #999;padding:3px 5px;font-size:10.5px;vertical-align:top}' +
    'table.rep th{background:#eee;text-align:left}' +
    'p.note{margin:0 0 14px;color:#333}' +
    '.sign{margin-top:34px}.sign .line{border-top:1px solid #333;width:58mm;margin-bottom:3px}' +
    '.foot{margin-top:20px;color:#666;font-size:10px}' +
    '@media print{body{margin:0}.noprint{display:none}}' +
    '</style>' +
    '<h1>' + esc(nrm.reportTitle) + '</h1>' +
    repHeadHtml() +
    repTableHtml(tpl) +
    repSignHtml() +
    '<p class="foot">' + esc(tpl.name) + (tpl.builtin ? ' · not an official form of any authority' : '') +
    ' · VTA Field ' + esc(typeof APP_VERSION === 'string' ? APP_VERSION : '') + '</p>';
}
/* The same thing as a Word file. */
function repDocx(tpl) {
  tpl = tpl || tplCurrent();
  const nrm = curNorm(), h = rHead();
  const date = h.date || new Date().toISOString().slice(0, 10);
  const blocks = [{ h: 1, t: nrm.reportTitle }];
  if (h.office || h.client)
    blocks.push({ table: [[h.office || '', h.client || '']], sz: 10 });
  const job = [];
  if (h.object) job.push([T('Property'), h.object]);
  if (h.job) job.push([T('Job no.'), h.job]);
  job.push([T('Date'), date]);
  job.push([T('Standard'), nrm.label + ' · ' + nrm.source]);
  job.push([T('Trees'), String(CAT.features.length)]);
  blocks.push({ table: job, sz: 10 });
  if (h.note) blocks.push({ p: h.note });
  blocks.push({ table: [(tpl.cols || []).map(c => c.head)].concat(repRows(tpl)), head: true, sz: 8 });
  blocks.push({ p: '' });
  blocks.push({ p: '________________________________________' });
  blocks.push({ p: (h.place ? h.place + ', ' : '') + date });
  blocks.push({ p: (h.signer || userName() || '') + (h.role ? ' · ' + h.role : ''), b: true });
  blocks.push({ p: tpl.name + (tpl.builtin ? ' · not an official form of any authority' : ''),
                sz: 8, grey: true });
  return docxBlob(blocks, { landscape: !!tpl.landscape });
}
function repCsv(tpl) {
  tpl = tpl || tplCurrent();
  const q = v => { const s = v == null ? '' : String(v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const rows = [(tpl.cols || []).map(c => c.head)].concat(repRows(tpl));
  return '﻿' + rows.map(r => r.map(q).join(';')).join('\r\n');
}

/* ============================================================================
   THE SCREEN
   ========================================================================= */

function repPaint() {
  repHeadPaint();
  const sel = $('repTpl'); if (!sel) return;
  const cur = prefs().reportTpl || '';
  sel.innerHTML = '';
  const mk = (id, name) => { const o = document.createElement('option'); o.value = id; o.textContent = name;
                             if (id === cur) o.selected = true; sel.appendChild(o); };
  mk('', tplBuiltIn().name);
  tplAll().forEach(t => mk(t.id, t.name));
  const t = tplCurrent();
  const note = $('repTplNote');
  if (note) note.textContent = t.builtin
    ? 'The app\'s own columns. Not anybody\'s official form – read your client\'s blank form in ' +
      'and it will be their columns, in their order, under their headings.'
    : (t.cols || []).length + ' columns · read in ' + (t.made || '').slice(0, 10) +
      ' · ' + (t.cols || []).filter(c => !c.key).length + ' left to fill in by hand';
  const del = $('repDel'); if (del) del.disabled = !!t.builtin;
  repColsPaint();
}
function repColsPaint(edit) {
  const box = $('repCols'); if (!box) return;
  const t = tplCurrent();
  box.innerHTML = '';
  if (!edit) {
    const line = document.createElement('div'); line.className = 'small';
    line.textContent = (t.cols || []).map(c => c.head).join(' · ');
    box.appendChild(line);
    return;
  }
  const fields = repFieldList();
  (t.cols || []).forEach((c, n) => {
    const row = document.createElement('div'); row.className = 'row';
    const lab = document.createElement('label');
    lab.textContent = c.head;
    const sel = document.createElement('select');
    const none = document.createElement('option'); none.value = ''; none.textContent = '— nothing —';
    sel.appendChild(none);
    fields.forEach(f => {
      const o = document.createElement('option'); o.value = f[0];
      o.textContent = f[1] + (REP_EXTRA[f[0]] ? '' : ' · ' + f[0]);
      if (f[0] === c.key) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = () => {
      const list = tplAll(), tt = list.find(x => x.id === t.id);
      if (!tt) return toast('The built-in columns cannot be changed – read a form in first.');
      tt.cols[n].key = sel.value || null;
      tplSave(list); repPaint(); repColsPaint(true);
    };
    if (!c.key) lab.className = 'wa';
    row.appendChild(lab); row.appendChild(sel);
    box.appendChild(row);
  });
  const done = document.createElement('div'); done.className = 'btnrow';
  const b = document.createElement('button'); b.className = 'sm'; b.textContent = 'Done';
  b.onclick = () => repColsPaint(false);
  done.appendChild(b); box.appendChild(done);
}
function repHeadPaint() {
  const box = $('rHeadBox'); if (!box) return;
  const h = rHead();
  box.innerHTML = '';
  RHEAD_FIELDS.forEach(f => {
    const row = document.createElement('div'); row.className = 'row';
    const lab = document.createElement('label'); lab.textContent = T(f[1]);
    const inp = document.createElement(f[2] === 'area' ? 'textarea' : 'input');
    if (f[2] !== 'area') inp.type = 'text';
    else inp.rows = 3;
    inp.value = h[f[0]] || '';
    inp.placeholder = f[0] === 'client' ? 'Grünflächenamt\nMusterstraße 1\n12345 Musterstadt' :
                      f[0] === 'office' ? 'your office\nstreet\npostcode town' : '';
    inp.onchange = () => { rHeadSet(f[0], inp.value.trim()); };
    row.appendChild(lab); row.appendChild(inp);
    box.appendChild(row);
  });
  const row = document.createElement('div'); row.className = 'row';
  const lab = document.createElement('label'); lab.textContent = T('Report date');
  const inp = document.createElement('input'); inp.type = 'date';
  inp.value = h.date || new Date().toISOString().slice(0, 10);
  inp.onchange = () => rHeadSet('date', inp.value);
  row.appendChild(lab); row.appendChild(inp);
  box.appendChild(row);
}

/* ---- reading a blank form in ------------------------------------------- */
function repNewTemplate() {
  const el = document.createElement('div'); el.id = 'tpldlg';
  el.innerHTML =
    '<h3>Read a blank form</h3>' +
    '<p class="small">Paste the headings of your client\'s form – the header row out of ' +
    'Excel, a line of a CSV, or one heading per line. A Word form: select the header row ' +
    'in Word, copy, paste here.</p>' +
    '<textarea id="tplIn" rows="5" placeholder="Lfd. Nr.;Baum-Nr.;Baumart;Stammumfang;Höhe;Schadstufe;Maßnahme;Frist"></textarea>' +
    '<div class="btnrow"><button class="sm" id="tplFile">…or open a file</button>' +
    '<input type="file" id="tplFileIn" accept=".csv,.tsv,.txt,.html,.htm" style="display:none"></div>' +
    '<div class="row"><label>Name for it</label><input type="text" id="tplName" placeholder="e.g. Stadt Musterstadt 2026"></div>' +
    '<div class="row"><label>Landscape</label><input type="checkbox" id="tplLand" checked></div>' +
    '<div id="tplPrev"></div>' +
    '<div class="btnrow"><button class="p" id="tplOk">Read the columns</button>' +
    '<button id="tplX">Cancel</button></div>';
  document.body.appendChild(el);
  const close = () => el.remove();
  el.querySelector('#tplX').onclick = close;
  el.querySelector('#tplFile').onclick = () => el.querySelector('#tplFileIn').click();
  el.querySelector('#tplFileIn').onchange = ev => {
    const f = ev.target.files && ev.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { el.querySelector('#tplIn').value = String(r.result || '').slice(0, 20000); preview(); };
    r.readAsText(f);
    if (!el.querySelector('#tplName').value) el.querySelector('#tplName').value = f.name.replace(/\.[a-z]+$/i, '');
  };
  const preview = () => {
    const heads = tplHeadings(el.querySelector('#tplIn').value);
    const box = el.querySelector('#tplPrev');
    if (!heads.length) { box.innerHTML = ''; return; }
    const guess = tplGuess(heads);
    box.innerHTML = '<div class="small">' + heads.length + ' columns found · ' +
      guess.filter(g => g.key).length + ' recognised</div>' +
      guess.map(g => '<div class="kv"><span>' + esc(g.head) + '</span><span class="' +
        (g.key ? 'ok' : 'wa') + '">' + (g.key ? esc(repLabelOf(g.key)) : 'by hand') +
        '</span></div>').join('');
  };
  el.querySelector('#tplIn').oninput = preview;
  el.querySelector('#tplOk').onclick = () => {
    const heads = tplHeadings(el.querySelector('#tplIn').value);
    if (!heads.length) return toast('Nothing to read – paste the headings first.');
    const t = { id: 'tpl' + Date.now().toString(36), made: new Date().toISOString(),
                name: (el.querySelector('#tplName').value || '').trim() || ('Form of ' + new Date().toISOString().slice(0, 10)),
                landscape: el.querySelector('#tplLand').checked,
                cols: tplGuess(heads).map(g => ({ head: g.head, key: g.key })) };
    const list = tplAll(); list.push(t); tplSave(list);
    setPref('reportTpl', t.id);
    close();
    repPaint(); repColsPaint(true);
    const open = t.cols.filter(c => !c.key).length;
    toast(t.cols.length + ' columns read' + (open ? ' · ' + open + ' need a field' : ' · all recognised') + '.');
  };
}
function repLabelOf(key) {
  if (REP_EXTRA[key]) return REP_EXTRA[key];
  return fieldDef(key)[1];
}

function wireReports() {
  if (!$('repTpl')) return;
  $('repTpl').onchange = () => { setPref('reportTpl', $('repTpl').value); repPaint(); };
  $('repNew').onclick = repNewTemplate;
  $('repEdit').onclick = () => {
    if (tplCurrent().builtin)
      return toast('These are the app\'s own columns – read a form in to get your own.');
    repColsPaint(true);
  };
  $('repDel').onclick = () => {
    const t = tplCurrent(); if (t.builtin) return;
    if (!confirm('Delete the template “' + t.name + '”?')) return;
    tplSave(tplAll().filter(x => x.id !== t.id));
    setPref('reportTpl', '');
    repPaint(); toast('Deleted.');
  };
  $('repOutHtml').onclick = () => {
    if (!CAT.features.length) return toast('No trees to report on yet.');
    const w = window.open('', '_blank');
    if (!w) return toast('The browser blocked the new tab.');
    w.document.write(repHtml()); w.document.close();
  };
  $('repOutDocx').onclick = () => {
    if (!CAT.features.length) return toast('No trees to report on yet.');
    const t = tplCurrent();
    dl(repName(t) + '.docx', repDocx(t));
    markExported();
  };
  $('repOutCsv').onclick = () => {
    if (!CAT.features.length) return toast('No trees to report on yet.');
    const t = tplCurrent();
    dl(repName(t) + '.csv', repCsv(t), 'text/csv;charset=utf-8');
    markExported();
  };
  repPaint();
}
function repName(t) {
  const h = rHead();
  const bits = [h.job || '', h.object || 'report', (h.date || new Date().toISOString().slice(0, 10))];
  return bits.filter(Boolean).join('_').replace(/[^\w.-]+/g, '_').slice(0, 60);
}
