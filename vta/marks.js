/* ============================================================================
   WHERE THE DAMAGE WAS

   A finding recorded as "cavity, stem" sends next year's inspector round the
   tree with a torch looking for last year's cavity. The tree knows where it
   is; the record should too.

   So a finding can be pinned to the trunk. Standing at the tree in AR, aim at
   the spot and tap: the app already knows where the stem is and which way is
   north, so the spot becomes two numbers that mean something to a person -
   how high up, and which side. A metre forty up, north-east. Those two
   numbers are written on paper and read out loud as easily as they are drawn
   in the camera, which matters, because the camera is the part that will not
   always work.

   Next year the same marks are drawn back onto the trunk in AR, with their
   age, and each can be answered in one tap: still there, or gone. That is the
   whole job - not finding the cavity again, but saying whether it has grown.

   The position is stored as height above the stem base, compass bearing round
   the stem, and distance out from the stem axis, which is nought on the trunk
   and two metres out on a branch. Bearings are true, from the session's own
   north, not from the phone's compass: the session knows it to a fraction of
   a degree once it is aligned, and the compass does not.
   ========================================================================= */

const MARK_KINDS = [
  ['cavity',   'Cavity, open decay',        '#e2704a'],
  ['crack',    'Crack',                     '#e2704a'],
  ['fungus',   'Fruiting body',             '#d86cc0'],
  ['wound',    'Bark wound, cambium damage', '#e8c15a'],
  ['bulge',    'Rib, bulge, reaction wood', '#e8c15a'],
  ['deadwood', 'Deadwood, hanger',          '#e8c15a'],
  ['fork',     'Fork with included bark',   '#e8c15a'],
  ['other',    'Something else',            '#8fd6a8']
];
function markKind(k) { return MARK_KINDS.find(x => x[0] === k) || MARK_KINDS[MARK_KINDS.length - 1]; }

function markList(i) {
  const m = props(i).marks;
  return Array.isArray(m) ? m : [];
}
function markSave(i, list) {
  setEdit(i, { marks: list });
  if (typeof layoutMarks === 'function') layoutMarks();
}
function markAdd(i, m) {
  const list = markList(i).slice();
  m.id = 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e3).toString(36);
  m.at = new Date().toISOString();
  m.by = (typeof userName === 'function' && userName()) || (prefs().inspector || '');
  list.push(m);
  markSave(i, list);
  auditAdd({ what: 'marked', tree: tid(i), detail: markKind(m.kind)[1] + ' · ' + markWhere(m) });
  return m;
}
function markDel(i, id) {
  markSave(i, markList(i).filter(m => m.id !== id));
  auditAdd({ what: 'mark removed', tree: tid(i), detail: id });
}
/* Checked and still there, or checked and gone. Both are findings; the
   difference is the whole point of coming back. */
function markSeen(i, id, still) {
  const list = markList(i).map(m => {
    if (m.id !== id) return m;
    const o = Object.assign({}, m);
    o.seen = (o.seen || []).concat([{ at: new Date().toISOString(), still: !!still }]);
    if (!still) o.gone = new Date().toISOString();
    else delete o.gone;
    return o;
  });
  markSave(i, list);
  auditAdd({ what: still ? 'mark confirmed' : 'mark gone', tree: tid(i), detail: id });
}
function markAge(m) {
  const t = Date.parse(m.at); if (!isFinite(t)) return '';
  const d = Math.round((Date.now() - t) / 86400000);
  if (d < 31) return d + ' d';
  if (d < 365) return Math.round(d / 30) + ' mo';
  return (d / 365).toFixed(d < 730 ? 1 : 0) + ' a';
}
/* The two numbers, in words, for paper and for the voice. */
function markWhere(m) {
  const h = (+m.h || 0).toFixed(1) + ' m up';
  const side = (typeof bearWord === 'function') ? bearWord(+m.az || 0) : Math.round(+m.az || 0) + '°';
  const out = h + ', ' + side + ' side';
  return (+m.r > 0.4) ? out + ', ' + (+m.r).toFixed(1) + ' m out' : out;
}

/* ---- where it is, in the session --------------------------------------
   The tree's own group is positioned in scene coordinates and not rotated,
   so a mark is an offset inside it: the bearing turned back into the scene's
   own frame, and the height straight up. */
function markOffset(m) {
  const north = (typeof sceneNorth === 'function') ? sceneNorth() : null;
  if (north == null) return null;          // no north: a bearing cannot be drawn
  const a = THREE.MathUtils.degToRad(((+m.az || 0) + north) % 360);
  const r = Math.max(0.05, +m.r || 0.25);
  return { x: Math.sin(a) * r, y: Math.max(0.05, +m.h || 0), z: -Math.cos(a) * r };
}

let markObjs = [];
/* One ring per mark, hung on the tree it belongs to, in the colour of what it
   is, hollow once it has been reported gone. */
function layoutMarks() {
  if (typeof world === 'undefined' || !world) return;
  markObjs.forEach(o => {
    if (o.parent) o.parent.remove(o);
    if (o.geometry) o.geometry.dispose();
    if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
  });
  markObjs = [];
  if (!markShow()) return;
  CAT.features.forEach((f, i) => {
    const g = markerOf.get(i); if (!g) return;
    markList(i).forEach(m => {
      const off = markOffset(m); if (!off) return;
      const col = new THREE.Color(markKind(m.kind)[2]);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.025, 8, 20),
        new THREE.MeshBasicMaterial({ color: col, depthTest: false, transparent: true,
                                      opacity: m.gone ? 0.35 : 1 }));
      ring.position.set(off.x, off.y, off.z);
      ring.renderOrder = 14;
      ring.userData.mark = { tree: i, id: m.id };
      g.add(ring); markObjs.push(ring);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: markLabel(m), depthTest: false, transparent: true }));
      sp.position.set(off.x, off.y + 0.3, off.z);
      sp.scale.set(0.9, 0.28, 1);
      sp.renderOrder = 15;
      g.add(sp); markObjs.push(sp);
    });
  });
}
function markLabel(m) {
  const c = document.createElement('canvas'); c.width = 360; c.height = 112;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(10,16,13,.82)'; x.strokeStyle = markKind(m.kind)[2]; x.lineWidth = 4;
  x.beginPath(); x.roundRect(4, 4, 352, 104, 16); x.fill(); x.stroke();
  x.fillStyle = markKind(m.kind)[2]; x.font = '600 34px system-ui,sans-serif';
  x.fillText(markKind(m.kind)[1].split(',')[0], 18, 46);
  x.fillStyle = '#cfe0d5'; x.font = '26px system-ui,sans-serif';
  x.fillText(markAge(m) + (m.gone ? ' · gone' : '') + ' · ' + (+m.h || 0).toFixed(1) + ' m', 18, 88);
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
}
function markShow() { return prefs().marksOff !== true; }

/* ---- the list on the tree's own page ---------------------------------- */
function markBlock(i) {
  const wrap = document.createElement('div');
  const h = document.createElement('h3'); h.textContent = 'Marked on the trunk'; wrap.appendChild(h);
  const list = markList(i);
  if (!list.length) {
    const p = document.createElement('p'); p.className = 'small';
    p.textContent = 'Nothing pinned yet. In AR, Tools → Mark a defect: aim at the spot and tap, and ' +
      'next year it is drawn back onto the trunk where it was.';
    wrap.appendChild(p); return wrap;
  }
  list.slice().sort((a, b) => (b.h || 0) - (a.h || 0)).forEach(m => {
    const row = document.createElement('div'); row.className = 'markrow' + (m.gone ? ' gone' : '');
    const dot = document.createElement('span'); dot.className = 'dot';
    dot.style.background = markKind(m.kind)[2]; row.appendChild(dot);
    const txt = document.createElement('div'); txt.className = 'm';
    txt.innerHTML = '<b>' + esc(markKind(m.kind)[1]) + '</b>' +
      '<div class="small">' + esc(markWhere(m)) + ' · ' + esc(m.at.slice(0, 10)) +
      (m.gone ? ' · <b>gone ' + esc(m.gone.slice(0, 10)) + '</b>'
              : (m.seen && m.seen.length ? ' · confirmed ' + esc(m.seen[m.seen.length - 1].at.slice(0, 10)) : '')) +
      (m.note ? '<br>' + esc(m.note) : '') + '</div>';
    row.appendChild(txt);
    const act = document.createElement('div'); act.className = 'a';
    if (!m.gone) {
      const s = document.createElement('button'); s.className = 'sm p'; s.textContent = 'Still there';
      s.onclick = () => { markSeen(i, m.id, true); openPanel(i, panelTab); };
      act.appendChild(s);
    }
    const g = document.createElement('button'); g.className = 'sm'; g.textContent = m.gone ? 'Back' : 'Gone';
    /* the button says what it will do: "Gone" records that it is gone, which
       is still = false; "Back" takes that back */
    g.onclick = () => { markSeen(i, m.id, !!m.gone); openPanel(i, panelTab); };
    act.appendChild(g);
    const d = document.createElement('button'); d.className = 'sm x'; d.textContent = '×';
    d.title = 'Remove this mark';
    d.onclick = () => { if (confirm('Remove this mark?')) { markDel(i, m.id); openPanel(i, panelTab); } };
    act.appendChild(d);
    row.appendChild(act);
    wrap.appendChild(row);
  });
  const note = document.createElement('p'); note.className = 'small';
  note.textContent = 'Heights are above the stem base, sides are true bearings round the stem. ' +
    'They are drawn on the trunk in AR and they read the same on paper.';
  wrap.appendChild(note);
  return wrap;
}

/* ---- what the camera should say about the tree in front of it ---------
   The AR view showed a ring on the ground and a number. Everything the
   inspector actually wants to know before touching the tree - how big it was
   last time, what was found, what is due - was three taps away on a page
   that covers the camera. */
function arCardFor(i) {
  const p = props(i), a = assess(p), n = curNorm();
  const num = v => (v == null || v === '' ? null : v);
  const bits = [];
  const put = (lab, val, unit) => { if (val != null && val !== '') bits.push([lab, val + (unit || '')]); };
  put('Ø', num(p.dbh_cm), ' cm');
  if (!num(p.dbh_cm)) put('U', num(p.girth_cm), ' cm');
  put('H', num(p.height_m), ' m');
  put('Krone', num(p.crown_d_m), ' m');
  if (a.tr != null) put('t/R', a.tr.toFixed(2), '');
  put('Vit', num(p.vitality_roloff) != null ? num(p.vitality_roloff) : num(p.vitality_5), '');
  put('Schad', num(p.damage_class) && p.damage_class !== 'none' ? optLabel('damage_class', p.damage_class) : null, '');
  const marks = markList(i), open = marks.filter(m => !m.gone).length;
  return {
    id: p.tag_no ? '№ ' + p.tag_no : tid(i),
    sub: [p.species || '', p.name_en || ''].filter(Boolean).join(' · '),
    lvl: a.lvl, bits: bits,
    last: p.last_inspection || null,
    due: p.next_inspection || null,
    marks: open, marksAll: marks.length,
    why: (a.notes || []).slice(0, 2)
  };
}
function paintArCard(i) {
  const el = document.getElementById('arcard'); if (!el) return;
  if (i == null || !CAT.features[i] || !arCardOn()) { el.style.display = 'none'; return; }
  const c = arCardFor(i);
  el.innerHTML =
    '<div class="hd"><b style="color:' + LVLCOL[c.lvl] + '">' + esc(c.id) + '</b>' +
    '<span class="sp">' + esc(c.sub) + '</span>' +
    '<button class="sm" id="arcX">✕</button></div>' +
    (c.bits.length ? '<div class="kv">' + c.bits.map(b =>
      '<span><i>' + esc(b[0]) + '</i> ' + esc(String(b[1])) + '</span>').join('') + '</div>' : '') +
    (c.marks ? '<div class="mk">' + c.marks + ' marked on the trunk' +
       (c.marksAll > c.marks ? ' · ' + (c.marksAll - c.marks) + ' gone' : '') + '</div>' : '') +
    (c.why.length ? '<div class="wy">' + c.why.map(w => esc(w)).join('<br>') + '</div>' : '') +
    (c.last ? '<div class="dt">last ' + esc(String(c.last).slice(0, 10)) +
       (c.due ? ' · due ' + esc(String(c.due).slice(0, 10)) : '') + '</div>' : '');
  el.style.display = 'block';
  const x = document.getElementById('arcX');
  if (x) x.onclick = () => { setPref('arCard', false); paintArCard(null); };
}
function arCardOn() { return prefs().arCard !== false; }
