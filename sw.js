/* Awaaz Map Service Worker (Offline PWA Engine) - v4.0 */
const CACHE_NAME = 'awaaz-map-v4.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './download.html',
  './manifest.webmanifest',
  './icon.svg',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/leaflet.heat@0.2.0/dist/leaflet-heat.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Awaaz SW] Pre-caching static assets for v4.0');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[Awaaz SW] Some assets could not be pre-cached:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[Awaaz SW] Deleting older stale cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // For HTML documents / page navigation, ALWAYS use Network-First to prevent stale cache on Mobile & iOS!
  if (req.mode === 'navigate' || (req.headers.get('accept') && req.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(req, { cache: 'reload' }).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkResponse;
      }).catch(() => {
        console.log('[Awaaz SW] Network offline, serving cached index.html');
        return caches.match(req).then(res => res || caches.match('./index.html'));
      })
    );
    return;
  }

  // For static assets, Cache-First with background revalidation
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        if (navigator.onLine) {
          fetch(req).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
            }
          }).catch(() => {});
        }
        return cachedResponse;
      }

      return fetch(req).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
