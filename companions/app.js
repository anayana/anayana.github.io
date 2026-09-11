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
  if (!M[k]) {
    M[k] = new THREE.MeshStandardMaterial(Object.assign({
      color: hex, roughness: 0.78, metalness: 0.0
    }, opts || {}));
    // the hex values are sRGB; with an sRGB output encoding they have to be
    // converted or every colour renders a couple of stops too light
    M[k].color.convertSRGBToLinear();
  }
  return M[k];
}
function sphere(r, m, seg) {
  const s = seg || 24;
  return new THREE.Mesh(new THREE.SphereGeometry(r, s, Math.round(s * 0.75)), m);
}
function box(w, h, d, m) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); }
function cyl(rt, rb, h, m) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 20), m); }
function cone(r, h, m) { return new THREE.Mesh(new THREE.ConeGeometry(r, h, 20), m); }
function at(o, x, y, z) { o.position.set(x, y, z); return o; }

/* A soft blob under each animal. Real shadow maps are too costly on a phone,
   and nothing sells "this thing is standing on my floor" like a contact
   shadow - without one the models read as stickers floating in the room. */
let shadowTex = null;
function contactShadow(r) {
  if (!shadowTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    gr.addColorStop(0, 'rgba(0,0,0,0.40)');
    gr.addColorStop(0.5, 'rgba(0,0,0,0.17)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(r * 2.2, r * 2.2).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
  );
  m.position.y = 0.005;
  m.renderOrder = -1;
  return m;
}

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
  const fur = mat(0xbe8843, { roughness: 0.92 }), dark = mat(0x8e5f2e, { roughness: 0.9 }),
        blk = mat(0x1f1812, { roughness: 0.4 }), pink = mat(0xdb8f8f, { roughness: 0.7 });

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
  const skin = mat(0x4f9145, { roughness: 0.55 }), belly = mat(0x93c47d, { roughness: 0.6 }),
        blk = mat(0x121210, { roughness: 0.3 }), wht = mat(0xf0f0e8, { roughness: 0.35 });
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
  const fur = mat(0x6b4c31, { roughness: 0.93 }), skin = mat(0xcb9c72, { roughness: 0.8 }),
        blk = mat(0x141410, { roughness: 0.35 }), wht = mat(0xf2f2ea, { roughness: 0.4 });
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

/* ---------------------------- mumin ---------------------------- */

/* A moomin-shaped troll: one continuous white silhouette, no neck, a very
   large round snout, small ears that barely clear the head, short stubby
   limbs and a thin tail. The body is a stack of overlapping spheres so that
   head and belly read as one pear, not as a snowman. */
function buildMumin() {
  const g = new THREE.Group();
  const white = mat(0xfbfbf8, { roughness: 0.72 });
  const shade = mat(0xeceae4, { roughness: 0.76 });
  const blk = mat(0x24211d, { roughness: 0.45 });

  const torso = new THREE.Group();
  const hip = sphere(0.150, white); hip.scale.set(1.0, 0.92, 0.95); at(hip, 0, 0.165, 0);
  const belly = sphere(0.142, white); belly.scale.set(1.02, 1.02, 0.96); at(belly, 0, 0.255, 0.006);
  const chest = sphere(0.118, white); chest.scale.set(1.0, 1.0, 0.95); at(chest, 0, 0.355, 0.004);
  torso.add(hip, belly, chest);

  const headP = new THREE.Group(); at(headP, 0, 0.475, 0.002);
  const head = sphere(0.132, white); head.scale.set(1.02, 0.98, 1.0);
  // the snout is the whole point of the face: wide, round, and it hangs low
  const snout = sphere(0.092, white); snout.scale.set(1.22, 0.98, 1.30); at(snout, 0, -0.030, 0.082);
  const nosL = sphere(0.0115, blk); at(nosL, 0.030, 0.006, 0.196);
  const nosR = sphere(0.0115, blk); at(nosR, -0.030, 0.006, 0.196);
  // ears sit low and rounded, more like bumps on the skull than horns
  const earL = sphere(0.040, white); earL.scale.set(0.62, 0.92, 0.48); at(earL, 0.104, 0.098, -0.022);
  const earR = sphere(0.040, white); earR.scale.set(0.62, 0.92, 0.48); at(earR, -0.104, 0.098, -0.022);
  const eyeL = sphere(0.0195, blk); eyeL.scale.set(0.92, 1.12, 0.7); at(eyeL, 0.046, 0.072, 0.101);
  const eyeR = sphere(0.0195, blk); eyeR.scale.set(0.92, 1.12, 0.7); at(eyeR, -0.046, 0.072, 0.101);
  const browL = box(0.050, 0.011, 0.011, blk); at(browL, 0.048, 0.112, 0.079);
  const browR = box(0.050, 0.011, 0.011, blk); at(browR, -0.048, 0.112, 0.079);
  // half torus: as built it arcs upwards (a frown), rotated by PI it smiles
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0055, 6, 20, Math.PI), blk);
  at(mouth, 0, -0.082, 0.152);
  headP.add(head, snout, nosL, nosR, earL, earR, eyeL, eyeR, browL, browR, mouth);

  const armL = sphere(0.044, white); armL.scale.set(0.60, 1.15, 0.60); at(armL, 0.146, 0.268, 0.012);
  const armR = sphere(0.044, white); armR.scale.set(0.60, 1.15, 0.60); at(armR, -0.146, 0.268, 0.012);
  const legL = cyl(0.044, 0.050, 0.085, white); at(legL, 0.058, 0.043, 0.012);
  const legR = cyl(0.044, 0.050, 0.085, white); at(legR, -0.058, 0.043, 0.012);
  const footL = sphere(0.048, shade); footL.scale.set(1, 0.38, 1.25); at(footL, 0.058, 0.016, 0.026);
  const footR = sphere(0.048, shade); footR.scale.set(1, 0.38, 1.25); at(footR, -0.058, 0.016, 0.026);

  const tail = new THREE.Group(); at(tail, 0, 0.175, -0.135);
  const tailM = cyl(0.010, 0.014, 0.085, white); at(tailM, 0, 0.015, -0.025); tailM.rotation.x = -0.9;
  const tuft = sphere(0.026, white); at(tuft, 0, 0.045, -0.056);
  tail.add(tailM, tuft);

  g.add(torso, headP, armL, armR, legL, legR, footL, footR, tail);
  const lab = label('Mumin'); at(lab, 0, 0.75, 0);
  g.add(lab);
  return {
    root: g,
    p: {
      body: belly, torso: torso, head: headP, eyes: [eyeL, eyeR], brows: [browL, browR],
      mouth: mouth, arms: [armL, armR], tail: tail,
      mood: 0, target: 0, switchAt: 0
    }
  };
}

/* How long each face is held, in seconds: [friendly, cross]. The mood always
   alternates - the time of day only decides which one you catch more often. */
const MUMIN_HOLD = { morning: [4, 6], day: [7, 3], evening: [4, 7] };

function updateMumin(o, dt, c) {
  const p = o.p, t = c.t;
  const hold = MUMIN_HOLD[c.phase];
  if (t > p.switchAt) {
    p.target = p.target ? 0 : 1;
    p.switchAt = t + hold[p.target];
  }
  p.mood += (p.target - p.mood) * Math.min(1, dt * 5);
  const m = p.mood;

  p.brows[0].rotation.z = -0.16 + m * 0.80;      // inner ends drop when cross
  p.brows[1].rotation.z = 0.16 - m * 0.80;
  p.brows.forEach(b => b.position.y = 0.112 - m * 0.026);
  p.eyes.forEach(e => e.scale.y = 1.12 * (1 - m * 0.36));
  p.mouth.rotation.z = m > 0.5 ? 0 : Math.PI;    // flip outright, no sideways in between
  p.head.rotation.x = m * 0.13 + Math.sin(t * 1.1) * 0.05;
  p.head.rotation.y = Math.sin(t * 0.6) * (0.26 - m * 0.20);
  p.body.scale.y = 1.02 + Math.sin(t * 1.4) * 0.028;      // breathing
  p.tail.rotation.y = Math.sin(t * 0.9) * 0.22 * (1 - m);
  p.arms.forEach((a, i) => a.rotation.z = (i ? -1 : 1) * (0.10 + m * 0.38));
  o.root.rotation.y = o.baseRy + Math.sin(t * 0.5) * 0.10 * (1 - m);
}

function pokeMumin(o) {
  o.poke = 1;
  o.p.target = o.p.target ? 0 : 1;
  o.p.switchAt = lastT + 8;                      // hold the face you asked for
  return () => o.p.target
    ? 'Jetzt guckt der Mumin böse. Das geht wieder vorbei.'
    : 'Der Mumin guckt wieder freundlich.';
}

/* ---------------------------- shared helpers ---------------------------- */

const _yUp = new THREE.Vector3(0, 1, 0);
/* Stretch a unit-height cylinder so it spans `from` to `to`. Used for the
   unicorn's neck reaching down the rainbow and the dragon's tongue. */
function stretchTo(mesh, from, to, baseLen) {
  const d = new THREE.Vector3().subVectors(to, from);
  const len = d.length() || 1e-4;
  mesh.position.copy(from).addScaledVector(d, 0.5);
  mesh.quaternion.setFromUnitVectors(_yUp, d.clone().divideScalar(len));
  mesh.scale.y = len / baseLen;
}

/* ---------------------------- unicorn ---------------------------- */

const RAINBOW = [0xe8544a, 0xef8f3a, 0xf2cf4a, 0x5fb85f, 0x4a9fe0, 0x5a5ad0, 0x9a54c8];
const RB_R = 0.36, RB_C = new THREE.Vector3(0.06, 0.26, 0.50);   // clear of the body, face-on to the viewer

function buildUnicorn() {
  const g = new THREE.Group();
  const coat = mat(0xfdf4f7), hoof = mat(0xd8c0cc), gold = mat(0xf0c453), blk = mat(0x2a2320);

  const body = sphere(0.16, coat); body.scale.set(1.0, 0.95, 1.5); at(body, 0, 0.44, -0.03);
  const legs = [];
  [[0.095, 0.16], [-0.095, 0.16], [0.095, -0.17], [-0.095, -0.17]].forEach(q => {
    const l = cyl(0.030, 0.034, 0.44, coat); at(l, q[0], 0.22, q[1]); legs.push(l); g.add(l);
    const h = cyl(0.036, 0.036, 0.035, hoof); at(h, q[0], 0.018, q[1]); g.add(h);
  });

  // the neck is redrawn every frame between shoulder and head, so the head can
  // travel down the rainbow while it eats
  const neck = cyl(0.048, 0.062, 1.0, coat);
  const headP = new THREE.Group();
  const head = sphere(0.085, coat); head.scale.set(1, 1, 1.25);
  const muzzle = sphere(0.050, coat); muzzle.scale.set(0.85, 0.8, 1.1); at(muzzle, 0, -0.030, 0.090);
  const nose = sphere(0.010, blk); at(nose, 0.020, -0.032, 0.145);
  const eyeL = sphere(0.017, blk); at(eyeL, 0.058, 0.030, 0.045);
  const eyeR = sphere(0.017, blk); at(eyeR, -0.058, 0.030, 0.045);
  const earL = cone(0.024, 0.060, coat); at(earL, 0.052, 0.100, -0.030);
  const earR = cone(0.024, 0.060, coat); at(earR, -0.052, 0.100, -0.030);
  const horn = cone(0.024, 0.150, gold); at(horn, 0, 0.140, 0.045);
  const forelock = sphere(0.040, mat(RAINBOW[4])); forelock.scale.set(1, 0.7, 0.7); at(forelock, 0, 0.085, 0.030);
  headP.rotation.order = 'YXZ';
  headP.add(head, muzzle, nose, eyeL, eyeR, earL, earR, horn, forelock);

  // mane and tail in rainbow stripes
  const mane = new THREE.Group();
  RAINBOW.forEach((col, i) => {
    const s = sphere(0.038, mat(col)); s.scale.set(0.55, 0.9, 0.8);
    at(s, 0, 0.60 + i * 0.012, 0.12 - i * 0.038); mane.add(s);
  });
  const tail = new THREE.Group(); at(tail, 0, 0.46, -0.26);
  RAINBOW.forEach((col, i) => {
    const s = cyl(0.010, 0.016, 0.24, mat(col));
    at(s, (i - 3) * 0.016, -0.10, -0.02); s.rotation.x = 0.55; tail.add(s);
  });

  // the rainbow it eats: seven arcs that get shorter bite by bite
  const rb = new THREE.Group(); rb.position.copy(RB_C);
  const bands = RAINBOW.map((col, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(RB_R - i * 0.028, 0.013, 6, 44, Math.PI), mat(col));
    rb.add(m); return m;
  });

  const torso = new THREE.Group();          // body, mane and tail lie down together
  torso.add(body, mane, tail);
  g.add(torso, neck, headP, rb);
  const lab = label('Einhorn'); at(lab, 0, 1.02, 0);
  g.add(lab);
  return {
    root: g,
    p: {
      body: body, torso: torso, legs: legs, neck: neck, head: headP, eyes: [eyeL, eyeR], tail: tail,
      rb: rb, bands: bands, start: 0, nextBite: 2, chew: 0, pop: 1, sleep: 0
    }
  };
}

/* Rebuilding seven small arcs only happens on a bite, so a few times a minute. */
function rainbowGeom(p) {
  p.rb.rotation.z = p.start;
  const arc = Math.max(0.001, Math.PI - p.start);
  p.bands.forEach((b, i) => {
    b.geometry.dispose();
    b.geometry = new THREE.TorusGeometry(RB_R - i * 0.028, 0.013, 6, 44, arc);
  });
}

const UNI_SHOULDER = new THREE.Vector3(0, 0.60, 0.14);

function updateUnicorn(o, dt, c) {
  const p = o.p, t = c.t;
  const night = c.phase === 'evening';

  p.sleep += ((night ? 1 : 0) - p.sleep) * Math.min(1, dt * 1.2);
  const sl = p.sleep;

  // lying down for the night, and the rainbow fades with it
  p.rb.visible = sl < 0.9;
  p.rb.scale.setScalar(p.pop * (1 - sl));
  p.pop += (1 - p.pop) * Math.min(1, dt * 4);
  p.legs.forEach(l => { l.scale.y = 1 - sl * 0.72; l.position.y = 0.22 * (1 - sl * 0.72); });
  p.torso.position.y = -sl * 0.28;
  p.body.scale.y = 0.95 * (1 + Math.sin(t * 1.0) * 0.03 * sl);
  p.eyes.forEach(e => e.scale.y = 1 - sl * 0.88);

  let target;
  if (sl > 0.5) {
    target = new THREE.Vector3(0.13, 0.16, 0.26);            // head resting on the floor beside it
  } else {
    if (t > p.nextBite) {
      p.nextBite = t + (c.phase === 'morning' ? 2.6 : 1.6);
      p.chew = 1;
      p.start += Math.PI / 12;
      if (p.start >= Math.PI * 0.96) { p.start = 0; p.pop = 0.2; }   // it grows back
      rainbowGeom(p);
    }
    p.chew = Math.max(0, p.chew - dt * 2.2);
    // the mouth follows the end of the arc as it gets eaten away
    const th = p.start + 0.10;
    target = new THREE.Vector3(Math.cos(th) * RB_R, Math.sin(th) * RB_R, 0)
      .add(RB_C).add(new THREE.Vector3(0, 0.02 + Math.sin(t * 9) * 0.012 * p.chew, 0.02));
  }
  p.head.position.lerp(target, Math.min(1, dt * 3.5));
  // point the muzzle along the neck: Object3D.lookAt wants a world-space target,
  // and everything here is in the animal's own frame
  const shoulder = UNI_SHOULDER.clone(); shoulder.y -= sl * 0.28;
  const nd = new THREE.Vector3().subVectors(p.head.position, shoulder);
  p.head.rotation.y = Math.atan2(nd.x, nd.z);
  p.head.rotation.x = -Math.atan2(nd.y, Math.hypot(nd.x, nd.z)) + Math.sin(t * 9) * 0.10 * p.chew;
  stretchTo(p.neck, shoulder, p.head.position, 1.0);
  p.tail.rotation.y = Math.sin(t * 1.6) * 0.3 * (1 - sl);
}

function pokeUnicorn(o) {
  o.poke = 1;
  if (o.p.sleep > 0.5) return () => 'Psst. Das Einhorn schläft.';
  o.p.nextBite = 0;
  return () => 'Das Einhorn nimmt noch einen Bissen Regenbogen.';
}

/* ---------------------------- dragon ---------------------------- */

const DRG_HEAD = new THREE.Vector3(0, 0.50, 0.06);

function buildDragon() {
  const g = new THREE.Group();
  const scale1 = mat(0x458a5e, { roughness: 0.62 }), scale2 = mat(0x9ccfa4, { roughness: 0.66 }), horn = mat(0xe0d09c, { roughness: 0.5 }),
    blk = mat(0x1f1a16), eyeM = mat(0xf2c94c), tongueM = mat(0xe07a8a);

  const body = sphere(0.165, scale1); body.scale.set(1.0, 1.10, 1.05); at(body, 0, 0.24, 0);
  const belly = sphere(0.115, scale2); belly.scale.set(1.0, 1.05, 0.6); at(belly, 0, 0.21, 0.115);

  const headP = new THREE.Group(); at(headP, 0, 0.50, 0.06);
  const head = sphere(0.105, scale1); head.scale.set(1, 0.95, 1.15);
  const snout = sphere(0.058, scale1); snout.scale.set(0.9, 0.72, 1.35); at(snout, 0, -0.028, 0.115);
  const jaw = sphere(0.048, scale2); jaw.scale.set(0.8, 0.45, 1.15); at(jaw, 0, -0.058, 0.110);
  const nosL = sphere(0.009, blk); at(nosL, 0.022, -0.010, 0.192);
  const nosR = sphere(0.009, blk); at(nosR, -0.022, -0.010, 0.192);
  const eyeL = sphere(0.026, eyeM); at(eyeL, 0.055, 0.040, 0.062);
  const eyeR = sphere(0.026, eyeM); at(eyeR, -0.055, 0.040, 0.062);
  const pupL = box(0.007, 0.030, 0.010, blk); at(pupL, 0.060, 0.040, 0.082);
  const pupR = box(0.007, 0.030, 0.010, blk); at(pupR, -0.060, 0.040, 0.082);
  const hornL = cone(0.022, 0.090, horn); at(hornL, 0.058, 0.115, -0.030); hornL.rotation.x = -0.5;
  const hornR = cone(0.022, 0.090, horn); at(hornR, -0.058, 0.115, -0.030); hornR.rotation.x = -0.5;
  headP.rotation.order = 'YXZ';
  headP.add(head, snout, jaw, nosL, nosR, eyeL, eyeR, pupL, pupR, hornL, hornR);

  const wings = [1, -1].map(s => {
    const w = new THREE.Group(); at(w, s * 0.128, 0.255, -0.105);
    const m = sphere(0.150, scale2); m.scale.set(0.11, 0.95, 0.85); at(m, s * 0.055, 0.03, -0.05);
    w.add(m); return w;
  });

  const tail = new THREE.Group(); at(tail, 0, 0.16, -0.16);
  const tailM = cone(0.055, 0.34, scale1); at(tailM, 0, 0, -0.14); tailM.rotation.x = -1.35;
  const tip = cone(0.055, 0.09, horn); at(tip, 0, 0.01, -0.31); tip.rotation.x = -1.35;
  tail.add(tailM, tip);

  const legL = sphere(0.052, scale1); legL.scale.set(1, 0.7, 1.4); at(legL, 0.085, 0.048, 0.055);
  const legR = sphere(0.052, scale1); legR.scale.set(1, 0.7, 1.4); at(legR, -0.085, 0.048, 0.055);

  // chameleon tongue: a unit cylinder restretched every frame, with a sticky tip
  const tongue = cyl(0.011, 0.014, 1.0, tongueM);
  const tongueTip = sphere(0.026, tongueM);
  tongue.visible = tongueTip.visible = false;

  // the sky it picks from
  const sky = new THREE.Group();
  const stars = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.042), mat(0xfff3b0));
    sky.add(m); stars.push({ mesh: m, back: 0 });
  }

  g.add(body, belly, headP, wings[0], wings[1], tail, legL, legR, tongue, tongueTip, sky);
  const lab = label('Drache'); at(lab, 0, 0.86, 0);
  g.add(lab);

  const p = {
    body: body, head: headP, eyes: [eyeL, eyeR], pupils: [pupL, pupR], wings: wings, tail: tail,
    tongue: tongue, tip: tongueTip, sky: sky, stars: stars,
    shot: null, nextShot: 1.5, sleep: 0
  };
  stars.forEach(s => placeStar(s));
  return { root: g, p: p };
}

function placeStar(s) {
  const a = Math.random() * Math.PI * 2, r = 0.30 + Math.random() * 0.55;
  s.mesh.position.set(Math.cos(a) * r, 1.00 + Math.random() * 0.60, Math.sin(a) * r * 0.55 + 0.55);
  s.mesh.visible = true;
  s.back = 0;
}

function updateDragon(o, dt, c) {
  const p = o.p, t = c.t;
  const night = c.phase === 'evening';
  p.sleep += ((night ? 1 : 0) - p.sleep) * Math.min(1, dt * 1.2);
  const sl = p.sleep;

  p.stars.forEach(s => {
    s.mesh.rotation.y += dt * 1.1;
    s.mesh.rotation.x += dt * 0.7;
    s.mesh.scale.setScalar(1 - sl);
    if (s.back && t > s.back && sl < 0.5) placeStar(s);
  });

  p.body.scale.y = 1.10 * (1 + Math.sin(t * (sl > 0.5 ? 1.0 : 1.8)) * (sl > 0.5 ? 0.045 : 0.025));
  p.eyes.forEach(e => e.scale.y = 1 - sl * 0.9);
  p.pupils.forEach(e => e.scale.y = 1 - sl * 0.9);
  p.tail.rotation.y = Math.sin(t * 1.3) * 0.35 * (1 - sl);
  p.wings.forEach((w, i) => {
    w.rotation.z = (i ? 1 : -1) * (0.34 + (1 - sl) * Math.abs(Math.sin(t * 2.2)) * 0.48);
    w.rotation.y = (i ? 1 : -1) * (0.55 + sl * 0.85);          // swept back, folded away at night
  });

  if (sl > 0.5) {
    p.shot = null;
    p.tongue.visible = p.tip.visible = false;
    p.head.position.set(0, 0.34, 0.14);
    p.head.rotation.set(0.55 + Math.sin(t * 1.0) * 0.04, 0, 0);   // chin down, dozing
    p.body.position.y = 0.18;
    return;
  }
  p.body.position.y = 0.24;
  p.head.position.set(0, 0.50, 0.06);

  // pick a star, shoot the tongue, reel it in
  if (!p.shot && t > p.nextShot) {
    const free = p.stars.filter(s => s.mesh.visible);
    if (free.length) {
      p.shot = { s: free[Math.floor(Math.random() * free.length)], u: 0, phase: 'out' };
    }
    p.nextShot = t + (c.phase === 'morning' ? 3.4 : 2.2);
  }

  // aim first, then turn the head, then take the mouth from where the snout
  // actually ended up - otherwise the tongue leaves from the wrong place
  const aim = p.shot ? p.shot.s.mesh.position.clone()
    : new THREE.Vector3(Math.sin(t * 0.4) * 0.30, 1.25, 0.90);
  const d = aim.clone().sub(DRG_HEAD);
  p.head.rotation.x = clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -1.00, 0.40);
  p.head.rotation.y = clamp(Math.atan2(d.x, d.z), -1.0, 1.0);
  const mouth = new THREE.Vector3(0, -0.048, 0.235).applyEuler(p.head.rotation).add(DRG_HEAD);

  if (p.shot) {
    const sp = p.shot.s.mesh.position;
    p.shot.u += dt * (p.shot.phase === 'out' ? 2.6 : 2.0);
    const u = clamp(p.shot.u, 0, 1);
    const reach = p.shot.phase === 'out' ? u : 1 - u;
    const tipPos = new THREE.Vector3().lerpVectors(mouth, sp, reach);
    p.tongue.visible = p.tip.visible = reach > 0.02;
    stretchTo(p.tongue, mouth, tipPos, 1.0);
    p.tip.position.copy(tipPos);
    if (p.shot.phase === 'out') {
      if (u >= 1) { p.shot.phase = 'in'; p.shot.u = 0; p.shot.s.mesh.visible = false; }
    } else {
      p.shot.s.mesh.position.copy(tipPos);                     // the star rides back in
      if (u >= 1) {
        p.shot.s.back = t + 9 + Math.random() * 7;
        p.shot = null;
        p.tongue.visible = p.tip.visible = false;
      }
    }
  } else {
    p.tongue.visible = p.tip.visible = false;
  }
}

function pokeDragon(o) {
  o.poke = 1;
  if (o.p.sleep > 0.5) return () => 'Der Drache schläft. Die Sterne bleiben heute oben.';
  o.p.nextShot = 0;
  return () => 'Zunge raus - noch ein Stern weniger am Himmel.';
}

/* ---------------------------- registry ---------------------------- */

const SPECIES = [
  {
    id: 'dog', name: 'Hund', emoji: '\u{1F415}', surface: 'floor', shadowR: 0.30,
    where: 'Hinter der Wohnungstür, auf den Boden.',
    why: 'Begrüßung und Ankommen.',
    build: buildDog, update: updateDog, poke: pokeDog
  },
  {
    id: 'parrots', name: 'Papageien', emoji: '\u{1F99C}', surface: 'shelf', shadowR: 0.22,
    where: 'Auf einen Schrank oder ein Regal.',
    why: 'Zusammensein, Tagesrhythmus.',
    build: buildParrots, update: updateParrots, poke: pokeParrots
  },
  {
    id: 'frog', name: 'Frosch', emoji: '\u{1F438}', surface: 'floor', shadowR: 0.13,
    where: 'Irgendwo auf den Boden - er hüpft von dort weiter.',
    why: 'Putzen, und zwar wirklich.',
    build: buildFrog, update: updateFrog, poke: pokeFrog
  },
  {
    id: 'monkey', name: 'Affe', emoji: '\u{1F412}', surface: 'floor', shadowR: 0.23,
    where: 'Ins Bad, neben das Waschbecken oder auf den Boden.',
    why: 'Zähneputzen, Duschen, Aufräumen.',
    build: buildMonkey, update: updateMonkey, poke: pokeMonkey
  },
  {
    id: 'mumin', name: 'Mumin', emoji: '\u{1F99B}', surface: 'floor', shadowR: 0.21,
    where: 'In den Flur oder auf eine Kommode.',
    why: 'Launen wechseln - und das ist in Ordnung.',
    build: buildMumin, update: updateMumin, poke: pokeMumin
  },
  {
    id: 'unicorn', name: 'Einhorn', emoji: '\u{1F984}', surface: 'floor', shadowR: 0.34,
    where: 'Wo Platz ist - es braucht einen halben Meter für den Regenbogen.',
    why: 'Essen, satt werden, schlafen gehen.',
    build: buildUnicorn, update: updateUnicorn, poke: pokeUnicorn
  },
  {
    id: 'dragon', name: 'Drache', emoji: '\u{1F409}', surface: 'floor', shadowR: 0.26,
    where: 'Unter eine hohe Decke - er pflückt Sterne über sich.',
    why: 'Geduld, zielen, und irgendwann ist Schlafenszeit.',
    build: buildDragon, update: updateDragon, poke: pokeDragon
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

  /* Three-point rig. A single lamp plus ambient makes everything read as flat
     plastic; a warm key, a cool fill and a rim are what give the shapes a
     direction to sit in. Indoor daylight is roughly sky-blue from above and
     bounced-warm from the floor, hence the hemisphere colours. */
  scene.add(new THREE.HemisphereLight(0xdce8ff, 0x9a7e5e, 0.28));
  const key = new THREE.DirectionalLight(0xfff2e0, 0.72);
  key.position.set(1.6, 3.2, 1.4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xcddcff, 0.18);
  fill.position.set(-1.8, 1.1, -1.2); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.14);
  rim.position.set(-0.3, 1.4, -2.4); scene.add(rim);

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
  renderer.outputEncoding = THREE.sRGBEncoding;        // without this the standard materials read washed out
  renderer.physicallyCorrectLights = false;
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
  if (spec.shadowR) built.root.add(contactShadow(spec.shadowR));
  built.root.position.copy(pos);
  built.root.rotation.y = ry || 0;
  world.add(built.root);
  animals[id] = {
    id: id, spec: spec, root: built.root, p: built.p,
    base: pos.clone(), baseRy: ry || 0, poke: 0, anchor: null
  };
  return animals[id];
}
function despawn(id) {
  const a = animals[id];
  if (!a) return;
  if (a.anchor) { try { a.anchor.delete(); } catch (e) {} a.anchor = null; }
  world.remove(a.root);
  a.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  delete animals[id];
}
function persist(id) {
  const a = animals[id];
  if (!a) return;
  layout[id] = { x: a.base.x, y: a.base.y, z: a.base.z, ry: a.baseRy, v: 2 };
  save(K_LAYOUT, layout);
  renderAnimalList();
}
function restoreLayout() {
  let n = 0, mended = 0;
  Object.keys(layout).forEach(id => {
    if (!byId(id)) return;
    const l = layout[id];
    let ry = l.ry || 0;
    if (l.v !== 2) {
      // v1 stored a yaw computed in the wrong frame, so those animals face
      // anywhere. Turn them towards the starting spot, which is the home
      // frame's origin and where the user is standing right now.
      ry = Math.atan2(-l.x, -l.z);
      layout[id] = { x: l.x, y: l.y, z: l.z, ry: ry, v: 2 };
      mended++;
    }
    spawn(id, new THREE.Vector3(l.x, l.y, l.z), ry);
    n++;
  });
  if (mended) save(K_LAYOUT, layout);
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
    list.appendChild(chip('', k === 'brush' ? '\u{1FAA5}' : k === 'shower' ? '\u{1F6BF}' : '\u{1F455}',
      TASKS[k].title, { text: Math.round(TASKS[k].sec / 60) + ' Min' }, () => startTask(k, 'monkey')));
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
  applyFrame();
  return true;
}

/* ============================ ANCHORS ============================ */

/* Storing a plain coordinate is not enough: ARCore keeps refining its map
   while you walk, and a fixed coordinate slides against the room as it does.
   An anchor is attached to the tracked features themselves, so ARCore moves
   it with its corrections. This is what keeps an animal on its spot for the
   length of a session. */
let anchorsOk = false;

function makeAnchor(a, frame) {
  if (!anchorsOk || !frame || !xrRef || a.anchor) return;
  const wp = new THREE.Vector3().copy(a.base);
  world.localToWorld(wp);
  const q = new THREE.Quaternion();
  try {
    frame.createAnchor(new XRRigidTransform(
      { x: wp.x, y: wp.y, z: wp.z, w: 1 },
      { x: q.x, y: q.y, z: q.z, w: q.w }
    ), xrRef).then(an => { a.anchor = an; }, () => { anchorsOk = false; });
  } catch (e) { anchorsOk = false; }
}

const _av = new THREE.Vector3();
function updateAnchors(frame) {
  if (!anchorsOk || !frame || !xrRef) return;
  Object.keys(animals).forEach(k => {
    const a = animals[k];
    if (!a.anchor) { makeAnchor(a, frame); return; }
    let pose = null;
    try { pose = frame.getPose(a.anchor.anchorSpace, xrRef); } catch (e) { return; }
    if (!pose) return;
    _av.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
    world.worldToLocal(_av);
    // move base and the rendered root by the same delta, so animation offsets
    // (the frog mid-hop, the dog mid-bounce) survive the correction
    const dx = _av.x - a.base.x, dy = _av.y - a.base.y, dz = _av.z - a.base.z;
    if (dx * dx + dy * dy + dz * dz < 1e-8) return;
    a.base.set(_av.x, _av.y, _av.z);
    a.root.position.x += dx; a.root.position.y += dy; a.root.position.z += dz;
  });
}
function dropAnchors() {
  Object.keys(animals).forEach(k => {
    const a = animals[k];
    if (a.anchor) { try { a.anchor.delete(); } catch (e) {} a.anchor = null; }
  });
}

/* ======================= VISUAL RELOCALISATION ======================= */

/* The honest version of "make them stay put across sessions".
 *
 * ARCore hands out a fresh origin every session and Android has no local
 * anchor persistence, so something has to recognise the room again. Full SfM
 * - rebuilding a point cloud and solving a 6-DoF pose against it - is not
 * something that runs in a page like this. What does work, and is what this
 * implements, is visual place recognition:
 *
 *   - when you save a spot, a handful of small greyscale keyframes are stored
 *     together with the camera pose they were taken from,
 *   - to come back, the live camera image is compared against them with a
 *     zero-mean normalised cross correlation, which ignores brightness,
 *   - when the live view matches a keyframe closely enough, the whole home
 *     frame is snapped so that the camera sits exactly where it sat then.
 *
 * That recovers yaw and position from what the camera actually sees instead
 * of from a compass that indoor metal throws off. It needs you to stand
 * roughly where you stood and look at the same corner - the app shows the
 * stored view and a live match meter so you can find it.
 */

const K_PLACE = 'hc.place.v1';
const SIG_W = 64, SIG_H = 48, SIG_N = SIG_W * SIG_H;
const MATCH_LOCK = 0.70;        // ZNCC above this counts as "this is the spot"
const MATCH_HOLD = 0.5;         // and it has to hold for this long

let place = load(K_PLACE, null);    // {frames:[{sig,thumb,yawHome,pos}], made}
let camOk = false;
let reloc = null;                   // running capture or search
let worldOff = new THREE.Vector3(); // home frame translation, alongside worldYaw

/* Grab the camera image and reduce it to a 64x48 zero-mean unit-variance
   signature. Everything downstream only ever sees this vector. */
function grabSignature(frame) {
  if (!camOk || !frame) return null;
  let pose = null;
  try { pose = frame.getViewerPose(xrRef); } catch (e) { return null; }
  if (!pose || !pose.views.length) return null;
  const view = pose.views[0];
  if (!view.camera) return null;
  const gl = renderer.getContext();
  let px, w, h, fb = null;
  try {
    const tex = new XRWebGLBinding(xrSession, gl).getCameraImage(view.camera);
    w = view.camera.width; h = view.camera.height;
    fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  } catch (e) {
    camOk = false; return null;
  } finally {
    if (fb) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb); }
    if (renderer.resetState) renderer.resetState();
    else if (renderer.state && renderer.state.reset) renderer.state.reset();
  }

  // box-average down to SIG_W x SIG_H luminance (GL reads bottom-up)
  const sig = new Float32Array(SIG_N);
  const sx = w / SIG_W, sy = h / SIG_H;
  for (let j = 0; j < SIG_H; j++) {
    const y0 = Math.floor(j * sy), y1 = Math.max(y0 + 1, Math.floor((j + 1) * sy));
    for (let i = 0; i < SIG_W; i++) {
      const x0 = Math.floor(i * sx), x1 = Math.max(x0 + 1, Math.floor((i + 1) * sx));
      let acc = 0, n = 0;
      for (let y = y0; y < y1; y += 2) {
        const row = (h - 1 - y) * w * 4;
        for (let x = x0; x < x1; x += 2) {
          const o = row + x * 4;
          acc += 0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2];
          n++;
        }
      }
      sig[j * SIG_W + i] = n ? acc / n : 0;
    }
  }
  // zero mean, unit norm - makes the comparison blind to exposure and gain
  let mean = 0;
  for (let i = 0; i < SIG_N; i++) mean += sig[i];
  mean /= SIG_N;
  let ss = 0;
  for (let i = 0; i < SIG_N; i++) { sig[i] -= mean; ss += sig[i] * sig[i]; }
  const norm = Math.sqrt(ss);
  if (norm < 1e-3) return null;               // a blank wall carries no information
  for (let i = 0; i < SIG_N; i++) sig[i] /= norm;
  return { sig: sig, contrast: norm / Math.sqrt(SIG_N) };
}

function zncc(a, b) {
  let s = 0;
  for (let i = 0; i < SIG_N; i++) s += a[i] * b[i];
  return s;                                    // both are already unit vectors
}

/* signatures are stored as bytes: 3 KB each, and localStorage takes strings */
function sigToStr(sig) {
  const u = new Uint8Array(SIG_N);
  for (let i = 0; i < SIG_N; i++) u[i] = clamp(Math.round(sig[i] * 700 + 128), 0, 255);
  let s = '';
  for (let i = 0; i < SIG_N; i += 4096) s += String.fromCharCode.apply(null, u.subarray(i, i + 4096));
  return btoa(s);
}
function strToSig(str) {
  const bin = atob(str);
  const sig = new Float32Array(SIG_N);
  let mean = 0;
  for (let i = 0; i < SIG_N; i++) { sig[i] = (bin.charCodeAt(i) - 128) / 700; mean += sig[i]; }
  mean /= SIG_N;
  let ss = 0;
  for (let i = 0; i < SIG_N; i++) { sig[i] -= mean; ss += sig[i] * sig[i]; }
  const n = Math.sqrt(ss) || 1;
  for (let i = 0; i < SIG_N; i++) sig[i] /= n;
  return sig;
}
function sigThumb(sig) {
  const c = document.createElement('canvas');
  c.width = SIG_W; c.height = SIG_H;
  const g = c.getContext('2d');
  const img = g.createImageData(SIG_W, SIG_H);
  for (let i = 0; i < SIG_N; i++) {
    const v = clamp(Math.round(sig[i] * 700 + 128), 0, 255);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL('image/webp', 0.7);
}

/* ---- where the camera is, in home-frame terms ---- */

function camHomePos() {
  const cam = (renderer.xr && renderer.xr.isPresenting) ? renderer.xr.getCamera(camera) : camera;
  cam.updateMatrixWorld(true);
  return world.worldToLocal(cam.getWorldPosition(new THREE.Vector3()));
}
function camHomeYaw() {
  return (camYawDeg() + worldYaw + 360) % 360;   // session bearing plus the frame's own rotation
}
function applyFrame() {
  world.rotation.y = THREE.MathUtils.degToRad(worldYaw);
  world.position.copy(worldOff);
}

/* ---- learning a spot ---- */

function startRemember() {
  if (!camOk) { toast('Dieses Telefon gibt der Seite kein Kamerabild - der Kompass muss reichen.'); return; }
  reloc = { mode: 'learn', frames: [], lastYaw: null, msg: 0 };
  $('reloc').classList.add('on');
  relocUI();
}

/* ---- finding it again ---- */

function startFind() {
  if (!place || !place.frames.length) { toast('Erst einmal "Ort merken", dann kann ich ihn wiederfinden.'); return; }
  if (!camOk) { toast('Ohne Kamerabild kann ich den Ort nicht wiedererkennen.'); return; }
  reloc = {
    mode: 'find', best: -1, bestIdx: 0, held: 0, next: 0,
    sigs: place.frames.map(f => strToSig(f.sig))
  };
  $('reloc').classList.add('on');
  relocUI();
}

function stopReloc() {
  reloc = null;
  $('reloc').classList.remove('on');
}

function updateReloc(frame, t, dt) {
  if (!reloc) return;

  if (reloc.mode === 'learn') {
    const yaw = camYawDeg();
    // one keyframe every ~30 degrees of turning, so the set covers the room
    const far = reloc.lastYaw == null ||
      Math.abs(((yaw - reloc.lastYaw + 540) % 360) - 180) > 150;
    if (far && reloc.frames.length < 8) {
      const g = grabSignature(frame);
      if (g && g.contrast > 6) {               // skip blank walls and motion blur
        reloc.frames.push({
          sig: sigToStr(g.sig), thumb: sigThumb(g.sig),
          yawHome: camHomeYaw(), pos: camHomePos().toArray()
        });
        reloc.lastYaw = yaw;
      }
    }
    if (reloc.frames.length >= 8) {
      place = { frames: reloc.frames, made: now() };
      save(K_PLACE, place);
      stopReloc();
      toast('Ort gemerkt. Beim nächsten Mal "Ort finden" antippen.');
      renderDataSummary();
      return;
    }
    relocUI();
    return;
  }

  // find mode: check a few times a second, that is plenty
  if (t < reloc.next) { relocUI(); return; }
  reloc.next = t + 0.22;
  const g = grabSignature(frame);
  if (!g) { relocUI(); return; }
  let best = -1, bestIdx = 0;
  for (let i = 0; i < reloc.sigs.length; i++) {
    const s = zncc(g.sig, reloc.sigs[i]);
    if (s > best) { best = s; bestIdx = i; }
  }
  reloc.best = best; reloc.bestIdx = bestIdx;
  reloc.held = best >= MATCH_LOCK ? reloc.held + 0.22 : 0;
  if (reloc.held >= MATCH_HOLD) lockTo(bestIdx, best);
  relocUI();
}

/* Snap the home frame so the camera sits where it sat when the keyframe was
   taken. Yaw first, then translation - the translation depends on the yaw. */
function lockTo(idx, score) {
  const f = place.frames[idx];
  worldYaw = ((f.yawHome - camYawDeg()) % 360 + 360) % 360;
  world.rotation.y = THREE.MathUtils.degToRad(worldYaw);
  world.position.set(0, 0, 0);

  const cam = (renderer.xr && renderer.xr.isPresenting) ? renderer.xr.getCamera(camera) : camera;
  cam.updateMatrixWorld(true);
  const camNow = cam.getWorldPosition(new THREE.Vector3());
  const want = new THREE.Vector3().fromArray(f.pos).applyAxisAngle(_yAxis, world.rotation.y);
  worldOff.subVectors(camNow, want);
  worldOff.y = 0;                               // the floor is the floor
  applyFrame();

  stopReloc();
  dropAnchors();
  const n = restoreLayout();
  toast('Wiedergefunden (' + Math.round(score * 100) + '%). ' + n + ' Tiere zurück an ihrem Platz.');
}

const _yAxis = new THREE.Vector3(0, 1, 0);

function relocUI() {
  if (!reloc) return;
  if (reloc.mode === 'learn') {
    $('relocTitle').textContent = 'Ort merken';
    $('relocSub').textContent = 'Dreh dich einmal langsam im Kreis. ' +
      reloc.frames.length + ' von 8 Blicken gespeichert.';
    $('relocBar').style.width = (reloc.frames.length / 8 * 100) + '%';
    $('relocShot').style.display = 'none';
    return;
  }
  const pct = Math.max(0, Math.round(reloc.best * 100));
  $('relocTitle').textContent = 'Ort wiederfinden';
  $('relocSub').textContent = reloc.best < 0
    ? 'Halt die Kamera ruhig ins Zimmer.'
    : 'Dreh dich, bis das Bild unten passt. Übereinstimmung ' + pct + '%.';
  $('relocBar').style.width = pct + '%';
  const img = $('relocShot');
  const f = place.frames[reloc.bestIdx];
  if (f && img.dataset.idx !== String(reloc.bestIdx)) {
    img.src = f.thumb; img.dataset.idx = String(reloc.bestIdx);
  }
  img.style.display = 'block';
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
      optionalFeatures: ['dom-overlay', 'hit-test', 'anchors', 'camera-access'],
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
  anchorsOk = has('anchors') && typeof XRFrame !== 'undefined' && 'createAnchor' in XRFrame.prototype;
  camOk = has('camera-access') && typeof XRWebGLBinding !== 'undefined' &&
          'getCameraImage' in XRWebGLBinding.prototype;
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
    if (frame) { updateAnchors(frame); updateReloc(frame, lastT, 0.016); }
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
  stopReloc();
  dropAnchors();
  anchorsOk = camOk = false;
  worldOff.set(0, 0, 0);
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
/* Which way an animal has to be turned so its face - built along +Z - points at
   the phone. Both points must be in the home frame; Object3D.lookAt takes a
   world-space target, which is exactly what the first build got wrong. */
function faceYaw(p, eyeWorld) {
  const e = world.worldToLocal(eyeWorld.clone());
  return Math.atan2(e.x - p.x, e.z - p.z);
}

function handleTap(origin, dir) {
  if (placing) {
    const spec = placing; placing = null;
    const p = targetPoint(spec);
    const a = spawn(spec.id, p, faceYaw(p, origin));
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
      a.baseRy = faceYaw(p, origin);          // turn to face you from the new spot too
      a.root.rotation.y = a.baseRy;
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

function chip(cls, emoji, name, sub, onclick) {
  const b = document.createElement('button');
  b.className = 'chip ' + cls;
  b.innerHTML = '<span class="em">' + emoji + '</span><span>' + name + '</span>' +
    (sub ? '<span class="st' + (sub.set ? ' set' : '') + '">' + sub.text + '</span>' : '');
  b.onclick = onclick;
  return b;
}

function openChooser(forNudge) {
  const list = $('chList');
  $('chTitle').textContent = forNudge ? 'Welches Tier verschieben?' : 'Tier platzieren';
  list.innerHTML = '';
  const items = forNudge ? SPECIES.filter(s => animals[s.id]) : SPECIES;
  if (!items.length) {
    list.innerHTML = '<p class="muted" style="grid-column:1/-1;margin:4px 6px">Noch kein Tier in der Szene.</p>';
  }
  items.forEach(s => {
    const placed = !!layout[s.id];
    list.appendChild(chip(s.id, s.emoji, s.name,
      { set: placed, text: placed ? 'gesetzt' : 'neu' },
      () => {
        $('chooser').classList.remove('on');
        if (forNudge) { nudging = s.id; hint('Tipp auf die neue Stelle für ' + s.name + '.'); }
        else { placing = s; hint(s.name + ': tipp auf die Stelle im Raum.'); }
      }));
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
    '<div class="chk"><span class="i">\u{1F4CD}</span><span>' + Object.keys(layout).length + ' Tierplätze</span></div>' +
    '<div class="chk"><span class="i">\u{1F4DD}</span><span>' + logbook.length + ' Routine-Einträge</span></div>' +
    '<div class="chk"><span class="i">\u{1FAB2}</span><span>' + dirt.length + ' offene Dreckstellen</span></div>' +
    '<div class="chk" style="border:0"><span class="i">\u{1F4F7}</span><span>' +
      (place ? place.frames.length + ' gemerkte Blicke zum Wiederfinden – Graustufen-Miniaturen, 64×48 Pixel, ' +
               'zu grob um ein Gesicht oder Schrift zu erkennen'
             : 'Kein Ort gemerkt') +
    '</span></div>';
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
  $('bRemember').onclick = () => startRemember();
  $('bFind').onclick = () => startFind();
  $('relocStop').onclick = () => stopReloc();
  $('bRestore').onclick = () => {
    syncNorth(false);
    worldOff.set(0, 0, 0); applyFrame();
    dropAnchors();
    const n = restoreLayout();
    toast(n ? (n + ' Tiere über den Kompass zurückgeholt.') : 'Es ist noch nichts gespeichert.');
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
    layout = {}; logbook = []; dirt = []; place = null;
    save(K_LAYOUT, layout); save(K_LOG, logbook); save(K_DIRT, dirt);
    try { localStorage.removeItem(K_PLACE); } catch (e) {}
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
