/* ============================================================================
   THE SIGNATURE

   What a report needs at the bottom is the inspector's own hand: the name, the
   date, and the signature. On a phone that is drawn with a finger on the
   glass, kept as a small transparent PNG, and set above the line in every
   output - the page, the Word file and the long report.

   What it is, said plainly, because this matters and the app must not imply
   otherwise: this is a picture of a signature. It stands for the same thing a
   signature on paper stands for - a person putting their name to a finding -
   and it is worth exactly as much as the process around it. It is not a
   qualified electronic signature. A qualified signature under eIDAS needs a
   certificate issued to a named person by a trust service provider, held on a
   card or in a remote signing service, and no web page on a phone can make
   one. If a client requires one, the report is exported and signed in
   whatever tool they require.

   What can be done honestly, and is: a checksum. The finished report is
   hashed with SHA-256 and the hash is printed on it. Two copies of a report
   with the same checksum are the same report, down to the byte; a changed
   figure gives a different hash. That is a seal against silent alteration,
   which is the thing an inspector is actually afraid of, and it makes no claim
   about identity at all.
   ========================================================================= */

/* ---- drawing it -------------------------------------------------------- */
let signPad = null;

function signOpen() {
  signClose();
  const el = document.createElement('div'); el.id = 'signdlg';
  el.innerHTML =
    '<h3>' + esc(T('Signature')) + '</h3>' +
    '<p class="small">' + esc(T('Sign with a finger or a stylus. It is kept on this phone and ' +
      'set above the line in every report.')) + '</p>' +
    '<div class="pad"><canvas id="signCv"></canvas><div class="base"></div></div>' +
    '<div class="btnrow">' +
      '<button class="p" id="signKeep">' + esc(T('Keep')) + '</button>' +
      '<button id="signClear">' + esc(T('Clear')) + '</button>' +
      '<button id="signX">' + esc(T('Cancel')) + '</button>' +
    '</div>';
  document.body.appendChild(el);

  const cv = el.querySelector('#signCv');
  const box = el.querySelector('.pad').getBoundingClientRect();
  /* twice the pixels of the box, so the stroke is still clean on paper */
  const dpr = Math.max(2, window.devicePixelRatio || 1);
  cv.width = Math.round(box.width * dpr);
  cv.height = Math.round(box.height * dpr);
  cv.style.width = box.width + 'px';
  cv.style.height = box.height + 'px';
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  g.lineWidth = 2.1; g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = '#0b1c13';
  signPad = { el: el, cv: cv, g: g, drawn: false, w: box.width, h: box.height };

  let down = false, last = null;
  const at = ev => {
    const r = cv.getBoundingClientRect();
    const t = ev.touches ? ev.touches[0] : ev;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  };
  const start = ev => { ev.preventDefault(); down = true; last = at(ev); signPad.drawn = true; };
  const move = ev => {
    if (!down) return;
    ev.preventDefault();
    const p = at(ev);
    g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(p.x, p.y); g.stroke();
    last = p;
  };
  const end = () => { down = false; last = null; };
  cv.addEventListener('pointerdown', start);
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointerleave', end);
  cv.addEventListener('touchstart', start, { passive: false });
  cv.addEventListener('touchmove', move, { passive: false });
  cv.addEventListener('touchend', end);

  el.querySelector('#signX').onclick = signClose;
  el.querySelector('#signClear').onclick = () => {
    g.clearRect(0, 0, cv.width, cv.height); signPad.drawn = false;
  };
  el.querySelector('#signKeep').onclick = signKeep;
}
function signClose() {
  const el = document.getElementById('signdlg');
  if (el && el.parentNode) el.parentNode.removeChild(el);
  signPad = null;
}
/* Trimmed to the ink, so the signature sits on the line instead of floating in
   the middle of a box of nothing. */
function signTrim(cv) {
  const g = cv.getContext('2d');
  let d;
  try { d = g.getImageData(0, 0, cv.width, cv.height); } catch (e) { return null; }
  const w = cv.width, h = cv.height, px = d.data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (px[(y * w + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
  if (x1 < 0) return null;
  const pad = Math.round(cv.width * 0.01);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}
function signKeep() {
  if (!signPad) return;
  if (!signPad.drawn) return toast(T('Nothing drawn yet.'));
  const cut = signTrim(signPad.cv) || signPad.cv;
  const url = cut.toDataURL('image/png');
  const h = rHead();
  h.sign = url;
  h.signW = +(cut.width / cut.height).toFixed(3);       // the shape, so it is never squashed
  h.signAt = new Date().toISOString();
  lsSet(K_RHEAD, JSON.stringify(h));
  if (typeof auditAdd === 'function') auditAdd({ what: 'signature kept' });
  signClose();
  if (typeof repPaint === 'function') repPaint();
  toast(T('Signature kept.'));
}
function signClear() {
  const h = rHead();
  delete h.sign; delete h.signW; delete h.signAt;
  lsSet(K_RHEAD, JSON.stringify(h));
  if (typeof repPaint === 'function') repPaint();
  toast(T('Signature removed.'));
}
function signHas() { return !!(rHead().sign); }

/* The height in millimetres a stored signature should print at, from its own
   shape - 52 mm wide is about what a person signs on paper. */
const SIGN_MM = 52;
function signSize() {
  const h = rHead();
  const ratio = +h.signW || 3;
  return { w: SIGN_MM, h: +(SIGN_MM / ratio).toFixed(1) };
}

/* ---- the checksum ------------------------------------------------------
   Of the finished document, so the number on the paper is the number of the
   thing the client holds. */
async function signHash(text) {
  try {
    const data = new TextEncoder().encode(String(text));
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) { return null; }
}
function signHashShort(hex) {
  return hex ? hex.slice(0, 8) + ' ' + hex.slice(8, 16) + ' ' + hex.slice(16, 24) + ' ' + hex.slice(24, 32) : '';
}

/* ---- on the Reports screen --------------------------------------------- */
function signPaint() {
  const box = $('signBox'); if (!box) return;
  const h = rHead();
  box.innerHTML = '';
  if (h.sign) {
    const img = document.createElement('img'); img.className = 'sigprev'; img.src = h.sign;
    img.alt = 'signature';
    box.appendChild(img);
    const n = document.createElement('div'); n.className = 'small';
    n.textContent = T('Drawn') + ' ' + String(h.signAt || '').slice(0, 10) +
                    ' · ' + signSize().w + ' × ' + signSize().h + ' mm';
    box.appendChild(n);
  } else {
    const n = document.createElement('div'); n.className = 'small';
    n.textContent = T('No signature yet – the report prints an empty line.');
    box.appendChild(n);
  }
}
function wireSign() {
  if (!$('signDraw')) return;
  $('signDraw').onclick = signOpen;
  $('signDel').onclick = () => { if (signHas() && confirm(T('Remove the signature?'))) signClear(); };
  const ck = $('signCheck');
  if (ck) { ck.checked = prefs().repHash !== false;
            ck.onchange = () => setPref('repHash', ck.checked); }
  signPaint();
}
