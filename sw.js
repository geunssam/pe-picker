const CACHE_NAME = 'pe-picker-v3';

const ASSETS = [
  './',
  './index.html',
  './login.html',
  './wizard.html',
  './css/design-system.css',
  './css/layout.css',
  './css/animations.css',
  './css/tag-game.css',
  './css/group-manager.css',
  './css/login.css',
  './css/wizard.css',
  './assets/logo.svg',
  './manifest.json',
  './js/firebase-config.js',
  './js/auth-manager.js',
  './js/firestore-sync.js',
  './js/wizard.js',
  './js/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;

  // Non-GET or cross-origin requests are not handled by this SW.
  if (request.method !== 'GET' || !isSameOrigin) {
    return;
  }

  // Document navigation: network-first with cached app-shell fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(async () => {
          const fallback = await caches.match('./index.html');
          return fallback || Response.error();
        })
    );
    return;
  }

  // Static resources: cache-first, network fallback, then explicit error response.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).catch(() => Response.error());
    })
  );
});
