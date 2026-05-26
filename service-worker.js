// SW viejo (obsoleto). Se auto-desregistra y borra todos los caches
// para liberar el control a sw.js. Stub residual para clientes pegados.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
// Pasa todo a network mientras tanto.
self.addEventListener('fetch', () => {});
// Responde VERSION para que el kill-switch lo identifique como obsoleto.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: 'jaikuaa-deprecated' });
  }
});
