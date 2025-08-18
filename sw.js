/* =========================================================
   Pirates Tools — sw.js (PWA cache/offline stable)
   - App shell precache
   - NetworkFirst: products.json + navigations
   - CacheFirst: images
   - StaleWhileRevalidate: CSS/JS
   - Hash routes fallback → index.html
========================================================= */

'use strict';
const VERSION        = 'pt-v11';   // ← bump
const CACHE_STATIC   = `pt-static-${VERSION}`;
const CACHE_DYNAMIC  = `pt-dyn-${VERSION}`;
const CACHE_IMAGES   = `pt-img-${VERSION}`;
const CACHE_PRODUCTS = `pt-products-${VERSION}`;

// Liste des fichiers du shell (préchargés)
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  // icônes PWA
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-256.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  // logos
  './images/pirates-tools-logo.webp',
  './images/pirates-tools-logo.png'
];

// --- Install: precache + skipWaiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// --- Activate: cleanup + clientsClaim + navigationPreload
self.addEventListener('activate', async (event) => {
  event.waitUntil((async () => {
    // Nettoyage des anciens caches
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(n => n.startsWith('pt-') && ![CACHE_STATIC, CACHE_DYNAMIC, CACHE_IMAGES, CACHE_PRODUCTS].includes(n))
        .map(n => caches.delete(n))
    );

    // Essaye d'activer la navigation preload (si supporté)
    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.enable(); } catch(_) {}
    }
    await self.clients.claim();
  })());
});

// --- Utils
async function putInCache(cacheName, request, response) {
  const cache = await caches.open(cacheName);
  try { await cache.put(request, response.clone()); } catch (_) {}
  return response;
}

async function fromCache(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreVary: true, ignoreSearch: false });
  return cached || null;
}

async function cacheFirst(request, cacheName) {
  const cached = await fromCache(cacheName, request);
  if (cached) return cached;
  const res = await fetch(request);
  return putInCache(cacheName, request, res);
}

async function networkFirst(request, cacheName, fallbackResponse = null) {
  try {
    const preload = await eventPreloadResponse();
    if (preload) return putInCache(cacheName, request, preload);
    const res = await fetch(request);
    return putInCache(cacheName, request, res);
  } catch (_) {
    const cached = await fromCache(cacheName, request);
    return cached || (fallbackResponse ? fallbackResponse : Promise.reject(_));
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cachePromise = fromCache(cacheName, request);
  const fetchPromise = fetch(request)
    .then(res => putInCache(cacheName, request, res))
    .catch(() => null);
  const cached = await cachePromise;
  return cached || (await fetchPromise);
}

async function eventPreloadResponse() {
  try {
    // @ts-ignore
    return await self.navigationPreload?.getState?.() ? await self.preloadResponse : null;
  } catch (_) { return null; }
}

// --- Fetch strategy router
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // On ne gère que GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignorer tel:, wa.me, analytics & autres origines non pertinentes
  if (url.protocol === 'chrome-extension:') return;
  if (url.hostname === 'wa.me') return;
  if (/google-analytics|gstatic|googletagmanager/.test(url.hostname)) return;

  // Origine externe (CDN images éventuelles) → images en cacheFirst sinon passthrough
  if (url.origin !== location.origin) {
    if (request.destination === 'image') {
      event.respondWith(cacheFirst(request, CACHE_IMAGES));
    }
    return;
  }

  // ----- Navigation requests (hash routes #/… y compris)
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // Préload si dispo (Chrome)
        const preload = await eventPreloadResponse();
        if (preload) return preload;

        const net = await fetch(request);
        // On met en cache l'index si c'est lui / sinon on laisse passer
        if (new URL(net.url).pathname.endsWith('index.html') || new URL(net.url).pathname === '/' ) {
          putInCache(CACHE_STATIC, './index.html', net.clone());
        }
        return net;
      } catch (_) {
        // Offline → fallback index.html du cache
        const cachedIndex = await caches.match('./index.html', { ignoreSearch: true });
        return cachedIndex || Response.error();
      }
    })());
    return;
  }

  // ----- products.json → NetworkFirst (retombe sur cache offline)
  if (url.pathname.endsWith('/products.json') || url.pathname.endsWith('products.json')) {
    event.respondWith(networkFirst(request, CACHE_PRODUCTS));
    return;
  }

  // ----- CSS / JS → SWR
  if (request.destination === 'style' || request.destination === 'script') {
    event.respondWith(staleWhileRevalidate(request, CACHE_STATIC));
    return;
  }

  // ----- Images → CacheFirst
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, CACHE_IMAGES));
    return;
  }

  // ----- Par défaut → SWR (dyn)
  event.respondWith(staleWhileRevalidate(request, CACHE_DYNAMIC));
});
