/* ============================================================================
   VTA ÜBEN - the second door

   The field app and this one share a start screen and nothing else. This
   module is not loaded at all until somebody presses Üben, so the app that
   goes into the wood does not carry a byte of it, and nothing here can reach
   the register: it reads no trees, writes no trees, and keeps its own
   progress under its own key.

   What it is. A case is an example tree with the truth written down. The
   learner is asked four things in the order an inspector asks them:

     what    is it - name the finding
     level   how bad - the register's own 0..3
     safety  what it means for traffic safety
     action  what happens next

   Every answer is followed by the reason, right or wrong. The reason is the
   teaching; the points only bring people back tomorrow. Nothing here is
   graded against a clock, because nothing in tree inspection is.
   ========================================================================= */

const K_LEARN = 'vta_learn_v1';
const LEARN_PASS = 7;        // out of ten, to pass the exam
const LEARN_EXAM_N = 10;

/* One string, two languages. The field app's own choice decides. */
function LT(o, k) {
  if (!o) return '';
  const de = (typeof uiLang === 'function' ? uiLang() : 'en') === 'de';
  if (k) return (de ? o[k + 'De'] : o[k + 'En']) || o[k] || '';
  return (de ? o.de : o.en) || o.en || o.de || '';
}
function learnDe() { return (typeof uiLang === 'function' ? uiLang() : 'en') === 'de'; }
function LX(de, en) { return learnDe() ? de : en; }

function learnState() {
  try { return JSON.parse(lsGet(K_LEARN)) || {}; } catch (e) { return {}; }
}
function learnSave(s) { lsSet(K_LEARN, JSON.stringify(s || {})); }
function learnToday() { return new Date().toISOString().slice(0, 10); }

/* ---- what has been learnt ---------------------------------------------
   Per case: how often it was met and how often every one of its four
   questions was right first time. A case counts as sat when all four were
   right in one go - a run of lucky guesses on the third attempt is not
   knowing it. */
function learnSeen(id) {
  const s = learnState();
  return (s.cases && s.cases[id]) || { met: 0, clean: 0, best: 0 };
}
function learnRecord(id, fam, score, clean) {
  const s = learnState();
  s.cases = s.cases || {};
  const c = s.cases[id] || { met: 0, clean: 0, best: 0 };
  c.met++; c.best = Math.max(c.best, score); if (clean) c.clean++;
  c.at = Date.now();
  s.cases[id] = c;
  s.points = (s.points || 0) + score;
  /* The streak is days on which something was actually answered, not days
     the app was opened. */
  const today = learnToday();
  if (s.lastDay !== today) {
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    s.streak = (s.lastDay === y) ? (s.streak || 0) + 1 : 1;
    s.lastDay = today;
  }
  learnSave(s);
  return s;
}
function famDone(fam) {
  const s = learnState(), cs = s.cases || {};
  const all = CASES.filter(c => c.fam === fam);
  const done = all.filter(c => (cs[c.id] || {}).clean > 0).length;
  return { done: done, all: all.length };
}
function learnBadges() {
  return CASE_FAM.map(f => {
    const d = famDone(f.id);
    return { fam: f, done: d.done, all: d.all, earned: d.all > 0 && d.done >= d.all };
  });
}

/* ---- the screen -------------------------------------------------------- */
let learnUp = false, learnCase = null, learnStep = 0, learnScore = 0,
    learnWrong = 0, learnExam = null;

function learnBox() {
  let el = document.getElementById('learn');
  if (!el) { el = document.createElement('div'); el.id = 'learn'; document.body.appendChild(el); }
  return el;
}
function learnOpen() {
  learnUp = true;
  const el = learnBox();
  el.hidden = false;
  document.documentElement.classList.add('learn-on');
  learnHome();
}
function learnClose() {
  learnUp = false; learnCase = null; learnExam = null;
  const el = document.getElementById('learn');
  if (el) { el.hidden = true; el.innerHTML = ''; }
  document.documentElement.classList.remove('learn-on');
  if (typeof gateOpen === 'function') gateOpen();
}

function lEl(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
}
function lBtn(txt, fn, cls) {
  const b = lEl('button', cls || '', txt);
  b.onclick = fn;
  return b;
}
function learnHead(title, back) {
  const h = lEl('div', 'lhead');
  const b = lBtn('‹', back || learnHome, 'lback');
  b.title = LX('zurück', 'back');
  h.appendChild(b);
  h.appendChild(lEl('h2', '', title));
  return h;
}

/* ---- home -------------------------------------------------------------- */
function learnHome() {
  learnCase = null; learnExam = null;
  const el = learnBox(); el.innerHTML = '';
  const s = learnState();
  const wrap = lEl('div', 'lwrap');

  const top = lEl('div', 'lhead');
  top.appendChild(lEl('h2', '', LX('VTA üben', 'Practise VTA')));
  const x = lBtn(LX('Feld', 'Field'), learnClose, 'sm');
  x.title = LX('zurück zur Auswahl', 'back to the chooser');
  top.appendChild(x);
  wrap.appendChild(top);

  const st = lEl('div', 'lstats');
  const stat = (v, l) => {
    const d = lEl('div', 'lstat');
    d.appendChild(lEl('b', '', String(v)));
    d.appendChild(lEl('span', '', l));
    return d;
  };
  const cleanN = Object.values(s.cases || {}).filter(c => c.clean > 0).length;
  st.appendChild(stat(s.points || 0, LX('Punkte', 'points')));
  st.appendChild(stat((s.streak || 0), LX('Tage in Folge', 'day streak')));
  st.appendChild(stat(cleanN + '/' + CASES.length, LX('Fälle sitzen', 'cases sat')));
  wrap.appendChild(st);

  const go = lEl('div', 'lrow');
  go.appendChild(lBtn('▶  ' + LX('Nächster Fall', 'Next case'), () => learnStart(learnPick()), 'p big'));
  go.appendChild(lBtn('⚑  ' + LX('Prüfung', 'Exam') + ' (' + LEARN_EXAM_N + ')', learnExamStart, 'big'));
  wrap.appendChild(go);

  wrap.appendChild(lEl('div', 'lsec', LX('Schadensfamilien', 'Families of finding')));
  const fams = lEl('div', 'lfams');
  learnBadges().forEach(b => {
    const t = lEl('button', 'lfam' + (b.earned ? ' won' : ''));
    t.innerHTML = '<span class="ls">' + b.fam.sym + '</span>' +
                  '<span class="lt">' + esc(LT(b.fam)) + '</span>' +
                  '<span class="lp">' + b.done + ' / ' + b.all + '</span>';
    t.onclick = () => { const c = learnPick(b.fam.id); if (c) learnStart(c); };
    fams.appendChild(t);
  });
  wrap.appendChild(fams);

  const ex = (s.exams || []).slice(-3).reverse();
  if (ex.length) {
    wrap.appendChild(lEl('div', 'lsec', LX('Prüfungen', 'Exams')));
    ex.forEach(e => {
      const r = lEl('div', 'lexam' + (e.pass ? ' won' : ''));
      r.textContent = e.day + ' · ' + e.right + '/' + e.of + ' · ' +
        (e.pass ? LX('bestanden', 'passed') : LX('nicht bestanden', 'not passed'));
      wrap.appendChild(r);
    });
  }

  const foot = lEl('p', 'lfoot');
  foot.textContent = LX(
    'Die Zeichnungen sind Schemas, keine Fotos. Ein eigenes Foto aus dem Feld ist besser – ' +
    'in der Feld-App kann jedes Bild als Übungsfall abgelegt werden.',
    'The pictures are schematics, not photographs. Your own photograph from the field is better: ' +
    'in the field app any picture can be kept as a teaching case.');
  wrap.appendChild(foot);
  el.appendChild(wrap);
}

/* Which case next: one that has never been sat cleanly comes first, and
   within that the one met least often. Nothing is drawn twice in a row. */
let learnLast = null;
function learnPick(fam) {
  const pool = CASES.filter(c => !fam || c.fam === fam);
  if (!pool.length) return null;
  const scored = pool.map(c => {
    const s = learnSeen(c.id);
    return { c: c, k: (s.clean > 0 ? 100 : 0) + s.met * 3 + (c.id === learnLast ? 50 : 0) + Math.random() };
  }).sort((a, b) => a.k - b.k);
  return scored[0].c;
}

/* ---- one case ---------------------------------------------------------- */
function learnStart(c, exam) {
  if (!c) return;
  learnCase = c; learnStep = 0; learnScore = 0; learnWrong = 0;
  learnLast = c.id;
  learnPaint(!!exam);
}
function learnOpts(step, c) {
  if (step === 'what') return c.what.opts.map((o, i) => ({ v: i, label: LT(o) }));
  if (step === 'level') return LVL_OPTS.map(o => ({ v: o.v, label: LT(o) }));
  if (step === 'safety') return SAFE_OPTS.map(o => ({ v: o.v, label: LT(o) }));
  return ACT_OPTS.map(o => ({ v: o.v, label: LT(o) }));
}
function learnRight(step, c) { return c[step].right; }
function learnAsk(step) {
  return { what: LX('Was siehst du?', 'What do you see?'),
           level: LX('Wie schwer ist das?', 'How serious is it?'),
           safety: LX('Verkehrssicherheit?', 'Traffic safety?'),
           action: LX('Was folgt daraus?', 'What happens next?') }[step];
}

function learnPaint(exam) {
  const el = learnBox(); el.innerHTML = '';
  const c = learnCase;
  const wrap = lEl('div', 'lwrap');
  wrap.appendChild(learnHead(exam
    ? LX('Prüfung', 'Exam') + ' · ' + (learnExam.at + 1) + '/' + learnExam.list.length
    : LT(CASE_FAM.find(f => f.id === c.fam))));

  const pic = lEl('div', 'lpic');
  pic.innerHTML = caseSvg(c);
  wrap.appendChild(pic);

  wrap.appendChild(lEl('p', 'ldesc', LT(c)));

  const step = CASE_STEPS[learnStep];
  wrap.appendChild(lEl('div', 'lsec', learnAsk(step)));

  const box = lEl('div', 'lopts');
  learnOpts(step, c).forEach(o => {
    const b = lEl('button', 'lopt', o.label);
    b.onclick = () => learnAnswer(o.v, exam);
    box.appendChild(b);
  });
  wrap.appendChild(box);

  const dots = lEl('div', 'ldots');
  CASE_STEPS.forEach((s2, i) => {
    dots.appendChild(lEl('span', 'ldot' + (i < learnStep ? ' did' : i === learnStep ? ' now' : '')));
  });
  wrap.appendChild(dots);
  el.appendChild(wrap);
}

function learnAnswer(v, exam) {
  const c = learnCase, step = CASE_STEPS[learnStep];
  const right = learnRight(step, c);
  const ok = String(v) === String(right);
  if (ok) learnScore += 1; else learnWrong++;
  if (exam) {
    learnExam.answers.push({ id: c.id, step: step, ok: ok });
    return learnNext(exam);
  }
  learnWhy(step, ok, v);
}
/* The reason, every time - it is the same words whether the answer was right
   or wrong, because the point is the reasoning and not the mark. */
function learnWhy(step, ok, given) {
  const el = learnBox(); el.innerHTML = '';
  const c = learnCase;
  const wrap = lEl('div', 'lwrap');
  wrap.appendChild(learnHead(LT(CASE_FAM.find(f => f.id === c.fam))));
  const pic = lEl('div', 'lpic small'); pic.innerHTML = caseSvg(c);
  wrap.appendChild(pic);

  const head = lEl('div', 'lverdict ' + (ok ? 'ok' : 'no'));
  head.textContent = ok ? LX('Richtig', 'Right') : LX('Nicht ganz', 'Not quite');
  wrap.appendChild(head);

  if (!ok) {
    const opts = learnOpts(step, c);
    const was = opts.find(o => String(o.v) === String(learnRight(step, c)));
    const mine = opts.find(o => String(o.v) === String(given));
    const line = lEl('div', 'lwas');
    line.innerHTML = '<span class="bad">' + esc(mine ? mine.label : '?') + '</span>' +
                     ' → <span class="good">' + esc(was ? was.label : '?') + '</span>';
    wrap.appendChild(line);
  }
  wrap.appendChild(lEl('p', 'lwhy', LT(c[step])));

  const row = lEl('div', 'lrow');
  const last = learnStep >= CASE_STEPS.length - 1;
  row.appendChild(lBtn(last ? LX('Fertig', 'Finish') : LX('Weiter', 'Next'),
                       () => learnNext(false), 'p big'));
  wrap.appendChild(row);
  learnBox().appendChild(wrap);
}
function learnNext(exam) {
  learnStep++;
  if (learnStep < CASE_STEPS.length) return learnPaint(exam);
  if (exam) return learnExamNext();
  learnDone();
}

function learnDone() {
  const c = learnCase;
  const clean = learnWrong === 0;
  learnRecord(c.id, c.fam, learnScore, clean);
  const el = learnBox(); el.innerHTML = '';
  const wrap = lEl('div', 'lwrap');
  wrap.appendChild(learnHead(LX('Fall abgeschlossen', 'Case done')));
  const v = lEl('div', 'lbig' + (clean ? ' ok' : ''));
  v.textContent = learnScore + ' / ' + CASE_STEPS.length;
  wrap.appendChild(v);
  wrap.appendChild(lEl('p', 'lwhy', clean
    ? LX('Alle vier auf Anhieb. Der Fall gilt als gesessen.',
         'All four first time. The case counts as sat.')
    : LX('Der Fall kommt wieder, bis alle vier auf Anhieb sitzen.',
         'This case will come back until all four are right first time.')));
  const row = lEl('div', 'lrow');
  row.appendChild(lBtn('▶  ' + LX('Nächster Fall', 'Next case'),
                       () => learnStart(learnPick()), 'p big'));
  row.appendChild(lBtn(LX('Übersicht', 'Overview'), learnHome, 'big'));
  wrap.appendChild(row);
  el.appendChild(wrap);
}

/* ---- the exam ----------------------------------------------------------
   Ten cases, no reasons given until the end: an exam asks what you know,
   not what you can be told halfway through. */
function learnExamStart() {
  const pool = CASES.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  learnExam = { list: pool.slice(0, Math.min(LEARN_EXAM_N, pool.length)), at: 0, answers: [] };
  learnStart(learnExam.list[0], true);
}
function learnExamNext() {
  learnExam.at++;
  if (learnExam.at < learnExam.list.length) return learnStart(learnExam.list[learnExam.at], true);
  learnExamDone();
}
function learnExamDone() {
  /* A case is right in the exam when all four of its questions were. */
  const byCase = {};
  learnExam.answers.forEach(a => {
    if (!(a.id in byCase)) byCase[a.id] = true;
    if (!a.ok) byCase[a.id] = false;
  });
  const ids = Object.keys(byCase);
  const right = ids.filter(k => byCase[k]).length;
  const pass = right >= LEARN_PASS;
  const s = learnState();
  s.exams = (s.exams || []).concat([{ day: learnToday(), right: right, of: ids.length, pass: pass }]);
  s.points = (s.points || 0) + right * 2;
  learnSave(s);

  const el = learnBox(); el.innerHTML = '';
  const wrap = lEl('div', 'lwrap');
  wrap.appendChild(learnHead(LX('Prüfung', 'Exam')));
  const v = lEl('div', 'lbig' + (pass ? ' ok' : ' no'));
  v.textContent = right + ' / ' + ids.length;
  wrap.appendChild(v);
  wrap.appendChild(lEl('div', 'lverdict ' + (pass ? 'ok' : 'no'),
    pass ? LX('bestanden', 'passed') : LX('nicht bestanden', 'not passed')));
  wrap.appendChild(lEl('p', 'lwhy', pass
    ? LX('Ab ' + LEARN_PASS + ' von ' + ids.length + ' gilt sie als bestanden. Das ist eine Übung, keine Zertifizierung – ' +
         'wer Verkehrssicherheit beurteilt, braucht eine echte Qualifikation.',
         LEARN_PASS + ' of ' + ids.length + ' is a pass. This is practice, not certification: ' +
         'anyone judging traffic safety needs a real qualification.')
    : LX('Die verfehlten Fälle stehen unten – mit Begründung, wenn du sie einzeln übst.',
         'The cases you missed are below. Practise them singly for the reasons.')));

  const list = lEl('div', 'lmiss');
  ids.forEach(id => {
    const c = CASES.find(x => x.id === id);
    const r = lEl('button', 'lmissrow' + (byCase[id] ? ' ok' : ''));
    r.textContent = (byCase[id] ? '✓ ' : '✗ ') + LT(c.what.opts[c.what.right]);
    r.onclick = () => learnStart(c);
    list.appendChild(r);
  });
  wrap.appendChild(list);
  const row = lEl('div', 'lrow');
  row.appendChild(lBtn(LX('Übersicht', 'Overview'), learnHome, 'p big'));
  wrap.appendChild(row);
  el.appendChild(wrap);
}
