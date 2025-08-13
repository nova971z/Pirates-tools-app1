
const CACHE = 'pirates-tools-v3';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './products.json',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-256.png',
  './icons/icon-512.png'
];
self.addEventListener('install', e => { self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
// navigateFallback for offline navigations
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
  }
});

/* ===== TOPBAR : scroll fluide + shrink ===== */
(function(){
  document.addEventListener('click', (e)=>{
    const a = e.target.closest('a[data-scroll]');
    if(!a) return;
    const href = a.getAttribute('href') || a.dataset.scroll;
    if(!href || !href.startsWith('#')) return;
    const el = document.querySelector(href);
    if(!el) return;
    e.preventDefault();
    el.scrollIntoView({behavior:'smooth', block:'start'});
  });

  const topbar = document.querySelector('.topbar');
  if(!topbar) return;

  function onScroll(){
    topbar.classList.toggle('shrink', window.scrollY > 40);
  }

  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
})();
