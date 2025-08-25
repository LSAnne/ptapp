self.addEventListener("install", (event) => {
  console.log("Service worker installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service worker activated");
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
const CACHE_VERSION = 'v7'; // bump this each time you deploy
const STATIC_CACHE = `static-${CACHE_VERSION}`;

// Optionally: don't cache HTML while developing
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isHTML = req.headers.get('accept')?.includes('text/html');
  if (isHTML) {
    // network-first for HTML so updates show
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(STATIC_CACHE).then(cache =>
      cache.addAll([
        '/', '/index.html',
        '/client-dashboard.html', '/trainer-dashboard.html',
        '/css/theme.css',
        // …add other static assets (JS/CSS/images)
      ])
    )
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});