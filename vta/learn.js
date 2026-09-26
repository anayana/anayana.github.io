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

/* The steps of one case. "Where is it?" is only asked where there is
   something to point at - on the sound tree there is not, and being asked to
   point at a defect that is not there would teach the wrong reflex. */
function caseSteps(c) {
  return (c && c.mark) ? ['what', 'where', 'level', 'safety', 'action']
                       : ['what', 'level', 'safety', 'action'];
}

/* ---- when a case comes back -------------------------------------------
   Leitner boxes. Right first time moves it up a box and out of the way for
   longer; any mistake sends it to the bottom and it is due again today. That
   is the whole difference between an app somebody plays once and one that
   gets somebody through a season. */
const LEITNER = [0, 1, 3, 7, 21, 60];   // days until the case comes back
function learnDueDay(box) {
  const d = new Date(Date.now() + LEITNER[Math.min(box, LEITNER.length - 1)] * 864e5);
  return d.toISOString().slice(0, 10);
}
function learnDue() {
  const s = learnState(), cs = s.cases || {}, today = learnToday();
  return CASES.filter(c => { const r = cs[c.id]; return !r || !r.due || r.due <= today; });
}

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
  const c = s.cases[id] || { met: 0, clean: 0, best: 0, box: 0 };
  c.met++; c.best = Math.max(c.best, score); if (clean) c.clean++;
  c.at = Date.now();
  c.box = clean ? Math.min((c.box || 0) + 1, LEITNER.length - 1) : 0;
  c.due = learnDueDay(c.box);
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
/* A level is only a number that grows. It is here because it works. */
function learnLevel(pts) { return 1 + Math.floor(Math.sqrt(Math.max(0, pts) / 8)); }
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
  const due = learnDue().length;
  st.appendChild(stat(learnLevel(s.points || 0), LX('Stufe', 'level')));
  st.appendChild(stat((s.streak || 0), LX('Tage in Folge', 'day streak')));
  st.appendChild(stat(cleanN + '/' + CASES.length, LX('Fälle sitzen', 'cases sat')));
  wrap.appendChild(st);

  const dueLine = lEl('div', 'ldue' + (due ? '' : ' none'));
  dueLine.textContent = due
    ? LX(due + ' Fälle fällig', due + ' cases due')
    : LX('Heute nichts fällig – alles sitzt. Üben geht trotzdem.',
         'Nothing due today - it all sits. Practising anyway is allowed.');
  wrap.appendChild(dueLine);

  const go = lEl('div', 'lrow');
  go.appendChild(lBtn('▶  ' + LX('Nächster Fall', 'Next case'), () => learnStart(learnPick()), 'p big'));
  go.appendChild(lBtn('⚑  ' + LX('Prüfung', 'Exam') + ' (' + LEARN_EXAM_N + ')', learnExamStart, 'big'));
  wrap.appendChild(go);

  const m = s.meas || { asked: 0, right: 0 };
  const go2 = lEl('div', 'lrow');
  go2.appendChild(lBtn('⚖  ' + LX('Messen & Rechnen', 'Measuring & arithmetic') +
    (m.asked ? '  ·  ' + m.right + '/' + m.asked : ''), () => learnMeasure(), 'big'));
  wrap.appendChild(go2);

  wrap.appendChild(lEl('div', 'lsec', LX('Schadensfamilien', 'Families of finding')));
  const fams = lEl('div', 'lfams');
  learnBadges().forEach(b => {
    const t = lEl('button', 'lfam' + (b.earned ? ' won' : ''));
    t.innerHTML = '<span class="ls">' + b.fam.sym + '</span>' +
                  '<span class="lt">' + esc(LT(b.fam)) + '</span>' +
                  '<span class="lp">' + b.done + ' / ' + b.all + '</span>';
    t.onclick = () => learnFam(b.fam);
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

/* ---- a family, and what there is to know about it ---------------------
   A quiz that only marks answers teaches the answers. This is the page that
   makes the answers make sense, and it is one press from every family tile
   and from every case that went wrong. */
function learnFam(fam) {
  const el = learnBox(); el.innerHTML = '';
  const k = (CASE_KNOW[fam.id] || {})[learnDe() ? 'de' : 'en'] || {};
  const wrap = lEl('div', 'lwrap');
  wrap.appendChild(learnHead(fam.sym + '  ' + LT(fam)));

  const bit = (h, t) => {
    if (!t) return;
    wrap.appendChild(lEl('div', 'lsec', h));
    wrap.appendChild(lEl('p', 'lwhy', t));
  };
  bit(LX('Worauf du schaust', 'What you are looking at'), k.look);
  bit(LX('Wie es versagt', 'How it fails'), k.how);
  bit(LX('Woran du sie unterscheidest', 'How to tell them apart'), k.tell);
  bit(LX('Der h\u00e4ufigste Fehler', 'The commonest mistake'), k.miss);

  const d = famDone(fam.id);
  wrap.appendChild(lEl('div', 'lsec', LX('F\u00e4lle', 'Cases') + ' \u00b7 ' + d.done + ' / ' + d.all));
  const list = lEl('div', 'lmiss');
  CASES.filter(c => c.fam === fam.id).forEach(c => {
    const seen = learnSeen(c.id);
    const r = lEl('button', 'lmissrow' + (seen.clean > 0 ? ' ok' : ''));
    r.textContent = (seen.clean > 0 ? '\u2713 ' : '\u25cb ') + LT(c.what.opts[c.what.right]);
    r.onclick = () => learnStart(c);
    list.appendChild(r);
  });
  wrap.appendChild(list);
  const row = lEl('div', 'lrow');
  row.appendChild(lBtn('\u25b6  ' + LX('Fall aus dieser Familie', 'A case from this family'),
                       () => { const c = learnPick(fam.id); if (c) learnStart(c); }, 'p big'));
  wrap.appendChild(row);
  el.appendChild(wrap);
}

/* Which case next: one that has never been sat cleanly comes first, and
   within that the one met least often. Nothing is drawn twice in a row. */
let learnLast = null;
function learnPick(fam) {
  const pool = CASES.filter(c => !fam || c.fam === fam);
  if (!pool.length) return null;
  const today = learnToday();
  const scored = pool.map(c => {
    const s = learnSeen(c.id);
    const due = !s.due || s.due <= today;
    /* due first, then never sat, then least met - and never the same case
       twice running while there is anything else to ask */
    return { c: c, k: (due ? 0 : 400) + (s.clean > 0 ? 100 : 0) + (s.box || 0) * 10 +
                      s.met * 3 + (c.id === learnLast ? 50 : 0) + Math.random() };
  }).sort((a, b) => a.k - b.k);
  return scored[0].c;
}

/* ---- one case ---------------------------------------------------------- */
/* What was answered in this case, so it can be read back as one sheet. */
let learnLog = [];
function learnStart(c, exam) {
  if (!c) return;
  learnCase = c; learnStep = 0; learnScore = 0; learnWrong = 0; learnLog = [];
  learnLast = c.id;
  learnPaint(!!exam);
}
let learnTapAt = null;
function learnOpts(step, c) {
  if (step === 'what') return c.what.opts.map((o, i) => ({ v: i, label: LT(o) }));
  if (step === 'level') return LVL_OPTS.map(o => ({ v: o.v, label: LT(o) }));
  if (step === 'safety') return SAFE_OPTS.map(o => ({ v: o.v, label: LT(o) }));
  return ACT_OPTS.map(o => ({ v: o.v, label: LT(o) }));
}
function learnRight(step, c) { return c[step].right; }
function learnAsk(step) {
  return { what: LX('Was siehst du?', 'What do you see?'),
           where: LX('Wo ist es? Tippe darauf.', 'Where is it? Press on it.'),
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

  const step = caseSteps(c)[learnStep];
  const asking = step === 'where';

  const pic = lEl('div', 'lpic' + (asking ? ' tap' : ''));
  pic.innerHTML = caseSvg(c, !asking);
  if (asking) {
    /* The picture is the answer sheet. The press is taken in the drawing's
       own coordinates, so it does not matter how large it is drawn. */
    pic.onclick = ev => {
      const b = pic.getBoundingClientRect();
      const side = Math.min(b.width, b.height);
      const ox = b.left + (b.width - side) / 2, oy = b.top + (b.height - side) / 2;
      learnTapAt = { x: (ev.clientX - ox) / side * 100, y: (ev.clientY - oy) / side * 100 };
      learnAnswer(learnTapAt, exam);
    };
  }
  wrap.appendChild(pic);

  wrap.appendChild(lEl('p', 'ldesc', LT(c)));
  wrap.appendChild(lEl('div', 'lsec', learnAsk(step)));

  if (!asking) {
    const box = lEl('div', 'lopts');
    learnOpts(step, c).forEach(o => {
      const b = lEl('button', 'lopt', o.label);
      b.onclick = () => learnAnswer(o.v, exam);
      box.appendChild(b);
    });
    wrap.appendChild(box);
  }

  const dots = lEl('div', 'ldots');
  caseSteps(c).forEach((s2, i) => {
    dots.appendChild(lEl('span', 'ldot' + (i < learnStep ? ' did' : i === learnStep ? ' now' : '')));
  });
  wrap.appendChild(dots);
  el.appendChild(wrap);
}

function learnAnswer(v, exam) {
  const c = learnCase, step = caseSteps(learnCase)[learnStep];
  let ok;
  if (step === 'where') {
    /* Generous on purpose: the question is whether the eye went to the right
       part of the tree, not whether the finger is accurate to a pixel. */
    const m = c.mark, tol = Math.max(m.r || 7, 9) * 1.6;
    ok = Math.hypot(v.x - m.x, v.y - m.y) <= tol;
  } else {
    ok = String(v) === String(learnRight(step, c));
  }
  if (ok) learnScore += 1; else learnWrong++;
  learnLog.push({ step: step, ok: ok, given: v });
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
  /* After a press on the picture, both rings are shown: where it is, and
     where the finger went. Seeing the gap is the lesson. */
  const pic = lEl('div', 'lpic' + (step === 'where' ? '' : ' small'));
  pic.innerHTML = caseSvg(c, true, step === 'where' ? learnTapAt : null);
  wrap.appendChild(pic);

  const head = lEl('div', 'lverdict ' + (ok ? 'ok' : 'no'));
  head.textContent = ok ? LX('Richtig', 'Right') : LX('Nicht ganz', 'Not quite');
  wrap.appendChild(head);

  if (!ok && step !== 'where') {
    const opts = learnOpts(step, c);
    const was = opts.find(o => String(o.v) === String(learnRight(step, c)));
    const mine = opts.find(o => String(o.v) === String(given));
    const line = lEl('div', 'lwas');
    line.innerHTML = '<span class="bad">' + esc(mine ? mine.label : '?') + '</span>' +
                     ' → <span class="good">' + esc(was ? was.label : '?') + '</span>';
    wrap.appendChild(line);
  }
  wrap.appendChild(lEl('p', 'lwhy', step === 'where'
    ? LX('Der Befund sitzt im markierten Bereich. Wo etwas sitzt, entscheidet, ' +
         'worum es geht: am Stammfu\u00df um Standsicherheit, am Stamm um Bruchsicherheit, ' +
         'in der Krone um den Hebel.',
         'The finding is inside the marked area. Where something sits decides what it is about: ' +
         'stability at the base, fracture on the stem, leverage in the crown.')
    : LT(c[step])));

  const row = lEl('div', 'lrow');
  const last = learnStep >= caseSteps(learnCase).length - 1;
  row.appendChild(lBtn(last ? LX('Fertig', 'Finish') : LX('Weiter', 'Next'),
                       () => learnNext(false), 'p big'));
  if (!ok) {
    const fam = CASE_FAM.find(f => f.id === c.fam);
    row.appendChild(lBtn(LX('Nachlesen', 'Read up'), () => learnFam(fam), 'big'));
  }
  wrap.appendChild(row);
  learnBox().appendChild(wrap);
}
function learnNext(exam) {
  learnStep++;
  if (learnStep < caseSteps(learnCase).length) return learnPaint(exam);
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
  v.textContent = learnScore + ' / ' + caseSteps(learnCase).length;
  wrap.appendChild(v);
  const n = caseSteps(c).length;
  wrap.appendChild(lEl('p', 'lwhy', clean
    ? LX('Alle ' + n + ' auf Anhieb. Der Fall gilt als gesessen und kommt erst in ' +
         LEITNER[Math.min(learnSeen(c.id).box || 1, LEITNER.length - 1)] + ' Tagen wieder.',
         'All ' + n + ' first time. The case counts as sat and comes back in ' +
         LEITNER[Math.min(learnSeen(c.id).box || 1, LEITNER.length - 1)] + ' days.')
    : LX('Der Fall ist wieder unten in der Kiste und kommt morgen erneut, bis alle ' + n +
         ' auf Anhieb sitzen.',
         'The case is back at the bottom of the box and returns tomorrow, until all ' + n +
         ' are right first time.')));
  const row = lEl('div', 'lrow');
  row.appendChild(lBtn('▶  ' + LX('Nächster Fall', 'Next case'),
                       () => learnStart(learnPick()), 'p big'));
  row.appendChild(lBtn(LX('Der ganze Baum', 'The whole tree'), () => learnSheet(c), 'big'));
  wrap.appendChild(row);
  const row2 = lEl('div', 'lrow');
  row2.appendChild(lBtn(LX('Übersicht', 'Overview'), learnHome, 'big'));
  wrap.appendChild(row2);
  el.appendChild(wrap);
}

/* ---- the case as one sheet --------------------------------------------
   Five questions answered one after another is not how an inspection reads
   afterwards. This is the same case written out the way a record is: the
   finding, where it sits, what it means, what happens next - each with the
   right answer and the reasoning behind it. It is the page a learner takes
   to the next tree. */
function learnSheet(c) {
  const el = learnBox(); el.innerHTML = '';
  const wrap = lEl('div', 'lwrap');
  wrap.appendChild(learnHead(LX('Der ganze Baum', 'The whole tree')));
  const pic = lEl('div', 'lpic small'); pic.innerHTML = caseSvg(c, true);
  wrap.appendChild(pic);
  wrap.appendChild(lEl('p', 'ldesc', LT(c)));

  const head = { what: LX('Befund', 'Finding'), where: LX('Wo', 'Where'),
                 level: LX('Stufe', 'Level'), safety: LX('Verkehrssicherheit', 'Traffic safety'),
                 action: LX('Maßnahme', 'Action') };
  caseSteps(c).forEach(step => {
    const got = learnLog.find(l => l.step === step);
    const row = lEl('div', 'lsheet' + (got && !got.ok ? ' miss' : ''));
    const h = lEl('div', 'lsh');
    h.appendChild(lEl('b', '', head[step]));
    let right = '';
    if (step === 'where') right = LX('im markierten Bereich', 'in the marked area');
    else {
      const o = learnOpts(step, c).find(x => String(x.v) === String(learnRight(step, c)));
      right = o ? o.label : '';
    }
    h.appendChild(lEl('span', '', right));
    row.appendChild(h);
    row.appendChild(lEl('p', 'lwhy', step === 'where'
      ? LX('Wo etwas sitzt, entscheidet, worum es geht.',
           'Where something sits decides what it is about.')
      : LT(c[step])));
    wrap.appendChild(row);
  });
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
  if (pass) row.appendChild(lBtn('⚑  ' + LX('Urkunde', 'Certificate'),
    () => learnCertShow({ day: learnToday(), right: right, of: ids.length }), 'p big'));
  row.appendChild(lBtn(LX('Übersicht', 'Overview'), learnHome, pass ? 'big' : 'p big'));
  wrap.appendChild(row);
  el.appendChild(wrap);
}

/* ============================================================================
   MESSEN & RECHNEN

   Benennen ist die halbe Arbeit. Die andere Hälfte ist, eine Zahl zu
   bekommen, die vor einem Gericht Bestand hat - und die vier Rechnungen
   darunter sind die, die ein Kontrolleur wirklich braucht. Sie werden bei
   jedem Aufruf neu gewürfelt, also gibt es nichts auswendig zu lernen: nur
   den Weg.

   Every exercise is generated fresh, so there is nothing to memorise - only
   the method. The worked solution is shown afterwards whether the answer was
   right or wrong, in the same form the field app computes it, because the
   point is to know what the app is doing rather than to trust it.
   ========================================================================= */

const MEAS_KINDS = ['height', 'dbh', 'fall', 'eye'];
let mExercise = null;

function rnd(a, b, step) {
  const n = a + Math.random() * (b - a);
  return step ? Math.round(n / step) * step : n;
}
function learnMakeExercise(kind) {
  const k = kind || MEAS_KINDS[Math.floor(Math.random() * MEAS_KINDS.length)];
  if (k === 'height') {
    const d = rnd(8, 25, 1), el = rnd(25, 55, 1), eye = 1.6;
    const h = eye + d * Math.tan(el * Math.PI / 180);
    return { kind: k, want: h, tol: 0.6, unit: 'm',
      q: LX('Du stehst ' + d + ' m vom Stamm, die Augenhöhe ist ' + eye + ' m. ' +
            'Der Sehstrahl zum Wipfel liegt ' + el + '° über der Waagerechten. Wie hoch ist der Baum?',
            'You stand ' + d + ' m from the stem with your eye at ' + eye + ' m. The sightline to the top ' +
            'is ' + el + '° above horizontal. How tall is the tree?'),
      how: LX('Höhe = Augenhöhe + Distanz × tan(Winkel) = ' + eye + ' + ' + d + ' × tan(' + el +
              '°) = ' + h.toFixed(1) + ' m.\n\nDas ist genau die Rechnung der Feld-App – mit einem ' +
              'Unterschied: sie nimmt die waagerechte Distanz aus dem AR-Hit-Test statt aus einem Schritt-' +
              'maß. Steht man zu nah, läuft der Winkel gegen 90° und jede Handbewegung kostet Meter. ' +
              'Deshalb die Warnung unter 1,5 m.',
              'Height = eye + distance x tan(angle) = ' + eye + ' + ' + d + ' x tan(' + el + ' deg) = ' +
              h.toFixed(1) + ' m.\n\nThat is exactly what the field app computes, with one difference: it takes ' +
              'the horizontal distance from the AR hit-test rather than from a pace. Stand too close and the ' +
              'angle runs towards 90 degrees, where a twitch of the hand costs metres. Hence the warning under 1.5 m.'),
      draw: { d: d, el: el } };
  }
  if (k === 'dbh') {
    const u = rnd(60, 320, 1);
    return { kind: k, want: u / Math.PI, tol: 1.5, unit: 'cm',
      q: LX('Das Maßband zeigt einen Stammumfang von ' + u + ' cm in 1,30 m Höhe. Wie groß ist der BHD?',
            'The tape reads a girth of ' + u + ' cm at 1.30 m. What is the DBH?'),
      how: LX('BHD = Umfang ÷ π = ' + u + ' ÷ 3,1416 = ' + (u / Math.PI).toFixed(1) + ' cm.\n\n' +
              'Am Hang wird 1,30 m bergseitig gemessen, bei Zwieseln unterhalb des Ansatzes, und eine ' +
              'Verdickung genau in 1,30 m wird umgangen – gemessen wird darunter oder darüber, mit Notiz.',
              'DBH = girth / pi = ' + u + ' / 3.1416 = ' + (u / Math.PI).toFixed(1) + ' cm.\n\nOn a slope 1.30 m ' +
              'is taken on the uphill side, on a fork below the union, and a swelling exactly at 1.30 m is ' +
              'avoided: measure above or below it and note that you did.') };
  }
  if (k === 'fall') {
    const h = rnd(12, 28, 1), t = rnd(6, 34, 1);
    return { kind: k, want: t <= h ? 1 : 0, tol: 0, unit: '',
      choice: [{ v: 1, label: LX('ja, im Fallbereich', 'yes, inside it') },
               { v: 0, label: LX('nein, außerhalb', 'no, outside it') }],
      q: LX('Ein Baum von ' + h + ' m Höhe steht ' + t + ' m von einem Spielplatz. Liegt der Spielplatz im Fallbereich?',
            'A tree ' + h + ' m tall stands ' + t + ' m from a playground. Is the playground inside the fall zone?'),
      how: LX('Der Fallbereich wird als Kreis mit dem Radius der Baumhöhe angenommen: ' + h + ' m gegen ' + t +
              ' m Abstand – ' + (t <= h ? 'innerhalb' : 'außerhalb') + '.\n\nDas ist eine grobe, bewusst ' +
              'vorsichtige Annahme. Ein Baum fällt selten seine volle Länge weit, aber Äste fliegen, und ein ' +
              'Stamm rollt. Die Feld-App zeichnet diesen Kreis auf Wunsch in die Kamera.',
              'The fall zone is taken as a circle of radius equal to the tree height: ' + h + ' m against ' + t +
              ' m - ' + (t <= h ? 'inside' : 'outside') + '.\n\nIt is a coarse and deliberately cautious ' +
              'assumption. A tree rarely falls its full length, but limbs fly and a stem rolls. The field app ' +
              'will draw that circle into the camera view.') };
  }
  const h = rnd(9, 26, .5), r = rnd(.35, .75, .05);
  return { kind: 'eye', want: h, tol: Math.max(1.5, h * 0.12), unit: 'm',
    q: LX('Die Figur ist 1,80 m groß. Wie hoch schätzt du den Baum?',
          'The figure is 1.80 m tall. How tall do you make the tree?'),
    how: LX('Der Baum ist ' + h.toFixed(1) + ' m hoch, also gut ' + Math.round(h / 1.8) +
            ' Figuren übereinander.\n\nSchätzen ist erlaubt, wenn es als Schätzung im Protokoll steht. ' +
            'Wer es genau braucht – und für den Fallbereich braucht man es – misst den Winkel.',
            'The tree is ' + h.toFixed(1) + ' m, a good ' + Math.round(h / 1.8) + ' figures stacked up.\n\n' +
            'Estimating is fine as long as the record says it was estimated. Where it has to be right - and for ' +
            'a fall zone it does - measure the angle.'),
    draw: { h: h, r: r } };
}

/* A drawing for the two exercises that have one. Same 0..100 box as a case. */
function measSvg(x) {
  const d = x.draw;
  let art = '<rect width="100" height="100" fill="#0e1712"/><rect y="86" width="100" height="14" fill="#1b2a20"/>';
  if (x.kind === 'height') {
    const eyeY = 86 - 6, topY = 20;
    art += '<path d="M78 86 L78 ' + topY + '" stroke="#3a2f22" stroke-width="3"/>' +
           '<ellipse cx="78" cy="' + (topY + 8) + '" rx="14" ry="10" fill="#2c4a33" opacity=".85"/>' +
           '<circle cx="20" cy="' + eyeY + '" r="2.5" fill="#cfe6d7"/>' +
           '<path d="M20 ' + eyeY + ' L78 ' + eyeY + '" stroke="#2f6b4a" stroke-width=".8" stroke-dasharray="2 2"/>' +
           '<path d="M20 ' + eyeY + ' L78 ' + topY + '" stroke="#ffd27a" stroke-width="1.2"/>' +
           '<text x="46" y="' + (eyeY + 6) + '" fill="#8ea396" font-size="6" text-anchor="middle">' +
           d.d + ' m</text>' +
           '<text x="26" y="' + (eyeY - 4) + '" fill="#ffd27a" font-size="6">' + d.el + '°</text>';
  } else if (x.kind === 'eye') {
    const top = 86 - (d.h / 30) * 70;
    art += '<path d="M62 86 L62 ' + (top + 12) + '" stroke="#3a2f22" stroke-width="3"/>' +
           '<ellipse cx="62" cy="' + (top + 10) + '" rx="16" ry="11" fill="#2c4a33" opacity=".85"/>' +
           '<g stroke="#cfe6d7" stroke-width="1.2" fill="none">' +
           '<circle cx="24" cy="' + (86 - (1.8 / 30) * 70 + 1.5) + '" r="1.6"/>' +
           '<path d="M24 ' + (86 - (1.8 / 30) * 70 + 3.2) + ' L24 ' + (86 - (1.8 / 30) * 70 * 0.45) + '"/>' +
           '<path d="M24 86 L24 ' + (86 - (1.8 / 30) * 70 * 0.45) + '"/></g>' +
           '<text x="30" y="83" fill="#8ea396" font-size="5">1,80 m</text>';
  }
  return '<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
         art + '</svg>';
}

function learnMeasure(kind) {
  mExercise = learnMakeExercise(kind);
  const x = mExercise;
  const el = learnBox(); el.innerHTML = '';
  const wrap = lEl('div', 'lwrap');
  wrap.appendChild(learnHead(LX('Messen & Rechnen', 'Measuring & arithmetic')));
  if (x.draw) {
    const pic = lEl('div', 'lpic'); pic.innerHTML = measSvg(x);
    wrap.appendChild(pic);
  }
  wrap.appendChild(lEl('p', 'ldesc', x.q));

  if (x.choice) {
    const box = lEl('div', 'lopts');
    x.choice.forEach(o => box.appendChild(lBtn(o.label, () => learnMeasWhy(o.v), 'lopt')));
    wrap.appendChild(box);
  } else {
    const row = lEl('div', 'lnum');
    const inp = document.createElement('input');
    inp.type = 'text'; inp.inputMode = 'decimal'; inp.id = 'lmnum';
    inp.placeholder = x.unit === 'cm' ? 'cm' : 'm';
    inp.onkeydown = ev => { if (ev.key === 'Enter') go(); };
    const go = () => {
      const v = parseFloat(String(inp.value).replace(',', '.'));
      if (!isFinite(v)) return;
      learnMeasWhy(v);
    };
    row.appendChild(inp);
    row.appendChild(lBtn(LX('Prüfen', 'Check'), go, 'p'));
    wrap.appendChild(row);
  }
  const foot = lEl('div', 'lrow');
  foot.appendChild(lBtn(LX('Andere Aufgabe', 'Another one'), () => learnMeasure(), 'big'));
  wrap.appendChild(foot);
  el.appendChild(wrap);
  setTimeout(() => { const i = document.getElementById('lmnum'); if (i) i.focus(); }, 60);
}

function learnMeasWhy(given) {
  const x = mExercise;
  const ok = x.choice ? given === x.want : Math.abs(given - x.want) <= x.tol;
  const s = learnState();
  s.meas = s.meas || { asked: 0, right: 0 };
  s.meas.asked++; if (ok) { s.meas.right++; s.points = (s.points || 0) + 1; }
  const today = learnToday();
  if (s.lastDay !== today) {
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    s.streak = (s.lastDay === y) ? (s.streak || 0) + 1 : 1;
    s.lastDay = today;
  }
  learnSave(s);

  const el = learnBox(); el.innerHTML = '';
  const wrap = lEl('div', 'lwrap');
  wrap.appendChild(learnHead(LX('Messen & Rechnen', 'Measuring & arithmetic')));
  wrap.appendChild(lEl('div', 'lverdict ' + (ok ? 'ok' : 'no'),
    ok ? LX('Richtig', 'Right') : LX('Daneben', 'Off')));
  if (!x.choice) {
    const line = lEl('div', 'lwas');
    line.innerHTML = '<span class="' + (ok ? 'good' : 'bad') + '">' + esc(String(given)) + '</span>' +
      ' · ' + LX('richtig', 'correct') + ': <span class="good">' +
      x.want.toFixed(1) + ' ' + x.unit + '</span> · ±' + x.tol.toFixed(1);
    wrap.appendChild(line);
  }
  const how = lEl('p', 'lwhy'); how.style.whiteSpace = 'pre-line';
  how.textContent = x.how;
  wrap.appendChild(how);
  const row = lEl('div', 'lrow');
  row.appendChild(lBtn('▶  ' + LX('Nächste', 'Next'), () => learnMeasure(), 'p big'));
  row.appendChild(lBtn(LX('Übersicht', 'Overview'), learnHome, 'big'));
  wrap.appendChild(row);
  el.appendChild(wrap);
}

/* ============================================================================
   DIE URKUNDE

   Eine bestandene Prüfung, die nur als Zeile in einer Liste steht, ist keine
   Belohnung. Dies ist ein Bild, das man behalten und herumzeigen kann - und
   auf dem in derselben Größe wie alles andere steht, was es nicht ist: keine
   Qualifikation, keine Bescheinigung, keine Grundlage für eine Baumkontrolle.
   Das ist keine Kleingedrucktes-Vorsicht, sondern der Punkt: wer
   Verkehrssicherheit beurteilt, haftet dafür.

   Drawn on a canvas and handed over as a PNG - no library, no server, and
   nothing leaves the phone.
   ========================================================================= */
function learnCertCanvas(rec) {
  const W = 1200, H = 840;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#0e1712'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#2f6b4a'; g.lineWidth = 6; g.strokeRect(26, 26, W - 52, H - 52);
  g.strokeStyle = '#1e3a2a'; g.lineWidth = 2; g.strokeRect(44, 44, W - 88, H - 88);

  g.textAlign = 'center';
  g.fillStyle = '#8fd6a8'; g.font = '600 26px system-ui,sans-serif';
  g.fillText(LX('ÜBUNG · BAUMKONTROLLE', 'PRACTICE · TREE INSPECTION'), W / 2, 130);

  g.fillStyle = '#eaf3ee'; g.font = '700 62px system-ui,sans-serif';
  g.fillText(LX('Prüfung bestanden', 'Exam passed'), W / 2, 226);

  const who = (typeof userName === 'function' && userName()) ||
              (typeof prefs === 'function' && prefs().inspector) || '';
  if (who) {
    g.fillStyle = '#9fb3a6'; g.font = '24px system-ui,sans-serif';
    g.fillText(LX('für', 'for'), W / 2, 296);
    g.fillStyle = '#eaf3ee'; g.font = '600 44px system-ui,sans-serif';
    g.fillText(who, W / 2, 352);
  }

  g.fillStyle = '#8fd6a8'; g.font = '700 96px system-ui,sans-serif';
  g.fillText(rec.right + ' / ' + rec.of, W / 2, who ? 470 : 430);
  g.fillStyle = '#9fb3a6'; g.font = '24px system-ui,sans-serif';
  g.fillText(LX('Fälle richtig · ' + rec.day, 'cases right · ' + rec.day), W / 2, who ? 512 : 472);

  /* what was covered, so the sheet says something about content */
  const fams = CASE_FAM.map(f => LT(f)).join('  ·  ');
  g.fillStyle = '#c2d2c7'; g.font = '22px system-ui,sans-serif';
  g.fillText(fams, W / 2, 586);

  /* and what it is not - same size, not smaller */
  g.fillStyle = '#e2a04a'; g.font = '600 22px system-ui,sans-serif';
  const warn = LX(
    ['Das ist eine Übung, keine Qualifikation und keine Bescheinigung.',
     'Wer Verkehrssicherheit beurteilt, haftet dafür und braucht eine echte Ausbildung.'],
    ['This is practice. It is not a qualification and not a certificate.',
     'Anyone judging traffic safety is liable for it and needs real training.']);
  warn.forEach((l, i) => g.fillText(l, W / 2, 664 + i * 32));

  g.fillStyle = '#6f8a79'; g.font = '18px system-ui,sans-serif';
  g.fillText('VTA Field · ' + (typeof APP_VERSION === 'string' ? APP_VERSION : ''), W / 2, H - 70);
  return c;
}
function learnCertShow(rec) {
  const el = learnBox(); el.innerHTML = '';
  const wrap = lEl('div', 'lwrap');
  wrap.appendChild(learnHead(LX('Urkunde', 'Certificate'), learnHome));
  const c = learnCertCanvas(rec);
  const box = lEl('div', 'lcert');
  const img = document.createElement('img');
  try { img.src = c.toDataURL('image/png'); } catch (e) { img.alt = ''; }
  box.appendChild(img);
  wrap.appendChild(box);
  const row = lEl('div', 'lrow');
  row.appendChild(lBtn(LX('Bild speichern', 'Save the picture'), () => {
    try {
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = 'vta-uebung-' + rec.day + '.png';
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { toast(LX('Das Bild lässt sich hier nicht speichern.',
                           'The picture cannot be saved here.')); }
  }, 'p big'));
  row.appendChild(lBtn(LX('Übersicht', 'Overview'), learnHome, 'big'));
  wrap.appendChild(row);
  el.appendChild(wrap);
}
