const CACHE_NAME = 'idt-academy-cache-v1';
const APP_ICON = 'https://i.imgur.com/mgRKw4Q.png';
const LOGO = 'https://i.imgur.com/oyqM5oF.png';
const OFFLINE_URL = './register.html';

const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  './',
  APP_ICON,
  LOGO
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.filter(function (cacheName) {
          return cacheName !== CACHE_NAME;
        }).map(function (cacheName) {
          return caches.delete(cacheName);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(function (response) {
        return response;
      }).catch(function () {
        return caches.match(event.request).then(function (cached) {
          return cached || caches.match(OFFLINE_URL);
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function () {
        return cached;
      });
    })
  );
});

self.addEventListener('push', function (event) {
  let notificationData = 'New update from IDT Academy!';
  if (event.data) {
    notificationData = event.data.text();
  }
  const options = {
    body: notificationData,
    icon: APP_ICON,
    badge: APP_ICON,
    vibrate: [100, 50, 100],
    data: {
      url: './register.html?mode=app'
    }
  };
  event.waitUntil(
    self.registration.showNotification('IDT Academy', options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  let targetUrl = new URL('./register.html?mode=app', self.location.origin).href;
  if (event.notification.data && event.notification.data.url) {
    targetUrl = new URL(event.notification.data.url, self.location.origin).href;
  }
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});