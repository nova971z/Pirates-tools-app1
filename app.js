/* =========================================================
   Pirates Tools — app.part1-core.js
   PART 1/4 : Core helpers, polyfills, UX, CTA, hero, marques
   ES5-safe • Aucun doublon de polyfills
========================================================= */
'use strict';

/* -- CSS minimal afin que .hidden cache toujours -- */
(function () {
  if (document.getElementById('pt-hidden-css')) return;
  var s = document.createElement('style');
  s.id = 'pt-hidden-css';
  s.textContent = '.hidden{display:none!important}';
  document.head.appendChild(s);
})();

/* ---------- Helpers (ES5-safe) ---------- */
var $  = function(sel, root){ return (root || document).querySelector(sel); };
var $$ = function(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

function clamp(v, min, max){
  v = typeof v === 'number' ? v : parseFloat(v);
  if (!isFinite(v)) v = 0;
  return Math.max(min, Math.min(max, v));
}
function fallback(v, alt){ return (v === undefined || v === null) ? (alt || '') : v; }
function firstDefined(){ for (var i=0;i<arguments.length;i++){ if (arguments[i] != null) return arguments[i]; } }
function originPath(){
  try{
    var o = (location.origin || (location.protocol + '//' + location.host));
    return o + location.pathname;
  }catch(_){ return (location.pathname || '/'); }
}

/* ---------- Polyfills (une seule fois) ---------- */
/* CustomEvent (iOS/Android anciens) */
(function () {
  var need = (typeof window.CustomEvent !== 'function');
  if (!need) { try { new window.CustomEvent('x'); } catch(_){ need = true; } }
  if (!need) return;
  function CustomEvent(event, params){
    params = params || { bubbles:false, cancelable:false, detail:null };
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(event, !!params.bubbles, !!params.cancelable, params.detail);
    return evt;
  }
  CustomEvent.prototype = window.Event ? window.Event.prototype : {};
  window.CustomEvent = CustomEvent;
})();

/* Element.matches / Element.closest */
(function () {
  var EP = (window.Element || {}).prototype; if (!EP) return;
  if (!EP.matches) {
    EP.matches = EP.msMatchesSelector || EP.webkitMatchesSelector || function (sel) {
      var doc = this.document || this.ownerDocument; if (!doc || !doc.querySelectorAll) return false;
      var list = doc.querySelectorAll(sel); for (var i=list.length-1;i>=0;i--) if (list[i] === this) return true;
      return false;
    };
  }
  if (!EP.closest) {
    EP.closest = function (sel) {
      var el = this; while (el && el.nodeType === 1){ if (el.matches && el.matches(sel)) return el; el = el.parentElement || el.parentNode; }
      return null;
    };
  }
})();

/* Array.find / Array.includes (Patch B) */
(function () {
  if (!Array.prototype.find) {
    var findImpl = function (predicate, thisArg) {
      if (this == null) throw new TypeError('"this" is null or not defined');
      if (typeof predicate !== 'function') throw new TypeError('predicate must be a function');
      var o = Object(this), len = o.length >>> 0;
      for (var k = 0; k < len; k++) { var kValue = o[k]; if (predicate.call(thisArg, kValue, k, o)) return kValue; }
      return undefined;
    };
    try { Object.defineProperty(Array.prototype, 'find', { value: findImpl, configurable:true, writable:true }); }
    catch(_){ Array.prototype.find = findImpl; }
  }
  if (!Array.prototype.includes) {
    var includesImpl = function (searchElement, fromIndex) {
      if (this == null) throw new TypeError('"this" is null or not defined');
      var o = Object(this), len = o.length >>> 0; if (len === 0) return false;
      var n = fromIndex | 0; var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
      while (k < len) {
        var el = o[k];
        if (el === searchElement || (typeof el === 'number' && typeof searchElement === 'number' && isNaN(el) && isNaN(searchElement))) return true;
        k++;
      }
      return false;
    };
    try { Object.defineProperty(Array.prototype, 'includes', { value: includesImpl, configurable:true, writable:true }); }
    catch(_){ Array.prototype.includes = includesImpl; }
  }
})();

/* ---------- Images sûres ---------- */
var IMG_FALLBACK = './images/pirates-tools-logo.png?v=7';
function sanitizeImgUrl(u){
  try{ var url = new URL(u, location.href); if (url.protocol === 'http:') url.protocol = 'https:'; return url.toString(); }
  catch(_){ return IMG_FALLBACK; }
}
function setSafeImg(el, src, alt){
  if (!el) return;
  el.loading = el.loading || 'lazy';
  el.decoding = 'async';
  el.referrerPolicy = 'no-referrer';
  el.crossOrigin = 'anonymous';
  el.alt = alt || '';
  el.onerror = function(){ el.onerror = null; el.src = IMG_FALLBACK; };
  el.src = sanitizeImgUrl(src || IMG_FALLBACK);
}

/* ---------- SEO (titre + description) ---------- */
var META_DESC_EL  = document.querySelector('meta[name="description"]');
var DEFAULT_TITLE = document.title || 'Pirates Tools • Outillage pro (PWA)';
var DEFAULT_DESC  = (META_DESC_EL ? META_DESC_EL.getAttribute('content') : null) ||
                    'Pirates Tools — Visseuses à chocs DeWALT, dispo Antilles. PWA rapide, contact immédiat.';
function setPageMeta(title, description){
  try{ if (title) document.title = title; if (META_DESC_EL && description) META_DESC_EL.setAttribute('content', description); }catch(_){}
}
function resetPageMeta(){
  try{ document.title = DEFAULT_TITLE; if (META_DESC_EL) META_DESC_EL.setAttribute('content', DEFAULT_DESC); }catch(_){}
}

/* ---------- UX CSS (toasts) ---------- */
(function injectUXCSS(){
  if (document.getElementById('pt-ux-css')) return;
  var css = ''+
'@keyframes pt-bump{0%{transform:scale(1)}35%{transform:scale(1.15)}100%{transform:scale(1)}}'+
'#dockCount.bump{animation:pt-bump .42s ease}'+
'#toasts{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:130;display:grid;gap:.5rem}'+
'.toast{display:grid;grid-template-columns:auto 1fr auto;gap:.6rem;padding:.6rem .75rem;border-radius:12px;background:rgba(10,15,20,.92);border:1px solid #22303b;color:#e6edf5;box-shadow:0 12px 24px rgba(0,0,0,.35);font:600 14px/1.25 system-ui,-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,Arial,sans-serif}'+
'.toast__icon{align-self:center}.toast__body{align-self:center}.toast__close{background:transparent;border:0;color:#9fb4c5;cursor:pointer;font-size:16px}'+
'@keyframes toast-out{to{opacity:0;transform:translateY(6px)}}';
  var style = document.createElement('style');
  style.id = 'pt-ux-css';
  style.textContent = css;
  document.head.appendChild(style);
})();

/* ---------- A11y + toasts helpers ---------- */
var live      = document.getElementById('sr-live') || document.getElementById('srLive');
var toastsC   = $('#toasts'); // peut être créé à la volée
var dockBadge = $('#dockCount');

function announce(msg){
  if (!live) return;
  live.textContent = '';
  setTimeout(function(){ live.textContent = msg; }, 20);
}
function toast(msg, kind){
  if (kind === void 0) kind = 'success';
  if (!toastsC){
    var host = document.getElementById('toasts');
    if (!host){ host = document.createElement('div'); host.id = 'toasts'; document.body.appendChild(host); }
    toastsC = host;
  }
  var el = document.createElement('div');
  el.className = 'toast toast--' + kind;
  el.innerHTML = '<div class="toast__icon">'+(kind==='success'?'✅':'ℹ️')+'</div><div class="toast__body">'+msg+'</div><button class="toast__close" aria-label="Fermer">✖</button>';
  var close = function(){ el.style.animation='toast-out .18s ease-in both'; setTimeout(function(){ el.remove(); }, 180); };
  var btn = el.querySelector('.toast__close'); if (btn) btn.addEventListener('click', close);
  toastsC.appendChild(el); setTimeout(close, 3200);
}
function bumpBadge(){ if (!dockBadge) return; dockBadge.classList.remove('bump'); void dockBadge.offsetWidth; dockBadge.classList.add('bump'); }
function notifyCartAdded(title){ title = title || 'Article'; toast('« ' + title + ' » ajouté au devis'); announce(title + ' ajouté au devis'); bumpBadge(); }

/* ---------- Focus helper après navigation ---------- */
function focusView(key){
  var target = null;
  if (key === 'produit')        target = $('#pdpTitle');
  else if (key === 'catalogue') target = $('#view-catalogue h1');
  else if (key === 'devis')     target = $('#view-devis h1');
  else if (key === 'compte')    target = $('#view-compte h1');
  else if (key === 'home')      target = $('#view-home h1');
  else                          target = $('#list');
  if (target){
    target.setAttribute('tabindex','-1');
    if (typeof target.focus === 'function') target.focus({ preventScroll: true });
    setTimeout(function(){ target.removeAttribute('tabindex'); }, 300);
  }
}

/* ---------- Globals (partagées entre les 4 parties) ---------- */
var PHONE_HUMAN = '07 74 23 01 95';
var PHONE_E164  = '+33774230195';
var MODELS = [];                 // produits
var CART   = [];                 // panier
var STORE_KEY = 'pt_cart_v1';
var USER_KEY  = 'pt_user_v1';

/* ---------- DOM refs (peuvent être nuls au chargement) ---------- */
var hero      = document.getElementById('hero');
var heroLogo  = document.getElementById('heroLogo');
var dock          = document.getElementById('dock');
var dockCount     = document.getElementById('dockCount');
var dockQuoteBtn  = document.getElementById('dockQuoteBtn');
var dockCartBtn   = document.getElementById('dockCartBtn');
var callBtn  = document.getElementById('callBtn');
var waBtn    = document.getElementById('waBtn');
var listEl   = document.getElementById('list');
var searchEl = document.getElementById('q');
var tagEl    = document.getElementById('tag');

/* ---------- Dock helper ---------- */
function showDock(visible){ if (!dock) return; if (visible) dock.classList.add('dock--visible'); else dock.classList.remove('dock--visible'); }

/* ---------- Fallback logos ---------- */
(function logoFallbacks(){
  var FALLBACK = './images/pirates-tools-logo.png?v=7';
  function ensureFallback(img){
    if (!img) return;
    img.addEventListener('error', function(){
      if (!img.src || img.src.indexOf('pirates-tools-logo.png') === -1) img.src = FALLBACK;
    });
    if (img.complete && img.naturalWidth === 0) img.src = FALLBACK;
  }
  ensureFallback(document.getElementById('heroLogo'));
  $$('.topbar-logo').forEach(ensureFallback);
})();

/* =========================================================
   0) Anti-zoom Android
========================================================= */
(function lockViewportZoomOnAndroid(){
  var isAndroid = /android/i.test(navigator.userAgent);
  if (!isAndroid) return;
  var meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  var base = 'width=device-width, initial-scale=1, viewport-fit=cover';
  meta.setAttribute('content', base + ', maximum-scale=1, user-scalable=no');
})();

/* =========================================================
   1) Dock : garantit la structure
========================================================= */
(function ensureDockShell(){
  var root = document.getElementById('dock');
  if (!root) return;
  root.classList.remove('hidden');
  if (root.firstElementChild && root.firstElementChild.classList && root.firstElementChild.classList.contains('dock__shell')) return;
  var shell = document.createElement('div'); shell.className = 'dock__shell';
  while (root.firstChild) shell.appendChild(root.firstChild);
  root.appendChild(shell);
})();

/* =========================================================
   2) CTA tel/wa homogènes
========================================================= */
(function syncCTA(){
  if (callBtn) { callBtn.setAttribute('href', 'tel:' + PHONE_E164); callBtn.innerHTML = '📞 <strong>' + PHONE_HUMAN + '</strong>'; }
  if (waBtn)   { waBtn.setAttribute('href', 'https://wa.me/' + PHONE_E164.replace('+','')); }
})();

/* =========================================================
   3) Bannière Offline / Online
========================================================= */
(function netBanner(){
  var bar = document.createElement('div'); bar.id = 'netBanner'; bar.setAttribute('aria-live','polite');
  var s = bar.style;
  s.position='fixed'; s.left='50%'; s.transform='translateX(-50%)';
  s.bottom='calc(72px + env(safe-area-inset-bottom, 0px))';
  s.background='rgba(10,15,20,.88)'; s.border='1px solid #22303b';
  s.padding='.5rem .8rem'; s.borderRadius='10px'; s.zIndex='120';
  s.boxShadow='0 10px 24px rgba(0,0,0,.35)'; s.font='600 14px/1.2 system-ui,-apple-system,Inter,Segoe UI,Roboto,Arial,sans-serif'; s.color='#e6edf5'; s.display='none';
  document.body.appendChild(bar);
  var hideT=0;
  var show=function(txt, ok){ bar.textContent=txt; s.display='block'; s.borderColor = ok ? '#00e1b4' : '#ff6b6b'; clearTimeout(hideT); hideT=setTimeout(function(){ s.display='none'; }, 2400); };
  window.addEventListener('offline', function(){ show('Hors ligne — contenu en cache', false); });
  window.addEventListener('online',  function(){ show('De nouveau en ligne', true);  });
})();

/* =========================================================
   3-bis) A2HS (iOS tip + Android prompt) — idempotent
========================================================= */
(function a2hsHelper(){
  if (window.__pt_a2hs_done) return; window.__pt_a2hs_done = true;

  var ua = navigator.userAgent || '';
  var isiOSLike = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isStandalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;

  if (!document.getElementById('pt-a2hs-css')){
    var s = document.createElement('style');
    s.id = 'pt-a2hs-css';
    s.textContent =
'#a2hsTip{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(96px + env(safe-area-inset-bottom,0px));z-index:125;display:flex;gap:.6rem;align-items:center;background:rgba(10,15,20,.92);border:1px solid #22303b;color:#e6edf5;padding:.55rem .7rem;border-radius:10px;box-shadow:0 10px 24px rgba(0,0,0,.35);font:600 14px/1.25 system-ui,-apple-system,Inter,Roboto,Arial,sans-serif}'+
'#a2hsTip .a2hs-tip__icon{display:inline-block;padding:.12rem .4rem;border-radius:6px;border:1px solid #22303b;background:rgba(255,255,255,.06)}'+
'#a2hsTip .a2hs-tip__close{background:transparent;border:0;color:#9fb4c5;cursor:pointer;font-size:16px}'+
'#a2hsTip.out{animation:pt-a2hs-out .18s ease-in both}'+
'@keyframes pt-a2hs-out{to{opacity:0;transform:translateX(-50%) translateY(4px)}}';
    document.head.appendChild(s);
  }

  var DISMISS_KEY = 'pt_a2hs_tip_dismiss_v1';
  var dismissed = false; try{ dismissed = localStorage.getItem(DISMISS_KEY) === '1'; }catch(_){}

  function showTip(){
    if (document.getElementById('a2hsTip') || dismissed) return;
    var tip = document.createElement('div');
    tip.id = 'a2hsTip'; tip.setAttribute('role','dialog'); tip.setAttribute('aria-live','polite');
    tip.innerHTML = '<div class="a2hs-tip__text">Pour installer l’app&nbsp;: touchez <span class="a2hs-tip__icon">▵</span> puis <strong>«&nbsp;Sur l’écran d’accueil&nbsp;»</strong>.</div><button class="a2hs-tip__close" aria-label="Fermer">✖</button>';
    var closeBtn = tip.querySelector('.a2hs-tip__close');
    if (closeBtn) closeBtn.addEventListener('click', function(){ tip.classList.add('out'); setTimeout(function(){ tip.remove(); }, 180); try{ localStorage.setItem(DISMISS_KEY,'1'); }catch(_){ } });
    document.body.appendChild(tip);
  }

  var isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
  if (isiOSLike && isSafari && !isStandalone) { setTimeout(showTip, 1400); }

  var deferredPrompt = null;
  var installBtn = document.getElementById('installBtn');

  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault(); deferredPrompt = e;
    if (installBtn){
      installBtn.hidden = false;
      if (!installBtn.getAttribute('data-wired')){
        installBtn.setAttribute('data-wired','1');
        installBtn.addEventListener('click', function(){
          try{
            installBtn.disabled = true; deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function(choice){
              toast(choice && choice.outcome === 'accepted' ? 'Installation en cours' : 'Installation annulée', (choice && choice.outcome === 'accepted')?'success':'info');
            }).finally(function(){ installBtn.hidden = true; installBtn.disabled = false; deferredPrompt = null; });
          }catch(_){}
        });
      }
    }
  });

  try{
    if (installBtn && isStandalone) installBtn.hidden = true;
    if (window.matchMedia){
      var dm = window.matchMedia('(display-mode: standalone)');
      if (dm && typeof dm.addEventListener === 'function'){
        dm.addEventListener('change', function(e){ if (installBtn && e.matches) installBtn.hidden = true; });
      }
    }
  }catch(_){}
})();

/* =========================================================
   4) Logo → Accueil (SPA)
========================================================= */
(function wireLogoHome(){
  var logoLink = document.getElementById('homeLink') || document.querySelector('.topbar-logo-link');
  if (!logoLink) return;
  var goHome = function(e){ e.preventDefault(); location.hash = ''; window.scrollTo({ top: 0, behavior: 'smooth' }); };
  logoLink.addEventListener('click', goHome, false);
  logoLink.addEventListener('pointerup', function(e){ if (e.pointerType === 'touch') goHome(e); }, false);
})();

/* =========================================================
   5) HERO : zoom + fondu
========================================================= */
(function heroEffect(){
  if (!hero || !heroLogo) return;
  var mq  = window.matchMedia('(max-width: 768px)');
  var mqr = window.matchMedia('(prefers-reduced-motion: reduce)');
  var easeOutCubic = function(t){ return 1 - Math.pow(1 - t, 3); };
  var getVH = function(){ return (window.visualViewport ? window.visualViewport.height : window.innerHeight) || 1; };
  var getScrollY = function(){
    return (typeof window.pageYOffset === 'number' ? window.pageYOffset : 0) ||
           (document.scrollingElement && document.scrollingElement.scrollTop) ||
           document.documentElement.scrollTop || document.body.scrollTop || 0;
  };
  var vh = getVH(), prevY = -1, rafId = 0;

  function render(y){
    var fin = vh * (mq.matches ? 0.70 : 0.85);
    var raw = Math.max(0, Math.min(1, y / (fin || 1)));
    var p   = easeOutCubic(raw);
    var maxScale = mq.matches ? 3.1 : 2.0;
    var scale    = 1 + (maxScale - 1) * p;
    var tyPxBase = (mq.matches ? 12 : 7) * (vh / 100);
    var tyPx     = tyPxBase * p;
    var opacity  = Math.max(0, Math.min(1, 1 - (mq.matches ? 1.75 : 1.25) * raw));
    var t = 'translate3d(0,'+tyPx.toFixed(2)+'px,0) scale('+scale.toFixed(3)+')';
    heroLogo.style.transform = t; heroLogo.style.webkitTransform = t; heroLogo.style.opacity = opacity.toFixed(3);
    var gap = (1 - raw) * (mq.matches ? 18 : 22); document.documentElement.style.setProperty('--listGap', gap.toFixed(2)+'vh');
    var done = raw > 0.985; document.body.classList.toggle('after-hero', done); hero.classList.toggle('hero-out', done);
    if (dock){ if (raw > 0.97) dock.classList.add('dock--visible'); else dock.classList.remove('dock--visible'); }
  }
  function tick(){ var y = getScrollY(); if (y !== prevY){ render(y); prevY = y; } rafId = requestAnimationFrame(tick); }

  if (mqr.matches){
    var t0 = 'translate3d(0,0,0) scale(1)'; heroLogo.style.transform = t0; heroLogo.style.webkitTransform = t0; heroLogo.style.opacity = '1';
    document.documentElement.style.setProperty('--listGap', '18vh'); document.body.classList.remove('after-hero'); hero.classList.remove('hero-out'); if (dock) dock.classList.add('dock--visible'); return;
  }
  rafId = requestAnimationFrame(tick);
  var recalc = function(){ vh = getVH(); render((typeof window.pageYOffset === 'number' ? window.pageYOffset : 0)); };
  window.addEventListener('resize', recalc, true);
  if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function'){ window.visualViewport.addEventListener('resize', recalc, true); }
  window.addEventListener('orientationchange', recalc, true);
  document.addEventListener('visibilitychange', function(){ if (!document.hidden) recalc(); }, true);
  window.addEventListener('pageshow', function(e){ if (e.persisted) recalc(); }, true);
  window.addEventListener('pagehide', function(){ cancelAnimationFrame(rafId); }, true);
  render((typeof window.pageYOffset === 'number' ? window.pageYOffset : 0));
})();

/* =========================================================
   5-bis) Accueil — marques (bulles)
   (Appelle applyFilters() si présent ; sinon no-op)
========================================================= */
function slugify(str){
  try{
    return String(str||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase();
  }catch(_){
    return String(str||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }
}
var PT_BRANDS = [
  'DeWalt','Milwaukee','Mafell','Makita','Festool','Flex','Stanley','Wera','Facom'
].map(function(name){ return { name:name, slug:slugify(name) }; });

function ensureHomeView(){
  var home = document.getElementById('view-home');
  if (home) return home;
  home = document.createElement('section');
  home.id = 'view-home'; home.className = 'view home'; home.setAttribute('aria-label', 'Accueil');
  home.innerHTML =
    '<div class="container">'+
      '<h1 style="margin:1rem 0 .5rem" tabindex="-1">Bienvenue</h1>'+
      '<p style="margin:0 0 1rem;color:#9fb4c5">Choisissez une marque pour afficher les produits associés.</p>'+
      '<div id="brandGrid" class="brand-grid" role="list"></div>'+
    '</div>';
  if (hero && hero.parentNode) hero.parentNode.insertBefore(home, hero.nextSibling);
  return home;
}

function renderHomeBrands(){
  var home = ensureHomeView();
  var grid = $('#brandGrid', home); if (!grid) return;
  grid.innerHTML = PT_BRANDS.map(function(b){
    var onerr = "this.onerror=null;this.src='./images/pirates-tools-logo.png?v=7';";
    return ''+
      '<a class="brand" role="listitem" href="#/catalogue" data-brand="'+b.slug+'" data-brand-name="'+b.name+'">'+
        '<span class="brand__bubble">'+
          '<img src="./images/brands/'+b.slug+'.svg" alt="'+b.name+'" loading="lazy" decoding="async" onerror="'+onerr+'"/>'+
          '<span class="brand__glass" aria-hidden="true"></span>'+
        '</span>'+
        '<span class="brand__label">'+b.name+'</span>'+
      '</a>';
  }).join('');
}

function ensureCatalogueBrands(){
  var view = document.getElementById('view-catalogue'); if (!view) return;
  var host = document.getElementById('catalogBrandGrid');
  if (!host){
    host = document.createElement('div'); host.id = 'catalogBrandGrid'; host.className = 'brand-grid';
    var ref = document.getElementById('list'); if (ref && ref.parentNode) ref.parentNode.insertBefore(host, ref); else view.appendChild(host);
  }
  if (!host.__rendered){
    host.__rendered = 1;
    host.innerHTML = PT_BRANDS.map(function(b){
      var onerr = "this.onerror=null;this.src='./images/pirates-tools-logo.png?v=7';";
      return ''+
        '<a class="brand" role="listitem" href="#/catalogue" data-brand="'+b.slug+'" data-brand-name="'+b.name+'">'+
          '<span class="brand__bubble">'+
            '<img src="./images/brands/'+b.slug+'.svg" alt="'+b.name+'" loading="lazy" decoding="async" onerror="'+onerr+'"/>'+
            '<span class="brand__glass" aria-hidden="true"></span>'+
          '</span>'+
          '<span class="brand__label">'+b.name+'</span>'+
        '</a>';
    }).join('');
  }
}

/* Clic bulles → filtre & route catalogue */
(function bindBrandBubbles(){
  document.addEventListener('click', function(e){
    var el = e.target && e.target.closest ? e.target.closest('[data-brand][data-brand-name]') : null;
    if (!el) return;
    e.preventDefault();
    var label = el.getAttribute('data-brand-name') || '';
    if (tagEl)    tagEl.value = '';
    if (searchEl) searchEl.value = label;
    if (typeof applyFilters === 'function') applyFilters();
    location.hash = '#/catalogue';
    setTimeout(function(){
      var listNode = document.getElementById('list');
      if (listNode && listNode.scrollIntoView) listNode.scrollIntoView({behavior:'smooth', block:'start'});
    }, 120);
  }, false);
})();

/* =========================================================
   6) Smooth scroll (+ redirection catalogue/#list)
========================================================= */
(function smoothScrollLinks(){
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function smoothScrollTo(selector){
    var el = selector ? document.querySelector(selector) : null; if (!el) return;
    try{ el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch(_){ el.scrollIntoView(true); }
  }
  qsa('[data-scroll]').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      var targetSel = a.getAttribute('data-scroll') || a.getAttribute('href') || '';
      var targetIsList = (targetSel && targetSel.toLowerCase) ? (targetSel.toLowerCase() === '#list') : (targetSel === '#list');
      var h = (location.hash || '').toLowerCase();

      if ((!h || h === '#' || h === '#/' || h === '#/home') && targetIsList){
        var fired = false;
        var once = function(){ if (fired) return; fired = true; window.removeEventListener('hashchange', once); requestAnimationFrame(function(){ smoothScrollTo('#list'); }); };
        window.addEventListener('hashchange', once, false);
        location.hash = '#/catalogue';
        setTimeout(function(){ if (!fired) once(); }, 150);
        return;
      }

      var inView = (/^#\//i).test(h);
      if (inView){
        var done = false;
        var once2 = function(){ if (done) return; done = true; window.removeEventListener('hashchange', once2); requestAnimationFrame(function(){ smoothScrollTo(targetSel); }); };
        window.addEventListener('hashchange', once2, false);
        location.hash = targetIsList ? '#/catalogue' : '';
        setTimeout(function(){ if (!done) once2(); }, 150);
      } else {
        smoothScrollTo(targetSel);
      }
    }, false);
  });
})();

/* =========================================================
   7) Anim “exit” (IntersectionObserver)
========================================================= */
var ScrollExit = (function () {
  function injectExitCSS(){
    if (document.getElementById('exit-anim-css')) return;
    var style = document.createElement('style');
    style.id = 'exit-anim-css';
    style.textContent =
'@keyframes exitLeft{to{transform:translateX(-60px);opacity:0;filter:blur(2px)}}'+
'@keyframes exitRight{to{transform:translateX(60px);opacity:0;filter:blur(2px)}}'+
'.tool--exit-left{animation:exitLeft 420ms cubic-bezier(.22,.61,.36,1) forwards;will-change:transform,opacity}'+
'.tool--exit-right{animation:exitRight 420ms cubic-bezier(.22,.61,.36,1) forwards;will-change:transform,opacity}'+
'@media (prefers-reduced-motion:reduce){.tool--exit-left,.tool--exit-right{animation:none;opacity:0}}';
    document.head.appendChild(style);
  }
  injectExitCSS();

  if (typeof window.IntersectionObserver !== 'function'){ return { observeWithin: function(){} }; }

  var flip = false;
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      var el = entry.target;
      if (entry.isIntersecting) { el.classList.remove('tool--exit-left','tool--exit-right'); el.removeAttribute('data-exited'); return; }
      if (el.getAttribute('data-exited') === '1') return;
      if (entry.boundingClientRect.top >= 0) return;
      var cls = flip ? 'tool--exit-right' : 'tool--exit-left';
      flip = !flip; void el.offsetWidth; el.classList.add(cls); el.setAttribute('data-exited','1');
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -10% 0px' });

  function observeWithin(root){ (root||document).querySelectorAll('[data-tool]').forEach(function(el){ io.observe(el); }); }
  return { observeWithin: observeWithin };
})();


/* =========================================================
   Pirates Tools — app.part2-catalogue.js
   PART 2/4 : Rendu produits, listes, catégories
   ES5-safe • Tolérant si PART 3/4 non encore chargée
========================================================= */
'use strict';

/* --- Utilitaires locaux sûrs --- */
function _moneyFromCents(cents, currency){
  var v = (Math.round(cents) || 0)/100;
  currency = currency || 'EUR';
  try { return v.toLocaleString('fr-FR', { style:'currency', currency:currency }); }
  catch(_){ return (Math.round(v*100)/100).toFixed(2) + ' ' + currency; }
}
function _unitCentsLocal(p){
  if (!p) return null;
  if (typeof p.price_cents === 'number' && isFinite(p.price_cents)) return Math.round(p.price_cents);
  if (typeof p.price === 'number' && isFinite(p.price))             return Math.round(p.price*100);
  if (typeof p.price === 'string'){
    var s = p.price.replace(/\s/g,'').replace(',', '.');
    var v = parseFloat(s);
    if (isFinite(v)) return Math.round(v*100);
  }
  return null;
}
function _slugLocal(s){
  try { if (typeof slugify === 'function') return slugify(s); } catch(_){}
  return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

/* =========================================================
   A) Cart helpers (compat si PART 3 non chargée)
========================================================= */
function cartPushAndPersist(p){
  try { (CART || (CART=[])).push(p); } catch(_){}
  try {
    if (typeof saveCart === 'function') saveCart();
    else if (typeof updateDock === 'function') updateDock();
  } catch(_){}
  try { if (typeof notifyCartAdded === 'function') notifyCartAdded(p && (p.title || p.sku || 'Article')); } catch(_){}
}

/* =========================================================
   B) Cartes produit + listes
========================================================= */
function productToHTML(m){
  var title = ( (m && m.title) || (((m && m.brand)||'') + ((m && m.brand)?' ':'') + ((m && m.sku)||'')) ).trim();
  var tag   = (m && (m.badge || (Array.isArray(m.tags)&&m.tags[0]) || m.tag)) || '';
  var desc  = (m && (m.desc || m.description)) || '';
  var id    = String((m && (m.id!=null ? m.id : (m.sku!=null ? m.sku : (m.title || '')))) || '');

  var priceCents = _unitCentsLocal(m);
  var cur = (m && m.currency) || 'EUR';
  var priceHtml = '';
  if (priceCents != null){
    priceHtml = '<div class="price" aria-label="Prix" style="margin-top:.35rem;font-weight:700">' +
                  _moneyFromCents(priceCents, cur) +
                '</div>';
  }

  return '' +
  '<article class="card" data-tool data-id="'+id+'" data-tag="'+(tag||'')+'">' +
    '<div class="head">' +
      '<h3 class="title">'+ (title||'Produit') +'</h3>' +
      (tag ? '<span class="badge">'+tag+'</span>' : '') +
    '</div>' +
    '<div class="specs"><p style="margin:0">'+ (desc || '—') +'</p>'+ priceHtml +'</div>' +
    '<div class="actions"><button class="btn primary" data-add="'+id+'">Ajouter au panier</button></div>' +
  '</article>';
}

function bindAddToCart(scopeData, root){
  var container = root || (typeof listEl!=='undefined' && listEl) || document;
  var arr = (Array.isArray(scopeData) ? scopeData : (typeof MODELS!=='undefined' ? MODELS : []));
  Array.prototype.slice.call((container||document).querySelectorAll('[data-add]')).forEach(function(btn){
    if (btn.__wired) return; btn.__wired = 1;
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var id = btn.getAttribute('data-add');
      var p  = arr.find ? arr.find(function(x){
        return (x.id && String(x.id)===id) || (x.sku && String(x.sku)===id) || (x.title===id);
      }) : null;
      if (!p) return;
      cartPushAndPersist(p);
    });
  });
}

function renderList(data){
  var root = (typeof listEl!=='undefined' && listEl) || document.getElementById('list');
  if (!root) return;
  var arr = Array.isArray(data) ? data : (typeof MODELS!=='undefined' ? MODELS : []);
  root.innerHTML = arr.map(productToHTML).join('\n');

  Array.prototype.slice.call(root.querySelectorAll('.card')).forEach(function(card){
    if (card.__wired) return; card.__wired = 1;
    card.addEventListener('click', function(e){
      if (e.target && e.target.closest && e.target.closest('[data-add]')) return;
      var id = card.getAttribute('data-id'); if (!id) return;
      location.hash = '#/produit/' + encodeURIComponent(id);
    });
  });

  bindAddToCart(arr, root);
  try { if (typeof ScrollExit==='object' && ScrollExit.observeWithin) ScrollExit.observeWithin(root); } catch(_){}
}

function renderListInto(root, data){
  if (!root) return;
  var arr = Array.isArray(data) ? data : (typeof MODELS!=='undefined' ? MODELS : []);
  root.innerHTML = arr.map(productToHTML).join('\n');

  Array.prototype.slice.call(root.querySelectorAll('.card')).forEach(function(card){
    if (card.__wired) return; card.__wired = 1;
    card.addEventListener('click', function(e){
      if (e.target && e.target.closest && e.target.closest('[data-add]')) return;
      var id = card.getAttribute('data-id'); if (!id) return;
      location.hash = '#/produit/' + encodeURIComponent(id);
    });
  });

  bindAddToCart(arr, root);
  try { if (typeof ScrollExit==='object' && ScrollExit.observeWithin) ScrollExit.observeWithin(root); } catch(_){}
}

/* =========================================================
   C) Catégories (détection & vues)
========================================================= */
function buildCategories(){
  var list = (typeof MODELS!=='undefined' ? MODELS : []);
  var map = {};
  for (var i=0;i<list.length;i++){
    var m = list[i];
    var raw = ((m && (m.category || m.badge || m.brand)) || '').toString().trim();
    if (!raw) continue;
    var key = _slugLocal(raw);
    if (!map[key]) map[key] = { key:key, label:raw, count:0 };
    map[key].count++;
  }
  var out = [];
  for (var k in map) if (Object.prototype.hasOwnProperty.call(map,k)) out.push(map[k]);
  out.sort(function(a,b){ return b.count - a.count; });
  return out;
}

function findSelectMatch(select, keyLower){
  if (!select) return null;
  var opts = Array.prototype.slice.call(select.options || []);
  for (var i=0;i<opts.length;i++){
    var raw = (opts[i].value || opts[i].textContent || '');
    var vLower = String(raw).toLowerCase();
    var vSlug  = _slugLocal(raw);
    if (vLower===keyLower || vSlug===keyLower) return (opts[i].value || opts[i].textContent);
  }
  return null;
}

function ensureCategoryView(){
  var sec = document.getElementById('view-category');
  if (sec) return sec;

  sec = document.createElement('section');
  sec.id = 'view-category';
  sec.className = 'view hidden';
  sec.setAttribute('aria-label','Catégorie');
  sec.innerHTML =
    '<div class="container">'+
      '<h1 id="catTitle" tabindex="-1">Catégorie</h1>'+
      '<div id="categoryList"></div>'+
    '</div>';

  var main = document.querySelector('main.container');
  var cat  = document.getElementById('view-catalogue');
  if (cat && cat.parentNode) { cat.parentNode.insertBefore(sec, cat.nextSibling); }
  else if (main) { main.appendChild(sec); }
  else { document.body.appendChild(sec); }

  return sec;
}

function renderCategoryPage(slugLower){
  slugLower = String(slugLower||'').toLowerCase();
  var view = ensureCategoryView();
  var titleEl = document.getElementById('catTitle');
  var listHost = document.getElementById('categoryList');

  var cats = [];
  try { cats = buildCategories(); } catch(_){ cats = []; }
  var found = cats.find ? cats.find(function(c){ return c && c.key === slugLower; }) : null;
  var label = (found && found.label) || slugLower;
  if (titleEl) titleEl.textContent = label;

  var items = (typeof MODELS!=='undefined' ? MODELS : []).filter(function(m){
    var raw = ((m && (m.category || m.badge || m.brand)) || '').toString().trim();
    return _slugLocal(raw) === slugLower;
  });

  renderListInto(listHost, items);
}

/* =========================================================
   D) Catalogue (carte catégories + navigation)
========================================================= */
function renderCatalogue(){
  var root = document.getElementById('catList');
  if (!root) return;

  var cats = buildCategories();
  root.innerHTML = cats.length
    ? cats.map(function(c){
        return '' +
        '<article class="card cat-card" data-cat="'+c.key+'">' +
          '<div class="head"><h3 class="title">'+c.label+'</h3><span class="badge">Catégorie</span></div>' +
          '<div class="specs"><p style="margin:0">'+c.count+' produit'+(c.count>1?'s':'')+'</p></div>' +
          '<div class="actions"><button class="btn primary" data-cat-go="'+c.key+'">Voir</button></div>' +
        '</article>';
      }).join('')
    : '<div class="card"><div class="specs"><p style="margin:0">Aucune catégorie détectée.</p></div></div>';

  function go(slugKey){
    var label = slugKey;
    for (var i=0;i<cats.length;i++){ if (cats[i].key===slugKey){ label = cats[i].label; break; } }

    try{
      var matchVal = (typeof findSelectMatch === 'function') ? findSelectMatch((typeof tagEl!=='undefined' && tagEl) || document.getElementById('tag'), slugKey) : null;
      var sel = (typeof tagEl!=='undefined' && tagEl) || document.getElementById('tag');
      var q   = (typeof searchEl!=='undefined' && searchEl) || document.getElementById('q');
      if (sel){ sel.value = matchVal || ''; }
      if (q){ q.value = matchVal ? '' : label; }
      if (typeof applyFilters === 'function') applyFilters();
    }catch(_){}

    var fired = false;
    var once = function(){
      if (fired) return; fired = true;
      window.removeEventListener('hashchange', once);
      var el = document.getElementById('categoryList');
      try{ el && el.scrollIntoView && el.scrollIntoView({behavior:'smooth'}); }catch(_){}
    };
    window.addEventListener('hashchange', once, false);
    location.hash = '#/categorie/' + encodeURIComponent(slugKey);
    setTimeout(function(){ if (!fired) once(); }, 150);
  }

  if (!root.__wired){
    root.__wired = 1;
    root.addEventListener('click', function(e){
      var btn  = e.target && e.target.closest ? e.target.closest('[data-cat-go]') : null;
      var card = e.target && e.target.closest ? e.target.closest('.cat-card') : null;
      if (btn)  { go(btn.getAttribute('data-cat-go')); return; }
      if (card) { go(card.getAttribute('data-cat'));   return; }
    });
  }
}

/* =========================================================
   E) Export « doux » (pour tests éventuels)
========================================================= */
try {
  window.PT = window.PT || {};
  window.PT._renderList = renderList;
  window.PT._renderCatalogue = renderCatalogue;
} catch(_){}

/* === FIN PARTIE 2/4 === */


/* =========================================================
   Pirates Tools — app.part3-shop.js
   PART 3/4 : Produits + Panier + Filtres + PDP + Devis/Paiements
   ES5-safe • Idempotent • Anti "page blanche"
========================================================= */
'use strict';

/* ---------- Partage globals (sans écraser si déjà faits) ---------- */
window.MODELS = window.MODELS || [];
window.CART   = window.CART   || [];
window.STORE_KEY = window.STORE_KEY || 'pt_cart_v1';
window.USER_KEY  = window.USER_KEY  || 'pt_user_v1';

var listEl   = (typeof window.listEl !== 'undefined' && window.listEl) || document.getElementById('list');
var searchEl = (typeof window.searchEl !== 'undefined' && window.searchEl) || document.getElementById('q');
var tagEl    = (typeof window.tagEl !== 'undefined' && window.tagEl) || document.getElementById('tag');

var dockCount    = document.getElementById('dockCount');
var PHONE_E164   = window.PHONE_E164 || '+33774230195';
var IMG_FALLBACK = window.IMG_FALLBACK || './images/pirates-tools-logo.png?v=7';
var CURRENCY     = window.CURRENCY || 'EUR';
var PAYPAL_BUSINESS = window.PAYPAL_BUSINESS || ''; // renseigne ton email PayPal PRO
var STRIPE_PAY_LINK = window.STRIPE_PAY_LINK || ''; // peut contenir {AMOUNT}/{AMOUNT_CENTS}
var CRYPTO_PAY_LINK = window.CRYPTO_PAY_LINK || '';

/* ---------- Helpers locaux, sans doublons ---------- */
function _fallback(v, alt){ return (v === undefined || v === null) ? (alt || '') : v; }
function _slugLocal(s){
  try { if (typeof slugify === 'function') return slugify(s); } catch(_){}
  return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function _originPath(){
  try{
    var o = (location.origin || (location.protocol + '//' + location.host));
    return o + location.pathname;
  }catch(_){ return (location.pathname || '/'); }
}
function _toNumberSafe(v){ var n = (typeof v === 'number') ? v : parseFloat(v); return isFinite(n) ? n : null; }
function _unitCents(p){
  if (!p) return null;
  if (typeof p.price_cents === 'number' && isFinite(p.price_cents)) return Math.round(p.price_cents);
  if (typeof p.price === 'number' && isFinite(p.price)) return Math.round(p.price*100);
  if (typeof p.price === 'string'){
    var s = p.price.replace(/\s/g,'').replace(',', '.');
    var v = parseFloat(s);
    if (isFinite(v)) return Math.round(v*100);
  }
  return null;
}
function _moneyFromCents(cents, currency){
  var v = (Math.round(cents)||0)/100;
  currency = currency || CURRENCY || 'EUR';
  try { return v.toLocaleString('fr-FR', { style:'currency', currency:currency }); }
  catch(_){ return (Math.round(v*100)/100).toFixed(2)+' '+currency; }
}
function _setSafeImg(el, src, alt){
  var s = src || IMG_FALLBACK;
  if (!el) return;
  el.loading = el.loading || 'lazy';
  el.decoding = 'async';
  el.referrerPolicy = 'no-referrer';
  el.crossOrigin = 'anonymous';
  el.alt = alt || '';
  el.onerror = function(){ el.onerror=null; el.src=IMG_FALLBACK; };
  try{
    var u = new URL(s, location.href);
    if (u.protocol === 'http:') u.protocol = 'https:';
    el.src = u.toString();
  }catch(_){ el.src = IMG_FALLBACK; }
}
function _announce(msg){ try{ var live=document.getElementById('sr-live')||document.getElementById('srLive'); if(live){ live.textContent=''; setTimeout(function(){ live.textContent=msg; },20);} }catch(_){} }
function _toast(msg, kind){ try{ if (typeof toast==='function') toast(msg, kind||'success'); else console.log(msg); }catch(_){ try{ console.log(msg);}catch(__){} } }

/* ---------- Dock & Panier (définis seulement si manquants) ---------- */
if (typeof window.updateDock !== 'function'){
  window.updateDock = function updateDock(){
    var n = (window.CART && window.CART.length) || 0;
    if (dockCount){ dockCount.textContent = n; dockCount.style.display = n ? '' : 'none'; }
  };
}
if (typeof window.saveCart !== 'function'){
  window.saveCart = function saveCart(){
    try { localStorage.setItem(window.STORE_KEY, JSON.stringify(window.CART)); } catch(_){}
    try { window.updateDock(); } catch(_){}
    try {
      var h = (location.hash || '').toLowerCase();
      if (h.indexOf('#/devis') === 0 && typeof renderCartView === 'function'){ renderCartView(); }
    }catch(_){}
    try { window.dispatchEvent(new CustomEvent('pt:cartChanged')); } catch(_){}
  };
}
if (!window.__pt_cart_loaded){
  window.__pt_cart_loaded = true;
  try{
    var raw = localStorage.getItem(window.STORE_KEY);
    window.CART = raw ? JSON.parse(raw) : [];
  }catch(_){ window.CART = []; }
  try{ window.updateDock(); }catch(_){}
}

/* feedback visuel à l’ajout (fallback si partie 1 absente) */
if (typeof window.notifyCartAdded !== 'function'){
  window.notifyCartAdded = function notifyCartAdded(title){
    _toast('« '+(title||'Article')+' » ajouté au devis', 'success');
    _announce((title||'Article')+' ajouté au devis');
    if (dockCount){
      dockCount.classList.remove('bump'); void dockCount.offsetWidth; dockCount.classList.add('bump');
    }
  };
}

/* =========================================================
   11) CHARGEMENT PRODUITS (fetch+XHR fallback, multi-URLs)
========================================================= */
function loadProducts(){
  if (loadProducts.__loading) return loadProducts.__loading;

  function parseProductsPayload(json){
    if (Array.isArray(json)) return json;
    if (json && Array.isArray(json.products)) return json.products;
    if (json && Array.isArray(json.items))    return json.items;
    if (json && json.data && Array.isArray(json.data)) return json.data;
    return [];
  }
  function renderAllSafe(){
    try { if (typeof renderList==='function') renderList(window.MODELS); } catch(_){}
    try { if (typeof renderCatalogue==='function') renderCatalogue(); } catch(_){}
    try { if (typeof renderHomeBrands==='function') renderHomeBrands(); } catch(_){}
    try { if (typeof ensureCatalogueBrands==='function') ensureCatalogueBrands(); } catch(_){}
    try { window.dispatchEvent(new CustomEvent('pt:productsLoaded')); } catch(_){}
  }
  function showErrorCard(message){
    try{
      var root = listEl || document.getElementById('list');
      if (!root) return;
      root.innerHTML =
        '<div class="card">' +
          '<div class="head"><h3 class="title">Produits indisponibles</h3></div>' +
          '<div class="specs"><p style="margin:0">'+ (message || 'Impossible de charger <code>products.json</code>.') +'</p></div>' +
        '</div>';
    }catch(_){}
  }
  function safeFetchJson(url, timeoutMs){
    if (timeoutMs == null) timeoutMs = 8000;

    if (typeof window.fetch !== 'function'){
      return new Promise(function(resolve, reject){
        try{
          var timer = setTimeout(function(){ try{ xhr.abort(); }catch(_){ } reject(new Error('timeout')); }, timeoutMs);
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.overrideMimeType && xhr.overrideMimeType('application/json');
          xhr.onreadystatechange = function(){
            if (xhr.readyState !== 4) return;
            clearTimeout(timer);
            if (xhr.status >= 200 && xhr.status < 300){
              var txt = xhr.responseText || '';
              try { resolve(txt ? JSON.parse(txt) : {}); } catch(e){ reject(e); }
            } else { reject(new Error('HTTP '+xhr.status)); }
          };
          xhr.send(null);
        }catch(err){ reject(err); }
      });
    }

    return new Promise(function(resolve, reject){
      var done = false;
      var timer = setTimeout(function(){ if(done) return; done=true; reject(new Error('timeout')); }, timeoutMs);

      window.fetch(url, { cache:'no-store' })
        .then(function(r){ if(!r||!r.ok) throw new Error('HTTP '+(r?r.status:0)); return r.text(); })
        .then(function(txt){
          if(done) return; done = true; clearTimeout(timer);
          try{ resolve(txt ? JSON.parse(txt) : {}); }catch(e){ reject(e); }
        })
        .catch(function(e){ if(done) return; done=true; clearTimeout(timer); reject(e); });
    });
  }

  function basePath(){
    try{
      var p = (location.pathname || '/');
      return (location.origin || (location.protocol + '//' + location.host)) + p.replace(/\/[^\/]*$/, '/');
    }catch(_){ return './'; }
  }
  var root = basePath();
  var ts   = (new Date()).getTime();
  var urls = [
    'products.json',
    './products.json',
    root + 'products.json',
    'products.json?v=' + ts
  ];
  (function dedupe(){ var seen={}, out=[], i; for(i=0;i<urls.length;i++){ if(!seen[urls[i]]){ seen[urls[i]]=1; out.push(urls[i]); } } urls=out; })();

  function tryNext(i){
    if (i >= urls.length){
      window.MODELS = [];
      renderAllSafe();
      showErrorCard('Impossible de charger <code>products.json</code>. Vérifiez le chemin et les permissions.');
      _toast('Erreur: produits introuvables', 'info');
      return Promise.resolve(window.MODELS);
    }
    return safeFetchJson(urls[i]).then(function(json){
      window.MODELS = parseProductsPayload(json) || [];
      renderAllSafe();
      if (!window.MODELS.length) return tryNext(i+1);
      return window.MODELS;
    }).catch(function(){ return tryNext(i+1); });
  }

  loadProducts.__loading = tryNext(0);
  return loadProducts.__loading;
}
loadProducts();

/* =========================================================
   12) FILTRES (recherche + select) — debounce
========================================================= */
function debounce(fn, wait){ if (wait===void 0) wait=140; var t=0; return function(){ var a=arguments; clearTimeout(t); t=setTimeout(function(){ fn.apply(null,a); }, wait); }; }

var applyFilters = debounce(function(){
  var q = ((searchEl && searchEl.value) || '').trim().toLowerCase();
  var t = ((tagEl && tagEl.value) || '').trim().toLowerCase();

  var filtered = window.MODELS.filter(function(m){
    var hay = [
      _fallback(m.title,''), _fallback(m.sku,''), _fallback(m.brand,''),
      _fallback(m.category,''), _fallback(m.desc, _fallback(m.description,'')),
      (Array.isArray(m.tags) ? m.tags.join(' ') : ''), _fallback(m.badge,'')
    ].join(' ').toLowerCase();
    var okQ = !q || hay.indexOf(q) !== -1;
    var okT = !t || hay.indexOf(t) !== -1;
    return okQ && okT;
  });

  try { if (typeof renderList==='function') renderList(filtered); } catch(_){}
}, 120);

if (searchEl && !searchEl.__wired){ searchEl.__wired = 1; searchEl.addEventListener('input', applyFilters, true); }
if (tagEl && !tagEl.__wired){ tagEl.__wired = 1; tagEl.addEventListener('change', applyFilters, true); }

/* =========================================================
   13) PDP (fiche produit) + JSON-LD
========================================================= */
function findProductByKey(key){
  if (!key) return null;
  var k = String(key).toLowerCase();
  for (var i=0;i<window.MODELS.length;i++){
    var m = window.MODELS[i];
    var id  = String((m && m.id!=null)  ? m.id  : ((m && m.sku!=null) ? m.sku : '')).toLowerCase();
    var sku = String((m && m.sku!=null) ? m.sku : '').toLowerCase();
    var ttl = String((m && m.title!=null)? m.title: '').toLowerCase();
    if (id===k || sku===k || ttl===k) return m;
  }
  return null;
}

function absoluteUrl(u){ try { return new URL(u, location.href).href; } catch(_){ return u; } }
function schemaAvailability(p){
  var s = (p.stock_status || '').toLowerCase();
  if (s === 'in_stock')     return 'http://schema.org/InStock';
  if (s === 'low_stock')    return 'http://schema.org/LimitedAvailability';
  if (s === 'out_of_stock') return 'http://schema.org/OutOfStock';
  return (p.stock_qty > 0) ? 'http://schema.org/InStock' : 'http://schema.org/OutOfStock';
}
function buildProductJsonLD(p){
  var images = [];
  if (p.img) images.push(absoluteUrl(p.img));
  if (Array.isArray(p.gallery)) for (var i=0;i<p.gallery.length;i++) images.push(absoluteUrl(p.gallery[i]));

  var price = (typeof p.price === 'number') ? p.price : (typeof p.price_cents === 'number' ? p.price_cents/100 : undefined);
  var url   = _originPath() + '#/produit/' + encodeURIComponent(p.id || p.sku || (p.title || ''));

  var data = {
    "@context":"https://schema.org",
    "@type":"Product",
    "name": p.title || ((p.brand||'')+' '+(p.sku||'')),
    "sku":  p.sku || p.id || undefined,
    "mpn":  p.sku || undefined,
    "brand": p.brand ? { "@type":"Brand", "name": p.brand } : undefined,
    "category": p.category || undefined,
    "description": (p.seo && p.seo.description) || p.desc || p.description || undefined,
    "image": images.length ? images : undefined,
    "url": url,
    "offers": {
      "@type":"Offer",
      "priceCurrency": (p.currency || CURRENCY || "EUR"),
      "price": price != null ? String(price) : undefined,
      "availability": schemaAvailability(p),
      "itemCondition": p.new ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
      "url": url
    }
  };
  var hasRating = (typeof p.rating === 'number' && typeof p.reviews === 'number' && p.reviews > 0);
  if (hasRating){
    data.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": String(p.rating),
      "ratingCount": String(p.reviews)
    };
  }
  // prune undefined/vides
  function prune(o){
    if (Array.isArray(o)){
      var arr = []; for (var i=0;i<o.length;i++){ var pv = prune(o[i]); if (pv!=null) arr.push(pv); }
      return arr.length ? arr : null;
    }
    if (o && typeof o === 'object'){
      var r = {}; var has=false;
      for (var k in o){ if (!Object.prototype.hasOwnProperty.call(o,k)) continue;
        var v = prune(o[k]); if (v!=null) { r[k]=v; has=true; }
      }
      return has ? r : null;
    }
    return (o===undefined||o===null) ? null : o;
  }
  return prune(data);
}
function injectProductJsonLD(p){
  try{
    var id='jsonld-product', old=document.getElementById(id); if (old) old.remove();
    var json = buildProductJsonLD(p); if (!json) return;
    var s=document.createElement('script'); s.type='application/ld+json'; s.id=id; s.textContent=JSON.stringify(json);
    document.head.appendChild(s);
  }catch(_){}
}
function clearProductJsonLD(){ var s=document.getElementById('jsonld-product'); if (s) s.remove(); }

function renderPDP(product){
  var elImg  = document.getElementById('pdpImg');
  var elT    = document.getElementById('pdpTitle');
  var elTag  = document.getElementById('pdpTag');
  var elDesc = document.getElementById('pdpDesc');
  var elSpecs= document.getElementById('pdpSpecs');
  var elRel  = document.getElementById('pdpRelated');
  var btnQ   = document.getElementById('pdpQuote');
  var btnWa  = document.getElementById('pdpWa');
  var btnShare = document.getElementById('pdpShare');

  var title = product.title || ((product.brand||'') + ' ' + (product.sku||'')).trim();
  var tag   = product.badge || (Array.isArray(product.tags)&&product.tags[0]) || product.tag || '';
  var desc  = product.desc || product.description || '';
  var img   = product.img  || IMG_FALLBACK;

  if (elT) elT.textContent = title;
  if (elTag) elTag.textContent = tag ? '#'+tag : '';
  if (elDesc) elDesc.textContent = desc || 'Caractéristiques à venir.';
  if (elImg){ _setSafeImg(elImg, img, product.images_alt || title || ''); }

  // Prix PDP
  var priceCents = _unitCents(product), cur = product.currency || CURRENCY || 'EUR';
  var priceEl = document.getElementById('pdpPrice');
  if (!priceEl){ priceEl=document.createElement('p'); priceEl.id='pdpPrice'; priceEl.className='pdp__price'; priceEl.style.margin='.35rem 0'; priceEl.style.fontWeight='700'; if (elDesc && elDesc.parentNode) elDesc.parentNode.insertBefore(priceEl, elDesc.nextSibling); }
  priceEl.textContent = (priceCents!=null) ? _moneyFromCents(priceCents, cur) : '';

  // Specs
  var features = Array.isArray(product.features) ? product.features : (Array.isArray(product.specs) ? product.specs : []);
  var featHtml = features.length ? features.map(function(s){ return '<li>'+s+'</li>'; }).join('') : '';

  var kvFromJson = (product.specs_kv && typeof product.specs_kv==='object') ? product.specs_kv : null;
  var kvDerived = {
    'Plateforme': product.platform || undefined,
    'Moteur': product.motor || undefined,
    'Couple max': (product.torque_nm!=null) ? (product.torque_nm+' Nm') : undefined,
    'Vitesses': product.rpm || undefined,
    'Cadence de chocs': product.ipm || undefined,
    'Mandrin': product.chuck || undefined,
    'Longueur': (product.length_mm!=null) ? (product.length_mm+' mm') : undefined,
    'Poids': (product.weight_kg!=null) ? (product.weight_kg+' kg') : undefined,
    'Garantie': (product.warranty_months!=null) ? (product.warranty_months+' mois') : undefined
  };
  var merged = {}; var k;
  if (kvFromJson) for (k in kvFromJson){ if (kvFromJson[k]!=null && kvFromJson[k]!=='') merged[k]=kvFromJson[k]; }
  for (k in kvDerived){ var v = kvDerived[k]; if (v!=null && v!=='') merged[k]=v; }
  var tableHtml = '';
  if (Object.keys ? Object.keys(merged).length : true){
    var rows=''; for (k in merged){ if (Object.prototype.hasOwnProperty.call(merged,k)) rows += '<tr><th>'+k+'</th><td>'+merged[k]+'</td></tr>'; }
    if (rows){
      tableHtml = ''+
        '<li style="list-style:none; padding:0; margin:.6rem 0 0">'+
        '  <div class="badge" style="margin:0 0 .4rem; display:inline-flex; align-items:center; gap:.4rem">⚙️ Caractéristiques techniques</div>'+
        '  <div style="overflow:auto"><table style="width:100%; border-collapse:collapse; font-size:.95rem"><tbody>'+rows+'</tbody></table></div>'+
        '</li>';
    }
  }
  if (elSpecs) elSpecs.innerHTML = (featHtml || tableHtml) ? (featHtml + tableHtml) : '';

  // Boutons
  if (btnQ && !btnQ.__wired){
    btnQ.__wired = 1;
    btnQ.textContent = 'Ajouter au panier';
    btnQ.onclick = function(){
      window.CART.push(product);
      window.saveCart();
      window.notifyCartAdded(product.title || product.sku || 'Article');
    };
  }

  var sku = product.sku || product.id || title;
  var productLink = _originPath() + '#/produit/' + encodeURIComponent(product.id || product.sku || title);

  var contactSuffix = '';
  try{
    var u = (typeof loadUser === 'function') ? loadUser() : null;
    var arr = [];
    if (u && u.name)  arr.push('Nom: ' + u.name);
    if (u && u.email) arr.push('Email: ' + u.email);
    contactSuffix = arr.length ? '\n\nMes coordonnées:\n' + arr.join('\n') : '';
  }catch(_){}
  var textPDP = 'Bonjour, je souhaite un devis pour:\n• ' + sku + ' – ' + title + '\n\nLien: ' + productLink + contactSuffix + '\n\nMerci.';
  var phone = PHONE_E164.replace('+','');
  if (btnWa) btnWa.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(textPDP);

  if (btnShare && !btnShare.__wired){
    btnShare.__wired = 1;
    btnShare.onclick = function(){
      try{
        var shareData = { title: title+' • Pirates Tools', text: title, url: productLink };
        if (navigator.share) { navigator.share(shareData); }
        else if (navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(productLink);
          _toast('Lien copié dans le presse-papiers', 'success');
        }
      }catch(_){}
    };
  }

  // Liés
  var related = window.MODELS.filter(function(m){
    return (m!==product) && (
      (product.category && m.category===product.category) ||
      (tag && ((m.badge===tag) || (Array.isArray(m.tags) && m.tags.indexOf(tag)!==-1)))
    );
  }).slice(0,3);

  var elRelWrap = document.getElementById('pdpRelated');
  if (elRelWrap){
    var relHTML = '';
    for (var i=0;i<related.length;i++){
      var m = related[i];
      var pc  = _unitCents(m), cur2 = (m && m.currency) || CURRENCY || 'EUR';
      var priceLine = (pc!=null) ? ('<div class="specs" style="justify-content:flex-end"><strong>'+_moneyFromCents(pc, cur2)+'</strong></div>') : '';
      relHTML += ''+
        '<article class="card" data-id="'+(m.id || m.sku || m.title)+'">'+
        ' <div class="head"><h3 class="title">'+(m.title || (m.brand||'')+' '+(m.sku||''))+'</h3>'+((m.badge||'')?'<span class="badge">'+m.badge+'</span>':'')+'</div>'+
        ' <div class="specs"><p style="margin:0">'+(m.desc || m.description || '')+'</p></div>'+
          priceLine+
        ' <div class="actions"><button class="btn primary" data-add="'+(m.id || m.sku || m.title)+'">Ajouter au panier</button></div>'+
        '</article>';
    }
    elRelWrap.innerHTML = relHTML;

    // bind add depuis les liés
    elRelWrap.addEventListener('click', function(e){
      var btn = e.target && e.target.closest ? e.target.closest('[data-add]') : null;
      if (!btn) return;
      var id = btn.getAttribute('data-add');
      var p  = window.MODELS.find ? window.MODELS.find(function(x){ return ((x.id||x.sku||x.title)+'') === id; }) : null;
      if (p){
        window.CART.push(p); window.saveCart(); window.notifyCartAdded(p.title || p.sku || 'Article');
      }
      e.stopPropagation();
    });
    // click carte => route produit
    var cards = elRelWrap.querySelectorAll('.card');
    for (var j=0;j<cards.length;j++){
      (function(card){
        if (card.__wired) return; card.__wired = 1;
        card.addEventListener('click', function(ev){
          if (ev.target && ev.target.closest && ev.target.closest('[data-add]')) return;
          var id = card.getAttribute('data-id'); if (!id) return;
          location.hash = '#/produit/' + encodeURIComponent(id);
        });
      })(cards[j]);
    }
  }

  injectProductJsonLD(product);
}

/* =========================================================
   14) Devis (rendu + actions) & Paiements
========================================================= */
function groupCart(){
  var map = {}; var i;
  for (i=0;i<window.CART.length;i++){
    var p = window.CART[i];
    var k = String((p && (p.id!=null?p.id : (p.sku!=null?p.sku : (p.title||'')))));
    if (!map[k]) map[k] = { item: p, qty: 0 };
    map[k].qty += 1;
  }
  var out = []; for (var k in map) if (Object.prototype.hasOwnProperty.call(map,k)) out.push(map[k]);
  return out;
}
function computeCartTotal(){
  var grouped = groupCart();
  var totalCents = 0, counted = 0;
  for (var i=0;i<grouped.length;i++){
    var u = _unitCents(grouped[i].item);
    if (u != null){ totalCents += u * grouped[i].qty; counted++; }
  }
  return { totalCents: totalCents, total: totalCents/100, hasPrices: counted>0 };
}
function formatMoneyFromCents(c){ return _moneyFromCents(c, CURRENCY); }
function fillAmount(url, totalCents){
  if (!url) return '';
  var euros = (totalCents/100).toFixed(2);
  var cents = Math.round(totalCents);
  return url.replace(/\{AMOUNT\}/g, euros).replace(/\{AMOUNT_CENTS\}/g, String(cents));
}
function cartToWhatsAppText(){
  var grouped = groupCart(); if (!grouped.length) return '';
  var lines = [];
  for (var i=0;i<grouped.length;i++){
    var g = grouped[i], item=g.item, qty=g.qty;
    var sku = item.sku || item.id || '';
    var title = (item.title || ((item.brand||'')+' '+(item.sku||''))).trim();
    lines.push('• ' + sku + ' – ' + title + (qty>1 ? (' ×'+qty) : ''));
  }
  var contact = '';
  try{
    var u = (typeof loadUser === 'function') ? loadUser() : null;
    var arr = [];
    if (u && u.name)  arr.push('Nom: ' + u.name);
    if (u && u.email) arr.push('Email: ' + u.email);
    contact = arr.length ? '\n\nMes coordonnées:\n' + arr.join('\n') : '';
  }catch(_){}
  var link = _originPath() + '#/devis';
  return 'Bonjour, je souhaite un devis pour:\n' + lines.join('\n') + '\n\nLien: ' + link + contact + '\n\nMerci.';
}

function fallbackWhatsAppForPayment(extraLine){
  var msg = cartToWhatsAppText();
  if (!msg) msg = 'Bonjour, je souhaite régler ma commande. Pouvez-vous m’envoyer un lien de paiement ?';
  if (extraLine) msg += '\n\n' + extraLine;
  window.open('https://wa.me/' + PHONE_E164.replace('+','') + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
}

function buildPayPalCartUrl(){
  if (!PAYPAL_BUSINESS || PAYPAL_BUSINESS.indexOf('@') === -1) return '';
  var base = 'https://www.paypal.com/cgi-bin/webscr?cmd=_cart&upload=1';
  base += '&business=' + encodeURIComponent(PAYPAL_BUSINESS);
  base += '&currency_code=' + encodeURIComponent(CURRENCY);

  var grouped = groupCart();
  var idx = 1;
  for (var i=0;i<grouped.length;i++){
    var g = grouped[i];
    var uc = _unitCents(g.item);
    if (uc == null) continue;
    var name = g.item.title || ((g.item.brand||'') + ' ' + (g.item.sku||'')).trim() || 'Article';
    var amount = (uc/100).toFixed(2);
    base += '&item_name_' + idx + '=' + encodeURIComponent(name);
    base += '&amount_'    + idx + '=' + encodeURIComponent(amount);
    base += '&quantity_'  + idx + '=' + encodeURIComponent(g.qty);
    idx++;
  }
  return base;
}

function payWithPayPal(){
  if (!window.CART.length){ _toast('Votre panier est vide', 'info'); return; }
  var info = computeCartTotal();
  if (!info.hasPrices){ _toast('Prix manquants — redirection WhatsApp.', 'info'); fallbackWhatsAppForPayment('Montant inconnu.'); return; }
  var url = buildPayPalCartUrl();
  if (!url){ _toast('PayPal non configuré (email manquant).', 'info'); return; }
  window.open(url, '_blank', 'noopener'); _announce('Redirection vers PayPal');
}
function payWithStripe(){
  if (!window.CART.length){ _toast('Votre panier est vide', 'info'); return; }
  var info = computeCartTotal();
  if (!info.hasPrices){ _toast('Prix manquants — redirection WhatsApp.', 'info'); fallbackWhatsAppForPayment('Montant inconnu.'); return; }
  if (!STRIPE_PAY_LINK){ _toast('Lien Carte/Apple Pay non configuré.', 'info'); return; }
  var url = fillAmount(STRIPE_PAY_LINK, info.totalCents);
  try{ if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText((info.totalCents/100).toFixed(2)); _toast('Montant copié : ' + formatMoneyFromCents(info.totalCents), 'success'); } }catch(_){}
  window.open(url, '_blank', 'noopener'); _announce('Redirection vers Carte / Apple Pay');
}
function payWithCrypto(){
  if (!window.CART.length){ _toast('Votre panier est vide', 'info'); return; }
  var info = computeCartTotal();
  if (!info.hasPrices){ _toast('Prix manquants — redirection WhatsApp.', 'info'); fallbackWhatsAppForPayment('Montant inconnu.'); return; }
  if (!CRYPTO_PAY_LINK){ _toast('Lien Crypto non configuré.', 'info'); return; }
  var url = fillAmount(CRYPTO_PAY_LINK, info.totalCents);
  try{ if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText((info.totalCents/100).toFixed(2)); _toast('Montant copié : ' + formatMoneyFromCents(info.totalCents), 'success'); } }catch(_){}
  window.open(url, '_blank', 'noopener'); _announce('Redirection vers Paiement Crypto');
}

function renderCartView(){
  var root = document.getElementById('devisList');
  if (!root) return;

  var grouped = groupCart();
  if (!grouped.length){
    root.innerHTML = '<p style="margin:0">Aucun article pour le moment.</p>';
  } else {
    var html = '';
    for (var i=0;i<grouped.length;i++){
      var g = grouped[i], item=g.item||{}, qty=Number(g.qty||0);
      var sku   = item.sku || item.id || '';
      var title = item.title || ((item.brand||'') + ' ' + (item.sku||'')).trim();
      var key   = String(item.id!=null?item.id : (item.sku!=null?item.sku : (item.title||'')));
      var uc    = _unitCents(item);
      var priceHtml = '';
      if (uc != null){
        priceHtml = ''+
          '<div class="specs" style="justify-content:flex-end">'+
          '  <span style="margin-left:auto">'+ _moneyFromCents(uc) + ' × ' + qty + ' = ' +
          '    <strong>' + _moneyFromCents(uc * qty) + '</strong>' +
          '  </span>'+
          '</div>';
      }
      html += ''+
      '<div class="card" style="width:100%">'+
      '  <div class="head"><h3 class="title">' + title + '</h3><span class="badge">' + sku + '</span></div>'+
      '  <div class="specs" style="display:flex;gap:.6rem;align-items:center">'+
      '    <button class="btn" data-dec="' + key + '" aria-label="Diminuer">−</button>'+
      '    <strong>' + qty + '</strong>'+
      '    <button class="btn" data-inc="' + key + '" aria-label="Augmenter">+</button>'+
      '    <button class="btn" data-del="' + key + '" style="margin-left:auto;background:rgba(255,255,255,.06);color:#d9e3ec" aria-label="Supprimer">Supprimer</button>'+
      '  </div>'+ priceHtml +
      '</div>';
    }
    root.innerHTML = html;
  }

  // total
  var info = computeCartTotal();
  var totalBlock =
    '<div class="specs" id="devisTotal" style="display:flex;justify-content:flex-end">'+
    '  <div>Total estimé : <strong>'+ (info.hasPrices ? _moneyFromCents(Math.round(info.totalCents||0)) : '—') +'</strong></div>'+
    '</div>';
  root.insertAdjacentHTML('beforeend', totalBlock);

  // actions +/−/suppr
  if (!root.__wired){
    root.__wired = 1;
    root.addEventListener('click', function(e){
      var inc = e.target && e.target.closest ? e.target.closest('[data-inc]') : null;
      var dec = e.target && e.target.closest ? e.target.closest('[data-dec]') : null;
      var del = e.target && e.target.closest ? e.target.closest('[data-del]') : null;
      var key;
      if (inc){ key = inc.getAttribute('data-inc');
        var p = window.MODELS.find ? window.MODELS.find(function(m){ return String((m.id!=null?m.id : (m.sku!=null?m.sku : (m.title||'')))) === key; }) : null;
        if (p) window.CART.push(p);
        window.saveCart(); renderCartView(); return;
      }
      if (dec){ key = dec.getAttribute('data-dec');
        for (var j=0;j<window.CART.length;j++){ var k = String((window.CART[j].id!=null?window.CART[j].id : (window.CART[j].sku!=null?window.CART[j].sku : (window.CART[j].title||'')))); if (k===key){ window.CART.splice(j,1); break; } }
        window.saveCart(); renderCartView(); return;
      }
      if (del){ key = del.getAttribute('data-del');
        for (var jj = window.CART.length - 1; jj >= 0; jj--){ var kk = String((window.CART[jj].id!=null?window.CART[jj].id : (window.CART[jj].sku!=null?window.CART[jj].sku : (window.CART[jj].title||'')))); if (kk===key) window.CART.splice(jj, 1); }
        window.saveCart(); renderCartView(); return;
      }
    }, false);
  }

  // boutons devis
  var sendBtn = document.getElementById('devisSend');
  if (sendBtn && !sendBtn.__wired){
    sendBtn.__wired = 1;
    sendBtn.addEventListener('click', function(){
      var msg = encodeURIComponent(cartToWhatsAppText()); if (!msg) return;
      window.open('https://wa.me/' + PHONE_E164.replace('+','') + '?text=' + msg, '_blank', 'noopener');
      _toast('Devis ouvert dans WhatsApp', 'success'); _announce('Devis ouvert dans WhatsApp');
    });
  }
  var clearBtn = document.getElementById('devisClear');
  if (clearBtn && !clearBtn.__wired){
    clearBtn.__wired = 1;
    clearBtn.addEventListener('click', function(){
      window.CART = []; window.saveCart(); renderCartView();
      _toast('Devis vidé', 'success'); _announce('Devis vidé');
    });
  }

  // rangée paiement (créée si absente)
  var cardEl = document.querySelector('#view-devis .card');
  if (cardEl){
    var payRow = document.getElementById('devisPayRow');
    if (!payRow){ payRow = document.createElement('div'); payRow.className='actions'; payRow.id='devisPayRow'; cardEl.appendChild(payRow); }
    function ensureBtn(id, cls, label, onClick){
      var b = document.getElementById(id);
      if (!b){ b = document.createElement('button'); b.id=id; b.className=cls; b.textContent=label; payRow.appendChild(b); }
      if (!b.__wired){ b.__wired=1; b.addEventListener('click', onClick); }
    }
    ensureBtn('devisPayStripe','btn primary','Carte / Apple Pay',  payWithStripe);
    ensureBtn('devisPayPayPal','btn',        'PayPal',             payWithPayPal);
    ensureBtn('devisPayCrypto','btn',        'Crypto',             payWithCrypto);
  }
}

/* === FIN PARTIE 3/4 === */


/* =========================================================
   Pirates Tools — app.part4-sys.js
   PART 4/4 : Compte & Fidélité + Router + PWA SW + Self-test + Safety-net
   ES5-safe • Idempotent • Anti "page blanche"
========================================================= */
'use strict';

/* ---------- Helpers locaux sûrs (sans polluer le global) ---------- */
var __pt_toast = function(msg, kind){
  try{ if (typeof toast==='function') toast(msg, kind||'info'); else console.log(msg); }
  catch(_){ try{ console.log(msg);}catch(__){} }
};
var __pt_announce = function(msg){
  try{ var live = document.getElementById('sr-live')||document.getElementById('srLive');
    if (live){ live.textContent=''; setTimeout(function(){ live.textContent=msg; },20); }
  }catch(_){}
};
var __pt_clamp = function(v, min, max){ v = typeof v==='number'?v:parseFloat(v); if(!isFinite(v)) v=0; return Math.max(min, Math.min(max, v)); };

/* =========================================================
   A) COMPTE & FIDÉLITÉ (démo locale)
========================================================= */
window.USER_KEY = window.USER_KEY || 'pt_user_v1';

function loadUser(){
  try{
    var v = JSON.parse(localStorage.getItem(window.USER_KEY));
    return v || { name:'', email:'', spent:0 };
  } catch(_){ return { name:'', email:'', spent:0 }; }
}
function saveUser(u){ try{ localStorage.setItem(window.USER_KEY, JSON.stringify(u)); }catch(_){} }
function gradeFromSpent(spent){
  if (spent >= 5000) return { label:'Excellent acheteur', color:'#00e1b4' };
  if (spent >= 1000) return { label:'Bon acheteur',       color:'#19d3ff' };
  return { label:'Moussaillon', color:'#9fb4c5' };
}

function renderAccount(){
  var u = loadUser();

  var nameEl = document.getElementById('accName');  if (nameEl) nameEl.value = u.name || '';
  var mailEl = document.getElementById('accEmail'); if (mailEl) mailEl.value = u.email || '';
  var spentEl= document.getElementById('accSpent'); if (spentEl) spentEl.textContent = (Number(u.spent).toLocaleString('fr-FR') + ' €');

  var g = gradeFromSpent(Number(u.spent) || 0);
  var gradeEl = document.getElementById('accGrade'); if (gradeEl){ gradeEl.textContent = g.label; gradeEl.style.borderColor = g.color; }

  var pct = __pt_clamp(((Number(u.spent)||0)/5000)*100, 0, 100);
  var fill = document.getElementById('accFill');   if (fill)   fill.style.width = pct + '%';
  var cur  = document.getElementById('accCursor'); if (cur)    cur.style.left  = pct + '%';
  var slider = document.getElementById('accSlider'); if (slider) slider.value = Math.min(Math.max(Number(u.spent)||0,0), 5000);

  var saveBtn = document.getElementById('accSave');
  if (saveBtn && !saveBtn.__wired){
    saveBtn.__wired = 1;
    saveBtn.addEventListener('click', function(){
      var nu = {
        name: (document.getElementById('accName')  && document.getElementById('accName').value)  || '',
        email:(document.getElementById('accEmail') && document.getElementById('accEmail').value) || '',
        spent: Number((u && u.spent) || 0)
      };
      saveUser(nu);
      __pt_toast('Compte enregistré', 'success');
    });
  }

  var resetBtn = document.getElementById('accReset');
  if (resetBtn && !resetBtn.__wired){
    resetBtn.__wired = 1;
    resetBtn.addEventListener('click', function(){
      saveUser({ name:u.name, email:u.email, spent:0 });
      renderAccount();
      __pt_toast('Fidélité remise à zéro', 'success');
    });
  }

  var sliderEl = document.getElementById('accSlider');
  if (sliderEl && !sliderEl.__wired){
    sliderEl.__wired = 1;
    sliderEl.addEventListener('input', function(e){
      var spent = Number(e.target.value || 0);
      var nu = { name: (document.getElementById('accName') && document.getElementById('accName').value) || '', email: (document.getElementById('accEmail') && document.getElementById('accEmail').value) || '', spent: spent };
      saveUser(nu);
      // Mise à jour visuelle immédiate
      var g2 = gradeFromSpent(spent);
      if (spentEl)  spentEl.textContent = spent.toLocaleString('fr-FR') + ' €';
      if (fill)     fill.style.width = __pt_clamp((spent/5000)*100, 0, 100) + '%';
      if (cur)      cur.style.left  = __pt_clamp((spent/5000)*100, 0, 100) + '%';
      if (gradeEl){ gradeEl.textContent = g2.label; gradeEl.style.borderColor = g2.color; }
    });
  }
}

/* =========================================================
   B) ROUTER (#/…)
   - Accueil = hero + #view-home
   - Autres vues = sections dédiées
   - Toolbar + main (#list) + ratings MASQUÉS en accueil
========================================================= */
(function(){
  if (window.__pt_router_wired) return; window.__pt_router_wired = true;

  var hero      = document.getElementById('hero');
  var dock      = document.getElementById('dock');
  var elToolbar = document.querySelector('.toolbar');
  var elMain    = document.querySelector('main.container') || document.querySelector('main');
  var elRatings = document.querySelector('.ratings');

  // Home minimal si la Partie 2 n'a pas créé la vue
  function ensureHomeViewLocal(){
    if (typeof window.ensureHomeView === 'function') return window.ensureHomeView();
    var home = document.getElementById('view-home');
    if (home) return home;
    home = document.createElement('section');
    home.id = 'view-home';
    home.className = 'view';
    home.setAttribute('aria-label', 'Accueil');
    home.innerHTML =
      '<div class="container">'+
        '<h1 style="margin:1rem 0 .5rem" tabindex="-1">Bienvenue</h1>'+
        '<p class="muted">Choisissez une marque pour afficher les produits associés.</p>'+
        '<div id="brandGrid" class="brand-grid" role="list"></div>'+
      '</div>';
    document.body.appendChild(home);
    return home;
  }
  ensureHomeViewLocal();
  try{ if (typeof window.renderHomeBrands === 'function') window.renderHomeBrands(); }catch(_){}

  function viewsMap(){
    return {
      home:      document.getElementById('view-home'),
      catalogue: document.getElementById('view-catalogue'),
      devis:     document.getElementById('view-devis'),
      produit:   document.getElementById('view-produit'),
      compte:    document.getElementById('view-compte')
    };
  }

  function showHero(yes){ if (hero) hero.classList.toggle('hidden', !yes); }
  function hideAllViews(){
    var V = viewsMap(); var k;
    for (k in V){ if (V[k]) V[k].classList.add('hidden'); }
    var vcat = document.getElementById('view-category'); if (vcat) vcat.classList.add('hidden');
  }
  function showView(key){ var V = viewsMap(); if (V[key]) V[key].classList.remove('hidden'); }
  function toggleIndexParts(visible){
    if (elToolbar) elToolbar.classList.toggle('hidden', !visible);
    if (elMain)    elMain.classList.toggle('hidden', !visible);
    if (elRatings) elRatings.classList.toggle('hidden', !visible);
  }
  function ensureDockVisibleOnViews(isHome){
    if (!dock) return;
    if (isHome){ /* hero contrôle la visibilité */ }
    else{ dock.classList.add('dock--visible'); }
  }
  function focusViewSafe(key){
    if (typeof window.focusView === 'function') { window.focusView(key); return; }
    try{ window.scrollTo(0,0); }catch(_){}
  }
  function wireBack(cameFrom){
    var back = document.querySelector('#pdpBack, .chip--back');
    if (!back) return;
    if (back.__wired) return; back.__wired = 1;
    back.onclick = function(e){
      e.preventDefault();
      if (cameFrom && cameFrom !== location.hash) { location.hash = cameFrom; return; }
      if (history.length > 1) { history.back(); return; }
      location.hash = '';
    };
  }

  var prevHash = '';

  function findByKeySafe(key){
    if (typeof window.findProductByKey === 'function') return window.findProductByKey(key);
    // Fallback simple
    var k = String(key||'').toLowerCase();
    var M = window.MODELS || [];
    for (var i=0;i<M.length;i++){
      var m = M[i];
      var id  = String((m && m.id!=null)  ? m.id  : ((m && m.sku!=null) ? m.sku : '')).toLowerCase();
      var sku = String((m && m.sku!=null) ? m.sku : '').toLowerCase();
      var ttl = String((m && m.title!=null)? m.title: '').toLowerCase();
      if (id===k || sku===k || ttl===k) return m;
    }
    return null;
  }

  function onRoute(){
    var h = (location.hash || '').toLowerCase();
    var cameFrom = prevHash;

    // #/produit/:id
    var m = h.match(/^#\/produit\/([^/?#]+)/);
    if (m){
      var key = decodeURIComponent(m[1] || '');
      var run = function(){
        var p = findByKeySafe(key);
        showHero(false); hideAllViews(); showView('produit'); toggleIndexParts(true); ensureDockVisibleOnViews(false);
        if (p && typeof window.renderPDP === 'function'){
          try{ window.renderPDP(p); }catch(_){}
        } else {
          var t = document.getElementById('pdpTitle'); if (t) t.textContent='Produit introuvable';
          var d = document.getElementById('pdpDesc');  if (d) d.textContent='Vérifiez la référence ou revenez au catalogue.';
          try{ if (typeof window.clearProductJsonLD==='function') window.clearProductJsonLD(); }catch(_){}
        }
        wireBack(cameFrom);
        try{ window.scrollTo({top:0, behavior:'auto'}); }catch(_){}
        focusViewSafe('produit');
        prevHash = h;
      };
      if (!window.MODELS || !window.MODELS.length){
        var once = function(){ window.removeEventListener('pt:productsLoaded', once); run(); };
        window.addEventListener('pt:productsLoaded', once, { once:true });
      }else{ run(); }
      return;
    }

    // #/catalogue
    m = h.match(/^#\/catalogue\b/);
    if (m){
      showHero(false); hideAllViews(); showView('catalogue'); toggleIndexParts(true); ensureDockVisibleOnViews(false);
      try{ if (typeof window.renderCatalogue==='function') window.renderCatalogue(); }catch(_){}
      try{ if (typeof window.ensureCatalogueBrands==='function') window.ensureCatalogueBrands(); }catch(_){}
      try{ if (typeof window.clearProductJsonLD==='function') window.clearProductJsonLD(); }catch(_){}
      try{ if (typeof window.resetPageMeta==='function') window.resetPageMeta(); }catch(_){}
      try{ window.scrollTo({top:0,behavior:'auto'}); }catch(_){}
      focusViewSafe('catalogue'); prevHash=h; return;
    }

    // #/categorie/:slug
    m = h.match(/^#\/categorie\/([^\/?#]+)/);
    if (m){
      var slug = decodeURIComponent(m[1] || '').toLowerCase();
      var sec = (typeof window.ensureCategoryView==='function') ? window.ensureCategoryView() : document.getElementById('view-category');

      showHero(false); hideAllViews(); toggleIndexParts(true); ensureDockVisibleOnViews(false);

      if (elMain) elMain.classList.add('hidden'); // masque la liste globale (#list)
      if (sec) sec.classList.remove('hidden');

      try{ if (typeof window.clearProductJsonLD==='function') window.clearProductJsonLD(); }catch(_){}
      try{ if (typeof window.resetPageMeta==='function') window.resetPageMeta(); }catch(_){}
      try{ if (typeof window.renderCategoryPage==='function') window.renderCategoryPage(slug); }catch(_){}
      try{ window.scrollTo({top:0,behavior:'auto'}); }catch(_){}

      var t = document.getElementById('catTitle');
      if (t){
        t.setAttribute('tabindex','-1');
        if (typeof t.focus === 'function') t.focus({ preventScroll: true });
        setTimeout(function(){ t.removeAttribute('tabindex'); }, 300);
      }
      prevHash=h; return;
    }

    // #/devis
    m = h.match(/^#\/devis\b/);
    if (m){
      showHero(false); hideAllViews(); showView('devis'); toggleIndexParts(false); ensureDockVisibleOnViews(false);
      try{ if (typeof window.renderCartView==='function') window.renderCartView(); }catch(_){}
      try{ if (typeof window.clearProductJsonLD==='function') window.clearProductJsonLD(); }catch(_){}
      try{ if (typeof window.resetPageMeta==='function') window.resetPageMeta(); }catch(_){}
      try{ window.scrollTo({top:0,behavior:'auto'}); }catch(_){}
      focusViewSafe('devis'); prevHash=h; return;
    }

    // #/compte
    m = h.match(/^#\/compte\b/);
    if (m){
      showHero(false); hideAllViews(); showView('compte'); toggleIndexParts(false); ensureDockVisibleOnViews(false);
      try{ renderAccount(); }catch(_){}
      try{ if (typeof window.clearProductJsonLD==='function') window.clearProductJsonLD(); }catch(_){}
      try{ if (typeof window.resetPageMeta==='function') window.resetPageMeta(); }catch(_){}
      try{ window.scrollTo({top:0,behavior:'auto'}); }catch(_){}
      focusViewSafe('compte'); prevHash=h; return;
    }

    // Accueil
    if (h === '' || h === '#' || h === '#/' || h === '#/home'){
      showHero(true); hideAllViews(); showView('home'); toggleIndexParts(false); ensureDockVisibleOnViews(true);
      try{ if (typeof window.clearProductJsonLD==='function') window.clearProductJsonLD(); }catch(_){}
      try{ if (typeof window.resetPageMeta==='function') window.resetPageMeta(); }catch(_){}
      try{ window.scrollTo({top:0,behavior:'auto'}); }catch(_){}
      focusViewSafe('home'); prevHash = h; return;
    }

    // Fallback => Accueil
    showHero(true); hideAllViews(); showView('home'); toggleIndexParts(false); ensureDockVisibleOnViews(true);
    try{ if (typeof window.clearProductJsonLD==='function') window.clearProductJsonLD(); }catch(_){}
    try{ if (typeof window.resetPageMeta==='function') window.resetPageMeta(); }catch(_){}
    try{ window.scrollTo({top:0,behavior:'auto'}); }catch(_){}
    focusViewSafe('home'); prevHash = h;
  }

  window.addEventListener('hashchange', onRoute, false);
  onRoute();
})();

/* =========================================================
   C) PWA (Service Worker + bannière mise à jour)
========================================================= */
function showUpdateBanner(waitingSW){
  if (document.getElementById('updateBanner')) return;
  var bar = document.createElement('div');
  bar.id = 'updateBanner';
  bar.setAttribute('role','status');
  bar.setAttribute('aria-live','polite');
  bar.innerHTML = '<div style="display:flex;gap:.6rem;align-items:center"><span>Nouvelle version disponible.</span><button class="btn primary" id="btnReload">Mettre à jour</button></div>';
  var s = bar.style;
  s.position='fixed'; s.left='50%'; s.transform='translateX(-50%)';
  s.bottom='calc(96px + env(safe-area-inset-bottom,0px))';
  s.background='rgba(10,15,20,.92)'; s.border='1px solid #22303b';
  s.padding='.5rem .7rem'; s.borderRadius='10px'; s.zIndex='130'; s.boxShadow='0 16px 32px rgba(0,0,0,.35)'; s.color='#e6edf5';
  document.body.appendChild(bar);

  var btn = document.getElementById('btnReload');
  if (btn && !btn.__wired){
    btn.__wired = 1;
    btn.addEventListener('click', function(){
      try{ btn.disabled = true; btn.textContent='Mise à jour…'; waitingSW && waitingSW.postMessage && waitingSW.postMessage('SKIP_WAITING'); }catch(_){}
    });
  }
  if (navigator.serviceWorker){
    var reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function(){
      if (reloading) return; reloading = true;
      setTimeout(function(){ location.reload(); }, 120);
    });
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('sw.js')
      .then(function(reg){
        if (reg.waiting) showUpdateBanner(reg.waiting);
        reg.addEventListener('updatefound', function () {
          var sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', function () {
            if (sw.state === 'installed' && reg.waiting) showUpdateBanner(reg.waiting);
          });
        });
      })
      .catch(function(err){ try{ console.warn(err); }catch(_){ } });
  });
}

/* Online/Offline toasts (idempotent) */
if (!window.__pt_net_toasts){
  window.__pt_net_toasts = true;
  window.addEventListener('online',  function(){ __pt_toast('Connexion rétablie', 'success'); });
  window.addEventListener('offline', function(){ __pt_toast('Vous êtes hors ligne', 'info'); });
}

/* =========================================================
   D) PT Utils + Self-test (facultatif) — ?selftest=1
========================================================= */
(function(){
  var PT = (window.PT = window.PT || {});

  PT.getSWVersion = PT.getSWVersion || function(timeoutMs){
    if (timeoutMs === void 0) timeoutMs = 1500;
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.getRegistration().then(function(reg){
      if (!reg || !navigator.serviceWorker.controller) return null;
      return new Promise(function(resolve){
        var t = setTimeout(function(){ resolve(null); }, timeoutMs);
        var onMsg = function(e){
          var d = e.data;
          if (d && d.type === 'VERSION') {
            clearTimeout(t);
            navigator.serviceWorker.removeEventListener('message', onMsg);
            resolve(d.version || null);
          }
        };
        navigator.serviceWorker.addEventListener('message', onMsg);
        try{ reg.active && reg.active.postMessage && reg.active.postMessage('GET_VERSION'); }catch(_){ clearTimeout(t); resolve(null); }
      });
    });
  };

  PT.clearCaches = PT.clearCaches || function(timeoutMs){
    if (timeoutMs === void 0) timeoutMs = 1500;
    if (!('serviceWorker' in navigator)) return Promise.resolve(false);
    return navigator.serviceWorker.getRegistration().then(function(reg){
      if (!reg || !navigator.serviceWorker.controller) return false;
      return new Promise(function(resolve){
        var t = setTimeout(function(){ resolve(false); }, timeoutMs);
        var onMsg = function(e){
          var d = e.data;
          if (d && d.type === 'CACHES_CLEARED') {
            clearTimeout(t);
            navigator.serviceWorker.removeEventListener('message', onMsg);
            __pt_toast('Caches vidés', 'success');
            resolve(true);
          }
        };
        navigator.serviceWorker.addEventListener('message', onMsg);
        try{ reg.active && reg.active.postMessage && reg.active.postMessage('CLEAR_CACHES'); }catch(_){ clearTimeout(t); resolve(false); }
      });
    });
  };

  function enabled(){
    try{ return new URL(location.href).searchParams.get('selftest') === '1'; }catch(_){ return false; }
  }
  function addStyleOnce(){
    if (document.getElementById('pt-selftest-css')) return;
    var s = document.createElement('style');
    s.id = 'pt-selftest-css';
    s.textContent = ''+
      '#ptSelfTest{position:fixed; right:12px; bottom: calc(12px + env(safe-area-inset-bottom,0px)); z-index:140;'+
      'background:rgba(10,15,20,.95); color:#e6edf5; border:1px solid #22303b; border-radius:12px; min-width:260px; max-width:360px;'+
      'box-shadow:0 16px 32px rgba(0,0,0,.4); font:600 14px/1.3 system-ui,-apple-system,Inter,Roboto,Arial,sans-serif}'+
      '#ptSelfTest .head{padding:.6rem .8rem; border-bottom:1px solid #22303b; display:flex; align-items:center; justify-content:space-between}'+
      '#ptSelfTest .list{max-height:50vh; overflow:auto; padding:.4rem .8rem}'+
      '#ptSelfTest .row{display:grid; grid-template-columns:18px 1fr; gap:.6rem; padding:.35rem 0; align-items:center}'+
      '#ptSelfTest .dot{width:10px; height:10px; border-radius:50%}.ok{background:#00e1b4}.warn{background:#ffb020}.ko{background:#ff6b6b}'+
      '#ptSelfTest .foot{padding:.5rem .8rem; border-top:1px solid #22303b; display:flex; gap:.5rem; justify-content:flex-end}'+
      '#ptSelfTest button{border:1px solid #22303b; background:rgba(255,255,255,.06); color:#e6edf5; padding:.35rem .6rem; border-radius:8px; cursor:pointer}';
    document.head.appendChild(s);
  }
  function panel(){
    addStyleOnce();
    var wrap = document.createElement('div');
    wrap.id = 'ptSelfTest';
    wrap.innerHTML =
      '<div class="head"><div>Auto-test Pirates Tools</div><button id="ptClose">✖</button></div>'+
      '<div class="list" id="ptList"></div>'+
      '<div class="foot"><button id="ptReload">Recharger</button><button id="ptClearCaches">Vider caches SW</button></div>';
    document.body.appendChild(wrap);
    var c = document.getElementById('ptClose'); if (c) c.addEventListener('click', function(){ wrap.remove(); });
    var r = document.getElementById('ptReload'); if (r) r.addEventListener('click', function(){ location.reload(); });
    var cc= document.getElementById('ptClearCaches'); if (cc) cc.addEventListener('click', function(){ PT.clearCaches(); });
    return { root: wrap, list: document.getElementById('ptList') };
  }
  function addRow(list, label, status){
    var row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = '<span class="dot '+status+'"></span><span>'+label+'</span>';
    list.appendChild(row);
  }
  function runSelfTest(){
    var p = panel(), list = p.list;
    addRow(list, 'Dock présent', document.getElementById('dock') ? 'ok' : 'ko');
    addRow(list, 'Toasts prêts', document.getElementById('toasts') ? 'ok' : 'warn');
    addRow(list, 'Zone live (a11y)', (document.getElementById('sr-live') || document.getElementById('srLive')) ? 'ok' : 'ko');
    addRow(list, 'products.json chargé', (window.MODELS && window.MODELS.length) ? 'ok' : 'warn');
    var viewsOk = ['view-home','view-catalogue','view-devis','view-produit','view-compte'].every(function(id){ return document.getElementById(id); });
    addRow(list, 'Vues présentes', viewsOk ? 'ok' : 'warn');
    try{
      if ('serviceWorker' in navigator){
        navigator.serviceWorker.getRegistration().then(function(reg){
          addRow(list, 'Service Worker enregistré', reg ? 'ok' : 'warn');
        });
      } else { addRow(list, 'Service Worker enregistré', 'warn'); }
    }catch(_){ addRow(list, 'Service Worker enregistré', 'warn'); }
    PT.getSWVersion().then(function(ver){ addRow(list, 'SW version' + (ver?(' ('+ver+')'):'') , ver ? 'ok' : 'warn'); });
    __pt_toast('Auto-test terminé', 'success');
  }
  if (enabled()) setTimeout(runSelfTest, 400);
  PT.selfTest = PT.selfTest || runSelfTest;
})();













