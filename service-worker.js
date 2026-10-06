// Service Worker di Sweat — gestisce le notifiche push vere,
// che arrivano anche con l'app chiusa o il telefono bloccato.

self.addEventListener('install', function(event){
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event){
  let data = { title: 'Sweat', body: 'Hai una nuova notifica', url: '/' };
  try {
    if(event.data) data = Object.assign(data, event.data.json());
  } catch(e){
    if(event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: data.icon || undefined,
    badge: data.badge || undefined,
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function(event){
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientsArr){
      for (const client of clientsArr){
        if (client.url.indexOf(url) !== -1 && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
