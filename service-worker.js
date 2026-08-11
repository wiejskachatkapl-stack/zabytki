const APP_VERSION = 'v1052';
const CACHE_NAME = `turystyczna-mapa-polski-${APP_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js?v=1051',
  './manifest.webmanifest',
  './assets/bg-desktop.png',
  './assets/bg-mobile.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/markers/castle.png',
  './assets/markers/ruins.png',
  './assets/markers/museum.png',
  './assets/markers/nature.png',
  './assets/markers/pttk.png',
  './assets/markers/cave.png',
  './assets/markers/reserve.png',
  './assets/markers/historic.png',
  './assets/markers/water.png',
  './data/atrakcje-polska.json?v=1051'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('turystyczna-mapa-polski-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  // Dokument startowy sprawdzamy w sieci, aby nowa wersja PWA pojawiała się od razu.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // v1052: pliki wersjonowane i grafiki są obsługiwane cache-first.
  // Telefon nie pobiera i nie przetwarza ponownie tej samej dużej bazy przy każdym wejściu.
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        });
      })
  );
});
