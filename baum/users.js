/* ============================================================================
   USERS, RIGHTS AND THE AUDIT TRAIL - on the phone, no server

   A register that two people touch needs to say who touched what and when,
   and a viewer who is shown the data must not be able to change it. None of
   that needs a server. It needs a name on every change, a role that decides
   what the buttons do, and a log that only ever grows.

   The rule that keeps this out of the way: with no users created, the app
   behaves as it always has - one person, one phone, no sign-in. The moment a
   user exists, the phone asks who is holding it. A PIN is optional and is
   hashed, never stored; it keeps a colleague from saving under your name, not
   a thief from reading the phone - that is the lock screen's job.

   What a server adds later is sharing and a copy that survives the phone.
   What it does not add is any of this: the stamp, the role and the log are
   the same either way, so the records made now carry them already.
   ========================================================================= */

const K_USERS = 'vta_users_v1', K_USER = 'vta_user_v1', K_AUDIT = 'vta_audit_v1';
const ROLES = { viewer: 'Viewer', inspector: 'Inspector', admin: 'Admin' };
const ROLE_NOTE = {
  viewer: 'reads everything, changes nothing',
  inspector: 'records and edits trees, takes photographs, runs a round',
  admin: 'and imports, replaces, deletes, and manages users'
};

function usersAll() { try { return JSON.parse(lsGet(K_USERS)) || []; } catch (e) { return []; } }
function usersSave(list) { lsSet(K_USERS, JSON.stringify(list)); }
function userById(id) { return usersAll().find(u => u.id === id) || null; }

/* Who is holding the phone. Null with no users at all - single-person mode -
   and null after a sign-out, which the screen then refuses to work in. */
function curUser() {
  const id = lsGet(K_USER);
  return id ? userById(id) : null;
}
function usersExist() { return usersAll().length > 0; }
function userName() { const u = curUser(); return u ? u.name : (prefs().inspector || ''); }

/* What the current role allows. With no users, everything; signed out with
   users present, nothing but reading. */
function userCan(what) {
  if (!usersExist()) return true;
  const u = curUser();
  if (!u) return what === 'view';
  if (u.role === 'admin') return true;
  if (u.role === 'inspector') return what !== 'manage';
  return what === 'view';
}

/* ---- PIN ---------------------------------------------------------------
   SHA-256 through WebCrypto, which every phone browser has under HTTPS. The
   stored value is the hash with a per-user salt; the PIN itself never touches
   storage. */
async function pinHash(pin, salt) {
  const data = new TextEncoder().encode(String(salt || '') + ':' + String(pin || ''));
  if (crypto && crypto.subtle && crypto.subtle.digest) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // an http:// test page has no subtle crypto: still not plain text
  let h = 0; for (const c of data) h = (h * 31 + c) >>> 0;
  return 'weak-' + h.toString(16);
}
function newSalt() {
  const a = new Uint8Array(8);
  if (crypto && crypto.getRandomValues) crypto.getRandomValues(a);
  else for (let i = 0; i < 8; i++) a[i] = Math.floor(Math.random() * 256);
  return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function userAdd(name, role, pin) {
  const nm = String(name || '').trim();
  if (!nm) throw new Error('a user needs a name');
  if (!ROLES[role]) role = 'inspector';
  const list = usersAll();
  if (list.some(u => u.name.toLowerCase() === nm.toLowerCase()))
    throw new Error('there is a user called ' + nm + ' already');
  const u = { id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
              name: nm, role: role, created: new Date().toISOString() };
  if (pin && String(pin).trim()) { u.salt = newSalt(); u.pin = await pinHash(String(pin).trim(), u.salt); }
  list.push(u); usersSave(list);
  auditAdd({ what: 'user added', detail: nm + ' (' + role + ')' });
  return u;
}
function userRemove(id) {
  const u = userById(id); if (!u) return false;
  const list = usersAll().filter(x => x.id !== id);
  // the last admin cannot remove themselves into a register nobody manages
  if (u.role === 'admin' && !list.some(x => x.role === 'admin') && list.length)
    throw new Error('that is the only admin – make someone else admin first');
  usersSave(list);
  if (lsGet(K_USER) === id) lsDel(K_USER);
  auditAdd({ what: 'user removed', detail: u.name });
  return true;
}
async function userSetPin(id, pin) {
  const list = usersAll(); const u = list.find(x => x.id === id); if (!u) return false;
  if (pin && String(pin).trim()) { u.salt = newSalt(); u.pin = await pinHash(String(pin).trim(), u.salt); }
  else { delete u.pin; delete u.salt; }
  usersSave(list); return true;
}
function userSetRole(id, role) {
  const list = usersAll(); const u = list.find(x => x.id === id); if (!u || !ROLES[role]) return false;
  u.role = role; usersSave(list);
  auditAdd({ what: 'role changed', detail: u.name + ' → ' + role });
  return true;
}

async function signIn(id, pin) {
  const u = userById(id); if (!u) return false;
  if (u.pin) {
    const h = await pinHash(String(pin || '').trim(), u.salt);
    if (h !== u.pin) return false;
  }
  lsSet(K_USER, u.id);
  auditAdd({ what: 'signed in' });
  return true;
}
function signOut() {
  if (curUser()) auditAdd({ what: 'signed out' });
  lsDel(K_USER);
}

/* ---- the trail ---------------------------------------------------------
   Append only. Nothing in the app removes an entry; an admin can export it
   and, deliberately, clear it - and the clearing is itself the first entry of
   the new trail. Capped so a phone used for years does not fill up. */
const AUDIT_MAX = 5000;
function auditList() { try { return JSON.parse(lsGet(K_AUDIT)) || []; } catch (e) { return []; } }
function auditAdd(e) {
  const u = curUser();
  const rec = Object.assign({ ts: new Date().toISOString(),
                              user: u ? u.name : (prefs().inspector || '–') }, e || {});
  const list = auditList();
  list.push(rec);
  if (list.length > AUDIT_MAX) list.splice(0, list.length - AUDIT_MAX);
  lsSet(K_AUDIT, JSON.stringify(list));
  return rec;
}
/* What changed on a tree, as the diff of two property sets: only the keys
   that differ, old and new, so the log says "vitality 1 → 2" rather than
   dumping the record. Arrays are compared by content. */
function auditDiff(before, after) {
  const out = {};
  Object.keys(after || {}).forEach(k => {
    if (k === 'history' || k === 'edited_at' || k === 'edited_by') return;
    const a = before ? before[k] : undefined, b = after[k];
    const same = Array.isArray(a) && Array.isArray(b) ? JSON.stringify(a) === JSON.stringify(b)
               : (a == null && (b == null || b === '')) || a === b;
    if (!same) out[k] = [a == null ? null : a, b == null ? null : b];
  });
  return out;
}
function auditCsv() {
  const q = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const rows = ['ts,user,what,tree,detail'];
  auditList().forEach(r => rows.push([r.ts, r.user, r.what, r.tree || '',
    r.detail || (r.diff ? Object.keys(r.diff).map(k => k + ': ' + r.diff[k][0] + ' → ' + r.diff[k][1]).join('; ') : '')]
    .map(q).join(',')));
  return rows.join('\r\n');
}
