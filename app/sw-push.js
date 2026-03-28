/* eslint-disable no-restricted-globals */
// GENERATED_BY_AI: 2026-03-28 Web Push Service Worker for next-pwa
// This file is copied to public/ during build

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || 'My-fridgeai';
  const options = {
    body: data.body || '',
    icon: '/icon.png',
    badge: '/icon.png',
    tag: data.tag || 'default',
    data: data.url || '/',
    requireInteraction: true,
    ...data.options,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data || '/';

  event.waitUntil(
    // @ts-ignore
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // @ts-ignore
      if (clients.openWindow) {
        // @ts-ignore
        return clients.openWindow(urlToOpen);
      }
      return undefined;
    })
  );
});
