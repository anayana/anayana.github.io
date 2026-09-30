/* ============================================================================
   THE DRAWINGS

   A schematic in this app is a line drawing on paper, in the idiom a textbook
   of tree mechanics uses: one ink weight for the tree, a lighter one for
   hatching, one accent for the finding, and a section beside the tree whenever
   the thing that matters is inside the wood. Force is drawn as an arrow, a
   lever as the beam it is, decay as a hatched core with the sound wall left
   white. That is the point of a drawing over a photograph: it shows why the
   tree is in trouble, not merely that it is.

   These are drawn here, from the mechanics. Claus Mattheck's own figures are
   his work and are not copied, traced or adapted - what is taken from him is
   the teaching habit that every finding gets a section and every load gets an
   arrow, which belongs to everybody.

   No words are drawn. The app is bilingual and a label would have to be
   translated inside the picture; the only letters used are t and R, which are
   the same in both languages and are what the residual wall is called.

   Everything lives in a 0..100 by 0..100 box. Ground is at y = 86.
   ========================================================================= */

const DINK   = '#2b2621';   /* the pen */
const DSOFT  = '#8d8578';   /* hatching, ground, anything secondary */
const DPAPER = '#f4eee2';
const DACC   = '#a83f2a';   /* the finding, and nothing else */
const DGND   = 86;

let dUid = 0;
const uid = p => p + (++dUid);

/* ---- the pen ----------------------------------------------------------- */
function ln(d, w, col) {
  return '<path d="' + d + '" fill="none" stroke="' + (col || DINK) + '" stroke-width="' +
         (w || 1.1) + '" stroke-linecap="round" stroke-linejoin="round"/>';
}
function fill(d, col, w, edge) {
  return '<path d="' + d + '" fill="' + col + '" stroke="' + (edge || 'none') +
         '" stroke-width="' + (w || 0) + '"/>';
}
function txt(x, y, s, size, col) {
  return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 5) + '" fill="' +
         (col || DINK) + '" font-family="Georgia,serif" font-style="italic" ' +
         'text-anchor="middle">' + s + '</text>';
}

/* an arrow that means a force: a shaft and a solid head */
function arrow(x1, y1, x2, y2, w, col) {
  const a = Math.atan2(y2 - y1, x2 - x1), h = 3.4 * (w || 1);
  const bx = x2 - Math.cos(a) * h, by = y2 - Math.sin(a) * h;
  const p = (dx, dy) => (bx + Math.cos(a + dx) * dy) + ' ' + (by + Math.sin(a + dx) * dy);
  return ln('M' + x1 + ' ' + y1 + ' L' + bx + ' ' + by, 1.2 * (w || 1), col || DINK) +
         fill('M' + x2 + ' ' + y2 + ' L' + p(Math.PI / 2, h * 0.42) + ' L' +
              p(-Math.PI / 2, h * 0.42) + ' Z', col || DINK);
}

/* parallel strokes inside any shape - asphalt, a trench, rotten wood */
function hatched(d, step, ang, col, back) {
  const id = uid('h');
  let g = '<clipPath id="' + id + '"><path d="' + d + '"/></clipPath>' +
          (back ? fill(d, back) : '') + '<g clip-path="url(#' + id + ')">';
  const s = step || 3.2, t = (ang == null ? -45 : ang) * Math.PI / 180;
  const dx = Math.cos(t) * 160, dy = Math.sin(t) * 160;
  for (let k = -160; k < 160; k += s) {
    const ox = -Math.sin(t) * k, oy = Math.cos(t) * k;
    g += ln('M' + (50 + ox - dx / 2) + ' ' + (50 + oy - dy / 2) + ' L' +
            (50 + ox + dx / 2) + ' ' + (50 + oy + dy / 2), 0.5, col || DSOFT);
  }
  return g + '</g>' + ln(d, 0.8, col || DSOFT);
}

/* ---- the ground -------------------------------------------------------- */
function ground(y, x0, x1) {
  y = y == null ? DGND : y; x0 = x0 == null ? 4 : x0; x1 = x1 == null ? 96 : x1;
  let s = ln('M' + x0 + ' ' + y + ' L' + x1 + ' ' + y, 1.1);
  for (let x = x0 + 1; x < x1; x += 4.5) s += ln('M' + x + ' ' + y + ' L' + (x - 2.6) + ' ' + (y + 2.8), 0.6, DSOFT);
  return s;
}

/* ---- the tree ---------------------------------------------------------- */
/* A stem that is thicker at the bottom and flares into the ground, because
   that is the shape the load makes. lean tips the whole thing about its base. */
function stem(o) {
  o = o || {};
  const b = o.base == null ? DGND : o.base, top = o.top == null ? 40 : o.top;
  const hw = o.hw == null ? 6.2 : o.hw, tw = o.tw == null ? 4.2 : o.tw, cx = o.cx == null ? 50 : o.cx;
  const fl = o.flare == null ? 7 : o.flare;
  const L = 'M' + (cx - hw - fl) + ' ' + b +
            ' C' + (cx - hw - 1.5) + ' ' + (b - 4) + ' ' + (cx - hw) + ' ' + (b - 8) + ' ' +
            (cx - hw + 0.4) + ' ' + (b - 12) +
            ' L' + (cx - tw) + ' ' + top;
  const R = 'M' + (cx + hw + fl) + ' ' + b +
            ' C' + (cx + hw + 1.5) + ' ' + (b - 4) + ' ' + (cx + hw) + ' ' + (b - 8) + ' ' +
            (cx + hw - 0.4) + ' ' + (b - 12) +
            ' L' + (cx + tw) + ' ' + top;
  return ln(L) + ln(R);
}

/* a crown as a run of lobes - loose, closed, never a circle */
function crown(cx, cy, rx, ry, n, seed) {
  n = n || 13; let d = '', s = seed || 1;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * 2 * i / n - Math.PI / 2;
    const r = 0.86 + rnd() * 0.3;
    const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
    if (!i) d = 'M' + x + ' ' + y;
    else {
      const am = a - Math.PI / n, rm = 1.12;
      d += ' Q' + (cx + Math.cos(am) * rx * rm) + ' ' + (cy + Math.sin(am) * ry * rm) +
           ' ' + x + ' ' + y;
    }
  }
  return ln(d + ' Z', 1);
}

/* the limbs that hold that crown up */
function limbs(cx, top, spread, up) {
  return ln('M' + cx + ' ' + (top + 6) + ' C' + (cx - 3) + ' ' + (top - 2) + ' ' +
            (cx - spread * 0.7) + ' ' + (top - up * 0.5) + ' ' + (cx - spread) + ' ' + (top - up), 1.1) +
         ln('M' + cx + ' ' + (top + 8) + ' C' + (cx + 3) + ' ' + (top) + ' ' +
            (cx + spread * 0.7) + ' ' + (top - up * 0.4) + ' ' + (cx + spread) + ' ' + (top - up * 0.8), 1.1) +
         ln('M' + cx + ' ' + (top + 4) + ' L' + (cx + 1) + ' ' + (top - up * 1.1), 1.1);
}

function broadleaf(o) {
  o = o || {};
  const cx = o.cx == null ? 50 : o.cx;
  return crown(cx, o.cy == null ? 28 : o.cy, o.rx == null ? 24 : o.rx, o.ry == null ? 19 : o.ry,
               13, o.seed || 7) +
         limbs(cx, o.top == null ? 40 : o.top, 15, 14) +
         stem(o);
}
function conifer(o) {
  o = o || {};
  const cx = o.cx == null ? 50 : o.cx, b = o.base == null ? DGND : o.base;
  let s = stem({ cx: cx, base: b, top: o.top == null ? 14 : o.top, hw: 4, tw: 1.2, flare: 5 });
  for (let i = 0; i < 7; i++) {
    const y = 22 + i * 8.5, w = 5 + i * 3.6;
    s += ln('M' + (cx - 1) + ' ' + y + ' L' + (cx - w) + ' ' + (y + 7) +
            ' M' + (cx + 1) + ' ' + y + ' L' + (cx + w) + ' ' + (y + 7), 1);
  }
  return s;
}

/* a person, for scale and to say who is standing underneath */
function human(x, yb, h) {
  h = h || 11;
  return ln('M' + x + ' ' + (yb - h * 0.62) + ' L' + x + ' ' + (yb - h * 0.28), 1) +
         '<circle cx="' + x + '" cy="' + (yb - h * 0.78) + '" r="' + (h * 0.14) +
         '" fill="none" stroke="' + DINK + '" stroke-width="1"/>' +
         ln('M' + (x - h * 0.17) + ' ' + (yb - h * 0.5) + ' L' + (x + h * 0.17) + ' ' + (yb - h * 0.46), 1) +
         ln('M' + x + ' ' + (yb - h * 0.28) + ' L' + (x - h * 0.15) + ' ' + yb +
            ' M' + x + ' ' + (yb - h * 0.28) + ' L' + (x + h * 0.15) + ' ' + yb, 1);
}

/* ---- the section, which is where tree inspection actually happens -------
   A stem seen from above: the sound wall left white, the decayed core
   hatched, and the wall thickness called t against the radius R. open is the
   part of the circumference that is missing altogether, in degrees. */
function section(cx, cy, r, o) {
  o = o || {};
  const wall = o.t == null ? r * 0.35 : o.t;
  const open = o.open || 0, a0 = (o.at == null ? 90 : o.at) * Math.PI / 180;
  let s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + DPAPER +
          '" stroke="' + DINK + '" stroke-width="1.1"/>';
  if (o.rot !== false) {
    const ri = r - wall;
    s += hatched('M' + (cx - ri) + ' ' + cy + ' a' + ri + ' ' + ri + ' 0 1 0 ' + (ri * 2) + ' 0' +
                 ' a' + ri + ' ' + ri + ' 0 1 0 ' + (-ri * 2) + ' 0 Z', 2.6, -45, DSOFT);
  }
  if (open > 0) {   /* a hole in the wall: the paper shows through */
    const h = open * Math.PI / 360;
    const x1 = cx + Math.cos(a0 - h) * (r + 0.6), y1 = cy + Math.sin(a0 - h) * (r + 0.6);
    const x2 = cx + Math.cos(a0 + h) * (r + 0.6), y2 = cy + Math.sin(a0 + h) * (r + 0.6);
    s += fill('M' + cx + ' ' + cy + ' L' + x1 + ' ' + y1 + ' A' + (r + 0.6) + ' ' + (r + 0.6) +
              ' 0 ' + (open > 180 ? 1 : 0) + ' 1 ' + x2 + ' ' + y2 + ' Z', DPAPER) +
         ln('M' + x1 + ' ' + y1 + ' L' + cx + ' ' + cy + ' L' + x2 + ' ' + y2, 1.1, DACC);
  }
  if (o.dim !== false) {   /* t across the wall, R across the stem */
    const ax = cx, ay = cy - r;
    s += arrow(ax, ay - 5.5, ax, ay, 0.62) + arrow(ax, ay + wall + 5.5, ax, ay + wall, 0.62) +
         txt(ax + 4.6, ay + wall * 0.5 + 1.6, 't', 5.2) +
         ln('M' + cx + ' ' + cy + ' L' + (cx + r) + ' ' + cy, 0.6, DSOFT) +
         txt(cx + r * 0.55, cy - 1.6, 'R', 5.2, DSOFT);
  }
  return s;
}

/* a half shell: what is left of a tube once it is split down its length */
function halfShell(cx, cy, r, turn) {
  const t = (turn || 0) * Math.PI / 180;
  const p = (a, rr) => (cx + Math.cos(a + t) * rr) + ' ' + (cy + Math.sin(a + t) * rr);
  const ri = r * 0.72;
  return ln('M' + p(-Math.PI / 2, r) + ' A' + r + ' ' + r + ' 0 0 1 ' + p(Math.PI / 2, r) +
            ' L' + p(Math.PI / 2, ri) + ' A' + ri + ' ' + ri + ' 0 0 0 ' + p(-Math.PI / 2, ri) +
            ' Z', 1.1);
}
/* an arrow bent round a circle: torsion */
function twist(cx, cy, r, a0, a1) {
  const A = a0 * Math.PI / 180, B = a1 * Math.PI / 180;
  const x1 = cx + Math.cos(A) * r, y1 = cy + Math.sin(A) * r;
  const x2 = cx + Math.cos(B) * r, y2 = cy + Math.sin(B) * r;
  const tip = B + 0.14;
  return ln('M' + x1 + ' ' + y1 + ' A' + r + ' ' + r + ' 0 0 1 ' + x2 + ' ' + y2, 1, DSOFT) +
         arrow(x2, y2, cx + Math.cos(tip) * r, cy + Math.sin(tip) * r, 0.75, DSOFT);
}

/* ---- one figure per case ------------------------------------------------
   Each says something a photograph cannot: where the load goes, what the
   section looks like, how long the lever is. The finding is the only thing in
   the accent colour, so it can be found without being labelled. */
const CASE_FIG = {

  /* the reference tree: even crown, closed bark, flares all round, and the
     load running straight down through sound wood */
  'sound-tree': () =>
    broadleaf({ cx: 50, cy: 30, rx: 23, ry: 18, top: 42 }) +
    ln('M46.8 46 C45.6 60 44 72 41 84', 0.7, DSOFT) +
    ln('M53.2 46 C54.4 60 56 72 59 84', 0.7, DSOFT) +
    ln('M50 46 L50 84', 0.7, DSOFT) +
    arrow(50, 10, 50, 18, 0.8, DSOFT) +
    ground(),

  /* a rib is the tree's own answer to a hollow: it lays wood on exactly where
     the bending is, and the section shows what wall it has managed to keep */
  ribbing: () =>
    crown(34, 26, 17, 14, 13, 7) + limbs(34, 44, 12, 12) +
    ln('M40.2 86 C40.6 82 40.4 78 40 74 L39.4 56 L38.2 44', 1.1) +
    ln('M29.8 44 L28.8 57', 1.1) +
    ln('M28.8 57 C24.6 62 23.8 68 26.2 74 C27.4 78 27.8 82 27.6 86', 1.9, DACC) +
    ln('M30.4 58 C27 63 26.4 68 28.4 74 C29.4 78 29.6 82 29.4 86', 0.8, DACC) +
    ln('M41 86 C45.6 84.6 48.6 84 52 83.6 M26.8 86 C22.4 84.6 19.4 84 16 83.6', 1.1) +
    arrow(12, 60, 20.6, 65, 0.9) +
    '<ellipse cx="74" cy="30" rx="15.5" ry="12.5" fill="' + DPAPER + '" stroke="' + DINK +
      '" stroke-width="1.1"/>' +
    hatched('M68.6 31 a9.4 8 0 1 0 18.8 0 a9.4 8 0 1 0 -18.8 0 Z', 2.6, -45, DSOFT) +
    ln('M59.2 35 A15.5 12.5 0 0 1 64.6 19.4', 2.4, DACC) +
    arrow(52, 40, 59, 34, 0.7) +
    ground(),

  'cavity-base': () =>
    crown(34, 26, 17, 14, 13, 3) + limbs(34, 44, 12, 12) + stem({ cx: 34, top: 44 }) +
    hatched('M30 86 C27 79.6 27.4 73.4 30.6 69.4 C34.2 69.6 37 74 37 80.4 C37 83 36.4 85 35.6 86 Z',
            1.5, -45, DINK, DPAPER) +
    ln('M30 86 C27 79.6 27.4 73.4 30.6 69.4 C34.2 69.6 37 74 37 80.4 C37 83 36.4 85 35.6 86', 1.5, DACC) +
    ln('M28 86 C25 79.4 25.6 72.6 29.4 67.8', 1.6) +
    ln('M39.2 86 C39.6 79.4 38.2 73 34.2 68.2', 1.6) +
    section(74, 58, 14, { t: 4.2, open: 120, at: 250 }) +
    ground(),

  'soil-heave': () =>
    arrow(2, 20, 20, 24, 1.1) + arrow(4, 31, 20, 34, 0.85) + arrow(6, 42, 20, 44, 0.7) +
    '<g transform="rotate(10 56 86)">' +
      broadleaf({ cx: 56, cy: 30, rx: 20, ry: 16, top: 42 }) + '</g>' +
    ground(86, 4, 18) +
    ln('M18 86 C23 74.6 33 71.4 44 75.4', 2.1, DACC) +
    ln('M24.6 77.4 L23 86.6 M30.6 73.6 L30 83 M36.6 73 L37.6 81.4 M41.4 75 L43 81', 1.1, DACC) +
    ln('M66 82 C74 86.6 80 90 84 90.6 L96 90.6', 1.3) +
    ln('M68 87.4 C76 91 84 92.6 94 93', 0.7, DSOFT) +
    '<g stroke-dasharray="3 2.4">' +
      ln('M20 87 C30 99.4 74 99.4 86 89.4', 1, DSOFT) + '</g>' +
    arrow(88, 78, 84, 86, 0.8, DSOFT),

  'root-cut': () => {
    let s = '<g stroke-dasharray="3 2.6">' +
      '<circle cx="42" cy="50" r="32" fill="none" stroke="' + DSOFT + '" stroke-width="0.9"/></g>';
    for (let i = 0; i < 12; i++) {
      const a = Math.PI * 2 * i / 12 + 0.26;
      const x = 42 + Math.cos(a) * 31, y = 50 + Math.sin(a) * 31;
      const cut = x > 68;
      const k = cut ? (68 - 42) / (x - 42) : 1;
      s += ln('M' + (42 + Math.cos(a) * 6.6) + ' ' + (50 + Math.sin(a) * 6.6) +
              ' Q' + (42 + Math.cos(a + 0.34) * 19 * k) + ' ' + (50 + Math.sin(a + 0.34) * 19 * k) +
              ' ' + (42 + (x - 42) * k) + ' ' + (50 + (y - 50) * k), cut ? 1.4 : 1,
              cut ? DACC : DINK);
    }
    return s +
      '<circle cx="42" cy="50" r="6.8" fill="' + DPAPER + '" stroke="' + DINK + '" stroke-width="1.3"/>' +
      hatched('M69 8 L82 8 L82 92 L69 92 Z', 3, -45, DSOFT) +
      ln('M69 8 L69 92', 1.5, DACC) +
      arrow(97, 50, 88, 50, 1) + arrow(97, 34, 88, 34, 0.75) + arrow(97, 66, 88, 66, 0.75);
  },

  /* one closed tube carries; two half shells slide past each other */
  'crack-long': () =>
    crown(32, 26, 16, 13, 13, 5) + limbs(32, 44, 11, 12) + stem({ cx: 32, top: 44 }) +
    ln('M31 82 C30 70 31.4 58 30.6 46', 1.7, DACC) +
    ln('M33.6 80 C32.6 68 34 58 33.2 47', 0.9, DACC) +
    '<circle cx="76" cy="24" r="11" fill="' + DPAPER + '" stroke="' + DINK + '" stroke-width="1.1"/>' +
    '<circle cx="76" cy="24" r="7.4" fill="none" stroke="' + DINK + '" stroke-width="0.7"/>' +
    twist(76, 24, 14.6, -150, -30) +
    halfShell(72.4, 62, 11, 180) + halfShell(79.6, 65, 11, 0) +
    ln('M76 50.6 L76 57 M76 70 L76 76.4', 1.7, DACC) +
    arrow(68, 76, 71.6, 80, 0.7, DSOFT) + arrow(88, 51, 84.4, 47, 0.7, DSOFT) +
    ground(),

  'included-bark': () =>
    crown(22, 24, 13, 11, 11, 5) + crown(50, 22, 13, 11, 11, 9) +
    ln('M30 86 C31.6 76 33.4 66 35 58 L25 34', 1.2) +
    ln('M39 56 L31 34', 1.2) +
    ln('M46 86 C44.4 76 42.6 66 41 58 L50 32', 1.2) +
    ln('M37 56 L45 32', 1.2) +
    ln('M29 86 C24.4 84.4 21.4 84 18 83.6 M47 86 C51.6 84.4 54.6 84 58 83.6', 1.2) +
    ln('M38 32 L38 56', 1.8, DACC) +
    '<circle cx="70" cy="34" r="7.4" fill="' + DPAPER + '" stroke="' + DINK + '" stroke-width="1.1"/>' +
    '<circle cx="85" cy="34" r="7.4" fill="' + DPAPER + '" stroke="' + DINK + '" stroke-width="1.1"/>' +
    ln('M77.5 26.4 L77.5 41.6', 1.8, DACC) +
    arrow(64, 48, 69, 42, 0.7, DSOFT) + arrow(91, 48, 86, 42, 0.7, DSOFT) +
    ground(),

  /* dead limbs in the top of the crown, and a path underneath */
  deadwood: () =>
    crown(50, 30, 22, 16, 13, 11) + limbs(50, 44, 15, 13) + stem({ top: 44 }) +
    ln('M47 38 L40 26 L31 14 M40 26 L35 15 M35 20 L26 12', 1.2, DACC) +
    ln('M53 34 L64 20 L73 12 M64 20 L67 10', 1.2, DACC) +
    ln('M51 40 L62 33 L74 30 M62 33 L65 26', 1.2, DACC) +
    hatched('M4 88 L96 88 L96 95 L4 95 Z', 4, -45, DSOFT) +
    ground() + human(76, 88, 13),

  topping: () => {
    let s = stem({ cx: 32, top: 50, hw: 7, tw: 6 }) +
      hatched('M26.4 44 C26 48 26 52 26.4 56 L37.6 56 C38 52 38 48 37.6 44 Z', 2.2, -45, DSOFT) +
      '<ellipse cx="32" cy="43.4" rx="6" ry="2.4" fill="' + DPAPER + '" stroke="' + DACC +
      '" stroke-width="1.8"/>';
    for (let i = 0; i < 11; i++) {
      const x = 26.8 + i * 1.04, sp = (i - 5) * 2.8;
      s += ln('M' + x + ' 43 C' + (x + sp * 0.4) + ' 35 ' + (x + sp * 0.85) + ' 28 ' +
              (x + sp * 1.35) + ' 19', 0.9);
    }
    return s +
      section(74, 54, 14, { t: 3, dim: false }) +
      ln('M70.6 40.6 C68.6 34 67.4 29 67.4 23 M77.4 40.6 C79.4 34.6 80.6 30 81 25', 1.1) +
      ln('M63 43 A14 14 0 0 1 85 43', 1.8, DACC) +
      arrow(52, 34, 60, 42, 0.7, DSOFT) +
      ground();
  },

  compaction: () =>
    crown(38, 30, 15, 13, 15, 23) + limbs(38, 46, 11, 12) +
    stem({ cx: 38, top: 46, hw: 5.4, tw: 4 }) +
    ln('M27 25 L25 21 M32 18 L31 14 M45 20 L47 16 M50 28 L54 26 M42 16 L43 12', 0.9, DSOFT) +
    hatched('M4 86 L22 86 L22 92 L4 92 Z', 3, -45, DSOFT) +
    hatched('M54 86 L96 86 L96 92 L54 92 Z', 3, -45, DSOFT) +
    hatched('M4 95.5 L96 95.5 L96 100 L4 100 Z', 3, -45, DSOFT) +
    ln('M4 86 L22 86 M54 86 L96 86 M4 95.5 L96 95.5', 1.6, DACC) +
    ground(86, 22, 54) +
    '<g stroke-dasharray="3 2.4">' +
      ln('M25 87.4 C29.6 91.4 33.6 92.6 38 92.6 C42.4 92.6 46.4 91.4 51 87.4', 1.2, DACC) + '</g>',

  'hazard-beam': () =>
    crown(20, 28, 14, 12, 11, 17) + limbs(20, 44, 9, 11) +
    stem({ cx: 20, top: 44, hw: 5.4, tw: 4 }) +
    ln('M23 44 C40 40.6 62 39.6 92 39.4', 2.6, DACC) +
    ln('M44 40.6 C48 36.6 52 35 56 34.6 M64 39.8 C68 35.6 72 34.4 76 34', 1, DACC) +
    ln('M84 39.6 C87 36.6 90 35.6 93 35.4', 1, DACC) +
    arrow(92, 26, 92, 37, 1) +
    hatched('M24 47 L92 42 L92 44.6 L24 62 Z', 3, -45, DSOFT) +
    fill('M58 84 L63 76 L80 76 L86 84 Z', DPAPER, 1.1, DINK) +
    ln('M66 76 L66 84', 0.7, DSOFT) +
    '<circle cx="65" cy="84" r="2.8" fill="none" stroke="' + DINK + '" stroke-width="1.1"/>' +
    '<circle cx="80" cy="84" r="2.8" fill="none" stroke="' + DINK + '" stroke-width="1.1"/>' +
    ground()
};
