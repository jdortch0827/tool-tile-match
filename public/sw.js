const CACHE_NAME = 'tool-tile-match-phase21-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-icon-512.png',
  '/branding/tool-tile-match-icon-1024.png',
  '/branding/tool-tile-match-icon-512.png',
  '/branding/jobsite-dawn.jpg',
  '/branding/jobsite-dawn-large.jpg',
  '/branding/workbench-shop.jpg',
  '/jobsite-background.svg',
  '/tool-icons/hammer.png',
  '/tool-icons/wrench.png',
  '/tool-icons/screwdriver.png',
  '/tool-icons/measure.png',
  '/tool-icons/drill.png',
  '/tool-icons/saw.png',
  '/tool-icons/hardhat.png',
  '/tool-icons/vest.png',
  '/tool-icons/pliers.png',
  '/tool-icons/level.png',
  '/tool-icons/roller.png',
  '/tool-icons/knife.png',
  '/tool-icons/ladder.png',
  '/tool-icons/toolbox.png',
  '/tool-icons/cone.png',
  '/tool-icons/bolts.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const request = event.request;
  const isNavigation = request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', responseClone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    fetch(request, { cache: 'no-store' })
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
