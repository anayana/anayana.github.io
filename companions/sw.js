/* Service worker: the app has to run without a network - the whole point is
   that nothing leaves the flat. Navigation is network-first so fixes arrive,
   assets are cache-first. Bump CACHE on every change. */
const CACHE = 'hc-v4';
const ASSETS = [
  './',
  'index.html',
  'app.js?v=1.0.3',
  'vendor/three.min.js?v=1.0.0',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png'
];

/* One at a time rather than addAll: a single failure there rejects the whole
   install and leaves an empty cache, the worst outcome for an offline app.
   cache:'reload' bypasses the HTTP cache, which Pages sets to max-age=600. */
async function precache() {
  const c = await caches.open(CACHE);
  const results = await Promise.all(ASSETS.map(async u => {
    try {
      const r = await fetch(new Request(u, { cache: 'reload' }));
      if (!r.ok) return u + ' -> ' + r.status;
      await c.put(new Request(u), r);
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
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(new Request(req.url, { cache: 'no-cache' }))
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
