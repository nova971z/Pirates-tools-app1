/* =========================================================
   Pirates Tools — app.js (Partie 1/4)
   Boot SPA + Helpers + Home + Marques + Loader produits + Hero overshoot
   - ES5-safe (pas d'arrows / optional chaining)
   - Tolérant (products.json vide/absent => OK)
   - N'écrase rien : n'installe un helper global QUE s'il manque
   - Prépare Part 2/3/4 : parseHash, showView, focusView, toast,
     announce, setPageMeta/resetPageMeta, setSafeImg, loadProducts
========================================================= */
(function(){
  'use strict';

  /* ---------- Mini helpers DOM ---------- */
  function $(sel, root){ return (root||document).querySelector(sel); }
  function $$(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  /* ---------- Globals / constantes ---------- */
  if (typeof window.IMG_FALLBACK !== 'string'){
    window.IMG_FALLBACK = './images/pirates-tools-logo.png?v=7';
  }
  if (typeof window.PHONE_E164 !== 'string'){
    window.PHONE_E164 = '+33774230195';
  }
  if (typeof window.STORE_KEY !== 'string'){
    window.STORE_KEY = 'pt_cart_v1';
  }
  if (!Array.isArray(window.MODELS)) window.MODELS = [];

  /* ---------- Helpers de base (guards) ---------- */
  if (typeof window.fallback !== 'function'){
    window.fallback = function(v, alt){ return (v===void 0 || v===null) ? (alt||'') : v; };
  }
  if (typeof window.firstDefined !== 'function'){
    window.firstDefined = function(){ for (var i=0;i<arguments.length;i++){ var v=arguments[i]; if (v!==void 0 && v!==null) return v; } };
  }

  // A11y + toasts (création auto des racines #toasts & #sr-live)
  if (typeof window.toast !== 'function'){
    window.toast = function(msg, kind){
      var host = document.getElementById('toasts');
      if (!host){
        host = document.createElement('div'); host.id = 'toasts'; host.setAttribute('aria-live','polite');
        document.body.appendChild(host);
      }
      var n = document.createElement('div');
      n.className = 'toast' + (kind ? (' toast--'+kind) : '');
      n.textContent = msg || '';
      host.appendChild(n);
      setTimeout(function(){ try{ host.removeChild(n); }catch(_){ } }, 2800);
    };
  }
  if (typeof window.announce !== 'function'){
    window.announce = function(msg){
      var live = document.getElementById('sr-live');
      if (!live){ live = document.createElement('div'); live.id='sr-live'; live.className='sr-only'; live.setAttribute('aria-live','polite'); document.body.appendChild(live); }
      live.textContent = msg || '';
    };
  }

  // SEO (Partie 4 s’en sert si présent)
  if (typeof window.setPageMeta !== 'function'){
    window.setPageMeta = function(title, desc){
      try{
        if (title) document.title = String(title);
        if (desc!=null){
          var m = document.querySelector('meta[name="description"]');
          if (!m){ m = document.createElement('meta'); m.setAttribute('name','description'); document.head.appendChild(m); }
          m.setAttribute('content', String(desc));
        }
      }catch(_){}
    };
  }
  if (typeof window.resetPageMeta !== 'function'){
    window.resetPageMeta = function(){
      try{
        document.title = 'Pirates Tools • Outillage pro (PWA)';
        var m = document.querySelector('meta[name="description"]');
        if (m) m.setAttribute('content','Pirates Tools — Visseuses à chocs DeWALT, dispo Antilles. PWA rapide, contact immédiat (téléphone & WhatsApp).');
      }catch(_){}
    };
  }

  // Images sûres
  if (typeof window.setSafeImg !== 'function'){
    window.setSafeImg = function(img, src, alt){
      if (!img) return;
      img.loading = img.loading || 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.crossOrigin = 'anonymous';
      img.alt = alt || '';
      img.onerror = function(){ img.onerror=null; img.src = window.IMG_FALLBACK; };
      try{
        var u = new URL(src||'', location.href);
        if (u.protocol === 'http:') u.protocol = 'https:';
        img.src = u.href;
      }catch(_){
        img.src = window.IMG_FALLBACK;
      }
    };
  }

  // Router utils
  if (typeof window.parseHash !== 'function'){
    window.parseHash = function(){
      var h = location.hash || '#/';
      var parts = h.split('?');
      var path  = parts[0] || '#/';
      var view  = path.replace('#/','').split('/')[0] || '';
      var sub   = path.replace('#/','').split('/')[1] || '';
      var query = {};
      if (parts[1]){
        var kv = parts[1].split('&');
        for (var i=0;i<kv.length;i++){
          var s = kv[i].split('=');
          var k = decodeURIComponent(s[0]||'');
          var v = decodeURIComponent(s[1]||'');
          if (k) query[k] = v;
        }
      }
      return { path:path, view:view, sub:sub, query:query, raw:h };
    };
  }
  if (typeof window.showView !== 'function'){
    window.showView = function(key){
      var ids = ['home','catalogue','produit','devis','compte'];
      for (var i=0;i<ids.length;i++){ var el = document.getElementById('view-'+ids[i]); if (el) el.classList.add('hidden'); }
      var want = document.getElementById('view-'+key);
      if (want) want.classList.remove('hidden');
    };
  }
  if (typeof window.focusView !== 'function'){
    window.focusView = function(key){
      var v = document.getElementById('view-'+key); if (!v) return;
      var h1 = v.querySelector('h1'); if (!h1) return;
      h1.setAttribute('tabindex','-1'); try{ h1.focus({preventScroll:true}); }catch(_){ h1.focus(); }
      setTimeout(function(){ h1.removeAttribute('tabindex'); }, 250);
    };
  }

  /* ---------- Vues fallback DOM ---------- */
  function ensureView(id, html){
    var v = document.getElementById(id);
    if (!v){
      v = document.createElement('section'); v.id = id; v.className = 'view hidden';
      v.innerHTML = html; document.body.appendChild(v);
    }
    return v;
  }

  ensureView('view-home',
    '<div class="container">'+
      '<h1 tabindex="-1">Bienvenue</h1>'+
      '<p style="margin:0 0 1rem;color:#9fb4c5">Choisissez une marque ou explorez le catalogue.</p>'+
      '<div id="brandGrid" class="brand-grid" role="list"></div>'+
    '</div>'
  );

  ensureView('view-catalogue',
    '<div class="container">'+
      '<h1 tabindex="-1">Catalogue</h1>'+
      '<div class="toolbar">'+
        '<input id="q" class="search" type="search" placeholder="Rechercher (marque, réf, description…)">'+
        '<select id="tag" class="select"><option value="">Tous</option></select>'+
      '</div>'+
      '<div id="catList" class="cat-list" aria-label="Catégories"></div>'+
      '<div id="list" class="list" aria-live="polite" aria-busy="false"></div>'+
    '</div>'
  );

  ensureView('view-devis',
    '<div class="container">'+
      '<h1 tabindex="-1">Mon devis</h1>'+
      '<div class="card">'+
        '<div class="head"><h3 class="title">Articles</h3><span class="badge">Panier</span></div>'+
        '<div id="devisList" class="specs"></div>'+
        '<div class="actions">'+
          '<button id="devisSend" class="btn primary" type="button">Envoyer le devis (WhatsApp)</button>'+
          '<button id="devisClear" class="btn" type="button">Vider</button>'+
        '</div>'+
      '</div>'+
    '</div>'
  );

  ensureView('view-compte',
    '<div class="container">'+
      '<h1 tabindex="-1">Mon compte</h1>'+
      '<div class="card">'+
        '<div class="head"><h3 class="title">Créer / Mettre à jour</h3><span class="badge">Démo</span></div>'+
        '<div class="specs">'+
          '<form id="accountForm" style="display:grid;gap:.6rem;max-width:520px">'+
            '<label>Nom<input id="accName" type="text" class="search" placeholder="Votre nom" autocomplete="name"></label>'+
            '<label>Email<input id="accEmail" type="email" class="search" placeholder="vous@exemple.com" autocomplete="email"></label>'+
            '<div class="actions"><button id="accSave" class="btn primary" type="button">Enregistrer</button></div>'+
          '</form>'+
          '<div class="meter" style="max-width:520px;margin-top:1rem">'+
            '<div class="meter__rail"><div id="accFill" class="meter__fill"></div><div id="accCursor" class="meter__cursor" style="left:0%"></div></div>'+
            '<div class="meter__scale"><span>0%</span><span>100%</span></div>'+
            '<input id="accSlider" type="range" min="0" max="100" step="1" value="0">'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>'
  );

  // Ancre PDP (utile à certaines intégrations)
  if (!document.getElementById('pdp')){
    var a = document.createElement('a'); a.id='pdp'; a.className='sr-only'; a.setAttribute('aria-hidden','true'); document.body.appendChild(a);
  }

  /* ---------- Dock : s'assure que le bouton panier ouvre #/devis ---------- */
  (function(){
    var dockCount = document.getElementById('dockCount');
    var dockCartBtn = document.getElementById('dockCartBtn');
    if (dockCartBtn && !dockCartBtn.__wired){
      dockCartBtn.__wired = 1;
      dockCartBtn.addEventListener('click', function(){ location.hash = '#/devis'; }, false);
    }
    if (dockCount && !dockCount.__wired){
      dockCount.__wired = 1;
      dockCount.addEventListener('click', function(){ location.hash = '#/devis'; }, false);
    }
    var dock = document.getElementById('dock');
    if (dock) dock.classList.add('dock--visible');
  })();


  /* ---------- Grille marques : toutes les marques visibles ---------- */
/* 1) Référentiel des logos, conforme aux fichiers présents dans /images/brands/
      (chemins propres + cache-busting) */
var BRAND_META = (function(){
  var ver  = (window.__ASSET_VER || '10');
  // chemin relatif = OK sur GitHub Pages (repo ou racine)
  var base = './images/brands/';
  function url(file){ return base + file + '?v=' + ver; }
  return {
    dewalt:    { label:'DeWALT',    logo: url('dewalt.png')    },
    milwaukee: { label:'Milwaukee', logo: url('milwaukee.png') }, // s’affichera en fallback si le fichier n’est pas encore poussé
    makita:    { label:'Makita',    logo: url('makita.png')    },
    festool:   { label:'Festool',   logo: url('festool.png')   },
    flex:      { label:'FLEX',      logo: url('flex.png')      },
    wera:      { label:'Wera',      logo: url('wera.png')      },
    stanley:   { label:'Stanley',   logo: url('stanley.png')   },
    facom:     { label:'Facom',     logo: url('facom.jpg')     } // <-- JPG d’après ta liste
  };
})();

/* 2) Comptage optionnel par marque (même si products.json est vide,
      on affiche quand même toutes les bulles) */
function computeBrands(products){
  var counts = {};
  for (var k in BRAND_META) if (Object.prototype.hasOwnProperty.call(BRAND_META,k)) counts[k] = 0;
  for (var i=0;i<(products||[]).length;i++){
    var p = products[i];
    var key = (p && p.brand_key ? String(p.brand_key).toLowerCase() : '');
    if (key && counts.hasOwnProperty(key)) counts[key] += 1;
  }
  var out = [];
  for (var k2 in BRAND_META){
    if (!Object.prototype.hasOwnProperty.call(BRAND_META,k2)) continue;
    var meta = BRAND_META[k2];
    out.push({ key:k2, label:meta.label, logo:meta.logo, count:counts[k2]||0 });
  }
  out.sort(function(a,b){ return a.label.localeCompare(b.label); });
  return out;
}

/* 3) Rendu des bulles */
function renderBrandGridFromProducts(products){
  var host = document.getElementById('brandGrid'); if (!host) return;
  var brands = computeBrands(products);
  var html = '';
  for (var i=0;i<brands.length;i++){
    var b = brands[i];
    html += ''
      + '<button class="brand" type="button" data-brand="'+b.key+'" aria-label="Voir '+b.label+'">'
      + '  <span class="brand__bubble">'
      + '    <img class="brand__logo" alt="'+b.label+'"'
      + '         src="'+b.logo+'"'
      + '         decoding="async" loading="lazy" referrerpolicy="no-referrer"'
      + '         onerror="this.onerror=null; this.src=\''+(window.IMG_FALLBACK||'./images/pirates-tools-logo.png?v=7')+'\';">'
      + '  </span>'
      + '  <span class="brand__label">'+b.label+'</span>'
      + '</button>';
  }
  host.innerHTML = html;
}
window.PT = window.PT || {};
window.PT.renderBrandGridFromProducts = renderBrandGridFromProducts;

/* 4) Navigation des bulles → #/catalogue?brand=xxx */
(function(){
  var host = document.getElementById('brandGrid'); if (!host) return;
  if (host.__ptWired) return; host.__ptWired = 1;

  host.addEventListener('pointerdown', function(e){
    var el = e.target && e.target.closest ? e.target.closest('.brand') : null;
    if (!el) return;
    el.style.transform='scale(0.98)';
    setTimeout(function(){ el.style.transform=''; }, 160);
  }, false);

  host.addEventListener('click', function(e){
    var btn = e.target && e.target.closest ? e.target.closest('[data-brand]') : null;
    if (!btn) return;
    var key = btn.getAttribute('data-brand')||'';
    if (!key) return;
    location.hash = '#/catalogue?brand='+encodeURIComponent(key);
  }, false);
})();


   
  /* ---------- Chargement produits (mémoisé & tolérant) ---------- */
  function loadProducts(){
    if (window.__PT_PRODUCTS && window.__PT_PRODUCTS.length){
      window.MODELS = window.__PT_PRODUCTS.slice();
      try{ window.dispatchEvent(new CustomEvent('pt:productsLoaded')); }catch(_){}
      return Promise.resolve(window.__PT_PRODUCTS);
    }

    var inline = window.PRODUCTS || window.products || [];
    if (inline.length){
      window.__PT_PRODUCTS = inline.slice();
      window.MODELS = inline.slice();
      try{ window.dispatchEvent(new CustomEvent('pt:productsLoaded')); }catch(_){}
      return Promise.resolve(window.__PT_PRODUCTS);
    }

    return fetch('./products.json', { cache:'no-store' })
      .then(function(r){ return r.json(); })
      .then(function(json){
        var arr = Array.isArray(json) ? json : (json && Array.isArray(json.products) ? json.products : []);
        window.__PT_PRODUCTS = arr.slice();
        window.MODELS = arr.slice();
        try{ window.dispatchEvent(new CustomEvent('pt:productsLoaded')); }catch(_){}
        return arr;
      })
      .catch(function(){
        window.__PT_PRODUCTS = [];
        window.MODELS = [];
        try{ window.dispatchEvent(new CustomEvent('pt:productsLoaded')); }catch(_){}
        return [];
      });
  }
  // Expose pour Part 2/3/4
  if (typeof window.loadProducts !== 'function') window.loadProducts = loadProducts;
  window.PT.loadProducts = loadProducts;

  /* ---------- Router minimal (laisse Part 4 prendre la main) ---------- */
  function handleRoute(){
    var p = window.parseHash();
    if (!p.view || p.view==='home' || p.view==='/'){
      window.showView('home'); window.resetPageMeta();
      loadProducts().then(renderBrandGridFromProducts);
      window.focusView('home');
      return;
    }
    if (p.view==='catalogue'){
      window.showView('catalogue'); window.resetPageMeta(); window.focusView('catalogue'); return;
    }
    // Les autres vues sont rendues par les autres parties
  }
  window.PT.handleRoute = handleRoute;

  window.addEventListener('hashchange', handleRoute, false);

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', function(){
    // fallback visuels logos (si jamais)
    (function(){
      function ensureFallback(img){
        if (!img) return;
        img.addEventListener('error', function(){ img.src = window.IMG_FALLBACK; });
        if (img.complete && img.naturalWidth === 0) img.src = window.IMG_FALLBACK;
      }
      ensureFallback(document.getElementById('heroLogo'));
      $$('.topbar-logo').forEach(ensureFallback);
    })();

    handleRoute();

    // Préparer la grille en amont sur la home
    loadProducts().then(function(arr){
      if (!location.hash || location.hash==='#/' || location.hash==='#/home'){
        renderBrandGridFromProducts(arr);
      }
    });
  }, false);

  // Pour les autres parties/utilitaires
  window.PT.$ = $; window.PT.$$ = $$;
  window.PT.fallback = window.fallback;
  window.PT.firstDefined = window.firstDefined;
  window.PT.setSafeImg = window.setSafeImg;
  window.PT.parseHash = window.parseHash;
  window.PT.showView = window.showView;
  window.PT.focusView = window.focusView;
})();


/* =========================================================
   PARTIE 2 — Catalogue + Produits + Panier + Devis (ES5-safe)
   - N'écrase pas les helpers existants (guards)
   - Gère #/catalogue, #/produit/:id, #/devis
   - Panier persistant + WhatsApp devis
   - Cohérente avec la Partie 1 (loadProducts/MODELS/pt:productsLoaded)
   - Expose les APIs utilisées par Parties 3 & 4
========================================================= */

(function(){
  'use strict';

  /* ---------- Guards / helpers attendus ---------- */
  if (typeof window.fallback !== 'function'){
    window.fallback = function(v, alt){ return (v===void 0 || v===null) ? (alt||'') : v; };
  }
  if (typeof window.firstDefined !== 'function'){
    window.firstDefined = function(){ for (var i=0;i<arguments.length;i++){ var v=arguments[i]; if (v!==void 0 && v!==null) return v; } };
  }
  if (typeof window.toast !== 'function')    window.toast = function(){};
  if (typeof window.announce !== 'function') window.announce = function(){};
  if (typeof window.notifyCartAdded !== 'function'){
    window.notifyCartAdded = function(title){ window.toast('« '+(title||'Article')+' » ajouté au devis','success'); };
  }
  if (typeof window.setSafeImg !== 'function'){
    window.setSafeImg = function(img, src, alt){
      if (!img) return;
      img.alt = alt||'';
      img.onerror = function(){ img.src = (window.IMG_FALLBACK||'./images/pirates-tools-logo.png?v=7'); };
      img.src = src|| (window.IMG_FALLBACK||'./images/pirates-tools-logo.png?v=7');
    };
  }
  if (typeof window.parseHash !== 'function'){
    window.parseHash = function(){
      var h = location.hash || '#/';
      var parts = h.split('?');
      var path  = parts[0] || '#/';
      var query = {};
      if (parts[1]){
        var kv = parts[1].split('&');
        for (var i=0;i<kv.length;i++){
          var s = kv[i].split('=');
          var k = decodeURIComponent(s[0]||'');
          var v = decodeURIComponent(s[1]||'');
          if (k) query[k] = v;
        }
      }
      return { path:path, view:path.replace('#/','').split('/')[0]||'', query:query, raw:h };
    };
  }
  if (typeof window.focusView !== 'function') window.focusView = function(){};
  if (typeof window.showView  !== 'function'){
    window.showView = function(key){
      var ids = ['home','catalogue','produit','devis','compte'];
      for (var i=0;i<ids.length;i++){ var el=document.getElementById('view-'+ids[i]); if(el) el.classList.add('hidden'); }
      var want = document.getElementById('view-'+key); if (want) want.classList.remove('hidden');
    };
  }

  /* ---------- Globals compat ---------- */
  var PHONE_E164  = window.PHONE_E164  || '+33774230195';
  var IMG_FALLBACK= window.IMG_FALLBACK|| './images/pirates-tools-logo.png?v=7';
  var STORE_KEY   = window.STORE_KEY   || 'pt_cart_v1';

  window.MODELS = Array.isArray(window.MODELS) ? window.MODELS : [];
  window.CART   = Array.isArray(window.CART)   ? window.CART   : [];

  // refs DOM
  var listEl, searchEl, tagEl, dock, dockCount;
  function syncDomRefs(){
    listEl    = document.getElementById('list');
    searchEl  = document.getElementById('q');
    tagEl     = document.getElementById('tag');
    dock      = document.getElementById('dock');
    dockCount = document.getElementById('dockCount');
  }
  syncDomRefs();

  /* ---------- Utils ---------- */
  function onlyDigits(s){ return String(s||'').replace(/[^\d]/g,''); }
  function formatPriceCents(priceCents, currency){
    if (priceCents == null) return '';
    var txt = '';
    try{ txt = (priceCents/100).toLocaleString('fr-FR', {style:'currency', currency: currency||'EUR'}); }
    catch(_){ txt = (priceCents/100).toFixed(2)+' '+(currency||'EUR'); }
    return txt;
  }
  function absoluteUrl(u){ try{ return new URL(u, location.href).href; }catch(_){ return u; } }

  /* =========================================================
     A) PANIER — persistance + utilitaires
  ========================================================== */
  function updateDock(){
    var n = window.CART.length;
    if (dockCount){ dockCount.textContent = n; dockCount.style.display = n ? '' : 'none'; }
    if (dock){
      var cartBtn = document.getElementById('dockCartBtn') || (dock.querySelector ? dock.querySelector('.dock__btn--cart') : null);
      if (cartBtn){ cartBtn.style.animationPlayState = n ? 'running' : 'paused'; }
    }
  }
  function saveCart(){
    try{ localStorage.setItem(STORE_KEY, JSON.stringify(window.CART)); }catch(_){}
    updateDock();
    if (((location.hash||'').toLowerCase()).indexOf('#/devis')===0 && typeof renderCartView==='function'){
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

  function keyOf(p){ return String(window.firstDefined(p&&p.id, p&&p.sku, p&&p.title, '')); }

  function groupCart(){
    var map = {}; var out = [];
    for (var i=0;i<window.CART.length;i++){
      var p = window.CART[i]; var k = keyOf(p);
      if (!map[k]) map[k] = { item:p, qty:0 };
      map[k].qty++;
    }
    for (var k in map) if (Object.prototype.hasOwnProperty.call(map,k)) out.push(map[k]);
    return out;
  }

  function findProductByKey(key){
    if (!key) return null;
    var k = String(key).toLowerCase();
    for (var i=0;i<window.MODELS.length;i++){
      var m = window.MODELS[i];
      var id  = String(m && m.id  != null ? m.id  : '').toLowerCase();
      var sku = String(m && m.sku != null ? m.sku : '').toLowerCase();
      var ttl = String(m && m.title!= null ? m.title: '').toLowerCase();
      if (k===id || k===sku || k===ttl) return m;
    }
    return null;
  }
  window.findProductByKey = window.findProductByKey || findProductByKey;

  function addToCart(keyOrId, qty){
    qty = Math.max(1, Number(qty||1));
    var p = findProductByKey(keyOrId);
    if (!p) return;
    for (var i=0;i<qty;i++) window.CART.push(p);
    saveCart(); window.notifyCartAdded(p.title||p.sku||'Article');
  }
  window.addToCart = window.addToCart || addToCart;

  function cartToWhatsAppText(){
    var grouped = groupCart();
    if (!grouped.length) return '';
    var lines = grouped.map(function(g){
      var it = g.item||{}, qty = g.qty||0;
      var sku = it.sku || it.id || '';
      var title = (it.title || ((it.brand||'')+' '+(it.sku||''))).trim();
      return '• ' + sku + ' – ' + title + (qty>1 ? (' ×'+qty) : '');
    });
    var contact = '';
    try{
      var u = (typeof window.loadUser==='function') ? window.loadUser() : null;
      var arr = [];
      if (u && u.name)  arr.push('Nom: ' + u.name);
      if (u && u.email) arr.push('Email: ' + u.email);
      if (u && u.phone) arr.push('Téléphone: ' + u.phone);
      if (u && u.addr)  arr.push('Adresse: ' + u.addr);
      contact = arr.length ? '\n\nMes coordonnées:\n' + arr.join('\n') : '';
    }catch(_){}
    var link = location.origin + location.pathname + '#/devis';
    return 'Bonjour, je souhaite un devis pour:\n' + lines.join('\n') + '\n\nLien: ' + link + contact + '\n\nMerci.';
  }
  window.cartToWhatsAppText = window.cartToWhatsAppText || cartToWhatsAppText;

  /* =========================================================
     B) PRODUITS — JSON-LD + rendu liste & PDP
  ========================================================== */
  function schemaAvailability(p){
    var s = (p.stock_status||'').toLowerCase();
    if (s === 'in_stock')     return 'http://schema.org/InStock';
    if (s === 'low_stock')    return 'http://schema.org/LimitedAvailability';
    if (s === 'out_of_stock') return 'http://schema.org/OutOfStock';
    return (p.stock_qty>0) ? 'http://schema.org/InStock' : 'http://schema.org/OutOfStock';
  }
  function buildProductJsonLD(p){
    var images = [];
    if (p.img) images.push(absoluteUrl(p.img));
    if (Array.isArray(p.gallery)) for (var i=0;i<p.gallery.length;i++) images.push(absoluteUrl(p.gallery[i]));
    var price = (typeof p.price==='number') ? p.price :
                (typeof p.price_cents==='number' ? p.price_cents/100 : void 0);
    var url = location.origin + location.pathname + '#/produit/' + encodeURIComponent(p.id || p.sku || (p.title||''));
    var data = {
      "@context":"https://schema.org",
      "@type":"Product",
      "name": p.title || ((p.brand||'')+' '+(p.sku||'')),
      "sku":  p.sku || p.id || void 0,
      "mpn":  p.sku || void 0,
      "brand": p.brand ? { "@type":"Brand", "name":p.brand } : void 0,
      "category": p.category || void 0,
      "description": (p.seo && p.seo.description) || p.desc || p.description || void 0,
      "image": images.length ? images : void 0,
      "url": url,
      "offers":{
        "@type":"Offer",
        "priceCurrency": p.currency || 'EUR',
        "price": price!=null ? String(price) : void 0,
        "availability": schemaAvailability(p),
        "itemCondition": p.new ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
        "url": url
      }
    };
    if (typeof p.rating==='number' && typeof p.reviews==='number' && p.reviews>0){
      data.aggregateRating = { "@type":"AggregateRating", "ratingValue": String(p.rating), "ratingCount": String(p.reviews) };
    }
    function prune(o){
      if (Array.isArray(o)){ var a=[]; for (var i=0;i<o.length;i++){ var pv=prune(o[i]); if(pv!=null) a.push(pv); } return a; }
      if (o && typeof o==='object'){ var r={}; for (var k in o){ if(!Object.prototype.hasOwnProperty.call(o,k)) continue; var pv=prune(o[k]); if(pv!=null && !(Array.isArray(pv)&&!pv.length)) r[k]=pv; } return Object.keys(r).length?r:null; }
      return (o===void 0 || o===null)?null:o;
    }
    return prune(data);
  }
  function injectProductJsonLD(p){
    try{
      var id='jsonld-product'; var old=document.getElementById(id); if(old) old.remove();
      var json = buildProductJsonLD(p); if(!json) return;
      var s=document.createElement('script'); s.type='application/ld+json'; s.id=id; s.textContent=JSON.stringify(json);
      document.head.appendChild(s);
    }catch(_){}
  }
  function clearProductJsonLD(){ var s=document.getElementById('jsonld-product'); if(s) s.remove(); }
  window.clearProductJsonLD = window.clearProductJsonLD || clearProductJsonLD;

  function productToHTML(m){
    var title = window.fallback(m.title, (window.fallback(m.brand,'') + (m.brand?' ':'') + window.fallback(m.sku,''))).trim();
    var tag   = window.fallback(m.badge, (Array.isArray(m.tags)&&m.tags[0]) || window.fallback(m.tag,'')).trim();
    var desc  = window.fallback(m.desc, window.fallback(m.description,''));
    var id    = String(window.fallback(m.id, window.fallback(m.sku, title)));

    var currency   = (m && m.currency) ? m.currency : 'EUR';
    var priceCents = (m && typeof m.price_cents==='number' && isFinite(m.price_cents))
      ? Math.round(m.price_cents)
      : (m && typeof m.price==='number' && isFinite(m.price)) ? Math.round(m.price*100) : null;

    var priceHtml = (priceCents!=null)
      ? '<div class="price" aria-label="Prix" style="margin-top:.35rem;font-weight:700">'+formatPriceCents(priceCents,currency)+'</div>'
      : '';

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
    var root = document.getElementById('list'); if(!root) return;
    var btns = root.querySelectorAll ? root.querySelectorAll('[data-add]') : [];
    for (var i=0;i<btns.length;i++){
      (function(btn){
        if (btn.__ptWired) return; btn.__ptWired = 1;
        btn.addEventListener('click', function(e){
          e.stopPropagation();
          var id = btn.getAttribute('data-add'); var p=null;
          for (var j=0;j<scopeData.length;j++){
            var x=scopeData[j];
            if ((x.id && String(x.id)===id) || (x.sku && String(x.sku)===id) || (x.title===id)){ p=x; break; }
          }
          if (!p) return; window.CART.push(p); saveCart(); window.notifyCartAdded(p.title||p.sku||'Article');
        }, false);
      })(btns[i]);
    }
  }

  function renderList(data){
    var root = document.getElementById('list'); if(!root) return;
    data = Array.isArray(data) ? data : [];
    root.innerHTML = data.map(productToHTML).join('\n');

    var cards = root.querySelectorAll ? root.querySelectorAll('.card[data-id]') : [];
    for (var i=0;i<cards.length;i++){
      (function(card){
        if(card.__ptWired) return; card.__ptWired=1;
        card.addEventListener('click', function(e){
          if (e.target && e.target.closest && e.target.closest('[data-add]')) return;
          var id = card.getAttribute('data-id'); if(!id) return;
          location.hash = '#/produit/' + encodeURIComponent(id);
        }, false);
      })(cards[i]);
    }
    bindAddToCart(data);
  }
  window.renderList = window.renderList || renderList;

  function renderPDP(product){
    var view = document.getElementById('view-produit');
    if (!view){
      view = document.createElement('section'); view.id='view-produit'; view.className='view';
      view.innerHTML =
        '<div class="container pdp" id="pdp">'+
          '<a class="chip chip--back" href="#/catalogue" aria-label="Retour au catalogue">← Retour</a>'+
          '<div class="pdp__grid">'+
            '<div class="pdp__media"><img id="pdpImg" alt=""></div>'+
            '<div class="pdp__info">'+
              '<h1 class="pdp__title" id="pdpTitle" tabindex="-1"></h1>'+
              '<div class="pdp__tag" id="pdpTag"></div>'+
              '<p class="pdp__desc" id="pdpDesc"></p>'+
              '<ul class="pdp__specs" id="pdpSpecs"></ul>'+
              '<div class="actions">'+
                '<button class="btn primary" id="pdpQuote">Ajouter au panier</button>'+
                '<a class="btn btn-wa" id="pdpWa" target="_blank" rel="noopener">WhatsApp</a>'+
                '<button class="btn" id="pdpShare">Partager</button>'+
              '</div>'+
            '</div>'+
          '</div>'+
          '<div class="pdp__related" id="pdpRelated"></div>'+
        '</div>';
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

    var title = product.title || ((product.brand||'')+' '+(product.sku||'')).trim();
    var tag   = product.badge || (Array.isArray(product.tags)&&product.tags[0]) || product.tag || '';
    var desc  = product.desc || product.description || '';
    var img   = product.img || IMG_FALLBACK;

    if (elT) elT.textContent = title;
    if (elTag) elTag.textContent = tag ? '#'+tag : '';
    if (elDesc) elDesc.textContent = desc || 'Caractéristiques à venir.';
    if (elImg) window.setSafeImg(elImg, img, product.images_alt || title || '');

    // prix
    var currency   = product && product.currency ? product.currency : 'EUR';
    var priceCents = (product && typeof product.price_cents==='number' && isFinite(product.price_cents))
      ? Math.round(product.price_cents)
      : (product && typeof product.price==='number' && isFinite(product.price)) ? Math.round(product.price*100) : null;

    var priceEl = document.getElementById('pdpPrice');
    if (!priceEl){
      priceEl = document.createElement('p');
      priceEl.id='pdpPrice'; priceEl.className='pdp__price';
      priceEl.style.margin='.35rem 0'; priceEl.style.fontWeight='700';
      if (elDesc && elDesc.parentNode) elDesc.parentNode.insertBefore(priceEl, elDesc.nextSibling);
    }
    priceEl.textContent = (priceCents!=null) ? formatPriceCents(priceCents, currency) : '';

    // specs (features + table)
    var features = Array.isArray(product.features) ? product.features : (Array.isArray(product.specs)?product.specs:[]);
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
    if (kvFromJson){ for (var k1 in kvFromJson){ if (kvFromJson[k1]!=null && kvFromJson[k1]!=='') merged[k1]=kvFromJson[k1]; } }
    for (var k2 in kvDerived){ var v = kvDerived[k2]; if (v!=null && v!=='') merged[k2]=v; }

    var tableHtml = '';
    if (Object.keys(merged).length){
      var rows = Object.keys(merged).map(function(k){ return '<tr><th>'+k+'</th><td>'+merged[k]+'</td></tr>'; }).join('');
      tableHtml =
        '<li style="list-style:none;padding:0;margin:.6rem 0 0">'+
        '  <div class="badge" style="margin:0 0 .4rem;display:inline-flex;align-items:center;gap:.4rem">⚙️ Caractéristiques techniques</div>'+
        '  <div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:.95rem"><tbody>'+rows+'</tbody></table></div>'+
        '</li>';
    }
    if (elSpecs) elSpecs.innerHTML = (featHtml || tableHtml) ? (featHtml + tableHtml) : '';

    if (btnQ){
      btnQ.textContent = 'Ajouter au panier';
      btnQ.onclick = function(){ window.CART.push(product); saveCart(); window.notifyCartAdded(product.title||product.sku||'Article'); };
    }

    var sku = product.sku || product.id || title;
    var productLink = location.origin + location.pathname + '#/produit/' + encodeURIComponent(product.id || product.sku || title);

    var contactSuffix = '';
    try{
      var u = (typeof window.loadUser==='function') ? window.loadUser() : null;
      var arr = []; if(u&&u.name)arr.push('Nom: '+u.name); if(u&&u.email)arr.push('Email: '+u.email);
      if(u&&u.phone)arr.push('Téléphone: '+u.phone); if(u&&u.addr)arr.push('Adresse: '+u.addr);
      contactSuffix = arr.length ? '\n\nMes coordonnées:\n'+arr.join('\n') : '';
    }catch(_){}
    var textPDP = 'Bonjour, je souhaite un devis pour:\n• '+sku+' – '+title+'\n\nLien: '+productLink+contactSuffix+'\n\nMerci.';
    if (btnWa) btnWa.href = 'https://wa.me/'+onlyDigits(PHONE_E164)+'?text='+encodeURIComponent(textPDP);

    if (btnShare){
      btnShare.onclick = function(){
        try{
          var shareData = { title:title+' • Pirates Tools', text:title, url:productLink };
          if (navigator.share){ navigator.share(shareData); }
          else if (navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(productLink); window.toast('Lien copié','success'); }
        }catch(_){}
      };
    }

    // Suggestions
    var related = window.MODELS.filter(function(m){
      return (m!==product) && (
        (product.category && m.category===product.category) ||
        (tag && ((m.badge===tag) || (Array.isArray(m.tags) && m.tags.indexOf(tag)!==-1)))
      );
    }).slice(0,3);

    if (elRel){
      var relHTML = '';
      for (var i=0;i<related.length;i++){
        var rm = related[i];
        relHTML +=
          '<article class="card" data-id="'+(rm.id||rm.sku||rm.title)+'">'+
          '  <div class="head"><h3 class="title">'+(rm.title||(rm.brand||'')+' '+(rm.sku||''))+'</h3>'+((rm.badge||'')?'<span class="badge">'+rm.badge+'</span>':'')+'</div>'+
          '  <div class="specs"><p style="margin:0">'+(rm.desc||rm.description||'')+'</p></div>'+
          '  <div class="actions"><button class="btn primary" data-add="'+(rm.id||rm.sku||rm.title)+'">Ajouter au panier</button></div>'+
          '</article>';
      }
      elRel.innerHTML = relHTML;
      elRel.addEventListener('click', function(e){
        var btn = e.target && e.target.closest ? e.target.closest('[data-add]') : null;
        if (!btn) return;
        var id = btn.getAttribute('data-add'); var p=null;
        for (var z=0;z<window.MODELS.length;z++){ var x=window.MODELS[z]; if(((x.id||x.sku||x.title)+'')===id){ p=x; break; } }
        if (p){ window.CART.push(p); saveCart(); window.notifyCartAdded(p.title||p.sku||'Article'); }
        e.stopPropagation();
      }, false);
    }

    injectProductJsonLD(product);
  }
  window.renderPDP = window.renderPDP || renderPDP;

  /* =========================================================
     C) CATALOGUE — catégories auto + rendu + filtres
  ========================================================== */
  function buildCategories(){
    var counts = {}, labels = {};
    for (var i=0;i<window.MODELS.length;i++){
      var m = window.MODELS[i];
      var raw = (m.category || m.badge || m.brand || '').toString().trim();
      if (!raw) continue;
      var key = raw.toLowerCase();
      counts[key] = (counts[key]||0)+1;
      if (labels[key]==null) labels[key] = raw;
    }
    var out = []; for (var k in counts) if (Object.prototype.hasOwnProperty.call(counts,k)) out.push({key:k,label:labels[k],count:counts[k]});
    out.sort(function(a,b){ return b.count - a.count; });
    return out;
  }
  function buildTagOptions(){
    var seen={}, opts=[];
    function pushOnce(label){
      if (!label) return; var key=String(label).toLowerCase(); if (seen[key]) return; seen[key]=1; opts.push({key:key,label:label});
    }
    for (var i=0;i<window.MODELS.length;i++){
      var m=window.MODELS[i];
      pushOnce(m.brand); pushOnce(m.category); pushOnce(m.badge);
      if (Array.isArray(m.tags)) for (var t=0;t<m.tags.length;t++) pushOnce(m.tags[t]);
    }
    opts.sort(function(a,b){ return a.label.localeCompare(b.label); });
    return opts;
  }
  function updateTagSelectOptions(){
    syncDomRefs(); if (!tagEl) return;
    var html = '<option value="">Tous</option>';
    var opts = buildTagOptions();
    for (var i=0;i<opts.length;i++) html += '<option value="'+opts[i].key+'">'+opts[i].label+'</option>';
    tagEl.innerHTML = html;
  }
  function findSelectMatch(select, keyLower){
    if (!select) return null;
    var opts = Array.prototype.slice.call(select.options||[]);
    for (var i=0;i<opts.length;i++){
      var o=opts[i]; var v=(o.value||'').toLowerCase(); var t=(o.textContent||'').toLowerCase();
      if (v===keyLower || t===keyLower) return (o.value||o.textContent);
    }
    return null;
  }
  function renderCatalogue(){
    var root = document.getElementById('catList'); if (!root) return;
    var cats = buildCategories();
    root.innerHTML = cats.length
      ? cats.map(function(c){
          return '<article class="card cat-card" data-cat="'+c.key+'">'+
                   '<div class="head"><h3 class="title">'+c.label+'</h3><span class="badge">Catégorie</span></div>'+
                   '<div class="specs"><p style="margin:0">'+c.count+' produit'+(c.count>1?'s':'')+'</p></div>'+
                   '<div class="actions"><button class="btn primary" data-cat-go="'+c.key+'">Voir</button></div>'+
                 '</article>';
        }).join('')
      : '<div class="card"><div class="specs"><p style="margin:0">Aucune catégorie détectée.</p></div></div>';

    function go(keyLower){
      syncDomRefs();
      var matchVal = findSelectMatch(tagEl, keyLower);
      if (tagEl) tagEl.value = matchVal || '';
      if (searchEl) searchEl.value = matchVal ? '' : keyLower;
      if (typeof window.applyFilters==='function') window.applyFilters();
      location.hash = '#/catalogue';
      setTimeout(function(){ var listNode=document.getElementById('list'); if (listNode && listNode.scrollIntoView) listNode.scrollIntoView({behavior:'smooth', block:'start'}); }, 80);
    }
    if (!root.__ptWired){
      root.__ptWired=1;
      root.addEventListener('click', function(e){
        var btn  = e.target && e.target.closest ? e.target.closest('[data-cat-go]') : null;
        var card = e.target && e.target.closest ? e.target.closest('.cat-card')    : null;
        if (btn)  return go(btn.getAttribute('data-cat-go'));
        if (card) return go(card.getAttribute('data-cat'));
      }, false);
    }
  }

  /* ===== Extension catalogue (brand → types) appelée par PARTIE 4 ===== */
  function computeTypesForBrand(brandLower){
    brandLower = String(brandLower||'').toLowerCase();
    var counts = {}, labels = {};
    var i, m, k;

    // Priorité aux catégories ; sinon badge/tags
    for (i=0;i<window.MODELS.length;i++){
      m = window.MODELS[i] || {};
      var b1 = (m.brand||'').toLowerCase();
      var b2 = (m.brand_key||'').toLowerCase();
      if (!brandLower || (b1!==brandLower && b2!==brandLower)) continue;

      // Catégorie (primaire)
      if (m.category){
        k = String(m.category).toLowerCase();
        counts[k] = (counts[k]||0)+1; if (labels[k]==null) labels[k] = String(m.category);
      }
    }
    // Si aucune catégorie, on tombe sur badge + tags
    var hasCats = Object.keys(counts).length>0;
    if (!hasCats){
      for (i=0;i<window.MODELS.length;i++){
        m = window.MODELS[i] || {};
        var bb1 = (m.brand||'').toLowerCase();
        var bb2 = (m.brand_key||'').toLowerCase();
        if (!brandLower || (bb1!==brandLower && bb2!==brandLower)) continue;

        if (m.badge){
          k = String(m.badge).toLowerCase();
          counts[k] = (counts[k]||0)+1; if (labels[k]==null) labels[k] = String(m.badge);
        }
        if (Array.isArray(m.tags)){
          for (var t=0;t<m.tags.length;t++){
            var tg = String(m.tags[t]||'').trim();
            if (!tg) continue;
            k = tg.toLowerCase();
            counts[k] = (counts[k]||0)+1; if (labels[k]==null) labels[k] = tg;
          }
        }
      }
    }

    var out = []; for (k in counts) if (Object.prototype.hasOwnProperty.call(counts,k)) out.push({key:k,label:labels[k],count:counts[k]});
    out.sort(function(a,b){ return b.count - a.count; });
    return out;
  }

  function renderBrandTypesGrid(brandLower){
    var root = document.getElementById('catList'); if (!root) return;
    var types = computeTypesForBrand(brandLower);
    if (!types.length){
      // Rien de spécifique : on garde l’affichage global
      renderCatalogue();
      return;
    }
    root.innerHTML = types.map(function(c){
      return ''+
        '<article class="card type-card" data-type="'+c.key+'">'+
        '  <div class="head"><h3 class="title">'+c.label+'</h3><span class="badge">Type</span></div>'+
        '  <div class="specs"><p style="margin:0">'+c.count+' produit'+(c.count>1?'s':'')+'</p></div>'+
        '  <div class="actions"><button class="btn primary" data-type-go="'+c.key+'">Voir</button></div>'+
        '</article>';
    }).join('');
    if (!root.__ptTypeWired){
      root.__ptTypeWired = 1;
      root.addEventListener('click', function(e){
        var el = e.target && e.target.closest ? e.target.closest('[data-type-go], .type-card') : null;
        if (!el) return;
        var typeLower = (el.getAttribute('data-type-go')||el.getAttribute('data-type')||'').toLowerCase();
        if (!typeLower) return;
        applyBrandTypeFilter(brandLower, typeLower);
      }, false);
    }
  }

  function applyBrandTypeFilter(brandLower, typeLower){
    syncDomRefs();
    // On force la recherche plein-texte sur la marque (q) + select sur le type (t)
    var typeMatch = findSelectMatch(tagEl, typeLower);
    if (searchEl) searchEl.value = brandLower || '';
    if (tagEl)    tagEl.value    = typeMatch || typeLower || '';
    if (typeof window.applyFilters==='function') window.applyFilters();

    // Met à jour l’URL pour partage/navigation
    var h = '#/catalogue?brand=' + encodeURIComponent(brandLower||'');
    if (typeLower) h += '&type=' + encodeURIComponent(typeLower);
    if ((location.hash||'') !== h) location.hash = h;

    // Scroll vers la liste
    setTimeout(function(){
      var listNode=document.getElementById('list');
      if (listNode && listNode.scrollIntoView) listNode.scrollIntoView({behavior:'smooth', block:'start'});
    }, 80);
  }

  function handleRouteCatalogue_Extended(){
    var p = window.parseHash ? window.parseHash() : {view:'',query:{}};
    if (p.view !== 'catalogue') return;

    syncDomRefs();
    updateTagSelectOptions(); // s’assure que le select est rempli

    var brand = (p.query && p.query.brand) ? String(p.query.brand).toLowerCase() : '';
    var type  = (p.query && (p.query.type || p.query.tag)) ? String(p.query.type || p.query.tag).toLowerCase() : '';

    if (brand){
      // Rendu des types pour la marque
      renderBrandTypesGrid(brand);

      // Applique le filtre combiné (brand + type si fourni)
      if (type){
        applyBrandTypeFilter(brand, type);
      }else{
        // brand seul → filtre sur brand (q) et clear select
        var brandMatch = findSelectMatch(tagEl, brand);
        if (searchEl) searchEl.value = brand;
        if (tagEl)    tagEl.value    = brandMatch || '';
        if (typeof window.applyFilters==='function') window.applyFilters();
      }
    } else {
      // comportement par défaut
      renderCatalogue();
      if (p.query) { // garde compat si la PARTIE 4 n’a pas encore hydraté
        hydrateFiltersFromQuery(p.query);
      }
    }
  }
  // Expose pour la PARTIE 4
  window.handleRouteCatalogue_Extended = window.handleRouteCatalogue_Extended || handleRouteCatalogue_Extended;

  /* =========================================================
     D) CHARGEMENT PRODUITS + FILTRES
  ========================================================== */
  function ensureProductsLoaded(cb){
    function done(){ try{ cb(window.MODELS); }catch(_){ } }
    if (Array.isArray(window.MODELS) && window.MODELS.length) return done();
    if (typeof window.loadProducts==='function'){
      Promise.resolve(window.loadProducts()).then(function(){ done(); }).catch(function(){ done(); });
      return;
    }
    fetch('./products.json',{cache:'no-store'})
      .then(function(r){ return r.json(); })
      .then(function(json){ window.MODELS = Array.isArray(json) ? json : (json.products||[]); try{ window.dispatchEvent(new CustomEvent('pt:productsLoaded')); }catch(_){ } done(); })
      .catch(function(){ window.MODELS=[]; try{ window.dispatchEvent(new CustomEvent('pt:productsLoaded')); }catch(_){ } done(); });
  }

  function debounce(fn, wait){
    wait = (wait==null)?140:wait;
    var t=0; return function(){ var args=arguments; clearTimeout(t); t=setTimeout(function(){ fn.apply(null,args); }, wait); };
  }

  window.applyFilters = window.applyFilters || debounce(function(){
    syncDomRefs();
    var q = ((searchEl&&searchEl.value)||'').trim().toLowerCase();
    var t = ((tagEl&&tagEl.value)||'').trim().toLowerCase();
    var filtered = window.MODELS.filter(function(m){
      var hay = [
        window.fallback(m.title,''), window.fallback(m.sku,''), window.fallback(m.brand,''),
        window.fallback(m.category,''), window.fallback(m.desc, window.fallback(m.description,'')),
        (Array.isArray(m.tags)?m.tags.join(' '):''), window.fallback(m.badge,'')
      ].join(' ').toLowerCase();
      var okQ = !q || hay.indexOf(q)!==-1;
      var okT = !t || hay.indexOf(t)!==-1;
      return okQ && okT;
    });
    renderList(filtered);
  }, 120);

  function wireFilterInputs(){
    syncDomRefs();
    if (searchEl && !searchEl.__ptWired){ searchEl.__ptWired=1; searchEl.addEventListener('input', window.applyFilters, true); }
    if (tagEl && !tagEl.__ptWired){ tagEl.__ptWired=1; tagEl.addEventListener('change', window.applyFilters, true); }
  }

  function hydrateFiltersFromQuery(qs){
    if (!qs) return;
    syncDomRefs();
    var brand = (qs.brand||'').toString().toLowerCase();
    var type  = (qs.type || qs.tag || '').toString().toLowerCase();
    var q     = (qs.q || '').toString();
    var target = brand || type || '';
    if (target){
      var matchVal = findSelectMatch(tagEl, target);
      if (tagEl) tagEl.value = matchVal || '';
      if (searchEl) searchEl.value = matchVal ? '' : target;
      if (typeof window.applyFilters==='function') window.applyFilters();
      return;
    }
    if (q){
      if (searchEl) searchEl.value = q;
      if (tagEl) tagEl.value = '';
      if (typeof window.applyFilters==='function') window.applyFilters();
    }
  }

  /* =========================================================
     E) DEVIS — vue + actions
  ========================================================== */
  function renderCartView(){
    var wrap = document.getElementById('devisList'); if (!wrap) return;
    var grouped = groupCart();
    if (!grouped.length){
      wrap.innerHTML = '<p style="margin:0">Aucun article pour le moment.</p>';
    } else {
      wrap.innerHTML = grouped.map(function(g){
        var it=g.item||{}, qty=Number(g.qty||0), sku=it.sku||it.id||'';
        var title= it.title || ((it.brand||'')+' '+(it.sku||'')).trim();
        var key=keyOf(it);
        return '<div class="card">'+
                 '<div class="head"><h3 class="title">'+title+'</h3><span class="badge">'+sku+'</span></div>'+
                 '<div class="specs" style="display:flex;gap:.6rem;align-items:center">'+
                   '<button class="btn" data-dec="'+key+'" aria-label="Diminuer">−</button>'+
                   '<strong>'+qty+'</strong>'+
                   '<button class="btn" data-inc="'+key+'" aria-label="Augmenter">+</button>'+
                   '<button class="btn" data-del="'+key+'" style="margin-left:auto;background:rgba(255,255,255,.06);color:#d9e3ec" aria-label="Supprimer">Supprimer</button>'+
                 '</div>'+
               '</div>';
      }).join('');
    }

    if (!wrap.__wired){
      wrap.__wired=1;
      wrap.addEventListener('click', function(e){
        var inc = e.target && e.target.closest ? e.target.closest('[data-inc]') : null;
        var dec = e.target && e.target.closest ? e.target.closest('[data-dec]') : null;
        var del = e.target && e.target.closest ? e.target.closest('[data-del]') : null;

        if (inc){
          var k = inc.getAttribute('data-inc'); var p=null;
          for (var i=0;i<window.MODELS.length;i++){ if(keyOf(window.MODELS[i])===k){ p=window.MODELS[i]; break; } }
          if (p) window.CART.push(p); saveCart(); renderCartView(); return;
        }
        if (dec){
          var k2 = dec.getAttribute('data-dec'); var idx=-1;
          for (var j=0;j<window.CART.length;j++){ if (keyOf(window.CART[j])===k2){ idx=j; break; } }
          if (idx>=0) window.CART.splice(idx,1); saveCart(); renderCartView(); return;
        }
        if (del){
          var k3 = del.getAttribute('data-del');
          for (var m=window.CART.length-1;m>=0;m--) if (keyOf(window.CART[m])===k3) window.CART.splice(m,1);
          saveCart(); renderCartView(); return;
        }
      }, false);
    }

    var sendBtn = document.getElementById('devisSend');
    if (sendBtn && !sendBtn.__wired){
      sendBtn.__wired=1;
      sendBtn.addEventListener('click', function(){
        var msg = encodeURIComponent(cartToWhatsAppText()); if (!msg) return;
        window.open('https://wa.me/'+onlyDigits(PHONE_E164)+'?text='+msg, '_blank', 'noopener');
        window.toast('Devis ouvert dans WhatsApp','success'); window.announce('Devis ouvert dans WhatsApp');
      }, false);
    }
    var clearBtn = document.getElementById('devisClear');
    if (clearBtn && !clearBtn.__wired){
      clearBtn.__wired=1;
      clearBtn.addEventListener('click', function(){
        window.CART=[]; saveCart(); renderCartView();
        window.toast('Devis vidé','success'); window.announce('Devis vidé');
      }, false);
    }
  }
  window.renderCartView = window.renderCartView || renderCartView;

  /* =========================================================
     F) ROUTER — #/catalogue, #/produit/:id, #/devis
  ========================================================== */
  function showViewSafely(key){
    if (typeof window.showView==='function'){ try{ window.showView(key); return; }catch(_){ } }
    var ids=['view-home','view-catalogue','view-produit','view-devis','view-compte'];
    for (var i=0;i<ids.length;i++){ var el=document.getElementById(ids[i]); if(el) el.classList.add('hidden'); }
    var want=document.getElementById('view-'+key); if (want) want.classList.remove('hidden');
  }

  function route(){
    var parsed = window.parseHash();
    var view = parsed.view;
    var segs = parsed.path.split('/').slice(2); // après "#/"

    if (!view || view === 'home') return;

    if (view === 'catalogue'){
      showViewSafely('catalogue');
      ensureProductsLoaded(function(){
        // bootstrap minimal si nécessaire
        if (!document.getElementById('list')){
          var s = document.getElementById('view-catalogue');
          if (!s){
            s = document.createElement('section'); s.id='view-catalogue'; s.className='view';
            s.innerHTML = '<div class="container"><h1>Catalogue</h1><div id="catList" class="cat-list" style="margin-bottom:1rem"></div><div class="toolbar"><input id="q" class="search" type="search" placeholder="Rechercher (marque, réf, description…)"><select id="tag" class="select"><option value="">Tous</option></select></div><div id="list" class="list"></div></div>';
            document.body.appendChild(s);
          } else if (!s.querySelector('#list')){
            var d=document.createElement('div'); d.id='list'; d.className='list'; s.appendChild(d);
          }
        }
        syncDomRefs();
        updateTagSelectOptions();
        wireFilterInputs();
        renderCatalogue();
        if (parsed && parsed.query){ hydrateFiltersFromQuery(parsed.query); } else { renderList(window.MODELS); }
        window.focusView('catalogue');
      });
      return;
    }

    if (view === 'produit'){
      showViewSafely('produit');
      var key = decodeURIComponent(segs[0] || (parsed.query && parsed.query.id) || '');
      ensureProductsLoaded(function(){
        var p = findProductByKey(key);
        if (!p && window.MODELS.length){
          for (var i=0;i<window.MODELS.length;i++){ var m=window.MODELS[i]; if ((m.id||m.sku||m.title)==key){ p=m; break; } }
        }
        if (!p){
          var host=document.getElementById('view-produit');
          if (host) host.innerHTML = '<div class="container"><p>Produit introuvable. <a href="#/catalogue" class="chip chip--back">← Retour catalogue</a></p></div>';
          return;
        }
        renderPDP(p);
        window.focusView('produit');
      });
      return;
    }

    if (view === 'devis'){
      showViewSafely('devis');
      var v = document.getElementById('view-devis');
      if (!v){
        v=document.createElement('section'); v.id='view-devis'; v.className='view';
        v.innerHTML = '<div class="container"><h1 tabindex="-1">Devis</h1><div class="card"><div class="specs" id="devisList"></div><div class="actions"><button class="btn" id="devisClear">Vider</button><button class="btn primary" id="devisSend">Envoyer sur WhatsApp</button></div></div></div>';
        document.body.appendChild(v);
      }
      renderCartView(); window.focusView('devis');
      return;
    }
  }
  window.addEventListener('hashchange', route, false);

  // Rafraîchir la vue catalogue quand les produits arrivent
  window.addEventListener('pt:productsLoaded', function(){
    var p = window.parseHash();
    if (p.view === 'catalogue'){
      syncDomRefs(); updateTagSelectOptions(); wireFilterInputs();
      if (p && p.query) hydrateFiltersFromQuery(p.query); else renderList(window.MODELS);
      renderCatalogue();
    }
  }, false);

  document.addEventListener('DOMContentLoaded', function(){
    ensureProductsLoaded(function(models){
      if ((location.hash||'').indexOf('#/catalogue')===0){
        if (!document.getElementById('list')){
          var s=document.getElementById('view-catalogue');
          if (!s){
            s=document.createElement('section'); s.id='view-catalogue'; s.className='view';
            s.innerHTML = '<div class="container"><h1>Catalogue</h1><div id="catList" class="cat-list" style="margin-bottom:1rem"></div><div class="toolbar"><input id="q" class="search" type="search" placeholder="Rechercher (marque, réf, description…)"><select id="tag" class="select"><option value="">Tous</option></select></div><div id="list" class="list"></div></div>';
            document.body.appendChild(s);
          }
        }
        syncDomRefs(); updateTagSelectOptions(); wireFilterInputs(); renderCatalogue(); renderList(models);
      }
      route();
    });
  }, false);

  /* ---------- Dock: boutons → routes ---------- */
  (function wireDock(){
    var quoteBtn = document.getElementById('dockQuoteBtn');
    var cartBtn  = document.getElementById('dockCartBtn');
    var count    = document.getElementById('dockCount');
    if (quoteBtn && !quoteBtn.__ptWired){ quoteBtn.__ptWired=1; quoteBtn.addEventListener('click', function(){ location.hash = '#/devis'; }, false); }
    if (cartBtn  && !cartBtn.__ptWired){  cartBtn.__ptWired =1; cartBtn.addEventListener('click', function(){ location.hash = '#/devis'; }, false); }
    if (count    && !count.__ptWired){    count.__ptWired   =1; count.addEventListener('click',   function(){ location.hash = '#/devis'; }, false); }
  })();

  // Expose minimal API pour Parties 3–4
  window.renderCartView = window.renderCartView || renderCartView;
  window.renderPDP      = window.renderPDP      || renderPDP;
  window.renderList     = window.renderList     || renderList;

})();

/* =========================================================
   PARTIE 3 — Compte + Création de compte (local) + Fidélité
   - Route: #/compte
   - Persistance locale: USER_KEY (default: 'pt_user_v1')
   - Expose: window.loadUser / window.saveUser / window.computeTier / window.defaultUser
   - Intégration WhatsApp (cartToWhatsAppText lit loadUser)
   - ES5-safe, n'écrase pas les fonctions existantes
   - Compatible PARTIE 1 (accHello/accContent) & PARTIE 2 (devis)
========================================================= */
(function(){
  'use strict';

  /* ---------- Guards / compat ---------- */
  var USER_KEY   = window.USER_KEY   || 'pt_user_v1';
  var PHONE_E164 = window.PHONE_E164 || '+33774230195';

  if (typeof window.toast    !== 'function') window.toast    = function(){};
  if (typeof window.announce !== 'function') window.announce = function(){};

  if (typeof window.parseHash !== 'function'){
    window.parseHash = function(){
      var h = location.hash || '#/';
      var parts = h.split('?');
      var path  = parts[0] || '#/';
      var query = {};
      if (parts[1]){
        var kv = parts[1].split('&');
        for (var i=0;i<kv.length;i++){
          var s = kv[i].split('=');
          var k = decodeURIComponent(s[0]||'');
          var v = decodeURIComponent(s[1]||'');
          if (k) query[k] = v;
        }
      }
      return { path:path, view:path.replace('#/','').split('/')[0]||'', raw:h, query:query };
    };
  }

  if (typeof window.showView !== 'function'){
    window.showView = function(key){
      var ids = ['view-home','view-catalogue','view-produit','view-devis','view-compte'];
      for (var i=0;i<ids.length;i++){ var el=document.getElementById(ids[i]); if (el) el.classList.add('hidden'); }
      var want = document.getElementById('view-'+key); if (want) want.classList.remove('hidden');
    };
  }
  if (typeof window.focusView !== 'function') window.focusView = function(){};

  function onlyDigits(s){ return String(s||'').replace(/[^\d]/g,''); }

  /* =========================================================
     A) Modèle utilisateur (chargement / sauvegarde)
  ========================================================== */
  function defaultUser(){
    return {
      name:'', email:'', phone:'', addr:'',
      points:0, tier:'Bronze', newsletter:false
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
    }catch(_){ return defaultUser(); }
  }

  function saveUser(u){
    try{
      if (!u || typeof u !== 'object') return;
      u.name   = (u.name||'').trim();
      u.email  = (u.email||'').trim();
      u.phone  = (u.phone||'').trim();
      u.addr   = (u.addr||'').trim();
      u.points = Math.max(0, Math.round(+u.points||0));
      u.tier   = computeTier(u.points);

      localStorage.setItem(USER_KEY, JSON.stringify(u));
      try{ window.dispatchEvent(new CustomEvent('pt:userChanged', { detail:u })); }catch(_){}
      window.toast('Compte enregistré','success'); window.announce('Compte enregistré');
    }catch(_){}
  }

  // Expose global
  if (typeof window.loadUser    !== 'function') window.loadUser    = loadUser;
  if (typeof window.saveUser    !== 'function') window.saveUser    = saveUser;
  if (typeof window.computeTier !== 'function') window.computeTier = computeTier;
  if (typeof window.defaultUser !== 'function') window.defaultUser = defaultUser;

  /* =========================================================
     B) Vue & UI (création si absente)
  ========================================================== */
  function accountInnerHTML(){
    return ''
    + '<div class="card">'
    + '  <div class="head"><h3 class="title">Informations</h3><span class="badge">Profil</span></div>'
    + '  <div class="specs" style="display:grid;gap:.6rem">'
    + '    <label>Nom / Prénom<br><input id="accName" class="search" type="text" placeholder="Ex: Alex Pirate"></label>'
    + '    <label>Email<br><input id="accEmail" class="search" type="email" inputmode="email" placeholder="exemple@mail.com"></label>'
    + '    <label>Téléphone<br><input id="accPhone" class="search" type="tel" inputmode="tel" placeholder="+33 6…"></label>'
    + '    <label>Adresse<br><textarea id="accAddr" class="search" rows="2" placeholder="Adresse postale"></textarea></label>'
    + '    <label style="display:flex;align-items:center;gap:.5rem"><input id="accNews" type="checkbox"> S’abonner aux nouveautés</label>'
    + '  </div>'
    + '  <div class="actions">'
    + '    <button class="btn primary" id="accSave">Enregistrer</button>'
    + '    <button class="btn" id="accClear">Se déconnecter / Réinitialiser</button>'
    + '  </div>'
    + '</div>'
    + '<div class="card">'
    + '  <div class="head"><h3 class="title">Fidélité</h3><span class="badge">Avantages</span></div>'
    + '  <div class="specs">'
    + '    <div class="meter">'
    + '      <div class="meter__rail"><div id="accFill" class="meter__fill"></div><div id="accCursor" class="meter__cursor" style="left:0%"></div></div>'
    + '      <input id="accSlider" type="range" min="0" max="1000" step="10" value="0">'
    + '      <div class="meter__scale"><span id="accTier">Bronze</span><span><strong id="accPoints">0</strong> pts</span></div>'
    + '    </div>'
    + '  </div>'
    + '  <div class="actions">'
    + '    <button class="btn" id="accToDevis">Voir mon devis</button>'
    + '    <a class="btn btn-wa" id="accWA" target="_blank" rel="noopener">WhatsApp</a>'
    + '  </div>'
    + '</div>';
  }

  function ensureAccountView(){
    var view = document.getElementById('view-compte');
    if (!view){
      view = document.createElement('section');
      view.id = 'view-compte';
      view.className = 'view hidden';
      view.innerHTML =
        '<div class="container">'
      +   '<h1 tabindex="-1">Mon compte</h1>'
      +   '<p id="accHello" style="margin:.25rem 0 1rem;color:#9fb4c5">Bienvenue. Renseignez vos informations pour accélérer les devis.</p>'
      +   '<div id="accContent"></div>'
      + '</div>';
      document.body.appendChild(view);
    }
    var content = view.querySelector('#accContent');
    if (content){
      if (!content.__ptInjected){ content.__ptInjected = 1; content.innerHTML = accountInnerHTML(); }
    } else if (!view.querySelector('#accName')){
      var box = document.createElement('div'); box.innerHTML = accountInnerHTML(); view.appendChild(box);
    }
    return view;
  }

  /* =========================================================
     C) Binding + logique UI
  ========================================================== */
  function validateEmail(s){ s = String(s||'').trim(); return !!(s && s.indexOf('@')>0 && s.indexOf('.')>0); }

  function buildWAProfileLink(u){
    var base = 'Bonjour, voici mes coordonnées:'
      + '\n• Nom: '   + (u.name  || '')
      + '\n• Email: ' + (u.email || '')
      + (u.phone ? '\n• Tel: '   + u.phone : '')
      + (u.addr  ? '\n• Adresse: '+u.addr  : '')
      + '\n\nMerci.';
    return 'https://wa.me/' + onlyDigits(PHONE_E164) + '?text=' + encodeURIComponent(base);
  }

  function updateHello(u){
    var hello = document.getElementById('accHello'); if (!hello) return;
    var name = (u && u.name) ? (' ' + u.name) : '';
    hello.textContent = 'Bienvenue' + name + '. Gérez votre compte ou envoyez vos coordonnées via WhatsApp.';
  }

  function updateLoyaltyUI(u){
    var fill   = document.getElementById('accFill');
    var cursor = document.getElementById('accCursor');
    var slider = document.getElementById('accSlider');
    var tierEl = document.getElementById('accTier');
    var ptsEl  = document.getElementById('accPoints');

    var pts = Math.max(0, Math.round(+u.points||0));
    var max = +(slider && slider.max ? slider.max : 1000);
    var pct = Math.max(0, Math.min(100, (pts/(max||1))*100));

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
    updateHello(u);

    var wa = document.getElementById('accWA');
    if (wa) wa.href = buildWAProfileLink(u);
  }

  function grabUserFromForm(){
    var u = loadUser();
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
    if (slider)u.points = Math.max(0, parseInt(slider.value,10) || 0);

    u.tier = computeTier(u.points);
    return u;
  }

  function wireAccountEvents(){
    var saveBtn  = document.getElementById('accSave');
    var clearBtn = document.getElementById('accClear');
    var toDevis  = document.getElementById('accToDevis');
    var slider   = document.getElementById('accSlider');
    var inputs   = [document.getElementById('accName'), document.getElementById('accEmail'),
                    document.getElementById('accPhone'), document.getElementById('accAddr'), document.getElementById('accNews')];

    if (saveBtn && !saveBtn.__wired){
      saveBtn.__wired = 1;
      saveBtn.addEventListener('click', function(){
        var u = grabUserFromForm();
        if (u.email && !validateEmail(u.email)){
          window.toast('Email invalide', 'info'); try{ document.getElementById('accEmail').focus(); }catch(_){}
          return;
        }
        if (!u.name && u.email){ u.name = u.email.split('@')[0]; }
        saveUser(u); populateAccountForm(u);
      }, false);
    }

    if (clearBtn && !clearBtn.__wired){
      clearBtn.__wired = 1;
      clearBtn.addEventListener('click', function(){
        try{ localStorage.removeItem(USER_KEY); }catch(_){}
        var fresh = defaultUser(); populateAccountForm(fresh); saveUser(fresh);
        window.toast('Compte réinitialisé','success');
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
        var u = grabUserFromForm(); saveUser(u);
      }, false);
    }

    // met à jour le lien WhatsApp à la volée
    for (var i=0;i<inputs.length;i++){
      var el = inputs[i]; if (!el || el.__wired) continue; el.__wired = 1;
      var evt = (el.id === 'accNews') ? 'change' : 'input';
      el.addEventListener(evt, function(){
        var u = grabUserFromForm(); var wa=document.getElementById('accWA'); if (wa) wa.href = buildWAProfileLink(u);
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
     D) Router (#/compte)
  ========================================================== */
  function routeCompte(){
    var parsed = window.parseHash();
    if (parsed.view !== 'compte') return;

    if (typeof window.setPageMeta === 'function'){
      try{ window.setPageMeta('Mon compte • Pirates Tools', 'Gérez vos informations et avantages fidélité.'); }catch(_){}
    }

    window.showView('compte');
    renderAccountView();
    window.focusView('compte');
  }

  window.addEventListener('hashchange', routeCompte, false);

  document.addEventListener('DOMContentLoaded', function(){
    if ((location.hash||'').indexOf('#/compte') === 0){
      renderAccountView(); window.showView('compte'); window.focusView('compte');
    } else {
      ensureAccountView(); // prépare la section pour un futur accès
    }
  }, false);

  // Optionnel: bouton externe vers le compte
  var goAccountBtn = document.getElementById('goAccountBtn');
  if (goAccountBtn && !goAccountBtn.__wired){
    goAccountBtn.__wired = 1;
    goAccountBtn.addEventListener('click', function(){ location.hash = '#/compte'; }, false);
  }

  // Rafraîchit l’UI si le profil change ailleurs (autre onglet)
  if (!window.__ptUserChangeWired){
    window.__ptUserChangeWired = 1;
    window.addEventListener('pt:userChanged', function(e){
      try{ populateAccountForm(e && e.detail ? e.detail : loadUser()); }catch(_){}
    }, false);
  }
})();

/* =========================================================
   PARTIE 4 — Router principal + Vues fail-safe + SEO
   - Crée/synchronise: #/ (home), #/catalogue, #/produit/:id, #/devis, #/compte
   - Ne duplique rien: n’override pas vos fonctions existantes
   - Attend les produits si nécessaire avant de rendre la PDP
   - ES5-safe (pas d’arrows, pas d’optional chaining)
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
      var ids = ['view-home','view-catalogue','view-produit','view-devis','view-compte','view-login','view-register'];
      for (var i=0;i<ids.length;i++){ var el = D.getElementById(ids[i]); if (el) el.classList.add('hidden'); }
      var want = D.getElementById('view-'+key);
      if (want) want.classList.remove('hidden');
    };
  }
  if (typeof W.focusView !== 'function') {
    W.focusView = function(key){
      var id = key ? ('view-' + key) : null;
      var scope = id ? D.getElementById(id) : null;
      var h1 = scope ? scope.querySelector('h1') : null;
      if (h1){
        h1.setAttribute('tabindex','-1');
        try{ h1.focus({preventScroll:true}); }catch(_){}
        setTimeout(function(){ h1.removeAttribute('tabindex'); }, 280);
      }
    };
  }

  // SEO helpers (n’override pas s’ils existent déjà)
  if (typeof W.setPageMeta !== 'function') {
    W.setPageMeta = function(title, desc){
      try{
        if (title) document.title = String(title);
        var mDesc = D.querySelector('meta[name="description"]');
        if (!mDesc){ mDesc = D.createElement('meta'); mDesc.setAttribute('name','description'); D.head.appendChild(mDesc); }
        if (desc!=null) mDesc.setAttribute('content', String(desc));

        var ogT = D.querySelector('meta[property="og:title"]');
        if (!ogT){ ogT = D.createElement('meta'); ogT.setAttribute('property','og:title'); D.head.appendChild(ogT); }
        ogT.setAttribute('content', document.title || '');

        var ogD = D.querySelector('meta[property="og:description"]');
        if (!ogD){ ogD = D.createElement('meta'); ogD.setAttribute('property','og:description'); D.head.appendChild(ogD); }
        ogD.setAttribute('content', (desc || ''));

        var ogU = D.querySelector('meta[property="og:url"]');
        if (!ogU){ ogU = D.createElement('meta'); ogU.setAttribute('property','og:url'); D.head.appendChild(ogU); }
        ogU.setAttribute('content', location.href);
      }catch(_){}
    };
  }
  if (typeof W.resetPageMeta !== 'function') {
    W.resetPageMeta = function(){
      try{
        document.title = 'Pirates Tools';
        var mDesc = D.querySelector('meta[name="description"]');
        if (mDesc) mDesc.setAttribute('content','Outils professionnels : catalogue, devis rapide et conseils.');
        W.setPageMeta(document.title, (mDesc && mDesc.getAttribute('content')) || '');
      }catch(_){}
    };
  }
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
    var view = D.getElementById('view-produit');
    if (view) return view;
    view = D.createElement('section');
    view.id = 'view-produit';
    view.className = 'view hidden';
    view.innerHTML =
      '<div id="pdp" class="container pdp">'+
        '<a class="chip chip--back" href="#/catalogue" aria-label="Retour au catalogue">← Retour</a>'+
        '<div class="pdp__grid">'+
          '<div class="pdp__media"><img id="pdpImg" alt=""></div>'+
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

  // Login / Register (fail-safe minimal)
  function ensureAuthViews(){
    var v1 = D.getElementById('view-login');
    if (!v1){
      v1 = D.createElement('section'); v1.id='view-login'; v1.className='view hidden';
      v1.innerHTML =
        '<div class="container">'+
          '<h1 tabindex="-1">Connexion</h1>'+
          '<form id="loginForm" style="display:grid;gap:.6rem;max-width:420px">'+
            '<label>Email<input id="loginEmail" class="search" type="email" autocomplete="email"></label>'+
            '<label>Mot de passe<input id="loginPwd" class="search" type="password" autocomplete="current-password"></label>'+
            '<div class="actions"><button class="btn primary" type="submit">Se connecter</button>'+
            '<a class="btn" href="#/register">Créer un compte</a></div>'+
          '</form>'+
        '</div>';
      D.body.appendChild(v1);
    }
    var v2 = D.getElementById('view-register');
    if (!v2){
      v2 = D.createElement('section'); v2.id='view-register'; v2.className='view hidden';
      v2.innerHTML =
        '<div class="container">'+
          '<h1 tabindex="-1">Créer un compte</h1>'+
          '<form id="registerForm" style="display:grid;gap:.6rem;max-width:420px">'+
            '<label>Nom<input id="regName" class="search" type="text" autocomplete="name"></label>'+
            '<label>Email<input id="regEmail" class="search" type="email" autocomplete="email"></label>'+
            '<label>Mot de passe<input id="regPwd" class="search" type="password" autocomplete="new-password" minlength="6"></label>'+
            '<div class="actions"><button class="btn primary" type="submit">Créer</button>'+
            '<a class="btn" href="#/login">J’ai déjà un compte</a></div>'+
          '</form>'+
        '</div>';
      D.body.appendChild(v2);
    }
  }

  // S’assure que les vues minimales existent
  ensureHomeView();
  ensureCatalogueView();
  ensureProduitView();
  ensureDevisView();
  ensureAuthViews();

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
    if (typeof W.loadProducts === 'function') {
      try{
        var p = W.loadProducts();
        if (p && typeof p.then === 'function') {
          p.then(function(){ try{ cb(); }catch(_){}; }).catch(function(){ try{ cb(); }catch(_){}; });
          return;
        }
      }catch(_){}
    }
    // Dernier recours: attendre l’event pt:productsLoaded
    var once = function(){
      W.removeEventListener('pt:productsLoaded', once);
      try{ cb(); }catch(_){}
    };
    W.addEventListener('pt:productsLoaded', once);
  }

  // Remplit <select id="tag"> avec des tags/brands/categories (si vide)
  function hydrateTagSelect(){
    var sel = D.getElementById('tag');
    if (!sel || sel.__ptHydrated) return;
    var seen = {};
    var add = function(lbl){
      lbl = (lbl==null?'':String(lbl)).trim();
      if (!lbl) return;
      var key = lbl.toLowerCase();
      if (seen[key]) return; seen[key] = 1;
      var opt = D.createElement('option'); opt.value = lbl; opt.textContent = lbl;
      sel.appendChild(opt);
    };
    var i, m;
    for (i=0;i<(W.MODELS||[]).length;i++){
      m = W.MODELS[i]||{};
      add(m.brand);
      add(m.category);
      add(m.badge);
      if (m.tags && m.tags.length){ for (var j=0;j<m.tags.length;j++){ add(m.tags[j]); } }
    }
    sel.__ptHydrated = true;
  }

  /* =========================================================
     C) Router principal
  ========================================================== */
  function renderHome(){
    W.showView('home');
    if (typeof W.resetPageMeta === 'function') W.resetPageMeta();
    withProducts(function(){
      try{
        if (W.PT && typeof W.PT.renderBrandGridFromProducts === 'function') {
          W.PT.renderBrandGridFromProducts(W.MODELS||[]);
        }
      }catch(_){}
    });
    W.focusView('home');
  }

  function renderCatalogueRoute(){
    ensureCatalogueView();
    W.showView('catalogue');
    if (typeof W.resetPageMeta === 'function') W.resetPageMeta();
    withProducts(function(){
      try{ hydrateTagSelect(); }catch(_){}
      if (typeof W.handleRouteCatalogue_Extended === 'function') {
        try { W.handleRouteCatalogue_Extended(); } catch(_){}
      }
    });
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
          if (wrap.scrollIntoView) wrap.scrollIntoView({behavior:'smooth', block:'start'});
          var box = D.createElement('div');
          box.className = 'card';
          box.innerHTML =
            '<div class="head"><h3 class="title">Produit introuvable</h3></div>'+
            '<div class="specs"><p style="margin:0">Référence inconnue. <a href="#/catalogue" class="chip chip--back">← Retour catalogue</a></p></div>';
          var container = wrap.querySelector('.container') || wrap;
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
    if (v === 'compte') {               // compte est géré par PARTIE 3
      var s = D.getElementById('view-compte') ? 'compte' : 'home';
      W.showView(s);
      return;
    }
    if (v === 'login'){ W.showView('login'); W.focusView('login'); return; }
    if (v === 'register'){ W.showView('register'); W.focusView('register'); return; }

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
      var go = function(e){ if (e && e.preventDefault) e.preventDefault(); location.hash=''; if (W.scrollTo){ W.scrollTo({top:0,behavior:'smooth'}); } };
      logo.addEventListener('click', go, false);
      logo.addEventListener('pointerup', function(e){ if (e && e.pointerType==='touch') go(e); }, false);
    }
  })();
})();

/* ===== Auth (front-only) : vues #/login & #/register =====
   - ES5-safe
   - Utilise saveUser/loadUser globaux si déjà exposés par la PARTIE 3
========================================================= */
(function(){
  'use strict';
  var D = document;

  function qs(s, r){ return (r||D).querySelector(s); }
  function qsa(s, r){ return Array.prototype.slice.call((r||D).querySelectorAll(s)); }

  function showView(id){
    var views = qsa('.view');
    for (var i=0;i<views.length;i++){ views[i].classList.add('hidden'); }
    var v = qs(id);
    if (v){
      v.classList.remove('hidden');
      var h1 = qs('h1', v);
      if (h1){ h1.setAttribute('tabindex','-1'); try{ h1.focus({preventScroll:true}); }catch(_){ } }
    }
  }

  // Fallbacks si PARTIE 3 absente
  function _fallbackSaveUser(u){ try{ localStorage.setItem('pt_user_v1', JSON.stringify(u)); }catch(_){ } }
  function _fallbackLoadUser(){ try{ var r=localStorage.getItem('pt_user_v1'); return r?JSON.parse(r):null; }catch(_){ return null; } }
  function saveUser(u){ return (typeof window.saveUser==='function') ? window.saveUser(u) : _fallbackSaveUser(u); }
  function loadUser(){ return (typeof window.loadUser==='function') ? window.loadUser() : (_fallbackLoadUser() || {}); }

  function onLoginSubmit(e){
    if (e && e.preventDefault) e.preventDefault();
    var emailEl = qs('#loginEmail'); var pwdEl = qs('#loginPwd');
    var email = emailEl && emailEl.value ? String(emailEl.value) : '';
    var pwd   = pwdEl   && pwdEl.value   ? String(pwdEl.value)   : '';
    if (!email || email.indexOf('@')===-1 || !pwd){
      if (window.toast) window.toast('Identifiants invalides', 'info');
      return;
    }
    var u = loadUser() || {};
    u.email = email;
    if (!u.name){ u.name = email.split('@')[0]; }
    saveUser(u);
    if (window.toast)   window.toast('Connecté', 'success');
    if (window.announce)window.announce('Connecté');
    location.hash = '#/compte';
  }

  function onRegisterSubmit(e){
    if (e && e.preventDefault) e.preventDefault();
    var nameEl  = qs('#regName');
    var emailEl = qs('#regEmail');
    var pwdEl   = qs('#regPwd');

    var name  = nameEl  && nameEl.value  ? String(nameEl.value)  : '';
    var email = emailEl && emailEl.value ? String(emailEl.value) : '';
    var pwd   = pwdEl   && pwdEl.value   ? String(pwdEl.value)   : '';

    if (!name || !email || email.indexOf('@')===-1 || !pwd || pwd.length<6){
      if (window.toast) window.toast('Veuillez remplir tous les champs (MDP ≥ 6)', 'info');
      return;
    }
    var u = loadUser() || {};
    u.name  = name; u.email = email;
    saveUser(u);
    if (window.toast) window.toast('Compte créé (mode démo)', 'success');
    location.hash = '#/compte';
  }

  function wireAuthForms(){
    var lf = qs('#loginForm');    if (lf && !lf.__wired){ lf.__wired=1; lf.addEventListener('submit', onLoginSubmit, false); }
    var rf = qs('#registerForm'); if (rf && !rf.__wired){ rf.__wired=1; rf.addEventListener('submit', onRegisterSubmit, false); }
  }

  function onHash(){
    var h = (location.hash||'').toLowerCase();
    if (h.indexOf('#/login')===0){ wireAuthForms(); showView('#view-login'); return; }
    if (h.indexOf('#/register')===0){ wireAuthForms(); showView('#view-register'); return; }
  }

  window.addEventListener('hashchange', onHash, false);
  document.addEventListener('DOMContentLoaded', function(){ wireAuthForms(); onHash(); }, false);
})();

/* --- Compat form id (#accForm | #accountForm) + save btn (ES5) --- */
(function () {
  'use strict';
  var D = document;
  function qs(s, r){return (r||D).querySelector(s);}
  function on(el, ev, fn){ if (el && !el.__w){ el.__w=1; el.addEventListener(ev, fn, false);} }

  // Utilise saveUser global si dispo (PARTIE 3), sinon fallback local
  function _fallbackSaveUser(u){ try{ localStorage.setItem('pt_user_v1', JSON.stringify(u)); }catch(_){ } }
  function saveUser(u){ return (typeof window.saveUser==='function') ? window.saveUser(u) : _fallbackSaveUser(u); }

  var form = qs('#accForm') || qs('#accountForm');
  var btnSave = qs('#accSave');

  function saveLocal(){
    var nameEl  = qs('#accName');
    var emailEl = qs('#accEmail');
    var u = {
      name:  nameEl  && nameEl.value  ? String(nameEl.value).trim()  : '',
      email: emailEl && emailEl.value ? String(emailEl.value).trim() : ''
    };
    saveUser(u);
  }

  if (form)   on(form,   'submit', function(e){ if (e && e.preventDefault) e.preventDefault(); saveLocal(); });
  if (btnSave)on(btnSave,'click',  function(e){ if (e && e.preventDefault) e.preventDefault(); saveLocal(); });
})();


/* =========================================================
   PARTIE 5/4 — Nav fiable + FAB Compte + Hero polish + Grille 3 colonnes
   - Ferme le menu automatiquement (clic + hashchange)
   - Mappe menu & dock → routes (#/, #/catalogue, #/devis, #/compte, tel, WhatsApp)
   - Ajoute un FAB Compte (bas-droite) persistant
   - Hero : raccord fondu + rendu net iPad (sans rebrancher l’anim de la Partie 1)
   - Home : grille marques en 3 colonnes, bulles “en suspension”
   - ES5-safe, défensif, pas de double wiring (flags __ptP5*)
========================================================= */
(function(){
  'use strict';
  if (window.__ptP5Booted) return; window.__ptP5Booted = 1;

  var D = document, W = window;
  var PHONE_E164 = W.PHONE_E164 || '+33774230195';

  /* ---------------- Helpers ---------------- */
  function qs(s, r){ return (r||D).querySelector(s); }
  function qsa(s, r){ return Array.prototype.slice.call((r||D).querySelectorAll(s)); }
  function onlyDigits(s){ return String(s||'').replace(/[^\d]/g,''); }
  function hasClass(el, c){ return el && el.classList && el.classList.contains(c); }
  function addClass(el, c){ if (el && el.classList) el.classList.add(c); }
  function rmClass(el, c){ if (el && el.classList) el.classList.remove(c); }

  /* ---------------- CSS d’appoint (injection non destructive) ---------------- */
  (function injectP5CSS(){
    if (D.getElementById('pt-p5-style')) return;
    var s = D.createElement('style'); s.id='pt-p5-style';
    s.textContent =
      /* Hero : raccord fondu + rendu net iPad */
      '#hero .hero-fade{position:absolute;inset:auto 0 0 0;height:28vh;' +
      'background:linear-gradient(180deg, rgba(10,15,20,0), rgba(10,15,20,.90) 62%, var(--bg, #0a0f14) 100%);pointer-events:none;z-index:-1}' +
      '#heroLogo{image-rendering:-webkit-optimize-contrast;backface-visibility:hidden;-webkit-backface-visibility:hidden;' +
      'will-change:transform,opacity;transform:translateZ(0);}' +
      /* Home : grille marques 3 colonnes fixes + bulles suspendues */
      '#view-home #brandGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vmin,18px);' +
      'padding:0 clamp(10px,2vmin,16px);margin-top:calc(var(--listGap,18vh) * 0.35)}' +
      '#view-home .brand{display:flex;flex-direction:column;align-items:center;gap:.5rem;background:transparent;border:0;cursor:pointer}' +
      '#view-home .brand__bubble{display:grid;place-items:center;aspect-ratio:1/1;width:clamp(86px,22vmin,140px);' +
      'border-radius:50%;background:rgba(255,255,255,.02);box-shadow:0 10px 24px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.06);' +
      'backdrop-filter:saturate(120%) blur(4px)}' +
      '#view-home .brand__logo{max-width:70%;max-height:70%;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,.35))}' +
      '#view-home .brand__label{color:#cfe3f0;opacity:.95;font-weight:600;font-size:.95rem}' +
      /* FAB Compte (bas droite) */
      '#fabAccount{position:fixed;right:clamp(12px,2.4vmin,18px);bottom:clamp(12px,2.4vmin,18px);' +
      'z-index:1000;border:0;border-radius:999px;padding:.9rem 1.05rem;background:linear-gradient(135deg,#19d3ff,#49f2c2);' +
      'color:#001018;font-weight:800;box-shadow:0 10px 30px rgba(0,0,0,.45);cursor:pointer;display:inline-flex;align-items:center;gap:.55rem}' +
      '#fabAccount .ico{width:20px;height:20px;display:inline-block;filter:drop-shadow(0 1px 0 rgba(255,255,255,.35))}' +
      '#fabAccount:hover{transform:translateY(-2px)}' +
      '#fabAccount:active{transform:translateY(0)}' +
      '@media (pointer:coarse){#fabAccount{padding:1rem 1.15rem}}';
    D.head.appendChild(s);
  })();

  /* ---------------- Menu (drawer) : toggle + auto-close ---------------- */
  function p5CloseDrawer(){
    try{
      var body = D.body;
      var drawer = qs('#drawer') || qs('#sideMenu') || qs('.drawer') || qs('[data-drawer]');
      var overlay= qs('#drawerBackdrop') || qs('#menuBackdrop') || qs('.drawer__backdrop') || qs('.backdrop');
      var flags  = ['open','is-open','active','visible','shown','menu-open','drawer-open'];
      var i;
      if (body) for (i=0;i<flags.length;i++) rmClass(body, flags[i]);
      if (drawer) for (i=0;i<flags.length;i++) rmClass(drawer, flags[i]);
      if (overlay){ addClass(overlay,'hidden'); overlay.style.display='none'; }
      var burger = qs('#menuBtn') || qs('.hamburger') || qs('.menu-toggle');
      if (burger) burger.setAttribute('aria-expanded','false');
    }catch(_){}
  }
  function p5OpenDrawer(){
    var body = D.body;
    var drawer = qs('#drawer') || qs('#sideMenu') || qs('.drawer') || qs('[data-drawer]');
    var overlay= qs('#drawerBackdrop') || qs('#menuBackdrop') || qs('.drawer__backdrop') || qs('.backdrop');
    if (drawer) addClass(drawer,'open');
    if (body) addClass(body,'menu-open');
    if (overlay){ rmClass(overlay,'hidden'); overlay.style.display=''; }
    var burger = qs('#menuBtn') || qs('.hamburger') || qs('.menu-toggle');
    if (burger) burger.setAttribute('aria-expanded','true');
  }
  function wireDrawer(){
    var drawer = qs('#drawer') || qs('#sideMenu') || qs('.drawer') || qs('[data-drawer]');
    var toggle = qs('#menuBtn') || qs('.hamburger') || qs('.menu-toggle') || qs('[data-menu-toggle]');
    var backdrop = qs('#drawerBackdrop') || qs('#menuBackdrop') || qs('.drawer__backdrop') || qs('.backdrop');

    if (toggle && !toggle.__ptP5){
      toggle.__ptP5 = 1;
      toggle.addEventListener('click', function(e){ if(e) e.preventDefault(); (hasClass(D.body,'menu-open')||hasClass(drawer,'open'))?p5CloseDrawer():p5OpenDrawer(); }, false);
      toggle.addEventListener('pointerup', function(e){ if (e && e.pointerType==='touch'){ e.preventDefault(); (hasClass(D.body,'menu-open')||hasClass(drawer,'open'))?p5CloseDrawer():p5OpenDrawer(); } }, false);
    }
    if (backdrop && !backdrop.__ptP5){
      backdrop.__ptP5 = 1;
      backdrop.addEventListener('click', p5CloseDrawer, false);
    }
    if (drawer && !drawer.__ptP5){
      drawer.__ptP5 = 1;
      drawer.addEventListener('click', function(e){
        var a = e.target && e.target.closest ? e.target.closest('a,[data-nav],[data-route],[role="menuitem"]') : null;
        if (a){ setTimeout(p5CloseDrawer, 30); }
      }, false);
    }
    W.addEventListener('hashchange', function(){ setTimeout(p5CloseDrawer,0); }, false);
  }

  /* ---------------- Routing helpers ---------------- */
  function go(dest){
    if (!dest) return;
    if (dest.indexOf('#/')===0){ location.hash = dest; return; }
    if (dest === 'phone'){ try{ location.href='tel:'+onlyDigits(PHONE_E164); }catch(_){ W.open('tel:'+onlyDigits(PHONE_E164),'_self'); } return; }
    if (dest==='wa' || dest==='whatsapp'){
      var text = (typeof W.cartToWhatsAppText==='function' && (W.CART||[]).length) ? W.cartToWhatsAppText() : ('Bonjour, je souhaite un devis.\n\nLien: '+location.origin+location.pathname+'#/devis\n\nMerci.');
      W.open('https://wa.me/'+onlyDigits(PHONE_E164)+'?text='+encodeURIComponent(text), '_blank', 'noopener');
    }
  }
  function attachNav(el){
    if (!el || el.__ptP5) return; el.__ptP5 = 1;
    el.addEventListener('click', function(e){
      var r = el.getAttribute('data-nav') || el.getAttribute('data-route') || el.getAttribute('href') || '';
      var t = (el.getAttribute('aria-label') || el.title || el.textContent || '').toLowerCase();
      function mapByText(){
        if (t.indexOf('accueil')>-1 || t==='home') return '#/';
        if (t.indexOf('catalogue')>-1) return '#/catalogue';
        if (t.indexOf('devis')>-1 || t.indexOf('panier')>-1) return '#/devis';
        if (t.indexOf('compte')>-1 || t.indexOf('profil')>-1) return '#/compte';
        if (t.indexOf('whatsapp')>-1 || t.indexOf('message')>-1 || t.indexOf('chat')>-1) return 'wa';
        if (t.indexOf('appel')>-1 || t.indexOf('phone')>-1 || t.indexOf('téléphone')>-1) return 'phone';
        return '';
      }
      var dest = r ? r : mapByText();
      if (!dest) return;
      if (dest.indexOf('#/')===0){ e.preventDefault(); go(dest); }
      else if (dest==='wa' || dest==='whatsapp' || dest==='phone'){ e.preventDefault(); go(dest); }
    }, false);
  }

  /* ---------------- Menu & Dock wiring ---------------- */
  function wireDrawerLinks(){
    var drawer = qs('#drawer') || qs('#sideMenu') || qs('.drawer') || qs('[data-drawer]');
    if (!drawer) return;
    var items = qsa('a,button,[role="menuitem"]', drawer);
    for (var i=0;i<items.length;i++){
      var it = items[i];
      if (!it.getAttribute('href') && !it.getAttribute('data-nav') && !it.getAttribute('data-route')){
        var txt = (it.textContent||'').toLowerCase();
        if (txt.indexOf('accueil')>-1 || txt==='home') it.setAttribute('href','#/');
        else if (txt.indexOf('catalogue')>-1) it.setAttribute('href','#/catalogue');
        else if (txt.indexOf('devis')>-1 || txt.indexOf('panier')>-1) it.setAttribute('href','#/devis');
        else if (txt.indexOf('compte')>-1 || txt.indexOf('profil')>-1) it.setAttribute('href','#/compte');
        else if (txt.indexOf('whatsapp')>-1 || txt.indexOf('message')>-1) it.setAttribute('data-nav','wa');
        else if (txt.indexOf('appel')>-1 || txt.indexOf('phone')>-1 || txt.indexOf('téléphone')>-1) it.setAttribute('data-nav','phone');
      }
      attachNav(it);
    }
  }
  function wireDock(){
    var dock = qs('#dock'); if (!dock) return;
    var btns = qsa('a,button,[data-go],[data-route]', dock);
    var i, b, t;
    for (i=0;i<btns.length;i++){
      b = btns[i];
      if (!b.getAttribute('data-nav') && !b.getAttribute('data-route')){
        t = (b.getAttribute('aria-label') || b.title || b.textContent || '').toLowerCase();
        if (t.indexOf('catalogue')>-1 || t.indexOf('outils')>-1 || t.indexOf('tools')>-1) b.setAttribute('data-route','#/catalogue');
        else if (t.indexOf('devis')>-1 || t.indexOf('panier')>-1 || t.indexOf('cart')>-1) b.setAttribute('data-route','#/devis');
        else if (t.indexOf('compte')>-1 || t.indexOf('profil')>-1) b.setAttribute('data-route','#/compte');
        else if (t.indexOf('whatsapp')>-1 || t.indexOf('chat')>-1 || t.indexOf('message')>-1) b.setAttribute('data-nav','wa');
        else if (t.indexOf('appel')>-1 || t.indexOf('phone')>-1 || t.indexOf('téléphone')>-1) b.setAttribute('data-nav','phone');
      }
      attachNav(b);
    }
    // Sécurité : IDs connus → data-route
    var map = { dockToolsBtn:'#/catalogue', dockCartBtn:'#/devis', dockAccountBtn:'#/compte', homeLink:'#/' };
    for (var k in map){ var el = D.getElementById(k); if (el && !el.getAttribute('data-route')) el.setAttribute('data-route', map[k]); attachNav(el); }
  }

  /* ---------------- FAB Compte (toujours présent) ---------------- */
  function ensureFabAccount(){
  if (document.getElementById('fabAccount')) return;
  // Si un bouton compte existe dans le dock, on ne crée PAS le FAB.
  if (document.querySelector('#dock .dock__btn--account')) return;

  var btn = document.createElement('button');
  btn.id = 'fabAccount';
  btn.type = 'button';
  btn.setAttribute('aria-label','Mon compte');
  btn.innerHTML = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"/></svg><span>Compte</span>';
  btn.addEventListener('click', function(){ location.hash = '#/compte'; }, false);
  document.body.appendChild(btn);
}

// Si le dock a déjà un bouton Compte, on supprime un éventuel FAB existant
(function killFabIfDockHasAccount(){
  var fab = document.getElementById('fabAccount');
  if (fab && document.querySelector('#dock .dock__btn--account')) fab.remove();
})();
   
  /* ---------------- Hero polish : assure le fade + rend net ---------------- */
  function polishHero(){
    var hero = qs('#hero'); if (!hero) return;
    // injecte le fade si pas présent (sans toucher à l’anim existante)
    if (!qs('.hero-fade', hero)){
      var f = D.createElement('div'); f.className='hero-fade'; hero.appendChild(f);
    }
    var logo = qs('#heroLogo');
    if (logo){
      // haute définition : si ton PNG existe en @2x, tu peux le setter ici si nécessaire
      // (on laisse la source actuelle, mais on force un rendu net)
      logo.style.imageRendering = '-webkit-optimize-contrast';
      logo.style.backfaceVisibility = 'hidden';
      logo.style.webkitBackfaceVisibility = 'hidden';
      logo.style.transform = 'translateZ(0)';
      // s’assurer du fade-in si la classe n’a pas été posée
      if (logo.complete) setTimeout(function(){ addClass(logo,'on'); }, 0);
      else logo.addEventListener('load', function(){ addClass(logo,'on'); }, { once:true });
    }
  }

  /* ---------------- Compte : route & fallback minimal si besoin ---------------- */
  function ensureAccountView(){
    if (D.getElementById('view-compte')) return;
    var v = D.createElement('section');
    v.id = 'view-compte'; v.className='view hidden';
    v.innerHTML = '<div class="container"><h1 tabindex="-1">Mon compte</h1><div id="accContent"><div class="card"><div class="specs"><p>Chargement…</p></div></div></div></div>';
    D.body.appendChild(v);
  }

  /* ---------------- Boot ---------------- */
  function boot(){
    wireDrawer();
    wireDrawerLinks();
    wireDock();
    ensureFabAccount();
    polishHero();
    ensureAccountView();
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot, false);
  else boot();

})();

/* =========================================================
   PARTIE 6/4 — Héro overshoot + Gestes mobile + Focus H1 + Actifs + Fallback compte
   - ES5-safe, défensif, aucun double wiring
   - IMPORTANT: ce bloc remplace l'ancien + neutralise le "BLOC 7" s'il était injecté
========================================================= */
(function(){
  'use strict';
  if (window.__ptP6Booted) return; window.__ptP6Booted = 1;

  var W = window, D = document;

  /* ---- Neutralisation douce de l'ancien "BLOC 7" s'il existe ---- */
  (function neutralizeOldBlock7(){
    try{
      // drapeau global éventuel
      if (W.__ptP7Booted) W.__ptP7Booted = 0;
      if (W.__ptBlock7Enabled) W.__ptBlock7Enabled = 0;

      // retire un style/banière potentiellement injectés par l’ancien bloc
      var ids = ['pt-block7-css','block7-css','updateBanner','ptLegacyHeroCSS'];
      for (var i=0;i<ids.length;i++){
        var el = D.getElementById(ids[i]);
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }
    }catch(_){}
  })();

  /* ---------------- Helpers ---------------- */
  function qs(s, r){ return (r||D).querySelector(s); }
  function qsa(s, r){ return Array.prototype.slice.call((r||D).querySelectorAll(s)); }
  function addClass(el, c){ if (el && el.classList) el.classList.add(c); }
  function rmClass(el, c){ if (el && el.classList) el.classList.remove(c); }
  function hasClass(el, c){ return el && el.classList && el.classList.contains(c); }

  /* =========================================================
     1) HÉRO — overshoot doux + blur AVANT fade + disparition rapide
     • plus progressif
     • le logo passe derrière tôt (libère les bulles)
     • z-index / pointer-events gérés automatiquement
  ========================================================== */
  (function heroEffectOvershoot(){
    'use strict';
    // Anti double-wiring
    if (W.__ptHeroWired2) return;
    W.__ptHeroWired2 = 1;

    var hero = D.getElementById('hero') || qs('.hero-full');
    var logo = D.getElementById('heroLogo') || qs('.hero-logo');
    if (!hero || !logo) return;

    // CSS de secours pour le fondu interne, si la feuille principale manque
    (function injectHeroFadeCSS(){
      if (D.getElementById('pt-hero-fade-css')) return;
      var s = D.createElement('style'); s.id = 'pt-hero-fade-css';
      s.textContent = '' +
        '.hero-fade{position:absolute;inset:auto 0 0 0;height:38vh;pointer-events:none;' +
        'background:linear-gradient(to bottom, rgba(10,15,20,0) 0%, rgba(10,15,20,.75) 60%, rgba(10,15,20,1) 100%);}';
      D.head.appendChild(s);
    })();

    // Qualité image + rendu (sans casser le loader)
    try{
      if (logo.tagName === 'IMG') {
        if (!logo.getAttribute('srcset')){
          // garde compatible GH Pages / chemins relatifs
          logo.setAttribute('srcset',
            './icons/icon-180.png 180w, '+
            './icons/icon-192.png 192w, '+
            './icons/icon-256.png 256w, '+
            './icons/icon-384.png 384w, '+
            './icons/icon-512.png 512w'
          );
        }
        if (!logo.getAttribute('sizes')){
          logo.setAttribute('sizes','min(62vmin, 560px)');
        }
        logo.decoding = 'async';
        logo.loading  = 'eager';
        logo.referrerPolicy = 'no-referrer';
        logo.onerror = function(){
          this.onerror=null;
          this.src = (W.IMG_FALLBACK || './images/pirates-tools-logo.png?v=7');
        };
      }
      logo.style.willChange = 'transform,opacity,filter';
      logo.style.backfaceVisibility = 'hidden';
      logo.style.webkitBackfaceVisibility = 'hidden';
      logo.style.transform = 'translateZ(0)';
      logo.style.transformOrigin = '50% 50%';
    }catch(_){}

    // Fond dégradé interne si manquant
    if (!hero.querySelector('.hero-fade')){
      var f = D.createElement('div'); f.className = 'hero-fade'; f.setAttribute('aria-hidden','true'); hero.appendChild(f);
    }

    // Respect “réduction animations”
    var mqr = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)');
    if (mqr && mqr.matches){
      var t0 = 'translate3d(0,0,0) scale(1)';
      logo.style.transform = t0;
      logo.style.webkitTransform = t0;
      logo.style.opacity = '1';
      logo.style.filter  = 'none';
      try{ logo.classList.add('on'); }catch(_){}
      addClass(hero,'hero-out'); addClass(D.body,'after-hero');
      hero.style.zIndex = -1; hero.style.pointerEvents = 'none';
      D.documentElement.style.setProperty('--listGap', '0vh');
      return;
    }

    /* ===== Réglages =====
       - BLUR démarre AVANT FADE
       - SCALE “léger mais rapide au début”
       - DONE bas → bascule derrière tôt
    */
    var MAX_SCALE_M = 11.0, MAX_SCALE_D = 8.6;  // zoom final
    var BASE_M      = 1.10, BASE_D      = 1.08; // départ léger (“plus léger plus vite”)
    var DIST_M      = 0.90, DIST_D      = 0.96; // distance courte → disparition rapide
    var BLUR_START  = 0.22, BLUR_LEN    = 0.38; // blur avant fade
    var BLUR_MAX_M  = 18,   BLUR_MAX_D  = 14;   // plafond blur
    var FADE_START  = 0.30, FADE_LEN    = 0.26; // fade tôt & court
    var DONE_M      = 0.94, DONE_D      = 0.98; // passe derrière très tôt
    var OVER_MAX    = 2.2;                      // limite overshoot
    var GAP_M       = 12,   GAP_D       = 16;   // vh — espace au-dessus des bulles

    // Helpers easing/scroll
    var mqMobile = W.matchMedia && W.matchMedia('(max-width: 768px)');
    function clamp(x,a,b){ return x<a?a:(x>b?b:x); }
    function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
    function easeOutQuad(t){ return 1 - (1 - t) * (1 - t); } // pour SCALE au démarrage
    function getVH(){ return (W.visualViewport ? W.visualViewport.height : W.innerHeight) || 1; }
    function scrollY(){
      return (typeof W.pageYOffset === 'number' ? W.pageYOffset : 0) ||
             (D.scrollingElement && D.scrollingElement.scrollTop) ||
             D.documentElement.scrollTop || (D.body && D.body.scrollTop) || 0;
    }

    var _vh = getVH(), prevY = -1, rafId = 0;

    function render(y){
      var isM   = mqMobile && mqMobile.matches;
      var finPx = _vh * (isM ? DIST_M : DIST_D) || 1;

      var raw      = y / finPx;           // progress “réel” (non clampé)
      var prog01   = clamp(raw, 0, 1);    // progress [0..1]
      var eased    = easeOutCubic(prog01);

      // SCALE : croissance “légère mais rapide au début” + overshoot adouci
      var sProg    = clamp(prog01 * 1.10, 0, 1); // un peu plus vite au début
      var sEase    = easeOutQuad(sProg);
      var over     = raw > 1 ? Math.min(raw - 1, OVER_MAX - 1) : 0; // extra > 1
      var base     = isM ? BASE_M : BASE_D;
      var sMax     = isM ? MAX_SCALE_M : MAX_SCALE_D;
      var scale    = base + (sMax - base) * (sEase + over * 0.55); // overshoot contrôlé

      // Translation douce (renforce le zoom vers le bas)
      var tyPx     = (isM ? 10 : 8) * (_vh / 100) * eased;

      // BLUR avant FADE
      var blurMax  = isM ? BLUR_MAX_M : BLUR_MAX_D;
      var blurP    = clamp((raw - BLUR_START) / BLUR_LEN, 0, 1);
      var blur     = blurMax * (0.12 + 0.88 * blurP); // petite base pour éviter le “cut” sec

      // FADE plus tôt & plus court que le blur
      var fadeP    = clamp((raw - FADE_START) / FADE_LEN, 0, 1);
      var opacity  = 1 - fadeP;

      // Applique transform/opacity/blur
      var t = 'translate3d(0,'+tyPx.toFixed(2)+'px,0) scale('+scale.toFixed(3)+')';
      logo.style.transform       = t;
      logo.style.webkitTransform = t;
      logo.style.opacity         = opacity.toFixed(3);
      logo.style.filter          = blur>0 ? ('blur('+blur.toFixed(2)+'px)') : 'none';

      // Espace au-dessus de la grille (accueil)
      var gap = Math.max(0, (1 - prog01) * (isM ? GAP_M : GAP_D));
      D.documentElement.style.setProperty('--listGap', gap.toFixed(2) + 'vh');

      // Bascule “derrière” très tôt pour libérer les bulles
      var done = raw > (isM ? DONE_M : DONE_D);
      if (done){
        addClass(D.body,'after-hero');
        addClass(hero,'hero-out');
        hero.style.zIndex = -1;
        hero.style.pointerEvents = 'none';
        // sécurité : coupe toute l’opacité résiduelle
        if (opacity <= 0.02){
          logo.style.opacity = '0';
          logo.style.filter  = 'blur(' + blurMax + 'px)';
        }
      } else {
        rmClass(D.body,'after-hero');
        rmClass(hero,'hero-out');
        hero.style.zIndex = '';
        hero.style.pointerEvents = '';
      }
    }

    function tick(){
      var y = scrollY();
      if (y !== prevY){ render(y); prevY = y; }
      rafId = W.requestAnimationFrame(tick);
    }

    // Révélation douce une fois l’image prête
    var reveal = function(){ try{ logo.classList.add('on'); }catch(_){ } };
    if (logo.complete) setTimeout(reveal, 0);
    else logo.addEventListener('load', reveal, { once:true });

    // Boot
    render(scrollY());
    rafId = W.requestAnimationFrame(tick);

    var recalc = function(){ _vh = getVH(); render(scrollY()); };
    W.addEventListener('resize', recalc, true);
    if (W.visualViewport && typeof W.visualViewport.addEventListener==='function'){
      W.visualViewport.addEventListener('resize', recalc, true);
    }
    W.addEventListener('orientationchange', recalc, true);
    D.addEventListener('visibilitychange', function(){ if (!D.hidden) recalc(); }, true);
    W.addEventListener('pageshow', function(e){ if (e && e.persisted) recalc(); }, true);
    W.addEventListener('pagehide', function(){ W.cancelAnimationFrame(rafId); }, true);
  })();

  /* =========================================================
     2) MENU latéral — inertie iOS + swipe to close
     • compatible avec #side-menu / #menu-overlay / #menu-toggle de l’index
  ========================================================== */
  (function drawerGestures(){
    if (W.__ptDrawerGestures) return; W.__ptDrawerGestures = 1;

    var body    = D.body;
    var drawer  = qs('#drawer') || qs('#sideMenu') || qs('.drawer') || qs('[data-drawer]') || qs('#side-menu');
    var overlay = qs('#drawerBackdrop') || qs('#menuBackdrop') || qs('.drawer__backdrop') || qs('.backdrop') || qs('#menu-overlay');
    var burger  = qs('#menuBtn') || qs('.hamburger') || qs('.menu-toggle') || qs('#menu-toggle');

    function openTuning(){
      try{
        if (drawer){
          drawer.style.touchAction = 'pan-y';
          drawer.style.webkitOverflowScrolling = 'touch';
        }
        body.style.overscrollBehaviorY = 'contain';
      }catch(_){}
    }
    function closeTuning(){
      try{
        if (drawer){
          drawer.style.touchAction = '';
          drawer.style.webkitOverflowScrolling = '';
        }
        body.style.overscrollBehaviorY = '';
      }catch(_){}
    }

    function isOpen(){
      return (drawer && (hasClass(drawer,'open') || hasClass(drawer,'is-open') || hasClass(drawer,'active'))) ||
             hasClass(body,'menu-open');
    }
    function closeDrawer(){
      var flags = ['open','is-open','active','visible','shown','menu-open','drawer-open'];
      var i;
      for (i=0;i<flags.length;i++){ rmClass(body, flags[i]); }
      if (drawer){
        for (i=0;i<flags.length;i++){ rmClass(drawer, flags[i]); }
        drawer.hidden = true; // compat index.html
      }
      if (overlay){
        addClass(overlay,'hidden'); overlay.style.display='none'; overlay.hidden = true;
      }
      if (burger) burger.setAttribute('aria-expanded','false');
      closeTuning();
    }

    // swipe-to-close
    var sx=0, sy=0, moving=false;
    function start(e){
      var t = (e.touches && e.touches[0]) ? e.touches[0] : e;
      sx = t.clientX; sy = t.clientY; moving = true;
    }
    function move(e){
      if (!moving || !isOpen()) return;
      var t = (e.touches && e.touches[0]) ? e.touches[0] : e;
      var dx = t.clientX - sx; var dy = t.clientY - sy;
      if (dx < -48 && Math.abs(dx) > Math.abs(dy)*1.4){
        moving = false; closeDrawer();
      }
    }
    function end(){ moving = false; }

    var tgt = drawer || D;
    tgt.addEventListener('touchstart', start, { passive:true });
    tgt.addEventListener('touchmove',  move,  { passive:true });
    tgt.addEventListener('touchend',   end,   { passive:true });
    tgt.addEventListener('pointerdown',start, { passive:true });
    tgt.addEventListener('pointermove',move,  { passive:true });
    tgt.addEventListener('pointerup',  end,   { passive:true });

    // overlay ferme
    if (overlay && !overlay.__ptP6){ overlay.__ptP6 = 1; overlay.addEventListener('click', closeDrawer, false); }
    // ESC ferme
    D.addEventListener('keydown', function(e){ if ((e.key === 'Escape' || e.keyCode === 27) && isOpen()) closeDrawer(); }, false);
    // ouverture → tuning (micro-script d’ouverture déjà dans l’index)
    if (burger && !burger.__ptP6){
      burger.__ptP6 = 1;
      burger.addEventListener('click', function(){ setTimeout(openTuning,0); }, false);
      burger.addEventListener('pointerup', function(){ setTimeout(openTuning,0); }, false);
    }
    // navigation → ferme
    W.addEventListener('hashchange', function(){ setTimeout(closeDrawer, 0); }, false);
  })();

  /* =========================================================
     3) NAV — focus H1 + lien actif (aria-current)
  ========================================================== */
  (function navA11y(){
    if (W.__ptNavA11y) return; W.__ptNavA11y = 1;

    function currentPath(){
      try{
        var p = (typeof W.parseHash === 'function') ? W.parseHash() : { view:'' };
        if (!p.view || p.view==='home') return '#/';
        return '#/'+p.view;
      }catch(_){ return (location.hash||'#/'); }
    }
    function markActive(){
      var menu = qs('#drawer') || qs('#sideMenu') || qs('.drawer') || qs('[data-drawer]') || qs('#nav') || qs('#side-menu');
      if (!menu) return;
      var cur = currentPath();
      var links = menu.querySelectorAll ? menu.querySelectorAll('a[href^="#"]') : [];
      var i, href;
      for (i=0;i<links.length;i++){
        href = links[i].getAttribute('href') || '';
        if (href === cur){ links[i].setAttribute('aria-current','page'); addClass(links[i],'is-active'); }
        else { links[i].removeAttribute('aria-current'); rmClass(links[i],'is-active'); }
      }
    }
    function focusH1(){
      try{
        var p = (typeof W.parseHash === 'function') ? W.parseHash() : { view:'' };
        if (typeof W.focusView === 'function') { W.focusView(p.view||''); return; }
        var id = p.view ? ('view-'+p.view) : 'view-home';
        var scope = D.getElementById(id);
        var h1 = scope ? scope.querySelector('h1') : null;
        if (h1){
          h1.setAttribute('tabindex','-1');
          try{ h1.focus({preventScroll:true}); }catch(_){}
          setTimeout(function(){ h1.removeAttribute('tabindex'); }, 260);
        }
      }catch(_){}
    }
    function toggleFab(){
      var fab = qs('#fabAccount'); if (!fab) return;
      var cur = currentPath();
      if (cur === '#/compte') fab.style.display = 'none'; else fab.style.display = '';
    }

    function run(){ markActive(); focusH1(); toggleFab(); }
    W.addEventListener('hashchange', function(){ setTimeout(run,0); }, false);
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', function(){ setTimeout(run,0); }, false);
    else setTimeout(run,0);
  })();

  /* =========================================================
     4) COMPTE — fallback léger (save/load + wiring basique)
  ========================================================== */
  (function accountFallback(){
    if (W.__ptAccFallback) return; W.__ptAccFallback = 1;

    var KEY = W.USER_KEY || 'pt_user_v1';

    // Fallbacks si la Partie 3 n’a pas encore tout fourni
    if (typeof W.loadUser !== 'function'){
      W.loadUser = function(){
        try{ var raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : {name:'',email:'',phone:'',addr:'',points:0,tier:'Bronze'}; }
        catch(_){ return {name:'',email:'',phone:'',addr:'',points:0,tier:'Bronze'}; }
      };
    }
    if (typeof W.saveUser !== 'function'){
      W.saveUser = function(u){
        try{
          if (!u || typeof u!=='object') return;
          localStorage.setItem(KEY, JSON.stringify(u));
          try{ W.dispatchEvent(new CustomEvent('pt:userChanged', { detail:u })); }catch(_){}
        }catch(_){}
      };
    }

    function wireSimpleForms(){
      var accSave = qs('#accSave');
      var accForm = qs('#accForm') || qs('#accountForm');

      function grab(){
        var u = W.loadUser();
        var n = qs('#accName'), e = qs('#accEmail'), p = qs('#accPhone'), a = qs('#accAddr');
        if (n) u.name  = String(n.value||'').trim();
        if (e) u.email = String(e.value||'').trim();
        if (p) u.phone = String(p.value||'').trim();
        if (a) u.addr  = String(a.value||'').trim();
        return u;
      }
      function save(e){
        if (e && e.preventDefault) e.preventDefault();
        var u = grab();
        if (!u.name && u.email) u.name = u.email.split('@')[0];
        W.saveUser(u);
        if (typeof W.toast==='function') W.toast('Compte enregistré','success');
      }

      if (accForm && !accForm.__ptP6){ accForm.__ptP6=1; accForm.addEventListener('submit', save, false); }
      if (accSave && !accSave.__ptP6){ accSave.__ptP6=1; accSave.addEventListener('click', save, false); }

      // login/register (fallback ultra simple)
      var lf = qs('#loginForm'), rf = qs('#registerForm');
      function onLogin(e){
        if (e && e.preventDefault) e.preventDefault();
        var email = (qs('#loginEmail')||{}).value || '';
        var pwd   = (qs('#loginPwd')  ||{}).value || '';
        if (!email || email.indexOf('@')===-1 || !pwd){ if (W.toast) W.toast('Identifiants invalides','info'); return; }
        var u = W.loadUser(); u.email = email; if (!u.name) u.name = email.split('@')[0]; W.saveUser(u);
        if (W.toast) W.toast('Connecté','success'); location.hash = '#/compte';
      }
      function onRegister(e){
        if (e && e.preventDefault) e.preventDefault();
        var name  = (qs('#regName') ||{}).value || '';
        var email = (qs('#regEmail')||{}).value || '';
        var pwd   = (qs('#regPwd')  ||{}).value || '';
        if (!name || !email || email.indexOf('@')===-1 || !pwd || pwd.length<6){ if (W.toast) W.toast('Champs incomplets (MDP ≥ 6)','info'); return; }
        var u = W.loadUser(); u.name = name; u.email = email; W.saveUser(u);
        if (W.toast) W.toast('Compte créé (démo)','success'); location.hash = '#/compte';
      }
      if (lf && !lf.__ptP6){ lf.__ptP6=1; lf.addEventListener('submit', onLogin, false); }
      if (rf && !rf.__ptP6){ rf.__ptP6=1; rf.addEventListener('submit', onRegister, false); }
    }

    // Squelette minimal si absent
    if (!qs('#view-compte')){
      var v = D.createElement('section'); v.id='view-compte'; v.className='view hidden';
      v.innerHTML = '<div class="container"><h1 tabindex="-1">Mon compte</h1><div class="card"><div class="specs"><p>Chargement…</p></div></div></div>';
      D.body.appendChild(v);
    }

    if (D.readyState==='loading') D.addEventListener('DOMContentLoaded', wireSimpleForms, false);
    else wireSimpleForms();
  })();

  /* =========================================================
     5) FAB Compte — présent partout sauf sur #/compte
  ========================================================== */
  (function fabVisibility(){
    function cur(){ var h=(location.hash||'').toLowerCase(); return h ? h : '#/'; }
    function apply(){
      var fab = qs('#fabAccount'); if (!fab) return;
      if (cur().indexOf('#/compte')===0) fab.style.display='none'; else fab.style.display='';
    }
    W.addEventListener('hashchange', function(){ setTimeout(apply,0); }, false);
    if (D.readyState==='loading') D.addEventListener('DOMContentLoaded', apply, false); else apply();
  })();

})();
