/* Service worker: keep the whole app available offline.
   Navigation requests are network-first so fixes reach the field as soon as there
   is a connection; assets are cache-first. Bump CACHE on every change. */
const CACHE = 'vta-v77';
/* Map tiles live in their own cache: they are none of the app's business to
   version, and an area looked at once should still be there in the field with
   no network. Kept across updates, cleared only with the app's storage. */
const TILES = 'vta-tiles';
const TILE_HOST = 'tile.openstreetmap.org';
const ASSETS = [
  './',
  'index.html',
  'app.js?v=2.22.0',
  'data.js?v=2.22.0',
  'vendor/three.min.js?v=2.22.0',
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

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(new Request(req.url, { cache: 'no-cache' }))   // revalidate, never serve a stale page
        .then(r => { caches.open(CACHE).then(c => c.put(req, r.clone())); return r; })
        .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(r => {
        if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
        return r;
      });
    })
  );
});
