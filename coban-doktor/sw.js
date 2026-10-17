const CACHE_NAME = 'cobandoktor-mera-v9';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './KULLANIM_KILAVUZU.md',
  './WHATSAPP_BOT.md',
  './favicon.ico',
  './favicon-16x16.png',
  './favicon-32x32.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './og-image.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Önce önbellekten anında sun (İnternetsiz mera/ahır koşulları için kesintisiz çalışma)
      if (cachedResponse) {
        // Arka planda internet varsa önbelleği güncelle
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {/* internetsiz ortam, sessizce devam et */});
        return cachedResponse;
      }

      // 2. Önbellekte yoksa ağdan çek ve önbelleğe kaydet
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // 3. Ağ yoksa ve sayfa çağrılıyorsa index.html'e düşür (Çevrimdışı Fallback)
        if (event.request.mode === 'navigate' || event.request.destination === 'document') {
          return caches.match('./index.html') || caches.match('./');
        }
      });
    })
  );
});
