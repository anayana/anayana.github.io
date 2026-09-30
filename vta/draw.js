/* ============================================================================
   THE DRAWINGS

   A schematic here is a pen drawing on paper, in the idiom a book of tree
   mechanics uses: the tree as a filled silhouette with its bark drawn in, the
   foliage scalloped rather than outlined as a cloud, one accent colour for the
   finding and nothing else, an arrow wherever a load acts, and a magnified
   circle beside the tree whenever what matters is inside the wood.

   Everything is drawn from a few parts - a trunk that tapers and flares, a
   limb that thins towards its tip, foliage, bark, grass, a section - so a new
   case needs a composition, not a new drawing style. Every part takes a seed
   and its wobble is worked out from that seed, so a figure is drawn the same
   way every time it is asked for.

   These are drawn here, from the mechanics. Claus Mattheck's own figures are
   his work and none is copied, traced or adapted; what is taken from him is
   the teaching habit that every finding gets a section and every load gets an
   arrow, which belongs to everybody.

   No words are drawn. The app is bilingual and a label would have to be
   translated inside the picture; the only letters are t and R, which are the
   same in both languages and are what the residual wall is called.

   Everything lives in a 0..100 by 0..100 box. Ground is at y = 86.
   ========================================================================= */

const DINK   = '#2f2a24';   /* the pen */
const DHAIR  = '#7b7264';   /* bark, veins, anything drawn inside a shape */
const DSOFT  = '#a49a8b';   /* hatching and whatever is only context */
const DPAPER = '#f4eee2';
const DWOOD  = '#e7dcc8';   /* the tone inside a trunk */
const DLEAF  = '#e2dcc9';   /* the tone inside foliage */
const DACC   = '#a4402b';   /* the finding, and nothing else */
const DGND   = 86;

let dUid = 0;
const uid = p => p + (++dUid);
/* one seeded stream per part, so a drawing never changes between two renders */
const nse = seed => { let s = (seed || 1) * 7919 % 2147483647;
  return () => (s = (s * 48271) % 2147483647) / 2147483647; };
const rn = n => Math.round(n * 100) / 100;

/* ---- the pen ----------------------------------------------------------- */
function ln(d, w, col) {
  return '<path d="' + d + '" fill="none" stroke="' + (col || DINK) + '" stroke-width="' +
         (w || 1.1) + '" stroke-linecap="round" stroke-linejoin="round"/>';
}
function sh(d, f, w, col) {   /* a filled shape with an outline: a silhouette */
  return '<path d="' + d + '" fill="' + (f || DPAPER) + '" stroke="' + (col || DINK) +
         '" stroke-width="' + (w == null ? 1.2 : w) + '" stroke-linejoin="round"/>';
}
function txt(x, y, s, size, col) {
  return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 5) + '" fill="' +
         (col || DINK) + '" font-family="Georgia,serif" font-style="italic" ' +
         'text-anchor="middle">' + s + '</text>';
}
/* a run of points turned into a line that bends rather than breaks */
function smooth(p, close) {
  if (p.length < 3) return 'M' + p.map(q => rn(q[0]) + ' ' + rn(q[1])).join(' L');
  let d = 'M' + rn(p[0][0]) + ' ' + rn(p[0][1]);
  for (let i = 1; i < p.length - 1; i++)
    d += ' Q' + rn(p[i][0]) + ' ' + rn(p[i][1]) + ' ' +
         rn((p[i][0] + p[i + 1][0]) / 2) + ' ' + rn((p[i][1] + p[i + 1][1]) / 2);
  const l = p[p.length - 1];
  return d + ' L' + rn(l[0]) + ' ' + rn(l[1]) + (close ? ' Z' : '');
}

/* an arrow that means a force: a shaft and a solid head */
function arrow(x1, y1, x2, y2, w, col) {
  const a = Math.atan2(y2 - y1, x2 - x1), h = 3.6 * (w || 1);
  const bx = x2 - Math.cos(a) * h, by = y2 - Math.sin(a) * h;
  const p = (d, r) => rn(bx + Math.cos(a + d) * r) + ' ' + rn(by + Math.sin(a + d) * r);
  return ln('M' + rn(x1) + ' ' + rn(y1) + ' L' + rn(bx) + ' ' + rn(by), 1.25 * (w || 1), col || DINK) +
         '<path d="M' + rn(x2) + ' ' + rn(y2) + ' L' + p(Math.PI / 2, h * 0.4) + ' L' +
         p(-Math.PI / 2, h * 0.4) + ' Z" fill="' + (col || DINK) + '"/>';
}
/* an arrow bent round a circle: torsion */
function twist(cx, cy, r, a0, a1, col) {
  const A = a0 * Math.PI / 180, B = a1 * Math.PI / 180, t = B + 0.16;
  return ln('M' + rn(cx + Math.cos(A) * r) + ' ' + rn(cy + Math.sin(A) * r) + ' A' + r + ' ' + r +
            ' 0 0 1 ' + rn(cx + Math.cos(B) * r) + ' ' + rn(cy + Math.sin(B) * r), 1, col || DSOFT) +
         arrow(cx + Math.cos(B) * r, cy + Math.sin(B) * r,
               cx + Math.cos(t) * r, cy + Math.sin(t) * r, 0.7, col || DSOFT);
}
/* parallel strokes inside a shape - asphalt, a trench, rotten wood */
function hatched(d, step, ang, col, back) {
  const id = uid('h');
  let g = '<clipPath id="' + id + '"><path d="' + d + '"/></clipPath>' +
          (back ? '<path d="' + d + '" fill="' + back + '"/>' : '') +
          '<g clip-path="url(#' + id + ')">';
  const s = step || 3.2, t = (ang == null ? -45 : ang) * Math.PI / 180;
  const dx = Math.cos(t) * 170, dy = Math.sin(t) * 170;
  for (let k = -170; k < 170; k += s) {
    const ox = -Math.sin(t) * k, oy = Math.cos(t) * k;
    g += ln('M' + rn(50 + ox - dx / 2) + ' ' + rn(50 + oy - dy / 2) + ' L' +
            rn(50 + ox + dx / 2) + ' ' + rn(50 + oy + dy / 2), 0.45, col || DSOFT);
  }
  return g + '</g>' + ln(d, 0.8, col || DSOFT);
}

/* ---- the ground -------------------------------------------------------- */
function ground(y, x0, x1, seed) {
  y = y == null ? DGND : y; x0 = x0 == null ? 3 : x0; x1 = x1 == null ? 97 : x1;
  const rnd = nse(seed || 11);
  const pts = []; for (let x = x0; x <= x1; x += 6) pts.push([x, y + (rnd() - 0.5) * 0.7]);
  pts.push([x1, y]);
  let s = ln(smooth(pts), 1.25);
  for (let x = x0 + 2; x < x1; x += 4.6) {     /* grass, not hatching */
    const h = 1.6 + rnd() * 2.2, t = (rnd() - 0.5) * 2;
    s += ln('M' + rn(x) + ' ' + rn(y) + ' Q' + rn(x + t * 0.4) + ' ' + rn(y - h * 0.6) + ' ' +
            rn(x + t) + ' ' + rn(y - h), 0.55, DSOFT);
  }
  return s;
}

/* ---- the tree ---------------------------------------------------------- */
/* A stem is a silhouette, not two lines: thick at the ground, flaring into it,
   thinning upward, with the bark drawn in afterwards. */
function trunkPath(o) {
  o = o || {};
  const cx = o.cx == null ? 50 : o.cx, base = o.base == null ? DGND : o.base;
  const top = o.top == null ? 42 : o.top;
  const hwB = o.hw == null ? 5.4 : o.hw, hwT = o.tw == null ? 3 : o.tw;
  const flare = o.flare == null ? 6 : o.flare, fH = o.flareH == null ? 13 : o.flareH;
  const bend = o.bend || 0, rnd = nse(o.seed || 3), N = 14;
  const L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, y = base - (base - top) * t;
    let hw = hwB + (hwT - hwB) * Math.pow(t, 0.7);
    hw += flare * Math.pow(Math.max(0, 1 - (base - y) / fH), 2.8);
    const x = cx + bend * Math.pow(t, 1.7), j = (rnd() - 0.5) * 0.45;
    /* a rib is wood laid on one side only, so it swells one outline */
    const swell = k => k ? k.amp * Math.exp(-Math.pow((t - k.at) / k.w, 2)) : 0;
    L.push([x - hw - swell(o.ribL) + j, y]); R.push([x + hw + swell(o.ribR) + j * 0.6, y]);
  }
  return { d: smooth(L) + ' ' + smooth(R.slice().reverse()).replace('M', 'L') + ' Z',
           L: L, R: R, cx: cx, top: top, base: base,
           topHw: hwT, topX: cx + bend };
}
function bark(t, seed, dense) {
  const rnd = nse(seed || 5); let s = '';
  const n = dense || 7;
  for (let k = 0; k < n; k++) {
    const i0 = 1 + Math.floor(rnd() * (t.L.length - 5)), len = 2 + Math.floor(rnd() * 4);
    const f = 0.18 + rnd() * 0.64, p = [];
    for (let i = i0; i < Math.min(t.L.length, i0 + len); i++)
      p.push([t.L[i][0] + (t.R[i][0] - t.L[i][0]) * f + (rnd() - 0.5) * 0.5, t.L[i][1]]);
    if (p.length > 1) s += ln(smooth(p), 0.45, DHAIR);
  }
  return s;
}
function trunk(o) {
  const t = trunkPath(o);
  return { svg: sh(t.d, o && o.fill || DWOOD, (o && o.w) || 1.25) + bark(t, (o && o.seed) || 5,
                   (o && o.bark) || 7), t: t };
}
/* a limb: thick where it leaves the stem, thin at its tip */
function limb(x1, y1, x2, y2, w1, w2, bow, seed, col, edge) {
  const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
  const mx = (x1 + x2) / 2 + nx * (bow || 0), my = (y1 + y2) / 2 + ny * (bow || 0);
  const p = (x, y, w, s) => rn(x + nx * w * s) + ' ' + rn(y + ny * w * s);
  return sh('M' + p(x1, y1, w1, 1) + ' Q' + p(mx, my, (w1 + w2) / 2, 1) + ' ' + p(x2, y2, w2, 1) +
            ' L' + p(x2, y2, w2, -1) + ' Q' + p(mx, my, (w1 + w2) / 2, -1) + ' ' +
            p(x1, y1, w1, -1) + ' Z', col || DWOOD, edge ? 1.5 : 1.05, edge || DINK);
}
/* foliage: a scalloped edge, a light tone inside, and a little shade under it */
function foliage(cx, cy, rx, ry, seed, opts) {
  opts = opts || {};
  const rnd = nse(seed || 7), N = opts.n || 17, pts = [];
  for (let i = 0; i < N; i++) {
    const a = Math.PI * 2 * i / N - Math.PI / 2, r = 0.87 + rnd() * 0.26;
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  const chord = 2 * Math.min(rx, ry) * Math.sin(Math.PI / N);
  let d = 'M' + rn(pts[0][0]) + ' ' + rn(pts[0][1]);
  for (let i = 1; i <= N; i++) {
    const p = pts[i % N], r = chord * (0.62 + rnd() * 0.3);
    d += ' A' + rn(r) + ' ' + rn(r) + ' 0 0 1 ' + rn(p[0]) + ' ' + rn(p[1]);
  }
  let s = sh(d + ' Z', opts.fill || DLEAF, 1.05);
  if (opts.shade !== false) {                 /* a few scallops inside, low down */
    for (let k = 0; k < (opts.thin ? 2 : 5); k++) {
      const a = Math.PI * (0.18 + rnd() * 0.64), r = 0.34 + rnd() * 0.36;
      const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
      const w = chord * (0.5 + rnd() * 0.4);
      s += ln('M' + rn(x - w) + ' ' + rn(y) + ' A' + rn(w) + ' ' + rn(w) + ' 0 0 0 ' +
              rn(x + w) + ' ' + rn(y), 0.5, DHAIR);
    }
  }
  return s;
}

/* a whole broadleaf: foliage behind, stem and limbs in front of it */
function broadleaf(o) {
  o = o || {};
  const cx = o.cx == null ? 50 : o.cx, top = o.top == null ? 46 : o.top;
  const rx = o.rx == null ? 24 : o.rx, ry = o.ry == null ? 19 : o.ry;
  const cy = o.cy == null ? 30 : o.cy, seed = o.seed || 7;
  const t = trunk({ cx: cx, top: top, base: o.base, hw: o.hw, tw: o.tw, flare: o.flare,
                    bend: o.bend, seed: seed, bark: o.bark });
  const tx = t.t.topX, w = t.t.topHw;
  return limb(tx, top + 5, tx - rx * 0.6, cy + ry * 0.5, w * 0.8, 0.7, -rx * 0.1, seed + 1) +
         limb(tx, top + 7, tx + rx * 0.62, cy + ry * 0.42, w * 0.85, 0.7, rx * 0.11, seed + 2) +
         limb(tx, top + 3, tx + rx * 0.1, cy - ry * 0.2, w * 0.7, 0.6, rx * 0.05, seed + 3) +
         t.svg +
         foliage(cx, cy, rx, ry, seed, { thin: o.thin, fill: o.leaf, n: o.n });
}
function conifer(o) {
  o = o || {};
  const cx = o.cx == null ? 50 : o.cx, base = o.base == null ? DGND : o.base;
  const t = trunk({ cx: cx, base: base, top: o.top == null ? 12 : o.top, hw: 4.4, tw: 1,
                    flare: 4.4, seed: o.seed || 9 });
  let s = t.svg;
  const rnd = nse(o.seed || 9);
  for (let i = 0; i < 8; i++) {
    const y = 20 + i * 8, w = 4 + i * 3.4 + rnd() * 1.4;
    s += ln('M' + rn(cx - 1) + ' ' + rn(y) + ' Q' + rn(cx - w * 0.6) + ' ' + rn(y + 2) + ' ' +
            rn(cx - w) + ' ' + rn(y + 7) + ' M' + rn(cx + 1) + ' ' + rn(y) + ' Q' +
            rn(cx + w * 0.6) + ' ' + rn(y + 2) + ' ' + rn(cx + w) + ' ' + rn(y + 7), 0.9);
  }
  return s;
}

/* a person, for scale and to say who is standing underneath */
function human(x, yb, h) {
  h = h || 12;
  return ln('M' + x + ' ' + rn(yb - h * 0.6) + ' L' + x + ' ' + rn(yb - h * 0.3), 1.1) +
         '<circle cx="' + x + '" cy="' + rn(yb - h * 0.76) + '" r="' + rn(h * 0.13) +
         '" fill="' + DPAPER + '" stroke="' + DINK + '" stroke-width="1"/>' +
         ln('M' + rn(x - h * 0.16) + ' ' + rn(yb - h * 0.5) + ' L' + rn(x + h * 0.16) + ' ' +
            rn(yb - h * 0.45), 1) +
         ln('M' + x + ' ' + rn(yb - h * 0.3) + ' L' + rn(x - h * 0.14) + ' ' + yb +
            ' M' + x + ' ' + rn(yb - h * 0.3) + ' L' + rn(x + h * 0.14) + ' ' + yb, 1);
}

/* ---- the magnifier ------------------------------------------------------
   A detail lifted out of the tree and drawn bigger, with a thin double ring
   and a leader back to the place it came from - the habit that makes a
   textbook figure readable. */
function lens(cx, cy, r, inner, from) {
  const id = uid('L');
  let s = '';
  if (from) s += ln('M' + from[0] + ' ' + from[1] + ' L' + rn(cx - r * 0.82) + ' ' +
                    rn(cy + r * 0.5), 0.6, DSOFT) +
                 '<circle cx="' + from[0] + '" cy="' + from[1] + '" r="1.1" fill="' + DSOFT + '"/>';
  return s + '<clipPath id="' + id + '"><circle cx="' + cx + '" cy="' + cy + '" r="' + r +
    '"/></clipPath><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + DPAPER + '"/>' +
    '<g clip-path="url(#' + id + ')">' + inner + '</g>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + DINK +
    '" stroke-width="1.3"/>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + rn(r + 1.4) + '" fill="none" stroke="' +
    DSOFT + '" stroke-width="0.5"/>';
}

/* ---- the section, which is where tree inspection actually happens -------
   A stem seen from above: sound wood left light, the decayed core hatched,
   the wall thickness called t against the radius R. open is the part of the
   circumference missing altogether, in degrees; off moves the core away from
   the middle, which is what a rib or a one-sided wound leaves behind. */
function section(cx, cy, r, o) {
  o = o || {};
  const wall = o.t == null ? r * 0.34 : o.t, off = o.off || 0;
  const open = o.open || 0, a0 = (o.at == null ? 90 : o.at) * Math.PI / 180;
  const ri = r - wall;
  let s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + DWOOD +
          '" stroke="' + DINK + '" stroke-width="1.3"/>' +
          '<circle cx="' + cx + '" cy="' + cy + '" r="' + rn(r - 0.9) + '" fill="none" stroke="' +
          DHAIR + '" stroke-width="0.45"/>';
  if (o.rot !== false)
    s += hatched('M' + rn(cx + off - ri) + ' ' + cy + ' a' + rn(ri) + ' ' + rn(ri) + ' 0 1 0 ' +
                 rn(ri * 2) + ' 0 a' + rn(ri) + ' ' + rn(ri) + ' 0 1 0 ' + rn(-ri * 2) + ' 0 Z',
                 2.4, -45, DSOFT, DPAPER);
  if (open > 0) {
    const h = open * Math.PI / 360;
    const x1 = cx + Math.cos(a0 - h) * (r + 0.7), y1 = cy + Math.sin(a0 - h) * (r + 0.7);
    const x2 = cx + Math.cos(a0 + h) * (r + 0.7), y2 = cy + Math.sin(a0 + h) * (r + 0.7);
    s += '<path d="M' + cx + ' ' + cy + ' L' + rn(x1) + ' ' + rn(y1) + ' A' + rn(r + 0.7) + ' ' +
         rn(r + 0.7) + ' 0 ' + (open > 180 ? 1 : 0) + ' 1 ' + rn(x2) + ' ' + rn(y2) +
         ' Z" fill="' + DPAPER + '"/>' +
         ln('M' + rn(x1) + ' ' + rn(y1) + ' L' + cx + ' ' + cy + ' L' + rn(x2) + ' ' + rn(y2), 1.5, DACC);
  }
  if (o.dim !== false) {
    const ax = cx + off, ay = cy - r;
    s += arrow(ax, ay - 5.5, ax, ay, 0.6) + arrow(ax, ay + wall + 5.5, ax, ay + wall, 0.6) +
         txt(ax + 4.4, rn(ay + wall * 0.5 + 1.7), 't', 5) +
         ln('M' + cx + ' ' + cy + ' L' + rn(cx + r) + ' ' + cy, 0.5, DSOFT) +
         txt(rn(cx + r * 0.55), rn(cy - 1.7), 'R', 5, DSOFT);
  }
  return s;
}
/* what is left of a tube once it is split down its length */
function halfShell(cx, cy, r, turn) {
  const t = (turn || 0) * Math.PI / 180, ri = r * 0.7;
  const p = (a, rr) => rn(cx + Math.cos(a + t) * rr) + ' ' + rn(cy + Math.sin(a + t) * rr);
  return sh('M' + p(-Math.PI / 2, r) + ' A' + r + ' ' + r + ' 0 0 1 ' + p(Math.PI / 2, r) +
            ' L' + p(Math.PI / 2, ri) + ' A' + ri + ' ' + ri + ' 0 0 0 ' + p(-Math.PI / 2, ri) +
            ' Z', DWOOD, 1.2);
}

/* a leader from a detail to the circle it is drawn bigger in */
function lead(x1, y1, x2, y2) {
  return ln('M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2, 0.55, DSOFT) +
         '<circle cx="' + x1 + '" cy="' + y1 + '" r="1.2" fill="' + DSOFT + '"/>';
}
function ring(cx, cy, r) {
  return '<circle cx="' + cx + '" cy="' + cy + '" r="' + rn(r) + '" fill="none" stroke="' +
         DSOFT + '" stroke-width="0.5"/>';
}

/* ---- one figure per case ------------------------------------------------
   Each says something a photograph cannot: where the load goes, what the
   section looks like, how long the lever is. The finding is the only thing in
   the accent colour, so it can be found without being named. */
const CASE_FIG = {

  /* the reference tree: even crown, closed bark, flares all round, and the
     load running straight down through sound wood */
  'sound-tree': () =>
    broadleaf({ cx: 50, cy: 32, rx: 26, ry: 21, top: 48, hw: 6, tw: 3.4, seed: 7, bark: 9 }) +
    ln('M46.6 52 C45.4 62 44.2 72 42.4 83', 0.5, DHAIR) +
    ln('M53.4 52 C54.6 62 55.8 72 57.6 83', 0.5, DHAIR) +
    arrow(50, 6, 50, 13, 0.8, DSOFT) +
    ground(),

  /* a rib is the tree's own answer to a hollow: it lays wood on exactly where
     it is being bent, and the section shows the wall it has kept */
  ribbing: () =>
    broadleaf({ cx: 30, cy: 26, rx: 16, ry: 14, top: 46, hw: 5.4, tw: 3.2, seed: 13,
                ribL: { at: 0.28, w: 0.22, amp: 3.4 } }) +
    ln('M25.4 80.6 C22.8 74 23 67.4 25.6 61.6', 1.7, DACC) +
    ln('M27.4 80 C25.2 74 25.4 68 27.6 62.6', 0.7, DACC) +
    arrow(8, 60, 18.4, 66, 0.9) +
    lead(24.6, 71, 60, 43) +
    '<g transform="translate(74 30) scale(1.16 1) translate(-74 -30)">' +
      section(74, 30, 15.5, { t: 3.4, off: 3.6, dim: false }) + '</g>' +
    ln('M56.4 36.6 A18 15.5 0 0 1 61.6 18.6', 2.4, DACC) +
    ring(74, 30, 17.6) +
    ground(),

  /* an opening at the base. The wall is what is left, the rolled lips say the
     tree has been holding this for years, and a third of the ring is gone */
  'cavity-base': () => {
    const cav = 'M28.6 86 C25.4 79.4 25.8 72.6 29.2 68.2 C33.2 68.6 36.2 73.4 36.2 80.2 ' +
                'C36.2 82.8 35.6 85 34.8 86 Z';
    return broadleaf({ cx: 31, cy: 26, rx: 16, ry: 14, top: 46, hw: 5.6, tw: 3.2, seed: 21 }) +
      hatched(cav, 1.4, -45, DINK, '#efe7d8') + ln(cav, 1.6, DACC) +
      ln('M26.6 86 C23.4 79 24 71.6 28.2 66.4', 1.6) +
      ln('M38.4 86 C38.8 78.6 37.2 71.8 32.8 66.6', 1.6) +
      lead(32, 77, 58, 58) +
      section(75, 56, 16, { t: 5, open: 118, at: 250 }) + ring(75, 56, 18) +
      ground();
  },

  /* the plate is turning: on the windward side the soil lifts and tears,
     on the other side it settles */
  'soil-heave': () =>
    arrow(2, 18, 21, 22, 1.1) + arrow(4, 30, 21, 33, 0.85) + arrow(6, 42, 21, 44, 0.7) +
    '<g transform="rotate(10 58 86)">' +
      broadleaf({ cx: 58, cy: 30, rx: 21, ry: 17, top: 44, hw: 5.6, tw: 3.2, seed: 5 }) + '</g>' +
    ground(86, 3, 17) +
    ln('M17 86 C22.6 73.6 34 70.4 46 75 C52 77.4 56 80 60 82', 2.1, DACC) +
    ln('M23.4 77 L21.6 87 M29.6 72.6 L28.8 83.4 M36 71.6 L37 81.6 M42 73.6 L43.6 80.6', 1.1, DACC) +
    ln('M60 82 C70 87 78 90.4 84 91 L97 91', 1.4) +
    ln('M66 87.4 C76 91.4 86 93 96 93.4', 0.6, DSOFT) +
    '<g stroke-dasharray="3 2.4">' + ln('M19 87 C31 100.6 78 100 90 88.6', 1, DSOFT) + '</g>' +
    arrow(92, 76, 88, 85, 0.8, DSOFT),

  'root-cut': () => {
    let s = '<g stroke-dasharray="3.4 3">' +
      '<circle cx="40" cy="50" r="33" fill="none" stroke="' + DSOFT + '" stroke-width="0.9"/></g>';
    const rnd = nse(4);
    for (let i = 0; i < 8; i++) {
      const a = Math.PI * 2 * i / 8 + 0.34 + (rnd() - 0.5) * 0.3;
      const len = 27 + rnd() * 6;
      const x = 40 + Math.cos(a) * len, y = 50 + Math.sin(a) * len;
      const cut = x > 66, k = cut ? (66 - 40) / (x - 40) : 1;
      const ex = 40 + (x - 40) * k, ey = 50 + (y - 50) * k;
      const bow = (rnd() - 0.45) * 13;
      s += limb(40 + Math.cos(a) * 5.6, 50 + Math.sin(a) * 5.6, ex, ey, 2.8, 0.5, bow, i);
      const mx = 40 + (ex - 40) * 0.6, my = 50 + (ey - 50) * 0.6;
      const b = a + (rnd() < 0.5 ? 0.5 : -0.5), bl = len * 0.34;
      const bxx = mx + Math.cos(b) * bl, byy = my + Math.sin(b) * bl;
      if (bxx < 65) s += limb(mx, my, bxx, byy, 1.1, 0.35, 0, i + 30);
      if (cut) s += ln('M' + rn(ex - Math.sin(a) * 2) + ' ' + rn(ey + Math.cos(a) * 2) +
                       ' L' + rn(ex + Math.sin(a) * 2) + ' ' + rn(ey - Math.cos(a) * 2), 1.8, DACC);
    }
    return s +
      '<circle cx="40" cy="50" r="7.6" fill="' + DWOOD + '" stroke="' + DINK + '" stroke-width="1.3"/>' +
      '<circle cx="40" cy="50" r="4.8" fill="none" stroke="' + DHAIR + '" stroke-width="0.5"/>' +
      '<circle cx="40" cy="50" r="2.4" fill="none" stroke="' + DHAIR + '" stroke-width="0.5"/>' +
      hatched('M67 6 L80 6 L80 94 L67 94 Z', 2.8, -45, DSOFT) +
      ln('M67 6 L67 94', 1.6, DACC) +
      arrow(97, 50, 88, 50, 1) + arrow(97, 32, 88, 32, 0.75) + arrow(97, 68, 88, 68, 0.75);
  },

  'crack-long': () =>
    broadleaf({ cx: 30, cy: 26, rx: 16, ry: 14, top: 46, hw: 5.6, tw: 3.2, seed: 33 }) +
    ln('M29.4 82 C28.4 70 30 58 29 47', 1.8, DACC) +
    ln('M31.8 80.6 C30.8 69 32.4 58 31.4 48', 0.8, DACC) +
    lead(30, 64, 60, 62) +
    lens(76, 26, 13, '<circle cx="76" cy="26" r="12.6" fill="' + DWOOD + '"/>' +
         '<circle cx="76" cy="26" r="8.4" fill="' + DPAPER + '" stroke="' + DHAIR +
         '" stroke-width="0.6"/>') +
    twist(76, 26, 16.6, -145, -35) +
    lens(76, 64, 14,
         halfShell(72.6, 62, 11.4, 180) + halfShell(80, 66, 11.4, 0) +
         ln('M76.2 50 L76.2 57.4 M76.2 70.6 L76.2 78', 1.6, DACC)) +
    arrow(66.6, 78, 70.6, 82, 0.7, DSOFT) + arrow(89, 52, 85, 48, 0.7, DSOFT) +
    ground(),

  /* the two stems never grew together: bark runs down between them, and the
     section shows there is nothing holding across the seam */
  'included-bark': () => {
    const stemA = trunk({ cx: 26, top: 34, hw: 4.6, tw: 2.6, flare: 5, bend: -9, seed: 17 });
    const stemB = trunk({ cx: 44, top: 32, hw: 4.6, tw: 2.6, flare: 5, bend: 8, seed: 19 });
    return foliage(15, 24, 13, 11, 5) + foliage(54, 20, 13, 11, 9) +
      stemA.svg + stemB.svg +
      sh('M30 86 C31.6 74 33.6 64 35 56 L40 56 C41.4 64 43.4 74 45 86 Z', DWOOD, 1.25) +
      ln('M37.6 32 C37.2 42 37.4 50 37.6 57', 1.9, DACC) +
      lead(37.6, 46, 62, 36) +
      lens(76, 32, 14,
        '<circle cx="70.4" cy="32" r="7.6" fill="' + DWOOD + '" stroke="' + DINK +
        '" stroke-width="1.2"/><circle cx="82" cy="32" r="7.6" fill="' + DWOOD +
        '" stroke="' + DINK + '" stroke-width="1.2"/>' +
        ln('M76.2 24 L76.2 40', 1.9, DACC)) +
      arrow(66, 50, 71, 43, 0.7, DSOFT) + arrow(88, 50, 83, 43, 0.7, DSOFT) +
      ground();
  },

  /* dead limbs in the top of the crown, and a path underneath */
  deadwood: () =>
    broadleaf({ cx: 50, cy: 32, rx: 24, ry: 19, top: 48, hw: 6, tw: 3.4, seed: 29 }) +
    limb(47, 44, 33, 18, 2.4, 0.6, -2.4, 51, DPAPER, DACC) +
    limb(37, 30, 29, 16, 1.2, 0.4, 1.2, 52, DPAPER, DACC) +
    limb(53, 42, 70, 17, 2.4, 0.6, 2.4, 53, DPAPER, DACC) +
    limb(62, 27, 67, 13, 1.2, 0.4, -1.2, 54, DPAPER, DACC) +
    limb(52, 47, 75, 37, 2.2, 0.5, 2.6, 55, DPAPER, DACC) +
    limb(67, 41, 76, 31, 1, 0.35, -1, 56, DPAPER, DACC) +
    hatched('M3 88 L97 88 L97 95 L3 95 Z', 3.6, -45, DSOFT) +
    ground(86, 3, 97) + human(80, 88, 13),

  topping: () => {
    const t = trunk({ cx: 30, top: 48, hw: 6.6, tw: 5.6, flare: 6.4, seed: 23, bark: 9 });
    const rnd = nse(31);
    let s = t.svg +
      hatched('M24.6 46 C24.2 50 24.2 56 24.8 62 L35.4 62 C36 56 36 50 35.6 46 Z', 2, -45, DSOFT) +
      '<ellipse cx="30" cy="45.6" rx="5.8" ry="2.3" fill="' + DPAPER + '" stroke="' + DACC +
      '" stroke-width="1.8"/>';
    for (let i = 0; i < 16; i++) {
      const x = 24.9 + (i % 8) * 1.46, sp = (i - 7.5) * 2.1 + (rnd() - 0.5) * 2.4;
      const ty = 14 + rnd() * 9;
      s += ln('M' + rn(x) + ' 45 Q' + rn(x + sp * 0.5) + ' ' + rn((45 + ty) / 2) + ' ' +
              rn(x + sp * 1.2) + ' ' + rn(ty), 0.8);
    }
    return s +
      lead(30, 52, 60, 54) +
      section(76, 54, 16, { t: 3.2, dim: false }) + ring(76, 54, 18) +
      ln('M62.2 48.6 A16 16 0 0 1 89.8 48.6', 2, DACC) +
      ground();
  },

  compaction: () =>
    broadleaf({ cx: 38, cy: 30, rx: 14, ry: 12, top: 48, hw: 5.4, tw: 3.2, seed: 41,
                thin: true, n: 21 }) +
    ln('M26 27 L23.6 22.6 M31 18.6 L30 14.4 M45 21 L47.4 16.6 M50 30.6 L54 28 M41 16.6 L42 12.4',
       0.85, DSOFT) +
    hatched('M3 85.4 L21 85.4 L21 91.4 L3 91.4 Z', 2.8, -45, DSOFT) +
    hatched('M55 85.4 L97 85.4 L97 91.4 L55 91.4 Z', 2.8, -45, DSOFT) +
    hatched('M3 94 L97 94 L97 99 L3 99 Z', 2.8, -45, DSOFT) +
    ln('M3 85.4 L21 85.4 M55 85.4 L97 85.4 M3 94 L97 94', 1.7, DACC) +
    ground(86, 21, 55) +
    '<g stroke-dasharray="3 2.4">' +
      ln('M23.6 87.4 C28.6 91.4 33.4 92.6 38 92.6 C42.6 92.6 47.4 91.4 52.4 87.4', 1.2, DACC) + '</g>',

  'hazard-beam': () =>
    broadleaf({ cx: 20, cy: 28, rx: 14, ry: 13, top: 46, hw: 5.4, tw: 3.4, seed: 37 }) +
    limb(23, 46, 93, 39.4, 3.6, 1.5, -1.8, 2, '#f1ded6', DACC) +
    ln('M45 40.6 C49 35.6 53 33.6 57 33 M65 38.6 C69 33.6 73 32 77 31.4 ' +
       'M84 38 C87 34.6 90 33.4 93 33', 1, DACC) +
    arrow(92, 22, 92, 35, 1) +
    hatched('M25 50 L93 43 L93 45.4 L25 66 Z', 2.6, -45, DSOFT) +
    sh('M56 84 L61 75.6 L79 75.6 L85 84 Z', DPAPER, 1.2) +
    ln('M65 76 L65 84', 0.6, DHAIR) +
    '<circle cx="63" cy="84" r="2.9" fill="' + DPAPER + '" stroke="' + DINK + '" stroke-width="1.2"/>' +
    '<circle cx="79" cy="84" r="2.9" fill="' + DPAPER + '" stroke="' + DINK + '" stroke-width="1.2"/>' +
    ground(),

};
