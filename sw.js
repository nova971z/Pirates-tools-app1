/* =========================================================
   Pirates Tools — sw.js (PWA cache/offline PRO)
   - App shell précache (+ index fallback)
   - Navigations: network-first (+ preload si dispo)
   - products.json: network-first (retombe sur cache)
   - Images: cache-first (ok opaque CORS) + fallback offline
   - CSS/JS/Fonts/JSON: stale-while-revalidate (ignoreSearch ok)
   - Trim automatique des caches (anti-gonflement)
   - Warm-up products.json à l'install
   - Messages: SKIP_WAITING / CLEAR_CACHES / GET_VERSION
========================================================= */

'use strict';

const VERSION        = 'pt-v23'; // bump version pour forcer la MAJ
const CACHE_STATIC   = `pt-static-${VERSION}`;
const CACHE_DYNAMIC  = `pt-dyn-${VERSION}`;
const CACHE_IMAGES   = `pt-img-${VERSION}`;
const CACHE_PRODUCTS = `pt-products-${VERSION}`;

// Quotas (anti-gonflement)
const LIMIT_STATIC   = 80;
const LIMIT_DYNAMIC  = 120;
const LIMIT_IMAGES   = 120;
const LIMIT_PRODUCTS = 8;

// URL d’index (robuste sous sous-dossier GitHub Pages)
const INDEX_URL = new URL('./index.html', self.location).toString();

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './favicon.ico',
  // icônes PWA
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-256.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  // logo (sans ?v=, on matche en loose côté cache images)
  './images/pirates-tools-logo.png'
];

/* ---------------- Helpers ---------------- */
const isCachable = (req, res) =>
  req.method === 'GET' && res && (res.ok || res.type === 'opaque');

async function putInCache(cacheName, request, response) {
  if (!isCachable(request, response)) return response;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch (_) {}
  return response;
}

async function fromCache(cacheName, request, { ignoreSearch = false } = {}) {
  const cache = await caches.open(cacheName);
  const match = await cache.match(request, { ignoreSearch, ignoreVary: true });
  return match || null;
}

async function fromCacheLoose(cacheName, request) {
  const cached = await fromCache(cacheName, request, { ignoreSearch: false });
  if (cached) return cached;
  return fromCache(cacheName, request, { ignoreSearch: true });
}

async function trimCache(cacheName, maxEntries) {
  if (!maxEntries || maxEntries <= 0) return;
  try {
    const cache = await caches.open(cacheName);
    const keys  = await cache.keys();
    const extra = keys.length - maxEntries;
    if (extra > 0) {
      await Promise.all(keys.slice(0, extra).map(k => cache.delete(k)));
    }
  } catch (_) {}
}

function offlineImageResponse() {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
  <defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#0a0f14"/><stop offset="1" stop-color="#06141b"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <g font-family="system-ui,Segoe UI,Roboto,Arial" fill="#9fb4c5" text-anchor="middle">
    <text x="50%" y="48%" font-size="26">Image indisponible hors ligne</text>
    <text x="50%" y="60%" font-size="18" fill="#19d3ff">Pirates Tools</text>
  </g>
</svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
}

function isHTMLResponse(res) {
  try {
    const ct = res.headers.get('Content-Type') || '';
    return ct.includes('text/html');
  } catch (_) { return false; }
}

/* ---------------- Strategies ---------------- */
async function cacheFirst(event, request, cacheName, limit, { loose = false } = {}) {
  const cached = loose ? await fromCacheLoose(cacheName, request) : await fromCache(cacheName, request);
  if (cached) return cached;

  try {
    const res = await fetch(request);
    event.waitUntil((async () => {
      await putInCache(cacheName, request, res);
      await trimCache(cacheName, limit);
    })());
    return res.clone();
  } catch (_) {
    if (request.destination === 'image') return offlineImageResponse();
    return Response.error();
  }
}

async function staleWhileRevalidate(event, request, cacheName, limit, { loose = false } = {}) {
  const cachePromise = loose ? fromCacheLoose(cacheName, request) : fromCache(cacheName, request);
  const fetchPromise = fetch(request)
    .then(async (res) => {
      await putInCache(cacheName, request, res);
      await trimCache(cacheName, limit);
      return res.clone();
    })
    .catch(() => null);

  const cached = await cachePromise;
  if (cached) {
    event.waitUntil(fetchPromise);
    return cached;
  }
  const fresh = await fetchPromise;
  return fresh || Response.error();
}

async function networkFirst(event, request, cacheName, limit, fallbackResponse = null) {
  try {
    // Navigation Preload si dispo
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
  } catch (_) {
    const cached = await fromCache(cacheName, request);
    if (cached) return cached;
    if (fallbackResponse) return fallbackResponse;
    return Response.error();
  }
}

/* ---------------- Install ---------------- */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_STATIC);
      // no-store pour forcer un vrai fetch réseau au precache
      await cache.addAll(APP_SHELL.map(u => new Request(u, { cache: 'no-store' })));
      // Warm-up du catalogue (si présent)
      try {
        const req = new Request('./products.json', { cache: 'no-store' });
        const res = await fetch(req);
        if (res && (res.ok || res.type === 'opaque')) {
          const c = await caches.open(CACHE_PRODUCTS);
          await c.put(req, res.clone());
        }
      } catch (_) {}
    } catch (_) {}
    await self.skipWaiting();
  })());
});

/* ---------------- Activate ---------------- */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Purge des anciens caches
    const keep = new Set([CACHE_STATIC, CACHE_DYNAMIC, CACHE_IMAGES, CACHE_PRODUCTS]);
    const names = await caches.keys();
    await Promise.all(
      names.filter(n => n.startsWith('pt-') && !keep.has(n)).map(n => caches.delete(n))
    );

    // Navigation preload si possible
    try {
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable();
      }
    } catch (_) {}

    await self.clients.claim();

    // Info clients (optionnel)
    try {
      const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      for (const c of clients) c.postMessage({ type: 'SW_READY', version: VERSION });
    } catch (_) {}
  })());
});

/* ---------------- Fetch router ---------------- */
self.addEventListener('fetch', (event) => {
  const { request } = event;

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
        // 1) Preload s'il existe
        const preload = await event.preloadResponse;
        if (preload) {
          if (isHTMLResponse(preload)) {
            event.waitUntil(putInCache(CACHE_STATIC, INDEX_URL, preload.clone()));
          }
          return preload;
        }

        // 2) Fetch réseau
        const net = await fetch(request);
        if (isHTMLResponse(net)) {
          event.waitUntil(putInCache(CACHE_STATIC, INDEX_URL, net.clone()));
        }
        return net;
      } catch (_) {
        // 3) Fallback index pré-caché
        const cachedIndex = await caches.match(INDEX_URL, { ignoreSearch: true });
        return cachedIndex || Response.error();
      }
    })());
    return;
  }

  // Externe (CDN) : images → cache-first (loose), sinon passthrough
  if (url.origin !== location.origin) {
    if (request.destination === 'image') {
      event.respondWith(cacheFirst(event, request, CACHE_IMAGES, LIMIT_IMAGES, { loose: true }));
    }
    return;
  }

  // products.json → network-first (cache dédié) + fallback []
  if (url.pathname.endsWith('/products.json') || url.pathname.endsWith('products.json')) {
    const emptyJson = new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    event.respondWith(networkFirst(event, request, CACHE_PRODUCTS, LIMIT_PRODUCTS, emptyJson));
    return;
  }

  // CSS / JS / Fonts / autres JSON → SWR (loose pour couvrir ?v=)
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font'  ||
    (request.destination === '' && url.pathname.endsWith('.json'))
  ) {
    event.respondWith(staleWhileRevalidate(event, request, CACHE_STATIC, LIMIT_STATIC, { loose: true }));
    return;
  }

  // Images internes → cache-first (loose)
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(event, request, CACHE_IMAGES, LIMIT_IMAGES, { loose: true }));
    return;
  }

  // Par défaut → SWR (dyn)
  event.respondWith(staleWhileRevalidate(event, request, CACHE_DYNAMIC, LIMIT_DYNAMIC));
});

/* ---------------- Messages ---------------- */
self.addEventListener('message', async (event) => {
  if (!event || !event.data) return;
  const data = event.data;

  if (data === 'SKIP_WAITING' || data?.type === 'SKIP_WAITING') {
    await self.skipWaiting();
    return;
  }

  if (data === 'CLEAR_CACHES' || data?.type === 'CLEAR_CACHES') {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith('pt-')).map(n => caches.delete(n)));
    try {
      const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      for (const c of clients) c.postMessage({ type: 'CACHES_CLEARED' });
    } catch (_) {}
    return;
  }

  if (data === 'GET_VERSION' || data?.type === 'GET_VERSION') {
    try { event.source?.postMessage?.({ type: 'VERSION', version: VERSION }); } catch (_) {}
  }
});
