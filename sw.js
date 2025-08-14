/************************************************************
 * Pirates Tools — Service Worker (COMPLET)
 * - Pré-cache des ressources essentielles (App Shell)
 * - Caching intelligent :
 *     • HTML : network-first (+ fallback offline)
 *     • JS/CSS/manifest : stale-while-revalidate
 *     • products.json : network-first (+ cache)
 *     • images : cache-first + limite d’entrées
 * - Nettoyage des anciens caches, skipWaiting + clients.claim
 ************************************************************/

const VERSION        = 'v7';                      // ⬅️ incrémente à chaque changement
const STATIC_CACHE   = `ptools-static-${VERSION}`;
const RUNTIME_CACHE  = `ptools-runtime-${VERSION}`;
const IMAGE_CACHE    = `ptools-images-${VERSION}`;

// IMPORTANT (GitHub Pages) : reste en chemins RELATIFS pour garder le bon scope
const PRECACHE_URLS = [
  './',                 // redirige la nav vers index.html
  './index.html',
  './styles.css',
  './app.js',
  './products.json',
  './manifest.webmanifest',
  './images/pirates-tools-logo.png',
  './icons/icon-180.png'     // si présent, sinon pas grave (échec ignoré)
];

// ---------- Helpers de stratégies ----------
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

async function putWithLimit(cacheName, request, response, maxEntries = 80) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    // supprime la plus ancienne entrée
    await cache.delete(keys[0]);
  }
}

async function networkFirst(request, cacheName, fallbackUrl = './index.html') {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) await cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;

    // Fallback pour les navigations (HTML)
    if (request.mode === 'navigate' && fallbackUrl) {
      const shell = await caches.match(fallbackUrl);
      if (shell) return shell;
    }
    return new Response('Hors-ligne.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(resp => {
    if (resp && (resp.ok || resp.type === 'opaque')) cache.put(request, resp.clone());
    return resp;
  }).catch(() => undefined);

  // renvoie vite ce qu’on a, puis on réactualise en arrière-plan
  return cached || fetchPromise || fetch(request);
}

async function cacheFirst(request, cacheName, maxEntries = 120) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const resp = await fetch(request);
    if (resp && (resp.ok || resp.type === 'opaque')) {
      await putWithLimit(cacheName, request, resp.clone(), maxEntries);
    }
    return resp;
  } catch (err) {
    return cached || Response.error();
  }
}

// ---------- Install : pré-cache ----------
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    // Ajoute individuellement (pour ignorer les 404 sans tout faire échouer)
    await Promise.allSettled(PRECACHE_URLS.map(async (url) => {
      try {
        const req = new Request(url, { cache: 'reload' });
        const resp = await fetch(req);
        if (resp && (resp.ok || resp.type === 'opaque')) {
          await cache.put(req, resp);
        }
      } catch (_) { /* ignore */ }
    }));
    self.skipWaiting(); // prend la main dès que possible
  })());
});

// ---------- Activate : nettoyage et prise de contrôle ----------
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((k) => {
        if (![STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE].includes(k)) {
          return caches.delete(k);
        }
      })
    );
    await self.clients.claim();
  })());
});

// ---------- Fetch : routage des stratégies ----------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // On ne gère que les requêtes GET
  if (req.method !== 'GET') return;

  // Laisse passer les ressources cross-origin (ex : wa.me)
  if (url.origin !== self.location.origin) return;

  // HTML / navigation → network-first (avec fallback App Shell)
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(networkFirst(req, RUNTIME_CACHE, './index.html'));
    return;
  }

  // JSON produits → network-first (on veut de la fraicheur, mais offline OK)
  if (url.pathname.endsWith('/products.json') || url.pathname.endsWith('products.json')) {
    event.respondWith(networkFirst(req, RUNTIME_CACHE));
    return;
  }

  // JS / CSS / manifest → stale-while-revalidate
  if (['script', 'style', 'manifest'].includes(req.destination)) {
    event.respondWith(staleWhileRevalidate(req, STATIC_CACHE));
    return;
  }

  // Images → cache-first + limite
  if (req.destination === 'image') {
    event.respondWith(cacheFirst(req, IMAGE_CACHE, 120));
    return;
  }

  // Par défaut → SWR
  event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
});

// ---------- Messages depuis la page (optionnel) ----------
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
