/* No service worker here.

   This copy of the app deliberately has none. The file exists only so that a
   browser which asks for it gets a worker that removes itself rather than a
   404, and so nothing can accumulate at this path either. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (e) {}
    try { await self.registration.unregister(); } catch (e) {}
  })());
});
