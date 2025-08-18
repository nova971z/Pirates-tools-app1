/* =========================================================
   Pirates Tools — sw.js (PWA cache/offline, GitHub Pages OK)
   - App shell pré-cache
   - Navigations → network-first + fallback index.html (SPA/hash)
   - products.json → network-first (+fallback cache)
   - CSS/JS → stale-while-revalidate
   - Images → cache-first
   - Nettoyage anciens caches + navigationPreload (si supporté)
   ========================================================= */

'use strict';

const VERSION        = 'pt-v6';
const CACHE_STATIC   = `pt-static-${VERSION}`;
const CACHE_DYNAMIC  = `pt-dyn-${VERSION}`;
const CACHE_IMAGES   = `pt-img-${VERSION}`;
const CACHE_PRODUCTS = `pt-products-${VERSION}`;

// Fichiers du shell (pré-cache) — compat GitHub Pages
const APP_SHELL = [
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './images/pirates-tools-logo.webp',
  './images/pirates-tools-logo.png'
];

/* ---------------- Install ---------------- */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_STATIC);
    try { await cache.addAll(APP_SHELL); } catch (_) { /* ignore */ }
    await self.skipWaiting();
  })());
});

/* ---------------- Activate ---------------- */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Nettoyage
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(n => n.startsWith('pt-') && ![CACHE_STATIC, CACHE_DYNAMIC, CACHE_IMAGES, CACHE_PRODUCTS].includes(n))
        .map(n => caches.delete(n))
    );

    // Navigation preload (si supporté)
    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.enable(); } catch(_) {}
    }

    await self.clients.claim();
  })());
});

/* ---------------- Helpers ---------------- */
async function putInCache(cacheName, request, response) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch (_) {}
  return response;
}

async function fromCache(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreVary: true });
  return cached || null;
}

async function cacheFirst(request, cacheName) {
  const cached = await fromCache(cacheName, request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.ok) return putInCache(cacheName, request, res);
    return res;
  } catch (_) {
    return cached || new Response('', { status: 503 });
  }
}

async function networkFirst(event, request, cacheName, fallbackResponse = null) {
  try {
    // Pré-réponse de navigation (Chrome) si dispo
    const preload = event.preloadResponse ? await event.preloadResponse : null;
    if (preload) {
      putInCache(cacheName, request, preload.clone());
      return preload;
    }
    const res = await fetch(request, { cache: 'no-cache' });
    if (res && res.ok) putInCache(cacheName, request, res.clone());
    return res;
  } catch (err) {
    const cached = await fromCache(cacheName, request);
    if (cached) return cached;
    if (fallbackResponse) return fallbackResponse;
    return new Response('', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedPromise = cache.match(request, { ignoreVary: true });
  const fetchPromise = fetch(request)
    .then(res => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);

  const cached = await cachedPromise;
  if (cached) { fetchPromise; return cached; }

  const fresh = await fetchPromise;
  return fresh || new Response('', { status: 503 });
}

/* ---------------- Fetch router ---------------- */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // GET uniquement
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignorer certaines origines/protocoles
  if (url.protocol === 'chrome-extension:') return;
  if (url.hostname === 'wa.me') return;
  if (/google-analytics|gstatic|googletagmanager/.test(url.hostname)) return;

  // Origine externe → cache images sinon passthrough
  if (url.origin !== self.location.origin) {
    if (request.destination === 'image') {
      event.respondWith(cacheFirst(request, CACHE_IMAGES));
    }
    return;
  }

  // Navigations → network-first + fallback index.html
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = event.preloadResponse ? await event.preloadResponse : null;
        if (preload) {
          putInCache(CACHE_STATIC, './index.html', preload.clone());
          return preload;
        }

        const net = await fetch(request);
        // Si c'est l'index, on le met à jour dans le cache
        const u = new URL(net.url);
        if (u.pathname === '/' || u.pathname.endsWith('index.html')) {
          putInCache(CACHE_STATIC, './index.html', net.clone());
        }
        return net;
      } catch (_) {
        const cachedIndex = await caches.match('./index.html', { ignoreSearch: true });
        return cachedIndex || new Response('<h1>Hors-ligne</h1>', { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // products.json → network-first
  if (url.pathname.endsWith('/products.json') || url.pathname.endsWith('products.json')) {
    event.respondWith(networkFirst(event, request, CACHE_PRODUCTS, new Response('[]', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // CSS / JS → SWR
  if (request.destination === 'style' || request.destination === 'script') {
    event.respondWith(staleWhileRevalidate(request, CACHE_STATIC));
    return;
  }

  // Images → cache-first
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, CACHE_IMAGES));
    return;
  }

  // Par défaut → SWR (dynamique)
  event.respondWith(staleWhileRevalidate(request, CACHE_DYNAMIC));
});

/* ---------------- Mise à jour immédiate via postMessage ---------------- */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
