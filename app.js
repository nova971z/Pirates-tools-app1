/*! Pirates Tools — bundle unifié (ES5, idempotent) */
(function (window, document) {
  'use strict';

  /* =======================================================================
     0) CORE + CONSTANTES + HELPERS (sans doublons, ES5)
  ======================================================================== */
  if (!window.PT) window.PT = {};
  var PT = window.PT;

  // --- Hotfix GH Pages: réécrit fetch pour /<repo>/
  (function ghFetchRewrite(){
    if (window.__ptFetchRewrote) return; window.__ptFetchRewrote = 1;
    try{
      var parts = location.pathname.split('/').filter(Boolean);
      var base  = parts.length ? ('/' + parts[0] + '/') : '/';
      var _fetch = window.fetch;
      function _rewriteFetch(input, init, newUrl){
        try{
          if (input && typeof input === 'object' && 'method' in input){
            var reqInit = {
              method: input.method, headers: input.headers, body: input.body,
              mode: input.mode, credentials: input.credentials, cache: input.cache,
              redirect: input.redirect, referrer: input.referrer, referrerPolicy: input.referrerPolicy,
              integrity: input.integrity, keepalive: input.keepalive, signal: input.signal
            };
            return _fetch(new Request(newUrl, reqInit), init);
          }
        }catch(_){}
        return _fetch(newUrl, init);
      }
      window.fetch = function(input, init){
        var url = (typeof input === 'string') ? input : (input && input.url) || '';
        if (!url) return _fetch(input, init);
        var m = url.match(/^\/?products\.json([\?#].*)?$/i);
        if (m) return _rewriteFetch(input, init, base + 'products.json' + (m[1] || ''));
        if (/^(?:\/)?data\//i.test(url))   return _rewriteFetch(input, init, base + url.replace(/^\//,''));
        if (/^(?:\/)?images\//i.test(url)) return _rewriteFetch(input, init, base + url.replace(/^\//,''));
        return _fetch(input, init);
      };
    }catch(_){}
  })();

  // --- Helpers DOM
  if (!PT.$)  PT.$  = function(sel, root){ return (root||document).querySelector(sel); };
  if (!PT.$$) PT.$$ = function(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); };
  function on(el, ev, fn){ if (el && !el.__ptOn) { el.__ptOn = 1; el.addEventListener(ev, fn, false); } }
  function appendToBodySafe(el){
    if (!el) return;
    if (document.body) document.body.appendChild(el);
    else document.addEventListener('DOMContentLoaded', function once(){ document.removeEventListener('DOMContentLoaded', once, false); document.body.appendChild(el); }, false);
  }

  // --- Fallbacks publics (non destructifs)
  if (typeof window.fallback !== 'function') window.fallback = function(v, alt){ return (v===void 0 || v===null) ? (alt||'') : v; };
  if (typeof window.firstDefined !== 'function') window.firstDefined = function(){ for (var i=0;i<arguments.length;i++){ var v=arguments[i]; if (v!==void 0 && v!==null) return v; } };

  // --- Base publiques & constantes
  if (typeof window.PUBLIC_BASE !== 'string'){
    try{ window.PUBLIC_BASE = new URL('.', (document.baseURI || location.href)).href; }
    catch(_){ window.PUBLIC_BASE = location.origin + location.pathname.replace(/[^\/]*$/,''); }
  }
  if (typeof window.IMG_FALLBACK !== 'string'){
    try{ window.IMG_FALLBACK = new URL('images/pirates-tools-logo.png?v=7', window.PUBLIC_BASE).href; }
    catch(_){ window.IMG_FALLBACK = './images/pirates-tools-logo.png?v=7'; }
  }
  if (typeof window.PHONE_E164 !== 'string') window.PHONE_E164 = '+33774230195';
  if (typeof window.STORE_KEY  !== 'string') window.STORE_KEY  = 'pt_cart_v1';
  if (!Array.isArray(window.MODELS)) window.MODELS = [];
  if (!Array.isArray(window.CART))   window.CART   = [];

  // --- UI: toast + announce (création auto des racines)
  if (typeof window.toast !== 'function'){
    window.toast = function(msg, kind){
      var host = document.getElementById('toasts');
      if (!host){ host = document.createElement('div'); host.id='toasts'; host.className='pt-root'; host.setAttribute('aria-live','polite'); appendToBodySafe(host); }
      var n = document.createElement('div'); n.className='toast' + (kind?(' toast--'+kind):''); n.textContent = msg||'';
      host.appendChild(n);
      setTimeout(function(){ try{ host.removeChild(n); }catch(_){ } }, 2800);
    };
  }
  if (typeof window.announce !== 'function'){
    window.announce = function(msg){
      var live = document.getElementById('sr-live');
      if (!live){ live = document.createElement('div'); live.id='sr-live'; live.className='sr-only pt-root'; live.setAttribute('aria-live','polite'); appendToBodySafe(live); }
      live.textContent = msg || '';
    };
  }

  // --- SEO helpers
  if (typeof window.setPageMeta !== 'function'){
    window.setPageMeta = function(title, desc){
      try{
        if (title) document.title = String(title);
        var m = document.querySelector('meta[name="description"]');
        if (!m){ m = document.createElement('meta'); m.setAttribute('name','description'); document.head.appendChild(m); }
        if (desc!=null) m.setAttribute('content', String(desc));
      }catch(_){}
    };
  }
  if (typeof window.resetPageMeta !== 'function'){
    window.resetPageMeta = function(){
      try{
        document.title = 'Pirates Tools • Outillage pro (PWA)';
        var m = document.querySelector('meta[name="description"]');
        if (!m){ m = document.createElement('meta'); m.setAttribute('name','description'); document.head.appendChild(m); }
        m.setAttribute('content','Pirates Tools — Visseuses à chocs DeWALT, dispo Antilles. PWA rapide, contact immédiat (téléphone & WhatsApp).');
      }catch(_){}
    };
  }
  function setCanonical(url){
    try{
      var link = document.querySelector('link[rel="canonical"]');
      if (!link){ link = document.createElement('link'); link.setAttribute('rel','canonical'); document.head.appendChild(link); }
      link.setAttribute('href', url);
    }catch(_){}
  }
  function setMetaOg(name, content){
    try{
      var sel = 'meta[property="'+name+'"], meta[name="'+name+'"]';
      var m = document.querySelector(sel);
      if (!m){
        m = document.createElement('meta');
        if (name.indexOf('og:')===0) m.setAttribute('property', name); else m.setAttribute('name', name);
        document.head.appendChild(m);
      }
      m.setAttribute('content', content);
    }catch(_){}
  }

  // --- Images sûres
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
        var s = String(src||'');
        if (/^(data:|blob:|about:)/i.test(s)){ img.src = s || window.IMG_FALLBACK; }
        else {
          var u = (/^https?:/i.test(s) || /^\/\//.test(s)) ? new URL(s, location.href) : new URL(s, window.PUBLIC_BASE);
          if (u.protocol === 'http:') u.protocol = 'https:'; img.src = u.href;
        }
      }catch(_){ img.src = window.IMG_FALLBACK; }
    };
  }

  // --- Router utils
  if (typeof window.parseHash !== 'function'){
    window.parseHash = function(){
      var h = location.hash || '#/';
      var parts = h.split('?'); var path = parts[0] || '#/'; var view = path.replace('#/','').split('/')[0] || '';
      var sub  = path.replace('#/','').split('/')[1] || '';
      var query = {};
      if (parts[1]){
        var kv = parts[1].split('&'); var i;
        for (i=0;i<kv.length;i++){
          var s = kv[i].split('=');
          var k = decodeURIComponent(s[0]||''); var v = decodeURIComponent(s[1]||'');
          if (k) query[k] = v;
        }
      }
      return { path:path, view:view, sub:sub, query:query, raw:h };
    };
  }
  if (typeof window.showView !== 'function'){
    window.showView = function(key){
      var ids = ['home','catalogue','produit','devis','compte','login','register'];
      for (var i=0;i<ids.length;i++){ var el=document.getElementById('view-'+ids[i]); if(el) el.classList.add('hidden'); }
      var want=document.getElementById('view-'+key); if (want) want.classList.remove('hidden');
      try{
        var olds = document.querySelectorAll('#main, #main-content'); var j;
        for (j=0;j<olds.length;j++){ olds[j].id=''; }
        var target = want ? (want.querySelector('.container') || want) : null;
        if (target) target.id='main-content';
      }catch(_){}
    };
  }
  if (typeof window.focusView !== 'function'){
    window.focusView = function(key){
      var v=document.getElementById('view-'+key); if(!v) return;
      var h1=v.querySelector('h1'); if(!h1) return;
      h1.setAttribute('tabindex','-1'); try{ h1.focus({preventScroll:true}); }catch(_){ try{ h1.focus(); }catch(__){} }
      setTimeout(function(){ try{ h1.removeAttribute('tabindex'); }catch(_){ } }, 250);
    };
  }

  // --- Utils divers
  function esc(s){ s=String(s==null?'':s); return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function debounce(fn, wait){ wait = (wait==null)?140:wait; var t=0; return function(){ var args=arguments; clearTimeout(t); t=setTimeout(function(){ fn.apply(null,args); }, wait); }; }
  function onlyDigits(s){ return String(s||'').replace(/[^\d]/g,''); }
  function normKey(str){
    var s = String(str||'').toLowerCase();
    s = s.replace(/\s+/g,' ').replace(/[_-]+/g,' ').replace(/[’'`]/g,'');
    s = s.replace(/[àáâãäå]/g,'a').replace(/[ç]/g,'c').replace(/[èéêë]/g,'e').replace(/[ìíîï]/g,'i')
         .replace(/[ñ]/g,'n').replace(/[òóôõö]/g,'o').replace(/[ùúûü]/g,'u').replace(/[ýÿ]/g,'y');
    s = s.replace(/\s+/g,'').trim(); return s;
  }
  function absoluteUrl(u){
    try{ if (/^(data:|blob:)/i.test(String(u||''))) return u; return new URL(u||'', window.PUBLIC_BASE).href; }catch(_){ return u; }
  }

  /* =======================================================================
     1) VUES (création safe) + DOCK
  ======================================================================== */
  function ensureView(id, html){
    var v=document.getElementById(id);
    if(!v){ v=document.createElement('section'); v.id=id; v.className='view hidden'; v.innerHTML=html; appendToBodySafe(v); }
    return v;
  }
  if (!document.getElementById('skip-content')){
    var sk=document.createElement('a'); sk.id='skip-content'; sk.href='#main-content'; sk.className='sr-only pt-root'; sk.textContent='Aller au contenu';
    appendToBodySafe(sk);
  }
  // Vues minimales
  ensureView('view-home',
    '<div class="container">'+
      '<h1 tabindex="-1">Bienvenue</h1>'+
      '<p class="muted mt-0 mb-1">Choisissez une marque ou explorez le catalogue.</p>'+
      '<div id="brandGrid" class="brand-grid" role="list"></div>'+
    '</div>'
  );
  ensureView('view-catalogue',
    '<div class="container" id="main">'+
      '<h1 tabindex="-1">Catalogue</h1>'+
      '<div class="toolbar">'+
        '<input id="q" class="search" type="search" placeholder="Rechercher (marque, réf, description…)">'+
        '<select id="tag" class="select"><option value="">Tous</option></select>'+
        '<select id="sort" class="select" style="min-width:140px;margin-left:.4rem"></select>'+
      '</div>'+
      '<div id="tagChips" class="chips" style="margin:.5rem 0"></div>'+
      '<div id="catList" class="cat-list" aria-label="Catégories"></div>'+
      '<div id="list" class="list" aria-live="polite" aria-busy="false"></div>'+
    '</div>'
  );
  ensureView('view-produit',
    '<div class="container pdp" id="pdpContent">'+
      '<a class="chip chip--back" href="#/catalogue" aria-label="Retour au catalogue">← Retour</a>'+
      '<div class="pdp__grid">'+
        '<div class="pdp__media"><img id="pdpImg" alt=""></div>'+
        '<div class="pdp__info">'+
          '<h1 class="pdp__title" id="pdpTitle" tabindex="-1"></h1>'+
          '<div class="pdp__tag" id="pdpTag"></div>'+
          '<p class="pdp__desc" id="pdpDesc"></p>'+
          '<p class="pdp__price" id="pdpPrice"></p>'+
          '<small id="pdpPriceHT" class="pdp__price-ht"></small>'+
          '<ul class="pdp__specs" id="pdpSpecs"></ul>'+
          '<div class="actions">'+
            '<button class="btn primary" id="pdpQuote">Ajouter au panier</button>'+
            '<a class="btn btn-wa" id="pdpWa" target="_blank" rel="noopener">WhatsApp</a>'+
            '<button class="btn" id="pdpShare">Partager</button>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div class="pdp__related" id="pdpRelated"></div>'+
    '</div>'
  );
  ensureView('view-devis',
    '<div class="container" id="main">'+
      '<h1 tabindex="-1">Mon devis</h1>'+
      '<div class="card">'+
        '<div class="head"><h3 class="title">Articles</h3><span class="badge">Panier</span></div>'+
        '<div id="devisList" class="specs"></div>'+
        '<div class="actions">'+
          '<button id="devisSend" class="btn primary" type="button">Envoyer le devis (WhatsApp)</button>'+
          '<button id="devisClear" class="btn" type="button">Vider</button>'+
          '<button id="devisCopy" class="btn" type="button">Copier</button>'+
          '<button id="devisMail" class="btn" type="button">Email</button>'+
        '</div>'+
      '</div>'+
    '</div>'
  );
  ensureView('view-compte',
    '<div class="container" id="main">'+
      '<h1 tabindex="-1">Mon compte</h1>'+
      '<p id="accHello" class="muted" style="margin:.25rem 0 1rem">Bienvenue. Renseignez vos informations pour accélérer les devis.</p>'+
      '<!-- accContent injecté par module Compte -->'+
      '<div id="accContent"></div>'+
    '</div>'
  );
  // Dock → route devis
  (function wireDockRoute(){
    function goDevis(){ location.hash = '#/devis'; }
    var ids = ['dockCartBtn','dockCount','dockQuoteBtn'];
    for (var i=0;i<ids.length;i++){ var b=document.getElementById(ids[i]); if (b && !b.__ptW){ b.__ptW=1; on(b,'click',goDevis); } }
    var dock=document.getElementById('dock'); if (dock) dock.classList.add('dock--visible');
  })();

  /* =======================================================================
     2) PRODUITS — chargement (cache), marques, grille, helpers
  ======================================================================== */
  var LS_PRODUCTS = 'pt_products_cache_v1';
  function readProductsCache(){ try{ var raw=localStorage.getItem(LS_PRODUCTS); return raw?JSON.parse(raw):null; }catch(_){ return null; } }
  function writeProductsCache(arr){ try{ localStorage.setItem(LS_PRODUCTS, JSON.stringify({ t:Date.now(), products:(arr||[]) })); }catch(_){ } }
  function _withTimeout(p, ms){
    return new Promise(function(res, rej){
      var t=setTimeout(function(){ rej(new Error('timeout')); }, Math.max(3000, ms||6500));
      p.then(function(v){ clearTimeout(t); res(v); }, function(e){ clearTimeout(t); rej(e); });
    });
  }
  function loadProducts(){
    if (window.__PT_PRODUCTS && window.__PT_PRODUCTS.length){
      window.MODELS = window.__PT_PRODUCTS.slice();
      try{ window.dispatchEvent(new CustomEvent('pt:productsLoaded')); }catch(_){}
      return Promise.resolve(window.__PT_PRODUCTS);
    }
    var inline = window.PRODUCTS || window.products || [];
    if (inline && inline.length){
      window.__PT_PRODUCTS = inline.slice(); window.MODELS = inline.slice();
      try{ window.dispatchEvent(new CustomEvent('pt:productsLoaded')); }catch(_){}
      return Promise.resolve(window.__PT_PRODUCTS);
    }
    var url; try{ url = new URL('products.json', window.PUBLIC_BASE).href; }catch(_){ url = './products.json'; }
    return _withTimeout(fetch(url, { cache:'no-store' }), 7000)
      .then(function(r){ if(!r||!r.ok) throw new Error('network'); return r.json(); })
      .then(function(json){
        var arr = Array.isArray(json) ? json : (json && Array.isArray(json.products) ? json.products : []);
        if (!Array.isArray(arr)) arr=[];
        window.__PT_PRODUCTS = arr.slice(); window.MODELS = window.__PT_PRODUCTS.slice(); writeProductsCache(window.__PT_PRODUCTS);
        try{ window.dispatchEvent(new CustomEvent('pt:productsLoaded')); }catch(_){}
        return window.__PT_PRODUCTS;
      })
      .catch(function(){
        var cache = readProductsCache(); var arr=(cache&&Array.isArray(cache.products))?cache.products:[];
        window.__PT_PRODUCTS = arr.slice(); window.MODELS = window.__PT_PRODUCTS.slice();
        try{ window.dispatchEvent(new CustomEvent('pt:productsLoaded')); }catch(_){}
        return window.__PT_PRODUCTS;
      });
  }
  PT.loadProducts = loadProducts;

  // Marques (métadonnées logos)
  var BRAND_META = (function(){
    var ver  = (window.__ASSET_VER || '10'); var base;
    try{ base = new URL('images/brands/', window.PUBLIC_BASE).href; }catch(_){ base = './images/brands/'; }
    function url(file){ return base + file + '?v=' + ver; }
    return {
      dewalt:    { label:'DeWALT',    logo: url('dewalt.png')    },
      milwaukee: { label:'Milwaukee', logo: url('milwaukee.png') },
      makita:    { label:'Makita',    logo: url('makita.png')    },
      festool:   { label:'Festool',   logo: url('festool.png')   },
      flex:      { label:'FLEX',      logo: url('flex.png')      },
      wera:      { label:'Wera',      logo: url('wera.png')      },
      stanley:   { label:'Stanley',   logo: url('stanley.png')   },
      facom:     { label:'Facom',     logo: url('facom.png')     }
    };
  })();
  function labelToKey(label){
    var n = normKey(label);
    for (var k in BRAND_META){
      if (!Object.prototype.hasOwnProperty.call(BRAND_META,k)) continue;
      if (n === normKey(BRAND_META[k].label) || n === normKey(k)) return k;
    }
    return '';
  }
  function computeBrands(products){
    var counts = {}; var k;
    for (k in BRAND_META) if (Object.prototype.hasOwnProperty.call(BRAND_META,k)) counts[k]=0;
    for (var i=0;i<(products||[]).length;i++){
      var p = products[i]||{}; var fromKey = (p.brand_key!=null)?String(p.brand_key):''; var fromLabel=(p.brand!=null)?String(p.brand):'';
      var key = fromKey ? normKey(fromKey) : labelToKey(fromLabel);
      if (key && !counts.hasOwnProperty(key)) key = labelToKey(fromKey || fromLabel);
      if (key && counts.hasOwnProperty(key)) counts[key] += 1;
    }
    var out=[]; for (k in BRAND_META){ if(!Object.prototype.hasOwnProperty.call(BRAND_META,k)) continue; var meta=BRAND_META[k]; out.push({ key:k, label:meta.label, logo:meta.logo, count:counts[k]||0 }); }
    out.sort(function(a,b){ return a.label.localeCompare(b.label); }); return out;
  }
  function wireBrandGrid(host){
    if (!host || host.__ptWired) return; host.__ptWired = 1;
    var pressFx = function(e){ var el=e.target&&e.target.closest?e.target.closest('.brand'):null; if(!el) return; el.style.transform='scale(0.98)'; setTimeout(function(){ el.style.transform=''; },160); };
    host.addEventListener('pointerdown', pressFx, false); host.addEventListener('mousedown', pressFx, false);
    host.addEventListener('click', function(e){
      var btn = e.target && e.target.closest ? e.target.closest('[data-brand]') : null; if(!btn) return;
      var key = btn.getAttribute('data-brand')||''; if(!key) return; location.hash = '#/catalogue?brand='+encodeURIComponent(key);
    }, false);
  }
  function renderBrandGridFromProducts(products){
    var host = document.getElementById('brandGrid'); if (!host) return;
    var brands = computeBrands(products); var html=''; var i;
    for (i=0;i<brands.length;i++){
      var b=brands[i];
      html += '<button class="brand" type="button" data-brand="'+b.key+'" aria-label="Voir '+b.label+'">'
           +  '  <span class="brand__bubble"><img class="brand__logo" alt="'+b.label+'" data-src="'+b.logo+'" decoding="async" loading="lazy" referrerpolicy="no-referrer"></span>'
           +  '  <span class="brand__label">'+b.label+'</span>'
           +  '</button>';
    }
    host.innerHTML = html;
    var imgs = host.querySelectorAll ? host.querySelectorAll('img[data-src]') : [];
    for (i=0;i<imgs.length;i++){ var im=imgs[i]; var src=im.getAttribute('data-src')||''; window.setSafeImg(im, src, im.getAttribute('alt')||''); im.removeAttribute('data-src'); }
    wireBrandGrid(host);
  }
  PT.renderBrandGridFromProducts = renderBrandGridFromProducts;

  // Re-render quand produits chargés
  window.addEventListener('pt:productsLoaded', function(){ var p=window.parseHash(); if (!p.view || p.view==='home' || p.view==='/'){ try{ renderBrandGridFromProducts(window.MODELS||[]); }catch(_){ } } }, false);

  /* =======================================================================
     3) SAFE VIEWPORT + SAFE-AREA + TOPBAR OFFSETS + HERO
  ======================================================================== */
  (function viewportSafe(){
    if (window.__ptSmartGuard) return; window.__ptSmartGuard = 1;
    var W=window, D=document, E=D.documentElement, B=D.body;
    function num(v){ v=parseFloat(v); return isNaN(v)?0:v; }
    function css(el){ return W.getComputedStyle ? W.getComputedStyle(el) : (el.currentStyle||{}); }
    function px(v){ return (v==null||v==='')?0:num(String(v).replace('px','')); }
    function setViewportVars(){ try{ var vh=(W.visualViewport&&W.visualViewport.height)?W.visualViewport.height:W.innerHeight||E.clientHeight||0; var vw=(W.visualViewport&&W.visualViewport.width)?W.visualViewport.width:W.innerWidth||E.clientWidth||0; E.style.setProperty('--app-vh',(vh*0.01)+'px'); E.style.setProperty('--app-vw',(vw*0.01)+'px'); }catch(_){ } }
    function getSafeAreaBottom(){
      var vvb=0; try{ if (W.visualViewport){ var ih=W.innerHeight||0; var used=(W.visualViewport.height||0)+(W.visualViewport.offsetTop||0); vvb=Math.max(0, ih - used); } }catch(_){}
      var cssEnv=0; try{ var probe=D.createElement('div'); probe.style.cssText='position:fixed;left:-9999px;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom);'; D.body?D.body.appendChild(probe):E.appendChild(probe); cssEnv=num(W.getComputedStyle(probe).paddingBottom); probe.parentNode.removeChild(probe); }catch(_){}
      return Math.max(vvb, cssEnv, 0);
    }
    function getDockHeight(){ var el=D.getElementById('dock'); if(!el) return 0; var st=css(el); var pos=(st&&st.position)||''; if (pos!=='fixed'&&pos!=='sticky') return 0; var r=el.getBoundingClientRect?el.getBoundingClientRect():{top:0,bottom:0}; var h=Math.max(0, Math.min(W.innerHeight||0, r.bottom) - Math.max(0, r.top)); return Math.max(0, h||0); }
    function computeObstruction(){ var hDock=getDockHeight(); var safe=getSafeAreaBottom(); return Math.max(hDock, safe); }
    function applyBottomPadding(){
      try{
        var need=computeObstruction();
        if (!need){ E.style.setProperty('--safe-bottom','0px'); if (B && B.__ptOrigPB!=null){ B.style.paddingBottom=B.__ptOrigPB; } return; }
        var cur=px(css(B).paddingBottom); var want=Math.max(cur, need+6);
        if (!B.__ptOrigPB){ B.__ptOrigPB=B.style.paddingBottom||''; }
        if (want > cur + 1){ B.style.paddingBottom = want + 'px'; }
        E.style.setProperty('--safe-bottom', need+'px');
      }catch(_){}
    }
    function fixScrollLockIfNeeded(){
      try{
        var sh=Math.max(B.scrollHeight||0,E.scrollHeight||0); var ch=Math.max(B.clientHeight||0,E.clientHeight||0,W.innerHeight||0);
        var needScroll=(sh - ch) > 16; if (!needScroll) return;
        var sb=css(B), se=css(E); var bodyLocked=(sb&&(sb.overflow==='hidden'||sb.overflowY==='hidden')); var htmlLocked=(se&&(se.overflow==='hidden'||se.overflowY==='hidden'));
        if (bodyLocked || htmlLocked){
          if (!B.__ptPrevOverflowY) B.__ptPrevOverflowY=B.style.overflowY||''; if (!E.__ptPrevOverflowY) E.__ptPrevOverflowY=E.style.overflowY||'';
          B.style.overflowY='auto'; E.style.overflowY='auto'; E.classList.add('pt-scroll-fix');
        }
      }catch(_){}
    }
    function ensureBottomSentinel(){ var s=D.getElementById('pt-bottom-sentinel'); if(!s){ s=D.createElement('div'); s.id='pt-bottom-sentinel'; appendToBodySafe(s); } return s; }
    var io;
    function watchBottom(){
      try{
        var s=ensureBottomSentinel(); if (!('IntersectionObserver' in W)) return;
        if (io) return;
        io=new IntersectionObserver(function(entries){ var e=entries&&entries[0]; if(!e) return; if (!e.isIntersecting || e.intersectionRatio < 1){ applyBottomPadding(); } }, { threshold:[1] });
        io.observe(s);
      }catch(_){}
    }
    function refreshAll(){ setViewportVars(); applyBottomPadding(); fixScrollLockIfNeeded(); }
    W.addEventListener('resize', function(){ setViewportVars(); applyBottomPadding(); }, {passive:true});
    W.addEventListener('orientationchange', function(){ setTimeout(refreshAll,60); }, false);
    if (W.visualViewport && typeof W.visualViewport.addEventListener==='function'){
      W.visualViewport.addEventListener('resize', function(){ refreshAll(); }, {passive:true});
      W.visualViewport.addEventListener('scroll', function(){ refreshAll(); }, {passive:true});
    }
    W.addEventListener('hashchange', function(){ setTimeout(refreshAll,0); }, false);
    document.addEventListener('DOMContentLoaded', function(){ refreshAll(); watchBottom(); }, false);
    PT.refreshViewportSafe = refreshAll;
  })();

  (function safeTop(){
    if (window.__ptSafeTopV2) return; window.__ptSafeTopV2 = 1;
    function topHeight(){ try{ var top=document.getElementById('topbar')||document.querySelector('nav'); var h=Math.ceil((top&&top.getBoundingClientRect?top.getBoundingClientRect().height:0)||0); return Math.max(0,h); }catch(_){ return 0; } }
    function applyTopPadding(){ var h=topHeight(); document.documentElement.style.setProperty('--safe-top', h+'px'); try{ document.body.style.paddingTop=''; }catch(_){ } }
    window.addEventListener('resize', applyTopPadding, {passive:true});
    window.addEventListener('hashchange', applyTopPadding, false);
    document.addEventListener('DOMContentLoaded', applyTopPadding, false);
  })();

  // Hero (FX doux uniquement sur home)
  (function heroFx(){
    function isHome(){ try{ var p=window.parseHash?window.parseHash():{view:''}; return (!p.view || p.view==='home' || p.view==='/'); }catch(_){ return true; } }
    if (!isHome()) return;
    var heroLogo = document.getElementById('heroLogo') || document.querySelector('.hero-logo');
    function run(){ if(!heroLogo) return; heroLogo.classList.add('on','fx-overshoot'); setTimeout(function(){ heroLogo.classList.add('fx-preblur'); },220); setTimeout(function(){ heroLogo.classList.remove('fx-overshoot'); },260); }
    if (document.readyState==='complete' || document.readyState==='interactive'){ requestAnimationFrame(run); } else { document.addEventListener('DOMContentLoaded', run, false); }
    // IO pour after-hero/hero-out + --listGap
    (function(){
      var hero = document.getElementById('hero') || document.querySelector('.hero,.hero-full');
      var body = document.body; var rootStyle = document.documentElement && document.documentElement.style;
      if (!hero || !rootStyle || !body) return;
      var lastRatio=1, ticking=false;
      function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
      function apply(ratio){
        var gapVH = 4 + 18 * clamp(ratio,0,1); rootStyle.setProperty('--listGap', gapVH.toFixed(2)+'vh');
        var isOut = (ratio <= 0.08); if (isOut){ body.classList.add('after-hero'); hero.classList.add('hero-out'); } else { body.classList.remove('after-hero'); hero.classList.remove('hero-out'); }
      }
      function rafApply(){ if (ticking) return; ticking=true; requestAnimationFrame(function(){ apply(lastRatio); ticking=false; }); }
      if ('IntersectionObserver' in window){
        var thresholds=(function(){ var a=[],i; for(i=0;i<=20;i++){ a.push(i/20); } return a; })();
        var io=new IntersectionObserver(function(entries){ var e=entries&&entries[0]; lastRatio=e?e.intersectionRatio:0; rafApply(); }, {root:null, threshold:thresholds});
        io.observe(hero); try{ window.__ptHeroIO=io; }catch(_){}
        window.addEventListener('beforeunload', function(){ try{ io.disconnect(); }catch(_){ } }, { once:true });
      } else {
        function onScroll(){ var rect=hero.getBoundingClientRect(); var h=rect.height||hero.offsetHeight||1; var vis=(Math.min(rect.bottom, window.innerHeight||0)-Math.max(rect.top,0))/h; lastRatio=clamp(vis,0,1); rafApply(); }
        window.addEventListener('scroll', onScroll, {passive:true}); window.addEventListener('resize', onScroll, {passive:true});
        try{ window.__ptHeroScroll=onScroll; window.__ptHeroHeroEl=hero; }catch(_){}
        onScroll();
      }
    })();
    // API (show/hide)
    PT.hero = PT.hero || {};
    PT.hero.hide = function(){
      try{
        var logo=document.getElementById('heroLogo')||document.querySelector('.hero-logo');
        var hero=document.getElementById('hero')||document.querySelector('.hero,.hero-full');
        if (logo){ logo.classList.remove('on','fx-overshoot','fx-preblur','fx-out'); }
        if (hero){ hero.classList.remove('hero-out'); }
        if (window.__ptHeroIO && window.__ptHeroIO.disconnect){ try{ window.__ptHeroIO.disconnect(); }catch(_){ } window.__ptHeroIO=null; }
        if (window.__ptHeroScroll){ try{ window.removeEventListener('scroll', window.__ptHeroScroll); window.removeEventListener('resize', window.__ptHeroScroll); }catch(_){ } window.__ptHeroScroll=null; }
      }catch(_){}
    };
    PT.hero.show = function(){
      try{ var logo=document.getElementById('heroLogo')||document.querySelector('.hero-logo'); if (logo && !logo.classList.contains('on')){ requestAnimationFrame(function(){ logo.classList.add('on'); }); } }catch(_){}
    };
  })();

  /* =======================================================================
     4) CATALOGUE + PRODUITS + PRIX + PANIER + PDP + JSON-LD
  ======================================================================== */
  var VAT_RATE = (typeof window.VAT_RATE==='number' && isFinite(window.VAT_RATE)) ? window.VAT_RATE : 0.20;
  function priceCentsFrom(m){
    if (!m) return null;
    if (typeof m.price_cents==='number' && isFinite(m.price_cents)) return Math.round(m.price_cents);
    if (typeof m.price==='number' && isFinite(m.price)) return Math.round(m.price*100);
    return null;
  }
  function fmtCents(cents, currency){ if (cents==null) return ''; currency=currency||'EUR'; try{ return (cents/100).toLocaleString('fr-FR',{style:'currency',currency:currency}); }catch(_){ return (cents/100).toFixed(2)+' '+currency; } }

  function ensureStableKey(m){
    if (!m) return m;
    if (window.firstDefined(m.id, m.sku, m.title)==null || window.firstDefined(m.id, m.sku, m.title)===''){
      if (!m.__auto_id){
        try{
          var base=JSON.stringify({ t:m&&m.title||'', s:m&&m.sku||'', b:m&&m.brand||'', c:m&&m.category||'' });
          var h=5381,i=0; for(i=0;i<base.length;i++){ h=((h<<5)+h)+base.charCodeAt(i); h=h|0; }
          m.__auto_id='pt_auto_'+(h>>>0).toString(36);
        }catch(_){ m.__auto_id='pt_auto_'+Math.random().toString(36).slice(2); }
      }
    }
    return m;
  }
  function keyOf(m){ m=ensureStableKey(m); return String(window.firstDefined(m&&m.id, m&&m.sku, m&&m.title, m&&m.__auto_id, '')); }

  function groupCart(){
    var map={}, out=[]; var i;
    for (i=0;i<window.CART.length;i++){ var p=window.CART[i]; var k=keyOf(p); if(!map[k]) map[k]={ item:p, qty:0 }; map[k].qty++; }
    for (var k in map) if (Object.prototype.hasOwnProperty.call(map,k)) out.push(map[k]);
    return out;
  }
  function findProductByKey(key){
    if (!key) return null; var k=String(key).toLowerCase();
    for (var i=0;i<window.MODELS.length;i++){
      var m=window.MODELS[i]||{};
      var id=String(window.firstDefined(m.id,'')).toLowerCase();
      var sku=String(window.firstDefined(m.sku,'')).toLowerCase();
      var ttl=String(window.firstDefined(m.title,'')).toLowerCase();
      var aid=String(window.firstDefined(m.__auto_id,'')).toLowerCase();
      if (k===id || k===sku || k===ttl || k===aid) return m;
    }
    return null;
  }
  window.findProductByKey = window.findProductByKey || findProductByKey;

  function updateDock(){
    var dockCount = document.getElementById('dockCount'); if (!dockCount) return;
    var n = window.CART.length; dockCount.textContent = n; dockCount.style.display = n ? '' : 'none';
    try{ dockCount.setAttribute('aria-label', n ? (n+' article'+(n>1?'s':'')) : '0 article'); }catch(_){}
  }
  function saveCart(){
    try{ localStorage.setItem(window.STORE_KEY, JSON.stringify(window.CART)); }catch(_){}
    updateDock();
    if (((location.hash||'').toLowerCase()).indexOf('#/devis')===0){ try{ renderCartView(); }catch(_){ } }
    try{ window.dispatchEvent(new CustomEvent('pt:cartChanged')); }catch(_){}
  }
  (function loadCart(){ try{ var raw=localStorage.getItem(window.STORE_KEY); window.CART = raw ? JSON.parse(raw) : []; }catch(_){ window.CART=[]; } updateDock(); })();
  function addToCart(keyOrId, qty){
    qty=Math.max(1, Number(qty||1)); var p=findProductByKey(keyOrId); if(!p) return; for (var i=0;i<qty;i++) window.CART.push(p);
    saveCart(); try{ window.toast((p.title||p.sku||'Article')+' ajouté','success'); }catch(_){}
    try{ window.announce('Article ajouté au panier'); }catch(_){}
  }
  window.addToCart = window.addToCart || addToCart;

  function cartToWhatsAppText(){
    var grouped=groupCart(); if (!grouped.length) return '';
    var lines = grouped.map(function(g){
      var it=g.item||{}, qty=g.qty||0;
      var sku=it.sku||it.id||it.__auto_id||'';
      var title=(it.title||((it.brand||'')+' '+(it.sku||''))).trim();
      var pc=priceCentsFrom(it), curr=(it&&it.currency)?it.currency:'EUR';
      var ttc = (pc!=null) ? (' — ' + fmtCents(Math.round(pc*(1+VAT_RATE)), curr) + ' TTC' + (qty>1?(' (total '+fmtCents(Math.round(pc*(1+VAT_RATE))*qty, curr)+')'):'') + ' — HT: ' + fmtCents(pc, curr)) : '';
      return '• ' + sku + ' – ' + title + (qty>1?(' ×'+qty):'') + ttc;
    });
    var contact=''; try{
      var u=(typeof window.loadUser==='function')?window.loadUser():null; var arr=[];
      if(u&&u.name)arr.push('Nom: '+u.name); if(u&&u.email)arr.push('Email: '+u.email); if(u&&u.phone)arr.push('Téléphone: '+u.phone); if(u&&u.addr)arr.push('Adresse: '+u.addr);
      contact = arr.length ? '\n\nMes coordonnées:\n' + arr.join('\n') : '';
    }catch(_){}
    var link = absoluteUrl('#/devis');
    return 'Bonjour, je souhaite un devis pour:\n' + lines.join('\n') + '\n\nLien: ' + link + contact + '\n\nMerci.';
  }
  window.cartToWhatsAppText = window.cartToWhatsAppText || cartToWhatsAppText;

  // JSON-LD Product
  function schemaAvailability(p){
    var s=(p.stock_status||'').toLowerCase(); var base='https://schema.org/';
    if (s==='in_stock') return base+'InStock';
    if (s==='low_stock') return base+'LimitedAvailability';
    if (s==='out_of_stock') return base+'OutOfStock';
    return (p.stock_qty>0)?base+'InStock':base+'OutOfStock';
  }
  function buildProductJsonLD(p){
    var images=[]; if (p.img) images.push(absoluteUrl(p.img)); if (Array.isArray(p.gallery)) for (var i=0;i<p.gallery.length;i++) images.push(absoluteUrl(p.gallery[i]));
    var price=(typeof p.price==='number')?p.price:((typeof p.price_cents==='number')?p.price_cents/100:void 0);
    var url=absoluteUrl('#/produit/'+encodeURIComponent(keyOf(p)));
    function prune(o){
      if (Array.isArray(o)){ var a=[],i; for(i=0;i<o.length;i++){ var pv=prune(o[i]); if(pv!=null) a.push(pv); } return a; }
      if (o && typeof o==='object'){ var r={},k; for (k in o){ if(!Object.prototype.hasOwnProperty.call(o,k)) continue; var pv=prune(o[k]); if(pv!=null && !(Array.isArray(pv)&&!pv.length)) r[k]=pv; } return Object.keys(r).length?r:null; }
      return (o===void 0||o===null)?null:o;
    }
    return prune({
      "@context":"https://schema.org",
      "@type":"Product",
      "name": p.title || ((p.brand||'')+' '+(p.sku||'')),
      "sku":  p.sku || p.id || p.__auto_id || void 0,
      "mpn":  p.sku || void 0,
      "gtin13": p.gtin13 || void 0,
      "brand": p.brand ? { "@type":"Brand", "name":p.brand } : void 0,
      "category": p.category || void 0,
      "description": (p.seo&&p.seo.description) || p.desc || p.description || void 0,
      "image": images.length ? images : void 0,
      "url": url,
      "offers":{
        "@type":"Offer",
        "priceCurrency": p.currency || 'EUR',
        "price": price!=null ? String(price) : void 0,
        "availability": schemaAvailability(p),
        "itemCondition": (p.new===true) ? "https://schema.org/NewCondition" : ((p.new===false) ? "https://schema.org/UsedCondition" : void 0),
        "url": url
      },
      "aggregateRating": (typeof p.rating_value==='number' && typeof p.rating_count==='number') ? {
        "@type":"AggregateRating","ratingValue": String(p.rating_value),"reviewCount": String(p.rating_count)
      } : void 0
    });
  }
  function injectProductJsonLD(p){
    try{ var id='jsonld-product'; var old=document.getElementById(id); if(old&&old.parentNode) old.parentNode.removeChild(old);
      var json=buildProductJsonLD(p); if(!json) return;
      var s=document.createElement('script'); s.type='application/ld+json'; s.id=id; s.textContent=JSON.stringify(json); document.head.appendChild(s);
    }catch(_){}
  }
  function clearProductJsonLD(){ var s=document.getElementById('jsonld-product'); if(s&&s.parentNode) s.parentNode.removeChild(s); }
  window.clearProductJsonLD = window.clearProductJsonLD || clearProductJsonLD;

  // Indexation recherche
  function indexModelsForSearch(models){
    models = Array.isArray(models)?models:[];
    for (var i=0;i<models.length;i++){
      var m=models[i]||{}; ensureStableKey(m);
      var hay=[window.fallback(m.title,''), window.fallback(m.sku,''), window.fallback(m.brand,''), window.fallback(m.category,''), window.fallback(m.desc,window.fallback(m.description,'')), (Array.isArray(m.tags)?m.tags.join(' '):''), window.fallback(m.badge,'')].join(' ').toLowerCase();
      m.__haystack=hay; m.__hay_norm=normKey(hay); m.__brand_n=normKey(m.brand); m.__badge_n=normKey(m.badge); m.__tags_n=Array.isArray(m.tags)?m.tags.map(normKey):[]; m.__title_n=normKey(m.title||(m.brand+' '+m.sku)); m.__price_c=priceCentsFrom(m); m.__cat_n=normKey(m.category);
      models[i]=m;
    }
    return models;
  }
  function ensureProductsLoaded(cb){
    function done(){ try{ cb(window.MODELS); }catch(_){ } }
    if (Array.isArray(window.MODELS) && window.MODELS.length){ window.MODELS=indexModelsForSearch(window.MODELS); return done(); }
    if (typeof window.loadProducts==='function'){
      Promise.resolve(window.loadProducts()).then(function(arr){ window.MODELS=indexModelsForSearch(arr||[]); done(); })
        .catch(function(){ window.MODELS=indexModelsForSearch([]); done(); });
      return;
    }
    fetch(absoluteUrl('products.json'), {cache:'no-store'})
      .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .then(function(json){ var arr=Array.isArray(json)?json:(json&&Array.isArray(json.products)?json.products:[]); window.MODELS=indexModelsForSearch(arr||[]); try{ window.dispatchEvent(new CustomEvent('pt:productsLoaded')); }catch(_){ } done(); })
      .catch(function(){ window.MODELS=indexModelsForSearch([]); try{ window.dispatchEvent(new CustomEvent('pt:productsLoaded')); }catch(_){ } done(); });
  }

  // UI: cartes produit + PDP
  function productCardHTML(m){
    var title = window.fallback(m.title, (window.fallback(m.brand,'') + (m.brand?' ':'') + window.fallback(m.sku,''))).trim();
    var tag   = window.fallback(m.badge, (Array.isArray(m.tags)&&m.tags[0]) || window.fallback(m.tag,'')).trim();
    var desc  = window.fallback(m.desc, window.fallback(m.description,''));
    var id    = keyOf(m);
    var currency   = m && m.currency ? m.currency : 'EUR';
    var priceCents = priceCentsFrom(m);
    var priceHtml = (priceCents!=null) ? '<div class="price" aria-label="Prix TTC">'+esc(fmtCents(Math.round(priceCents*(1+VAT_RATE)),currency))+' <small class="subtle">TTC</small></div>' : '';
    return ''
      + '<article class="card" data-id="'+esc(id)+'">'
      + '  <div class="head"><h3 class="title">'+esc(title)+'</h3>'+(tag?'<span class="badge">'+esc(tag)+'</span>':'')+'</div>'
      + '  <div class="specs"><p class="mt-0 mb-0">'+(desc?esc(desc):'—')+'</p>'+priceHtml+'</div>'
      + '  <div class="actions"><a class="btn" href="#/produit/'+encodeURIComponent(id)+'">Détails</a><button class="btn primary" data-add="'+esc(id)+'">Ajouter au panier</button></div>'
      + '</article>';
  }
  function wireCardsAddToCart(root){
  root = root || document.getElementById('list'); if (!root) return;
  var btns = root.querySelectorAll ? root.querySelectorAll('[data-add]') : [];
  for (var i=0;i<btns.length;i++){
    (function(btn){
      if (btn.__ptWired) return; btn.__ptWired = 1;
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var id = btn.getAttribute('data-add');
        var p  = findProductByKey(id);
        if (!p) return;
        window.CART.push(p);
        saveCart();
      }, false);
    })(btns[i]);
  }
}


  
  
 // <!-- Suite du bundle (à coller après la dernière ligne reçue) -->


  /* poursuite: section 4) Catalogue + PDP + Devis + Compte + Router */
  // ======== SPEC/UTILS LOCAUX ========
  function buildSpecsHTML(specs){
    if (!specs) return '';
    var html='', i, k;
    if (Array.isArray(specs)){
      for (i=0;i<specs.length;i++){
        var s = specs[i]; if (s==null) continue;
        if (typeof s==='string'){ html += '<li>'+esc(s)+'</li>'; }
        else if (s && typeof s==='object'){ html += '<li><strong>'+esc(window.firstDefined(s.k,s.key,''))+':</strong> '+esc(window.firstDefined(s.v,s.val,s.value,''))+'</li>'; }
      }
    } else if (typeof specs==='object'){
      for (k in specs){ if(!Object.prototype.hasOwnProperty.call(specs,k)) continue;
        html += '<li><strong>'+esc(k)+':</strong> '+esc(specs[k])+'</li>';
      }
    }
    return html;
  }
  function priceHTTTC(cents, currency){
    if (cents==null) return {ht:'', ttc:''};
    currency = currency || 'EUR';
    var ht  = fmtCents(cents, currency);
    var ttc = fmtCents(Math.round(cents*(1+VAT_RATE)), currency);
    return {ht:ht, ttc:ttc};
  }
  function waLinkFromText(txt, phoneE164){
    var base = 'https://wa.me/';
    try{
      if (phoneE164 && /^[+0-9]+$/.test(String(phoneE164).replace(/\s+/g,''))){
        base += String(phoneE164).replace(/\+/g,'');
      }
    }catch(_){}
    var q = '?text=' + encodeURIComponent(txt||'');
    return base + q;
  }

  // ======== PDP ========
  function renderPDP(product){
    var elImg    = document.getElementById('pdpImg');
    var elT      = document.getElementById('pdpTitle');
    var elTag    = document.getElementById('pdpTag');
    var elDesc   = document.getElementById('pdpDesc');
    var elPrice  = document.getElementById('pdpPrice');
    var elPriceHT= document.getElementById('pdpPriceHT');
    var elSpecs  = document.getElementById('pdpSpecs');
    var elRel    = document.getElementById('pdpRelated');
    var btnAdd   = document.getElementById('pdpQuote');
    var btnShare = document.getElementById('pdpShare');
    var aWa      = document.getElementById('pdpWa');

    if (!product){ if(elT) elT.textContent='Produit introuvable'; return; }

    // Image
    var img = window.firstDefined(product.img, (product.gallery && product.gallery[0]));
    window.setSafeImg(elImg, img||window.IMG_FALLBACK, window.firstDefined(product.title, product.sku, ''));

    // Titre / Tag / Desc
    var title = window.fallback(product.title, ((product.brand||'') + (product.brand?' ':'') + window.fallback(product.sku,''))).trim();
    elT.textContent = title;
    elTag.textContent = window.fallback(product.badge, (Array.isArray(product.tags)&&product.tags[0]) || window.fallback(product.tag,''));
        elDesc.textContent = window.fallback(product.desc, window.fallback(product.description,''));
    // Boutons (PDP)
    if (btnAdd && !btnAdd.__ptW){ btnAdd.__ptW=1; btnAdd.addEventListener('click', function(){ window.addToCart(window.firstDefined(product.id, product.sku, product.__auto_id), 1); }, false); } // réactive “Ajouter au panier”
    if (btnShare && !btnShare.__ptW){ btnShare.__ptW=1; btnShare.addEventListener('click', function(){ var url = absoluteUrl('#/produit/'+encodeURIComponent(keyOf(product))); var text= title+' • '+url; try{ if (navigator.share && typeof navigator.share==='function'){ navigator.share({ title:title, text:title, url:url }).catch(function(){}); return; } }catch(_){}
      try{ navigator.clipboard && navigator.clipboard.writeText(text); window.toast('Lien copié','success'); }catch(_){ prompt('Copiez le lien', text); } }, false); } // réactive “Partager” + toast qualifié
    // Prix
    var pc = priceCentsFrom(product), cur = product && product.currency || 'EUR';
    if (pc!=null){
      var both = priceHTTTC(pc, cur);
      elPrice.innerHTML   = esc(both.ttc)+' <small class="subtle">TTC</small>';
      elPriceHT.textContent = 'HT: ' + both.ht + ' • TVA '+Math.round(VAT_RATE*100)+'%';
    } else {
      elPrice.textContent = '';
      //      elPriceHT.textContent = '';
    elSpecs.innerHTML = buildSpecsHTML(product.specs||product.spec||product.details||''); // rétablit l’affichage des spécifications sur la PDP
    if (aWa && !aWa.__ptW){
      aWa.__ptW=1;
      aWa.addEventListener('click', function(e){
        // laisser l'ouverture contrôler par href dynamique ci-dessous
      }, false);
    }
    // Lien WhatsApp prérempli (1 article)
    var singleLines = (function(){
      var sku = product.sku || product.id || product.__auto_id || '';
      var both = (pc!=null) ? (' — '+fmtCents(Math.round(pc*(1+VAT_RATE)), cur)+' TTC — HT: '+fmtCents(pc,cur)) : '';
      var line = '• '+sku+' – '+title+both;
      var contact=''; try{
        var u=(typeof window.loadUser==='function')?window.loadUser():null; var arr=[];
        if(u&&u.name)arr.push('Nom: '+u.name); if(u&&u.email)arr.push('Email: '+u.email); if(u&&u.phone)arr.push('Téléphone: '+u.phone); if(u&&u.addr)arr.push('Adresse: '+u.addr);
        contact = arr.length ? '\n\nMes coordonnées:\n' + arr.join('\n') : '';
      }catch(_){}
      var link = absoluteUrl('#/produit/'+encodeURIComponent(keyOf(product)));
      return 'Bonjour, je souhaite un devis pour:\n'+line+'\n\nLien: '+link+contact+'\n\nMerci.';
    })();
    try{
      var wa = waLinkFromText(singleLines, window.PHONE_E164);
      aWa.setAttribute('href', wa);
      aWa.setAttribute('rel','noopener');
    }catch(_){}

    // Produits liés
    try{
      var rel = computeRelated(product, 4);
      elRel.innerHTML = rel.length ? ('<h3>Produits liés</h3><div class="list">'+rel.map(productCardHTML).join('')+'</div>') : '';
      wireCardsAddToCart(elRel);
    }catch(_){}

    // JSON-LD + SEO
    try{
      injectProductJsonLD(product);
      var descSEO = (product.seo&&product.seo.description) || product.desc || product.description || title;
      var url = absoluteUrl('#/produit/'+encodeURIComponent(keyOf(product)));
      setCanonical(url);
      window.setPageMeta(title+' • Pirates Tools', descSEO); // setPageMeta est global
      setMetaOg('og:title', title+' • Pirates Tools');
      setMetaOg('og:description', descSEO);
      setMetaOg('og:url', url);
      if (img) setMetaOg('og:image', absoluteUrl(img));
    }catch(_){}
  }

  function computeRelated(p, max){
    var out=[], i, m, key=keyOf(p);
    var cat = (p && p.__cat_n)||'';
    var brand = (p && p.__brand_n)||'';
    for (i=0;i<(window.MODELS||[]).length;i++){
      m=window.MODELS[i]; if (!m) continue;
      if (keyOf(m)===key) continue;
      if ((m.__cat_n && m.__cat_n===cat) || (m.__brand_n && m.__brand_n===brand)){
        out.push(m);
      }
    }
    out.sort(function(a,b){
      var s=0;
      if (a.__brand_n===brand && b.__brand_n!==brand) s=-1;
      else if (a.__brand_n!==brand && b.__brand_n===brand) s=1;
      if (!s){
        var pa=priceCentsFrom(a)||1e12, pb=priceCentsFrom(b)||1e12;
        s = pa-pb;
      }
      return s;
    });
    if (max!=null) out = out.slice(0, Math.max(0, max));
    return out;
  }

  function showPDPByKey(key){
    ensureProductsLoaded(function(){
      var p = findProductByKey(key);
      renderPDP(p);
       window.showView('produit'); window.focusView('produit'); // qualifier les appels globaux
    });
  }

  // ======== CATALOGUE ========
  var __CAT_STATE = { q:'', tag:'', brand:'', sort:'rel' };

  function buildTagUniverse(products){
    var set={}, arr=[], i, j, p, t;
    for (i=0;i<products.length;i++){
      p = products[i]||{};
      if (Array.isArray(p.tags)){
        for (j=0;j<p.tags.length;j++){ t=String(p.tags[j]||''); if(!t) continue; set[t]=1; }
      }
      if (p.badge) set[String(p.badge)]=1;
      if (p.category) set[String(p.category)]=1;
    }
    for (t in set) if (Object.prototype.hasOwnProperty.call(set,t)) arr.push(t);
    arr.sort(function(a,b){ return String(a).localeCompare(String(b)); });
    return arr;
  }
  function renderTagSelect(){
    var select = document.getElementById('tag'); if (!select) return;
    var tags = buildTagUniverse(window.MODELS||[]);
    var html = '<option value="">Tous</option>';
    for (var i=0;i<tags.length;i++){ var t=tags[i]; html += '<option value="'+esc(t)+'">'+esc(t)+'</option>'; }
    select.innerHTML = html;
    if (__CAT_STATE.tag){ select.value = __CAT_STATE.tag; }
  }
  function renderSortSelect(){
    var s = document.getElementById('sort'); if(!s) return;
    var html = ''
      + '<option value="rel">Pertinence</option>'
      + '<option value="price_asc">Prix croissant</option>'
      + '<option value="price_desc">Prix décroissant</option>'
      + '<option value="brand">Marque</option>'
      + '<option value="title">Nom</option>';
    s.innerHTML = html;
    s.value = __CAT_STATE.sort || 'rel';
  }
  function renderCategoryChips(){
    var host = document.getElementById('catList'); if(!host) return;
    var map={}, i, p, k;
    for (i=0;i<(window.MODELS||[]).length;i++){
      p = window.MODELS[i]; k = p && p.category; if(!k) continue;
      map[k] = (map[k]||0)+1;
    }
    var cats=[], label;
    for (label in map) if(Object.prototype.hasOwnProperty.call(map,label)){ cats.push({label:label, count:map[label]}); }
    cats.sort(function(a,b){ return a.label.localeCompare(b.label); });
    var html = cats.map(function(c){
      return '<button class="chip" type="button" data-chip="'+esc(c.label)+'">'+esc(c.label)+' <span class="muted">('+c.count+')</span></button>';
    }).join('');
    host.innerHTML = html;
    // click
    var btns = host.querySelectorAll ? host.querySelectorAll('[data-chip]') : [];
    for (i=0;i<btns.length;i++){
      (function(btn){
        if (btn.__ptW) return; btn.__ptW=1;
        btn.addEventListener('click', function(){
          __CAT_STATE.tag = btn.getAttribute('data-chip')||'';
          var sel = document.getElementById('tag'); if (sel) sel.value = __CAT_STATE.tag;
         try{ window.announce('Filtre appliqué: '+__CAT_STATE.tag); }catch(_){ } // announce est global
          renderCatalogueList();
        }, false);
      })(btns[i]);
    }
  }
  function renderTagChipsActive(){
    var host = document.getElementById('tagChips'); if(!host) return;
    var chips=[];
    if (__CAT_STATE.brand) chips.push({k:'brand', v:__CAT_STATE.brand, label:'Marque: '+__CAT_STATE.brand});
    if (__CAT_STATE.tag) chips.push({k:'tag', v:__CAT_STATE.tag, label:'Filtre: '+__CAT_STATE.tag});
    if (__CAT_STATE.q) chips.push({k:'q', v:__CAT_STATE.q, label:'Recherche: '+__CAT_STATE.q});
    var html = chips.map(function(c){
      return '<span class="chip chip--active" data-clear="'+esc(c.k)+'">'+esc(c.label)+' ✕</span>';
    }).join('');
    host.innerHTML = html;
    var btns = host.querySelectorAll ? host.querySelectorAll('[data-clear]') : [];
    for (var i=0;i<btns.length;i++){
      (function(btn){
        if (btn.__ptW) return; btn.__ptW=1;
        btn.addEventListener('click', function(){
          var k = btn.getAttribute('data-clear');
          if (k==='brand') __CAT_STATE.brand='';
          if (k==='tag')   __CAT_STATE.tag='';
          if (k==='q')     __CAT_STATE.q='';
          var q = document.getElementById('q'); if (q) q.value = __CAT_STATE.q;
          var t = document.getElementById('tag'); if (t) t.value = __CAT_STATE.tag;
          applyCatalogueMeta();
          renderCatalogueList();
        }, false);
      })(btns[i]);
    }
  }
  function filterAndScore(models){
    var qn = normKey(__CAT_STATE.q||'');
    var tn = normKey(__CAT_STATE.tag||'');
    var bn = normKey(__CAT_STATE.brand||'');
    var arr = [], i, m;
    for (i=0;i<models.length;i++){
      m=models[i];
      if (bn && m.__brand_n!==bn) continue;
      if (tn){
        var hasTag = (Array.isArray(m.__tags_n) && m.__tags_n.indexOf(tn)>=0) || (m.__cat_n===tn) || (m.__badge_n===tn);
        if (!hasTag) continue;
      }
      if (qn){
        if (m.__hay_norm.indexOf(qn)<0) continue;
      }
      // score simple
      var score = 0;
      if (qn){
        if (m.__title_n.indexOf(qn)>=0) score+=40;
        if (m.__brand_n && qn.indexOf(m.__brand_n)>=0) score+=10;
        score += Math.max(0, 20 - Math.abs(m.__title_n.length - qn.length));
      }
      if (tn && ((Array.isArray(m.__tags_n)&&m.__tags_n.indexOf(tn)>=0) || m.__cat_n===tn)) score+=15;
      if (bn && m.__brand_n===bn) score+=20;
      arr.push({ m:m, score:score });
    }
    // tri
    var sort = __CAT_STATE.sort||'rel';
    arr.sort(function(a,b){
      if (sort==='price_asc'){
        return (a.m.__price_c||1e12) - (b.m.__price_c||1e12);
      } else if (sort==='price_desc'){
        return (b.m.__price_c||-1) - (a.m.__price_c||-1);
      } else if (sort==='brand'){
        return String(a.m.brand||'').localeCompare(String(b.m.brand||''));
      } else if (sort==='title'){
        return String(a.m.title||'').localeCompare(String(b.m.title||''));
      }
      // rel par défaut
      if (b.score!==a.score) return b.score - a.score;
      return String(a.m.title||'').localeCompare(String(b.m.title||''));
    });
    return arr.map(function(x){ return x.m; });
  }
  function renderCatalogueList(){
    var host = document.getElementById('list'); if(!host) return;
    host.setAttribute('aria-busy','true');
    var models = filterAndScore(window.MODELS||[]);
    host.innerHTML = models.length ? models.map(productCardHTML).join('') : '<p class="muted">Aucun article trouvé.</p>';
    wireCardsAddToCart(host);
    host.setAttribute('aria-busy','false');
    renderTagChipsActive();
  }
  function applyCatalogueMeta(){
    try{
      var title = 'Catalogue • Pirates Tools';
      var desc  = 'Catalogue complet — recherchez par marque, référence, description.';
      if (__CAT_STATE.brand){ title = 'Catalogue '+__CAT_STATE.brand+' • Pirates Tools'; }
      if (__CAT_STATE.q){ desc = 'Résultats pour "'+__CAT_STATE.q+'"'; }
      window.setPageMeta(title, desc); // setPageMeta est global
      setCanonical(absoluteUrl('#/catalogue'));
      setMetaOg('og:title', title);
      setMetaOg('og:description', desc);
      setMetaOg('og:url', absoluteUrl('#/catalogue'));
    }catch(_){}
  }
  function showCatalogueFromQuery(query){
    ensureProductsLoaded(function(){
      var vq   = (query&&query.q)||'';
      var vtag = (query&&query.tag)||'';
      var vbrand = (query&&query.brand)||'';
      __CAT_STATE.q = vq; __CAT_STATE.tag=vtag; __CAT_STATE.brand=vbrand;
      window.showView('catalogue'); window.focusView('catalogue'); // qualifier les appels globaux
      
      var iq=document.getElementById('q'); if(iq) iq.value = __CAT_STATE.q;
      renderTagSelect();
      renderSortSelect();
      renderCategoryChips();
      applyCatalogueMeta();
      renderCatalogueList();
      // wire inputs (idempotent)
      var sQ=document.getElementById('q'); if (sQ && !sQ.__ptW){ sQ.__ptW=1; sQ.addEventListener('input', debounce(function(){ __CAT_STATE.q = String(sQ.value||''); renderCatalogueList(); applyCatalogueMeta(); }, 130), false); }
      var sT=document.getElementById('tag'); if (sT && !sT.__ptW){ sT.__ptW=1; sT.addEventListener('change', function(){ __CAT_STATE.tag=String(sT.value||''); renderCatalogueList(); applyCatalogueMeta(); }, false); }
      var sS=document.getElementById('sort'); if (sS && !sS.__ptW){ sS.__ptW=1; sS.addEventListener('change', function(){ __CAT_STATE.sort=String(sS.value||'rel'); renderCatalogueList(); }, false); }
    });
  }

  // ======== COMPTE (utilisateur localStorage) ========
  var LS_USER='pt_user_v1';
  window.loadUser = window.loadUser || function(){ try{ var raw=localStorage.getItem(LS_USER); return raw?JSON.parse(raw):{}; }catch(_){ return {}; } };
   window.saveUser = window.saveUser || function(u){ try{ localStorage.setItem(LS_USER, JSON.stringify(u||{})); window.toast('Compte enregistré','success'); }catch(_){ } }; // qualifier toast
  function renderAccount(){
    var host=document.getElementById('accContent'); if(!host) return;
    var u = window.loadUser()||{};
    host.innerHTML = ''
      + '<form id="accForm" class="form">'
      + '  <label>Nom<br><input type="text" id="accName" value="'+esc(u.name||'')+'"></label>'
      + '  <label>Email<br><input type="email" id="accEmail" value="'+esc(u.email||'')+'"></label>'
      + '  <label>Téléphone<br><input type="tel" id="accPhone" value="'+esc(u.phone||'')+'"></label>'
      + '  <label>Adresse<br><textarea id="accAddr" rows="3">'+esc(u.addr||'')+'</textarea></label>'
      + '  <div class="actions"><button type="button" id="accSave" class="btn primary">Enregistrer</button></div>'
      + '</form>';
    var b=document.getElementById('accSave');
    if (b && !b.__ptW){ b.__ptW=1; b.addEventListener('click', function(){
      var nu={
        name: (document.getElementById('accName')||{}).value || '',
        email:(document.getElementById('accEmail')||{}).value||'',
        phone:(document.getElementById('accPhone')||{}).value||'',
        addr:(document.getElementById('accAddr')||{}).value||''
      };
      window.saveUser(nu);
    }, false);}
    // SEO
    try{
      window.setPageMeta('Mon compte • Pirates Tools','Enregistrez vos coordonnées pour accélérer les devis.'); // setPageMeta est global
      
      setCanonical(absoluteUrl('#/compte'));
      setMetaOg('og:title','Mon compte • Pirates Tools');
      setMetaOg('og:description','Enregistrez vos coordonnées pour accélérer les devis.');
      setMetaOg('og:url', absoluteUrl('#/compte'));
    }catch(_){}
  }

  // ======== DEVIS / PANIER ========
  function renderCartView(){
    var host = document.getElementById('devisList'); if(!host) return;
    var grouped = groupCart();
    if (!grouped.length){ host.innerHTML='<p class="muted">Votre panier est vide.</p>'; return; }
    var html='', i, g, it, id;
    var totalHT=0, currency='EUR';
    for (i=0;i<grouped.length;i++){
      g=grouped[i]; it=g.item||{}; id=keyOf(it);
      var title = window.fallback(it.title, ((it.brand||'')+' '+(it.sku||''))).trim();
      var pc=priceCentsFrom(it); if (pc!=null){ totalHT += pc * g.qty; currency=it.currency||currency; }
      html += ''
        + '<div class="row" data-id="'+esc(id)+'">'
        + '  <div class="col"><strong>'+esc(title)+'</strong><br><small class="muted">'+esc(it.sku||it.id||'')+'</small></div>'
        + '  <div class="col shrink">'
        + '    <div class="qty">'
        + '      <button class="btn" data-dec="'+esc(id)+'" aria-label="Moins">–</button>'
        + '      <span class="num">'+g.qty+'</span>'
        + '      <button class="btn" data-inc="'+esc(id)+'" aria-label="Plus">+</button>'
        + '    </div>'
        + '  </div>'
        + '  <div class="col shrink">'+(pc!=null?esc(fmtCents(Math.round(pc*(1+VAT_RATE))*g.qty,currency))+'<small class="subtle"> TTC</small>':'')+'</div>'
        + '</div>';
    }
    var tva = Math.round(totalHT*VAT_RATE);
    var totalTTC = totalHT + tva;
    html += '<hr><p><strong>Total HT:</strong> '+fmtCents(totalHT, currency)+' — <strong>TVA '+Math.round(VAT_RATE*100)+'%:</strong> '+fmtCents(tva, currency)+' — <strong>Total TTC:</strong> '+fmtCents(totalTTC, currency)+'</p>';
    host.innerHTML = html;
    // wire qty buttons
    var inc = host.querySelectorAll('[data-inc]')||[];
    for (i=0;i<inc.length;i++){
      (function(btn){
        if (btn.__ptW) return; btn.__ptW=1;
        btn.addEventListener('click', function(){
          addToCart(btn.getAttribute('data-inc'), 1);
        }, false);
      })(inc[i]);
    }
    var dec = host.querySelectorAll('[data-dec]')||[];
    for (i=0;i<dec.length;i++){
      (function(btn){
        if (btn.__ptW) return; btn.__ptW=1;
        btn.addEventListener('click', function(){
          var id = btn.getAttribute('data-dec');
          // retirer un exemplaire
          var k, idx=-1;
          for (k=window.CART.length-1;k>=0;k--){
            if (keyOf(window.CART[k])===id){ idx=k; break; }
          }
          if (idx>=0){ window.CART.splice(idx,1); saveCart(); }
        }, false);
      })(dec[i]);
    }
  }

  (function wireDevisActions(){
    var bSend=document.getElementById('devisSend');
    var bClear=document.getElementById('devisClear');
    var bCopy=document.getElementById('devisCopy');
    var bMail=document.getElementById('devisMail');

    if (bSend && !bSend.__ptW){
      bSend.__ptW=1; bSend.addEventListener('click', function(){
        var txt = window.cartToWhatsAppText();
        if (!txt){ window.toast('Panier vide','error'); return; } // qualifier toast
        var url = waLinkFromText(txt, window.PHONE_E164);
        try{ window.open(url, '_blank', 'noopener'); }catch(_){ location.href=url; }
      }, false);
    }
    if (bClear && !bClear.__ptW){
      bClear.__ptW=1; bClear.addEventListener('click', function(){
        if (!window.CART.length) return;
        if (confirm('Vider le panier ?')){
          window.CART=[]; saveCart();
        }
      }, false);
    }
    if (bCopy && !bCopy.__ptW){
      bCopy.__ptW=1; bCopy.addEventListener('click', function(){
        var txt = window.cartToWhatsAppText(); if (!txt){ window.toast('Panier vide','error'); return; } // qualifier toast
        try{ navigator.clipboard && navigator.clipboard.writeText(txt); window.toast('Copié','success'); }catch(_){ prompt('Copiez le devis:', txt); } // qualifier toast
      }, false);
    }
    if (bMail && !bMail.__ptW){
      bMail.__ptW=1; bMail.addEventListener('click', function(){
        var u = window.loadUser()||{}; var to=(u&&u.email)||'';
        var subject='Demande de devis • Pirates Tools';
        var body = window.cartToWhatsAppText();
        var href='mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
        try{ location.href = href; }catch(_){ }
      }, false);
    }
  })();

  function showDevis(){
    window.showView('devis'); window.focusView('devis'); // qualifier les appels globaux
    try{
      window.setPageMeta('Mon devis • Pirates Tools','Vérifiez les articles et envoyez votre demande de devis via WhatsApp, email ou copier/coller.'); // setPageMeta est global
      setCanonical(absoluteUrl('#/devis'));
      setMetaOg('og:title','Mon devis • Pirates Tools');
      setMetaOg('og:description','Envoyez votre demande de devis en 1 clic.');
      setMetaOg('og:url', absoluteUrl('#/devis'));
    }catch(_){}
    renderCartView();
  }

  // ======== ROUTER ========
  function route(){
    var p = window.parseHash(); var v=p.view||''; // qualifier l’appel global pour cohérence
    // reset JSON-LD produit si on quitte
    if (v!=='produit'){ try{ clearProductJsonLD(); }catch(_){ } }
    if (!v || v==='home' || v==='/'){
     window.resetPageMeta(); window.showView('home'); window.focusView('home'); // qualifier les appels globaux
      try{
        setCanonical(absoluteUrl('#/'));
        setMetaOg('og:title','Pirates Tools • Outillage pro (PWA)');
        setMetaOg('og:description','Visseuses à chocs DeWALT, dispo Antilles. PWA rapide, contact immédiat (téléphone & WhatsApp).');
        setMetaOg('og:url', absoluteUrl('#/'));
      }catch(_){}
      return;
    }
    if (v==='catalogue'){ showCatalogueFromQuery(p.query); return; }
    if (v==='produit'){
      var id = p.sub||''; if (!id){ location.hash='#/catalogue'; return; }
      showPDPByKey(decodeURIComponent(id)); return;
    }
    if (v==='devis'){ showDevis(); return; }
    if (v==='compte'){ window.showView('compte'); window.focusView('compte'); renderAccount(); return; } // qualifier les appels globaux
    // fallback
   window.showView('home'); window.focusView('home'); // qualifier les appels globaux
  }
  window.addEventListener('hashchange', route, false);
  if (document.readyState==='complete' || document.readyState==='interactive'){ route(); }
  else { document.addEventListener('DOMContentLoaded', route, false); }


