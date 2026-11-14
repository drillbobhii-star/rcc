/* RCC: retire the legacy advertising service worker and its caches.
   Keep this cleanup worker briefly so existing visitors unregister the old worker
   when they next load the site after deployment. */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.map(client => client.navigate(client.url)));
  })());
});
