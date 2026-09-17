/* Service worker: keep the whole app available offline.
   Navigation requests are network-first so fixes reach the field as soon as there
   is a connection; assets are cache-first. Bump CACHE on every change. */
const CACHE = 'vta-v122';
/* Map tiles live in their own cache: they are none of the app's business to
   version, and an area looked at once should still be there in the field with
   no network. Kept across updates, cleared only with the app's storage. */
const TILES = 'vta-tiles';
const TILE_HOST = 'tile.openstreetmap.org';
const ASSETS = [
  './',
  'index.html',
  'app.js?v=2.58.1',
  'data.js?v=2.58.1',
  'norms.js?v=2.58.1',
  'i18n.js?v=2.58.1',
  'mapper.js?v=2.58.1',
  'users.js?v=2.58.1',
  'voice.js?v=2.58.1',
  'plantnet.js?v=2.58.1',
  'osm.js?v=2.58.1',
  'research.js?v=2.58.1',
  'marks.js?v=2.58.1',
  'pins.js?v=2.58.1',
  'ghost.js?v=2.58.1',
  'guide.js?v=2.58.1',
  'docx.js?v=2.58.1',
  'reports.js?v=2.58.1',
  'mapsheet.js?v=2.58.1',
  'sign.js?v=2.58.1',
  'gate.js?v=2.58.1',
  'vendor/three.min.js?v=2.58.1',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png'
];

/* Pre-caching, and the rule that was missing from it.

   One asset at a time, each retried, cache:'reload' to get past the HTTP cache
   because Pages serves with max-age=600 and a fresh worker must not store a
   stale build.

   The rule: an install that did not get every file DOES NOT TAKE OVER. It used
   to log a warning and carry on, which is the wrong way round - the new worker
   would activate with half a cache and then the activate step would throw the
   OLD, complete cache away. A phone on a thin connection could come out of an
   update with no offline copy at all, and that is a dead app in a wood. A
   failed install costs nothing: the old worker stays in charge with the old
   complete app, and the update is tried again on the next start. */
const TRIES = 3;
async function getOnce(u) {
  const r = await fetch(new Request(u, { cache: 'reload' }));
  if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
  return r;
}
async function precache() {
  const c = await caches.open(CACHE);
  const failed = [];
  for (const u of ASSETS) {
    let last = null;
    for (let n = 0; n < TRIES; n++) {
      try { await c.put(new Request(u), await getOnce(u)); last = null; break; }
      catch (err) { last = err; await new Promise(r => setTimeout(r, 400 * (n + 1))); }
    }
    if (last) failed.push(u + ' -> ' + last.message);
  }
  if (failed.length) {
    console.warn('[sw] install abandoned, the old version stays:', failed);
    await caches.delete(CACHE);            // leave no half-filled cache behind
    throw new Error('incomplete precache: ' + failed.length + ' of ' + ASSETS.length);
  }
}
self.addEventListener('install', e => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

/* Old versions are swept only once this one is known to be whole - checked
   again here, because between install and activate is a place things happen. */
async function sweep() {
  const c = await caches.open(CACHE);
  for (const u of ASSETS) if (!(await c.match(new Request(u)))) {
    console.warn('[sw] this version is not complete; keeping the older caches');
    return;
  }
  const ks = await caches.keys();
  await Promise.all(ks.filter(k => k !== CACHE && k !== TILES).map(k => caches.delete(k)));
}
self.addEventListener('activate', e => {
  e.waitUntil(sweep().then(() => self.clients.claim()));
});

const NAV_WAIT = 2500;          // how long a start waits for the network before the cache answers

async function navigate(req) {
  const cached = await caches.match(req) || await caches.match('index.html') || await caches.match('./');
  const fresh = fetch(new Request(req.url, { cache: 'no-cache' })).then(r => {
    if (r && r.ok) caches.open(CACHE).then(c => c.put(req, r.clone())).catch(() => {});
    return r;
  });
  /* with nothing cached there is nothing to fall back to: wait for the network,
     however long it takes, because a blank screen is the only alternative */
  if (!cached) return fresh.catch(() => new Response(OFFLINE_PAGE, { headers: { 'Content-Type': 'text/html' } }));
  const timer = new Promise(res => setTimeout(() => res(null), NAV_WAIT));
  const won = await Promise.race([fresh.catch(() => null), timer]);
  return (won && won.ok) ? won : cached;
}
/* Only ever seen on a first start with no network at all. */
const OFFLINE_PAGE =
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>VTA Field</title><body style="background:#0d1310;color:#e7f0ea;font:16px/1.5 system-ui;padding:24px">' +
  '<h1 style="font-size:20px">VTA Field</h1><p>The app is not on this phone yet and there is no connection ' +
  'to fetch it with. Open it once with a connection and it will work offline from then on.</p>' +
  '<p><button onclick="location.reload()" style="font:inherit;padding:10px 16px">Try again</button></p>';

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === TILE_HOST) {
    e.respondWith(
      caches.open(TILES).then(c => c.match(req).then(hit => {
        if (hit) return hit;
        return fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })
                         .catch(() => hit || Response.error());
      }))
    );
    return;
  }
  if (url.origin !== location.origin) return;
  /* The repair page is deliberately outside all of this. It exists for the
     case where the worker or the cache is the problem, so it must never come
     from either: the browser fetches it the ordinary way. */
  if (url.pathname.endsWith('/repair.html')) return;

  /* Opening the app.

     This used to be network-first with no time limit, and that is how an
     installed app hangs: a connection that is down fails in milliseconds and
     the cache answers, but a connection that is up and answering nothing -
     a hotel portal, a cell with one bar, a tunnel - leaves the fetch pending
     for as long as the phone will allow, and respondWith waits with it. In a
     browser tab that looks like a slow page and there is a reload button. In
     a standalone window there is no button and no address bar: it is a dead
     app on a phone in a wood.

     So: whichever answers first, the network or the cache, within a couple of
     seconds. The cached copy wins ties by being instant, and the fresh page is
     still fetched and stored for the next start, so an update is never more
     than one launch away. Nothing stale is served for long, and nothing hangs. */
  if (req.mode === 'navigate') {
    e.respondWith(navigate(req));
    return;
  }
  /* An asset that is not cached yet has to come off the network. A stalled
     connection would hang the script tag on it for ever, so there is a limit -
     but a generous one. Eight seconds was too mean: a slow-but-working mobile
     connection needs longer than that for a file, and cutting it off turns
     "slow" into "broken", which is worse than waiting. Thirty seconds, and
     then an error the page can see rather than an empty body it cannot. */
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      const net = fetch(req).then(r => {
        if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)).catch(() => {}); }
        return r;
      });
      const give = new Promise((res, rej) =>
        setTimeout(() => rej(new Error('no answer from the network')), 30000));
      return Promise.race([net, give]);
    })
  );
});
