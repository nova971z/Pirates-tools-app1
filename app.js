/* =========================================================
   Pirates Tools — app.js (Partie 1/4)
   Boot SPA + Router + Vues + Hero + Grille Marques
   - ES5-safe (pas d'arrow, pas d'optional chaining)
   - Ne dépend d’aucune autre partie pour fonctionner
   - Dégrade proprement si products.json absent
========================================================= */
'use strict';

/* ------------ Helpers ES5 ------------ */
var $  = function(sel, root){ return (root||document).querySelector(sel); };
var $$ = function(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); };

function fallback(v, alt){ return (v===undefined||v===null) ? (alt||'') : v; }
function firstDefined(){ for (var i=0;i<arguments.length;i++){ if (arguments[i]!=null) return arguments[i]; } return undefined; }

function delegate(root, selector, type, handler){
  (root||document).addEventListener(type, function(e){
    var el = e.target && e.target.closest ? e.target.closest(selector) : null;
    if (el && (!root || (root.contains ? root.contains(el) : true))){ handler.call(el, e, el); }
  }, false);
}

/* Polyfills light */
(function(){
  if (!Element.prototype.matches){
    Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector || function(s){
      var m = (this.document || this.ownerDocument).querySelectorAll(s), i=m.length;
      while(--i>=0 && m.item(i)!==this){} return i>-1;
    };
  }
  if (!Element.prototype.closest){
    Element.prototype.closest = function(s){
      var el=this; while(el && el.nodeType===1){ if (el.matches && el.matches(s)) return el; el=el.parentElement||el.parentNode; }
      return null;
    };
  }
})();

/* ------------ Images sûres ------------ */
var IMG_FALLBACK = './images/pirates-tools-logo.png?v=7';
function sanitizeImgUrl(u){
  try{ var url=new URL(u, location.href); if (url.protocol==='http:') url.protocol='https:'; return url.toString(); }
  catch(_){ return IMG_FALLBACK; }
}
function setSafeImg(el, src, alt){
  if (!el) return;
  el.loading = el.loading || 'lazy';
  el.decoding = 'async';
  el.referrerPolicy = 'no-referrer';
  el.crossOrigin = 'anonymous';
  el.alt = alt || '';
  el.onerror = function(){ el.onerror=null; el.src = IMG_FALLBACK; };
  el.src = sanitizeImgUrl(src || IMG_FALLBACK);
}

/* ------------ Globals DOM ------------ */
var hero     = document.getElementById('hero');
var heroLogo = document.getElementById('heroLogo');
var dock     = document.getElementById('dock');
var dockCount= document.getElementById('dockCount');

var MODELS   = []; // produits (chargés plus bas)

/* ------------ Assure la structure de vues ------------ */
function ensureView(id, html){
  var v = document.getElementById(id);
  if (!v){
    v = document.createElement('section');
    v.id = id;
    v.className = 'view';
    v.innerHTML = html;
    document.body.appendChild(v);
  }
  return v;
}

/* Vues principales (créées si absentes) */
ensureView('view-home',
  '<div class="container">'+
    '<h1 style="margin:1rem 0 .5rem">Choisir une marque</h1>'+
    '<div id="brandGrid" class="brand-grid" role="list"></div>'+
  '</div>'
);

ensureView('view-catalogue',
  '<div class="container">'+
    '<h1 style="margin:1rem 0 .75rem">Catalogue</h1>'+
    '<div id="catList" class="cat-list" aria-live="polite"></div>'+
    '<div id="list" class="list" aria-live="polite"></div>'+
  '</div>'
);

ensureView('view-devis',
  '<div class="container">'+
    '<h1 style="margin:1rem 0 .75rem">Devis</h1>'+
    '<div id="devisList" class="list"></div>'+
    '<div class="actions">'+
      '<button id="devisSend"  class="btn primary">Envoyer sur WhatsApp</button>'+
      '<button id="devisClear" class="btn">Vider</button>'+
    '</div>'+
  '</div>'
);

ensureView('view-compte',
  '<div class="container">'+
    '<h1 style="margin:1rem 0 .75rem">Compte</h1>'+
    '<p id="accHello">Bienvenue. Gérer votre compte ou <a href="#/compte/creation">créer un compte</a>.</p>'+
    '<div id="accContent"></div>'+
  '</div>'
);

ensureView('view-create',
  '<div class="container">'+
    '<h1 style="margin:1rem 0 .75rem">Créer un compte</h1>'+
    '<div id="createContent">'+
      '<p>Formulaire à venir (Partie 4). En attendant, ce chemin est fonctionnel.</p>'+
    '</div>'+
  '</div>'
);

/* ------------ Dock: garantir l’enveloppe ------------ */
(function ensureDockShell(){
  var root = document.getElementById('dock');
  if (!root) return;
  root.classList.remove('hidden');
  if (root.firstElementChild && root.firstElementChild.classList && root.firstElementChild.classList.contains('dock__shell')) return;
  var shell = document.createElement('div'); shell.className='dock__shell';
  while(root.firstChild) shell.appendChild(root.firstChild);
  root.appendChild(shell);
})();

/* ------------ Hero: zoom + fondu (iOS/Android OK) ------------ */
(function heroEffect(){
  if (!hero || !heroLogo) return;

  var mq  = window.matchMedia('(max-width: 768px)');
  var mqr = window.matchMedia('(prefers-reduced-motion: reduce)');
  var easeOutCubic = function(t){ return 1 - Math.pow(1 - t, 3); };

  function getVH(){ return (window.visualViewport ? window.visualViewport.height : window.innerHeight) || 1; }
  function getScrollY(){
    return (typeof window.pageYOffset === 'number' ? window.pageYOffset : 0) ||
           (document.scrollingElement && document.scrollingElement.scrollTop) ||
           document.documentElement.scrollTop ||
           document.body.scrollTop || 0;
  }

  var vh = getVH(), prevY = -1, rafId = 0;

  function render(y){
    var fin = vh * (mq.matches ? 0.70 : 0.85);
    var raw = Math.max(0, Math.min(1, y / (fin || 1)));
    var p   = easeOutCubic(raw);

    var maxScale = mq.matches ? 3.1 : 2.0;
    var scale    = 1 + (maxScale - 1) * p;

    var tyPx     = (mq.matches ? 12 : 7) * (vh / 100) * p;
    var opacity  = Math.max(0, Math.min(1, 1 - (mq.matches ? 1.75 : 1.25) * raw));

    var t = 'translate3d(0,'+tyPx.toFixed(2)+'px,0) scale('+scale.toFixed(3)+')';
    heroLogo.style.transform = t;
    heroLogo.style.webkitTransform = t;
    heroLogo.style.opacity = opacity.toFixed(3);

    var gap = (1 - raw) * (mq.matches ? 18 : 22);
    document.documentElement.style.setProperty('--listGap', gap.toFixed(2)+'vh');

    var done = raw > 0.985;
    document.body.classList.toggle('after-hero', done);
    hero.classList.toggle('hero-out', done);

    if (dock){ if (raw > 0.97) dock.classList.add('dock--visible'); else dock.classList.remove('dock--visible'); }
  }

  function tick(){ var y = getScrollY(); if (y !== prevY){ render(y); prevY = y; } rafId = requestAnimationFrame(tick); }

  if (mqr.matches){
    var t0 = 'translate3d(0,0,0) scale(1)';
    heroLogo.style.transform = t0; heroLogo.style.webkitTransform = t0; heroLogo.style.opacity='1';
    document.documentElement.style.setProperty('--listGap', '18vh');
    document.body.classList.remove('after-hero'); hero.classList.remove('hero-out');
    if (dock) dock.classList.add('dock--visible');
    return;
  }

  rafId = requestAnimationFrame(tick);

  var recalc = function(){ vh = getVH(); render((typeof window.pageYOffset==='number')?window.pageYOffset:0); };
  window.addEventListener('resize', recalc, true);
  if (window.visualViewport && typeof window.visualViewport.addEventListener==='function'){
    window.visualViewport.addEventListener('resize', recalc, true);
  }
  window.addEventListener('orientationchange', recalc, true);
  document.addEventListener('visibilitychange', function(){ if (!document.hidden) recalc(); }, true);
  window.addEventListener('pageshow', function(e){ if (e.persisted) recalc(); }, true);
  window.addEventListener('pagehide', function(){ cancelAnimationFrame(rafId); }, true);

  render( (typeof window.pageYOffset==='number')?window.pageYOffset:0 );
})();

/* ------------ Marques (métadonnées + rendu) ------------ */
var BRAND_META = {
  dewalt:    { label:'DeWALT',    logo:'./images/brands/Logo.dewalt.png' },
  milwaukee: { label:'Milwaukee', logo:'./images/brands/Logo.milwaukee.png' },
  makita:    { label:'Makita',    logo:'./images/brands/Logo.makita.png' },
  festool:   { label:'Festool',   logo:'./images/brands/Logo.festool.png' },
  flex:      { label:'FLEX',      logo:'./images/brands/Logo.flex.png' },
  wera:      { label:'Wera',      logo:'./images/brands/Logo.wera.png' },
  stanley:   { label:'Stanley',   logo:'./images/brands/Logo.stanley.png' },
  facom:     { label:'Facom',     logo:'./images/brands/Logo.facom.png' }
};

function computeBrands(products){
  var counts = {};
  for (var i=0;i<(products||[]).length;i++){
    var p = products[i]; var k = (p && p.brand_key ? String(p.brand_key).toLowerCase() : '');
    if (!k || !BRAND_META[k]) continue; counts[k] = (counts[k]||0)+1;
  }
  var keys = Object.keys(counts).sort(function(a,b){ return BRAND_META[a].label.localeCompare(BRAND_META[b].label); });
  var out=[]; for (var j=0;j<keys.length;j++){ var key=keys[j], meta=BRAND_META[key]; out.push({key:key,label:meta.label,logo:meta.logo,count:counts[key]}); }
  return out;
}

function renderBrandGridFromProducts(products){
  var host = document.getElementById('brandGrid'); if (!host) return;
  var brands = computeBrands(products);
  if (!brands.length){ host.innerHTML = '<div class="card" style="padding:.8rem">Aucune marque disponible.</div>'; return; }

  var html = '';
  for (var i=0;i<brands.length;i++){
    var b = brands[i];
    html += ''+
      '<button class="brand" type="button" data-brand="'+b.key+'" aria-label="Voir '+b.label+'">'+
        '<span class="brand__bubble">'+
          '<img class="brand__logo" src="'+b.logo+'" alt="'+b.label+'" onerror="this.src=\'./images/pirates-tools-logo.png?v=7\'">'+
        '</span>'+
        '<span class="brand__label">'+b.label+'</span>'+
      '</button>';
  }
  host.innerHTML = html;
}

/* Navigation grille → route catalogue */
(function attachBrandGridHandlers(){
  var host = document.getElementById('brandGrid'); if (!host) return;

  host.addEventListener('pointerdown', function(e){
    var el = e.target && e.target.closest ? e.target.closest('.brand') : null;
    if (!el) return; el.style.transform='scale(0.98)'; setTimeout(function(){ el.style.transform=''; }, 180);
  });

  host.addEventListener('click', function(e){
    var btn = e.target && e.target.closest ? e.target.closest('[data-brand]') : null;
    if (!btn) return;
    var key = btn.getAttribute('data-brand') || '';
    if (!key) return;
    location.hash = '#/catalogue?brand=' + encodeURIComponent(key);
  });
})();

/* ------------ Chargement produits (mémoisé) ------------ */
function loadProducts(){
  if (window.__PT_PRODUCTS && window.__PT_PRODUCTS.length) return Promise.resolve(window.__PT_PRODUCTS);
  var fallbackList = window.PRODUCTS || window.products || [];
  if (fallbackList.length){ window.__PT_PRODUCTS = fallbackList; return Promise.resolve(fallbackList); }
  return fetch('./products.json', {cache:'no-store'}).then(function(res){ return res.json(); }).then(function(data){
    var arr = Array.isArray(data) ? data : (data && Array.isArray(data.products) ? data.products : []);
    window.__PT_PRODUCTS = arr; return arr;
  }).catch(function(){ window.__PT_PRODUCTS = []; return []; });
}

/* ------------ Router ------------ */
function parseHash(){
  var h = location.hash || '#/';
  var parts = h.split('?'); var path = parts[0]; var qs = parts[1]||'';
  var view = path.replace('#/','').split('/')[0] || '';
  var sub  = path.replace('#/','').split('/')[1] || '';
  var query = {};
  if (qs){ var kv = qs.split('&'); for (var i=0;i<kv.length;i++){ var s=kv[i].split('='); var k=decodeURIComponent(s[0]||''); var v=decodeURIComponent(s[1]||''); if (k) query[k]=v; } }
  return { view:view, sub:sub, query:query };
}

function showOnly(ids){
  var vs = $$('.view'); for (var i=0;i<vs.length;i++){ vs[i].classList.add('hidden'); }
  for (var j=0;j<ids.length;j++){ var el = document.getElementById(ids[j]); if (el) el.classList.remove('hidden'); }
}

function focusH1(id){
  var v = document.getElementById(id); if (!v) return;
  var h1 = v.querySelector('h1'); if (!h1) return;
  h1.setAttribute('tabindex','-1'); try{ h1.focus({preventScroll:true}); }catch(_){}
  setTimeout(function(){ h1.removeAttribute('tabindex'); }, 300);
}

function handleRoute(){
  var p = parseHash();
  // vues: home|catalogue|produit|devis|compte|compte/creation
  if (!p.view || p.view==='home' || p.view==='/'){ // Accueil
    showOnly(['view-home']); focusH1('view-home');
    loadProducts().then(renderBrandGridFromProducts);
    return;
  }

  if (p.view==='catalogue'){
    showOnly(['view-catalogue']); focusH1('view-catalogue');
    // la Partie 2 s'occupera de remplir #catList et #list selon brand/type/q
    // Ici on assure que la grille de marques est déjà rendue côté Accueil.
    return;
  }

  if (p.view==='produit'){ // PDP virtuelle (Partie 2 complètera)
    showOnly(['view-catalogue']); // PDP vit dans la page catalogue pour garder le header/layout
    // placeholder PDP minimal (non bloquant)
    var list = $('#list'); if (list){ list.innerHTML = '<div class="card" style="padding:1rem">Chargement du produit…</div>'; }
    return;
  }

  if (p.view==='devis'){ // Panier/Devis (Partie 3)
    showOnly(['view-devis']); focusH1('view-devis');
    return;
  }

  if (p.view==='compte'){
    if (p.sub==='creation'){ showOnly(['view-create']); focusH1('view-create'); return; }
    showOnly(['view-compte']); focusH1('view-compte');
    return;
  }

  // fallback → home
  location.hash = '#/'; // remet l'appli en état connu
}

/* Hash router */
window.addEventListener('hashchange', handleRoute, false);

/* ------------ Boot ------------ */
document.addEventListener('DOMContentLoaded', function(){
  // fallback logo(s) si cassés
  (function logoFallbacks(){
    function ensureFallback(img){
      if (!img) return;
      img.addEventListener('error', function(){
        if (!img.src || img.src.indexOf('pirates-tools-logo.png') === -1) img.src = IMG_FALLBACK;
      });
      if (img.complete && img.naturalWidth === 0) img.src = IMG_FALLBACK;
    }
    ensureFallback(document.getElementById('heroLogo'));
    $$('.topbar-logo').forEach(ensureFallback);
  })();

  // Première route
  handleRoute();

  // Pré-charger les produits pour que la grille soit prête
  loadProducts().then(function(arr){
    if (!location.hash || location.hash==='#/' || location.hash==='#/home'){
      renderBrandGridFromProducts(arr);
    }
  });
}, false);

/* Expose minimal API (utilisé par parties 2–4) */
window.PT = window.PT || {};
window.PT.loadProducts = loadProducts;
window.PT.renderBrandGridFromProducts = renderBrandGridFromProducts;
window.PT.handleRoute = handleRoute;




<!-- PARTIE 2 — À COLLER DANS app.js (bloc autonome, ES5-safe) -->
<script>
/* =========================================================
   PARTIE 2 — Catalogue + Produits + Panier + Devis (ES5-safe)
   - N'écrase pas les helpers existants (guards)
   - Gère #/catalogue, #/produit/:id, #/devis
   - Panier persistant + WhatsApp devis
========================================================= */

(function(){
  'use strict';

  /* ---------- Guards sur helpers attendus (fallbacks légers) ---------- */
  if (typeof window.fallback !== 'function'){
    window.fallback = function(v, alt){ return (v === void 0 || v === null) ? (alt || '') : v; };
  }
  if (typeof window.firstDefined !== 'function'){
    window.firstDefined = function(){ for (var i=0;i<arguments.length;i++){ var v=arguments[i]; if (v!==void 0 && v!==null) return v; } };
  }
  if (typeof window.toast !== 'function'){ window.toast = function(){}; }
  if (typeof window.announce !== 'function'){ window.announce = function(){}; }
  if (typeof window.notifyCartAdded !== 'function'){
    window.notifyCartAdded = function(title){ window.toast('« '+(title||'Article')+' » ajouté au devis','success'); };
  }
  if (typeof window.setSafeImg !== 'function'){
    window.setSafeImg = function(img, src, alt){ if (!img) return; img.alt = alt||''; img.onerror=function(){ img.src='./images/pirates-tools-logo.png?v=7'; }; img.src = src||'./images/pirates-tools-logo.png?v=7'; };
  }
  if (typeof window.parseHash !== 'function'){
    window.parseHash = function(){
      var h = location.hash || '#/';
      var parts = h.split('?');
      var path  = parts[0] || '#/';
      var query = {};
      if (parts[1]) {
        var kv = parts[1].split('&');
        for (var i=0;i<kv.length;i++){
          var s = kv[i].split('=');
          var k = decodeURIComponent(s[0]||'');
          var v = decodeURIComponent(s[1]||'');
          if (k) query[k] = v;
        }
      }
      return { path: path, view: path.replace('#/','').split('/')[0]||'', query: query, raw: h };
    };
  }
  if (typeof window.focusView !== 'function'){ window.focusView = function(){}; }

  /* ---------- Globals (compat) ---------- */
  var PHONE_E164 = window.PHONE_E164 || '+33774230195';
  var IMG_FALLBACK = window.IMG_FALLBACK || './images/pirates-tools-logo.png?v=7';
  var STORE_KEY = window.STORE_KEY || 'pt_cart_v1';

  window.MODELS = Array.isArray(window.MODELS) ? window.MODELS : [];
  window.CART   = Array.isArray(window.CART)   ? window.CART   : [];

  var listEl   = document.getElementById('list');
  var searchEl = document.getElementById('q');
  var tagEl    = document.getElementById('tag');
  var dock     = document.getElementById('dock');
  var dockCount= document.getElementById('dockCount');

  /* =========================================================
     A) PANIER — persistance + utilitaires
  ========================================================== */
  function updateDock(){
    var n = window.CART.length;
    if (dockCount){
      dockCount.textContent = n;
      dockCount.style.display = n ? '' : 'none';
    }
    if (dock){
      var cartBtn = document.getElementById('dockCartBtn') || (dock.querySelector ? dock.querySelector('.dock__btn--cart') : null);
      if (cartBtn){ cartBtn.style.animationPlayState = n ? 'running' : 'paused'; }
    }
  }

  function saveCart(){
    try { localStorage.setItem(STORE_KEY, JSON.stringify(window.CART)); } catch(_){}
    updateDock();
    var h = (location.hash||'').toLowerCase();
    if (h.indexOf('#/devis') === 0 && typeof renderCartView === 'function'){
      try{ renderCartView(); }catch(_){}
    }
    try{ window.dispatchEvent(new CustomEvent('pt:cartChanged')); }catch(_){}
  }

  function loadCart(){
    try{
      var raw = localStorage.getItem(STORE_KEY);
      window.CART = raw ? JSON.parse(raw) : [];
    }catch(_){ window.CART = []; }
    updateDock();
  }
  loadCart();

  function keyOf(p){
    var v = window.firstDefined(p && p.id, p && p.sku, p && p.title, '');
    return (v == null ? '' : String(v));
  }

  function groupCart(){
    var map = {};
    for (var i=0;i<window.CART.length;i++){
      var p = window.CART[i];
      var k = keyOf(p);
      if (!map[k]) map[k] = { item:p, qty:0 };
      map[k].qty += 1;
    }
    var out = [];
    for (var k in map) if (Object.prototype.hasOwnProperty.call(map, k)) out.push(map[k]);
    return out;
  }

  function addToCart(keyOrId, qty){
    qty = Math.max(1, Number(qty || 1));
    var p = findProductByKey(keyOrId);
    if (!p) return;
    for (var i=0;i<qty;i++) window.CART.push(p);
    saveCart();
    window.notifyCartAdded(p.title || p.sku || 'Article');
  }
  window.addToCart = window.addToCart || addToCart;

  function cartToWhatsAppText(){
    var grouped = groupCart();
    if (!grouped.length) return '';
    var lines = grouped.map(function(g){
      var item = g.item, qty = g.qty;
      var sku = item.sku || item.id || '';
      var title = (item.title || ((item.brand||'')+' '+(item.sku||''))).trim();
      return '• ' + sku + ' – ' + title + (qty>1 ? (' ×'+qty) : '');
    });
    var contact = '';
    try{
      var u = (typeof window.loadUser === 'function') ? window.loadUser() : null;
      var arr = [];
      if (u && u.name)  arr.push('Nom: ' + u.name);
      if (u && u.email) arr.push('Email: ' + u.email);
      contact = arr.length ? '\n\nMes coordonnées:\n' + arr.join('\n') : '';
    }catch(_){}
    var link = location.origin + location.pathname + '#/devis';
    return 'Bonjour, je souhaite un devis pour:\n' + lines.join('\n') + '\n\nLien: ' + link + contact + '\n\nMerci.';
  }

  /* =========================================================
     B) PRODUITS — rendu liste + PDP + JSON-LD
  ========================================================== */
  function absoluteUrl(u){ try{ return new URL(u, location.href).href; }catch(_){ return u; } }
  function schemaAvailability(p){
    var s = (p.stock_status||'').toLowerCase();
    if (s === 'in_stock')     return 'http://schema.org/InStock';
    if (s === 'low_stock')    return 'http://schema.org/LimitedAvailability';
    if (s === 'out_of_stock') return 'http://schema.org/OutOfStock';
    return (p.stock_qty > 0) ? 'http://schema.org/InStock' : 'http://schema.org/OutOfStock';
  }
  function buildProductJsonLD(p){
    var images = [];
    if (p.img) images.push(absoluteUrl(p.img));
    if (Array.isArray(p.gallery)) for (var i=0;i<p.gallery.length;i++) images.push(absoluteUrl(p.gallery[i]));
    var price = (typeof p.price === 'number') ? p.price :
                (typeof p.price_cents === 'number' ? p.price_cents/100 : undefined);
    var url = location.origin + location.pathname + '#/produit/' + encodeURIComponent(p.id || p.sku || (p.title || ''));
    var data = {
      "@context":"https://schema.org",
      "@type":"Product",
      "name": p.title || ((p.brand||'')+' '+(p.sku||'')),
      "sku":  p.sku || p.id || undefined,
      "mpn":  p.sku || undefined,
      "brand": p.brand ? { "@type":"Brand","name":p.brand } : undefined,
      "category": p.category || undefined,
      "description": (p.seo && p.seo.description) || p.desc || p.description || undefined,
      "image": images.length ? images : undefined,
      "url": url,
      "offers":{
        "@type":"Offer",
        "priceCurrency": p.currency || 'EUR',
        "price": price != null ? String(price) : undefined,
        "availability": schemaAvailability(p),
        "itemCondition": p.new ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
        "url": url
      }
    };
    if (typeof p.rating === 'number' && typeof p.reviews === 'number' && p.reviews > 0){
      data.aggregateRating = { "@type":"AggregateRating", "ratingValue": String(p.rating), "ratingCount": String(p.reviews) };
    }
    function prune(o){
      if (Array.isArray(o)){
        var a = []; for (var i=0;i<o.length;i++){ var pv = prune(o[i]); if (pv!=null) a.push(pv); }
        return a;
      }
      if (o && typeof o === 'object'){
        var r = {}; for (var k in o){ if (!Object.prototype.hasOwnProperty.call(o,k)) continue; var pv = prune(o[k]); if (pv!=null && !(Array.isArray(pv)&&!pv.length)) r[k]=pv; }
        return Object.keys(r).length ? r : null;
      }
      return (o===void 0 || o===null) ? null : o;
    }
    return prune(data);
  }
  function injectProductJsonLD(p){
    try{
      var id = 'jsonld-product';
      var old = document.getElementById(id); if (old) old.remove();
      var json = buildProductJsonLD(p); if (!json) return;
      var s = document.createElement('script');
      s.type = 'application/ld+json'; s.id = id; s.textContent = JSON.stringify(json);
      document.head.appendChild(s);
    }catch(_){}
  }
  function clearProductJsonLD(){
    var s = document.getElementById('jsonld-product'); if (s) s.remove();
  }

  function productToHTML(m){
    var title = window.fallback(m.title, (window.fallback(m.brand,'') + (m.brand?' ':'') + window.fallback(m.sku,''))).trim();
    var tag   = window.fallback(m.badge, (Array.isArray(m.tags)&&m.tags[0]) || window.fallback(m.tag,'')).trim();
    var desc  = window.fallback(m.desc, window.fallback(m.description,''));
    var id    = String(window.fallback(m.id, window.fallback(m.sku, title)));

    var currency   = (m && m.currency) ? m.currency : 'EUR';
    var priceCents = (m && typeof m.price_cents === 'number' && isFinite(m.price_cents))
      ? Math.round(m.price_cents)
      : (m && typeof m.price === 'number' && isFinite(m.price)) ? Math.round(m.price*100) : null;
    var priceHtml = '';
    if (priceCents != null){
      var priceText = '';
      try{ priceText = (priceCents/100).toLocaleString('fr-FR',{style:'currency',currency:currency}); }
      catch(_){ priceText = (priceCents/100).toFixed(2)+' '+currency; }
      priceHtml = '<div class="price" aria-label="Prix" style="margin-top:.35rem;font-weight:700">'+priceText+'</div>';
    }

    return ''
      + '<article class="card" data-tool data-id="'+id+'" data-tag="'+tag+'">'
      + '  <div class="head"><h3 class="title">'+title+'</h3>'+(tag?'<span class="badge">'+tag+'</span>':'')+'</div>'
      + '  <div class="specs"><p style="margin:0">'+(desc||'—')+'</p>'+priceHtml+'</div>'
      + '  <div class="actions">'
      + '    <a class="btn" href="#/produit/'+encodeURIComponent(id)+'">Détails</a>'
      + '    <button class="btn primary" data-add="'+id+'">Ajouter au panier</button>'
      + '  </div>'
      + '</article>';
  }

  function bindAddToCart(scopeData){
    var root = document.getElementById('list');
    if (!root) return;
    var btns = root.querySelectorAll ? root.querySelectorAll('[data-add]') : [];
    for (var i=0;i<btns.length;i++){
      (function(btn){
        btn.addEventListener('click', function(e){
          e.stopPropagation();
          var id = btn.getAttribute('data-add');
          var p = null;
          for (var j=0;j<scopeData.length;j++){
            var x = scopeData[j];
            if ((x.id && String(x.id)===id) || (x.sku && String(x.sku)===id) || (x.title===id)){ p = x; break; }
          }
          if (!p) return;
          window.CART.push(p);
          saveCart();
          window.notifyCartAdded(p.title || p.sku || 'Article');
        }, false);
      })(btns[i]);
    }
  }

  function findProductByKey(key){
    if (!key) return null;
    var k = String(key).toLowerCase();
    for (var i=0;i<window.MODELS.length;i++){
      var m = window.MODELS[i];
      var id  = String(m && m.id  != null ? m.id  : '').toLowerCase();
      var sku = String(m && m.sku != null ? m.sku : '').toLowerCase();
      var ttl = String(m && m.title!= null ? m.title: '').toLowerCase();
      if (id===k || sku===k || ttl===k) return m;
    }
    return null;
  }

  function renderList(data){
    var root = document.getElementById('list');
    if (!root) return;
    data = Array.isArray(data) ? data : [];
    root.innerHTML = data.map(productToHTML).join('\n');

    // cartes cliquables → PDP
    var cards = root.querySelectorAll ? root.querySelectorAll('.card[data-id]') : [];
    for (var i=0;i<cards.length;i++){
      (function(card){
        card.addEventListener('click', function(e){
          if (e.target && e.target.closest && e.target.closest('[data-add]')) return;
          var id = card.getAttribute('data-id'); if (!id) return;
          location.hash = '#/produit/' + encodeURIComponent(id);
        }, false);
      })(cards[i]);
    }

    bindAddToCart(data);
  }

  function renderPDP(product){
    var view = document.getElementById('view-produit');
    if (!view){
      view = document.createElement('section');
      view.id = 'view-produit'; view.className = 'view';
      view.innerHTML = ''
        + '<div class="container pdp" id="pdp">'
        + '  <button class="chip chip--back" onclick="history.back()">← Retour</button>'
        + '  <div class="pdp__grid">'
        + '    <div class="pdp__media"><img id="pdpImg" alt=""></div>'
        + '    <div class="pdp__info">'
        + '      <h1 class="pdp__title" id="pdpTitle" tabindex="-1"></h1>'
        + '      <div class="pdp__tag" id="pdpTag"></div>'
        + '      <p class="pdp__desc" id="pdpDesc"></p>'
        + '      <ul class="pdp__specs" id="pdpSpecs"></ul>'
        + '      <div class="actions">'
        + '        <button class="btn primary" id="pdpQuote">Ajouter au panier</button>'
        + '        <a class="btn btn-wa" id="pdpWa" target="_blank" rel="noopener">WhatsApp</a>'
        + '        <button class="btn" id="pdpShare">Partager</button>'
        + '      </div>'
        + '    </div>'
        + '  </div>'
        + '  <div class="pdp__related" id="pdpRelated"></div>'
        + '</div>';
      document.body.appendChild(view);
    }

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
    if (elImg){ window.setSafeImg(elImg, img, product.images_alt || title || ''); }

    // prix (si présent)
    var currency   = product && product.currency ? product.currency : 'EUR';
    var priceCents = (product && typeof product.price_cents === 'number' && isFinite(product.price_cents))
      ? Math.round(product.price_cents)
      : (product && typeof product.price === 'number' && isFinite(product.price)) ? Math.round(product.price*100) : null;

    var priceEl = document.getElementById('pdpPrice');
    if (!priceEl){
      priceEl = document.createElement('p');
      priceEl.id = 'pdpPrice';
      priceEl.className = 'pdp__price';
      priceEl.style.margin = '.35rem 0';
      priceEl.style.fontWeight = '700';
      if (elDesc && elDesc.parentNode){ elDesc.parentNode.insertBefore(priceEl, elDesc.nextSibling); }
    }
    if (priceCents != null){
      try{ priceEl.textContent = (priceCents/100).toLocaleString('fr-FR',{style:'currency',currency:currency}); }
      catch(_){ priceEl.textContent = (priceCents/100).toFixed(2)+' '+currency; }
    } else { priceEl.textContent = ''; }

    // specs
    var features = Array.isArray(product.features) ? product.features : (Array.isArray(product.specs) ? product.specs : []);
    var featHtml = features.length ? features.map(function(s){ return '<li>'+s+'</li>'; }).join('') : '';
    var merged = {};
    var kvFromJson = (product.specs_kv && typeof product.specs_kv==='object') ? product.specs_kv : null;
    var kvDerived = {
      'Plateforme': product.platform || void 0,
      'Moteur': product.motor || void 0,
      'Couple max': (product.torque_nm!=null) ? (product.torque_nm+' Nm') : void 0,
      'Vitesses': product.rpm || void 0,
      'Cadence de chocs': product.ipm || void 0,
      'Mandrin': product.chuck || void 0,
      'Longueur': (product.length_mm!=null) ? (product.length_mm+' mm') : void 0,
      'Poids': (product.weight_kg!=null) ? (product.weight_kg+' kg') : void 0,
      'Garantie': (product.warranty_months!=null) ? (product.warranty_months+' mois') : void 0
    };
    if (kvFromJson) for (var k1 in kvFromJson){ if (kvFromJson[k1]!=null && kvFromJson[k1]!=='') merged[k1]=kvFromJson[k1]; }
    for (var k2 in kvDerived){ var v = kvDerived[k2]; if (v!=null && v!=='') merged[k2]=v; }

    var tableHtml = '';
    if (Object.keys(merged).length){
      var rows = Object.keys(merged).map(function(k){ return '<tr><th>'+k+'</th><td>'+merged[k]+'</td></tr>'; }).join('');
      tableHtml = ''
        + '<li style="list-style:none; padding:0; margin:.6rem 0 0">'
        + '  <div class="badge" style="margin:0 0 .4rem; display:inline-flex; align-items:center; gap:.4rem">⚙️ Caractéristiques techniques</div>'
        + '  <div style="overflow:auto"><table style="width:100%; border-collapse:collapse; font-size:.95rem"><tbody>'+rows+'</tbody></table></div>'
        + '</li>';
    }
    if (elSpecs) elSpecs.innerHTML = (featHtml || tableHtml) ? (featHtml + tableHtml) : '';

    if (btnQ){
      btnQ.textContent = 'Ajouter au panier';
      btnQ.onclick = function(){
        window.CART.push(product);
        saveCart();
        window.notifyCartAdded(product.title || product.sku || 'Article');
      };
    }
    var sku = product.sku || product.id || title;
    var productLink = location.origin + location.pathname + '#/produit/' + encodeURIComponent(product.id || product.sku || title);
    var contactSuffix = '';
    try{
      var u = (typeof window.loadUser === 'function') ? window.loadUser() : null;
      var arr = []; if (u && u.name) arr.push('Nom: '+u.name); if (u && u.email) arr.push('Email: '+u.email);
      contactSuffix = arr.length ? '\n\nMes coordonnées:\n' + arr.join('\n') : '';
    }catch(_){}
    var textPDP = 'Bonjour, je souhaite un devis pour:\n• ' + sku + ' – ' + title + '\n\nLien: ' + productLink + contactSuffix + '\n\nMerci.';
    var phone = PHONE_E164.replace('+','');
    if (btnWa) btnWa.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(textPDP);

    if (btnShare){
      btnShare.onclick = function(){
        (function(){
          try{
            var shareData = { title: title+' • Pirates Tools', text: title, url: productLink };
            if (navigator.share){ navigator.share(shareData); }
            else if (navigator.clipboard && navigator.clipboard.writeText){
              navigator.clipboard.writeText(productLink);
              window.toast('Lien copié dans le presse-papiers','success');
            }
          }catch(_){}
        })();
      };
    }

    // suggestions
    var related = window.MODELS.filter(function(m){
      return (m!==product) && (
        (product.category && m.category===product.category) ||
        (tag && ((m.badge===tag) || (Array.isArray(m.tags) && m.tags.indexOf(tag)!==-1)))
      );
    }).slice(0,3);

    if (elRel){
      var relHTML = '';
      for (var i=0;i<related.length;i++){
        var m = related[i];
        relHTML += ''
          + '<article class="card" data-id="'+(m.id || m.sku || m.title)+'">'
          + '  <div class="head"><h3 class="title">'+(m.title || (m.brand||'')+' '+(m.sku||''))+'</h3>' + ((m.badge||'')?'<span class="badge">'+m.badge+'</span>':'') + '</div>'
          + '  <div class="specs"><p style="margin:0">'+(m.desc || m.description || '')+'</p></div>'
          + '  <div class="actions"><button class="btn primary" data-add="'+(m.id || m.sku || m.title)+'">Ajouter au panier</button></div>'
          + '</article>';
      }
      elRel.innerHTML = relHTML;

      elRel.addEventListener('click', function(e){
        var btn = e.target && e.target.closest ? e.target.closest('[data-add]') : null;
        if (!btn) return;
        var id = btn.getAttribute('data-add');
        var p  = null;
        for (var z=0;z<window.MODELS.length;z++){ var x=window.MODELS[z]; if (((x.id||x.sku||x.title)+'')===id){ p=x; break; } }
        if (p){
          window.CART.push(p); saveCart(); window.notifyCartAdded(p.title || p.sku || 'Article');
        }
        e.stopPropagation();
      }, false);
    }

    injectProductJsonLD(product);
  }

  /* =========================================================
     C) CATALOGUE — catégories auto + rendu
  ========================================================== */
  function buildCategories(){
    var map = new Map();
    for (var i=0;i<window.MODELS.length;i++){
      var m = window.MODELS[i];
      var raw = (m.category || m.badge || m.brand || '').toString().trim();
      if (!raw) continue;
      var key = raw.toLowerCase();
      var prev = map.get(key);
      map.set(key, { key:key, label:raw, count:(prev ? prev.count : 0) + 1 });
    }
    return Array.from(map.values()).sort(function(a,b){ return b.count - a.count; });
  }

  function findSelectMatch(select, keyLower){
    if (!select) return null;
    var opts = Array.prototype.slice.call(select.options || []);
    for (var i=0;i<opts.length;i++){
      var o = opts[i]; var val = (o.value||o.textContent||'').toLowerCase();
      if (val === keyLower) return (o.value || o.textContent);
    }
    return null;
  }

  function renderCatalogue(){
    var root = document.getElementById('catList');
    if (!root) return;

    var cats = buildCategories();
    root.innerHTML = cats.length
      ? cats.map(function(c){
          return ''
            + '<article class="card cat-card" data-cat="'+c.key+'">'
            + '  <div class="head"><h3 class="title">'+c.label+'</h3><span class="badge">Catégorie</span></div>'
            + '  <div class="specs"><p style="margin:0">'+c.count+' produit'+(c.count>1?'s':'')+'</p></div>'
            + '  <div class="actions"><button class="btn primary" data-cat-go="'+c.key+'">Voir</button></div>'
            + '</article>';
        }).join('')
      : '<div class="card"><div class="specs"><p style="margin:0">Aucune catégorie détectée.</p></div></div>';

    function go(keyLower){
      var matchVal = findSelectMatch(tagEl, keyLower);
      if (tagEl){ tagEl.value = matchVal || ''; }
      if (searchEl){ searchEl.value = matchVal ? '' : keyLower; }
      if (typeof window.applyFilters === 'function') window.applyFilters();
      location.hash = '#/catalogue';
      setTimeout(function(){
        var listNode = document.getElementById('list');
        if (listNode && listNode.scrollIntoView) listNode.scrollIntoView({behavior:'smooth', block:'start'});
      }, 80);
    }

    root.addEventListener('click', function(e){
      var btn  = e.target && e.target.closest ? e.target.closest('[data-cat-go]') : null;
      var card = e.target && e.target.closest ? e.target.closest('.cat-card')    : null;
      if (btn) return go(btn.getAttribute('data-cat-go'));
      if (card) return go(card.getAttribute('data-cat'));
    }, false);
  }

  /* =========================================================
     D) PRODUITS — chargement + filtres
  ========================================================== */
  function ensureProductsLoaded(cb){
    function done(){ try{ cb(window.MODELS); }catch(_){ } }
    if (Array.isArray(window.MODELS) && window.MODELS.length){ return done(); }
    if (typeof window.loadProducts === 'function'){
      // utiliser le loader déjà défini (Partie 1)
      Promise.resolve(window.loadProducts()).then(function(){ done(); }).catch(function(){ done(); });
      return;
    }
    // loader minimal si absent
    fetch('./products.json', { cache:'no-store' })
      .then(function(r){ return r.json(); })
      .then(function(json){ window.MODELS = Array.isArray(json) ? json : (json.products || []); done(); })
      .catch(function(){ window.MODELS = []; done(); });
  }

  // debounce safe ES5
  function debounce(fn, wait){
    wait = (wait==null) ? 140 : wait;
    var t = 0;
    return function(){ var args = arguments; clearTimeout(t); t = setTimeout(function(){ fn.apply(null, args); }, wait); };
  }

  window.applyFilters = window.applyFilters || debounce(function(){
    var q = ((searchEl && searchEl.value) || '').trim().toLowerCase();
    var t = ((tagEl && tagEl.value)    || '').trim().toLowerCase();

    var filtered = window.MODELS.filter(function(m){
      var hay = [
        window.fallback(m.title,''), window.fallback(m.sku,''), window.fallback(m.brand,''),
        window.fallback(m.category,''), window.fallback(m.desc, window.fallback(m.description,'')),
        (Array.isArray(m.tags) ? m.tags.join(' ') : ''), window.fallback(m.badge,'')
      ].join(' ').toLowerCase();
      var okQ = !q || hay.indexOf(q) !== -1;
      var okT = !t || hay.indexOf(t) !== -1;
      return okQ && okT;
    });

    renderList(filtered);
  }, 120);

  if (searchEl) searchEl.addEventListener('input', window.applyFilters, true);
  if (tagEl)    tagEl.addEventListener('change', window.applyFilters, true);

  /* =========================================================
     E) DEVIS — vue minimale (WhatsApp) + hooks
  ========================================================== */
  function renderCartView(){
    var wrap = document.getElementById('devisList');
    if (!wrap) return;
    var grouped = groupCart();
    if (!grouped.length){
      wrap.innerHTML = '<p style="margin:0">Aucun article pour le moment.</p>';
    }else{
      wrap.innerHTML = grouped.map(function(g){
        var item = g.item||{}; var qty = Number(g.qty||0);
        var sku  = item.sku || item.id || '';
        var title= item.title || ((item.brand||'')+' '+(item.sku||'')).trim();
        var key  = keyOf(item);
        return ''
        + '<div class="card">'
        + '  <div class="head"><h3 class="title">'+title+'</h3><span class="badge">'+sku+'</span></div>'
        + '  <div class="specs" style="display:flex;gap:.6rem;align-items:center">'
        + '    <button class="btn" data-dec="'+key+'" aria-label="Diminuer">−</button>'
        + '    <strong>'+qty+'</strong>'
        + '    <button class="btn" data-inc="'+key+'" aria-label="Augmenter">+</button>'
        + '    <button class="btn" data-del="'+key+'" style="margin-left:auto;background:rgba(255,255,255,.06);color:#d9e3ec" aria-label="Supprimer">Supprimer</button>'
        + '  </div>'
        + '</div>';
      }).join('');
    }

    if (!wrap.__wired){
      wrap.__wired = 1;
      // + / - / supprimer
      wrap.addEventListener('click', function(e){
        var inc = e.target && e.target.closest ? e.target.closest('[data-inc]') : null;
        var dec = e.target && e.target.closest ? e.target.closest('[data-dec]') : null;
        var del = e.target && e.target.closest ? e.target.closest('[data-del]') : null;
        if (inc){
          var k = inc.getAttribute('data-inc');
          var p = null; for (var i=0;i<window.MODELS.length;i++){ if (keyOf(window.MODELS[i])===k){ p=window.MODELS[i]; break; } }
          if (p) window.CART.push(p);
          saveCart(); renderCartView(); return;
        }
        if (dec){
          var k2 = dec.getAttribute('data-dec');
          var idx = -1; for (var j=0;j<window.CART.length;j++){ if (keyOf(window.CART[j])===k2){ idx=j; break; } }
          if (idx>=0) window.CART.splice(idx,1);
          saveCart(); renderCartView(); return;
        }
        if (del){
          var k3 = del.getAttribute('data-del');
          for (var m=window.CART.length-1;m>=0;m--) if (keyOf(window.CART[m])===k3) window.CART.splice(m,1);
          saveCart(); renderCartView(); return;
        }
      }, false);
    }

    // CTA WhatsApp + vider (si présents)
    var sendBtn = document.getElementById('devisSend');
    if (sendBtn && !sendBtn.__wired){
      sendBtn.__wired = 1;
      sendBtn.addEventListener('click', function(){
        var msg = encodeURIComponent(cartToWhatsAppText());
        if (!msg) return;
        window.open('https://wa.me/' + PHONE_E164.replace('+','') + '?text=' + msg, '_blank', 'noopener');
        window.toast('Devis ouvert dans WhatsApp', 'success'); window.announce('Devis ouvert dans WhatsApp');
      }, false);
    }
    var clearBtn = document.getElementById('devisClear');
    if (clearBtn && !clearBtn.__wired){
      clearBtn.__wired = 1;
      clearBtn.addEventListener('click', function(){
        window.CART = []; saveCart(); renderCartView();
        window.toast('Devis vidé','success'); window.announce('Devis vidé');
      }, false);
    }
  }
  window.renderCartView = window.renderCartView || renderCartView;

  /* =========================================================
     F) ROUTER — #/catalogue, #/produit/:id, #/devis
  ========================================================== */
  function showViewSafely(key){
    // si une fonction showView globale existe (Partie 1), on l’utilise
    if (typeof window.showView === 'function'){ try{ window.showView(key); return; }catch(_){ } }
    // fallback simple: afficher la section demandée si présente
    var ids = ['view-home','view-catalogue','view-produit','view-devis','view-compte'];
    for (var i=0;i<ids.length;i++){
      var el = document.getElementById(ids[i]);
      if (el) el.classList.add('hidden');
    }
    var want = document.getElementById('view-'+key);
    if (want) want.classList.remove('hidden');
  }

  function route(){
    var parsed = window.parseHash();
    var view = parsed.view;
    var segs = parsed.path.split('/').slice(2); // après "#/"

    if (!view || view === 'home'){
      // rien à faire ici dans la Partie 2
      return;
    }

    if (view === 'catalogue'){
      showViewSafely('catalogue');
      ensureProductsLoaded(function(){
        // si pas de liste, créer un conteneur minimal
        if (!document.getElementById('list')){
          var cont = document.getElementById('view-catalogue') || (function(){
            var s = document.createElement('section'); s.id='view-catalogue'; s.className='view';
            s.innerHTML = '<div class="container"><h1>Catalogue</h1><div id="catList" class="cat-list" style="margin-bottom:1rem"></div><div id="list" class="list"></div></div>';
            document.body.appendChild(s); return s;
          })();
          var l = cont.querySelector('#list'); if (!l){ var d=document.createElement('div'); d.id='list'; d.className='list'; cont.appendChild(d); }
        }
        renderCatalogue();
        renderList(window.MODELS);
        window.focusView('catalogue');
      });
      return;
    }

    if (view === 'produit'){
      showViewSafely('produit');
      var key = decodeURIComponent(segs[0] || '');
      ensureProductsLoaded(function(){
        var p = findProductByKey(key);
        if (!p && window.MODELS.length){ // fallback: id direct si c'est un index
          for (var i=0;i<window.MODELS.length;i++){
            var m = window.MODELS[i];
            if ((m.id||m.sku||m.title)==key){ p=m; break; }
          }
        }
        if (!p){
          // message minimal
          var host = document.getElementById('view-produit');
          if (host){ host.innerHTML = '<div class="container"><p>Produit introuvable.</p></div>'; }
          return;
        }
        renderPDP(p);
        window.focusView('produit');
      });
      return;
    }

    if (view === 'devis'){
      showViewSafely('devis');
      // créer une vue devis minimale si absente
      var v = document.getElementById('view-devis');
      if (!v){
        v = document.createElement('section'); v.id='view-devis'; v.className='view';
        v.innerHTML = ''
          + '<div class="container">'
          + '  <h1 tabindex="-1">Devis</h1>'
          + '  <div class="card">'
          + '    <div class="specs" id="devisList"></div>'
          + '    <div class="actions">'
          + '      <button class="btn" id="devisClear">Vider</button>'
          + '      <button class="btn primary" id="devisSend">Envoyer sur WhatsApp</button>'
          + '    </div>'
          + '  </div>'
          + '</div>';
        document.body.appendChild(v);
      }
      renderCartView();
      window.focusView('devis');
      return;
    }
  }

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', function(){
    ensureProductsLoaded(function(models){
      // si on arrive direct sur /catalogue sans DOM prêt
      if ((location.hash||'').indexOf('#/catalogue')===0){
        if (!document.getElementById('list')){
          var s = document.getElementById('view-catalogue');
          if (!s){
            s = document.createElement('section'); s.id='view-catalogue'; s.className='view';
            s.innerHTML = '<div class="container"><h1>Catalogue</h1><div id="catList" class="cat-list" style="margin-bottom:1rem"></div><div id="list" class="list"></div></div>';
            document.body.appendChild(s);
          }
        }
        renderCatalogue();
        renderList(models);
      }
      route();
    });
  });

  // actions dock → devis (si présent)
  var dockCartBtn = document.getElementById('dockCartBtn');
  if (dockCartBtn) dockCartBtn.addEventListener('click', function(){ location.hash = '#/devis'; }, false);
  if (dockCount)   dockCount.addEventListener('click',   function(){ location.hash = '#/devis'; }, false);

})();
</script>


<!-- PARTIE 3 — À COLLER DANS app.js (bloc autonome, ES5-safe) -->
<script>
/* =========================================================
   PARTIE 3 — Compte + Création de compte (local) + Fidélité
   - Route: #/compte
   - Persistance locale: USER_KEY (default: 'pt_user_v1')
   - Expose window.loadUser / window.saveUser
   - Intégration avec Devis/WhatsApp (cartToWhatsAppText lit loadUser)
   - ES5-safe, n'écrase pas les fonctions existantes
========================================================= */
(function(){
  'use strict';

  /* ---------- Guards/compat ---------- */
  var USER_KEY = window.USER_KEY || 'pt_user_v1';
  var PHONE_E164 = window.PHONE_E164 || '+33774230195';

  if (typeof window.toast    !== 'function') window.toast    = function(){};
  if (typeof window.announce !== 'function') window.announce = function(){};
  if (typeof window.parseHash!== 'function') {
    window.parseHash = function(){
      var h = location.hash || '#/';
      var parts = h.split('?');
      var path  = parts[0] || '#/';
      var query = {};
      if (parts[1]) {
        var kv = parts[1].split('&');
        for (var i=0;i<kv.length;i++){
          var s = kv[i].split('=');
          var k = decodeURIComponent(s[0]||'');
          var v = decodeURIComponent(s[1]||'');
          if (k) query[k] = v;
        }
      }
      return { path: path, view: path.replace('#/','').split('/')[0]||'', query: query, raw: h };
    };
  }
  if (typeof window.showView !== 'function') {
    window.showView = function(key){
      var ids = ['view-home','view-catalogue','view-produit','view-devis','view-compte'];
      for (var i=0;i<ids.length;i++){
        var el = document.getElementById(ids[i]); if (el) el.classList.add('hidden');
      }
      var want = document.getElementById('view-'+key);
      if (want) want.classList.remove('hidden');
    };
  }
  if (typeof window.focusView !== 'function') window.focusView = function(){};

  /* =========================================================
     A) Modèle utilisateur (chargement / sauvegarde)
  ========================================================== */
  function defaultUser(){
    return {
      name:   '',
      email:  '',
      phone:  '',
      addr:   '',
      points: 0,      // fidélité (0..1000+)
      tier:   'Bronze',
      newsletter: false
    };
  }

  function computeTier(points){
    points = +points || 0;
    if (points >= 600) return 'Gold';
    if (points >= 250) return 'Silver';
    return 'Bronze';
  }

  function loadUser(){
    try{
      var raw = localStorage.getItem(USER_KEY);
      var u = raw ? JSON.parse(raw) : defaultUser();
      if (!u || typeof u !== 'object') u = defaultUser();
      if (typeof u.points !== 'number') u.points = 0;
      u.tier = computeTier(u.points);
      return u;
    }catch(_){
      return defaultUser();
    }
  }
  function saveUser(u){
    try{
      if (!u || typeof u !== 'object') return;
      u.points = Math.max(0, Math.round(+u.points||0));
      u.tier   = computeTier(u.points);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      try{ window.dispatchEvent(new CustomEvent('pt:userChanged', { detail:u })); }catch(_){}
      window.toast('Compte enregistré', 'success');
      window.announce('Compte enregistré');
    }catch(_){}
  }

  // expose global pour intégration (devis/whatsapp…)
  if (typeof window.loadUser !== 'function') window.loadUser = loadUser;
  if (typeof window.saveUser !== 'function') window.saveUser = saveUser;

  /* =========================================================
     B) Vue & UI (création si absente)
  ========================================================== */
  function ensureAccountView(){
    var view = document.getElementById('view-compte');
    if (view) return view;

    view = document.createElement('section');
    view.id = 'view-compte';
    view.className = 'view hidden';
    view.innerHTML =
      '<div class="container">'+
        '<h1 tabindex="-1">Mon compte</h1>'+

        '<div class="card">'+
          '<div class="head"><h3 class="title">Informations</h3><span class="badge">Profil</span></div>'+
          '<div class="specs" style="display:grid;gap:.6rem">'+
            '<label>Nom / Prénom<br><input id="accName" class="search" type="text" placeholder="Ex: Alex Pirate"></label>'+
            '<label>Email<br><input id="accEmail" class="search" type="email" inputmode="email" placeholder="exemple@mail.com"></label>'+
            '<label>Téléphone<br><input id="accPhone" class="search" type="tel" inputmode="tel" placeholder="+33 6…"></label>'+
            '<label>Adresse<br><textarea id="accAddr" class="search" rows="2" placeholder="Adresse postale"></textarea></label>'+
            '<label style="display:flex;align-items:center;gap:.5rem"><input id="accNews" type="checkbox"> S’abonner aux nouveautés</label>'+
          '</div>'+
          '<div class="actions">'+
            '<button class="btn primary" id="accSave">Enregistrer</button>'+
            '<button class="btn" id="accClear">Se déconnecter / Réinitialiser</button>'+
          '</div>'+
        '</div>'+

        '<div class="card">'+
          '<div class="head"><h3 class="title">Fidélité</h3><span class="badge">Avantages</span></div>'+
          '<div class="specs">'+
            '<div class="meter">'+
              '<div class="meter__rail"><div id="accFill" class="meter__fill"></div><div id="accCursor" class="meter__cursor" style="left:0%"></div></div>'+
              '<input id="accSlider" type="range" min="0" max="1000" step="10" value="0">'+
              '<div class="meter__scale"><span id="accTier">Bronze</span><span><strong id="accPoints">0</strong> pts</span></div>'+
            '</div>'+
          '</div>'+
          '<div class="actions">'+
            '<button class="btn" id="accToDevis">Voir mon devis</button>'+
            '<a class="btn btn-wa" id="accWA" target="_blank" rel="noopener">WhatsApp</a>'+
          '</div>'+
        '</div>'+

      '</div>';
    document.body.appendChild(view);
    return view;
  }

  /* =========================================================
     C) Binding + logique UI
  ========================================================== */
  function validateEmail(s){
    s = String(s||'').trim();
    return !!(s && s.indexOf('@')>0 && s.indexOf('.')>0);
  }

  function updateLoyaltyUI(u){
    var fill   = document.getElementById('accFill');
    var cursor = document.getElementById('accCursor');
    var slider = document.getElementById('accSlider');
    var tierEl = document.getElementById('accTier');
    var ptsEl  = document.getElementById('accPoints');

    var pts = Math.max(0, Math.round(+u.points||0));
    var max = +(slider && slider.max ? slider.max : 1000);
    var pct = Math.max(0, Math.min(100, (pts / (max||1))*100));

    if (fill)   fill.style.width = pct.toFixed(2)+'%';
    if (cursor) cursor.style.left = pct.toFixed(2)+'%';
    if (slider) slider.value = pts;
    if (tierEl) tierEl.textContent = computeTier(pts);
    if (ptsEl)  ptsEl.textContent  = String(pts);
  }

  function populateAccountForm(u){
    var name  = document.getElementById('accName');
    var email = document.getElementById('accEmail');
    var phone = document.getElementById('accPhone');
    var addr  = document.getElementById('accAddr');
    var news  = document.getElementById('accNews');

    if (name)  name.value  = u.name  || '';
    if (email) email.value = u.email || '';
    if (phone) phone.value = u.phone || '';
    if (addr)  addr.value  = u.addr  || '';
    if (news)  news.checked= !!u.newsletter;

    updateLoyaltyUI(u);

    // Met à jour le lien WhatsApp profil (avec infos)
    var wa = document.getElementById('accWA');
    if (wa){
      var base = 'Bonjour, voici mes coordonnées:'
        + '\n• Nom: '   + (u.name  || '')
        + '\n• Email: ' + (u.email || '')
        + '\n• Tel: '   + (u.phone || '')
        + (u.addr ? '\n• Adresse: '+u.addr : '')
        + '\n\nMerci.';
      wa.href = 'https://wa.me/' + PHONE_E164.replace('+','') + '?text=' + encodeURIComponent(base);
    }
  }

  function grabUserFromForm(){
    var u = loadUser(); // base + valeurs existantes
    var name  = document.getElementById('accName');
    var email = document.getElementById('accEmail');
    var phone = document.getElementById('accPhone');
    var addr  = document.getElementById('accAddr');
    var news  = document.getElementById('accNews');
    var slider= document.getElementById('accSlider');

    if (name)  u.name  = String(name.value||'').trim();
    if (email) u.email = String(email.value||'').trim();
    if (phone) u.phone = String(phone.value||'').trim();
    if (addr)  u.addr  = String(addr.value||'').trim();
    if (news)  u.newsletter = !!news.checked;
    if (slider)u.points = Math.max(0, parseInt(slider.value, 10) || 0);

    u.tier = computeTier(u.points);
    return u;
  }

  function wireAccountEvents(){
    var saveBtn  = document.getElementById('accSave');
    var clearBtn = document.getElementById('accClear');
    var toDevis  = document.getElementById('accToDevis');
    var slider   = document.getElementById('accSlider');

    if (saveBtn && !saveBtn.__wired){
      saveBtn.__wired = 1;
      saveBtn.addEventListener('click', function(){
        var u = grabUserFromForm();
        if (u.email && !validateEmail(u.email)){
          window.toast('Email invalide', 'info');
          try{ document.getElementById('accEmail').focus(); }catch(_){}
          return;
        }
        saveUser(u);
        updateLoyaltyUI(u);
      }, false);
    }
    if (clearBtn && !clearBtn.__wired){
      clearBtn.__wired = 1;
      clearBtn.addEventListener('click', function(){
        try{ localStorage.removeItem(USER_KEY); }catch(_){}
        var fresh = defaultUser();
        populateAccountForm(fresh);
        saveUser(fresh);
        window.toast('Compte réinitialisé', 'success');
      }, false);
    }
    if (toDevis && !toDevis.__wired){
      toDevis.__wired = 1;
      toDevis.addEventListener('click', function(){ location.hash = '#/devis'; }, false);
    }
    if (slider && !slider.__wired){
      slider.__wired = 1;
      slider.addEventListener('input', function(){
        var u = loadUser(); u.points = Math.max(0, parseInt(slider.value,10)||0); u.tier = computeTier(u.points);
        updateLoyaltyUI(u);
      }, false);
      slider.addEventListener('change', function(){
        var u = grabUserFromForm(); saveUser(u); // persiste le nouveau niveau
      }, false);
    }
  }

  function renderAccountView(){
    var view = ensureAccountView();
    var u = loadUser();
    populateAccountForm(u);
    wireAccountEvents();
  }

  /* =========================================================
     D) Router (#/compte) — sans écraser l’existant
  ========================================================== */
  function routeCompte(){
    var parsed = window.parseHash();
    if (parsed.view !== 'compte') return;
    window.showView('compte');     // masque autres vues si showView dispo
    renderAccountView();
    window.focusView('compte');
  }

  window.addEventListener('hashchange', routeCompte, false);
  document.addEventListener('DOMContentLoaded', function(){
    // prépare la vue au boot, utile si on arrive directement sur #/compte
    if ((location.hash||'').indexOf('#/compte') === 0){
      renderAccountView();
      window.showView('compte');
      window.focusView('compte');
    } else {
      // prépare la section pour éviter le flash lors d'un prochain accès
      ensureAccountView();
    }
  }, false);

  // Optionnel: bouton/menu externe vers le compte (s'il existe)
  var goAccountBtn = document.getElementById('goAccountBtn');
  if (goAccountBtn && !goAccountBtn.__wired){
    goAccountBtn.__wired = 1;
    goAccountBtn.addEventListener('click', function(){ location.hash = '#/compte'; }, false);
  }
})();
</script>



<!-- PARTIE 4 — À COLLER DANS app.js (bloc autonome, ES5-safe) -->
<script>
/* =========================================================
   PARTIE 4 — Router principal + Vues fail-safe + SEO
   - Crée/synchronise: #/ (home), #/catalogue, #/produit/:id, #/devis, #/compte
   - Ne duplique rien: n’overrides pas vos fonctions existantes
   - Attend les produits si nécessaire avant de rendre la PDP
========================================================= */
(function(){
  'use strict';

  /* ---------- Guards ---------- */
  var D = document;
  var W = window;

  // Fallbacks utilitaires (si non présents)
  if (typeof W.parseHash !== 'function') {
    W.parseHash = function(){
      var h = location.hash || '#/';
      var parts = h.split('?');
      var path  = parts[0] || '#/';
      var query = {};
      if (parts[1]) {
        var kv = parts[1].split('&');
        for (var i=0;i<kv.length;i++){
          var s = kv[i].split('=');
          var k = decodeURIComponent(s[0]||'');
          var v = decodeURIComponent(s[1]||'');
          if (k) query[k] = v;
        }
      }
      return { path: path, view: path.replace('#/','').split('/')[0]||'', query: query, raw: h };
    };
  }
  if (typeof W.showView !== 'function') {
    W.showView = function(key){
      var ids = ['view-home','view-catalogue','view-produit','view-devis','view-compte'];
      for (var i=0;i<ids.length;i++){ var el = D.getElementById(ids[i]); if (el) el.classList.add('hidden'); }
      var want = D.getElementById('view-'+key);
      if (want) want.classList.remove('hidden');
    };
  }
  if (typeof W.focusView !== 'function') W.focusView = function(){};
  if (typeof W.setPageMeta !== 'function') W.setPageMeta = function(){};
  if (typeof W.resetPageMeta !== 'function') W.resetPageMeta = function(){};
  if (typeof W.toast !== 'function') W.toast = function(){};

  /* =========================================================
     A) Vues — créer si absentes (home peut déjà exister)
  ========================================================== */
  function ensureHomeView(){
    var view = D.getElementById('view-home');
    if (view) return view;
    view = D.createElement('section');
    view.id = 'view-home';
    view.className = 'view';
    view.innerHTML =
      '<div class="container">'+
        '<h1 tabindex="-1">Bienvenue</h1>'+
        '<p style="margin:0 0 1rem;color:#9fb4c5">Choisissez une marque ou explorez le catalogue.</p>'+
        '<div id="brandGrid" class="brand-grid" role="list"></div>'+
      '</div>';
    D.body.appendChild(view);
    return view;
  }

  function ensureCatalogueView(){
    var view = D.getElementById('view-catalogue');
    if (view) return view;
    view = D.createElement('section');
    view.id = 'view-catalogue';
    view.className = 'view hidden';
    view.innerHTML =
      '<div class="container">'+
        '<h1 tabindex="-1">Catalogue</h1>'+
        '<div class="toolbar">'+
          '<input id="q" class="search" type="search" placeholder="Rechercher (marque, réf, description…)">'+
          '<select id="tag" class="select"><option value="">Tous</option></select>'+
        '</div>'+
        '<div id="catList" class="cat-list" aria-label="Catégories"></div>'+
        '<div id="list" class="list" aria-live="polite" aria-busy="false"></div>'+
      '</div>';
    D.body.appendChild(view);
    return view;
  }

  
  function ensureProduitView(){
  var D = window.D || document;
  // Vue déjà construite ?
  var view = D.getElementById('view-produit');
  if (view) return view;

  // Marqueup complet de la PDP (le conteneur garde l'id="pdp")
  var markup =
    '<div id="pdp" class="container pdp">'+
      '<a class="chip chip--back" href="#/catalogue" aria-label="Retour au catalogue">← Retour</a>'+
      '<div class="pdp__grid">'+
        '<div class="pdp__media"><img id="pdpImg" alt="" /></div>'+
        '<div class="pdp__info">'+
          '<h1 id="pdpTitle" class="pdp__title" tabindex="-1">Produit</h1>'+
          '<div id="pdpTag" class="pdp__tag"></div>'+
          '<p id="pdpDesc" class="pdp__desc"></p>'+
          '<ul id="pdpSpecs" class="pdp__specs"></ul>'+
          '<div class="actions">'+
            '<button id="pdpQuote" class="btn primary" type="button">Ajouter au panier</button>'+
            '<a id="pdpWa" class="btn btn-wa" target="_blank" rel="noopener">WhatsApp</a>'+
            '<button id="pdpShare" class="btn" type="button">Partager</button>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div class="pdp__related" id="pdpRelated"></div>'+
    '</div>';

  // S’il existe l’ancre statique #pdp dans index.html, on la remplace par la vue.
  var anchor = D.getElementById('pdp');
  if (anchor){
    var section = D.createElement('section');
    section.id = 'view-produit';
    section.className = 'view hidden';
    section.innerHTML = markup;
    if (anchor.parentNode) {
      anchor.parentNode.replaceChild(section, anchor);
    } else {
      D.body.appendChild(section);
    }
    return section;
  }

  // Fallback : créer la vue en fin de body
  view = D.createElement('section');
  view.id = 'view-produit';
  view.className = 'view hidden';
  view.innerHTML = markup;
  D.body.appendChild(view);
  return view;
}
  
  
  
  function ensureDevisView(){
    var view = D.getElementById('view-devis');
    if (view) return view;
    view = D.createElement('section');
    view.id = 'view-devis';
    view.className = 'view hidden';
    view.innerHTML =
      '<div class="container">'+
        '<h1 tabindex="-1">Mon devis</h1>'+
        '<div class="card">'+
          '<div class="head"><h3 class="title">Articles</h3><span class="badge">Panier</span></div>'+
          '<div id="devisList" class="specs" style="display:grid;gap:.8rem"></div>'+
          '<div class="actions">'+
            '<button id="devisSend" class="btn primary" type="button">Envoyer le devis (WhatsApp)</button>'+
            '<button id="devisClear" class="btn" type="button">Vider</button>'+
          '</div>'+
        '</div>'+
      '</div>';
    D.body.appendChild(view);
    return view;
  }

  // S’assure que les vues minimales existent
  ensureHomeView();
  ensureCatalogueView();
  ensureProduitView();
  ensureDevisView();

  /* =========================================================
     B) Helpers route/produits
  ========================================================== */
  function getProductIdFromHash(){
    var h = location.hash || '';
    // formats supportés: #/produit/ID  ou  #/produit?id=ID
    var m = h.match(/^#\/produit\/(.+?)$/);
    if (m && m[1]) return decodeURIComponent(m[1]);
    var parsed = W.parseHash();
    if (parsed && parsed.query && parsed.query.id) return parsed.query.id;
    return '';
  }

  // Attend les produits si nécessaire puis exécute cb()
  function withProducts(cb){
    var ready = (W.MODELS && W.MODELS.length) ? true : false;
    if (ready) { try{ cb(); }catch(_){ } return; }
    // Si une fonction loadProducts existe, on la appelle et enchaîne
    if (typeof W.loadProducts === 'function') {
      try{
        var p = W.loadProducts();
        if (p && typeof p.then === 'function') {
          p.then(function(){ try{ cb(); }catch(_){}; }).catch(function(){ try{ cb(); }catch(_){}; });
          return;
        }
      }catch(_){}
    }
    // Dernier recours: attendre l’event pt:productsLoaded (déjà émis ailleurs)
    var once = function(){
      W.removeEventListener('pt:productsLoaded', once);
      try{ cb(); }catch(_){}
    };
    W.addEventListener('pt:productsLoaded', once);
  }

  /* =========================================================
     C) Router principal
  ========================================================== */
  function renderHome(){
    W.showView('home');
    if (typeof W.resetPageMeta === 'function') W.resetPageMeta();
    // si une grille marques dynamique existe, elle s’est déjà rendue
    W.focusView('home');
  }

  function renderCatalogueRoute(){
    ensureCatalogueView();
    W.showView('catalogue');
    if (typeof W.resetPageMeta === 'function') W.resetPageMeta();
    // Laisse le routeur “brand/type” existant compléter si présent
    if (typeof W.handleRouteCatalogue_Extended === 'function') {
      try { W.handleRouteCatalogue_Extended(); } catch(_){}
    }
    W.focusView('catalogue');
  }

  function renderProduitRoute(){
    ensureProduitView();
    W.showView('produit');
    withProducts(function(){
      var id = getProductIdFromHash();
      var m = null;
      if (id && W.MODELS && W.MODELS.length){
        var lid = String(id).toLowerCase();
        for (var i=0;i<W.MODELS.length;i++){
          var x = W.MODELS[i];
          var a = (x.id!=null? String(x.id).toLowerCase() : '');
          var b = (x.sku!=null? String(x.sku).toLowerCase() : '');
          var c = (x.title!=null? String(x.title).toLowerCase() : '');
          if (lid===a || lid===b || lid===c) { m = x; break; }
        }
      }
      if (m && typeof W.renderPDP === 'function'){
        try{
          W.renderPDP(m);
          if (typeof W.setPageMeta === 'function') {
            var title = (m.title || ((m.brand||'')+' '+(m.sku||''))).trim();
            var desc  = (m.seo && m.seo.description) || m.desc || m.description || 'Fiche produit Pirates Tools';
            W.setPageMeta(title+' • Pirates Tools', desc);
          }
        }catch(_){}
      } else {
        // Not found
        var wrap = D.getElementById('pdp');
        if (!wrap) wrap = D.getElementById('view-produit');
        if (wrap){
          wrap.scrollIntoView({behavior:'smooth', block:'start'});
          var box = D.createElement('div');
          box.className = 'card';
          box.innerHTML =
            '<div class="head"><h3 class="title">Produit introuvable</h3></div>'+
            '<div class="specs"><p style="margin:0">Référence inconnue. <a href="#/catalogue" class="chip chip--back">← Retour catalogue</a></p></div>';
          // remplace le contenu visible
          var container = wrap.querySelector('.container') || wrap;
          // retire l’existant minimal si présent
          var rel = D.getElementById('pdpRelated'); if (rel) rel.innerHTML = '';
          var info = D.getElementById('pdpTitle');  if (info) info.textContent = '—';
          container.appendChild(box);
        }
        if (typeof W.clearProductJsonLD === 'function') W.clearProductJsonLD();
        if (typeof W.resetPageMeta === 'function') W.resetPageMeta();
      }
      W.focusView('produit');
    });
  }

  function renderDevisRoute(){
    ensureDevisView();
    W.showView('devis');
    if (typeof W.resetPageMeta === 'function') W.resetPageMeta();
    if (typeof W.renderCartView === 'function') {
      try { W.renderCartView(); } catch(_){}
    }
    W.focusView('devis');
  }

  function handleRoute(){
    var parsed = W.parseHash();
    var v = parsed.view;

    // Nettoie le JSON-LD produit si on quitte la PDP
    if (v !== 'produit' && typeof W.clearProductJsonLD === 'function') {
      try{ W.clearProductJsonLD(); }catch(_){}
    }

    if (!v || v === '' || v === 'home') return renderHome();
    if (v === 'catalogue')              return renderCatalogueRoute();
    if (v === 'produit')                return renderProduitRoute();
    if (v === 'devis')                  return renderDevisRoute();
    if (v === 'compte') {               // compte est géré par PARTIE 3 (routeCompte)
      // On laisse la PARTIE 3 rendre la vue, mais on sécurise l’existence
      var s = D.getElementById('view-compte') ? 'compte' : 'home';
      W.showView(s);
      return;
    }
    // Fallback → home
    renderHome();
  }

  W.addEventListener('hashchange', handleRoute, false);
  D.addEventListener('DOMContentLoaded', handleRoute, false);

  // Si les produits arrivent plus tard, on revalide la route (utile pour PDP direct)
  W.addEventListener('pt:productsLoaded', function(){ try{ handleRoute(); }catch(_){}; }, false);

  /* =========================================================
     D) Améliorations optionnelles (non destructives)
  ========================================================== */
  // 1) Titre simple par vue si pas en PDP
  W.addEventListener('hashchange', function(){
    var parsed = W.parseHash();
    if (parsed.view === 'catalogue')  W.setPageMeta('Catalogue • Pirates Tools', 'Parcourez nos produits pro.');
    if (parsed.view === 'devis')      W.setPageMeta('Mon devis • Pirates Tools', 'Votre sélection et total estimé.');
    if (!parsed.view || parsed.view === 'home') W.resetPageMeta();
  }, false);

  // 2) Lien topbar “logo” → home (si absent)
  (function(){
    var logo = D.getElementById('homeLink') || D.querySelector('.topbar-logo-link');
    if (logo && !logo.__ptWired){
      logo.__ptWired = 1;
      var go = function(e){ e.preventDefault(); location.hash=''; W.scrollTo({top:0,behavior:'smooth'}); };
      logo.addEventListener('click', go, false);
      logo.addEventListener('pointerup', function(e){ if (e.pointerType==='touch') go(e); }, false);
    }
  })();
})();
</script>