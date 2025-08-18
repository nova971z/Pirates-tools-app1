/* =========================================================
   Pirates Tools — sw.js (PWA cache/offline PRO)
   - App shell précache (+ index fallback)
   - Navigations: network-first (+ preload si dispo)
   - products.json: network-first (retombe sur cache)
   - Images: cache-first (ok opaque CORS)
   - CSS/JS/Fonts/JSON: stale-while-revalidate
   - Trim automatique des caches (anti-gonflement)
   - Message 'SKIP_WAITING' supporté
========================================================= */

'use strict';

const VERSION        = 'pt-v11';
const CACHE_STATIC   = `pt-static-${VERSION}`;
const CACHE_DYNAMIC  = `pt-dyn-${VERSION}`;
const CACHE_IMAGES   = `pt-img-${VERSION}`;
const CACHE_PRODUCTS = `pt-products-${VERSION}`;

// Limites simples pour éviter de gonfler
const LIMIT_STATIC   = 80;
const LIMIT_DYNAMIC  = 80;
const LIMIT_IMAGES   = 140;
const LIMIT_PRODUCTS = 10;

// App shell (mets ici les assets critiques)
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
  // logos (avec et sans query pour couvrir les deux)
  './images/pirates-tools-logo.png',
  './images/pirates-tools-logo.png?v=7',
  './images/pirates-tools-logo.webp'
];

/* ---------------- Install ---------------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => void 0)
  );
});

/* ---------------- Activate ---------------- */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Supprime les vieux caches pt-* obsolètes
    const keep = new Set([CACHE_STATIC, CACHE_DYNAMIC, CACHE_IMAGES, CACHE_PRODUCTS]);
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(n => n.startsWith('pt-') && !keep.has(n))
        .map(n => caches.delete(n))
    );

    // Active la navigation preload si possible
    try {
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable();
      }
    } catch (_) {}

    await self.clients.claim();
  })());
});

/* ---------------- Utils ---------------- */
const isCachable = (req, res) =>
  req.method === 'GET' &&
  res &&
  (res.ok || res.type === 'opaque'); // autorise les réponses opaques (CORS)

async function putInCache(cacheName, request, response) {
  if (!isCachable(request, response)) return response;
  const cache = await caches.open(cacheName);
  try { await cache.put(request, response.clone()); } catch (_) {}
  return response;
}

async function fromCache(cacheName, request, { ignoreSearch = false } = {}) {
  const cache = await caches.open(cacheName);
  return cache.match(request, { ignoreVary: true, ignoreSearch }) || null;
}

async function trimCache(cacheName, maxEntries) {
  if (!maxEntries || maxEntries <= 0) return;
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const extra = keys.length - maxEntries;
  if (extra > 0) {
    await Promise.all(keys.slice(0, extra).map(k => cache.delete(k)));
  }
}

// Strategies
async function cacheFirst(event, request, cacheName, limit) {
  const cached = await fromCache(cacheName, request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    event.waitUntil((async () => {
      await putInCache(cacheName, request, res);
      await trimCache(cacheName, limit);
    })());
    return res.clone();
  } catch (_) {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(event, request, cacheName, limit) {
  const cachePromise = fromCache(cacheName, request);
  const fetchPromise = fetch(request)
    .then(async (res) => {
      await putInCache(cacheName, request, res);
      await trimCache(cacheName, limit);
      return res.clone();
    })
    .catch(() => null);

  const cached = await cachePromise;
  if (cached) {
    // rafraîchit en arrière-plan
    event.waitUntil(fetchPromise);
    return cached;
  }
  const fresh = await fetchPromise;
  return fresh || Response.error();
}

async function networkFirst(event, request, cacheName, limit, fallbackResponse = null) {
  try {
    // navigation preload si dispo
    const preload = await event.preloadResponse;
    if (preload) {
      event.waitUntil((async () => {
        await putInCache(cacheName, request, preload);
        await trimCache(cacheName, limit);
      })());
      return preload.clone();
    }

    const res = await fetch(request);
    event.waitUntil((async () => {
      await putInCache(cacheName, request, res);
      await trimCache(cacheName, limit);
    })());
    return res.clone();
  } catch (err) {
    const cached = await fromCache(cacheName, request);
    if (cached) return cached;
    if (fallbackResponse) return fallbackResponse;
    return Response.error();
  }
}

/* ---------------- Fetch router ---------------- */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // GET uniquement
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignorer certaines origines / schémas (extensions, analytics, WhatsApp)
  if (url.protocol === 'chrome-extension:') return;
  if (url.hostname === 'wa.me') return;
  if (/google-analytics|gstatic|googletagmanager/.test(url.hostname)) return;

  // Navigations (SPA/hash routes comprises) → network-first + fallback index
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) {
          // on rafraîchit l'index si c'est lui
          const u = new URL(preload.url);
          if (u.pathname === '/' || u.pathname.endsWith('/index.html')) {
            event.waitUntil(putInCache(CACHE_STATIC, './index.html', preload.clone()));
          }
          return preload;
        }

        const net = await fetch(request);
        // mise en cache de l'index si on l'a touché
        const u = new URL(net.url);
        if (u.pathname === '/' || u.pathname.endsWith('/index.html')) {
          event.waitUntil(putInCache(CACHE_STATIC, './index.html', net.clone()));
        }
        return net;
      } catch (_) {
        const cachedIndex = await caches.match('./index.html', { ignoreSearch: true });
        return cachedIndex || Response.error();
      }
    })());
    return;
  }

  // Externe (CDN) : images en cache-first, sinon passthrough
  if (url.origin !== location.origin) {
    if (request.destination === 'image') {
      event.respondWith(cacheFirst(event, request, CACHE_IMAGES, LIMIT_IMAGES));
    }
    return;
  }

  // products.json → network-first (cache dédié)
  if (url.pathname.endsWith('/products.json') || url.pathname.endsWith('products.json')) {
    const emptyJson = new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    event.respondWith(networkFirst(event, request, CACHE_PRODUCTS, LIMIT_PRODUCTS, emptyJson));
    return;
  }

  // CSS / JS / Fonts / JSON (autres) → SWR
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font'  ||
    (request.destination === '' && url.pathname.endsWith('.json'))
  ) {
    event.respondWith(staleWhileRevalidate(event, request, CACHE_STATIC, LIMIT_STATIC));
    return;
  }

  // Images → cache-first
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(event, request, CACHE_IMAGES, LIMIT_IMAGES));
    return;
  }

  // Par défaut → SWR (dyn)
  event.respondWith(staleWhileRevalidate(event, request, CACHE_DYNAMIC, LIMIT_DYNAMIC));
});

/* ---------------- Messages ---------------- */
self.addEventListener('message', (event) => {
  if (!event || !event.data) return;
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
