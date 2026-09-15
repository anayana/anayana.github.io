/* ============================================================================
   THE SAME PICTURE AGAIN

   Whether a cavity has grown is not a question a photograph answers on its
   own. Two photographs answer it, and only if they were taken from the same
   place: a metre to the left and a wound looks half the size.

   Nothing here recognises anything. There is no model that finds cavities in
   a picture - that would have to be trained, on labelled field photographs
   that do not exist yet, which is what the research bundle is for. What does
   exist, today, in every WebXR session, is the camera's own pose. So the app
   remembers where a photograph was taken from - in the tree's terms, not the
   session's: how far out, which side, how high, looking which way - and next
   year it walks the inspector back to that spot and lays the old picture over
   the live camera at whatever opacity they want.

   Standing in the old footprints, looking down the old sightline, with last
   year's bark half-transparent over this year's: that is a comparison a
   person can make in two seconds and no computer can make at all yet.
   ========================================================================= */

/* A photograph can be repeated if it says where it was taken from. */
function ghostCan(rec) {
  return !!(rec && rec.url && rec.dist != null && rec.from != null && isFinite(+rec.dist));
}
let ghost = null;          // { tree, rec, el, img, opacity }

function ghostStart(tree, rec) {
  if (typeof mode === 'undefined' || mode !== 'WebXR')
    return toast('Standing in the old spot needs the camera view – press AR first.');
  if (!ghostCan(rec)) return toast('That photograph does not say where it was taken from.');
  if (!markerOf.get(tree)) return toast('That tree is not placed in this session yet.');
  ghostStop();
  /* North, taken once. With a fitted session it is known and stays known; with
     nothing but the compass it wanders a degree or two every second, and a
     ring that swims around the tree while you walk at it is worse than no
     ring. The fit, when it arrives, is always preferred. */
  ghost = { tree: tree, rec: rec, opacity: 0.5,
            north: (typeof sceneNorth === 'function') ? sceneNorth() : null };
  selectTree(tree);
  ghostBuild();
  ghostRing();
  toast('Walk to the ring: ' + (+rec.dist).toFixed(1) + ' m ' +
        bearWord(+rec.from) + ' of ' + tid(tree) + '.');
}
function ghostStop() {
  if (ghost && ghost.el && ghost.el.parentNode) ghost.el.parentNode.removeChild(ghost.el);
  if (ghost && ghost.ring) {
    if (ghost.ring.parent) ghost.ring.parent.remove(ghost.ring);
    if (ghost.ring.geometry) ghost.ring.geometry.dispose();
    if (ghost.ring.material) ghost.ring.material.dispose();
  }
  ghost = null;
}
function ghostBuild() {
  const el = document.createElement('div'); el.id = 'ghost';
  el.innerHTML =
    '<img alt="last time">' +
    '<div class="gbar">' +
      '<span class="gs" id="ghostSay">walk to the ring</span>' +
      '<input type="range" id="ghostOp" min="0" max="100" value="50" aria-label="how strongly the old picture shows">' +
      '<button class="sm" id="ghostShot">Photo</button>' +
      '<button class="x sm" id="ghostX">Close</button>' +
    '</div>';
  document.body.appendChild(el);
  ghost.el = el;
  ghost.img = el.querySelector('img');
  ghost.img.src = ghost.rec.url;
  ghost.img.style.opacity = ghost.opacity;
  el.querySelector('#ghostOp').oninput = ev => {
    ghost.opacity = (+ev.target.value) / 100;
    ghost.img.style.opacity = ghost.opacity;
  };
  /* The point of standing here is to take the second picture. */
  el.querySelector('#ghostShot').onclick = () => {
    const t = ghost.tree;
    takePhotoOf(t, ghost.rec.kind || null);
    toast('Taken from the same spot as ' + (ghost.rec.ts || '').slice(0, 10) + '.');
  };
  el.querySelector('#ghostX').onclick = ghostStop;
}
/* A ring on the ground where the photographer stood. */
function ghostRing() {
  if (typeof scene === 'undefined' || !scene) return;
  const m = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.46, 28),
    new THREE.MeshBasicMaterial({ color: 0x8fd6a8, side: THREE.DoubleSide, depthTest: false,
                                  transparent: true, opacity: 0.9 }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 16;
  scene.add(m); ghost.ring = m;
}
/* Where that spot is in this session: the tree, plus the bearing and distance
   the photograph remembers, turned back through the session's own north. */
function ghostSpot() {
  if (!ghost) return null;
  const g = markerOf.get(ghost.tree); if (!g) return null;
  const fit = (typeof sceneNorthDeg === 'function') ? sceneNorthDeg() : null;
  const north = (fit != null) ? fit : ghost.north;
  if (north == null) return null;
  const base = g.getWorldPosition(new THREE.Vector3());
  const a = THREE.MathUtils.degToRad(((+ghost.rec.from || 0) + north) % 360);
  const d = Math.max(0.3, +ghost.rec.dist || 1);
  return new THREE.Vector3(base.x + Math.sin(a) * d, 0, base.z - Math.cos(a) * d);
}
/* Called from the frame loop: how far off the spot, and how far off the
   sightline. Green on both counts is "you are standing in it". */
const GHOST_NEAR = 0.6, GHOST_AIM = 12;
function ghostTick() {
  if (!ghost || !ghost.el) return;
  const spot = ghostSpot();
  const say = document.getElementById('ghostSay');
  if (!spot) {
    if (say) { say.textContent = 'the session has no north yet'; say.className = 'gs wa'; }
    if (ghost.ring) ghost.ring.visible = false;
    return;
  }
  if (ghost.ring) { ghost.ring.visible = true; ghost.ring.position.set(spot.x, 0.02, spot.z); }
  const c = camPos();
  const dist = Math.hypot(c.x - spot.x, c.z - spot.z);
  const want = +ghost.rec.bearing;
  let aim = null;
  if (isFinite(want)) {
    const fit = (typeof sceneNorthDeg === 'function') ? sceneNorthDeg() : null;
    const north = (fit != null) ? fit : ghost.north;
    if (north != null) {
      const d = camDir();
      const inScene = (Math.atan2(d.x, -d.z) * 180 / Math.PI + 360) % 360;
      const now = ((inScene - north) % 360 + 360) % 360;
      aim = Math.abs(((now - want + 540) % 360) - 180);
    }
  }
  const dh = (ghost.rec.h != null) ? (c.y - +ghost.rec.h) : null;
  const near = dist <= GHOST_NEAR, aimed = (aim == null || aim <= GHOST_AIM);
  if (say) {
    say.textContent = near && aimed
      ? 'standing in it' + (dh != null && Math.abs(dh) > 0.25
          ? ' · hold the phone ' + (dh > 0 ? 'lower' : 'higher') + ' by ' + Math.abs(dh).toFixed(1) + ' m' : '')
      : (dist > GHOST_NEAR ? dist.toFixed(1) + ' m to the ring' : 'on the spot') +
        (aim != null && !aimed ? ' · turn ' + Math.round(aim) + '°' : '');
    say.className = 'gs' + (near && aimed ? ' ok' : '');
  }
  ghost.el.classList.toggle('on', near && aimed);
  if (ghost.ring) ghost.ring.material.color.set(near ? 0x8fd6a8 : 0xe8c15a);
}

/* ---- getting there from the tree's page ------------------------------- */
/* The button under a photograph that knows where it was taken from. When the
   camera is not running, the wish is remembered and honoured on the way in. */
let ghostWant = null;
function ghostRepeat(tree, rec) {
  if (mode === 'WebXR') return ghostStart(tree, rec);
  ghostWant = { tree: tree, id: rec.id };
  closePanel();
  toast('Starting the camera to walk you back to that spot …');
  if (typeof startXR === 'function') startXR();
  else toast('Press AR and it will guide you.');
}
/* Once a session is up, honour a wish made outside it. */
async function ghostResume() {
  if (!ghostWant || mode !== 'WebXR') return;
  const w = ghostWant; ghostWant = null;
  try {
    const rec = await photoGet(w.id);
    if (rec) setTimeout(() => ghostStart(w.tree, rec), 600);
  } catch (e) {}
}
