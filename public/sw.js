// Service Worker minimal
self.addEventListener('install', (event) => {
  console.log('SW installé');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('SW activé');
});

// Gestion des notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
