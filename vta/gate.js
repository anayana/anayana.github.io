/* ============================================================================
   THE FRONT DOOR

   The app opens on a picture of the thing it is for, asks who is holding the
   phone, in which language, and then gets out of the way and shows the map.

   What the sign-in is, said plainly: there is no server anywhere in this app,
   so nothing here can be checked against anything. The name is the name that
   goes on every record and every line of the trail - that is its whole job,
   and it is a real one, because an inspection nobody signed is worth nothing
   in a dispute. The password stops a colleague saving under your name on a
   shared phone. It does not stop anyone reading the data: the phone's own
   lock screen does that, and nothing else can.

   The password is never stored. What is stored is a salted SHA-256 of it, the
   same machinery the app already used for a PIN, so an older PIN still opens
   the same door.

   Left ticked, "stay signed in" means the door is already open next time: the
   picture still shows, the name is filled in, and one press on Start goes
   through. Untick it and the password is asked for every launch.

   And a register with no users at all stays a one-person app: "Continue
   without a name" is a first-class way through, because a man on his own
   with his own phone should not have to invent an account to count trees.
   ========================================================================= */

const K_GATE = 'vta_gate_v1';
function gateCfg() { try { return JSON.parse(lsGet(K_GATE)) || {}; } catch (e) { return {}; } }
function gateSave(c) { lsSet(K_GATE, JSON.stringify(c || {})); }

let gateUp = false;

/* ---- opening it -------------------------------------------------------- */
function gateOpen() {
  const el = $('gate'); if (!el) return;
  gateUp = true;
  el.hidden = false;
  document.body.classList.add('gated');
  gatePaint();
  $('gateGo').onclick = gateGo;
  if ($('gateLearn')) $('gateLearn').onclick = gateLearn;
  $('gateSkip').onclick = gateSkip;
  $('gatePw').onkeydown = ev => { if (ev.key === 'Enter') gateGo(); };
  $('gateKeep').onchange = () => {
    const c = gateCfg(); c.keep = $('gateKeep').checked; gateSave(c);
    gatePwState();                 // not a repaint: it would wipe a half-typed name
  };
  $('gateLang').onchange = () => {
    setLang($('gateLang').value);
    toast('');
  };
}

/* Everything the door shows, drawn from scratch - so a language change
   repaints it and so does adding the first user. */
function gatePaint() {
  const el = $('gate'); if (!el || el.hidden) return;
  const c = gateCfg(), list = usersAll();

  /* the name: a list once there are users, a plain field before that.
     Whatever is half-typed in it survives the repaint - a language change
     mid-sentence must not eat the name somebody is entering. */
  const row = $('gateUserRow');
  if (!row) return;
  const had = $('gateUser'), hadNew = $('gateNew');
  const keptSel = (had && had.tagName === 'SELECT') ? had.value : null;
  const keptTxt = (had && had.tagName === 'INPUT') ? had.value : (hadNew ? hadNew.value : null);
  row.innerHTML = '';
  if (list.length) {
    const sel = document.createElement('select'); sel.id = 'gateUser';
    list.forEach(u => {
      const o = document.createElement('option'); o.value = u.id;
      o.textContent = u.name + ' · ' + (ROLES[u.role] || u.role);
      if (u.id === (c.last || lsGet(K_USER))) o.selected = true;
      sel.appendChild(o);
    });
    const o = document.createElement('option'); o.value = '+'; o.textContent = gt2('another');
    sel.appendChild(o);
    sel.onchange = () => { gateSay(''); gatePwState(); };
    row.appendChild(sel);
    if (keptSel && [...sel.options].some(o => o.value === keptSel)) sel.value = keptSel;
    const nw = document.createElement('input'); nw.id = 'gateNew'; nw.type = 'text';
    nw.placeholder = gt2('newname'); nw.hidden = true; nw.autocomplete = 'off';
    if (keptTxt) nw.value = keptTxt;
    row.appendChild(nw);
  } else {
    const inp = document.createElement('input'); inp.id = 'gateUser'; inp.type = 'text';
    inp.autocomplete = 'username';
    inp.placeholder = gt2('name_ph');
    inp.value = (keptTxt != null) ? keptTxt : (c.name || prefs().inspector || '');
    row.appendChild(inp);
  }

  /* the language, the same one setting the whole app uses */
  const lg = $('gateLang');
  if (lg) {
    const cur = prefs().lang || 'auto';
    lg.innerHTML = '';
    LANG_LIST.forEach(l => {
      const o = document.createElement('option'); o.value = l[0];
      o.textContent = (l[0] === 'auto') ? l[1] + ' · ' + uiLangAuto().toUpperCase() : langLabel(l[0]);
      if (l[0] === cur) o.selected = true;
      lg.appendChild(o);
    });
  }
  const keep = $('gateKeep'); if (keep) keep.checked = !!c.keep;

  const note = $('gateNote');
  if (note) note.textContent = (LANG_CHECKED.indexOf(uiLang()) < 0) ? gt2('unchecked') : '';
  const foot = $('gate').querySelector('.gfoot');
  if (foot) foot.textContent = gt2('foot');
  const skip = $('gateSkip');
  if (skip) skip.hidden = list.length > 0;
  gatePwState();
}

/* The password field is only asked for when it can be answered: a user with
   no password set, or one that said stay signed in, is waved through. */
function gatePwState() {
  const pw = $('gatePw'); if (!pw) return;
  const u = gateChosen(), c = gateCfg();
  const fresh = !u || u === '+';
  if (fresh) {
    pw.placeholder = gt2('pw_new');
    pw.autocomplete = 'new-password';
    pw.disabled = false;
  } else {
    const rec = userById(u);
    const needs = !!(rec && rec.pin) && !(c.keep && c.last === u);
    pw.disabled = !needs;
    if (!needs) pw.value = '';
    pw.placeholder = !rec || !rec.pin ? gt2('pw_none') : needs ? '' : gt2('pw_kept');
    pw.autocomplete = 'current-password';
  }
  const nw = $('gateNew');
  if (nw) nw.hidden = gateSel() !== '+';
}
function gateSel() {
  const u = $('gateUser');
  return u ? u.value : '';
}
/* The chosen user id, or '' when a name is being typed instead. */
function gateChosen() {
  const u = $('gateUser');
  if (!u) return '';
  if (u.tagName === 'SELECT') return u.value;
  return '';
}
function gateSay(t, bad) {
  const s = $('gateSay'); if (!s) return;
  s.textContent = t || ''; s.className = 'gsay' + (bad ? ' no' : '');
}

/* ---- going through it -------------------------------------------------- */
async function gateGo() {
  const c = gateCfg();
  c.keep = !!($('gateKeep') && $('gateKeep').checked);
  const pw = ($('gatePw') && $('gatePw').value) || '';
  const id = gateChosen();

  try {
    if (id && id !== '+') {
      /* an existing name */
      const rec = userById(id);
      if (!rec) return gateSay('That name is gone.', true);
      const remembered = c.keep && c.last === id;
      if (remembered) {
        /* what "stay signed in" means: the password was answered once on this
           phone and is not asked again. Nothing on the phone holds it - only
           the tick, and the tick is the user's own decision. */
        lsSet(K_USER, rec.id);
        auditAdd({ what: 'signed in', detail: 'remembered on this phone' });
      } else {
        if (rec.pin && !pw) return gateSay(gt2('needpw'), true);
        if (!(await signIn(id, pw))) return gateSay(gt2('wrongpw'), true);
      }
      c.last = id; c.name = rec.name;
    } else {
      /* a name typed in: the first one is the admin, the rest inspectors */
      const field = (id === '+') ? $('gateNew') : $('gateUser');
      const nm = ((field && field.value) || '').trim();
      if (!nm) return gateSay(gt2('needname'), true);
      const first = !usersAll().length;
      const u = await userAdd(nm, first ? 'admin' : 'inspector', pw);
      await signIn(u.id, pw);
      c.last = u.id; c.name = nm;
      setPref('inspector', nm);
    }
  } catch (e) {
    return gateSay((e && e.message) || 'that did not work', true);
  }
  /* A remembered password is only remembered for the name it was given for. */
  if (!c.keep) delete c.last;
  gateSave(c);
  gateClose();
}
function gateSkip() {
  if (usersAll().length) return;
  const c = gateCfg(); c.skipped = true; gateSave(c);
  gateClose();
}
function gateClose() {
  const el = $('gate'); if (el) el.hidden = true;
  document.body.classList.remove('gated');
  gateUp = false;
  if (typeof paintWho === 'function') paintWho();
  if (typeof renderUsers === 'function') renderUsers();
  if (typeof renderList === 'function') renderList();
  /* Straight to the map: the first question in the field is always "which of
     these is the one in front of me", and that is a map question. */
  showScreen('map');
  const u = curUser();
  if (u) toast('Signed in as ' + u.name + '.');
}

/* ---- the second door ---------------------------------------------------
   Two apps, one start screen. Field is everything this app has always been;
   Practise is a separate thing that happens to live in the same install -
   example trees, name the finding, say what it means, and be told why.

   It is loaded here and nowhere else. Until this button is pressed, not one
   byte of the practice app or its cases has been fetched, parsed or kept in
   memory, so the app that goes into the wood is exactly as light as it was.
   The practice app reads no trees and writes no trees; its progress lives
   under its own key. */
let learnLoading = null;
async function gateLearn() {
  const say = m => { if ($('gateSay')) { $('gateSay').textContent = m || ''; } };
  try {
    if (typeof learnOpen !== 'function') {
      say('\u2026');
      const v = (typeof APP_VERSION === 'string') ? ('?v=' + APP_VERSION) : '';
      if (!learnLoading) learnLoading = (async () => {
        await loadScriptOnce('cases.js' + v);
        await loadScriptOnce('learn.js' + v);
      })();
      await learnLoading;
    }
    say('');
    if (typeof learnOpen !== 'function') throw new Error('the practice files are not in this build');
    gateHide();
    learnOpen();
  } catch (e) {
    learnLoading = null;
    say((e && e.message) || 'that did not work', true);
  }
}
/* The gate goes out of sight without the app behind it starting up: the
   practice app is not the field app with a different screen. */
function gateHide() {
  const el = $('gate'); if (!el) return;
  gateUp = false;
  el.hidden = true;
  document.body.classList.add('gated');     // the field app stays asleep
}
