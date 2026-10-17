const CACHE_NAME = 'rasyonsys-offline-v10';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './noto-ration.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon.ico',
  './favicon-16x16.png',
  './favicon-32x32.png',
  './og-image.png',
  './KULLANIM_KILAVUZU.md',
  './README.md',
  './i18n/tr.json',
  './lib/ration-engine/nrc-2016-tables.json',
  './lib/ration-engine/nrc-2021-dairy-tables.json',
  './lib/ration-engine/nrc-2007-sheep-tables.json',
  './lib/ration-engine/nrc-2007-dairy-sheep-tables.json',
  './lib/ration-engine/feeds-db.json',
  './lib/ration-engine/beef-engine.js',
  './lib/ration-engine/dairy-engine.js',
  './lib/ration-engine/sheep-engine.js',
  './lib/ration-engine/dairy-sheep-engine.js',
  './lib/ration-engine/README.md'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
          return networkResponse;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
