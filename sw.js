/* RCC admin Web Push service worker. */
self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (_) { data = { body: event.data ? event.data.text() : "Tienes un mensaje nuevo." }; }
  const title = data.title || "RCC · Nuevo mensaje";
  const options = {
    body: data.body || "Un usuario te ha escrito en RCC.",
    tag: data.tag || "rcc-admin-chat",
    renotify: true,
    data: { url: data.url || "/admin.html#messages" },
    badge: "/assets/rcc-push-badge.svg",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/admin.html#messages", self.location.origin).toString();
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type:"window", includeUncontrolled:true });
    for (const client of clients) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      if ("navigate" in client) await client.navigate(target);
      return client.focus();
    }
    return self.clients.openWindow(target);
  })());
});
