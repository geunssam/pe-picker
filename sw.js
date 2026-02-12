const CACHE_NAME = 'pe-picker-v2';
const ASSETS = [
  './',
  './index.html',
  './css/design-system.css',
  './css/layout.css',
  './css/animations.css',
  './css/tag-game.css',
  './css/group-manager.css',
  './js/app.js',
  './js/shared/store.js',
  './js/shared/sound.js',
  './js/shared/ui-utils.js',
  './js/shared/timer.js',
  './js/shared/ios-utils.js',
  './js/shared/class-manager.js',
  './js/tag-game/tag-game.js',
  './js/tag-game/tag-game-ui.js',
  './js/group-manager/group-manager.js',
  './js/group-manager/group-manager-ui.js',
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Cache first, network fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
