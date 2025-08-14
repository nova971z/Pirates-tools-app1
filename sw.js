/************************************************************
 * PIRATES TOOLS — Service Worker (PÉPITE PRO v2)
 * - HTML : network-first (+ timeout + navigation preload + fallback)
 * - JS/CSS/manifest : stale-while-revalidate
 * - products.json : network-first (+ cache)
 * - images : cache-first + limite d’entrées + fallback SVG
 * - Maintenance : versionnage, purge, skipWaiting, clients.claim
 ************************************************************/

const VERSION       = 'v9-pepite';                 // ⬅️ incrémente à chaque modif
const STATIC_CACHE  = `ptools-static-${VERSION}`;
const RUNTIME_CACHE = `ptools-runtime-${VERSION}`;
const IMAGE_CACHE   = `ptools-images-${VERSION}`;

// Garder des chemins RELATIFS pour GitHub Pages (scope du SW = dépôt)
const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './products.json',
  './images/pirates-tools-logo.png',
  './icons/icon-192.png',       // si absents : ignorés (settled)
  './icons/icon-512.png'
];

/* ------------------ Helpers génériques ------------------ */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function withTimeout(promise, ms = 4000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

async function putWithLimit(cacheName, req, resp, maxEntries = 120) {
  const cache = await caches.open(cacheName);
  await cache.put(req, resp.clone());
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await cache.delete(keys[0]); // supprime l’entrée la plus ancienne
  }
}

/* ------------------ Stratégies de cache ------------------ */
async function networkFirst(req, cacheName, htmlFallback = null, timeoutMs = 4000) {
  const cache = await caches.open(cacheName);
  try {
    const preloaded = await (self.registration.navigationPreload?.getState?.()
      .then(s => s?.enabled ? event.preloadResponse : null)
      .catch(() => null));
    const netPromise = preloaded || fetch(req, { cache: 'no-store' });
    const fresh = await withTimeout(netPromise, timeoutMs);
    if (fresh && (fresh.ok || fresh.type === 'opaque')) {
      await cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (_) {
    const cached = await cache.match(req);
    if (cached) return cached;
    if (htmlFallback) return htmlFallback();
    return new Response('Hors-ligne.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then(resp => {
    if (resp && (resp.ok || resp.type === 'opaque')) cache.put(req, resp.clone());
    return resp;
  }).catch(() => undefined);
  return cached || fetchPromise || fetch(req);
}

async function cacheFirst(req, cacheName, maxEntries = 120, imageFallback = null) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const resp = await fetch(req);
    if (resp && (resp.ok || resp.type === 'opaque')) {
      await putWithLimit(cacheName, req, resp.clone(), maxEntries);
    }
    return resp;
  } catch (_) {
    if (imageFallback) return imageFallback();
    return cached || Response.error();
  }
}

/* --------------- Fallbacks élégants (offline) --------------- */
function offlineHTML() {
  const html = `
<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hors-ligne • Pirates Tools</title>
<style>
  body{margin:0;height:100vh;display:grid;place-items:center;background:#0a0f14;color:#e6f3f8;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
  .box{padding:24px;border:1px solid #203040;border-radius:12px;background:#0e151c;max-width:520px;text-align:center}
  h1{margin:0 0 8px 0;font-size:20px}
  p{opacity:.85;line-height:1.6}
  a{display:inline-block;margin-top:10px;color:#19d3ff;text-decoration:none}
</style>
<div class="box">
  <h1>Connexion perdue</h1>
  <p>Vous êtes hors-ligne. Le contenu en cache reste disponible.<br>
  Réessayez quand la connexion revient.</p>
  <a href="./">Retour à l’accueil</a>
</div>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function offlineSVG() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <rect width="800" height="450" fill="#0a0f14"/>
  <g fill="#10202c">
    <circle cx="120" cy="120" r="90"/><circle cx="690" cy="100" r="70"/><circle cx="400" cy="330" r="110"/>
  </g>
  <text x="50%" y="50%" fill="#8ecfe0" font-size="24" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" text-anchor="middle">
    Image indisponible (hors-ligne)
  </text>
</svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
}

/* ------------------------- INSTALL ------------------------- */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.allSettled(PRECACHE_URLS.map(async (url) => {
      try {
        const req = new Request(url, { cache: 'reload' });
        const resp = await fetch(req);
        if (resp && (resp.ok || resp.type === 'opaque')) {
          await cache.put(req, resp);
        }
      } catch (_) {/* ignore */}
    }));
    self.skipWaiting();
  })());
});

/* ------------------------ ACTIVATE ------------------------ */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Nettoyage des anciens caches
    const keys = await caches.keys();
    await Promise.all(
      keys.map(k => {
        if (![STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE].includes(k)) {
          return caches.delete(k);
        }
      })
    );
    // Navigation preload si dispo (accélère HTML)
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (_) {}
    }
    await self.clients.claim();
  })());
});

/* -------------------------- FETCH ------------------------- */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = (url.origin === self.location.origin);

  // Laisse passer les requêtes externes (ex: wa.me)
  if (!sameOrigin) return;

  // HTML / navigations — network-first + timeout + fallback
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(networkFirst(req, RUNTIME_CACHE, offlineHTML, 4500));
    return;
  }

  // JSON des produits — network-first
  if (url.pathname.endsWith('/products.json') || url.pathname.endsWith('products.json')) {
    event.respondWith(networkFirst(req, RUNTIME_CACHE));
    return;
  }

  // JS / CSS / manifest — SWR (vite + rafraîchi)
  if (['script', 'style', 'manifest'].includes(req.destination)) {
    event.respondWith(staleWhileRevalidate(req, STATIC_CACHE));
    return;
  }

  // Images — cache-first + limite + fallback SVG
  if (req.destination === 'image') {
    event.respondWith(cacheFirst(req, IMAGE_CACHE, 120, offlineSVG));
    return;
  }

  // Par défaut — SWR
  event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
});

/* ------------------------- MESSAGES ----------------------- */
self.addEventListener('message', event => {
  const msg = event.data;
  if (!msg) return;

  if (msg === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (msg === 'PURGE_CACHES') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    })());
  }
  if (msg === 'VERSION?') {
    event.source?.postMessage?.({ type:'VERSION', VERSION });
  }
});
