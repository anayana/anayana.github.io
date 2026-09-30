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

/* ---- the tree ----------------------------------------------------------
   A tree is ONE body. Stem, branch and root buttress are not separate shapes
   stuck together - where a branch leaves the stem there is no seam, because
   there is no join: it is the same piece of wood.

   So nothing here is drawn as a closed outline. The tree is a skeleton of
   lines with a thickness along each one, and it is stroked twice: once thick
   in ink, then once thinner in the colour of the wood, over the top. The
   second pass wipes out every internal edge and leaves exactly one continuous
   outline round the whole thing - the silhouette a pen would have drawn.
   That is also why the ink pass must be finished before the wood pass starts.
   ------------------------------------------------------------------------ */

/* a piece of the skeleton: a run of points and how thick the wood is along it */
function part(pts, w0, w1, pow) {
  const q = pow == null ? 0.75 : pow;
  return { pts: pts, wf: t => w0 + (w1 - w0) * Math.pow(t, q) };
}
/* the two passes. Everything handed in belongs to one body. */
function body(segs, o) {
  o = o || {};
  const ink = o.ink || DINK, fill = o.fill || DWOOD, lw = o.lw == null ? 0.62 : o.lw;
  let a = '', b = '';
  for (const g of segs) {
    const P = g.pts, K = P.length - 1;
    for (let i = 0; i < K; i++) {
      const w = Math.max(0.5, g.wf((i + 0.5) / K));
      const d = 'M' + rn(P[i][0]) + ' ' + rn(P[i][1]) + ' L' + rn(P[i + 1][0]) + ' ' + rn(P[i + 1][1]);
      a += '<path d="' + d + '" fill="none" stroke="' + ink + '" stroke-width="' +
           rn(w + lw * 2) + '" stroke-linecap="round"/>';
      b += '<path d="' + d + '" fill="none" stroke="' + fill + '" stroke-width="' +
           rn(w) + '" stroke-linecap="round"/>';
    }
  }
  return a + b;
}

/* the stem: from the ground to where the crown takes over */
function stemPart(o) {
  o = o || {};
  const cx = o.cx == null ? 50 : o.cx, base = o.base == null ? DGND : o.base;
  const top = o.top == null ? 46 : o.top;
  const d0 = o.d0 == null ? 11 : o.d0, d1 = o.d1 == null ? 6 : o.d1;
  const bend = o.bend || 0, sway = o.sway == null ? 0.8 : o.sway;
  /* the flare is part of the stem, not something bolted to its foot: the wood
     widens over the last stretch before the ground and nowhere else */
  const fl = o.flare == null ? d0 * 0.42 : o.flare;
  const deep = o.deep == null ? 3 : o.deep, bot = base + deep;
  const fh = (o.flareH == null ? 11 : o.flareH) / Math.max(1, bot - top);
  const rnd = nse(o.seed || 3), N = 16, pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, y = bot - (bot - top) * t;
    pts.push([cx + bend * Math.pow(t, 1.7) + Math.sin(t * 3.3) * sway + (rnd() - 0.5) * 0.3, y]);
  }
  const p = { pts: pts, wf: t => d0 + (d1 - d0) * Math.pow(t, 0.62) +
                                 fl * Math.pow(Math.max(0, 1 - t / fh), 2.6) };
  p.topX = pts[N][0]; p.topY = top; p.topD = d1; p.cx = cx; p.base = base; p.d0 = d0;
  return p;
}
/* the buttresses. A trunk does not meet the ground at a line - it spreads. */
/* everything below the ground line is soil: the drawing stops there */
function cut(y) {
  return '<rect x="0" y="' + (y == null ? DGND : y) + '" width="100" height="' +
         (100 - (y == null ? DGND : y)) + '" fill="' + DPAPER + '"/>';
}
/* roots that run off along the ground and disappear into it: thick where they
   leave the flare, gone a couple of metres out */
function rootParts(cx, base, d, n, seed) {
  const rnd = nse(seed || 6), out = [];
  for (let i = 0; i < (n || 3); i++) {
    const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
    const len = d * (0.9 + k * 0.5 + rnd() * 0.5), pts = [];
    for (let s = 0; s <= 4; s++) {
      const t = s / 4;
      pts.push([cx + side * len * t * (0.7 + k * 0.3),
                base - 1.2 + 1.6 * Math.pow(t, 0.6) + (rnd() - 0.5) * 0.3]);
    }
    out.push(part(pts, d * 0.32, 0.8, 0.7));
  }
  return out;
}
/* a branch, growing out of whatever it is given as its start */
function branchPart(x0, y0, ang, len, d0, d1, curve, seed) {
  const rnd = nse(seed || 8), N = 7, pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = ang + (curve || 0) * t * t;
    pts.push([x0 + Math.cos(a) * len * t + (rnd() - 0.5) * 0.5 * t,
              y0 + Math.sin(a) * len * t + (rnd() - 0.5) * 0.5 * t]);
  }
  return part(pts, d0, d1, 0.8);
}
/* bark: strokes that follow the stem, inside it, never across its edge */
function barkOn(st, seed, n) {
  const rnd = nse(seed || 5), P = st.pts; let s = '';
  for (let k = 0; k < (n || 8); k++) {
    const i0 = 1 + Math.floor(rnd() * (P.length - 5)), len = 2 + Math.floor(rnd() * 4);
    const f = (rnd() - 0.5) * 0.56, q = [];
    for (let i = i0; i < Math.min(P.length, i0 + len); i++)
      q.push([P[i][0] + st.wf(i / (P.length - 1)) * f + (rnd() - 0.5) * 0.4, P[i][1]]);
    if (q.length > 1) s += ln(smooth(q), 0.45, DHAIR);
  }
  return s;
}

/* foliage: a scalloped edge, a light tone inside, a little shade under it */
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
  if (opts.shade !== false)
    for (let k = 0; k < (opts.thin ? 2 : 5); k++) {
      const a = Math.PI * (0.18 + rnd() * 0.64), r = 0.34 + rnd() * 0.36;
      const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
      const w = chord * (0.5 + rnd() * 0.4);
      s += ln('M' + rn(x - w) + ' ' + rn(y) + ' A' + rn(w) + ' ' + rn(w) + ' 0 0 0 ' +
              rn(x + w) + ' ' + rn(y), 0.5, DHAIR);
    }
  return s;
}

/* a whole broadleaf: one body, then the foliage over the ends of the branches */
function treeParts(o) {
  o = o || {};
  const st = stemPart(o);
  const rx = o.rx == null ? 24 : o.rx, cy = o.cy == null ? 32 : o.cy;
  const segs = [st].concat(rootParts(st.cx, st.base, o.d0 == null ? 11 : o.d0,
                                     o.roots == null ? 4 : o.roots, (o.seed || 7) + 40));
  const tx = st.topX, ty = st.topY, td = st.topD, sd = o.seed || 7;
  if (o.branches !== false) {
    segs.push(branchPart(tx, ty + 4, -Math.PI * 0.74, rx * 0.92, td * 0.62, 0.8, -0.5, sd + 1));
    segs.push(branchPart(tx, ty + 6, -Math.PI * 0.26, rx * 0.94, td * 0.66, 0.8, 0.5, sd + 2));
    segs.push(branchPart(tx, ty + 1, -Math.PI * 0.56, rx * 0.72, td * 0.54, 0.7, 0.26, sd + 3));
    segs.push(branchPart(tx, ty + 2.5, -Math.PI * 0.44, rx * 0.66, td * 0.5, 0.7, -0.2, sd + 4));
  }
  return { segs: segs, st: st, cy: cy, rx: rx };
}
function broadleaf(o) {
  o = o || {};
  const t = treeParts(o);
  return foliage(o.cx == null ? 50 : o.cx, t.cy, t.rx, o.ry == null ? 19 : o.ry, o.seed || 7,
                 { thin: o.thin, fill: o.leaf, n: o.n }) +
         body(t.segs, { lw: o.lw }) + barkOn(t.st, (o.seed || 7) + 2, o.bark) +
         (o.cut === false ? '' : cut(o.base == null ? DGND : o.base));
}
function conifer(o) {
  o = o || {};
  const cx = o.cx == null ? 50 : o.cx, base = o.base == null ? DGND : o.base;
  const st = stemPart({ cx: cx, base: base, top: o.top == null ? 12 : o.top, d0: 8, d1: 1.6,
                        seed: o.seed || 9, sway: 0.4 });
  let s = body([st].concat(rootParts(cx, base, 8, 4, (o.seed || 9) + 40)));
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
   section looks like, how long the lever is. Everything that is one piece of
   wood goes into one body() call, so a branch grows out of its stem instead of
   being laid on top of it. The finding is the only thing in the accent colour,
   so it can be found without being named. */
const CASE_FIG = {

  /* the reference tree: even crown, closed bark, buttresses all round, and the
     load running straight down through sound wood */
  'sound-tree': () => {
    const t = treeParts({ cx: 50, cy: 34, rx: 25, d0: 12.5, d1: 6.4, top: 50, seed: 7, roots: 5 });
    return foliage(50, 34, 25, 20, 7) + body(t.segs) + barkOn(t.st, 9, 10) + cut() +
      ln('M46.6 56 C45.6 64 44.8 72 43.8 82', 0.5, DHAIR) +
      ln('M53.4 56 C54.4 64 55.2 72 56.2 82', 0.5, DHAIR) +
      arrow(50, 6, 50, 13, 0.8, DSOFT) + ground();
  },

  ribbing: () => {
    const t = treeParts({ cx: 31, cy: 28, rx: 17, d0: 11.5, d1: 6, top: 48, seed: 13 });
    /* the rib is not a shape stuck on the stem - it is more stem */
    const rib = part([[26.2, 85.4], [25.2, 79], [25, 73], [26, 67], [27.4, 62]], 5.4, 2, 1.1);
    return foliage(31, 28, 17, 14, 13) + body(t.segs.concat([rib])) + barkOn(t.st, 15, 7) + cut() +
      ln('M23.4 84.4 C21.4 78 21.4 71.4 23.4 65.4 C24.4 62.6 25.6 60.6 26.6 59.4', 1.6, DACC) +
      arrow(6, 60, 16.6, 66, 0.9) +
      lead(23.6, 72, 59, 43) +
      '<g transform="translate(74 30) scale(1.16 1) translate(-74 -30)">' +
        section(74, 30, 15.5, { t: 3.4, off: 3.6, dim: false }) + '</g>' +
      ln('M56.4 36.6 A18 15.5 0 0 1 61.6 18.6', 2.4, DACC) + ring(74, 30, 17.6) +
      ground();
  },

  'cavity-base': () => {
    const t = treeParts({ cx: 31, cy: 28, rx: 17, d0: 12.5, d1: 6, top: 48, seed: 21 });
    const cav = 'M28.6 86.6 C25.4 79.4 25.8 72.6 29.2 68.2 C33.2 68.6 36.2 73.4 36.2 80.2 ' +
                'C36.2 83 35.6 85.4 34.8 86.6 Z';
    return foliage(31, 28, 17, 14, 21) + body(t.segs) + barkOn(t.st, 23, 7) + cut() +
      hatched(cav, 1.4, -45, DINK, '#efe7d8') + ln(cav, 1.6, DACC) +
      ln('M26.4 86.6 C23.2 79 24 71.2 28.2 65.8', 1.5, DHAIR) +
      ln('M38.6 86.6 C39 78.4 37.4 71.4 32.8 66', 1.5, DHAIR) +
      lead(32, 77, 57, 58) +
      section(75, 56, 16, { t: 5, open: 118, at: 250 }) + ring(75, 56, 18) +
      ground();
  },

  'soil-heave': () =>
    arrow(2, 18, 21, 22, 1.1) + arrow(4, 30, 21, 33, 0.85) + arrow(6, 42, 21, 44, 0.7) +
    '<g transform="rotate(10 58 86)">' +
      broadleaf({ cx: 58, cy: 30, rx: 21, ry: 17, top: 44, d0: 11, d1: 5.6, seed: 5 }) + '</g>' +
    ground(86, 3, 17) +
    ln('M17 86 C22.6 73.6 34 70.4 46 75 C52 77.4 56 80 60 82', 2.1, DACC) +
    ln('M23.4 77 L21.6 87 M29.6 72.6 L28.8 83.4 M36 71.6 L37 81.6 M42 73.6 L43.6 80.6', 1.1, DACC) +
    ln('M60 82 C70 87 78 90.4 84 91 L97 91', 1.4) +
    ln('M66 87.4 C76 91.4 86 93 96 93.4', 0.6, DSOFT) +
    '<g stroke-dasharray="3 2.4">' + ln('M19 87 C31 100.6 78 100 90 88.6', 1, DSOFT) + '</g>' +
    arrow(92, 76, 88, 85, 0.8, DSOFT),

  /* seen from above: the trench took a sector of the plate away, and the wind
     that matters now is the one pulling on that side */
  'root-cut': () => {
    const rnd = nse(4), segs = [part([[40, 50], [40, 50.02]], 15, 15, 1)];
    const cuts = [];
    for (let i = 0; i < 8; i++) {
      const a = Math.PI * 2 * i / 8 + 0.34 + (rnd() - 0.5) * 0.3;
      const len = 27 + rnd() * 6, cv = (rnd() - 0.45) * 0.8;
      const P = [];
      for (let k = 0; k <= 7; k++) {
        const t = k / 7, aa = a + cv * t * t;
        P.push([40 + Math.cos(aa) * len * t, 50 + Math.sin(aa) * len * t]);
      }
      /* a root that meets the trench stops there, square */
      let cut = -1;
      for (let k = 0; k <= 7; k++) if (P[k][0] > 66) { cut = k; break; }
      const Q = cut < 0 ? P : P.slice(0, cut);
      if (Q.length > 2) {
        segs.push(part(Q, 6.4, 0.7, 0.8));
        const m = Math.floor(Q.length * 0.55), b = a + (rnd() < 0.5 ? 0.6 : -0.6);
        const bl = len * 0.3, B = [];
        for (let k = 0; k <= 4; k++)
          B.push([Q[m][0] + Math.cos(b) * bl * k / 4, Q[m][1] + Math.sin(b) * bl * k / 4]);
        if (B[4][0] < 65) segs.push(part(B, 2.6, 0.5, 0.8));
        if (cut >= 0) cuts.push([Q[Q.length - 1], a]);
      }
    }
    let s = '<g stroke-dasharray="3.4 3"><circle cx="40" cy="50" r="33" fill="none" stroke="' +
            DSOFT + '" stroke-width="0.9"/></g>' + body(segs);
    s += '<circle cx="40" cy="50" r="4.8" fill="none" stroke="' + DHAIR + '" stroke-width="0.5"/>' +
         '<circle cx="40" cy="50" r="2.4" fill="none" stroke="' + DHAIR + '" stroke-width="0.5"/>';
    for (const c of cuts)
      s += ln('M' + rn(c[0][0] - Math.sin(c[1]) * 2.2) + ' ' + rn(c[0][1] + Math.cos(c[1]) * 2.2) +
              ' L' + rn(c[0][0] + Math.sin(c[1]) * 2.2) + ' ' + rn(c[0][1] - Math.cos(c[1]) * 2.2),
              1.8, DACC);
    return s + hatched('M67 6 L80 6 L80 94 L67 94 Z', 2.8, -45, DSOFT) +
      ln('M67 6 L67 94', 1.6, DACC) +
      arrow(97, 50, 88, 50, 1) + arrow(97, 32, 88, 32, 0.75) + arrow(97, 68, 88, 68, 0.75);
  },

  /* one closed tube carries torsion; two half shells slide past each other */
  'crack-long': () =>
    broadleaf({ cx: 30, cy: 26, rx: 16, ry: 14, top: 46, d0: 11, d1: 5.6, seed: 33 }) +
    ln('M29.4 83 C28.4 71 30 59 29 47', 1.8, DACC) +
    ln('M31.8 81.6 C30.8 70 32.4 59 31.4 48', 0.8, DACC) +
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
    const low = stemPart({ cx: 37, base: DGND, top: 58, d0: 14, d1: 12, seed: 17, sway: 0.4 });
    const a = stemPart({ cx: 35, base: 59, top: 30, d0: 9.4, d1: 4.6, bend: -11, seed: 19, sway: 0.5 });
    const b = stemPart({ cx: 39, base: 59, top: 28, d0: 9.4, d1: 4.6, bend: 10, seed: 23, sway: 0.5 });
    return foliage(20, 24, 13, 11, 5) + foliage(53, 22, 13, 11, 9) +
      body([low, a, b].concat(rootParts(37, DGND, 14, 3, 57))) +
      barkOn(low, 25, 6) + barkOn(a, 27, 4) + barkOn(b, 29, 4) + cut() +
      ln('M37.4 30 C37 40 37.2 50 37.4 57.4', 1.9, DACC) +
      lead(37.4, 46, 62, 36) +
      lens(76, 32, 14,
        '<circle cx="70.4" cy="32" r="7.6" fill="' + DWOOD + '" stroke="' + DINK +
        '" stroke-width="1.2"/><circle cx="82" cy="32" r="7.6" fill="' + DWOOD +
        '" stroke="' + DINK + '" stroke-width="1.2"/>' + ln('M76.2 24 L76.2 40', 1.9, DACC)) +
      arrow(66, 50, 71, 43, 0.7, DSOFT) + arrow(88, 50, 83, 43, 0.7, DSOFT) +
      ground();
  },

  deadwood: () => {
    const t = treeParts({ cx: 50, cy: 34, rx: 24, d0: 12.5, d1: 6.4, top: 50, seed: 29 });
    const dead = [
      branchPart(48, 48, -Math.PI * 0.68, 33, 3.4, 0.7, -0.5, 61),
      branchPart(52, 46, -Math.PI * 0.3, 32, 3.4, 0.7, 0.5, 62),
      branchPart(52, 50, -Math.PI * 0.14, 28, 2.8, 0.6, 0.34, 63)
    ];
    return foliage(50, 34, 24, 19, 29) + body(t.segs) + barkOn(t.st, 31, 9) + cut() +
      body(dead, { ink: DACC, fill: DPAPER, lw: 0.7 }) +
      hatched('M3 88 L97 88 L97 95 L3 95 Z', 3.6, -45, DSOFT) +
      ground(86, 3, 97) + human(80, 88, 13);
  },

  topping: () => {
    const st = stemPart({ cx: 30, base: DGND, top: 46, d0: 15, d1: 12, seed: 23, sway: 0.4 });
    const rnd = nse(31), shoots = [];
    for (let i = 0; i < 13; i++) {
      const x = 25.4 + (i % 7) * 1.55, sp = (i - 6) * 0.1 + (rnd() - 0.5) * 0.14;
      shoots.push(branchPart(x, 45.8, -Math.PI / 2 + sp, 22 + rnd() * 7, 1.6, 0.4, sp * 0.5, i));
    }
    return body([st].concat(rootParts(30, DGND, 15, 3, 63)).concat(shoots)) +
      barkOn(st, 33, 9) + cut() +
      hatched('M24.4 46 C24 51 24 57 24.6 63 L35.6 63 C36.2 57 36.2 51 35.8 46 Z', 2, -45, DSOFT) +
      '<ellipse cx="30" cy="45.8" rx="6" ry="2.4" fill="' + DPAPER + '" stroke="' + DACC +
      '" stroke-width="1.8"/>' +
      lead(30, 53, 60, 54) +
      section(76, 54, 16, { t: 3.2, dim: false }) + ring(76, 54, 18) +
      ln('M62.2 48.6 A16 16 0 0 1 89.8 48.6', 2, DACC) +
      ground();
  },

  compaction: () =>
    broadleaf({ cx: 38, cy: 30, rx: 14, ry: 12, top: 48, d0: 10.5, d1: 5.4, seed: 41,
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

  /* nothing is wrong with the limb but its length: the load at the tip works on
     the attachment through the whole lever, and the bending grows all the way
     back to the stem */
  'hazard-beam': () => {
    const beam = branchPart(22, 47, -0.1, 72, 7, 2.6, 0.06, 71);
    const t = treeParts({ cx: 20, cy: 28, rx: 14, d0: 12, d1: 6.4, top: 47, seed: 37 });
    return foliage(20, 28, 14, 13, 37) +
      body([beam], { ink: DACC, fill: '#f1ded6', lw: 0.75 }) +
      body(t.segs) + barkOn(t.st, 39, 7) + cut() +
      ln('M45 42.6 C49 37.6 53 35.6 57 35 M65 40.6 C69 35.6 73 34 77 33.4 ' +
         'M84 40 C87 36.6 90 35.4 93 35', 1, DACC) +
      arrow(92, 23, 92, 36, 1) +
      hatched('M25 52 L93 45 L93 47.4 L25 68 Z', 2.6, -45, DSOFT) +
      sh('M56 84 L61 75.6 L79 75.6 L85 84 Z', DPAPER, 1.2) +
      ln('M65 76 L65 84', 0.6, DHAIR) +
      '<circle cx="63" cy="84" r="2.9" fill="' + DPAPER + '" stroke="' + DINK + '" stroke-width="1.2"/>' +
      '<circle cx="79" cy="84" r="2.9" fill="' + DPAPER + '" stroke="' + DINK + '" stroke-width="1.2"/>' +
      ground();
  }

};
