/* ============================================================================
   A MARK ON THE PICTURE

   A photograph of the whole tree says "there is a tree". It does not say
   which of the four forks has the crack in it. So a photograph can be
   written on: open it, tap the damage, say what it is. The pin sits on the
   picture from then on - on the thumbnail, in the viewer, and on the ghost
   next year, where it says exactly where to look.

   Two coordinates, both between nought and one, measured from the top left
   of the image itself and not of the screen. They survive any size the
   picture is ever shown at, which is the whole reason for storing them that
   way rather than in pixels.

   And where the photograph knows the lens it was taken with, a pin can be
   turned back into a place on the tree: the angle of view gives the
   direction of the tap, the distance to the stem gives how far along that
   direction the trunk is, and out comes a height above the ground and a side
   of the trunk - the same two numbers a defect marked in AR carries. The
   picture and the trunk then hold the same finding, and the app says plainly
   that the second was worked out from the first rather than measured.
   ========================================================================= */

function pinList(rec) { return Array.isArray(rec && rec.pins) ? rec.pins : []; }

/* ---- what a tap on the picture means on the tree ----------------------
   Only for a photograph that carries its pose and its lens. Everything is a
   pinhole camera here; a phone's lens is not one at the edges, which is why
   the result is offered as a starting point and not as a measurement. */
function pinCanPlace(rec) {
  return !!(rec && rec.dist != null && rec.from != null && rec.h != null && isFinite(+rec.dist));
}
function pinToSpot(rec, pin, dbhCm) {
  if (!pinCanPlace(rec)) return null;
  const fovY = +(rec.fovY || 63), fovX = +(rec.fovX || 0) ||
               2 * Math.atan(Math.tan(fovY * Math.PI / 360) * 4 / 3) * 180 / Math.PI;
  const d = +rec.dist, camH = +rec.h, pitch = +(rec.pitch || 0);
  const ty = Math.tan(fovY * Math.PI / 360), tx = Math.tan(fovX * Math.PI / 360);
  /* up from the optical axis, and right of it, as angles */
  const up = Math.atan((1 - 2 * pin.y) * ty) * 180 / Math.PI;
  const right = Math.atan((2 * pin.x - 1) * tx) * 180 / Math.PI;
  const el = (pitch + up) * Math.PI / 180;
  const h = camH + d * Math.tan(el);
  const lat = d * Math.tan(right * Math.PI / 180);          // metres right of the stem axis
  const R = (dbhCm > 0) ? (dbhCm / 200) : null;             // stem radius in metres
  let az = +rec.from;                                        // the side the camera looked from
  let r = Math.abs(lat), onStem = false;
  if (R && Math.abs(lat) <= R) {
    /* on the trunk: the sideways offset in the picture is an angle round it */
    az -= Math.asin(lat / R) * 180 / Math.PI;
    r = R; onStem = true;
  } else {
    /* past the edge of the stem it is a branch or something behind the tree,
       and the honest answer is a point out to the side, not a point on the
       bark that happens to be at 90 degrees */
    az -= (lat > 0 ? 90 : -90);
  }
  return { h: +Math.max(0, h).toFixed(2), az: +(((az % 360) + 360) % 360).toFixed(0),
           r: +r.toFixed(2), guessed: true, fromPhoto: true, exact: !!(R && onStem) };
}

/* ---- the viewer -------------------------------------------------------- */
let pinView = null;      // { tree, rec, armed, el }

function openPhoto(tree, rec) {
  pinClose();
  pinView = { tree: tree, rec: rec, armed: null };
  const el = document.createElement('div'); el.id = 'pinview';
  el.innerHTML =
    '<div class="wrap"><img alt="photograph"><div class="pins"></div></div>' +
    '<div class="bar">' +
      '<span class="say" id="pinSay"></span>' +
      '<button class="sm p" id="pinAdd">Mark the damage</button>' +
      '<button class="x sm" id="pinX">Close</button>' +
    '</div>';
  document.body.appendChild(el);
  pinView.el = el;
  const img = el.querySelector('img');
  img.src = rec.url;
  img.onload = () => pinPaint();
  el.querySelector('#pinX').onclick = pinClose;
  el.querySelector('#pinAdd').onclick = pinArm;
  el.querySelector('.wrap').onclick = ev => {
    if (!pinView || !pinView.armed) return;
    const r = img.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    pinPlace(x, y);
  };
  pinSay('Tap “Mark the damage”, then tap the spot on the picture.');
  pinPaint();
}
function pinClose() {
  if (pinView && pinView.el && pinView.el.parentNode) pinView.el.parentNode.removeChild(pinView.el);
  pinView = null;
}
function pinSay(t, cls) {
  const s = document.getElementById('pinSay'); if (!s) return;
  s.textContent = t; s.className = 'say' + (cls ? ' ' + cls : '');
}
function pinArm() {
  if (!pinView) return;
  pinView.armed = true;
  const b = document.getElementById('pinAdd');
  if (b) { b.textContent = 'Tap the spot'; b.classList.add('x'); }
  pinSay('Tap the damage on the picture.', 'wa');
}
/* Placed: ask what it is, in the same words the trunk marks use. */
function pinPlace(x, y) {
  const el = pinView.el;
  pinView.armed = null;
  const b = document.getElementById('pinAdd');
  if (b) { b.textContent = 'Mark the damage'; b.classList.remove('x'); }
  const box = document.createElement('div'); box.className = 'kinds';
  box.innerHTML = '<div class="small">What is at that spot?</div>';
  const row = document.createElement('div'); row.className = 'btnrow';
  MARK_KINDS.forEach(k => {
    const bt = document.createElement('button'); bt.className = 'sm';
    bt.style.borderColor = k[2]; bt.textContent = k[1];
    bt.onclick = () => { box.remove(); pinKeep(x, y, k[0]); };
    row.appendChild(bt);
  });
  box.appendChild(row);
  const cx = document.createElement('button'); cx.className = 'sm'; cx.textContent = 'Cancel';
  cx.onclick = () => { box.remove(); pinSay('Nothing marked.'); };
  box.appendChild(cx);
  el.appendChild(box);
}
async function pinKeep(x, y, kind) {
  const rec = pinView.rec, tree = pinView.tree;
  const pin = { id: 'p' + Date.now().toString(36), x: +x.toFixed(4), y: +y.toFixed(4),
                kind: kind, at: new Date().toISOString() };
  const pins = pinList(rec).concat([pin]);
  rec.pins = pins;
  try { await photoPatch(rec.id, { pins: pins }); } catch (e) {}
  pinPaint();
  /* The same finding on the trunk, worked out from the picture, if the
     picture knows enough to work it out. */
  if (pinCanPlace(rec) && tree != null) {
    const spot = pinToSpot(rec, pin, num(props(tree).dbh_cm));
    if (spot) {
      const m = markAdd(tree, Object.assign({ note: 'from a photograph', photo: rec.id }, { kind: kind }, spot));
      pin.mark = m.id;
      rec.pins = pinList(rec).map(q => q.id === pin.id ? pin : q);
      try { await photoPatch(rec.id, { pins: rec.pins }); } catch (e) {}
      pinSay(markKind(kind)[1] + ' · ' + markWhere(spot) +
             (spot.exact ? '' : ' (side taken from where the photo was shot)'), 'ok');
      if (typeof layoutMarks === 'function') layoutMarks();
    }
  } else {
    pinSay(markKind(kind)[1] + ' marked on the picture.', 'ok');
  }
  if (openIdx === pinView.tree && panelEl) {
    const gal = panelEl.querySelector('.photos');
    if (gal) renderPhotos(tid(pinView.tree), gal);
  }
}
function pinPaint() {
  if (!pinView) return;
  const el = pinView.el, img = el.querySelector('img'), box = el.querySelector('.pins');
  const pins = pinList(pinView.rec);
  box.innerHTML = '';
  const r = img.getBoundingClientRect(), w = el.querySelector('.wrap').getBoundingClientRect();
  pins.forEach((p, n) => {
    const d = document.createElement('button'); d.className = 'pin';
    d.style.left = (r.left - w.left + p.x * r.width) + 'px';
    d.style.top = (r.top - w.top + p.y * r.height) + 'px';
    d.style.borderColor = markKind(p.kind)[2];
    d.style.color = markKind(p.kind)[2];
    d.textContent = String(n + 1);
    d.title = markKind(p.kind)[1];
    d.onclick = ev => { ev.stopPropagation(); pinTap(p, n); };
    box.appendChild(d);
  });
  const c = pins.length;
  if (c) pinSay(c + (c === 1 ? ' mark' : ' marks') + ' on this picture · tap one to remove it');
}
function pinTap(p, n) {
  if (!confirm('Mark ' + (n + 1) + ': ' + markKind(p.kind)[1] + '\n\nRemove it?')) return;
  const rec = pinView.rec;
  rec.pins = pinList(rec).filter(q => q.id !== p.id);
  photoPatch(rec.id, { pins: rec.pins }).catch(() => {});
  if (p.mark != null && pinView.tree != null) markDel(pinView.tree, p.mark);
  pinPaint();
  pinSay('Removed.');
  if (openIdx === pinView.tree && panelEl) {
    const gal = panelEl.querySelector('.photos');
    if (gal) renderPhotos(tid(pinView.tree), gal);
  }
}

/* ---- the same pins, small, wherever the picture is shown -------------- */
function pinDots(rec) {
  const pins = pinList(rec);
  if (!pins.length) return null;
  const box = document.createElement('div'); box.className = 'pindots';
  pins.forEach(p => {
    const d = document.createElement('i');
    d.style.left = (p.x * 100) + '%'; d.style.top = (p.y * 100) + '%';
    d.style.background = markKind(p.kind)[2];
    box.appendChild(d);
  });
  return box;
}
