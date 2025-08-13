const CACHE = 'pirates-tools-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './products.json',
  './images/pirates-tools-logo.png',
  './icons/icon-180.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Stratégie SWR (stale-while-revalidate)
  e.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => cached); // offline -> cache
      return cached || fetchPromise;
    })
  );
});
