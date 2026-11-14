/* RCC: retire the legacy advertising service worker.
   This temporary worker unregisters itself for visitors who still have it installed. */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.map(client => client.navigate(client.url)));
  })());
});
