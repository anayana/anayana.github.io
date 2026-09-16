/* Service worker: keep the whole app available offline.
   Navigation requests are network-first so fixes reach the field as soon as there
   is a connection; assets are cache-first. Bump CACHE on every change. */
const CACHE = 'vta-v121';
/* Map tiles live in their own cache: they are none of the app's business to
   version, and an area looked at once should still be there in the field with
   no network. Kept across updates, cleared only with the app's storage. */
const TILES = 'vta-tiles';
const TILE_HOST = 'tile.openstreetmap.org';
const ASSETS = [
  './',
  'index.html',
  'app.js?v=2.58.0',
  'data.js?v=2.58.0',
  'norms.js?v=2.58.0',
  'i18n.js?v=2.58.0',
  'mapper.js?v=2.58.0',
  'users.js?v=2.58.0',
  'voice.js?v=2.58.0',
  'plantnet.js?v=2.58.0',
  'osm.js?v=2.58.0',
  'research.js?v=2.58.0',
  'marks.js?v=2.58.0',
  'pins.js?v=2.58.0',
  'ghost.js?v=2.58.0',
  'guide.js?v=2.58.0',
  'docx.js?v=2.58.0',
  'reports.js?v=2.58.0',
  'mapsheet.js?v=2.58.0',
  'sign.js?v=2.58.0',
  'gate.js?v=2.58.0',
  'vendor/three.min.js?v=2.58.0',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png'
];

/* Pre-cache one asset at a time rather than with addAll: a single failure there
   rejects the whole install and leaves the worker with an empty cache, which is
   the worst outcome for an app meant to run without a network.
   cache:'reload' bypasses the browser HTTP cache - Pages serves assets with
   max-age=600, so without it a fresh worker can store a stale build. */
async function precache() {
  const c = await caches.open(CACHE);
  const results = await Promise.all(ASSETS.map(async u => {
    try {
      const r = await fetch(new Request(u, { cache: 'reload' }));
      if (!r.ok) return u + ' -> ' + r.status;
      await c.put(new Request(u), r);          // plain request as the cache key
      return null;
    } catch (err) {
      return u + ' -> ' + err.message;
    }
  }));
  const failed = results.filter(Boolean);
  if (failed.length) console.warn('[sw] not pre-cached:', failed);
}
self.addEventListener('install', e => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== TILES).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
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
  /* An asset that is not cached yet has to come off the network, and the same
     stalled connection would hang the script tag waiting for it - a page that
     never finishes loading, which is the other half of the dead app. Give up
     after eight seconds instead: the page finishes, the script errors, and the
     watchdog in index.html shows a way out. */
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      const net = fetch(req).then(r => {
        if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
        return r;
      });
      const give = new Promise(res => setTimeout(() =>
        res(new Response('', { status: 504, statusText: 'no answer from the network' })), 8000));
      return Promise.race([net, give]);
    })
  );
});
