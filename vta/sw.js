/* Service worker: keep the whole app available offline.
   Navigation requests are network-first so fixes reach the field as soon as there
   is a connection; assets are cache-first. Bump CACHE on every change. */
const CACHE = 'vta-v4';
const ASSETS = [
  './',
  'index.html',
  'app.js',
  'data.js',
  'vendor/three.min.js',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png'
];

self.addEventListener('install', e => {
  // cache:'reload' bypasses the browser HTTP cache. GitHub Pages serves assets
  // with max-age=600, so without it a fresh worker can pre-cache stale files
  // and pin an old build for the next ten minutes.
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
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
  const url = new URL(req.url);
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
