/* =========================================================
   Pirates Tools — app.js (FULL, stable, clean)
   - Dock fixe (CSS-only) : aucun JS de reposition
   - Hero fluide Android/iOS
   - Smooth scroll (depuis une vue → retour Home)
   - Panier persistant (localStorage) + dock (🛒/badge)
   - PDP riche : description + points clés + tableau specs
   - Devis (#/devis) : quantités + envoi WhatsApp
   - Compte & Fidélité (démo locale)
   - Anti-zoom Android + bannière offline
   - Focus après navigation + toasts (CSS injecté)
   - A2HS unifié (tip iOS + bouton Android)
   - SEO dynamique (titre + meta description) sur PDP
   - PT utils + SelfTest (Section 18) activable via ?selftest=1
========================================================= */

'use strict';

/* === Service Worker ===
   Géré UNIQUEMENT en section 15 (update banner + skipWaiting).
   -> Pas d'enregistrement ici pour éviter les doubles handlers.
*/

/* ---------- Helpers ---------- */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const fallback = (v, alt='') => (v===undefined || v===null) ? alt : v;

/* === (NOUVEAU) Images sûres + fallback === */
const IMG_FALLBACK = './images/pirates-tools-logo.png?v=7';

function sanitizeImgUrl(u){
  try{
    const url = new URL(u, location.href);
    if (url.protocol === 'http:') url.protocol = 'https:';
    return url.toString();
  }catch(_){ return IMG_FALLBACK; }
}

function setSafeImg(el, src, alt=''){
  if (!el) return;
  el.loading = el.loading || 'lazy';
  el.decoding = 'async';
  el.referrerPolicy = 'no-referrer';
  el.crossOrigin = 'anonymous';
  el.alt = alt || '';
  el.onerror = () => { el.onerror = null; el.src = IMG_FALLBACK; };
  el.src = sanitizeImgUrl(src || IMG_FALLBACK);
}

/* === SEO defaults (titre + meta description) === */
const META_DESC_EL  = document.querySelector('meta[name="description"]');
const DEFAULT_TITLE = document.title || 'Pirates Tools • Outillage pro (PWA)';
const DEFAULT_DESC  = META_DESC_EL?.getAttribute('content') || 'Pirates Tools — Visseuses à chocs DeWALT, dispo Antilles. PWA rapide, contact immédiat (téléphone & WhatsApp).';

function setPageMeta(title, description){
  try{
    if (title) document.title = title;
    if (META_DESC_EL && description) META_DESC_EL.setAttribute('content', description);
  }catch(_){}
}
function resetPageMeta(){
  try{
    document.title = DEFAULT_TITLE;
    if (META_DESC_EL) META_DESC_EL.setAttribute('content', DEFAULT_DESC);
  }catch(_){}
}

/* ---------- UX CSS (toasts + badge bump) injecté ---------- */
(function injectUXCSS(){
  if (document.getElementById('pt-ux-css')) return;
  const css = `
  @keyframes pt-bump { 0%{transform:scale(1)} 35%{transform:scale(1.15)} 100%{transform:scale(1)} }
  #dockCount.bump{ animation: pt-bump .42s ease }

  #toasts{ position:fixed; left:50%; bottom:calc(84px + env(safe-area-inset-bottom,0px)); transform:translateX(-50%); z-index:130; display:grid; gap:.5rem; }
  .toast{ display:grid; grid-template-columns:auto 1fr auto; gap:.6rem; padding:.6rem .75rem; border-radius:12px;
          background:rgba(10,15,20,.92); border:1px solid #22303b; color:#e6edf5; box-shadow:0 12px 24px rgba(0,0,0,.35);
          font:600 14px/1.25 system-ui,-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,Arial,sans-serif; }
  .toast__icon{ align-self:center }
  .toast__body{ align-self:center }
  .toast__close{ background:transparent; border:0; color:#9fb4c5; cursor:pointer; font-size:16px; }
  @keyframes toast-out { to { opacity:0; transform:translateY(6px) } }
  `;
  const style = document.createElement('style');
  style.id = 'pt-ux-css';
  style.textContent = css;
  document.head.appendChild(style);
})();

// Dock: visibilité contrôlée par le scroll du hero (et via le router)
function showDock(visible){
  if (!dock) return;
  dock.classList.toggle('dock--visible', !!visible);
}

/* ---------- A11y helpers ---------- */
const live    = document.getElementById('sr-live') || document.getElementById('srLive');
const toastsC = $('#toasts');
const dockBadge = $('#dockCount');

function announce(msg){
  if (!live) return;
  live.textContent = '';
  setTimeout(()=>{ live.textContent = msg; }, 20);
}

function toast(msg, kind='success'){
  if (!toastsC) return;
  const el = document.createElement('div');
  el.className = `toast toast--${kind}`;
  el.innerHTML = `
    <div class="toast__icon">${kind==='success'?'✅':'ℹ️'}</div>
    <div class="toast__body">${msg}</div>
    <button class="toast__close" aria-label="Fermer">✖</button>
  `;
  const close = ()=> {
    el.style.animation = 'toast-out .18s ease-in both';
    setTimeout(()=> el.remove(), 180);
  };
  el.querySelector('.toast__close')?.addEventListener('click', close);
  toastsC.appendChild(el);
  setTimeout(close, 3200);
}

function bumpBadge(){
  if (!dockBadge) return;
  dockBadge.classList.remove('bump');
  void dockBadge.offsetWidth; // reflow
  dockBadge.classList.add('bump');
}

function notifyCartAdded(title='Article'){
  toast(`« ${title} » ajouté au devis`);
  announce(`${title} ajouté au devis`);
  bumpBadge();
}

/* ---------- Focus helper après navigation ---------- */
function focusView(key){
  let target = null;
  if (key === 'produit')        target = $('#pdpTitle');
  else if (key === 'catalogue') target = $('#view-catalogue h1');
  else if (key === 'devis')     target = $('#view-devis h1');
  else if (key === 'compte')    target = $('#view-compte h1');
  else                          target = $('#list'); // accueil

  if (target){
    target.setAttribute('tabindex','-1');
    target.focus?.({ preventScroll: true });
    setTimeout(()=> target.removeAttribute('tabindex'), 300);
  }
}

/* ---------- Globals ---------- */
const PHONE_HUMAN = '07 74 23 01 95';
const PHONE_E164  = '+33774230195';

let MODELS = [];                 // produits
let CART   = [];                 // panier (tableau d’objets produit)
const STORE_KEY = 'pt_cart_v1';  // clé localStorage
const USER_KEY  = 'pt_user_v1';  // compte (démo)

// === DOM refs (NÉCESSAIRES à l'anim du logo & au dock) ===
const hero      = document.getElementById('hero');
const heroLogo  = document.getElementById('heroLogo');

const dock          = document.getElementById('dock');
const dockCount     = document.getElementById('dockCount');    // optionnel
const dockQuoteBtn  = document.getElementById('dockQuoteBtn'); // optionnel
const dockCartBtn   = document.getElementById('dockCartBtn');  // optionnel

// === DOM refs (CTA + toolbar + liste) ===
const callBtn  = document.getElementById('callBtn');
const waBtn    = document.getElementById('waBtn');
const listEl   = document.getElementById('list');
const searchEl = document.getElementById('q');
const tagEl    = document.getElementById('tag');

/* ===== Fallback robuste pour le(s) logo(s) ===== */
(function logoFallbacks(){
  const FALLBACK = './images/pirates-tools-logo.png?v=7';

  function ensureFallback(img){
    if (!img) return;
    img.addEventListener('error', () => {
      if (!img.src.includes('pirates-tools-logo.png')) img.src = FALLBACK;
    });
    if (img.complete && img.naturalWidth === 0) img.src = FALLBACK;
  }

  ensureFallback(document.getElementById('heroLogo'));
  document.querySelectorAll('img.topbar-logo').forEach(ensureFallback);
})();

/* =========================================================
   0) Anti-zoom Android
========================================================= */
(function lockViewportZoomOnAndroid(){
  const isAndroid = /android/i.test(navigator.userAgent);
  if (!isAndroid) return;
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  const base = 'width=device-width, initial-scale=1, viewport-fit=cover';
  meta.setAttribute('content', `${base}, maximum-scale=1, user-scalable=no`);
})();

/* =========================================================
   1) Dock : garantit la structure (CSS-only)
========================================================= */
(function ensureDockShell(){
  const root = document.getElementById('dock');
  if (!root) return;
  root.classList.remove('hidden'); // s'il restait caché dans l'HTML
  if (root.firstElementChild && root.firstElementChild.classList?.contains('dock__shell')) return;
  const shell = document.createElement('div');
  shell.className = 'dock__shell';
  while (root.firstChild) shell.appendChild(root.firstChild);
  root.appendChild(shell);
})();

/* =========================================================
   2) CTA tel/wa homogènes
========================================================= */
(function syncCTA(){
  callBtn?.setAttribute('href', `tel:${PHONE_E164}`);
  if (callBtn) callBtn.innerHTML = `📞 <strong>${PHONE_HUMAN}</strong>`;
  waBtn?.setAttribute('href', `https://wa.me/${PHONE_E164.replace('+','')}`);
})();

/* =========================================================
   3) Bannière Offline / Online
========================================================= */
(function netBanner(){
  const bar = document.createElement('div');
  bar.id = 'netBanner';
  bar.setAttribute('aria-live','polite');
  Object.assign(bar.style, {
    position:'fixed', left:'50%', transform:'translateX(-50%)',
    bottom:'calc(72px + env(safe-area-inset-bottom, 0px))',
    background:'rgba(10,15,20,.88)', border:'1px solid #22303b',
    padding:'.5rem .8rem', borderRadius:'10px', zIndex:'120', boxShadow:'0 10px 24px rgba(0,0,0,.35)',
    font:'600 14px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,Arial,sans-serif',
    color:'#e6edf5', display:'none'
  });
  document.body.appendChild(bar);

  let hideT = 0;
  const show = (txt, ok) => {
    bar.textContent = txt;
    bar.style.display = 'block';
    bar.style.borderColor = ok ? '#00e1b4' : '#ff6b6b';
    clearTimeout(hideT);
    hideT = setTimeout(()=> bar.style.display='none', 2400);
  };
  window.addEventListener('offline', ()=> show('Hors ligne — contenu en cache', false));
  window.addEventListener('online',  ()=> show('De nouveau en ligne', true));
})();

/* =========================================================
   3-bis) A2HS (Add To Home Screen) — iOS tip + Android prompt
========================================================= */
(function a2hsHelper(){
  if (window.__pt_a2hs_done) return; window.__pt_a2hs_done = true;

  const ua = navigator.userAgent || '';
  const isiOSLike = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (!document.getElementById('pt-a2hs-css')){
    const s = document.createElement('style');
    s.id = 'pt-a2hs-css';
    s.textContent = `
      #a2hsTip{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(96px + env(safe-area-inset-bottom,0px));z-index:125;
        display:flex;gap:.6rem;align-items:center;background:rgba(10,15,20,.92);border:1px solid #22303b;color:#e6edf5;
        padding:.55rem .7rem;border-radius:10px;box-shadow:0 10px 24px rgba(0,0,0,.35);font:600 14px/1.25 system-ui,-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,Arial,sans-serif}
      #a2hsTip .a2hs-tip__icon{display:inline-block;padding:.12rem .4rem;border-radius:6px;border:1px solid #22303b;background:rgba(255,255,255,.06)}
      #a2hsTip .a2hs-tip__close{background:transparent;border:0;color:#9fb4c5;cursor:pointer;font-size:16px}
      #a2hsTip.out{animation:pt-a2hs-out .18s ease-in both}
      @keyframes pt-a2hs-out{to{opacity:0;transform:translateX(-50%) translateY(4px)}}
    `;
    document.head.appendChild(s);
  }

  const DISMISS_KEY = 'pt_a2hs_tip_dismiss_v1';
  const dismissed = localStorage.getItem(DISMISS_KEY) === '1';

  function showTip(){
    if (document.getElementById('a2hsTip') || dismissed) return;
    const tip = document.createElement('div');
    tip.id = 'a2hsTip';
    tip.setAttribute('role','dialog');
    tip.setAttribute('aria-live','polite');
    tip.innerHTML = `
      <div class="a2hs-tip__text">
        Pour installer l’app&nbsp;: touchez
        <span class="a2hs-tip__icon">▵</span>
        puis <strong>«&nbsp;Sur l’écran d’accueil&nbsp;»</strong>.
      </div>
      <button class="a2hs-tip__close" aria-label="Fermer">✖</button>
    `;
    tip.querySelector('.a2hs-tip__close')?.addEventListener('click', ()=>{
      tip.classList.add('out');
      setTimeout(()=> tip.remove(), 180);
      try{ localStorage.setItem(DISMISS_KEY, '1'); }catch(_){}
    });
    document.body.appendChild(tip);
  }

  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
  if (isiOSLike && isSafari && !isStandalone) {
    setTimeout(showTip, 1400);
  }

  let deferredPrompt = null;
  const installBtn = document.getElementById('installBtn');

  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn){
      installBtn.hidden = false;
      if (!installBtn.dataset.wired){
        installBtn.dataset.wired = '1';
        installBtn.addEventListener('click', async ()=>{
          try{
            installBtn.disabled = true;
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (typeof toast === 'function'){
              toast(outcome === 'accepted' ? 'Installation en cours' : 'Installation annulée', outcome==='accepted'?'success':'info');
            }
          }catch(_){}
          installBtn.hidden = true;
          installBtn.disabled = false;
          deferredPrompt = null;
        });
      }
    }
  });

  try{
    if (installBtn && isStandalone) installBtn.hidden = true;
    const dm = window.matchMedia('(display-mode: standalone)');
    dm.addEventListener?.('change', (e)=>{ if (installBtn && e.matches) installBtn.hidden = true; });
  }catch(_){}
})();

/* =========================================================
   4) Logo = retour accueil (SPA, iOS-safe)
========================================================= */
(function wireLogoHome(){
  const logoLink = document.getElementById('homeLink') || document.querySelector('.topbar-logo-link');
  if (!logoLink) return;

  const goHome = (e) => {
    e.preventDefault();
    location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  logoLink.addEventListener('click', goHome, { passive:false });
  logoLink.addEventListener('pointerup', (e)=>{
    if (e.pointerType === 'touch') goHome(e);
  }, { passive:false });
})();

/* =========================================================
   5) HERO : zoom + fondu (robuste iOS/Android)
========================================================= */
(function heroEffect(){
  if (!hero || !heroLogo) return;

  const mq  = window.matchMedia('(max-width: 768px)');
  const mqr = window.matchMedia('(prefers-reduced-motion: reduce)');
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const getVH = () => (window.visualViewport ? window.visualViewport.height : window.innerHeight) || 1;

  const getScrollY = () =>
    (typeof window.pageYOffset === 'number' ? window.pageYOffset : 0) ||
    (document.scrollingElement && document.scrollingElement.scrollTop) ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0;

  let vh = getVH();
  let prevY = -1;
  let rafId = 0;

  function render(y){
    const fin = vh * (mq.matches ? 0.70 : 0.85);
    const raw = Math.max(0, Math.min(1, y / (fin || 1)));
    const p   = easeOutCubic(raw);

    const maxScale = mq.matches ? 3.1 : 2.0;
    const scale    = 1 + (maxScale - 1) * p;

    const tyPxBase = (mq.matches ? 12 : 7) * (vh / 100);
    const tyPx     = tyPxBase * p;

    const opacity  = Math.max(0, Math.min(1, 1 - (mq.matches ? 1.75 : 1.25) * raw));

    const t = `translate3d(0, ${tyPx.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
    heroLogo.style.transform = t;
    heroLogo.style.webkitTransform = t;
    heroLogo.style.opacity = opacity.toFixed(3);

    const gap = (1 - raw) * (mq.matches ? 18 : 22);
    document.documentElement.style.setProperty('--listGap', `${gap.toFixed(2)}vh`);

    const done = raw > 0.985;
    document.body.classList.toggle('after-hero', done);
    hero.classList.toggle('hero-out', done);

    if (dock){
      if (raw > 0.97) dock.classList.add('dock--visible');
      else            dock.classList.remove('dock--visible');
    }
  }

  function tick(){
    const y = getScrollY();
    if (y !== prevY) {
      render(y);
      prevY = y;
    }
    rafId = requestAnimationFrame(tick);
  }

  if (mqr.matches){
    const t0 = 'translate3d(0,0,0) scale(1)';
    heroLogo.style.transform = t0;
    heroLogo.style.webkitTransform = t0;
    heroLogo.style.opacity = '1';
    document.documentElement.style.setProperty('--listGap', '18vh');
    document.body.classList.remove('after-hero');
    hero.classList.remove('hero-out');
    if (dock) dock.classList.add('dock--visible');
    return;
  }

  rafId = requestAnimationFrame(tick);

  const recalc = () => { vh = getVH(); render(getScrollY()); };
  window.addEventListener('resize', recalc, { passive:true });
  window.visualViewport?.addEventListener('resize', recalc, { passive:true });
  window.addEventListener('orientationchange', recalc, { passive:true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) recalc(); }, { passive:true });
  window.addEventListener('pageshow', (e) => { if (e.persisted) recalc(); }, { passive:true });
  window.addEventListener('pagehide', () => cancelAnimationFrame(rafId), { passive:true });

  render(getScrollY());
})();

/* =========================================================
   6) Smooth scroll (depuis une vue → retour home avant scroll)
========================================================= */
$$('[data-scroll]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const targetSel = a.getAttribute('data-scroll') || a.getAttribute('href');
    const doScroll = () => {
      const el = targetSel ? document.querySelector(targetSel) : null;
      if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
    };
    if (location.hash.startsWith('#/')) {
      const once = () => { requestAnimationFrame(doScroll); window.removeEventListener('hashchange', once); };
      window.addEventListener('hashchange', once, { once:true });
      location.hash = '';
    } else {
      doScroll();
    }
  });
});

/* =========================================================
   7) Anim “exit” (injection CSS + IntersectionObserver)
========================================================= */
const ScrollExit = (function () {
  function injectExitCSS(){
    if (document.getElementById('exit-anim-css')) return;
    const style = document.createElement('style');
    style.id = 'exit-anim-css';
    style.textContent = `
@keyframes exitLeft { to { transform: translateX(-60px); opacity: 0; filter: blur(2px); } }
@keyframes exitRight{ to { transform: translateX(60px);  opacity: 0; filter: blur(2px); } }
.tool--exit-left  { animation: exitLeft 420ms cubic-bezier(.22,.61,.36,1) forwards; will-change: transform, opacity; }
.tool--exit-right { animation: exitRight 420ms cubic-bezier(.22,.61,.36,1) forwards; will-change: transform, opacity; }
@media (prefers-reduced-motion: reduce) { .tool--exit-left,.tool--exit-right { animation: none; opacity: 0; } }`;
    document.head.appendChild(style);
  }
  injectExitCSS();

  let flip = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      if (entry.isIntersecting) { el.classList.remove('tool--exit-left','tool--exit-right'); el.removeAttribute('data-exited'); return; }
      if (el.dataset.exited === '1') return;
      if (entry.boundingClientRect.top >= 0) return;
      const cls = flip ? 'tool--exit-right' : 'tool--exit-left';
      flip = !flip;
      void el.offsetWidth;
      el.classList.add(cls);
      el.dataset.exited = '1';
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -10% 0px' });

  function observeWithin(root=document){ root.querySelectorAll('[data-tool]').forEach(el => io.observe(el)); }
  return { observeWithin };
})();

/* =========================================================
   8) PANIER (persistant)
========================================================= */
function updateDock(){
  if (!dock || !dockCount) return;
  const n = CART.length;
  dockCount.textContent = n;
  dockCount.style.display = n ? '' : 'none';
}
function saveCart(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(CART)); }catch(_){}
  updateDock();
}
function loadCart(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    CART = raw ? JSON.parse(raw) : [];
  }catch(_){ CART = []; }
  updateDock();
}
loadCart();

const keyOf = p => (p?.id ?? p?.sku ?? p?.title ?? '').toString();

function groupCart(){
  const map = new Map();
  CART.forEach(p=>{
    const k = keyOf(p);
    const g = map.get(k) || { item:p, qty:0 };
    g.qty++;
    map.set(k, g);
  });
  return [...map.values()];
}

/* ===== WhatsApp (Devis + PDP) ===== */
function cartToWhatsAppText(){
  const grouped = groupCart();
  if (!grouped.length) return '';
  const lines = grouped.map(({item,qty})=>{
    const sku = item.sku || item.id || '';
    const title = item.title || `${item.brand||''} ${item.sku||''}`.trim();
    return `• ${sku} – ${title}${qty>1?` ×${qty}`:''}`;
  });

  // Coordonnées (si présentes dans "Compte")
  const contact = (() => {
    try{
      const u = (typeof loadUser === 'function') ? loadUser() : null;
      const arr = [];
      if (u?.name)  arr.push(`Nom: ${u.name}`);
      if (u?.email) arr.push(`Email: ${u.email}`);
      return arr.length ? `\n\nMes coordonnées:\n${arr.join('\n')}` : '';
    }catch(_){ return ''; }
  })();

  const link = `${location.origin}${location.pathname}#/devis`;
  return `Bonjour, je souhaite un devis pour:\n${lines.join('\n')}\n\nLien: ${link}${contact}\n\nMerci.`;
}

/* ===== JSON-LD Product (SEO) ===== */
function absoluteUrl(u){
  try { return new URL(u, location.href).href; } catch(_){ return u; }
}
function schemaAvailability(p){
  const s = (p.stock_status || '').toLowerCase();
  if (s === 'in_stock')    return 'http://schema.org/InStock';
  if (s === 'low_stock')   return 'http://schema.org/LimitedAvailability';
  if (s === 'out_of_stock')return 'http://schema.org/OutOfStock';
  return (p.stock_qty > 0) ? 'http://schema.org/InStock' : 'http://schema.org/OutOfStock';
}
function buildProductJsonLD(p){
  const images = [];
  if (p.img) images.push(absoluteUrl(p.img));
  if (Array.isArray(p.gallery)) p.gallery.forEach(g => images.push(absoluteUrl(g)));

  const price = (typeof p.price === 'number')
    ? p.price
    : (typeof p.price_cents === 'number' ? p.price_cents/100 : undefined);

  const url = `${location.origin}${location.pathname}#/produit/${encodeURIComponent(p.id || p.sku || (p.title || ''))}`;

  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": p.title || `${p.brand||''} ${p.sku||''}`.trim(),
    "sku":  p.sku || p.id || undefined,
    "mpn":  p.sku || undefined,
    "brand": p.brand ? { "@type": "Brand", "name": p.brand } : undefined,
    "category": p.category || undefined,
    "description": p.seo?.description || p.desc || p.description || undefined,
    "image": images.length ? images : undefined,
    "url": url,
    "offers": {
      "@type": "Offer",
      "priceCurrency": (p.currency || "EUR"),
      "price": price != null ? String(price) : undefined,
      "availability": schemaAvailability(p),
      "itemCondition": p.new ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
      "url": url
    }
  };

  if (typeof p.rating === 'number' && typeof p.reviews === 'number' && p.reviews > 0){
    data.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": String(p.rating),
      "ratingCount": String(p.reviews)
    };
  }

  const prune = (o) => {
    if (Array.isArray(o)) return o.map(prune).filter(v => v != null);
    if (o && typeof o === 'object'){
      const r = {};
      Object.entries(o).forEach(([k,v])=>{
        const pv = prune(v);
        if (pv != null && !(Array.isArray(pv) && pv.length === 0)) r[k] = pv;
      });
      return Object.keys(r).length ? r : null;
    }
    return (o === undefined || o === null) ? null : o;
  };
  return prune(data);
}
function injectProductJsonLD(p){
  try{
    const id = 'jsonld-product';
    document.getElementById(id)?.remove();
    const json = buildProductJsonLD(p);
    if (!json) return;
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = id;
    s.textContent = JSON.stringify(json);
    document.head.appendChild(s);
  }catch(_){}
}
function clearProductJsonLD(){
  document.getElementById('jsonld-product')?.remove();
}

/* =========================================================
   9) PRODUITS : rendu liste / PDP
========================================================= */
function productToHTML(m){
  const title = fallback(m.title, `${fallback(m.brand,'')}${m.brand?' ':''}${fallback(m.sku,'')}`).trim();
  const tag   = fallback(m.badge, (Array.isArray(m.tags)&&m.tags[0]) || fallback(m.tag,'')).trim();
  const desc  = fallback(m.desc, fallback(m.description,''));
  const id    = fallback(m.id, fallback(m.sku, title)).toString();

  return `
  <article class="card" data-tool data-id="${id}" data-tag="${tag}">
    <div class="head">
      <h3 class="title">${title}</h3>
      ${tag ? `<span class="badge">${tag}</span>` : ``}
    </div>
    <div class="specs"><p style="margin:0">${desc || '—'}</p></div>
    <div class="actions"><button class="btn primary" data-add="${id}">Ajouter au panier</button></div>
  </article>`;
}

function bindAddToCart(scopeData){
  $$('[data-add]', listEl).forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const id = btn.getAttribute('data-add');
      const p  = scopeData.find(x => (x.id?.toString()===id) || (x.sku?.toString()===id) || (x.title===id));
      if (!p) return;
      CART.push(p);
      saveCart();
      notifyCartAdded(p.title || p.sku || 'Article');
    });
  });
}

function findProductByKey(key){
  if (!key) return null;
  const k = String(key).toLowerCase();
  return MODELS.find(m=>{
    const id  = (m.id ?? m.sku ?? '').toString().toLowerCase();
    const sku = (m.sku ?? '').toString().toLowerCase();
    const ttl = (m.title ?? '').toLowerCase();
    return id===k || sku===k || ttl===k;
  }) || null;
}

function renderPDP(product){
  const wrap   = document.getElementById('pdp');
  if (!wrap) return;

  const elImg  = document.getElementById('pdpImg');
  const elT    = document.getElementById('pdpTitle');
  const elTag  = document.getElementById('pdpTag');
  const elDesc = document.getElementById('pdpDesc');
  const elSpecs= document.getElementById('pdpSpecs');
  const elRel  = document.getElementById('pdpRelated');
  const btnQ   = document.getElementById('pdpQuote');
  const btnWa  = document.getElementById('pdpWa');
  const btnShare = document.getElementById('pdpShare'); // (existe si ajouté dans le HTML)

  const title = product.title || `${product.brand||''} ${product.sku||''}`.trim();
  const tag   = product.badge || (Array.isArray(product.tags)&&product.tags[0]) || product.tag || '';
  const desc  = product.desc || product.description || '';
  const img   = product.img  || IMG_FALLBACK;

  elT.textContent = title;
  elTag.textContent = tag ? `#${tag}` : '';
  elDesc.textContent = desc || 'Caractéristiques à venir.';

  if (elImg){
    setSafeImg(elImg, img, product.images_alt || title || '');
  }

  const features = Array.isArray(product.features) ? product.features : (Array.isArray(product.specs) ? product.specs : []);
  const featHtml = features.length ? features.map(s=>`<li>${s}</li>`).join('') : '';

  const kvFromJson = (product.specs_kv && typeof product.specs_kv==='object') ? product.specs_kv : null;
  const kvDerived = {
    'Plateforme': product.platform || undefined,
    'Moteur': product.motor || undefined,
    'Couple max': (product.torque_nm!=null) ? `${product.torque_nm} Nm` : undefined,
    'Vitesses': product.rpm || undefined,
    'Cadence de chocs': product.ipm || undefined,
    'Mandrin': product.chuck || undefined,
    'Longueur': (product.length_mm!=null) ? `${product.length_mm} mm` : undefined,
    'Poids': (product.weight_kg!=null) ? `${product.weight_kg} kg` : undefined,
    'Garantie': (product.warranty_months!=null) ? `${product.warranty_months} mois` : undefined
  };
  const kvFinal = Object.fromEntries(
    Object.entries({ ...(kvFromJson||{}), ...kvDerived }).filter(([,v])=> v!=null && v!=='')
  );

  let tableHtml = '';
  if (Object.keys(kvFinal).length){
    const rows = Object.entries(kvFinal).map(([k,v])=>`<tr><th>${k}</th><td>${v}</td></tr>`).join('');
    tableHtml = `
      <li style="list-style:none; padding:0; margin:.6rem 0 0">
        <div class="badge" style="margin:0 0 .4rem; display:inline-flex; align-items:center; gap:.4rem">⚙️ Caractéristiques techniques</div>
        <div style="overflow:auto">
          <table style="width:100%; border-collapse:collapse; font-size:.95rem">
            <tbody>${rows}</tbody>
          </table>
        </div>
      </li>`;
  }

  elSpecs.innerHTML = (featHtml || tableHtml) ? `${featHtml}${tableHtml}` : '';

  btnQ.textContent = 'Ajouter au panier';
  btnQ.onclick = ()=>{
    CART.push(product);
    saveCart();
    notifyCartAdded(product.title || product.sku || 'Article');
  };

  // ===== WhatsApp PDP (message enrichi + lien + coordonnées si dispo) =====
  const sku = product.sku || product.id || title;
  const productLink = `${location.origin}${location.pathname}#/produit/${encodeURIComponent(product.id || product.sku || title)}`;
  const contactSuffix = (() => {
    try{
      const u = (typeof loadUser === 'function') ? loadUser() : null;
      const arr = [];
      if (u?.name)  arr.push(`Nom: ${u.name}`);
      if (u?.email) arr.push(`Email: ${u.email}`);
      return arr.length ? `\n\nMes coordonnées:\n${arr.join('\n')}` : '';
    }catch(_){ return ''; }
  })();
  const textPDP = `Bonjour, je souhaite un devis pour:\n• ${sku} – ${title}\n\nLien: ${productLink}${contactSuffix}\n\nMerci.`;
  const phone = PHONE_E164.replace('+','');
  btnWa.href = `https://wa.me/${phone}?text=${encodeURIComponent(textPDP)}`;

  // (optionnel) Partage natif si bouton présent
  if (btnShare){
    btnShare.onclick = async ()=>{
      try{
        const shareData = { title: `${title} • Pirates Tools`, text: title, url: productLink };
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard?.writeText(productLink);
          toast('Lien copié dans le presse-papiers', 'success');
        }
      }catch(_){}
    };
  }

  const related = MODELS.filter(m => (m!==product) && (
    (product.category && m.category===product.category) ||
    (tag && ((m.badge===tag) || (Array.isArray(m.tags) && m.tags.includes(tag))))
  )).slice(0,3);

  elRel.innerHTML = related.map(m=>`
    <article class="card" data-id="${m.id || m.sku || m.title}">
      <div class="head">
        <h3 class="title">${m.title || (m.brand||'')+' '+(m.sku||'')}</h3>
        ${(m.badge||'') ? `<span class="badge">${m.badge}</span>` : ``}
      </div>
      <div class="specs"><p style="margin:0">${m.desc || m.description || ''}</p></div>
      <div class="actions">
        <button class="btn primary" data-add="${m.id || m.sku || m.title}">Ajouter au panier</button>
      </div>
    </article>
  `).join('');

  elRel.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    const id = btn.getAttribute('data-add');
    const p  = MODELS.find(x => ((x.id||x.sku||x.title)+'') === id);
    if (p){
      CART.push(p);
      saveCart();
      notifyCartAdded(p.title || p.sku || 'Article');
    }
    e.stopPropagation();
  });

  $$('.pdp__related .card').forEach(card=>{
    card.addEventListener('click', (e)=>{
      if (e.target.closest('[data-add]')) return;
      const id = card.getAttribute('data-id');
      if (!id) return;
      location.hash = `#/produit/${encodeURIComponent(id)}`;
    });
  });

  injectProductJsonLD(product);
}

function renderList(data){
  if (!Array.isArray(data)) return;
  listEl.innerHTML = data.map(productToHTML).join('\n');

  bindAddToCart(data);

  $$('.card', listEl).forEach(card=>{
    card.addEventListener('click', (e)=>{
      if (e.target.closest('[data-add]')) return;
      const id = card.getAttribute('data-id');
      if (!id) return;
      location.hash = `#/produit/${encodeURIComponent(id)}`;
    });
  });

  ScrollExit.observeWithin(listEl);
}

/* =========================================================
   10) CATALOGUE (catégories auto)
========================================================= */
function buildCategories(){
  const map = new Map();
  for (const m of MODELS){
    const raw = (m.category || m.badge || m.brand || '').toString().trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    map.set(key, { key, label: raw, count: (map.get(key)?.count || 0) + 1 });
  }
  return [...map.values()].sort((a,b)=> b.count - a.count);
}

function findSelectMatch(select, keyLower){
  if (!select) return null;
  const opts = [...select.options];
  const m = opts.find(o => (o.value||o.textContent||'').toLowerCase() === keyLower);
  return m ? m.value || m.textContent : null;
}

function renderCatalogue(){
  const root = document.getElementById('catList');
  if (!root) return;

  const cats = buildCategories();
  root.innerHTML = cats.length
    ? cats.map(c => `
        <article class="card cat-card" data-cat="${c.key}">
          <div class="head"><h3 class="title">${c.label}</h3><span class="badge">Catégorie</span></div>
          <div class="specs"><p style="margin:0">${c.count} produit${c.count>1?'s':''}</p></div>
          <div class="actions"><button class="btn primary" data-cat-go="${c.key}">Voir</button></div>
        </article>
      `).join('')
    : `<div class="card"><div class="specs"><p style="margin:0">Aucune catégorie détectée.</p></div></div>`;

  const go = (keyLower)=>{
    const matchVal = findSelectMatch(tagEl, keyLower);
    if (tagEl){
      tagEl.value = matchVal || '';
    }
    if (searchEl){
      searchEl.value = matchVal ? '' : keyLower;
    }
    applyFilters();
    location.hash = '';
    setTimeout(()=> document.getElementById('list')?.scrollIntoView({behavior:'smooth'}), 60);
  };

  root.addEventListener('click', e=>{
    const btn = e.target.closest('[data-cat-go]');
    const card= e.target.closest('.cat-card');
    if (btn) return go(btn.dataset.catGo);
    if (card) return go(card.dataset.cat);
  });
}

/* =========================================================
   11) CHARGEMENT PRODUITS
========================================================= */
async function loadProducts(){
  try{
    const r = await fetch('products.json', { cache:'no-store' });
    const json = await r.json();
    MODELS = Array.isArray(json) ? json : (json.products || []);
    renderList(MODELS);
    renderCatalogue();
    window.dispatchEvent(new CustomEvent('pt:productsLoaded'));
  }catch(e){
    console.error('Erreur chargement produits:', e);
    listEl.innerHTML = `
      <div class="card">
        <div class="head"><h3 class="title">Produits indisponibles</h3></div>
        <div class="specs"><p>Impossible de charger <code>products.json</code>.</p></div>
      </div>`;
  }
}
loadProducts();

/* =========================================================
   12) FILTRE (debounce)
========================================================= */
function debounce(fn, wait=140){ let t=0; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), wait); }; }
const applyFilters = debounce(()=>{
  const q = (searchEl?.value || '').trim().toLowerCase();
  const t = (tagEl?.value || '').trim().toLowerCase();

  const filtered = MODELS.filter(m => {
    const hay = [
      fallback(m.title,''), fallback(m.sku,''), fallback(m.brand,''),
      fallback(m.category,''), fallback(m.desc,fallback(m.description,'')),
      (Array.isArray(m.tags) ? m.tags.join(' ') : ''), fallback(m.badge,'')
    ].join(' ').toLowerCase();

    const okQ  = !q || hay.includes(q);
    const okT  = !t || hay.includes(t);
    return okQ && okT;
  });

  renderList(filtered);
}, 120);

searchEl?.addEventListener('input', applyFilters, { passive:true });
tagEl?.addEventListener('change', applyFilters);

/* =========================================================
   13) DEVIS (#/devis) — rendu dynamique
========================================================= */
function renderCartView(){
  const root = $('#devisList');
  if (!root) return;

  const grouped = groupCart();
  if (!grouped.length){
    root.innerHTML = `<p style="margin:0">Aucun article pour le moment.</p>`;
  }else{
    root.innerHTML = grouped.map(({item,qty})=>{
      const sku   = item.sku || item.id || '';
      const title = item.title || `${item.brand||''} ${item.sku||''}`.trim();
      const key   = keyOf(item);
      return `
        <div class="card" style="width:100%">
          <div class="head">
            <h3 class="title">${title}</h3>
            <span class="badge">${sku}</span>
          </div>
          <div class="specs" style="display:flex;gap:.6rem;align-items:center">
            <button class="btn" data-dec="${key}" aria-label="Diminuer">−</button>
            <strong>${qty}</strong>
            <button class="btn" data-inc="${key}" aria-label="Augmenter">+</button>
            <button class="btn" data-del="${key}" style="margin-left:auto;background:rgba(255,255,255,.06);color:#d9e3ec" aria-label="Supprimer">Supprimer</button>
          </div>
        </div>
      `;
    }).join('');
  }

  root.onclick = (e)=>{
    const inc = e.target.closest('[data-inc]'); const dec = e.target.closest('[data-dec]'); const del = e.target.closest('[data-del]');
    const key = inc?.dataset.inc || dec?.dataset.dec || del?.dataset.del;
    if (!key) return;

    if (inc){
      const p = MODELS.find(m => keyOf(m)===key);
      if (p){ CART.push(p); }
    }else if (dec){
      const i = CART.findIndex(p => keyOf(p)===key);
      if (i>=0) CART.splice(i,1);
    }else if (del){
      for (let i=CART.length-1;i>=0;i--) if (keyOf(CART[i])===key) CART.splice(i,1);
    }
    saveCart();
    renderCartView();
  };

  // ===== WhatsApp DEVIS (message enrichi) =====
  $('#devisSend')?.addEventListener('click', ()=>{
    const msg = encodeURIComponent(cartToWhatsAppText());
    if (!msg) return;
    window.open(`https://wa.me/${PHONE_E164.replace('+','')}?text=${msg}`, '_blank', 'noopener');
    toast('Devis ouvert dans WhatsApp'); announce('Devis ouvert dans WhatsApp');
  }, { once:true });

  $('#devisClear')?.addEventListener('click', ()=>{
    CART = [];
    saveCart();
    renderCartView();
    toast('Devis vidé'); announce('Devis vidé');
  }, { once:true });
}

/* =========================================================
   14) DOCK (bas d’écran) — actions
========================================================= */
dockQuoteBtn?.addEventListener('click', ()=>{
  const text = cartToWhatsAppText() || 'Bonjour, je souhaite des informations.';
  const msg  = encodeURIComponent(text);
  window.open(`https://wa.me/${PHONE_E164.replace('+','')}?text=${msg}`, '_blank', 'noopener');
});
dockCartBtn?.addEventListener('click', ()=>{ location.hash = '#/devis'; });
dockCount?.addEventListener('click', ()=>{ location.hash = '#/devis'; });

/* =========================================================
   15) PWA (SW + update banner) — A2HS géré plus haut
========================================================= */
function showUpdateBanner(waitingSW){
  const bar = document.createElement('div');
  bar.id = 'updateBanner';
  bar.innerHTML = `
    <div style="display:flex;gap:.6rem;align-items:center">
      <span>Nouvelle version disponible.</span>
      <button class="btn primary" id="btnReload">Mettre à jour</button>
    </div>`;
  Object.assign(bar.style, {
    position:'fixed', left:'50%', transform:'translateX(-50%)',
    bottom:'calc(96px + env(safe-area-inset-bottom,0px))',
    background:'rgba(10,15,20,.92)', border:'1px solid var(--border)',
    padding:'.5rem .7rem', borderRadius:'10px', zIndex:'130', boxShadow:'var(--shadow)'
  });
  document.body.appendChild(bar);

  $('#btnReload', bar)?.addEventListener('click', ()=>{
    waitingSW.postMessage('SKIP_WAITING');
  });

  navigator.serviceWorker.addEventListener('controllerchange', ()=> location.reload());
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      if (reg.waiting) showUpdateBanner(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && reg.waiting) {
            showUpdateBanner(reg.waiting);
          }
        });
      });
    } catch (err) {
      console.warn(err);
    }
  });
}

window.addEventListener('online',  ()=> toast('Connexion rétablie', 'success'));
window.addEventListener('offline', ()=> toast('Vous êtes hors ligne', 'info'));

/* =========================================================
   16) COMPTE & FIDÉLITÉ (démo locale)
========================================================= */
function loadUser(){
  try{ return JSON.parse(localStorage.getItem(USER_KEY)) || { name:'', email:'', spent:0 }; }
  catch(_){ return { name:'', email:'', spent:0 }; }
}
function saveUser(u){ try{ localStorage.setItem(USER_KEY, JSON.stringify(u)); }catch(_){} }
function gradeFromSpent(spent){
  if (spent >= 5000) return { label:'Excellent acheteur', color:'#00e1b4' };
  if (spent >= 1000) return { label:'Bon acheteur',       color:'#19d3ff' };
  return { label:'Moussaillon', color:'#9fb4c5' };
}
function renderAccount(){
  const u = loadUser();
  $('#accName')?.setAttribute('value', u.name || '');
  $('#accEmail')?.setAttribute('value', u.email || '');
  $('#accSpent') && ($('#accSpent').textContent = `${u.spent.toLocaleString('fr-FR')} €`);

  const g = gradeFromSpent(u.spent);
  const gradeEl = $('#accGrade'); if (gradeEl){ gradeEl.textContent = g.label; gradeEl.style.borderColor = g.color; }

  const pct = clamp((u.spent/5000)*100, 0, 100);
  $('#accFill')  && ($('#accFill').style.width = `${pct}%`);
  $('#accCursor')&& ($('#accCursor').style.left = `${pct}%`);
  const slider = $('#accSlider'); if (slider){ slider.value = Math.min(u.spent, 5000); }

  $('#accSave')?.addEventListener('click', ()=>{
    const nu = { ...u, name: $('#accName')?.value || '', email: $('#accEmail')?.value || '' };
    saveUser(nu);
  }, { once:true });

  $('#accReset')?.addEventListener('click', ()=>{
    saveUser({ name:u.name, email:u.email, spent:0 });
    renderAccount();
  }, { once:true });

  $('#accSlider')?.addEventListener('input', (e)=>{
    const spent = Number(e.target.value || 0);
    const nu = { ...u, spent };
    saveUser(nu);
    renderAccount();
  });
}

/* =========================================================
   17) ROUTER (#/…)
========================================================= */
(()=>{
  const HOME_PARTS = [
    document.getElementById('hero'),
    document.querySelector('.toolbar'),
    document.querySelector('main.container'),
    document.querySelector('.ratings')
  ].filter(Boolean);

  const VIEWS = {
    catalogue: document.getElementById('view-catalogue'),
    devis:     document.getElementById('view-devis'),
    produit:   document.getElementById('view-produit'),
    compte:    document.getElementById('view-compte')
  };

  const showHome      = (yes)=> HOME_PARTS.forEach(el => el?.classList.toggle('hidden', !yes));
  const hideAllViews  = ()=> Object.values(VIEWS).forEach(el => el?.classList.add('hidden'));
  const showView      = (key)=>{ hideAllViews(); VIEWS[key]?.classList.remove('hidden'); };

  let prevHash = '';

  function ensureDockVisibleOnViews(isHome){
    if (!dock) return;
    if (isHome){
      // visibilité gérée par l’animation du hero
    }else{
      dock.classList.add('dock--visible');
    }
  }

  function wireBack(cameFrom){
    const back = document.querySelector('#pdpBack, .chip--back');
    if (!back) return;
    back.onclick = (e)=>{
      e.preventDefault();
      if (cameFrom && cameFrom !== location.hash) { location.hash = cameFrom; return; }
      if (history.length > 1) { history.back(); return; }
      location.hash = '';
    };
  }

  function onRoute(){
    const h = (location.hash || '').toLowerCase();
    const cameFrom = prevHash;

    // #/produit/:id
    let m = h.match(/^#\/produit\/([^/?#]+)/);
    if (m){
      const key = decodeURIComponent(m[1]);
      const tryRender = ()=>{
        const p = findProductByKey(key);
        showHome(false); showView('produit'); ensureDockVisibleOnViews(false);
        if (p){
          renderPDP(p);
          injectProductJsonLD(p);
          setPageMeta(`Pirates Tools • ${p.title || p.sku || 'Produit'}`, p.seo?.description || p.desc || p.description || DEFAULT_DESC);
        }else{
          $('#pdpTitle') && ($('#pdpTitle').textContent = 'Produit introuvable');
          $('#pdpDesc')  && ($('#pdpDesc').textContent  = 'Vérifiez la référence ou revenez au catalogue.');
          clearProductJsonLD();
          resetPageMeta();
        }
        wireBack(cameFrom);
        window.scrollTo({top:0, behavior:'auto'});
        focusView('produit');
        prevHash = h;
      };
      if (!MODELS.length){
        const once = ()=>{ window.removeEventListener('pt:productsLoaded', once); tryRender(); };
        window.addEventListener('pt:productsLoaded', once, { once:true });
      }else{
        tryRender();
      }
      return;
    }

    // #/catalogue
    m = h.match(/^#\/catalogue\b/);
    if (m){
      showHome(false); showView('catalogue'); ensureDockVisibleOnViews(false); renderCatalogue();
      clearProductJsonLD(); resetPageMeta();
      window.scrollTo({top:0,behavior:'auto'});
      focusView('catalogue');
      prevHash=h; return;
    }

    // #/devis
    m = h.match(/^#\/devis\b/);
    if (m){
      showHome(false); showView('devis'); ensureDockVisibleOnViews(false); renderCartView();
      clearProductJsonLD(); resetPageMeta();
      window.scrollTo({top:0,behavior:'auto'});
      focusView('devis');
      prevHash=h; return;
    }

    // #/compte
    m = h.match(/^#\/compte\b/);
    if (m){
      showHome(false); showView('compte'); ensureDockVisibleOnViews(false); renderAccount();
      clearProductJsonLD(); resetPageMeta();
      window.scrollTo({top:0,behavior:'auto'});
      focusView('compte');
      prevHash=h; return;
    }

    // Accueil
    if (h === '' || h === '#' || h === '#/' || h === '#/home'){
      showHome(true); hideAllViews(); ensureDockVisibleOnViews(true);
      clearProductJsonLD(); resetPageMeta();
      window.scrollTo({top:0,behavior:'auto'});
      focusView('home');
      prevHash = h; return;
    }

    // fallback : accueil
    showHome(true); hideAllViews(); ensureDockVisibleOnViews(true);
    clearProductJsonLD(); resetPageMeta();
    window.scrollTo({top:0,behavior:'auto'});
    focusView('home');
    prevHash = h;
  }

  window.addEventListener('hashchange', onRoute);
  onRoute();
})();

/* =========================================================
   18) PT utils + AUTO-TEST (facultatif, dev-only)
========================================================= */
(function PTUtilsAndSelfTest(){
  const PT = (window.PT = window.PT || {});

  PT.getSWVersion = async function getSWVersion(timeoutMs=1500){
    if (!('serviceWorker' in navigator)) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg || !navigator.serviceWorker.controller) return null;
    return await new Promise(resolve=>{
      const t = setTimeout(()=> resolve(null), timeoutMs);
      const onMsg = (e)=>{
        const d = e.data;
        if (d && d.type === 'VERSION') {
          clearTimeout(t);
          navigator.serviceWorker.removeEventListener('message', onMsg);
          resolve(d.version || null);
        }
      };
      navigator.serviceWorker.addEventListener('message', onMsg);
      try{ reg.active?.postMessage?.('GET_VERSION'); }catch(_){ clearTimeout(t); resolve(null); }
    });
  };

  PT.clearCaches = async function clearCaches(timeoutMs=1500){
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg || !navigator.serviceWorker.controller) return false;
    return await new Promise(resolve=>{
      const t = setTimeout(()=> resolve(false), timeoutMs);
      const onMsg = (e)=>{
        const d = e.data;
        if (d && d.type === 'CACHES_CLEARED') {
          clearTimeout(t);
          navigator.serviceWorker.removeEventListener('message', onMsg);
          toast('Caches vidés', 'success');
          resolve(true);
        }
      };
      navigator.serviceWorker.addEventListener('message', onMsg);
      try{ reg.active?.postMessage?.('CLEAR_CACHES'); }catch(_){ clearTimeout(t); resolve(false); }
    });
  };

  function paramEnabled(){
    try{
      const p = new URL(location.href).searchParams;
      return p.get('selftest') === '1';
    }catch(_){ return false; }
  }

  function addStyleOnce(){
    if (document.getElementById('pt-selftest-css')) return;
    const s = document.createElement('style');
    s.id = 'pt-selftest-css';
    s.textContent = `
      #ptSelfTest{position:fixed; right:12px; bottom: calc(12px + env(safe-area-inset-bottom,0px)); z-index:140;
        background:rgba(10,15,20,.95); color:#e6edf5; border:1px solid #22303b; border-radius:12px;
        min-width:260px; max-width:360px; box-shadow:0 16px 32px rgba(0,0,0,.4); font:600 14px/1.3 system-ui,-apple-system,Inter,Roboto,Arial,sans-serif}
      #ptSelfTest .head{padding:.6rem .8rem; border-bottom:1px solid #22303b; display:flex; align-items:center; justify-content:space-between}
      #ptSelfTest .list{max-height:50vh; overflow:auto; padding:.4rem .8rem}
      #ptSelfTest .row{display:grid; grid-template-columns:18px 1fr; gap:.6rem; padding:.35rem 0; align-items:center}
      #ptSelfTest .dot{width:10px; height:10px; border-radius:50%}
      #ptSelfTest .ok{background:#00e1b4} .warn{background:#ffb020} .ko{background:#ff6b6b}
      #ptSelfTest .foot{padding:.5rem .8rem; border-top:1px solid #22303b; display:flex; gap:.5rem; justify-content:flex-end}
      #ptSelfTest button{border:1px solid #22303b; background:rgba(255,255,255,.06); color:#e6edf5; padding:.35rem .6rem; border-radius:8px; cursor:pointer}
    `;
    document.head.appendChild(s);
  }

  function panel(){
    addStyleOnce();
    const wrap = document.createElement('div');
    wrap.id = 'ptSelfTest';
    wrap.innerHTML = `
      <div class="head"><div>Auto-test Pirates Tools</div><button id="ptClose">✖</button></div>
      <div class="list" id="ptList"></div>
      <div class="foot">
        <button id="ptReload">Recharger</button>
        <button id="ptClearCaches">Vider caches SW</button>
      </div>
    `;
    document.body.appendChild(wrap);
    $('#ptClose', wrap)?.addEventListener('click', ()=> wrap.remove());
    $('#ptReload', wrap)?.addEventListener('click', ()=> location.reload());
    $('#ptClearCaches', wrap)?.addEventListener('click', ()=> PT.clearCaches());
    return { root: wrap, list: $('#ptList', wrap) };
  }

  function add(list, label, status){
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<span class="dot ${status}"></span><span>${label}</span>`;
    list.appendChild(row);
  }

  async function runSelfTest(){
    const { list } = panel();

    add(list, 'UX CSS injecté', document.getElementById('pt-ux-css') ? 'ok' : 'ko');
    add(list, 'A2HS CSS injecté', document.getElementById('pt-a2hs-css') ? 'ok' : 'warn');
    add(list, 'Dock présent', document.getElementById('dock') ? 'ok' : 'ko');
    add(list, 'Dock shell', document.querySelector('#dock .dock__shell') ? 'ok' : 'warn');
    add(list, 'Toasts prêts', document.getElementById('toasts') ? 'ok' : 'ko');
    add(list, 'Zone live (a11y)', (document.getElementById('sr-live') || document.getElementById('srLive')) ? 'ok' : 'ko');

    const telOk = !!(callBtn && callBtn.href && callBtn.href.includes('tel:+33774230195'));
    const waOk  = !!(waBtn && waBtn.href && /wa\.me\/33774230195/.test(waBtn.href));
    add(list, 'CTA téléphone', telOk ? 'ok' : 'ko');
    add(list, 'CTA WhatsApp',  waOk  ? 'ok' : 'ko');

    add(list, 'products.json chargé', MODELS.length ? 'ok' : 'warn');

    const viewsOk = ['view-catalogue','view-devis','view-produit','view-compte'].every(id => document.getElementById(id));
    add(list, 'Vues présentes', viewsOk ? 'ok' : 'ko');

    try{
      injectProductJsonLD({ title:'Test', sku:'TEST-1', desc:'Desc test' });
      const jsonld = document.getElementById('jsonld-product');
      const ok = !!(jsonld && jsonld.textContent && jsonld.textContent.includes('"@type":"Product"'));
      add(list, 'JSON-LD injecté', ok ? 'ok' : 'ko');
      clearProductJsonLD();
      add(list, 'JSON-LD nettoyé', document.getElementById('jsonld-product') ? 'ko' : 'ok');
    }catch(_){ add(list, 'JSON-LD', 'warn'); }

    let swStatus = 'warn';
    try{
      if ('serviceWorker' in navigator){
        const reg = await navigator.serviceWorker.getRegistration();
        swStatus = reg ? 'ok' : 'warn';
      } else swStatus = 'warn';
    }catch(_){ swStatus = 'warn'; }
    add(list, 'Service Worker enregistré', swStatus);

    try{
      const ver = await PT.getSWVersion();
      add(list, `SW version${ver?` (${ver})`:''}`, ver ? 'ok' : 'warn');
    }catch(_){ add(list, 'SW version', 'warn'); }

    try{
      const beforeTitle = document.title;
      const beforeDesc  = META_DESC_EL?.getAttribute('content') || '';
      setPageMeta('PT • Test', 'Meta test');
      const okSet = (document.title==='PT • Test') && ((META_DESC_EL?.getAttribute('content')||'')==='Meta test');
      resetPageMeta();
      const okReset = (document.title===DEFAULT_TITLE) && ((META_DESC_EL?.getAttribute('content')||'')===DEFAULT_DESC);
      add(list, 'SEO dynamique (set/reset)', okSet && okReset ? 'ok' : 'ko');
      document.title = beforeTitle;
      if (META_DESC_EL) META_DESC_EL.setAttribute('content', beforeDesc);
    }catch(_){ add(list, 'SEO dynamique', 'warn'); }

    add(list, 'Recherche (#q) présente', searchEl ? 'ok' : 'warn');
    add(list, 'Select tags (#tag) présent', tagEl ? 'ok' : 'warn');

    toast('Auto-test terminé', 'success');
  }

  if (paramEnabled()){
    setTimeout(runSelfTest, 400);
  }

  PT.selfTest = runSelfTest;
})();
```0