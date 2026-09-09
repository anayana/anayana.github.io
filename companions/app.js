/* Home Companions - cartoon animals that live at fixed places in your flat.
 *
 * No build step. three.js r128 (served locally), WebXR immersive-ar with a
 * camera + gyro fallback for phones without ARCore. Everything - placements,
 * dirt spots, routine log - stays in localStorage. The app makes no network
 * request after loading.
 *
 * Coordinates: animals are children of `world`, a group whose y-rotation maps
 * the XR session frame onto a compass-aligned "home frame". Positions are
 * stored in that home frame, so a layout survives a session even though ARCore
 * hands out a fresh origin every time - only the user's starting spot has to
 * be roughly the same.
 */
'use strict';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const now = () => Date.now();

/* ============================ STORAGE ============================ */

const K_LAYOUT = 'hc.layout.v1';
const K_LOG    = 'hc.log.v1';
const K_DIRT   = 'hc.dirt.v1';

function load(key, fallback) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
  catch (e) { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { toast('Speicher voll?'); }
}

let layout = load(K_LAYOUT, {});      // id -> {x,y,z,ry}
let logbook = load(K_LOG, []);        // [{t, type, dur}]
let dirt = load(K_DIRT, []);          // [{id,x,z,kind,born}]

function logEvent(type, dur) {
  logbook.push({ t: now(), type: type, dur: dur || 0 });
  if (logbook.length > 4000) logbook = logbook.slice(-3000);
  save(K_LOG, logbook);
}

/* ============================ TIME OF DAY ============================ */

/* Three phases, because every animal has three behaviours. */
function phaseNow() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 18) return 'day';
  return 'evening';
}
const PHASE_LABEL = { morning: 'Morgen', day: 'Nachmittag', evening: 'Abend / Nacht' };

/* ============================ SPECIES ============================ */

const M = {};   // shared materials, built once the renderer exists
function mat(hex, opts) {
  const k = hex + JSON.stringify(opts || {});
  if (!M[k]) M[k] = new THREE.MeshLambertMaterial(Object.assign({ color: hex }, opts || {}));
  return M[k];
}
function sphere(r, m, seg) { return new THREE.Mesh(new THREE.SphereGeometry(r, seg || 16, (seg || 16) * 0.75), m); }
function box(w, h, d, m) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); }
function cyl(rt, rb, h, m) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 12), m); }
function cone(r, h, m) { return new THREE.Mesh(new THREE.ConeGeometry(r, h, 12), m); }
function at(o, x, y, z) { o.position.set(x, y, z); return o; }

function label(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,250,242,.94)';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#8a4f14';
  g.font = '600 34px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(0.24, 0.06, 1);
  s.renderOrder = 10;
  return s;
}

/* ---------------------------- dog ---------------------------- */

function buildDog() {
  const g = new THREE.Group();
  const fur = mat(0xd09a52), dark = mat(0xa9743a), blk = mat(0x241a12), pink = mat(0xe89b9b);

  // body runs along +Z, which is also the direction the dog faces
  const body = sphere(0.155, fur); body.scale.set(1.0, 0.95, 1.45); at(body, 0, 0.30, -0.02);
  const chest = sphere(0.125, fur); chest.scale.set(1.0, 1.05, 0.9); at(chest, 0, 0.31, 0.13);

  const neck = new THREE.Group(); at(neck, 0, 0.40, 0.17);
  const head = sphere(0.125, fur); at(head, 0, 0.10, 0.03);
  const snout = sphere(0.062, dark); snout.scale.set(0.9, 0.75, 1.35); at(snout, 0, 0.055, 0.145);
  const nose = sphere(0.026, blk); at(nose, 0, 0.075, 0.215);
  const eyeL = sphere(0.024, blk); at(eyeL, 0.056, 0.150, 0.116);
  const eyeR = sphere(0.024, blk); at(eyeR, -0.056, 0.150, 0.116);
  const browL = sphere(0.022, fur); browL.scale.set(1, 0.5, 0.6); at(browL, 0.056, 0.186, 0.108);
  const browR = sphere(0.022, fur); browR.scale.set(1, 0.5, 0.6); at(browR, -0.056, 0.186, 0.108);
  const earL = sphere(0.052, dark); earL.scale.set(0.40, 1.5, 0.9); at(earL, 0.131, 0.118, -0.005);
  const earR = sphere(0.052, dark); earR.scale.set(0.40, 1.5, 0.9); at(earR, -0.131, 0.118, -0.005);
  const tongue = box(0.042, 0.011, 0.075, pink); at(tongue, 0, 0.020, 0.195); tongue.visible = false;
  neck.add(head, snout, nose, eyeL, eyeR, browL, browR, earL, earR, tongue);

  const legs = [];
  [[0.085, 0.135], [-0.085, 0.135], [0.085, -0.145], [-0.085, -0.145]].forEach(p => {
    const l = cyl(0.034, 0.038, 0.26, fur); at(l, p[0], 0.13, p[1]); legs.push(l); g.add(l);
    const paw = sphere(0.040, dark); paw.scale.set(1, 0.6, 1.15); at(paw, p[0], 0.022, p[1] + 0.012); g.add(paw);
  });

  const tail = cyl(0.013, 0.026, 0.22, fur);
  const tailPivot = new THREE.Group(); at(tailPivot, 0, 0.36, -0.20);
  at(tail, 0, 0.10, -0.02); tail.rotation.x = -0.6; tailPivot.add(tail);

  g.add(body, chest, neck, tailPivot);
  const lab = label('Hund'); at(lab, 0, 0.76, 0);
  g.add(lab);
  return { root: g, p: { body: body, neck: neck, ears: [earL, earR], tail: tailPivot, legs: legs, tongue: tongue } };
}

/* Legs are cylinders centred at y = 0.13; scaling them has to move the centre
   too or the dog ends up hovering. */
function dogLegs(p, s) {
  p.legs.forEach(l => { l.scale.y = s; l.position.y = 0.13 * s; });
}

function updateDog(o, dt, c) {
  const p = o.p, t = c.t;
  const near = c.dist < 2.6;
  const BODY_Y = 0.30, BODY_SY = 0.95;

  if (c.phase === 'day') {
    // home in the afternoon: bouncing, fast wag, ears up, tongue out up close
    const ex = near ? 1.0 : 0.45;
    o.root.position.y = o.base.y + Math.abs(Math.sin(t * (3 + 3 * ex))) * 0.05 * ex;
    p.tail.rotation.y = Math.sin(t * (9 + 7 * ex)) * 0.9;
    p.neck.rotation.set(-0.12 + Math.sin(t * 2.4) * 0.06, 0, 0);
    p.ears.forEach((e, i) => e.rotation.z = (i ? 0.28 : -0.28));
    p.tongue.visible = near;
    p.body.position.y = BODY_Y;
    p.body.scale.y = BODY_SY * (1 + Math.sin(t * 6) * 0.03);
    dogLegs(p, 1);
  } else if (c.phase === 'morning') {
    // sitting: happy to see you, but you are about to leave - slow wag, head tilt
    o.root.position.y = o.base.y;
    p.tail.rotation.y = Math.sin(t * 2.2) * 0.45 * (near ? 1.6 : 1);
    p.neck.rotation.set(0.10 + Math.sin(t * 0.9) * 0.10, 0, Math.sin(t * 0.45) * 0.24);
    p.ears.forEach((e, i) => e.rotation.z = (i ? 0.75 : -0.75));
    p.tongue.visible = false;
    p.body.position.y = BODY_Y - 0.07;
    p.body.scale.y = BODY_SY;
    dogLegs(p, 0.72);
  } else {
    // evening: a howl, then curling up and breathing
    const cycle = (t % 26) / 26;
    p.tongue.visible = false;
    if (cycle < 0.22) {
      p.neck.rotation.set(-0.95 + Math.sin(t * 5) * 0.05, 0, 0);   // nose up, howling
      o.root.position.y = o.base.y;
      p.tail.rotation.y = Math.sin(t * 1.4) * 0.2;
      p.body.position.y = BODY_Y;
      p.body.scale.y = BODY_SY;
      dogLegs(p, 0.92);
    } else {
      const s = clamp((cycle - 0.22) / 0.12, 0, 1);                // lying down
      p.neck.rotation.set(-0.95 + s * 1.30, 0, 0);
      o.root.position.y = o.base.y;
      p.tail.rotation.y = Math.sin(t * 0.8) * 0.12 * (1 - s);
      p.body.position.y = BODY_Y - s * 0.14;
      p.body.scale.y = BODY_SY * (1 + Math.sin(t * 1.1) * 0.035 * s);
      dogLegs(p, 0.92 - s * 0.74);
    }
    p.ears.forEach((e, i) => e.rotation.z = (i ? 0.7 : -0.7));
  }
}

function pokeDog(o) {
  o.poke = 1;
  const last = lastEventOf('greet');
  if (!last || now() - last.t > 45 * 60 * 1000) logEvent('greet');
  return c => c.phase === 'day' ? 'Der Hund freut sich, dass du da bist.'
    : c.phase === 'morning' ? 'Der Hund wedelt - er vermisst dich jetzt schon.'
      : 'Der Hund gähnt und rollt sich zusammen.';
}

/* ---------------------------- parrots ---------------------------- */

function buildParrot(colBody, colWing) {
  const g = new THREE.Group();
  const b = mat(colBody), w = mat(colWing), blk = mat(0x1a1410), beakM = mat(0xe8b24a);
  const body = sphere(0.07, b); body.scale.set(1, 1.3, 1); at(body, 0, 0.09, 0);
  const headP = new THREE.Group(); at(headP, 0, 0.185, 0);
  const head = sphere(0.05, b);
  const beak = cone(0.026, 0.055, beakM); at(beak, 0, -0.005, 0.045); beak.rotation.x = Math.PI / 2;
  const eyeL = sphere(0.011, blk); at(eyeL, 0.032, 0.014, 0.032);
  const eyeR = sphere(0.011, blk); at(eyeR, -0.032, 0.014, 0.032);
  headP.add(head, beak, eyeL, eyeR);
  const wingL = sphere(0.05, w); wingL.scale.set(0.35, 1.1, 0.9); at(wingL, 0.062, 0.09, 0);
  const wingR = sphere(0.05, w); wingR.scale.set(0.35, 1.1, 0.9); at(wingR, -0.062, 0.09, 0);
  const tail = cone(0.032, 0.17, w); at(tail, 0, 0.02, -0.075); tail.rotation.x = -2.5;
  const legL = cyl(0.008, 0.008, 0.045, beakM); at(legL, 0.022, 0.022, 0);
  const legR = cyl(0.008, 0.008, 0.045, beakM); at(legR, -0.022, 0.022, 0);
  g.add(body, headP, wingL, wingR, tail, legL, legR);
  return { g: g, head: headP, wings: [wingL, wingR], body: body };
}

function buildParrots() {
  const g = new THREE.Group();
  const perch = cyl(0.018, 0.018, 0.42, mat(0x8a6a48));
  at(perch, 0, 0.015, 0); perch.rotation.z = Math.PI / 2;
  const a = buildParrot(0x3fae5e, 0x2b8a48);   // green
  const b = buildParrot(0xd8493f, 0xb02f2a);   // red
  at(a.g, 0.11, 0.03, 0); a.g.rotation.y = -0.25;
  at(b.g, -0.11, 0.03, 0); b.g.rotation.y = 0.25;
  g.add(perch, a.g, b.g);
  const lab = label('Papageien'); at(lab, 0, 0.40, 0);
  g.add(lab);
  return { root: g, p: { a: a, b: b, nextShell: 0 } };
}

function updateParrots(o, dt, c) {
  const p = o.p, t = c.t;
  const birds = [p.a, p.b];
  if (c.phase === 'morning') {
    // waking up slowly: heads tucked, an occasional long stretch
    const cycle = (t % 14) / 14;
    birds.forEach((bd, i) => {
      const ph = t + i * 3.1;
      if (cycle < 0.7) {
        bd.head.rotation.x = 1.1 + Math.sin(ph * 0.5) * 0.08;   // head in the feathers
        bd.head.position.y = 0.15;
        bd.wings.forEach(wg => wg.rotation.z = 0);
      } else {
        const s = Math.sin((cycle - 0.7) / 0.3 * Math.PI);
        bd.head.rotation.x = 1.1 - s * 1.3;
        bd.head.position.y = 0.15 + s * 0.045;
        bd.wings.forEach((wg, k) => wg.rotation.z = (k ? -1 : 1) * s * 0.9);
      }
      bd.body.scale.y = 1.3 + Math.sin(ph * 1.2) * 0.04;
    });
  } else if (c.phase === 'day') {
    // eating nuts, shells drop to the floor
    birds.forEach((bd, i) => {
      const ph = t * 3.1 + i * 1.7;
      const peck = Math.max(0, Math.sin(ph));
      bd.head.rotation.x = peck * 1.15;
      bd.head.position.y = 0.185 - peck * 0.05;
      bd.wings.forEach(wg => wg.rotation.z = 0);
      bd.body.scale.y = 1.3;
    });
    if (t > p.nextShell) {
      p.nextShell = t + 25 + Math.random() * 40;
      dropShell(o);
    }
  } else {
    // preening each other: heads lean together, small grooming nods
    const lean = 0.5 + Math.sin(t * 0.7) * 0.12;
    p.a.g.rotation.z = -lean * 0.35; p.a.head.rotation.z = -lean;
    p.b.g.rotation.z = lean * 0.35; p.b.head.rotation.z = lean;
    birds.forEach((bd, i) => {
      bd.head.rotation.x = Math.sin(t * 2.6 + i * 2) * 0.25;
      bd.head.position.y = 0.185;
      bd.body.scale.y = 1.3 + Math.sin(t * 1.0 + i) * 0.03;
    });
  }
}

function pokeParrots(o) {
  o.poke = 1;
  return c => c.phase === 'morning' ? 'Die Papageien strecken sich - guten Morgen.'
    : c.phase === 'day' ? 'Nüsse. Die Schalen fallen nach unten.'
      : 'Sie kraulen sich gegenseitig das Gefieder.';
}

/* ---------------------------- frog ---------------------------- */

function buildFrog() {
  const g = new THREE.Group();
  const skin = mat(0x5ba84e), belly = mat(0x9fd08a), blk = mat(0x141410), wht = mat(0xf0f0e8);
  const body = sphere(0.085, skin); body.scale.set(1.0, 0.78, 1.2); at(body, 0, 0.065, 0);
  const bel = sphere(0.062, belly); bel.scale.set(1.0, 0.6, 1.1); at(bel, 0, 0.042, 0.02);
  const eyes = [];
  [0.042, -0.042].forEach(x => {
    const e = sphere(0.032, wht); at(e, x, 0.125, 0.030); g.add(e);
    const pu = sphere(0.016, blk); at(pu, x, 0.132, 0.052); g.add(pu);
    eyes.push(e, pu);
  });
  const mouth = box(0.075, 0.006, 0.012, blk); at(mouth, 0, 0.048, 0.098);
  const legs = [];
  [[0.065, -0.045], [-0.065, -0.045]].forEach(pp => {
    const l = sphere(0.030, skin); l.scale.set(0.7, 0.55, 1.5); at(l, pp[0], 0.028, pp[1]);
    legs.push(l); g.add(l);
  });
  [[0.058, 0.055], [-0.058, 0.055]].forEach(pp => {
    const l = cyl(0.012, 0.014, 0.045, skin); at(l, pp[0], 0.024, pp[1]);
    legs.push(l); g.add(l);
  });
  g.add(body, bel, mouth);
  const lab = label('Frosch'); at(lab, 0, 0.30, 0);
  g.add(lab);
  return { root: g, p: { body: body, legs: legs, eyes: eyes, hop: null, nextHop: 2 + Math.random() * 3 } };
}

function updateFrog(o, dt, c) {
  const p = o.p, t = c.t;
  // blink
  const blink = (t % 4.3) < 0.12 ? 0.15 : 1;
  p.eyes.forEach(e => e.scale.y = blink);

  if (!p.hop && t > p.nextHop) {
    // pick a spot on the floor within a couple of metres of the anchor
    const ang = Math.random() * Math.PI * 2, r = 0.7 + Math.random() * 1.8;
    p.hop = {
      from: o.root.position.clone(),
      to: new THREE.Vector3(o.base.x + Math.cos(ang) * r, o.base.y, o.base.z + Math.sin(ang) * r),
      u: 0
    };
    o.root.rotation.y = Math.atan2(p.hop.to.x - p.hop.from.x, p.hop.to.z - p.hop.from.z);
  }
  if (p.hop) {
    p.hop.u += dt * 1.15;
    const u = clamp(p.hop.u, 0, 1);
    o.root.position.lerpVectors(p.hop.from, p.hop.to, u);
    o.root.position.y += Math.sin(u * Math.PI) * 0.26;         // the arc
    p.body.scale.set(1 - Math.sin(u * Math.PI) * 0.12, 0.78 + Math.sin(u * Math.PI) * 0.28, 1.2);
    p.legs.forEach(l => l.rotation.x = Math.sin(u * Math.PI) * 0.9);
    if (u >= 1) {
      p.hop = null;
      p.nextHop = t + 3 + Math.random() * 5;
      if (Math.random() < 0.55) addDirt(o.root.position.x, o.root.position.z, 'mud');
    }
  } else {
    p.body.scale.set(1, 0.78 + Math.sin(t * 2.2) * 0.05, 1.2);  // breathing
    p.legs.forEach(l => l.rotation.x = 0);
  }
}

function pokeFrog(o) {
  o.p.nextHop = 0;
  const n = dirt.length;
  return () => n ? ('Der Frosch hüpft weiter. Noch ' + n + ' Stellen zu putzen.')
    : 'Alles sauber. Der Frosch ist zufrieden - für den Moment.';
}

/* ---------------------------- monkey ---------------------------- */

function buildMonkey() {
  const g = new THREE.Group();
  const fur = mat(0x7d5a3c), skin = mat(0xd8ab7e), blk = mat(0x141410), wht = mat(0xf2f2ea);
  const body = sphere(0.145, fur); body.scale.set(1, 1.15, 0.95); at(body, 0, 0.24, 0);
  const headP = new THREE.Group(); at(headP, 0, 0.50, 0.02);
  const head = sphere(0.125, fur);
  const face = sphere(0.095, skin); face.scale.set(1, 0.95, 0.55); at(face, 0, -0.01, 0.075);
  const earL = sphere(0.042, skin); earL.scale.set(0.45, 1, 1); at(earL, 0.128, 0.01, 0);
  const earR = sphere(0.042, skin); earR.scale.set(0.45, 1, 1); at(earR, -0.128, 0.01, 0);
  const eyeL = sphere(0.017, blk); at(eyeL, 0.042, 0.028, 0.115);
  const eyeR = sphere(0.017, blk); at(eyeR, -0.042, 0.028, 0.115);
  const muzzle = sphere(0.055, skin); muzzle.scale.set(1.1, 0.75, 0.7); at(muzzle, 0, -0.048, 0.095);
  const teeth = box(0.05, 0.016, 0.012, wht); at(teeth, 0, -0.055, 0.135);
  headP.add(head, face, earL, earR, eyeL, eyeR, muzzle, teeth);

  const armL = new THREE.Group(); at(armL, 0.15, 0.36, 0.02);
  const armLm = cyl(0.032, 0.028, 0.24, fur); at(armLm, 0, -0.12, 0); armL.add(armLm);
  const handL = sphere(0.038, skin); at(handL, 0, -0.245, 0); armL.add(handL);
  const armR = new THREE.Group(); at(armR, -0.15, 0.36, 0.02);
  const armRm = cyl(0.032, 0.028, 0.24, fur); at(armRm, 0, -0.12, 0); armR.add(armRm);
  const handR = sphere(0.038, skin); at(handR, 0, -0.245, 0); armR.add(handR);

  const legL = sphere(0.055, fur); legL.scale.set(1, 0.8, 1.5); at(legL, 0.085, 0.055, 0.06);
  const legR = sphere(0.055, fur); legR.scale.set(1, 0.8, 1.5); at(legR, -0.085, 0.055, 0.06);

  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.014, 8, 24, Math.PI * 1.5), fur);
  at(tail, 0, 0.20, -0.16); tail.rotation.y = Math.PI / 2; tail.rotation.z = 0.6;

  // the toothbrush lives in the left hand and only shows during brushing
  const brush = new THREE.Group();
  const handle = box(0.012, 0.11, 0.012, mat(0x3f8fd0)); at(handle, 0, 0.05, 0);
  const bristle = box(0.022, 0.012, 0.026, wht); at(bristle, 0, 0.108, 0);
  brush.add(handle, bristle); at(brush, 0, -0.26, 0.01);
  brush.visible = false; armL.add(brush);

  g.add(body, headP, armL, armR, legL, legR, tail);
  const lab = label('Affe'); at(lab, 0, 0.70, 0);
  g.add(lab);
  return { root: g, p: { body: body, head: headP, armL: armL, armR: armR, brush: brush, teeth: teeth } };
}

function updateMonkey(o, dt, c) {
  const p = o.p, t = c.t;
  p.body.scale.y = 1.15 + Math.sin(t * 1.6) * 0.03;

  if (task && task.animal === o.id) {
    // driven by the running routine, not by the time of day
    if (task.kind === 'brush') {
      p.brush.visible = true;
      p.armL.rotation.x = -1.45;
      p.armL.rotation.z = -0.35 + Math.sin(t * 7) * 0.30;      // scrubbing
      p.head.rotation.y = Math.sin(t * 3.5) * 0.16;
      p.armR.rotation.x = Math.sin(t * 1.2) * 0.15;
      p.teeth.scale.y = 1 + Math.sin(t * 7) * 0.2;
      return;
    }
    if (task.kind === 'shower') {
      p.brush.visible = false;
      p.armL.rotation.x = -2.2 + Math.sin(t * 3) * 0.4;
      p.armR.rotation.x = -2.2 + Math.sin(t * 3 + 1.7) * 0.4;
      p.head.rotation.x = Math.sin(t * 1.6) * 0.2;
      o.root.rotation.y = o.baseRy + Math.sin(t * 0.9) * 0.5;
      return;
    }
    if (task.kind === 'tidy') {
      p.brush.visible = false;
      const u = (t * 0.8) % 2;
      p.armL.rotation.x = u < 1 ? -0.2 - u * 1.1 : -1.3 + (u - 1) * 1.1;
      p.armR.rotation.x = p.armL.rotation.x * 0.6;
      p.body.rotation.x = u < 1 ? u * 0.45 : (2 - u) * 0.45;
      p.head.rotation.x = p.body.rotation.x * 0.5;
      return;
    }
  }

  p.brush.visible = false;
  p.body.rotation.x = 0;
  o.root.rotation.y = o.baseRy;
  if (c.phase === 'morning') {
    p.armL.rotation.x = -2.4 + Math.sin(t * 0.8) * 0.25;       // stretching, yawning
    p.armR.rotation.x = -2.4 + Math.sin(t * 0.8 + 0.5) * 0.25;
    p.head.rotation.x = -0.25 + Math.sin(t * 0.6) * 0.12;
    p.head.rotation.y = 0;
  } else if (c.phase === 'day') {
    p.armL.rotation.x = Math.sin(t * 1.4) * 0.35;
    p.armR.rotation.x = Math.sin(t * 1.4 + Math.PI) * 0.35;
    p.head.rotation.y = Math.sin(t * 0.5) * 0.5;               // looking around
    p.head.rotation.x = 0;
  } else {
    p.armL.rotation.x = -0.15; p.armR.rotation.x = -0.15;
    p.head.rotation.x = 0.35 + Math.sin(t * 0.7) * 0.06;       // dozing off
    p.head.rotation.y = 0;
  }
}

function pokeMonkey(o) {
  openTaskMenu();
  return null;
}

/* ---------------------------- registry ---------------------------- */

const SPECIES = [
  {
    id: 'dog', name: 'Hund', emoji: '\u{1F415}', surface: 'floor',
    where: 'Hinter der Wohnungstür, auf den Boden.',
    why: 'Begrüßung und Ankommen.',
    build: buildDog, update: updateDog, poke: pokeDog
  },
  {
    id: 'parrots', name: 'Papageien', emoji: '\u{1F99C}', surface: 'shelf',
    where: 'Auf einen Schrank oder ein Regal.',
    why: 'Zusammensein, Tagesrhythmus.',
    build: buildParrots, update: updateParrots, poke: pokeParrots
  },
  {
    id: 'frog', name: 'Frosch', emoji: '\u{1F438}', surface: 'floor',
    where: 'Irgendwo auf den Boden - er hüpft von dort weiter.',
    why: 'Putzen, und zwar wirklich.',
    build: buildFrog, update: updateFrog, poke: pokeFrog
  },
  {
    id: 'monkey', name: 'Affe', emoji: '\u{1F412}', surface: 'floor',
    where: 'Ins Bad, neben das Waschbecken oder auf den Boden.',
    why: 'Zähneputzen, Duschen, Aufräumen.',
    build: buildMonkey, update: updateMonkey, poke: pokeMonkey
  }
];
const byId = id => SPECIES.filter(s => s.id === id)[0];

/* ============================ SCENE ============================ */

let renderer, scene, camera, world, reticle, dirtGroup;
let mode = null;                 // 'WebXR' | 'Kamera' | null
let xrSession = null, xrRef = null, hitSource = null, hitOk = false, xrController = null;
let animals = {};                // id -> {id, spec, root, p, base, baseRy}
let clock0 = performance.now() / 1000;
let placing = null, nudging = null;
let heading = null, worldYaw = 0;
let camHome = new THREE.Vector3();   // camera position in home frame
let devQuat = new THREE.Quaternion(), haveOrient = false;

function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.02, 60);
  camera.position.set(0, 1.55, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x604030, 1.05));
  const d = new THREE.DirectionalLight(0xfff0dd, 0.75);
  d.position.set(1.2, 3, 1.4); scene.add(d);

  world = new THREE.Group(); scene.add(world);
  dirtGroup = new THREE.Group(); world.add(dirtGroup);

  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.055, 0.075, 28).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xf0a95c })
  );
  reticle.visible = false; reticle.matrixAutoUpdate = false;
  scene.add(reticle);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.domElement.className = 'ar';
  renderer.domElement.style.display = 'none';
  document.body.appendChild(renderer.domElement);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

/* ---- placing and removing animals ---- */

function spawn(id, pos, ry) {
  despawn(id);
  const spec = byId(id);
  const built = spec.build();
  built.root.position.copy(pos);
  built.root.rotation.y = ry || 0;
  world.add(built.root);
  animals[id] = {
    id: id, spec: spec, root: built.root, p: built.p,
    base: pos.clone(), baseRy: ry || 0, poke: 0
  };
  return animals[id];
}
function despawn(id) {
  const a = animals[id];
  if (!a) return;
  world.remove(a.root);
  a.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  delete animals[id];
}
function persist(id) {
  const a = animals[id];
  if (!a) return;
  layout[id] = { x: a.base.x, y: a.base.y, z: a.base.z, ry: a.baseRy };
  save(K_LAYOUT, layout);
  renderAnimalList();
}
function restoreLayout() {
  let n = 0;
  Object.keys(layout).forEach(id => {
    if (!byId(id)) return;
    const l = layout[id];
    spawn(id, new THREE.Vector3(l.x, l.y, l.z), l.ry);
    n++;
  });
  rebuildDirt();
  updateHud();
  return n;
}

/* ---- dirt ---- */

function addDirt(x, z, kind) {
  if (dirt.length >= 24) return;
  const e = { id: 'd' + now() + Math.floor(Math.random() * 1000), x: x, z: z, kind: kind, born: now() };
  dirt.push(e); save(K_DIRT, dirt);
  makeDirtMesh(e);
  updateHud();
}
function dropShell(o) {
  // nut shells land under the perch
  const a = Math.random() * Math.PI * 2, r = 0.15 + Math.random() * 0.35;
  addDirt(o.root.position.x + Math.cos(a) * r, o.root.position.z + Math.sin(a) * r, 'shell');
}
const dirtMeshes = {};
function makeDirtMesh(e) {
  const m = e.kind === 'shell'
    ? new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mat(0x9a7a4a))
    : new THREE.Mesh(new THREE.CircleGeometry(0.10, 18).rotateX(-Math.PI / 2), mat(0x6b4a2c, { transparent: true, opacity: 0.9 }));
  m.position.set(e.x, e.kind === 'shell' ? 0.02 : 0.004, e.z);
  if (e.kind === 'shell') m.scale.set(1, 0.5, 1.4);
  dirtGroup.add(m); dirtMeshes[e.id] = m;
}
function rebuildDirt() {
  Object.keys(dirtMeshes).forEach(k => { dirtGroup.remove(dirtMeshes[k]); delete dirtMeshes[k]; });
  dirt.forEach(makeDirtMesh);
}
function removeDirt(e) {
  const m = dirtMeshes[e.id];
  if (m) { dirtGroup.remove(m); delete dirtMeshes[e.id]; }
  dirt = dirt.filter(d => d.id !== e.id);
  save(K_DIRT, dirt);
  logEvent('clean');
  updateHud();
}

/* The cleaning check. A spot only disappears if the phone actually spends time
   right above it AND keeps moving - the proxy for a hand wiping the floor.
   Standing still over the spot does nothing. */
const CLEAN_DIST = 0.75, CLEAN_TIME = 4.0, CLEAN_MOVE = 1.1;
let cleanState = null, lastCamXZ = null;
function updateCleaning(dt) {
  if (mode !== 'WebXR') return;                 // needs positional tracking
  const cx = camHome.x, cz = camHome.z;
  let moved = 0;
  if (lastCamXZ) moved = Math.hypot(cx - lastCamXZ[0], cz - lastCamXZ[1]);
  lastCamXZ = [cx, cz];

  let near = null, best = 1e9;
  dirt.forEach(e => {
    const d = Math.hypot(e.x - cx, e.z - cz);
    if (d < CLEAN_DIST && d < best) { best = d; near = e; }
  });
  if (!near) { cleanState = null; return; }
  if (!cleanState || cleanState.id !== near.id) cleanState = { id: near.id, t: 0, m: 0 };
  cleanState.t += dt;
  cleanState.m += moved;

  const prog = clamp(Math.min(cleanState.t / CLEAN_TIME, cleanState.m / CLEAN_MOVE), 0, 1);
  const m = dirtMeshes[near.id];
  if (m) { const s = 1 - prog * 0.9; m.scale.set(s, near.kind === 'shell' ? 0.5 * s : s, s * (near.kind === 'shell' ? 1.4 : 1)); }
  if (cleanState.t >= CLEAN_TIME && cleanState.m >= CLEAN_MOVE) {
    removeDirt(near);
    cleanState = null;
    toast(dirt.length ? ('Sauber. Noch ' + dirt.length + ' Stellen.') : 'Die ganze Wohnung ist sauber. Gut gemacht.');
  } else {
    hint('Wisch weiter - ' + Math.round(prog * 100) + '%');
  }
}

/* ============================ ROUTINE TASKS ============================ */

const TASKS = {
  brush: { title: 'Zähneputzen', sub: 'Der Affe putzt mit. Bleib in seiner Nähe.', sec: 180, near: 3.0 },
  shower: { title: 'Duschen', sub: 'Der Affe duscht mit.', sec: 300, near: 4.0 },
  tidy: { title: 'Aufräumen', sub: 'Wäsche einsammeln, gemeinsam.', sec: 120, near: 4.0 }
};
let task = null;

function startTask(kind, animalId) {
  const T = TASKS[kind];
  task = { kind: kind, animal: animalId, left: T.sec, paused: false };
  $('taskTitle').textContent = T.title;
  $('task').classList.add('on');
  $('chooser').classList.remove('on');
  updateTaskUI();
}
function stopTask(done) {
  if (!task) return;
  const T = TASKS[task.kind];
  const spent = T.sec - task.left;
  if (done) {
    logEvent(task.kind, Math.round(T.sec));
    toast(T.title + ' geschafft - ' + Math.round(T.sec / 60 * 10) / 10 + ' Minuten.');
  } else if (spent > 20) {
    logEvent(task.kind, Math.round(spent));
    toast('Abgebrochen nach ' + Math.round(spent) + ' s. Zählt trotzdem halb.');
  }
  task = null;
  $('task').classList.remove('on');
}
function updateTask(dt) {
  if (!task) return;
  const T = TASKS[task.kind];
  const a = animals[task.animal];
  const far = a ? a.base.distanceTo(camHome) > T.near : false;
  task.paused = far && mode === 'WebXR';
  if (!task.paused) task.left -= dt;
  if (task.left <= 0) { stopTask(true); return; }
  updateTaskUI();
}
function updateTaskUI() {
  const T = TASKS[task.kind];
  const s = Math.max(0, Math.ceil(task.left));
  $('taskSub').textContent = task.paused
    ? 'Pausiert - geh zurück zum Affen.'
    : T.sub + '  Noch ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  $('taskBar').style.width = ((1 - task.left / T.sec) * 100).toFixed(1) + '%';
}
function openTaskMenu() {
  const list = $('chList');
  $('chTitle').textContent = 'Was macht der Affe?';
  list.innerHTML = '';
  Object.keys(TASKS).forEach(k => {
    const T = TASKS[k];
    const b = document.createElement('button');
    b.className = 'row';
    b.innerHTML = '<span class="em">' + (k === 'brush' ? '\u{1FAA5}' : k === 'shower' ? '\u{1F6BF}' : '\u{1F455}') +
      '</span><span class="m"><span class="t1">' + T.title + '</span>' +
      '<span class="t2">' + Math.round(T.sec / 60) + ' Minuten</span></span>';
    b.onclick = () => startTask(k, 'monkey');
    list.appendChild(b);
  });
  $('chooser').classList.add('on');
}

/* ============================ COMPASS ============================ */

function onOrient(e) {
  if (e.alpha == null && typeof e.webkitCompassHeading !== 'number') return;
  let h = null;
  if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
  else if (e.absolute) h = 360 - e.alpha;
  if (h != null) {
    const so = (screen.orientation && screen.orientation.angle) || 0;
    heading = (h + so + 360) % 360;
  }
  // the gyro quaternion is only needed by the camera fallback
  if (e.alpha != null) {
    const eu = new THREE.Euler(THREE.MathUtils.degToRad(e.beta || 0), THREE.MathUtils.degToRad(e.alpha || 0),
      THREE.MathUtils.degToRad(-(e.gamma || 0)), 'YXZ');
    devQuat.setFromEuler(eu);
    devQuat.multiply(new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2));
    const so = THREE.MathUtils.degToRad(-((screen.orientation && screen.orientation.angle) || 0));
    devQuat.multiply(new THREE.Quaternion(0, 0, Math.sin(so / 2), Math.cos(so / 2)));
    haveOrient = true;
  }
}
addEventListener('deviceorientationabsolute', onOrient, true);
addEventListener('deviceorientation', onOrient, true);

function camYawDeg() {
  const cam = (renderer.xr && renderer.xr.isPresenting) ? renderer.xr.getCamera(camera) : camera;
  cam.updateMatrixWorld(true);
  const f = new THREE.Vector3(0, 0, -1).transformDirection(cam.matrixWorld);
  return (Math.atan2(f.x, -f.z) * 180 / Math.PI + 360) % 360;
}
/* Rotating `world` by (compass heading - view yaw) puts the saved home frame
   back where it was, whichever way the user happened to face at session start. */
function syncNorth(quiet) {
  if (heading == null) { if (!quiet) toast('Noch kein Kompass - beweg das Telefon in einer Acht.'); return false; }
  worldYaw = ((heading - camYawDeg()) % 360 + 360) % 360;
  world.rotation.y = THREE.MathUtils.degToRad(worldYaw);
  return true;
}

/* ============================ AR SESSION ============================ */

async function startXR() {
  if (!navigator.xr) throw new Error('Dieser Browser kann kein WebXR.');
  const ok = await navigator.xr.isSessionSupported('immersive-ar');
  if (!ok) throw new Error('immersive-ar nicht unterstützt. Sind die Google Play-Dienste für AR installiert?');
  $('xrui').classList.add('on');            // Chrome rejects a hidden overlay root
  let s;
  try {
    s = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['dom-overlay', 'hit-test'],
      domOverlay: { root: $('xrui') }
    });
  } catch (err) { $('xrui').classList.remove('on'); throw err; }

  xrSession = s; mode = 'WebXR';
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  await renderer.xr.setSession(s);
  xrRef = renderer.xr.getReferenceSpace();
  s.addEventListener('end', endAR);

  const has = f => (s.enabledFeatures ? s.enabledFeatures.indexOf(f) >= 0 : true);
  hitOk = has('hit-test') && typeof s.requestHitTestSource === 'function';
  if (hitOk) {
    try {
      const viewer = await s.requestReferenceSpace('viewer');
      hitSource = await s.requestHitTestSource({ space: viewer });
    } catch (e) { hitOk = false; hitSource = null; }
  }

  xrController = renderer.xr.getController(0);
  xrController.addEventListener('select', onSelect);
  scene.add(xrController);

  enterAR();
  let tries = 0;
  const iv = setInterval(() => { if (syncNorth(true) || ++tries > 12) clearInterval(iv); }, 500);

  renderer.setAnimationLoop((tms, frame) => {
    if (frame) updateHitTest(frame);
    tick();
    renderer.render(scene, camera);
  });
}

async function startCam() {
  const v = $('video');
  const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  v.srcObject = st; await v.play(); v.style.display = 'block';
  mode = 'Kamera';
  enterAR();
  renderer.domElement.addEventListener('pointerdown', onCamTap);
  renderer.setAnimationLoop(() => {
    if (haveOrient) camera.quaternion.copy(devQuat);
    camera.position.set(0, 1.55, 0);
    tick();
    renderer.render(scene, camera);
  });
}

function enterAR() {
  $('app').classList.add('hidden');
  $('xrui').classList.add('on');
  renderer.domElement.style.display = 'block';
  $('hMode').textContent = mode + (mode === 'WebXR' && !hitOk ? ' (ohne Hit-Test)' : '');
  $('hPhase').textContent = PHASE_LABEL[phaseNow()];
  syncNorth(true);
  const n = restoreLayout();
  hint(n ? 'Layout geladen. Tier antippen für Interaktion.'
    : 'Noch nichts platziert - tipp auf Platzieren.');
  $('bNudge').disabled = false;
  updateHud();
}

function endAR() {
  renderer.setAnimationLoop(null);
  stopTask(false);
  if (hitSource) { try { hitSource.cancel(); } catch (e) {} hitSource = null; }
  hitOk = false;
  if (xrController) { xrController.removeEventListener('select', onSelect); scene.remove(xrController); xrController = null; }
  if (xrSession) { try { xrSession.end(); } catch (e) {} xrSession = null; }
  renderer.xr.enabled = false;
  const v = $('video');
  if (v.srcObject) { v.srcObject.getTracks().forEach(t => t.stop()); v.srcObject = null; v.style.display = 'none'; }
  renderer.domElement.removeEventListener('pointerdown', onCamTap);
  renderer.domElement.style.display = 'none';
  Object.keys(animals).forEach(despawn);
  reticle.visible = false;
  placing = nudging = null;
  $('xrui').classList.remove('on');
  $('chooser').classList.remove('on');
  $('task').classList.remove('on');
  $('app').classList.remove('hidden');
  mode = null;
  renderAnimalList(); renderStats(); renderDataSummary();
}

/* ---- hit-test ---- */

let hitPose = null;
function updateHitTest(frame) {
  if (!hitOk || !hitSource || !xrRef) { reticle.visible = false; return; }
  const res = frame.getHitTestResults(hitSource);
  if (!res.length) { hitPose = null; reticle.visible = false; return; }
  const pose = res[0].getPose(xrRef);
  if (!pose) { hitPose = null; reticle.visible = false; return; }
  hitPose = pose;
  reticle.visible = !!(placing || nudging);
  reticle.matrix.fromArray(pose.transform.matrix);
}

/* Where a new animal goes: the hit-test point if we have one, otherwise a
   guess 1.4 m in front of the phone at a height that suits the species. */
function targetPoint(spec) {
  const p = new THREE.Vector3();
  if (hitPose) {
    p.set(hitPose.transform.position.x, hitPose.transform.position.y, hitPose.transform.position.z);
  } else {
    const cam = (renderer.xr && renderer.xr.isPresenting) ? renderer.xr.getCamera(camera) : camera;
    cam.updateMatrixWorld(true);
    const f = new THREE.Vector3(0, 0, -1).transformDirection(cam.matrixWorld);
    f.y = 0; f.normalize();
    p.copy(cam.getWorldPosition(new THREE.Vector3())).addScaledVector(f, 1.4);
    p.y = spec.surface === 'shelf' ? Math.max(0.8, camera.position.y - 0.55) : 0;
  }
  return world.worldToLocal(p);
}

/* ---- tapping ---- */

const _ray = new THREE.Raycaster();
function onSelect() {
  if (!xrController) return;
  const m = xrController.matrixWorld;
  const o = new THREE.Vector3().setFromMatrixPosition(m);
  const d = new THREE.Vector3(0, 0, -1).transformDirection(m);
  handleTap(o, d);
}
function onCamTap(ev) {
  const nd = new THREE.Vector2((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
  _ray.setFromCamera(nd, camera);
  handleTap(_ray.ray.origin.clone(), _ray.ray.direction.clone());
}
function handleTap(origin, dir) {
  if (placing) {
    const spec = placing; placing = null;
    const p = targetPoint(spec);
    const a = spawn(spec.id, p, 0);
    a.root.lookAt(world.worldToLocal(origin.clone().setY(p.y)));
    a.root.rotation.y += Math.PI;      // the models are built facing +Z, lookAt aims -Z
    a.baseRy = a.root.rotation.y;
    persist(spec.id);
    reticle.visible = false;
    toast(spec.name + ' platziert.');
    hint('Antippen für Interaktion.');
    updateHud();
    return;
  }
  if (nudging) {
    const a = animals[nudging]; nudging = null;
    if (a) {
      const p = targetPoint(a.spec);
      a.base.copy(p); a.root.position.copy(p);
      if (a.p.hop) a.p.hop = null;
      persist(a.id);
      toast(a.spec.name + ' verschoben.');
    }
    reticle.visible = false;
    return;
  }
  _ray.set(origin, dir);
  const roots = Object.keys(animals).map(k => animals[k].root);
  const hits = _ray.intersectObjects(roots, true);
  if (!hits.length) return;
  let node = hits[0].object;
  while (node.parent && roots.indexOf(node) < 0) node = node.parent;
  const a = Object.keys(animals).map(k => animals[k]).filter(x => x.root === node)[0];
  if (!a) return;
  const msg = a.spec.poke(a);
  if (msg) toast(typeof msg === 'function' ? msg({ phase: phaseNow() }) : msg);
}

/* ---- chooser ---- */

function openChooser(forNudge) {
  const list = $('chList');
  $('chTitle').textContent = forNudge ? 'Welches Tier verschieben?' : 'Tier platzieren';
  list.innerHTML = '';
  const items = forNudge ? SPECIES.filter(s => animals[s.id]) : SPECIES;
  if (!items.length) {
    list.innerHTML = '<p class="muted" style="margin:4px 6px">Noch kein Tier in der Szene.</p>';
  }
  items.forEach(s => {
    const placed = !!layout[s.id];
    const b = document.createElement('button');
    b.className = 'row ' + s.id;
    b.innerHTML = '<span class="em">' + s.emoji + '</span><span class="m">' +
      '<span class="t1">' + s.name + '</span><span class="t2">' + s.where + '</span></span>' +
      '<span class="st' + (placed ? ' set' : '') + '">' + (placed ? 'gesetzt' : 'neu') + '</span>';
    b.onclick = () => {
      $('chooser').classList.remove('on');
      if (forNudge) { nudging = s.id; hint('Tipp auf die neue Stelle.'); }
      else { placing = s; hint('Tipp auf die Stelle für ' + s.name + '.'); }
    };
    list.appendChild(b);
  });
  $('chooser').classList.add('on');
}

/* ---- per-frame ---- */

let lastT = 0;
function tick() {
  const t = performance.now() / 1000 - clock0;
  const dt = Math.min(0.05, lastT ? t - lastT : 0.016);
  lastT = t;

  const cam = (renderer.xr && renderer.xr.isPresenting) ? renderer.xr.getCamera(camera) : camera;
  cam.updateMatrixWorld(true);
  camHome.copy(cam.getWorldPosition(new THREE.Vector3()));
  world.worldToLocal(camHome);

  const phase = phaseNow();
  Object.keys(animals).forEach(k => {
    const a = animals[k];
    const ctx = { t: t, phase: phase, dist: a.base.distanceTo(camHome) };
    a.spec.update(a, dt, ctx);
    if (a.poke > 0) { a.poke = Math.max(0, a.poke - dt * 1.5); a.root.scale.setScalar(1 + a.poke * 0.12); }
  });

  updateCleaning(dt);
  updateTask(dt);
}

/* ---- HUD ---- */

let toastTimer = null;
function toast(s) {
  const el = $('toast');
  if (!el || !$('xrui').classList.contains('on')) { $('msg').textContent = s; return; }
  el.textContent = s; el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 3600);
}
function hint(s) { $('hHint').textContent = s; }
function updateHud() {
  $('hCount').textContent = Object.keys(animals).length;
  $('hPhase').textContent = PHASE_LABEL[phaseNow()] + (dirt.length ? ' · ' + dirt.length + ' Dreck' : '');
}

/* ============================ SCREENS ============================ */

function showScreen(id) {
  Array.prototype.forEach.call(document.querySelectorAll('.screen'), s => s.classList.toggle('on', s.id === id));
  Array.prototype.forEach.call(document.querySelectorAll('#tabbar button'), b => b.classList.toggle('on', b.dataset.s === id));
  if (id === 'sStats') renderStats();
  if (id === 'sData') renderDataSummary();
  if (id === 'sAnimals') renderAnimalList();
}

function renderAnimalList() {
  const el = $('animalList');
  el.innerHTML = '';
  SPECIES.forEach(s => {
    const placed = !!layout[s.id];
    const d = document.createElement('div');
    d.className = 'row ' + s.id;
    d.innerHTML = '<span class="em">' + s.emoji + '</span><span class="m">' +
      '<span class="t1">' + s.name + '</span>' +
      '<span class="t2">' + s.where + ' &middot; ' + s.why + '</span></span>' +
      '<span class="st' + (placed ? ' set' : '') + '">' + (placed ? 'platziert' : 'offen') + '</span>';
    el.appendChild(d);
  });
  $('anchorNote').innerHTML = 'Android kann Positionen nicht ohne Cloud dauerhaft verankern. ' +
    'Deshalb merkt sich die App die Plätze relativ zu deinem <b>Startplatz</b> und dreht sie ' +
    'per Kompass wieder richtig. Starte die AR immer von derselben Stelle, dann sitzt alles. ' +
    'Kleine Abweichungen korrigierst du mit <b>Verschieben</b>.';
}

function lastEventOf(type) {
  for (let i = logbook.length - 1; i >= 0; i--) if (logbook[i].type === type) return logbook[i];
  return null;
}
const dayKey = ms => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

function renderStats() {
  const el = $('statsBody');
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(dayKey(now() - i * 86400000));
  const agg = {};
  days.forEach(d => agg[d] = { brush: 0, brushSec: 0, clean: 0, greet: 0, shower: 0, tidy: 0 });
  logbook.forEach(e => {
    const k = dayKey(e.t);
    if (!agg[k]) return;
    if (e.type === 'brush') { agg[k].brush++; agg[k].brushSec += e.dur; }
    else if (agg[k][e.type] != null) agg[k][e.type]++;
  });

  const today = agg[days[6]];
  const goodDays = days.filter(d => agg[d].brushSec >= 120).length;
  const cleanTotal = days.reduce((s, d) => s + agg[d].clean, 0);
  const brushTotal = days.reduce((s, d) => s + agg[d].brushSec, 0);

  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) { if (agg[days[i]].brushSec >= 120) streak++; else break; }

  let h = '';
  h += '<div class="card"><h2 style="margin-bottom:8px">Heute</h2>' +
    '<div class="chk"><span class="i">\u{1FAA5}</span><span>' + today.brush + ' x Zähneputzen, zusammen ' + fmtSec(today.brushSec) + '</span></div>' +
    '<div class="chk"><span class="i">\u{1F9FD}</span><span>' + today.clean + ' Stellen geputzt</span></div>' +
    '<div class="chk" style="border:0"><span class="i">\u{1F415}</span><span>' + today.greet + ' x vom Hund begrüßt</span></div>' +
    '</div>';

  h += '<h3>Regelmäßigkeit (7 Tage)</h3><div class="card">' +
    '<p style="margin:0 0 6px">An <b>' + goodDays + ' von 7</b> Tagen mindestens 2 Minuten geputzt.</p>' +
    '<div class="bar"><i style="width:' + (goodDays / 7 * 100).toFixed(0) + '%"></i></div>' +
    '<p class="muted" style="margin:8px 0 0">Aktuelle Serie: ' + streak + ' Tag' + (streak === 1 ? '' : 'e') +
    ' &middot; Woche gesamt: ' + fmtSec(brushTotal) + ' geputzt, ' + cleanTotal + ' Stellen sauber gemacht.</p></div>';

  h += '<h3>Letzte 7 Tage</h3><div class="card" style="overflow-x:auto"><table class="stats"><tr>' +
    '<th>Tag</th><th>Zähne</th><th>Dauer</th><th>Putzen</th><th>Begr.</th></tr>';
  days.forEach(d => {
    const a = agg[d];
    const wd = new Date(d + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
    h += '<tr><td>' + wd + '</td><td class="n">' + a.brush + '</td><td class="n">' + fmtSec(a.brushSec) +
      '</td><td class="n">' + a.clean + '</td><td class="n">' + a.greet + '</td></tr>';
  });
  h += '</table></div>';

  if (!logbook.length) h += '<div class="note">Noch keine Einträge. Sie entstehen, wenn du in AR eine Routine startest oder Dreck wegputzt.</div>';
  else h += '<div class="note">Die Zahlen sind ein Angebot, kein Urteil. Wenn dich das eher stresst als hilft, lösch sie unter Daten.</div>';
  el.innerHTML = h;
}
function fmtSec(s) {
  s = Math.round(s);
  if (s < 60) return s + ' s';
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' min';
}

function renderDataSummary() {
  $('dataSummary').innerHTML =
    '<div class="chk"><span class="i">\u{1F4CD}</span><span>' + Object.keys(layout).length + ' Tierplaetze</span></div>' +
    '<div class="chk"><span class="i">\u{1F4DD}</span><span>' + logbook.length + ' Routine-Einträge</span></div>' +
    '<div class="chk" style="border:0"><span class="i">\u{1FAB2}</span><span>' + dirt.length + ' offene Dreckstellen</span></div>';
}

/* ---- device check ---- */

async function deviceCheck() {
  const rows = [];
  const secure = isSecureContext;
  rows.push([secure ? 'ok' : 'no', secure ? 'Sichere Verbindung (HTTPS)' : 'Kein HTTPS - WebXR und Kamera bleiben gesperrt']);

  let xrOk = false;
  if (navigator.xr) {
    try { xrOk = await navigator.xr.isSessionSupported('immersive-ar'); } catch (e) {}
    rows.push([xrOk ? 'ok' : 'no', xrOk ? 'WebXR AR verfügbar' : 'WebXR AR nicht verfügbar - Google Play-Dienste für AR prüfen']);
  } else {
    rows.push(['no', 'Kein WebXR in diesem Browser - nimm Chrome für Android']);
  }
  const cam = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  rows.push([cam ? 'ok' : 'no', cam ? 'Kamera ansprechbar (Fallback-Modus)' : 'Keine Kamera-API']);
  rows.push([heading != null ? 'ok' : 'wa', heading != null ? 'Kompass liefert Richtung' : 'Kompass noch still - Telefon einmal in einer Acht bewegen']);

  $('devcheck').innerHTML = rows.map((r, i) =>
    '<div class="chk"' + (i === rows.length - 1 ? ' style="border:0"' : '') + '>' +
    '<span class="i ' + r[0] + '">' + (r[0] === 'ok' ? '✔' : r[0] === 'wa' ? '!' : '✕') + '</span><span>' + r[1] + '</span></div>').join('');

  $('bStartXR').disabled = !xrOk;
  $('bStartCam').disabled = !cam;
  if (!xrOk && cam) $('bStartCam').classList.add('p');
}

/* ============================ BOOT ============================ */

function boot() {
  initScene();
  renderAnimalList(); renderStats(); renderDataSummary();
  $('phaseBadge').textContent = PHASE_LABEL[phaseNow()];
  deviceCheck();
  setInterval(deviceCheck, 4000);

  Array.prototype.forEach.call(document.querySelectorAll('#tabbar button'), b => {
    b.onclick = () => showScreen(b.dataset.s);
  });
  $('lnkData').onclick = e => { e.preventDefault(); showScreen('sData'); };

  $('bStartXR').onclick = () => {
    $('msg').textContent = '';
    startXR().catch(err => { $('msg').textContent = err.message || String(err); });
  };
  $('bStartCam').onclick = () => {
    $('msg').textContent = '';
    startCam().catch(err => { $('msg').textContent = err.message || String(err); });
  };

  $('bPlace').onclick = () => {
    if ($('chooser').classList.contains('on')) $('chooser').classList.remove('on');
    else openChooser(false);
  };
  $('bNudge').onclick = () => openChooser(true);
  $('bRestore').onclick = () => {
    syncNorth(false);
    const n = restoreLayout();
    toast(n ? (n + ' Tiere zurückgeholt.') : 'Es ist noch nichts gespeichert.');
  };
  $('bExit').onclick = () => { if (xrSession) xrSession.end(); else endAR(); };
  $('taskStop').onclick = () => stopTask(false);

  $('bClearLayout').onclick = () => {
    if (!confirm('Alle Tierplaetze löschen?')) return;
    layout = {}; save(K_LAYOUT, layout);
    Object.keys(animals).forEach(despawn);
    renderAnimalList(); updateHud();
  };
  $('bExport').onclick = () => {
    const blob = new Blob([JSON.stringify({ layout: layout, log: logbook, dirt: dirt }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'home-companions-' + dayKey(now()) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  $('bWipe').onclick = () => {
    if (!confirm('Wirklich alles löschen - Plätze, Routinen, Dreck?')) return;
    layout = {}; logbook = []; dirt = [];
    save(K_LAYOUT, layout); save(K_LOG, logbook); save(K_DIRT, dirt);
    Object.keys(animals).forEach(despawn);
    rebuildDirt();
    renderAnimalList(); renderStats(); renderDataSummary(); updateHud();
  };

  // Taps on the overlay UI must not also count as an AR select.
  $('xrui').addEventListener('beforexrselect', e => e.preventDefault());

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
else boot();
