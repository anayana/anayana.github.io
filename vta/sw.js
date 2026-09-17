/* ============================================================================
   KILL SWITCH

   This file used to be the offline cache of the app. It is now the opposite:
   its only job is to remove itself, and every cache it ever made, from every
   phone it is still installed on.

   Why. A service worker sits between the app and the network, and a worker
   that misbehaves cannot be got at from inside the app - on a phone with an
   installed app there is no address bar, no reload, and no way in. That is a
   dead app, and it was mine. So the layer goes away entirely. The app becomes
   an ordinary web page: it loads or it says why, and nothing can hold it.

   What this costs: the app no longer works with no connection at all, and map
   tiles are fetched again each time. What it buys: it starts.

   The browser fetches this file again on its own whenever the app is opened,
   sees it has changed, installs it and runs what is below - so this reaches a
   phone without anybody having to do anything there.

   Stored data is untouched. The register, the field records, the photographs,
   the users and the trail live in localStorage and IndexedDB. A cache is not
   either of those, and nothing here goes near them.
   ========================================================================= */

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (e) {}
    try { await self.registration.unregister(); } catch (e) {}
    /* and reload whatever is open, so the page in front of the person is
       served by the network from this second on rather than by a corpse */
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(c => { try { c.navigate(c.url); } catch (e) {} });
    } catch (e) {}
  })());
});

/* Nothing is intercepted while this one is alive. */
