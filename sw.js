/* sw.js — Pirates Tools (PWA) */
const VERSION        = 'pt-v165';                    // version du SW (logique SW)
const STATIC_CACHE   = `pt-static-${VERSION}`;
const RUNTIME_CACHE  = `pt-runtime-${VERSION}`;
const IMG_CACHE      = `pt-img-${VERSION}`;
const DATA_CACHE     = `pt-data-${VERSION}`;
const ORIGIN         = self.location.origin;

// Aligner avec le HTML (cache-busting des assets)
const ASSET_VER      = '43';

// IMPORTANT : le site tourne sous /Pirates-tools-app1/ (GitHub Pages).
// On reste en chemins relatifs (./) pour que le SW fonctionne en local et en prod.
const APP_SHELL = [
  './',
  `./index.html?v=${ASSET_VER}`,  // versionné (même que le HTML)
  './index.html',                 // non versionné (fallback nav/offline)
  `./styles.css?v=${ASSET_VER}`,
  `./app.js?v=${ASSET_VER}`,      // fichier principal
  `./pt.js?v=${ASSET_VER}`,       // optionnel si présent
  `./manifest.webmanifest?v=${ASSET_VER}`,
  `./icons/icon-180.png?v=${ASSET_VER}`,
  `./icons/icon-192.png?v=${ASSET_VER}`,
  `./icons/icon-256.png?v=${ASSET_VER}`,
  `./icons/icon-384.png?v=${ASSET_VER}`,
  `./icons/icon-512.png?v=${ASSET_VER}`,
  `./images/pirates-tools-logo.png?v=${ASSET_VER}`   // optionnel
];

// Utilitaires
const isGET = req => (req.method || 'GET').toUpperCase() === 'GET';
const sameOrigin = url => url.origin === ORIGIN;
const ext = p => (p.split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase();
const isNav = evt => evt.request.mode === 'navigate';

// Précharger en douceur en ignorant les erreurs individuelles
async function precacheShell() {
  const c = await caches.open(STATIC_CACHE);
  await Promise.all(APP_SHELL.map(async (u) => {
    try {
      const r = await fetch(u, { cache:'no-store' });
      if (r && r.ok) await c.put(u, r.clone());
    } catch(_){ /* ignore */ }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      if ('navigationPreload' in self.registration) {
        try { await self.registration.navigationPreload.enable(); } catch(_){}
      }
      await precacheShell();
      await self.skipWaiting();
    } catch(_){}
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Supprime les anciens caches
    const keep = new Set([STATIC_CACHE, RUNTIME_CACHE, IMG_CACHE, DATA_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.map(n => keep.has(n) ? null : caches.delete(n)));
    await self.clients.claim();
  })());
});

// Network helpers
async function fromCache(cacheName, request) {
  const c = await caches.open(cacheName);
  const m = await c.match(request, { ignoreVary:true });
  return m || null;
}
async function putCache(cacheName, request, response) {
  try {
    const c = await caches.open(cacheName);
    await c.put(request, response.clone());
  } catch(_){}
}
function timeout(ms, promise){
  return new Promise((resolve, reject)=>{
    const id = setTimeout(()=>reject(new Error('timeout')), ms);
    promise.then(v=>{ clearTimeout(id); resolve(v); }, e=>{ clearTimeout(id); reject(e); });
  });
}

// Stratégies
async function handleNavigate(event){
  // Navigation : utilise preload/network, sinon fallback index.html en cache
  try {
    const pre = await event.preloadResponse;
    if (pre) return pre;
  } catch(_){}

  try {
    const net = await fetch(event.request);
    // rafraîchit index.html en cache si on a la ressource
    if (net && net.ok) { putCache(STATIC_CACHE, './index.html', net.clone()); }
    return net;
  } catch(_){
    // Fallback : d'abord la versionnée, puis la non-versionnée
    const cachedV = await fromCache(STATIC_CACHE, `./index.html?v=${ASSET_VER}`);
    if (cachedV) return cachedV;
    const cached = await fromCache(STATIC_CACHE, './index.html');
    if (cached) return cached;
    // dernier recours
    return Response.redirect('./', 302);
  }
}

async function handleProducts(request){
  // Network-first (avec timeout) + fallback cache pour data/products.json ou products.json
  try {
    const net = await timeout(4000, fetch(request));
    if (net && net.ok) { putCache(DATA_CACHE, request, net.clone()); }
    return net;
  } catch(_){
    const cached = await fromCache(DATA_CACHE, request);
    if (cached) return cached;
    // Essaie l'autre chemin en fallback (data/ <-> racine)
    const url = new URL(request.url);
    const twin = url.pathname.endsWith('/products.json')
      ? url.pathname.replace('/products.json','/data/products.json')
      : url.pathname.replace('/data/products.json','/products.json');
    try {
      const altReq = new Request(`${url.origin}${twin}${url.search}`, { method:'GET' });
      const altCached = await fromCache(DATA_CACHE, altReq);
      if (altCached) return altCached;
    } catch(_){}
    // Rien en cache
    return new Response('[]', { status:200, headers:{ 'Content-Type':'application/json' } });
  }
}

async function handleStatic(event, request){
  // CSS/JS/Manifest/JSON (non data) -> stale-while-revalidate
  const cached = await fromCache(STATIC_CACHE, request);
  const fetching = (async ()=>{
    try {
      const net = await fetch(request);
      if (net && (net.ok || net.type === 'opaque')) {
        await putCache(STATIC_CACHE, request, net.clone());
      }
    } catch(_){}
  })();

  if (cached) { event.waitUntil(fetching); return cached; }

  try {
    const net = await fetch(request);
    if (net && net.ok) { putCache(STATIC_CACHE, request, net.clone()); }
    return net;
  } catch(_){
    return cached || new Response('', { status:504 });
  }
}

async function handleImage(request){
  // Images/icônes -> cache-first puis réseau
  const cached = await fromCache(IMG_CACHE, request);
  if (cached) return cached;
  try {
    const net = await fetch(request);
    if (net && (net.ok || net.type === 'opaque')) {
      putCache(IMG_CACHE, request, net.clone());
    }
    return net;
  } catch(_){
    // Fallback icône
    return fromCache(STATIC_CACHE, `./icons/icon-256.png?v=${ASSET_VER}`) ||
           fromCache(STATIC_CACHE, './icons/icon-256.png') ||
           new Response('', { status:504 });
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (!isGET(req)) return;

  const url = new URL(req.url);

  // Laisse passer les requêtes cross-origin (WhatsApp, fonts externes CDN, etc.)
  if (!sameOrigin(url)) return;

  // 1) Navigation (SPA hash routes)
  if (isNav(event)) {
    event.respondWith(handleNavigate(event));
    return;
  }

  const pathname = url.pathname;
  const e = ext(pathname);

  // 2) Produits JSON (data/products.json ou products.json)
  if (pathname.endsWith('/data/products.json') || pathname.endsWith('/products.json')) {
    event.respondWith(handleProducts(req));
    return;
  }

  // 3) Images & icônes
  if (['png','jpg','jpeg','webp','gif','svg','ico'].includes(e)) {
    event.respondWith(handleImage(req));
    return;
  }

  // 4) CSS / JS / Manifest / Maps / Polices / JSON (hors data/products)
  if (['css','js','mjs','map','webmanifest','woff2','woff','ttf','otf','json'].includes(e)) {
    event.respondWith(handleStatic(event, req));
    return;
  }

  // 5) Par défaut : passe au réseau (et met en cache léger si 200)
  event.respondWith((async ()=>{
    try {
      const net = await fetch(req);
      if (net && net.ok && sameOrigin(url)) { putCache(RUNTIME_CACHE, req, net.clone()); }
      return net;
    } catch(_){
      const cached = await fromCache(RUNTIME_CACHE, req) || await fromCache(STATIC_CACHE, req);
      return cached || new Response('', { status:504 });
    }
  })());
});

// Messages depuis l'app (mise à jour souple)
self.addEventListener('message', (e) => {
  const data = e && e.data;
  if (!data) return;

  if (data === 'SKIP_WAITING' || (data && data.type) === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (data === 'CLEAR_OLD_CACHES' || (data && data.type) === 'CLEAR_OLD_CACHES') {
    (async ()=> {
      const keep = new Set([STATIC_CACHE, RUNTIME_CACHE, IMG_CACHE, DATA_CACHE]);
      const names = await caches.keys();
      await Promise.all(names.map(n => keep.has(n) ? null : caches.delete(n)));
    })();
  }
});