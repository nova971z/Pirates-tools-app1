/* =========================================================
   Pirates Tools — app.js (Partie 1/4)
   Boot SPA + Helpers + Home + Marques + Loader produits + Hero overshoot
   + Détecteur intelligent (scroll / bas de page masqué / vh iOS / safe-area)
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

  /* ---------- Append “body-safe” (évite body null) ---------- */
  function appendToBodySafe(el){
    if (!el) return;
    if (document.body){ document.body.appendChild(el); }
    else {
      var once = function(){ document.removeEventListener('DOMContentLoaded', once, false); document.body.appendChild(el); };
      document.addEventListener('DOMContentLoaded', once, false);
    }
  }

  /* ---------- Base publique & constantes ---------- */
  if (typeof window.PUBLIC_BASE !== 'string'){
    try{
      // Base = <base href> si présent, sinon base du document (avec slash final)
      window.PUBLIC_BASE = new URL('.', (document.baseURI || location.href)).href;
    }catch(_){
      window.PUBLIC_BASE = location.origin + location.pathname.replace(/[^\/]*$/,'');
    }
  }
  if (typeof window.IMG_FALLBACK !== 'string'){
    try{
      window.IMG_FALLBACK = new URL('images/pirates-tools-logo.png?v=7', window.PUBLIC_BASE).href;
    }catch(_){
      window.IMG_FALLBACK = './images/pirates-tools-logo.png?v=7';
    }
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
        host = document.createElement('div');
        host.id = 'toasts';
        host.className = 'pt-root';
        host.setAttribute('aria-live','polite');
        appendToBodySafe(host);
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
      if (!live){
        live = document.createElement('div');
        live.id='sr-live';
        live.className='sr-only pt-root';
        live.setAttribute('aria-live','polite');
        appendToBodySafe(live);
      }
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
          if (!m){
            m = document.createElement('meta');
            m.setAttribute('name','description');
            document.head.appendChild(m);
          }
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

  // Images sûres (force http -> https si possible, data/blob safe)
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
        if (/^(data:|blob:|about:|javascript:)/i.test(s)){
          img.src = s || window.IMG_FALLBACK;
        }else{
          var u = (/^https?:/i.test(s) || /^\/\//.test(s)) ? new URL(s, location.href) : new URL(s, window.PUBLIC_BASE);
          if (u.protocol === 'http:') u.protocol = 'https:';
          img.src = u.href;
        }
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
      for (var i=0;i<ids.length;i++){
        var el = document.getElementById('view-'+ids[i]);
        if (el) el.classList.add('hidden');
      }
      var want = document.getElementById('view-'+key);
      if (want) want.classList.remove('hidden');
    };
  }
  if (typeof window.focusView !== 'function'){
    window.focusView = function(key){
      var v = document.getElementById('view-'+key); if (!v) return;
      var h1 = v.querySelector('h1'); if (!h1) return;
      h1.setAttribute('tabindex','-1');
      try{ h1.focus({preventScroll:true}); }catch(_){ try{ h1.focus(); }catch(__){} }
      setTimeout(function(){ try{ h1.removeAttribute('tabindex'); }catch(_){ } }, 250);
    };
  }

  /* ---------- Vues fallback DOM (safe) ---------- */
  function ensureView(id, html){
    var v = document.getElementById(id);
    if (!v){
      v = document.createElement('section'); v.id = id; v.className = 'view hidden';
      v.innerHTML = html;
      appendToBodySafe(v);
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

  // Vue Compte: seulement si la Partie 3 n'a pas déjà booté
  if (!window.__ptP3Booted){
    ensureView('view-compte',
      '<div class="container">'+
        '<h1 tabindex="-1">Mon compte</h1>'+
        '<div id="accContent"></div>'+
      '</div>'
    );
  }

  // Ancre PDP (renommée pour éviter le conflit avec la PDP Part 2)
  if (!document.getElementById('pdp-anchor')){
    var a = document.createElement('a');
    a.id='pdp-anchor'; a.className='sr-only'; a.setAttribute('aria-hidden','true');
    appendToBodySafe(a);
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
function ensureDockVisible(){
  var dock = document.getElementById('dock');
  if (!dock) return;
  if (!dock.classList.contains('dock--visible')) dock.classList.add('dock--visible');
  if (!dock.classList.contains('dock--safe')) dock.classList.add('dock--safe');
  var zi = parseInt(dock.style.zIndex || '0', 10) || 0;
  if (zi < 1000) dock.style.zIndex = 1000;
}
document.addEventListener('DOMContentLoaded', ensureDockVisible, false);
window.addEventListener('hashchange', function(){
  ensureDockVisible();
  if (window.PT && typeof window.PT.refreshViewportSafe === 'function') window.PT.refreshViewportSafe();
}, false);
try{ new MutationObserver(ensureDockVisible).observe(document.body, {childList:true, subtree:true}); }catch(_){}


  /* ---------- Grille marques : toutes les marques visibles ---------- */
  // 1) Référentiel des logos
  var BRAND_META = (function(){
    var ver  = (window.__ASSET_VER || '10');
    var base;
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
      facom:     { label:'Facom',     logo: url('facom.jpg')     } // vérifier l’asset .jpg/.png
    };
  })();

  // Normalisation souple "label → key" (accents/espaces/casse)
  function normKey(s){
    s = String(s||'').toLowerCase();
    s = s.replace(/\s+/g,' ').replace(/[_-]+/g,' ').replace(/[’'`]/g,'');
    s = s.replace(/[àáâãäå]/g,'a').replace(/[ç]/g,'c')
         .replace(/[èéêë]/g,'e').replace(/[ìíîï]/g,'i')
         .replace(/[ñ]/g,'n').replace(/[òóôõö]/g,'o')
         .replace(/[ùúûü]/g,'u').replace(/[ýÿ]/g,'y');
    s = s.replace(/\s+/g,'').trim();
    return s;
  }
  function labelToKey(label){
    var n = normKey(label);
    for (var k in BRAND_META){
      if (!Object.prototype.hasOwnProperty.call(BRAND_META,k)) continue;
      if (n === normKey(BRAND_META[k].label) || n === normKey(k)) return k;
    }
    return '';
  }

  // 2) Comptage par marque (fallback brand_key -> brand)
  function computeBrands(products){
    var counts = {};
    var k;
    for (k in BRAND_META) if (Object.prototype.hasOwnProperty.call(BRAND_META,k)) counts[k] = 0;

    for (var i=0;i<(products||[]).length;i++){
      var p = products[i] || {};
      var fromKey = (p.brand_key!=null) ? String(p.brand_key) : '';
      var fromLabel = (p.brand!=null) ? String(p.brand) : '';
      var key = fromKey ? normKey(fromKey) : labelToKey(fromLabel);

      if (key && !counts.hasOwnProperty(key)){
        key = labelToKey(fromKey || fromLabel);
      }
      if (key && counts.hasOwnProperty(key)){
        counts[key] += 1;
      }
    }

    var out = [];
    for (k in BRAND_META){
      if (!Object.prototype.hasOwnProperty.call(BRAND_META,k)) continue;
      var meta = BRAND_META[k];
      out.push({ key:k, label:meta.label, logo:meta.logo, count:counts[k]||0 });
    }
    out.sort(function(a,b){ return a.label.localeCompare(b.label); });
    return out;
  }

  // 3) Rendu des bulles (+ wiring immédiat, idempotent)
  function wireBrandGrid(host){
    if (!host || host.__ptWired) return;
    host.__ptWired = 1;

    var pressFx = function(e){
      var el = e.target && e.target.closest ? e.target.closest('.brand') : null;
      if (!el) return;
      el.style.transform='scale(0.98)';
      setTimeout(function(){ el.style.transform=''; }, 160);
    };
    host.addEventListener('pointerdown', pressFx, false);
    host.addEventListener('mousedown',  pressFx, false);

    host.addEventListener('click', function(e){
      var btn = e.target && e.target.closest ? e.target.closest('[data-brand]') : null;
      if (!btn) return;
      var key = btn.getAttribute('data-brand')||'';
      if (!key) return;
      location.hash = '#/catalogue?brand='+encodeURIComponent(key);
    }, false);
  }

  function renderBrandGridFromProducts(products){
    var host = document.getElementById('brandGrid'); if (!host) return;
    var brands = computeBrands(products);
    var html = '';
    for (var i=0;i<brands.length;i++){
      var b = brands[i];
      html += ''
        + '<button class="brand" type="button" data-brand="'+b.key+'" aria-label="Voir '+b.label+'">'
        + '  <span class="brand__bubble">'
        + '    <img class="brand__logo" alt="'+b.label+'" data-src="'+b.logo+'" decoding="async" loading="lazy" referrerpolicy="no-referrer">'
        + '  </span>'
        + '  <span class="brand__label">'+b.label+'</span>'
        + '</button>';
    }
    host.innerHTML = html;

    // applique setSafeImg (https + fallback) une fois dans le DOM
    var imgs = host.querySelectorAll ? host.querySelectorAll('img[data-src]') : [];
    for (var j=0;j<imgs.length;j++){
      var im = imgs[j];
      var src = im.getAttribute('data-src')||'';
      window.setSafeImg(im, src, im.getAttribute('alt')||'');
      im.removeAttribute('data-src');
    }

    // wiring (tap → #/catalogue?brand=xxx)
    wireBrandGrid(host);
  }
  window.PT = window.PT || {};
  window.PT.renderBrandGridFromProducts = renderBrandGridFromProducts;

  /* ---------- Chargement produits (mémoisé & robuste) ---------- */
  function _withTimeout(p, ms){
    return new Promise(function(resolve, reject){
      var t = setTimeout(function(){ reject(new Error('timeout')); }, Math.max(3000, ms||6500));
      p.then(function(v){ clearTimeout(t); resolve(v); }, function(e){ clearTimeout(t); reject(e); });
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
      window.__PT_PRODUCTS = inline.slice();
      window.MODELS = inline.slice();
      try{ window.dispatchEvent(new CustomEvent('pt:productsLoaded')); }catch(_){}
      return Promise.resolve(window.__PT_PRODUCTS);
    }

    var url;
    try{ url = new URL('products.json', window.PUBLIC_BASE).href; }catch(_){ url = './products.json'; }

    return _withTimeout(fetch(url, { cache:'no-store' }), 7000)
      .then(function(r){
        if (!r || !r.ok) throw new Error('network');
        return r.json();
      })
      .then(function(json){
        var arr = Array.isArray(json) ? json : (json && Array.isArray(json.products) ? json.products : []);
        if (!Array.isArray(arr)) arr = [];
        window.__PT_PRODUCTS = arr.slice();
        window.MODELS = window.__PT_PRODUCTS.slice();
        try{ window.dispatchEvent(new CustomEvent('pt:productsLoaded')); }catch(_){}
        return window.__PT_PRODUCTS;
      })
      .catch(function(){
        window.__PT_PRODUCTS = [];
        window.MODELS = [];
        try{ window.dispatchEvent(new CustomEvent('pt:productsLoaded')); }catch(_){}
        return [];
      });
  }
  if (typeof window.loadProducts !== 'function') window.loadProducts = loadProducts;
  window.PT.loadProducts = loadProducts;

  /* ---------- Routeur minimal (laisse Part 4 prendre la main) ---------- */
  function handleRoute(){
    if (window.__ptRouterPrimary === 1) return; // (1.2) garde si P4 pilote
    var p = window.parseHash();
    if (!p.view || p.view==='home' || p.view==='/'){
      window.showView('home'); window.resetPageMeta();
      loadProducts().then(function(arr){ renderBrandGridFromProducts(arr); });
      window.focusView('home');
      return;
    }
    if (p.view==='catalogue'){
      window.showView('catalogue'); window.resetPageMeta(); window.focusView('catalogue'); return;
    }
    // Les autres vues sont rendues par les autres parties
  }
  window.PT.handleRoute = handleRoute;

  if (!window.__ptRouterPrimary){ // (10.1) seulement si pas de routeur principal
    window.addEventListener('hashchange', handleRoute, false);
  }

  // Re-render de la grille si les produits arrivent après
  window.addEventListener('pt:productsLoaded', function(){
    var p = window.parseHash();
    if (!p.view || p.view==='home' || p.view==='/'){
      try{ renderBrandGridFromProducts(window.MODELS||[]); }catch(_){}
    }
  }, false);

  /* ---------- Hero overshoot (petit plus UX, no-conflict P6A) ---------- */
  (function(){
    if (window.__ptHeroWired5) return; // (11.1) court-circuit si P6A présent
    var ticking = 0;
    function onScroll(){
      if (ticking) return;
      ticking = 1;
      setTimeout(function(){
        ticking = 0;
        var y = (window.pageYOffset||document.documentElement.scrollTop||0);
        var root = document.body;
        if (!root) return;
        if (y > 12){ root.classList.add('is-overshoot'); }
        else { root.classList.remove('is-overshoot'); }
      }, 60);
    }
    window.addEventListener('scroll', onScroll, { passive:true });
  })();

  /* =========================================================
     Détecteur intelligent (scroll, bas de page masqué, vh iOS)
     - Non destructif : n’applique que si nécessaire
     - ES5-safe, idempotent
  ========================================================== */
  (function(){
    if (window.__ptSmartGuard) return; window.__ptSmartGuard = 1;

    var W = window, D = document, E = D.documentElement, B = D.body;

    function num(v){ v = parseFloat(v); return isNaN(v)?0:v; }
    function css(el){ return W.getComputedStyle ? W.getComputedStyle(el) : (el.currentStyle||{}); }
    function px(v){ return (v==null || v==='') ? 0 : num(String(v).replace('px','')); }

    /* --- 1) Variables viewport (vh/vw fiables) --- */
    function setViewportVars(){
      try{
        var vh = (W.visualViewport && W.visualViewport.height) ? W.visualViewport.height : W.innerHeight || E.clientHeight || 0;
        var vw = (W.visualViewport && W.visualViewport.width)  ? W.visualViewport.width  : W.innerWidth  || E.clientWidth  || 0;
        E.style.setProperty('--app-vh', (vh*0.01)+'px');
        E.style.setProperty('--app-vw', (vw*0.01)+'px');
      }catch(_){}
    }

    /* --- 2) Safe-area & obstructions (dock, footers fixes) --- */
    function getSafeAreaBottom(){
      var vvb = 0;
      try{
        if (W.visualViewport){
          var ih = W.innerHeight||0;
          var used = (W.visualViewport.height||0) + (W.visualViewport.offsetTop||0);
          vvb = Math.max(0, ih - used);
        }
      }catch(_){}
      // CSS env(safe-area-inset-bottom)
      var cssEnv = 0;
      try{
        var probe = D.createElement('div');
        probe.style.cssText = 'position:fixed;left:-9999px;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom);';
        D.body ? D.body.appendChild(probe) : E.appendChild(probe);
        cssEnv = num(W.getComputedStyle(probe).paddingBottom);
        probe.parentNode.removeChild(probe);
      }catch(_){}
      return Math.max(vvb, cssEnv, 0);
    }

    function getDockHeight(){
      var el = D.getElementById('dock');
      if (!el) return 0;
      var st = css(el);
      var pos = (st && st.position)||'';
      if (pos!=='fixed' && pos!=='sticky') return 0;
      var r = el.getBoundingClientRect ? el.getBoundingClientRect() : {top:0,bottom:0};
      var h = Math.max(0, Math.min(W.innerHeight||0, r.bottom) - Math.max(0, r.top));
      return Math.max(0, h||0);
    }

    function computeObstruction(){
      var hDock = getDockHeight();
      var safe  = getSafeAreaBottom();
      return Math.max(hDock, safe);
    }

    function applyBottomPadding(){
      try{
        var need = computeObstruction();
        if (!need){
          E.style.setProperty('--safe-bottom','0px');
          if (B && B.__ptOrigPB!=null){ B.style.paddingBottom = B.__ptOrigPB; } // (12.2) restore
          return;
        }
        var cur = px(css(B).paddingBottom);
        var want = Math.max(cur, need + 6); // marge douce
        if (!B.__ptOrigPB){ B.__ptOrigPB = B.style.paddingBottom||''; }
        if (want > cur + 1){
          B.style.paddingBottom = want + 'px';
        }
        E.style.setProperty('--safe-bottom', need+'px');
      }catch(_){}
    }

    /* --- 3) Détection “page ne scrolle pas alors qu’elle est plus haute” --- */
    function fixScrollLockIfNeeded(){
      try{
        var sh = Math.max(B.scrollHeight||0, E.scrollHeight||0);
        var ch = Math.max(B.clientHeight||0, E.clientHeight||0, W.innerHeight||0);
        var needScroll = (sh - ch) > 16;
        if (!needScroll) return;

        var sb = css(B), se = css(E);
        var bodyLocked = (sb && (sb.overflow==='hidden' || sb.overflowY==='hidden'));
        var htmlLocked = (se && (se.overflow==='hidden' || se.overflowY==='hidden'));

        if (bodyLocked || htmlLocked){
          if (!B.__ptPrevOverflowY) B.__ptPrevOverflowY = B.style.overflowY || '';
          if (!E.__ptPrevOverflowY) E.__ptPrevOverflowY = E.style.overflowY || '';
          B.style.overflowY = 'auto';
          E.style.overflowY = 'auto';
          E.classList.add('pt-scroll-fix');
        }
      }catch(_){}
    }

    /* --- 4) Sentinelle bas de page : ajuste en dynamique --- */
    function ensureBottomSentinel(){
      var s = D.getElementById('pt-bottom-sentinel');
      if (!s){
        s = D.createElement('div');
        s.id = 'pt-bottom-sentinel';
        s.style.cssText = 'width:1px;height:1px;overflow:hidden;position:relative';
        appendToBodySafe(s);
      }
      return s;
    }

    var io;
    function watchBottom(){
      try{
        var s = ensureBottomSentinel();
        if (!('IntersectionObserver' in W)) return; // sans IO → padding via resize
        if (io) return;
        io = new IntersectionObserver(function(entries){
          var e = entries && entries[0]; if (!e) return;
          if (!e.isIntersecting || e.intersectionRatio < 1){
            applyBottomPadding();
          }
        }, { threshold:[1] });
        io.observe(s);
      }catch(_){}
    }

    /* --- 5) Boot + écoutes --- */
    function refreshAll(){
      setViewportVars();
      applyBottomPadding();
      fixScrollLockIfNeeded();
    }

    W.addEventListener('resize', function(){ setViewportVars(); applyBottomPadding(); }, { passive:true });
    W.addEventListener('orientationchange', function(){ setTimeout(refreshAll, 60); }, false);
    if (W.visualViewport && typeof W.visualViewport.addEventListener==='function'){
      W.visualViewport.addEventListener('resize', function(){ refreshAll(); }, { passive:true });
      W.visualViewport.addEventListener('scroll', function(){ refreshAll(); }, { passive:true });
    }
    W.addEventListener('hashchange', function(){ setTimeout(refreshAll, 0); }, false);
    D.addEventListener('DOMContentLoaded', function(){ refreshAll(); watchBottom(); }, false);

    // Expose (optionnel)
    window.PT = window.PT || {};
    if (typeof window.PT.refreshViewportSafe !== 'function'){
      window.PT.refreshViewportSafe = refreshAll;
    }
  })();

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', function(){
    // fallback visuels logos (et sécurisation src)
    (function(){
      function ensureFallback(img){
        if (!img) return;
        img.addEventListener('error', function(){ img.src = window.IMG_FALLBACK; });
        if (img.complete && img.naturalWidth === 0) img.src = window.IMG_FALLBACK;
      }
      var hero = document.getElementById('heroLogo');
      if (hero && hero.tagName==='IMG'){
        var s1 = hero.getAttribute('src')||'';
        window.setSafeImg(hero, s1, hero.getAttribute('alt')||'');
      }else{
        ensureFallback(hero);
      }
      var arr = $$('.topbar-logo');
      for (var i=0;i<arr.length;i++){
        var im = arr[i];
        if (im && im.tagName==='IMG'){
          var s2 = im.getAttribute('src')||'';
          window.setSafeImg(im, s2, im.getAttribute('alt')||'');
        }else{
          ensureFallback(im);
        }
      }
    })();

    // (1.1) ne route pas si routeur principal
    if (!window.__ptRouterPrimary){
      handleRoute();
    }

    // Précharger les produits le plus tôt possible sans bloquer
    var schedule = window.requestIdleCallback || function(fn){ return setTimeout(fn, 0); };
    schedule(function(){
      loadProducts().then(function(arr){
        if (!location.hash || location.hash==='#/' || location.hash==='#/home'){
          renderBrandGridFromProducts(arr);
        }
      });
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
   - Gère #/catalogue, #/produit/:id, #/devis (désactivé si __ptRouterPrimary=1)
   - Panier persistant + WhatsApp devis + synchro multi-onglets
   - Recherche indexée + tri + tags chips + virtualisation avec "Afficher plus"
   - JSON-LD Product enrichi (PDP) + prix TTC/HT (VAT_RATE sinon 0.20)
   - Cohérente avec la Partie 1 (PUBLIC_BASE, setSafeImg, loadProducts, MODELS, events)
   - Sécurité : échappement HTML, pas d’injection non échappée
========================================================= */
(function(){
  'use strict';

  /* ---------- Guards / helpers attendus (ne rien écraser) ---------- */
  if (typeof window.fallback !== 'function'){
    window.fallback = function(v, alt){ return (v===void 0 || v===null) ? (alt||'') : v; };
  }
  if (typeof window.firstDefined !== 'function'){
    window.firstDefined = function(){ for (var i=0;i<arguments.length;i++){ var v=arguments[i]; if (v!==void 0 && v!==null) return v; } };
  }
  if (typeof window.toast !== 'function')    window.toast = function(){};
  if (typeof window.announce !== 'function') window.announce = function(){};
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
  if (typeof window.setSafeImg !== 'function'){
    window.setSafeImg = function(img, src, alt){
      if (!img) return;
      img.loading = img.loading || 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.alt = alt||'';
      img.onerror = function(){ img.onerror=null; img.src = (window.IMG_FALLBACK||'./images/pirates-tools-logo.png?v=7'); };
      try{
        // Evite les new URL sur data:/blob:
        if (/^(data:|blob:)/i.test(String(src||''))){ img.src = src; return; }
        var u = new URL(src||'', (window.PUBLIC_BASE || location.href));
        if (u.protocol === 'http:') u.protocol = 'https:';
        img.src = u.href;
      }catch(_){
        img.src = (window.IMG_FALLBACK||'./images/pirates-tools-logo.png?v=7');
      }
    };
  }
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
  if (typeof window.showView  !== 'function'){
    window.showView = function(key){
      var ids = ['home','catalogue','produit','devis','compte'];
      for (var i=0;i<ids.length;i++){
        var el=document.getElementById('view-'+ids[i]); if(el) el.classList.add('hidden');
      }
      var want = document.getElementById('view-'+key); if (want) want.classList.remove('hidden');
    };
  }
  if (typeof window.focusView !== 'function') window.focusView = function(){};
  if (typeof window.notifyCartAdded !== 'function'){
    window.notifyCartAdded = function(label){
      try{ window.toast((label||'Article')+' ajouté', 'success'); }catch(_){}
      try{ window.announce('Article ajouté au panier'); }catch(_){}
    };
  }

  /* ---------- Mini utils locaux ---------- */
  function esc(s){
    s = String(s==null?'':s);
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
            .replace(/'/g,'&#39;');
  }
  function normKey(str){
    var s = String(str||'').toLowerCase();
    s = s.replace(/\s+/g,' ').replace(/[_-]+/g,' ').replace(/[’'`]/g,'');
    s = s.replace(/[àáâãäå]/g,'a').replace(/[ç]/g,'c')
         .replace(/[èéêë]/g,'e').replace(/[ìíîï]/g,'i')
         .replace(/[ñ]/g,'n').replace(/[òóôõö]/g,'o')
         .replace(/[ùúûü]/g,'u').replace(/[ýÿ]/g,'y');
    s = s.replace(/\s+/g,'').trim();
    return s;
  }
  function onlyDigits(s){ return String(s||'').replace(/[^\d]/g,''); }
  function debounce(fn, wait){
    wait = (wait==null)?140:wait;
    var t=0; return function(){ var args=arguments; clearTimeout(t); t=setTimeout(function(){ fn.apply(null,args); }, wait); };
  }

  /* ---------- Globals / constantes ---------- */
  var PUBLIC_BASE = (function(){
    try{
      if (typeof window.PUBLIC_BASE === 'string' && window.PUBLIC_BASE) return window.PUBLIC_BASE;
      var b = document.querySelector && document.querySelector('base[href]');
      if (b) return new URL(b.getAttribute('href'), location.href).href;
      return location.pathname;
    }catch(_){ return location.pathname; }
  })();
  var PHONE_E164   = window.PHONE_E164   || '+33774230195';
  var IMG_FALLBACK = window.IMG_FALLBACK || './images/pirates-tools-logo.png?v=7';
  var STORE_KEY    = window.STORE_KEY    || 'pt_cart_v1';
  var VAT_RATE     = (typeof window.VAT_RATE==='number' && isFinite(window.VAT_RATE)) ? window.VAT_RATE : 0.20;

  function absoluteUrl(u){
    try{
      // Evite new URL sur data:/blob:
      if (/^(data:|blob:)/i.test(String(u||''))) return u;
      return new URL(u||'', PUBLIC_BASE).href;
    }catch(_){ return u; }
  }

  // Etats & refs
  window.MODELS = Array.isArray(window.MODELS) ? window.MODELS : [];
  window.CART   = Array.isArray(window.CART)   ? window.CART   : [];

  var DOM = { list:null, q:null, tag:null, sort:null, chips:null, catList:null, dock:null, dockCount:null };
  function syncDomRefs(){
    DOM.list    = document.getElementById('list');
    DOM.q       = document.getElementById('q');
    DOM.tag     = document.getElementById('tag');
    DOM.sort    = document.getElementById('sort');
    DOM.chips   = document.getElementById('tagChips');
    DOM.catList = document.getElementById('catList');
    DOM.dock    = document.getElementById('dock');
    DOM.dockCount = document.getElementById('dockCount');
  }
  syncDomRefs();

  /* =========================================================
     A) PANIER — persistance, synchro, utils
  ========================================================== */
  function updateDock(){
    var n = window.CART.length;
    if (DOM.dockCount){
      DOM.dockCount.textContent = n;
      DOM.dockCount.style.display = n ? '' : 'none';
      try{ DOM.dockCount.setAttribute('aria-label', n ? (n+' article'+(n>1?'s':'')) : '0 article'); }catch(_){}
    }
  }
  function saveCart(){
    try{ localStorage.setItem(STORE_KEY, JSON.stringify(window.CART)); }catch(_){}
    updateDock();
    if (((location.hash||'').toLowerCase()).indexOf('#/devis')===0){
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

  // key stable : id/sku/title sinon auto-id déterministe (hash simple)
  function autoIdFor(m){
    try{
      var base = JSON.stringify({
        t:m && m.title || '',
        s:m && m.sku   || '',
        b:m && m.brand || '',
        c:m && m.category || ''
      });
      // djb2
      var h=5381, i=0; for(i=0;i<base.length;i++){ h=((h<<5)+h) + base.charCodeAt(i); h=h|0; }
      return 'pt_auto_'+(h>>>0).toString(36);
    }catch(_){ return 'pt_auto_'+Math.random().toString(36).slice(2); }
  }
  function ensureStableKey(m){
    if (!m) return m;
    var k = window.firstDefined(m.id, m.sku, m.title);
    if (k==null || k===''){ m.__auto_id = m.__auto_id || autoIdFor(m); }
    return m;
  }
  function keyOf(m){ m=ensureStableKey(m); return String(window.firstDefined(m&&m.id, m&&m.sku, m&&m.title, m&&m.__auto_id, '')); }

  function groupCart(){
    var map = {}, out = [];
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
      var m = window.MODELS[i] || {};
      var id  = String(window.firstDefined(m.id,'')).toLowerCase();
      var sku = String(window.firstDefined(m.sku,'')).toLowerCase();
      var ttl = String(window.firstDefined(m.title,'')).toLowerCase();
      var aid = String(window.firstDefined(m.__auto_id,'')).toLowerCase();
      if (k===id || k===sku || k===ttl || k===aid) return m;
    }
    return null;
  }
  if (typeof window.findProductByKey !== 'function') window.findProductByKey = findProductByKey;

  function addToCart(keyOrId, qty){
    qty = Math.max(1, Number(qty||1));
    var p = findProductByKey(keyOrId);
    if (!p) return;
    for (var i=0;i<qty;i++) window.CART.push(p);
    saveCart(); window.notifyCartAdded(p.title||p.sku||'Article');
  }
  if (typeof window.addToCart !== 'function') window.addToCart = addToCart;

  function cartToWhatsAppText(){
    var grouped = groupCart();
    if (!grouped.length) return '';
    var lines = grouped.map(function(g){
      var it = g.item||{}, qty = g.qty||0;
      var sku = it.sku || it.id || it.__auto_id || '';
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
    var link = absoluteUrl('#/devis');
    return 'Bonjour, je souhaite un devis pour:\n' + lines.join('\n') + '\n\nLien: ' + link + contact + '\n\nMerci.';
  }
  if (typeof window.cartToWhatsAppText !== 'function') window.cartToWhatsAppText = cartToWhatsAppText;

  // Synchro multi-onglets
  window.addEventListener('storage', function(e){
    if (!e || e.key !== STORE_KEY) return;
    loadCart();
    try{ renderCartView(); }catch(_){}
  }, false);

  /* =========================================================
     B) PRIX & FORMAT
  ========================================================== */
  function priceCentsFrom(m){
    if (!m) return null;
    if (typeof m.price_cents==='number' && isFinite(m.price_cents)) return Math.round(m.price_cents);
    if (typeof m.price==='number' && isFinite(m.price)) return Math.round(m.price*100);
    return null;
  }
  function fmtCents(cents, currency){
    if (cents == null) return '';
    currency = currency || 'EUR';
    try{ return (cents/100).toLocaleString('fr-FR', {style:'currency', currency:currency}); }
    catch(_){ return (cents/100).toFixed(2)+' '+currency; }
  }

  /* =========================================================
     C) PRODUITS — JSON-LD + rendu liste & PDP
  ========================================================== */
  function schemaAvailability(p){
    var s = (p.stock_status||'').toLowerCase();
    var base = 'https://schema.org/';
    if (s === 'in_stock')     return base + 'InStock';
    if (s === 'low_stock')    return base + 'LimitedAvailability';
    if (s === 'out_of_stock') return base + 'OutOfStock';
    return (p.stock_qty>0) ? base + 'InStock' : base + 'OutOfStock';
  }
  function buildProductJsonLD(p){
    var images = [];
    if (p.img) images.push(absoluteUrl(p.img));
    if (Array.isArray(p.gallery)) for (var i=0;i<p.gallery.length;i++) images.push(absoluteUrl(p.gallery[i]));
    var price = (typeof p.price==='number') ? p.price :
                (typeof p.price_cents==='number' ? p.price_cents/100 : void 0);
    var url = absoluteUrl('#/produit/' + encodeURIComponent(keyOf(p)));
    var data = {
      "@context":"https://schema.org",
      "@type":"Product",
      "name": p.title || ((p.brand||'')+' '+(p.sku||'')),
      "sku":  p.sku || p.id || p.__auto_id || void 0,
      "mpn":  p.sku || void 0,
      "gtin13": p.gtin13 || void 0,
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
    function prune(o){
      if (Array.isArray(o)){ var a=[]; for (var i=0;i<o.length;i++){ var pv=prune(o[i]); if(pv!=null) a.push(pv); } return a; }
      if (o && typeof o==='object'){ var r={}; for (var k in o){ if(!Object.prototype.hasOwnProperty.call(o,k)) continue; var pv=prune(o[k]); if(pv!=null && !(Array.isArray(pv)&&!pv.length)) r[k]=pv; } return Object.keys(r).length?r:null; }
      return (o===void 0 || o===null)?null:o;
    }
    return prune(data);
  }
  function injectProductJsonLD(p){
    try{
      var id='jsonld-product';
      var old = document.getElementById(id);
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var json = buildProductJsonLD(p); if(!json) return;
      var s=document.createElement('script'); s.type='application/ld+json'; s.id=id; s.textContent=JSON.stringify(json);
      document.head.appendChild(s);
    }catch(_){}
  }
  function clearProductJsonLD(){
    var s=document.getElementById('jsonld-product');
    if (s && s.parentNode) s.parentNode.removeChild(s);
  }
  if (typeof window.clearProductJsonLD !== 'function') window.clearProductJsonLD = clearProductJsonLD;

  // Carte produit (liste)
  function productCardHTML(m){
    var title = window.fallback(m.title, (window.fallback(m.brand,'') + (m.brand?' ':'') + window.fallback(m.sku,''))).trim();
    var tag   = window.fallback(m.badge, (Array.isArray(m.tags)&&m.tags[0]) || window.fallback(m.tag,'')).trim();
    var desc  = window.fallback(m.desc, window.fallback(m.description,''));
    var id    = keyOf(m);
    var currency   = m && m.currency ? m.currency : 'EUR';
    var priceCents = priceCentsFrom(m);
    var priceHtml = (priceCents!=null)
      ? '<div class="price" aria-label="Prix" style="margin-top:.35rem;font-weight:700">'+esc(fmtCents(priceCents,currency))+'</div>'
      : '';
    return ''
      + '<article class="card" data-id="'+esc(id)+'">'
      + '  <div class="head"><h3 class="title">'+esc(title)+'</h3>'+(tag?'<span class="badge">'+esc(tag)+'</span>':'')+'</div>'
      + '  <div class="specs"><p style="margin:0">'+(desc?esc(desc):'—')+'</p>'+priceHtml+'</div>'
      + '  <div class="actions">'
      + '    <a class="btn" href="#/produit/'+encodeURIComponent(id)+'">Détails</a>'
      + '    <button class="btn primary" data-add="'+esc(id)+'">Ajouter au panier</button>'
      + '  </div>'
      + '</article>';
  }

  function wireCardsAddToCart(scopeData, root){
    root = root || DOM.list; if(!root) return;
    var btns = root.querySelectorAll ? root.querySelectorAll('[data-add]') : [];
    for (var i=0;i<btns.length;i++){
      (function(btn){
        if (btn.__ptWired) return; btn.__ptWired = 1;
        btn.addEventListener('click', function(e){
          e.stopPropagation();
          var id = btn.getAttribute('data-add'); var p = findProductByKey(id);
          if (!p) return; window.CART.push(p); saveCart(); window.notifyCartAdded(p.title||p.sku||'Article');
        }, false);
      })(btns[i]);
    }
  }

  // PDP
  function renderPDP(product){
    var view = document.getElementById('view-produit');
    if (!view){
      view = document.createElement('section'); view.id='view-produit'; view.className='view';
      view.innerHTML =
        '<div class="container pdp" id="pdpContent">'+
          '<a class="chip chip--back" href="#/catalogue" aria-label="Retour au catalogue">← Retour</a>'+
          '<div class="pdp__grid">'+
            '<div class="pdp__media"><img id="pdpImg" alt=""></div>'+
            '<div class="pdp__info">'+
              '<h1 class="pdp__title" id="pdpTitle" tabindex="-1"></h1>'+
              '<div class="pdp__tag" id="pdpTag"></div>'+
              '<p class="pdp__desc" id="pdpDesc"></p>'+
              '<p class="pdp__price" id="pdpPrice" style="margin:.35rem 0;font-weight:700"></p>'+
              '<small id="pdpPriceHT" style="opacity:.8;display:block;margin-top:-.2rem"></small>'+
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
    var elPrice  = document.getElementById('pdpPrice');
    var elPriceHT= document.getElementById('pdpPriceHT');

    var title = product.title || ((product.brand||'')+' '+(product.sku||'')).trim();
    var tag   = product.badge || (Array.isArray(product.tags)&&product.tags[0]) || product.tag || '';
    var desc  = product.desc || product.description || '';
    var img   = product.img ? absoluteUrl(product.img) : IMG_FALLBACK;

    if (elT) elT.textContent = title;
    if (elTag) elTag.textContent = tag ? '#'+tag : '';
    if (elDesc) elDesc.textContent = desc || 'Caractéristiques à venir.';
    if (elImg) window.setSafeImg(elImg, img, product.images_alt || title || '');

    // prix TTC principal + HT indicatif
    var currency   = product && product.currency ? product.currency : 'EUR';
    var priceCents = priceCentsFrom(product);
    if (elPrice)   elPrice.textContent = (priceCents!=null) ? fmtCents(Math.round(priceCents*(1+VAT_RATE)), currency) : '';
    if (elPriceHT) elPriceHT.textContent = (priceCents!=null) ? ('≈ HT : '+fmtCents(priceCents, currency)+' (TVA '+Math.round(VAT_RATE*100)+'%)') : '';

    // specs sécurisées
    var features = Array.isArray(product.features) ? product.features : (Array.isArray(product.specs)?product.specs:[]);
    var featHtml = features.length ? features.map(function(s){ return '<li>'+esc(s)+'</li>'; }).join('') : '';
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
      var rows = Object.keys(merged).map(function(k){
        return '<tr><th>'+esc(k)+'</th><td>'+esc(merged[k])+'</td></tr>';
      }).join('');
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

    var productLink = absoluteUrl('#/produit/' + encodeURIComponent(keyOf(product)));
    var textPDP = (function(){
      var sku = product.sku || product.id || product.__auto_id || title;
      var contactSuffix = '';
      try{
        var u = (typeof window.loadUser==='function') ? window.loadUser() : null;
        var arr = []; if(u&&u.name)arr.push('Nom: '+u.name); if(u&&u.email)arr.push('Email: '+u.email);
        if(u&&u.phone)arr.push('Téléphone: '+u.phone); if(u&&u.addr)arr.push('Adresse: '+u.addr);
        contactSuffix = arr.length ? '\n\nMes coordonnées:\n'+arr.join('\n') : '';
      }catch(_){}
      return 'Bonjour, je souhaite un devis pour:\n• '+sku+' – '+title+'\n\nLien: '+productLink+contactSuffix+'\n\nMerci.';
    })();
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
    var tag = product.badge || (Array.isArray(product.tags)&&product.tags[0]) || product.tag || '';
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
          '<article class="card" data-id="'+esc(keyOf(rm))+'">'+
          '  <div class="head"><h3 class="title">'+esc(rm.title||(rm.brand||'')+' '+(rm.sku||''))+'</h3>'+((rm.badge||'')?'<span class="badge">'+esc(rm.badge)+'</span>':'')+'</div>'+
          '  <div class="specs"><p style="margin:0">'+esc(rm.desc||rm.description||'')+'</p></div>'+
          '  <div class="actions"><button class="btn primary" data-add="'+esc(keyOf(rm))+'">Ajouter au panier</button></div>'+
          '</article>';
      }
      elRel.innerHTML = relHTML;
      wireCardsAddToCart(null, elRel);
    }

    // SEO : titre + description + JSON-LD
    if (typeof window.setPageMeta==='function'){
      window.setPageMeta(title+' • Pirates Tools', desc || title);
    }
    injectProductJsonLD(product);
  }
  if (typeof window.renderPDP !== 'function') window.renderPDP = renderPDP;

  /* =========================================================
     D) CHARGEMENT PRODUITS + INDEX RECHERCHE
  ========================================================== */
  function indexModelsForSearch(models){
    models = Array.isArray(models) ? models : [];
    for (var i=0;i<models.length;i++){
      var m = models[i] || {};
      ensureStableKey(m);
      var hay = [
        window.fallback(m.title,''), window.fallback(m.sku,''), window.fallback(m.brand,''),
        window.fallback(m.category,''), window.fallback(m.desc, window.fallback(m.description,'')),
        (Array.isArray(m.tags)?m.tags.join(' '):''), window.fallback(m.badge,'')
      ].join(' ').toLowerCase();
      m.__haystack = hay;
      m.__brand_n  = normKey(m.brand);
      m.__cat_n    = normKey(m.category);
      m.__badge_n  = normKey(m.badge);
      m.__tags_n   = Array.isArray(m.tags) ? m.tags.map(normKey) : [];
      m.__title_n  = normKey(m.title || (m.brand+' '+m.sku));
      m.__price_c  = priceCentsFrom(m);
      models[i] = m;
    }
    return models;
  }

  function ensureProductsLoaded(cb){
    function done(){ try{ cb(window.MODELS); }catch(_){ } }
    if (Array.isArray(window.MODELS) && window.MODELS.length) { window.MODELS = indexModelsForSearch(window.MODELS); return done(); }
    if (typeof window.loadProducts==='function'){
      Promise.resolve(window.loadProducts()).then(function(arr){
        window.MODELS = indexModelsForSearch(arr||[]);
        done();
      }).catch(function(){ window.MODELS = indexModelsForSearch([]); done(); });
      return;
    }
    // Fallback (respect PUBLIC_BASE)
    fetch(absoluteUrl('products.json'), {cache:'no-store'})
      .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .then(function(json){
        var arr = Array.isArray(json) ? json : (json && Array.isArray(json.products) ? json.products : []);
        window.MODELS = indexModelsForSearch(arr||[]);
        try{ window.dispatchEvent(new CustomEvent('pt:productsLoaded')); }catch(_){}
        done();
      })
      .catch(function(){
        window.MODELS = indexModelsForSearch([]);
        try{ window.dispatchEvent(new CustomEvent('pt:productsLoaded')); }catch(_){}
        done();
      });
  }

  /* =========================================================
     E) CATALOGUE — catégories, tags, tri, filtres, virtualisation
  ========================================================== */
  // Catégories (clé normalisée, libellé source)
  function buildCategories(){
    var counts = {}, labels = {};
    for (var i=0;i<window.MODELS.length;i++){
      var m = window.MODELS[i] || {};
      var raw = (m.category || '').toString().trim();
      if (!raw) continue;
      var key = normKey(raw);
      counts[key] = (counts[key]||0)+1;
      if (labels[key]==null) labels[key] = raw;
    }
    var out = []; for (var k in counts) if (Object.prototype.hasOwnProperty.call(counts,k)) out.push({key:k,label:labels[k],count:counts[k]});
    out.sort(function(a,b){ return b.count - a.count; });
    return out;
  }

  // Tags : options normalisées pour le <select>
  function buildTagOptionsData(){
    var seen={}, opts=[];
    function pushOnce(label){
      if (!label) return;
      var key=normKey(label); if (seen[key]) return; seen[key]=1; opts.push({key:key,label:String(label)});
    }
    for (var i=0;i<window.MODELS.length;i++){
      var m=window.MODELS[i] || {};
      pushOnce(m.brand); pushOnce(m.category); pushOnce(m.badge);
      if (Array.isArray(m.tags)) for (var t=0;t<m.tags.length;t++) pushOnce(m.tags[t]);
    }
    opts.sort(function(a,b){ return a.label.localeCompare(b.label); });
    return opts;
  }
  function buildTagOptions(selectEl){
    if (!selectEl) return;
    var opts = buildTagOptionsData();
    var html = '<option value="">Tous</option>';
    for (var i=0;i<opts.length;i++){
      html += '<option value="'+esc(opts[i].key)+'" data-label="'+esc(opts[i].label)+'">'+esc(opts[i].label)+'</option>';
    }
    selectEl.innerHTML = html;
  }
  function findSelectMatch(value, selectEl){
    if (!selectEl) return null;
    var want = normKey(value||'');
    var i, o, opts = selectEl.options || [];
    for (i=0;i<opts.length;i++){
      o = opts[i];
      var v = String(o.value||'');
      var dl= String(o.getAttribute ? (o.getAttribute('data-label')||'') : (o.dataset && o.dataset.label) || '');
      if (want === v || want === normKey(dl)) return (o.value||o.textContent);
    }
    return null;
  }

  // Liste catégories et types par marque
  function renderCatalogue(){
    if (!DOM.catList) return;
    var cats = buildCategories();
    DOM.catList.innerHTML = cats.length
      ? cats.map(function(c){
          return '<article class="card cat-card" data-cat="'+esc(c.key)+'">'+
                   '<div class="head"><h3 class="title">'+esc(c.label)+'</h3><span class="badge">Catégorie</span></div>'+
                   '<div class="specs"><p style="margin:0">'+esc(c.count)+' produit'+(c.count>1?'s':'')+'</p></div>'+
                   '<div class="actions"><button class="btn primary" data-cat-go="'+esc(c.key)+'">Voir</button></div>'+
                 '</article>';
        }).join('')
      : '<div class="card"><div class="specs"><p style="margin:0">Aucune catégorie détectée.</p></div></div>';

    function go(keyLower){
      syncDomRefs();
      var matchVal = findSelectMatch(keyLower, DOM.tag);
      if (DOM.tag) DOM.tag.value = matchVal || '';
      if (DOM.q) DOM.q.value = matchVal ? '' : keyLower;
      applyFiltersAndSort();
      location.hash = '#/catalogue';
      setTimeout(function(){
        if (DOM.list && DOM.list.scrollIntoView) DOM.list.scrollIntoView({behavior:'smooth', block:'start'});
      }, 80);
    }
    if (!DOM.catList.__ptWired){
      DOM.catList.__ptWired=1;
      DOM.catList.addEventListener('click', function(e){
        var btn  = e.target && e.target.closest ? e.target.closest('[data-cat-go]') : null;
        var card = e.target && e.target.closest ? e.target.closest('.cat-card')    : null;
        if (btn)  return go(btn.getAttribute('data-cat-go'));
        if (card) return go(card.getAttribute('data-cat'));
      }, false);
    }
  }

  // Brand → Types (normalisation forte)
  function computeTypesForBrand(brandKey){
    var brandN = normKey(brandKey);
    var counts = {}, labels = {}, i, m, k;
    for (i=0;i<window.MODELS.length;i++){
      m = window.MODELS[i] || {};
      if (normKey(m.brand)!==brandN && normKey(m.brand_key)!==brandN) continue;
      if (m.category){
        k = normKey(m.category);
        counts[k] = (counts[k]||0)+1; if (labels[k]==null) labels[k] = String(m.category);
      }
    }
    if (!Object.keys(counts).length){
      for (i=0;i<window.MODELS.length;i++){
        m = window.MODELS[i] || {};
        if (normKey(m.brand)!==brandN && normKey(m.brand_key)!==brandN) continue;
        if (m.badge){ k = normKey(m.badge); counts[k] = (counts[k]||0)+1; if (labels[k]==null) labels[k]=String(m.badge); }
        if (Array.isArray(m.tags)) for (var t=0;t<m.tags.length;t++){ var tg=String(m.tags[t]||'').trim(); if(!tg)continue; k=normKey(tg); counts[k]=(counts[k]||0)+1; if (labels[k]==null) labels[k]=tg; }
      }
    }
    var out = []; for (k in counts) if (Object.prototype.hasOwnProperty.call(counts,k)) out.push({key:k,label:labels[k],count:counts[k]});
    out.sort(function(a,b){ return b.count - a.count; });
    return out;
  }
  function renderBrandTypesGrid(brandKey){
    if (!DOM.catList) return;
    var types = computeTypesForBrand(brandKey);
    if (!types.length){ renderCatalogue(); return; }
    DOM.catList.innerHTML = types.map(function(c){
      return ''+
        '<article class="card type-card" data-type="'+esc(c.key)+'">'+
        '  <div class="head"><h3 class="title">'+esc(c.label)+'</h3><span class="badge">Type</span></div>'+
        '  <div class="specs"><p style="margin:0">'+esc(c.count)+' produit'+(c.count>1?'s':'')+'</p></div>'+
        '  <div class="actions"><button class="btn primary" data-type-go="'+esc(c.key)+'">Voir</button></div>'+
        '</article>';
    }).join('');
    if (!DOM.catList.__ptTypeWired){
      DOM.catList.__ptTypeWired = 1;
      DOM.catList.addEventListener('click', function(e){
        var el = e.target && e.target.closest ? e.target.closest('[data-type-go], .type-card') : null;
        if (!el) return;
        var typeLower = (el.getAttribute('data-type-go')||el.getAttribute('data-type')||'');
        if (!typeLower) return;
        applyBrandTypeFilter(brandKey, typeLower);
      }, false);
    }
  }
  function applyBrandTypeFilter(brandKey, typeKey){
    syncDomRefs();
    var typeMatch = findSelectMatch(typeKey, DOM.tag);
    if (DOM.q)   DOM.q.value   = brandKey || '';
    if (DOM.tag) DOM.tag.value = typeMatch || normKey(typeKey) || '';
    applyFiltersAndSort();

    var h = '#/catalogue?brand=' + encodeURIComponent(brandKey||'');
    if (typeKey) h += '&type=' + encodeURIComponent(typeKey);
    if ((location.hash||'') !== h) location.hash = h;

    setTimeout(function(){
      if (DOM.list && DOM.list.scrollIntoView) DOM.list.scrollIntoView({behavior:'smooth', block:'start'});
    }, 80);
  }

  // Skeletons
  function renderSkeletons(count){
    if (!DOM.list) return;
    var n = Math.max(3, Number(count||6));
    var html = '';
    for (var i=0;i<n;i++){
      html += '<article class="card" aria-hidden="true">'+
                '<div class="head"><h3 class="title skeleton" style="width:60%">&nbsp;</h3><span class="badge skeleton" style="width:64px">&nbsp;</span></div>'+
                '<div class="specs"><p class="skeleton" style="height:1em;width:90%">&nbsp;</p><p class="skeleton" style="height:1em;width:50%">&nbsp;</p></div>'+
                '<div class="actions"><span class="btn skeleton" style="width:90px">&nbsp;</span> <span class="btn skeleton" style="width:140px">&nbsp;</span></div>'+
              '</article>';
    }
    DOM.list.setAttribute('aria-busy','true');
    DOM.list.innerHTML = html;
  }

  // Virtualisation simple avec "Afficher plus"
  var VIRT = { chunk:60, step:40, current:0, data:[], moreBtn:null, sentinel:null };
  function resetVirtual(){
    VIRT.current = 0; VIRT.data = []; if (VIRT.moreBtn && VIRT.moreBtn.parentNode) VIRT.moreBtn.parentNode.removeChild(VIRT.moreBtn); VIRT.moreBtn=null;
    if (VIRT.sentinel && VIRT.sentinel.parentNode) VIRT.sentinel.parentNode.removeChild(VIRT.sentinel); VIRT.sentinel=null;
  }
  function renderVirtualList(arr){
    if (!DOM.list) return;
    resetVirtual();
    VIRT.data = Array.isArray(arr) ? arr.slice() : [];
    DOM.list.innerHTML = '';
    DOM.list.setAttribute('aria-busy','true');
    appendNextChunk(true);
  }
  function appendNextChunk(first){
    if (!DOM.list) return;
    var start = VIRT.current;
    var max = start + (first ? VIRT.chunk : VIRT.step);
    var slice = VIRT.data.slice(start, max);
    var frag = document.createDocumentFragment();
    for (var i=0;i<slice.length;i++){
      var wrapper = document.createElement('div');
      wrapper.innerHTML = productCardHTML(slice[i]);
      frag.appendChild(wrapper.firstChild);
    }
    DOM.list.appendChild(frag);

    // wire : cartes (clic & ajout)
    (function wireNew(){
      var cards = DOM.list.querySelectorAll ? DOM.list.querySelectorAll('.card[data-id]') : [];
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
      wireCardsAddToCart(slice, DOM.list);
    })();

    VIRT.current = max;
    DOM.list.setAttribute('aria-busy','false');

    // "Afficher plus"
    if (VIRT.current < VIRT.data.length){
      if (!VIRT.moreBtn){
        VIRT.moreBtn = document.createElement('button');
        VIRT.moreBtn.className = 'btn';
        VIRT.moreBtn.type = 'button';
        VIRT.moreBtn.textContent = 'Afficher plus';
        VIRT.moreBtn.style.display='block';
        VIRT.moreBtn.style.margin='1rem auto';
        VIRT.moreBtn.addEventListener('click', function(){ appendNextChunk(false); }, false);
        DOM.list.appendChild(VIRT.moreBtn);

        // IOC (optionnel) : auto-charger en bas de page
        if ('IntersectionObserver' in window){
          VIRT.sentinel = document.createElement('div');
          VIRT.sentinel.style.cssText='width:1px;height:1px;overflow:hidden';
          DOM.list.appendChild(VIRT.sentinel);
          var io = new IntersectionObserver(function(entries){
            var e = entries && entries[0]; if (!e) return;
            if (e.isIntersecting) appendNextChunk(false);
          }, {threshold:[1]});
          io.observe(VIRT.sentinel);
          VIRT.moreBtn.__io = io;
        }
      }
    } else {
      if (VIRT.moreBtn){ VIRT.moreBtn.parentNode.removeChild(VIRT.moreBtn); VIRT.moreBtn=null; }
      if (VIRT.sentinel){ if (VIRT.sentinel.__io && VIRT.sentinel.__io.disconnect) VIRT.sentinel.__io.disconnect(); VIRT.sentinel.parentNode.removeChild(VIRT.sentinel); VIRT.sentinel=null; }
    }
  }

  // Etat filtres/tri
  var CAT_STATE = { q:'', tags:[], sort:'', brand:'', type:'' };

  function syncStateFromURL(){
    var p = window.parseHash(); var q = p.query || {};
    CAT_STATE.q     = String(q.q||'');
    CAT_STATE.brand = String(q.brand||'');
    CAT_STATE.type  = String(q.type||q.tag||'');
    CAT_STATE.sort  = String(q.sort||'');
    CAT_STATE.tags  = String(q.tags||'').split(',').map(function(t){ return t?normKey(t):''; }).filter(Boolean);

    syncDomRefs();
    if (DOM.q)   DOM.q.value   = CAT_STATE.q || (CAT_STATE.brand && !CAT_STATE.type ? CAT_STATE.brand : '');
    if (DOM.tag){
      buildTagOptions(DOM.tag);
      var prefer = findSelectMatch(CAT_STATE.type||CAT_STATE.brand, DOM.tag);
      DOM.tag.value = prefer || '';
    }
    if (DOM.sort){
      if (!DOM.sort.__filled){
        DOM.sort.__filled=1;
        DOM.sort.innerHTML = '<option value="">Tri par défaut</option>'+
                             '<option value="prix_asc">Prix ↑</option>'+
                             '<option value="prix_desc">Prix ↓</option>'+
                             '<option value="nom_asc">Nom A→Z</option>';
      }
      DOM.sort.value = CAT_STATE.sort || '';
    }
    renderChipsFromState();
  }

  function syncURLFromState(){
    var params = [];
    if (CAT_STATE.q)     params.push('q='+encodeURIComponent(CAT_STATE.q));
    if (CAT_STATE.brand) params.push('brand='+encodeURIComponent(CAT_STATE.brand));
    if (CAT_STATE.type)  params.push('type='+encodeURIComponent(CAT_STATE.type));
    if (CAT_STATE.sort)  params.push('sort='+encodeURIComponent(CAT_STATE.sort));
    if (CAT_STATE.tags && CAT_STATE.tags.length) params.push('tags='+encodeURIComponent(CAT_STATE.tags.join(',')));
    var base = '#/catalogue';
    var h = params.length ? (base+'?'+params.join('&')) : base;
    if (location.hash !== h) location.hash = h;
  }

  function renderChipsFromState(){
    if (!DOM.chips){
      // inject si absent
      var tb = (DOM.q && DOM.q.parentNode && DOM.q.parentNode.classList.contains('toolbar')) ? DOM.q.parentNode : (document.querySelector('.toolbar')||null);
      if (tb){
        DOM.chips = document.createElement('div');
        DOM.chips.id = 'tagChips';
        DOM.chips.className = 'chips';
        DOM.chips.style.margin = '.5rem 0';
        tb.appendChild(DOM.chips);
      }
    }
    if (!DOM.chips) return;

    var all = buildTagOptionsData();
    var html = '';
    for (var i=0;i<all.length;i++){
      var k = all[i].key, lbl = all[i].label;
      var on = CAT_STATE.tags.indexOf(k)!==-1;
      html += '<button class="chip'+(on?' chip--on':'')+'" type="button" data-chip="'+esc(k)+'" aria-pressed="'+(on?'true':'false')+'">'+esc(lbl)+'</button> ';
    }
    DOM.chips.innerHTML = html;

    if (!DOM.chips.__wired){
      DOM.chips.__wired = 1;
      DOM.chips.addEventListener('click', function(e){
        var b = e.target && e.target.closest ? e.target.closest('[data-chip]') : null; if (!b) return;
        var k = b.getAttribute('data-chip'); if (!k) return;
        var idx = CAT_STATE.tags.indexOf(k);
        if (idx===-1) CAT_STATE.tags.push(k); else CAT_STATE.tags.splice(idx,1);
        applyFiltersAndSort(true);
      }, false);
    }
  }

  function applyFiltersAndSort(updateURL){
    syncDomRefs();
    if (DOM.list) DOM.list.setAttribute('aria-busy','true');
    renderSkeletons(6);

    // Lire UI -> state
    CAT_STATE.q     = (DOM.q && DOM.q.value || '').trim();
    CAT_STATE.type  = (DOM.tag && DOM.tag.value || '').trim();
    CAT_STATE.sort  = (DOM.sort && DOM.sort.value || '').trim();

    // Tokens pour recherche
    var tokens = CAT_STATE.q.toLowerCase().split(/\s+/).filter(Boolean);

    // Filtrage
    var filtered = window.MODELS.filter(function(m){
      // brand/type du state si présents
      var okBrand = !CAT_STATE.brand || normKey(m.brand)===normKey(CAT_STATE.brand) || normKey(m.brand_key)===normKey(CAT_STATE.brand);
      var okType  = !CAT_STATE.type  || m.__haystack.indexOf(CAT_STATE.type)!==-1 || m.__tags_n.indexOf(normKey(CAT_STATE.type))!==-1 || m.__cat_n===normKey(CAT_STATE.type);
      // chips (multi-tags)
      var okChips = !CAT_STATE.tags.length || CAT_STATE.tags.every(function(tk){ return (m.__tags_n.indexOf(tk)!==-1) || m.__cat_n===tk || m.__badge_n===tk || normKey(m.brand)===tk; });
      // recherche texte
      var okQ = !tokens.length || tokens.every(function(t){ return m.__haystack.indexOf(t)!==-1; });
      return okBrand && okType && okChips && okQ;
    });

    // Tri
    if (CAT_STATE.sort === 'prix_asc'){
      filtered.sort(function(a,b){ return (a.__price_c||1e15) - (b.__price_c||1e15); });
    } else if (CAT_STATE.sort === 'prix_desc'){
      filtered.sort(function(a,b){ return (b.__price_c||-1) - (a.__price_c||-1); });
    } else if (CAT_STATE.sort === 'nom_asc'){
      filtered.sort(function(a,b){ return (a.__title_n||'').localeCompare(b.__title_n||''); });
    }

    // Rendu virtuel
    renderVirtualList(filtered);

    // Annonce a11y + focus premier item
    try{ window.announce(String(filtered.length)+' résultats'); }catch(_){}
    setTimeout(function(){
      try{
        var first = DOM.list && DOM.list.querySelector ? DOM.list.querySelector('.card .title') : null;
        if (first){ first.setAttribute('tabindex','-1'); first.focus({preventScroll:true}); setTimeout(function(){ try{ first.removeAttribute('tabindex'); }catch(_){} }, 250); }
      }catch(_){}
    }, 50);

    // URL
    if (updateURL) syncURLFromState();
  }

  function wireFilterInputs(){
    syncDomRefs();
    if (DOM.q && !DOM.q.__ptWired){ DOM.q.__ptWired=1; DOM.q.addEventListener('input', debounce(function(){ applyFiltersAndSort(true); }, 120), true); }
    if (DOM.tag && !DOM.tag.__ptWired){ DOM.tag.__ptWired=1; DOM.tag.addEventListener('change', function(){ applyFiltersAndSort(true); }, true); }
    if (DOM.sort && !DOM.sort.__ptWired){ DOM.sort.__ptWired=1; DOM.sort.addEventListener('change', function(){ applyFiltersAndSort(true); }, true); }
  }

  /* =========================================================
     F) DEVIS — vue + actions (totaux TTC + HT)
  ========================================================== */
  function renderCartView(){
    var wrap = document.getElementById('devisList'); if (!wrap) return;
    var grouped = groupCart();

    if (!grouped.length){
      wrap.innerHTML = '<p style="margin:0">Aucun article pour le moment.</p>';
    } else {
      var sumCentsHT = 0;
      var html = '';
      for (var i=0;i<grouped.length;i++){
        var g = grouped[i];
        var it=g.item||{}, qty=Number(g.qty||0), sku=it.sku||it.id||it.__auto_id||'';
        var title= it.title || ((it.brand||'')+' '+(it.sku||'')).trim();
        var key=keyOf(it);
        var pc = priceCentsFrom(it);
        if (pc!=null) sumCentsHT += (pc*qty);
        html += '<div class="card">'+
                 '<div class="head"><h3 class="title">'+esc(title)+'</h3><span class="badge">'+esc(sku)+'</span></div>'+
                 '<div class="specs" style="display:flex;gap:.6rem;align-items:center">'+
                   '<button class="btn" data-dec="'+esc(key)+'" aria-label="Diminuer">−</button>'+
                   '<strong>'+esc(qty)+'</strong>'+
                   '<button class="btn" data-inc="'+esc(key)+'" aria-label="Augmenter">+</button>'+
                   (pc!=null ? '<span style="margin-left:.6rem;opacity:.8">'+esc(fmtCents(pc,'EUR'))+' /u</span>' : '')+
                   '<button class="btn" data-del="'+esc(key)+'" style="margin-left:auto;background:rgba(255,255,255,.06);color:#d9e3ec" aria-label="Supprimer">Supprimer</button>'+
                 '</div>'+
               '</div>';
      }
      if (sumCentsHT>0){
        var sumCentsTTC = Math.round(sumCentsHT*(1+VAT_RATE));
        html += '<div class="card">'+
                  '<div class="head"><h3 class="title">Total estimatif</h3><span class="badge">TTC</span></div>'+
                  '<div class="specs"><p style="margin:0;font-weight:700">'+esc(fmtCents(sumCentsTTC,'EUR'))+'</p><small style="opacity:.8;display:block">≈ HT : '+esc(fmtCents(sumCentsHT,'EUR'))+' (TVA '+Math.round(VAT_RATE*100)+'%)</small></div>'+
                '</div>';
      }
      wrap.innerHTML = html;
    }

    if (!wrap.__wired){
      wrap.__wired=1;
      wrap.addEventListener('click', function(e){
        var inc = e.target && e.target.closest ? e.target.closest('[data-inc]') : null;
        var dec = e.target && e.target.closest ? e.target.closest('[data-dec]') : null;
        var del = e.target && e.target.closest ? e.target.closest('[data-del]') : null;

        if (inc){
          var k = inc.getAttribute('data-inc'); var p=findProductByKey(k);
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
  if (typeof window.renderCartView !== 'function') window.renderCartView = renderCartView;

  /* =========================================================
     G) ROUTER — #/catalogue, #/produit/:id, #/devis (guard P4)
  ========================================================== */
  function ensureCatalogueScaffold(){
    var s = document.getElementById('view-catalogue');
    if (!s){
      s = document.createElement('section'); s.id='view-catalogue'; s.className='view';
      s.innerHTML = '<div class="container">'+
                      '<h1 tabindex="-1">Catalogue</h1>'+
                      '<div id="catList" class="cat-list" style="margin-bottom:1rem"></div>'+
                      '<div class="toolbar">'+
                        '<input id="q" class="search" type="search" placeholder="Rechercher (marque, réf, description…)">'+
                        '<select id="tag" class="select"><option value="">Tous</option></select>'+
                        '<select id="sort" class="select" style="min-width:140px;margin-left:.4rem"></select>'+
                      '</div>'+
                      '<div id="tagChips" class="chips" style="margin:.5rem 0"></div>'+
                      '<div id="list" class="list" aria-live="polite" aria-busy="false"></div>'+
                    '</div>';
      document.body.appendChild(s);
    } else {
      // Ajoute sort + chips si absents
      if (!document.getElementById('sort')){
        var toolbar = s.querySelector('.toolbar') || s;
        var sel = document.createElement('select'); sel.id='sort'; sel.className='select'; sel.style.minWidth='140px'; sel.style.marginLeft='.4rem';
        toolbar.appendChild(sel);
      }
      if (!document.getElementById('tagChips')){
        var chips = document.createElement('div'); chips.id='tagChips'; chips.className='chips'; chips.style.margin='.5rem 0';
        s.appendChild(chips);
      }
      if (!document.getElementById('catList')){
        var cl = document.createElement('div'); cl.id='catList'; cl.className='cat-list'; cl.style.marginBottom='1rem'; s.insertBefore(cl, s.firstChild.nextSibling);
      }
      if (!document.getElementById('list')){
        var d=document.createElement('div'); d.id='list'; d.className='list'; d.setAttribute('aria-live','polite'); d.setAttribute('aria-busy','false'); s.appendChild(d);
      }
    }
    syncDomRefs();
  }

  function showViewSafely(key){
    if (typeof window.showView==='function'){ try{ window.showView(key); return; }catch(_){ } }
    var ids=['view-home','view-catalogue','view-produit','view-devis','view-compte'];
    for (var i=0;i<ids.length;i++){ var el=document.getElementById(ids[i]); if(el) el.classList.add('hidden'); }
    var want=document.getElementById('view-'+key); if (want) want.classList.remove('hidden');
  }

  function route(){
    if (window.__ptRouterPrimary === 1) return; // Partie 4 pilote → no-op
    var parsed = window.parseHash();
    var view = parsed.view;
    var segs = parsed.path.split('/').slice(2); // après "#/"

    if (!view || view === 'home') return;

    if (view === 'catalogue'){
      showViewSafely('catalogue');
      if (typeof window.resetPageMeta==='function') window.resetPageMeta();
      ensureCatalogueScaffold();
      ensureProductsLoaded(function(){
        buildTagOptions(DOM.tag);
        if (DOM.sort && !DOM.sort.__filled){ DOM.sort.__filled=1; DOM.sort.innerHTML = '<option value="">Tri par défaut</option><option value="prix_asc">Prix ↑</option><option value="prix_desc">Prix ↓</option><option value="nom_asc">Nom A→Z</option>'; }
        wireFilterInputs();
        renderCatalogue();
        syncStateFromURL();
        applyFiltersAndSort(false);
        window.focusView('catalogue');
      });
      return;
    }

    if (view === 'produit'){
      showViewSafely('produit');
      var key = decodeURIComponent(segs[0] || (parsed.query && parsed.query.id) || '');
      ensureProductsLoaded(function(){
        var p = findProductByKey(key);
        if (!p){
          var host=document.getElementById('view-produit') || document.createElement('section');
          host.id='view-produit'; host.className='view';
          host.innerHTML = '<div class="container"><p>Produit introuvable. <a href="#/catalogue" class="chip chip--back">← Retour catalogue</a></p></div>';
          if (!host.parentNode) document.body.appendChild(host);
          if (typeof window.resetPageMeta==='function') window.resetPageMeta();
          clearProductJsonLD();
          return;
        }
        renderPDP(p);
        window.focusView('produit');
      });
      return;
    }

    if (view === 'devis'){
      showViewSafely('devis');
      if (typeof window.resetPageMeta==='function') window.resetPageMeta();
      var v = document.getElementById('view-devis');
      if (!v){
        v=document.createElement('section'); v.id='view-devis'; v.className='view';
        v.innerHTML = '<div class="container">'+
                        '<h1 tabindex="-1">Mon devis</h1>'+
                        '<div class="card">'+
                          '<div class="specs" id="devisList"></div>'+
                          '<div class="actions">'+
                            '<button class="btn primary" id="devisSend">Envoyer le devis (WhatsApp)</button>'+
                            '<button class="btn" id="devisClear">Vider</button>'+
                          '</div>'+
                        '</div>'+
                      '</div>';
        document.body.appendChild(v);
      }
      renderCartView(); window.focusView('devis');
      return;
    }
  }

  // Rafraîchir la vue catalogue quand les produits arrivent (si la vue est active)
  window.addEventListener('pt:productsLoaded', function(){
    var p = window.parseHash();
    if (p.view === 'catalogue'){
      ensureCatalogueScaffold();
      buildTagOptions(DOM.tag);
      wireFilterInputs();
      renderCatalogue();
      syncStateFromURL();
      applyFiltersAndSort(false);
    }
  }, false);

  // Quitter PDP → nettoie JSON-LD + reset meta
  window.addEventListener('hashchange', function(){
    if (window.__ptRouterPrimary === 1) return;
    var p = window.parseHash(); if (p.view!=='produit'){ clearProductJsonLD(); if (typeof window.resetPageMeta==='function') window.resetPageMeta(); }
  }, false);

  // Routing local (désactivé si P4 routeur primaire)
  window.addEventListener('hashchange', route, false);

  // Boot doux
  document.addEventListener('DOMContentLoaded', function(){
    if (window.__ptRouterPrimary === 1) return; // P4 pilote
    ensureProductsLoaded(function(models){
      var h = location.hash||'';
      if (h.indexOf('#/catalogue')===0){
        ensureCatalogueScaffold();
        buildTagOptions(DOM.tag);
        wireFilterInputs();
        renderCatalogue();
        syncStateFromURL();
        applyFiltersAndSort(false);
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

  // Expose API demandée (Parties 3 & 4)
  window.PT = window.PT || {};
  window.PT.applyFiltersAndSort   = applyFiltersAndSort;
  window.PT.renderList            = function(arr){ renderVirtualList(arr||window.MODELS||[]); };
  window.PT.renderPDP             = renderPDP;
  window.PT.computeTypesForBrand  = computeTypesForBrand;
  window.PT.applyBrandTypeFilter  = applyBrandTypeFilter;
  window.PT.handleRouteCatalogue_Extended = function(){
    var p = window.parseHash ? window.parseHash() : {view:'',query:{}};
    if (p.view !== 'catalogue') return;
    ensureCatalogueScaffold();
    buildTagOptions(DOM.tag);
    renderCatalogue();
    syncStateFromURL();
    if (p.query && p.query.brand){
      renderBrandTypesGrid(p.query.brand);
      if (p.query.type){ applyBrandTypeFilter(p.query.brand, p.query.type); }
      else { applyFiltersAndSort(false); }
    } else {
      applyFiltersAndSort(false);
    }
  };

})();



/* =========================================================
     PARTIE 3 — Compte + Création de compte (local) + Fidélité
     - Route: #/compte
     - Persistance locale: USER_KEY (par défaut 'pt_user_v1') + migration depuis 'pt_user'
     - API publique: PT.loadUser / PT.saveUser / PT.getUser / PT.setPoints / PT.addPoints / PT.computeTier / PT.renderAccount / PT.handleRouteAccount
       (expose aussi window.loadUser/saveUser/computeTier/defaultUser pour rétro-compat P2)
     - Intégration WhatsApp (cartToWhatsAppText lit PT.loadUser())
     - ES5-safe, idempotent, aucun chemin cassé ni redéfinition de helpers P1/P2
     - Compatible PARTIE 1, 2, 4, 5, 6A/6B
========================================================= */

(function(){
  'use strict';
  if (window.__ptP3Booted) return; window.__ptP3Booted = 1;

  /* ---------- Guards & compat helpers (sans écraser) ---------- */
  var PT = window.PT = window.PT || {};
  var $  = (PT.$  || function(sel, root){ return (root||document).querySelector(sel); });
  var $$ = (PT.$$ || function(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); });

  if (typeof window.toast    !== 'function') window.toast    = function(){};
  if (typeof window.announce !== 'function') window.announce = function(){};

  if (typeof window.parseHash !== 'function'){
    window.parseHash = function(){
      var h = location.hash || '#/';
      var parts = h.split('?');
      var path  = parts[0] || '#/';
      var view  = path.replace('#/','').split('/')[0] || '';
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
      return { path:path, view:view, raw:h, query:query };
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
  if (typeof window.resetPageMeta !== 'function'){
    window.resetPageMeta = function(){
      try{
        document.title = 'Pirates Tools • Outillage pro (PWA)';
        var m = document.querySelector('meta[name="description"]');
        if (m) m.setAttribute('content','Pirates Tools — Visseuses à chocs DeWALT, dispo Antilles. PWA rapide, contact immédiat (téléphone & WhatsApp).');
      }catch(_){}
    };
  }

  function onlyDigits(s){ return String(s||'').replace(/[^\d]/g,''); }

  var USER_KEY   = window.USER_KEY   || 'pt_user_v1';
  var OLD_KEY    = 'pt_user'; // migration si présent
  var PHONE_E164 = window.PHONE_E164 || '+33774230195';

  /* =========================================================
     A) Modèle utilisateur (migration / chargement / sauvegarde)
  ========================================================== */
  function defaultUser(){
    return { name:'', email:'', phone:'', addr:'', newsletter:false, points:0, tier:'bronze' };
  }

  // Barème demandé: Bronze 0–249, Silver 250–699, Gold 700+
  function computeTier(points){
    points = Math.max(0, parseInt(points,10)||0);
    if (points >= 700) return 'gold';
    if (points >= 250) return 'silver';
    return 'bronze';
  }

  // Cache mémoire doux pour éviter LS en boucle
  var __user = null;

  // Migration one-shot: 'pt_user' -> USER_KEY (pt_user_v1)
  (function migrateUser(){
    try{
      if (localStorage.getItem(USER_KEY)) return; // déjà migré
      var raw = localStorage.getItem(OLD_KEY);
      if (!raw) return;
      var u = JSON.parse(raw);
      if (!u || typeof u!=='object') return;
      if (typeof u.newsletter!=='boolean') u.newsletter = !!u.newsletter;
      if (typeof u.points!=='number') u.points = Math.max(0, parseInt(u.points,10)||0);
      u.tier = computeTier(u.points);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      localStorage.removeItem(OLD_KEY);
    }catch(_){}
  })();

  function loadUser(){
    // lit LS -> met en cache -> émet pt:userLoaded
    try{
      var raw = localStorage.getItem(USER_KEY);
      var u = raw ? JSON.parse(raw) : defaultUser();
      if (!u || typeof u !== 'object') u = defaultUser();
      if (typeof u.points !== 'number') u.points = 0;
      u.tier = computeTier(u.points);
      __user = u;
      try{ window.dispatchEvent(new CustomEvent('pt:userLoaded', { detail:{ user: cloneUser(u) } })); }catch(_){}
      return cloneUser(__user);
    }catch(_){
      __user = defaultUser();
      try{ window.dispatchEvent(new CustomEvent('pt:userLoaded', { detail:{ user: cloneUser(__user) } })); }catch(__){}
      return cloneUser(__user);
    }
  }

  function getUser(){
    return __user ? cloneUser(__user) : loadUser();
  }

  function saveUser(partialOrFull){
    // merge immuable + clamp + persistance + events
    var prev = getUser();
    var next = mergeUser(prev, partialOrFull);
    next.points = Math.max(0, parseInt(next.points,10)||0);
    next.tier   = computeTier(next.points);

    try{ localStorage.setItem(USER_KEY, JSON.stringify(next)); }catch(_){}
    __user = next;

    // Events requis
    try{ window.dispatchEvent(new CustomEvent('pt:userSaved', { detail:{ user: cloneUser(next) } })); }catch(_){}
    if ((prev.points|0) !== (next.points|0) || prev.tier !== next.tier){
      try{ window.dispatchEvent(new CustomEvent('pt:loyaltyChanged', { detail:{ points: next.points, tier: next.tier } })); }catch(__){}
    }

    window.toast('Compte enregistré','success');
    window.announce('Compte enregistré');
    return cloneUser(next);
  }

  function setPoints(n){
    var u = getUser();
    u.points = Math.max(0, parseInt(n,10)||0);
    return saveUser(u);
  }

  function addPoints(delta){
    var u = getUser();
    u.points = Math.max(0, (u.points|0) + (parseInt(delta,10)||0));
    return saveUser(u);
  }

  function mergeUser(base, patch){
    var b = base||defaultUser(); var p = patch||{};
    var out = {
      name:        String(firstDefined(p.name,  b.name,  '')).trim(),
      email:       String(firstDefined(p.email, b.email, '')).trim().toLowerCase(),
      phone:       String(firstDefined(p.phone, b.phone, '')).trim(),
      addr:        String(firstDefined(p.addr,  b.addr,  '')).trim(),
      newsletter: !!firstDefined(p.newsletter, b.newsletter, false),
      points:     Math.max(0, parseInt(firstDefined(p.points, b.points, 0),10)||0),
      tier:        computeTier(firstDefined(p.points, b.points, 0))
    };
    return out;
  }

  function firstDefined(){
    for (var i=0;i<arguments.length;i++){ if (arguments[i]!==void 0 && arguments[i]!==null) return arguments[i]; }
  }
  function cloneUser(u){ return JSON.parse(JSON.stringify(u||defaultUser())); }

  // Exposition API (PT + global rétro-compat)
  if (!PT.loadUser)    PT.loadUser    = loadUser;
  if (!PT.saveUser)    PT.saveUser    = saveUser;
  if (!PT.getUser)     PT.getUser     = getUser;
  if (!PT.setPoints)   PT.setPoints   = setPoints;
  if (!PT.addPoints)   PT.addPoints   = addPoints;
  if (!PT.computeTier) PT.computeTier = computeTier;

  if (typeof window.loadUser    !== 'function') window.loadUser    = loadUser;    // pour P2 (cartToWhatsAppText)
  if (typeof window.saveUser    !== 'function') window.saveUser    = saveUser;
  if (typeof window.computeTier !== 'function') window.computeTier = computeTier;
  if (typeof window.defaultUser !== 'function') window.defaultUser = defaultUser;

  /* =========================================================
     B) Vue Compte — création minimale + contenu accContent
  ========================================================== */
  function accountInnerHTML(){
    // HTML statique (aucune valeur utilisateur injectée)
    return ''
    + '<div class="card">'
    + '  <div class="head"><h3 class="title">Informations</h3><span class="badge">Profil</span></div>'
    + '  <div class="specs" style="display:grid;gap:.6rem">'
    + '    <label for="accName">Nom / Prénom</label>'
    + '    <input id="accName" class="search" type="text" placeholder="Ex: Alex Pirate" autocomplete="name">'
    + '    <label for="accEmail">Email</label>'
    + '    <input id="accEmail" class="search" type="email" inputmode="email" placeholder="exemple@mail.com" autocomplete="email" aria-describedby="accEmailErr">'
    + '    <small id="accEmailErr" style="display:none;opacity:.9"></small>'
    + '    <label for="accPhone">Téléphone</label>'
    + '    <input id="accPhone" class="search" type="tel" inputmode="tel" placeholder="+33 6…" autocomplete="tel">'
    + '    <label for="accAddr">Adresse</label>'
    + '    <textarea id="accAddr" class="search" rows="2" placeholder="Adresse postale" autocomplete="street-address"></textarea>'
    + '    <label style="display:flex;align-items:center;gap:.5rem"><input id="accNews" type="checkbox"> S’abonner aux nouveautés</label>'
    + '  </div>'
    + '  <div class="actions">'
    + '    <button class="btn primary" id="accSave" type="button">Enregistrer</button>'
    + '    <button class="btn" id="accClear" type="button">Réinitialiser</button>'
    + '  </div>'
    + '</div>'
    + '<div class="card">'
    + '  <div class="head"><h3 class="title">Fidélité</h3><span class="badge">Avantages</span></div>'
    + '  <div class="specs">'
    + '    <div class="meter">'
    + '      <div class="meter__rail"><div id="accFill" class="meter__fill"></div><div id="accCursor" class="meter__cursor" style="left:0%"></div></div>'
    + '      <input id="accSlider" type="range" min="0" max="1000" step="10" value="0" aria-label="Points fidélité">'
    + '      <div class="meter__scale" style="display:flex;justify-content:space-between">'
    + '        <span id="accTier">bronze</span>'
    + '        <span><strong id="accPoints">0</strong> pts</span>'
    + '      </div>'
    + '    </div>'
    + '  </div>'
    + '  <div class="actions">'
    + '    <button class="btn" id="accToDevis" type="button">Voir mon devis</button>'
    + '    <a class="btn btn-wa" id="accWA" target="_blank" rel="noopener">WhatsApp</a>'
    + '  </div>'
    + '</div>';
  }

  function ensureAccountView(){
    // Crée minimalement #view-compte et #accContent si absents, n'altère rien sinon
    var view = document.getElementById('view-compte');
    if (!view){
      view = document.createElement('section');
      view.id = 'view-compte';
      view.className = 'view hidden';
      var container = document.createElement('div');
      container.className = 'container';
      var h1 = document.createElement('h1'); h1.textContent = 'Mon compte'; h1.setAttribute('tabindex','-1');
      var hello = document.createElement('p'); hello.id='accHello'; hello.style.cssText='margin:.25rem 0 1rem;color:#9fb4c5'; hello.textContent='Bienvenue. Renseignez vos informations pour accélérer les devis.';
      var content = document.createElement('div'); content.id='accContent';
      container.appendChild(h1); container.appendChild(hello); container.appendChild(content);
      view.appendChild(container);
      document.body.appendChild(view);
    } else {
      // s'assure que #accContent existe
      var content = $('#accContent', view);
      if (!content){
        content = document.createElement('div'); content.id='accContent';
        var cont = $('.container', view) || view;
        cont.appendChild(content);
      }
      if (!$('#accHello', view)){
        var hello2 = document.createElement('p'); hello2.id='accHello'; hello2.style.cssText='margin:.25rem 0 1rem;color:#9fb4c5';
        hello2.textContent='Bienvenue. Renseignez vos informations pour accélérer les devis.';
        var c = $('.container', view) || view; c.insertBefore(hello2, c.children[1] || null);
      }
    }
    return view;
  }

  /* =========================================================
     C) Rendu + binding (idempotent) — PT.renderAccount(root?)
  ========================================================== */
  function validateEmail(s){
    s = String(s||'').trim();
    // RFC-lite: contient '@' et un point après
    return !!(s && s.indexOf('@')>0 && s.lastIndexOf('.') > s.indexOf('@')+1);
  }

  function buildWAProfileLink(u){
    var base = 'Bonjour, voici mes coordonnées:'
      + '\n• Nom: '   + (u.name  || '')
      + '\n• Email: ' + (u.email || '')
      + (u.phone ? '\n• Tel: '   + u.phone : '')
      + (u.addr  ? '\n• Adresse: '+u.addr  : '')
      + (u.newsletter ? '\n• Newsletter: oui' : '')
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

    var pts = Math.max(0, parseInt(u.points,10)||0);
    var max = +(slider && slider.max ? slider.max : 1000);
    var pct = Math.max(0, Math.min(100, (pts/(max||1))*100));

    if (fill)   fill.style.width = pct.toFixed(2)+'%';
    if (cursor) cursor.style.left = pct.toFixed(2)+'%';
    if (slider && String(slider.value)!==String(pts)) slider.value = pts;
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
    if (email){ email.value = u.email || ''; email.removeAttribute('aria-invalid'); var err=$('#accEmailErr'); if(err){ err.style.display='none'; err.textContent=''; } }
    if (phone) phone.value = u.phone || '';
    if (addr)  addr.value  = u.addr  || '';
    if (news)  news.checked= !!u.newsletter;

    updateLoyaltyUI(u);
    updateHello(u);

    var wa = document.getElementById('accWA');
    if (wa) wa.href = buildWAProfileLink(u);
  }

  function grabUserFromForm(){
    var u = getUser();
    var name  = document.getElementById('accName');
    var email = document.getElementById('accEmail');
    var phone = document.getElementById('accPhone');
    var addr  = document.getElementById('accAddr');
    var news  = document.getElementById('accNews');
    var slider= document.getElementById('accSlider');

    if (name)  u.name  = String(name.value||'').trim();
    if (email) u.email = String(email.value||'').trim().toLowerCase();
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
    var nameEl   = document.getElementById('accName');
    var emailEl  = document.getElementById('accEmail');
    var phoneEl  = document.getElementById('accPhone');
    var addrEl   = document.getElementById('accAddr');
    var newsEl   = document.getElementById('accNews');

    if (saveBtn && !saveBtn.__ptWired){
      saveBtn.__ptWired = 1;
      saveBtn.addEventListener('click', function(){
        var u = grabUserFromForm();
        // Validation email + a11y
        var hasErr = false;
        if (u.email && !validateEmail(u.email)){
          hasErr = true;
          try{
            emailEl.setAttribute('aria-invalid','true');
            var err = document.getElementById('accEmailErr');
            if (err){ err.style.display='block'; err.textContent='Veuillez saisir un email valide.'; }
          }catch(_){}
          window.toast('Email invalide', 'info');
          try{ emailEl.focus(); }catch(__){}
        } else if (emailEl){
          emailEl.removeAttribute('aria-invalid');
          var err2 = document.getElementById('accEmailErr'); if (err2){ err2.style.display='none'; err2.textContent=''; }
        }
        if (hasErr){ window.announce('Veuillez corriger les erreurs du formulaire'); return; }

        // Nom par défaut si vide mais email présent
        if (!u.name && u.email){ u.name = u.email.split('@')[0]; }
        var saved = saveUser(u);
        populateAccountForm(saved);
        // Focus de confirmation
        try{ window.focusView('compte'); }catch(_){}
      }, false);
    }

    if (clearBtn && !clearBtn.__ptWired){
      clearBtn.__ptWired = 1;
      clearBtn.addEventListener('click', function(){
        try{ localStorage.removeItem(USER_KEY); }catch(_){}
        var fresh = defaultUser(); __user = fresh;
        populateAccountForm(fresh); saveUser(fresh);
        window.toast('Compte réinitialisé','success'); window.announce('Compte réinitialisé');
        try{ window.focusView('compte'); }catch(_){}
      }, false);
    }

    if (toDevis && !toDevis.__ptWired){
      toDevis.__ptWired = 1;
      toDevis.addEventListener('click', function(){ location.hash = '#/devis'; }, false);
    }

    if (slider && !slider.__ptWired){
      slider.__ptWired = 1;
      slider.addEventListener('input', function(){
        var u = getUser(); u.points = Math.max(0, parseInt(slider.value,10)||0); u.tier = computeTier(u.points);
        updateLoyaltyUI(u);
      }, false);
      slider.addEventListener('change', function(){
        var u = grabUserFromForm(); saveUser(u);
      }, false);
    }

    // Link WA dynamique + nettoyage erreur email pendant la saisie
    var inputs = [nameEl, emailEl, phoneEl, addrEl, newsEl];
    for (var i=0;i<inputs.length;i++){
      var el = inputs[i]; if (!el || el.__ptWired) continue; el.__ptWired = 1;
      var evt = (el.id === 'accNews') ? 'change' : 'input';
      el.addEventListener(evt, function(){
        var u = grabUserFromForm();
        var wa = document.getElementById('accWA'); if (wa) wa.href = buildWAProfileLink(u);
        if (this.id==='accEmail'){
          if (this.value && !validateEmail(this.value)){ this.setAttribute('aria-invalid','true'); var e=$('#accEmailErr'); if(e){ e.style.display='block'; e.textContent='Email invalide.'; } }
          else { this.removeAttribute('aria-invalid'); var e2=$('#accEmailErr'); if(e2){ e2.style.display='none'; e2.textContent=''; } }
        }
      }, false);
    }
  }

  function renderAccount(root){
    // root facultatif (par défaut: #accContent)
    var view = ensureAccountView();
    var host = root || document.getElementById('accContent');
    if (host && !host.__ptInjected){
      host.__ptInjected = 1;
      host.innerHTML = accountInnerHTML(); // markup statique
    }
    var u = getUser();
    populateAccountForm(u);
    wireAccountEvents();
  }
  if (!PT.renderAccount) PT.renderAccount = renderAccount;

  /* =========================================================
     D) Routage — #/compte (hook public) + listeners conditionnels
  ========================================================== */
  function handleRouteAccount(){
    var parsed = window.parseHash();
    if (parsed.view !== 'compte') return;

    // Meta par défaut (spécifié: resetPageMeta)
    try{ window.resetPageMeta(); }catch(_){}

    window.showView('compte');
    renderAccount();
    window.focusView('compte');
  }
  if (!PT.handleRouteAccount) PT.handleRouteAccount = handleRouteAccount;

  // N'ajouter des écouteurs globaux QUE si P4 n'est pas le routeur primaire
  if (!window.__ptRouterPrimary){
    window.addEventListener('hashchange', handleRouteAccount, false);
    document.addEventListener('DOMContentLoaded', function(){
      ensureAccountView();
      if ((location.hash||'').indexOf('#/compte')===0){ handleRouteAccount(); }
    }, false);
  } else {
    // Si P4 pilote: juste garantir l'existence de la vue (conteneur) sans écouter hashchange
    document.addEventListener('DOMContentLoaded', function(){ ensureAccountView(); }, false);
  }

  // Optionnel: bouton externe vers le compte (si présent dans le DOM)
  var goAccountBtn = document.getElementById('goAccountBtn');
  if (goAccountBtn && !goAccountBtn.__ptWired){
    goAccountBtn.__ptWired = 1;
    goAccountBtn.addEventListener('click', function(){ location.hash = '#/compte'; }, false);
  }

  /* =========================================================
     E) Synchronisation multi-onglets & signaux internes
  ========================================================== */
  if (!window.__ptUserStorageSync){
    window.__ptUserStorageSync = 1;
    window.addEventListener('storage', function(ev){
      try{
        if (!ev || ev.key !== USER_KEY) return;
        // rehydrate + toast
        var u = loadUser();
        populateAccountForm(u);
        window.toast('Profil mis à jour (autre onglet)');
      }catch(_){}
    }, false);
  }

  // Rafraîchit l’UI sur pt:userSaved/pt:userLoaded/pt:loyaltyChanged (signaux internes)
  if (!window.__ptUserChangeWired){
    window.__ptUserChangeWired = 1;
    window.addEventListener('pt:userLoaded', function(e){
      try{ populateAccountForm((e && e.detail && e.detail.user) || getUser()); }catch(_){}
    }, false);
    window.addEventListener('pt:userSaved', function(e){
      try{ populateAccountForm((e && e.detail && e.detail.user) || getUser()); }catch(_){}
    }, false);
    window.addEventListener('pt:loyaltyChanged', function(e){
      try{
        var d = (e && e.detail) || {};
        updateLoyaltyUI({ points:d.points||0 });
      }catch(_){}
    }, false);
  }

})();



/* =========================================================
   PARTIE 4 — Router principal + SEO unifié + JSON-LD Site/Org
   - Déclare le routeur primaire (__ptRouterPrimary=1)
   - Routes: #/ (home), #/catalogue, #/produit/:id, #/devis, #/compte
   - Délègue rendus à P2/P3 (zéro double rendu)
   - SEO: title/description/OG + <link rel="canonical"> mis à jour
   - JSON-LD (WebSite + Organization + SearchAction) injecté 1 seule fois
   - Options dev (idle): Service Worker + Web Vitals (non bloquants)
   - ES5-safe (pas d’arrows, pas d’optional chaining)
========================================================= */

(function(){
  'use strict';

  /* ====== Boot & drapeaux ====== */
  if (window.__ptP4Booted) return; window.__ptP4Booted = 1;
  if (window.__ptRouterPrimary !== 1) window.__ptRouterPrimary = 1; // P1/P2 lisent ce flag et s'auto-régulent

  var W = window, D = document;
  var PT = W.PT = W.PT || {};

  /* ====== Guards utilitaires (définis UNIQUEMENT si absents) ====== */
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
      return { path:path, view:path.replace('#/','').split('/')[0]||'', query:query, raw:h };
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
      var id = key ? ('view-'+key) : '';
      var scope = id ? D.getElementById(id) : null;
      var h1 = scope ? scope.querySelector('h1') : null;
      if (h1){
        h1.setAttribute('tabindex','-1');
        try{ h1.focus({preventScroll:true}); }catch(_){ try{ h1.focus(); }catch(__){} }
        setTimeout(function(){ try{ h1.removeAttribute('tabindex'); }catch(_){ } }, 280);
      }
    };
  }
  if (typeof W.setPageMeta !== 'function') {
    W.setPageMeta = function(title, desc){
      try{
        if (title) document.title = String(title);
        var mDesc = D.querySelector('meta[name="description"]');
        if (!mDesc){ mDesc = D.createElement('meta'); mDesc.setAttribute('name','description'); D.head.appendChild(mDesc); }
        if (desc!=null) mDesc.setAttribute('content', String(desc));
      }catch(_){}
    };
  }
  if (typeof W.resetPageMeta !== 'function') {
    W.resetPageMeta = function(){
      try{
        document.title = 'Pirates Tools • Outillage pro (PWA)';
        var m = D.querySelector('meta[name="description"]');
        if (!m){
          m = D.createElement('meta'); m.setAttribute('name','description'); D.head.appendChild(m);
        }
        m.setAttribute('content','Pirates Tools — Visseuses à chocs DeWALT, dispo Antilles. PWA rapide, contact immédiat (téléphone & WhatsApp).');
      }catch(_){}
    };
  }
  if (typeof W.toast !== 'function') W.toast = function(){};

  /* ====== Vues fail-safe (créées SEULEMENT si absentes) ====== */
  function ensureHomeView(){
    var v = D.getElementById('view-home'); if (v) return v;
    v = D.createElement('section'); v.id='view-home'; v.className='view';
    v.innerHTML =
      '<div class="container">'+
        '<h1 tabindex="-1">Bienvenue</h1>'+
        '<p style="margin:0 0 1rem;color:#9fb4c5">Choisissez une marque ou explorez le catalogue.</p>'+
        '<div id="brandGrid" class="brand-grid" role="list"></div>'+
      '</div>';
    D.body.appendChild(v); return v;
  }
  function ensureCatalogueView(){
    var v = D.getElementById('view-catalogue'); if (v) return v;
    v = D.createElement('section'); v.id='view-catalogue'; v.className='view hidden';
    v.innerHTML =
      '<div class="container">'+
        '<h1 tabindex="-1">Catalogue</h1>'+
        '<div class="toolbar">'+
          '<input id="q" class="search" type="search" placeholder="Rechercher (marque, réf, description…)">'+
          '<select id="tag" class="select"><option value="">Tous</option></select>'+
        '</div>'+
        '<div id="catList" class="cat-list" aria-label="Catégories"></div>'+
        '<div id="list" class="list" aria-live="polite" aria-busy="false"></div>'+
      '</div>';
    D.body.appendChild(v); return v;
  }
  function ensureProduitView(){
    var v = D.getElementById('view-produit'); if (v) return v;
    v = D.createElement('section'); v.id='view-produit'; v.className='view hidden';
    v.innerHTML =
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
    D.body.appendChild(v); return v;
  }
  function ensureDevisView(){
    var v = D.getElementById('view-devis'); if (v) return v;
    v = D.createElement('section'); v.id='view-devis'; v.className='view hidden';
    v.innerHTML =
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
    D.body.appendChild(v); return v;
  }
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

  // Installe les vues manquantes (non destructif)
  ensureHomeView(); ensureCatalogueView(); ensureProduitView(); ensureDevisView(); ensureAuthViews();

  /* ====== SEO helpers (canonical + OG metas) ====== */
  var DEFAULT_DESC = 'Pirates Tools — Visseuses à chocs DeWALT, dispo Antilles. PWA rapide, contact immédiat (téléphone & WhatsApp).';

  function canonicalFromHash(){
    var base = location.origin + location.pathname; // respecte sous-dossiers
    var h = location.hash || '#/';
    var path = h.indexOf('#/')===0 ? h.slice(1) : '/';
    return base + path;
  }
  function setCanonical(url){
    try{
      var link = D.querySelector('link[rel="canonical"]');
      if (!link){ link = D.createElement('link'); link.setAttribute('rel','canonical'); D.head.appendChild(link); }
      link.setAttribute('href', url);
    }catch(_){}
  }
  function setMetaOg(name, content){
    try{
      var sel = 'meta[property="'+name+'"], meta[name="'+name+'"]';
      var m = D.querySelector(sel);
      if (!m){
        m = D.createElement('meta');
        if (name.indexOf('og:')===0) m.setAttribute('property', name); else m.setAttribute('name', name);
        D.head.appendChild(m);
      }
      m.setAttribute('content', content);
    }catch(_){}
  }
  function guessOgImage(){
    try{
      // P2 peut exposer une image courante en data attr, sinon IMG_FALLBACK
      var pdp = D.getElementById('pdpImg');
      if (pdp && pdp.currentSrc) return pdp.currentSrc;
      if (typeof W.PUBLIC_BASE==='string') return new URL('images/pirates-tools-logo.png?v=7', W.PUBLIC_BASE).href;
      return (W.IMG_FALLBACK || '');
    }catch(_){ return (W.IMG_FALLBACK || ''); }
  }
  function updateSEO(o){
    var title = (o && o.title) || document.title || 'Pirates Tools • Outillage pro (PWA)';
    var desc  = (o && o.desc)  || DEFAULT_DESC;
    W.setPageMeta(title, desc);

    var url = canonicalFromHash();
    setCanonical(url);
    setMetaOg('og:title', title);
    setMetaOg('og:description', desc);
    setMetaOg('og:url', url);
    if (!o || !o.skipOgImage){
      setMetaOg('og:image', (o && o.image) || guessOgImage());
    }
    // og:type : on ne force PAS "product" (laisse P2 si besoin)
    if (!o || o.type!=='product') setMetaOg('og:type','website');
  }
// === Auth locale (pt_auth_v1) — ES5
(function(){
  var AUTH_KEY = 'pt_auth_v1';

  function sha256(text, cb){
    // petit SHA-256 (Web Crypto si dispo, sinon fallback très simple non sécurisé)
    try{
      var enc = new TextEncoder('utf-8').encode(String(text||''));
      if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest){
        window.crypto.subtle.digest('SHA-256', enc).then(function(buf){
          var b = Array.prototype.map.call(new Uint8Array(buf), function(x){ return ('00'+x.toString(16)).slice(-2); }).join('');
          cb(b);
        }, function(){ cb(window.btoa(String(text||''))); });
        return;
      }
    }catch(_){}
    cb(window.btoa(String(text||''))); // fallback
  }

  function loadAuth(){
    try{ var raw = localStorage.getItem(AUTH_KEY); return raw?JSON.parse(raw):{ email:'', pwdHash:'' }; }
    catch(_){ return { email:'', pwdHash:'' }; }
  }
  function saveAuth(a){
    try{ localStorage.setItem(AUTH_KEY, JSON.stringify(a||{email:'',pwdHash:''})); }catch(_){}
  }
  function clearAuth(){
    try{ localStorage.removeItem(AUTH_KEY); }catch(_){}
  }
  function isLoggedIn(){
    var a = loadAuth(); return !!(a && a.email && a.pwdHash);
  }

  // Expose
  window.PT = window.PT || {};
  if (!window.PT.auth){
    window.PT.auth = {
      load: loadAuth, save: saveAuth, clear: clearAuth,
      isLoggedIn: isLoggedIn, sha256: sha256
    };
  }
})();  /* ====== JSON-LD Site / Org / SearchAction (idempotent) ====== */
  function injectSiteJsonLD(){
    if (D.getElementById('jsonld-site')) return;
    try{
      var base = location.origin + location.pathname;
      var logo = (typeof W.PUBLIC_BASE==='string') ? new URL('images/pirates-tools-logo.png?v=7', W.PUBLIC_BASE).href : (W.IMG_FALLBACK || '');
      var payload = [{
        "@context":"https://schema.org",
        "@type":"WebSite",
        "name":"Pirates Tools",
        "url": base,
        "potentialAction":{
          "@type":"SearchAction",
          "target": base + "catalogue?q={search_term_string}",
          "query-input":"required name=search_term_string"
        }
      },{
        "@context":"https://schema.org",
        "@type":"Organization",
        "name":"Pirates Tools",
        "url": base,
        "logo": logo
      }];
      var s = D.createElement('script');
      s.id='jsonld-site'; s.type='application/ld+json'; s.textContent = JSON.stringify(payload);
      D.head.appendChild(s);
    }catch(_){}
  }

  /* ====== Produits : attente avant PDP/home si nécessaire ====== */
  function withProducts(cb){
    if (W.MODELS && W.MODELS.length){ try{ cb(); }catch(_){ } return; }
    if (typeof W.loadProducts === 'function'){
      var p; try{ p = W.loadProducts(); }catch(_){}
      if (p && typeof p.then==='function'){
        p.then(function(){ try{ cb(); }catch(_){ } })
         .catch(function(){ try{ cb(); }catch(_){ } });
        return;
      }
    }
    var once = function(){ W.removeEventListener('pt:productsLoaded', once, false); try{ cb(); }catch(_){ } };
    W.addEventListener('pt:productsLoaded', once, false);
  }

  /* ====== Helpers route ====== */
  function getProductIdFromHash(){
    var h = location.hash || '';
    var m = h.match(/^#\/produit\/([^\/\?#]+)(?:[\/\?#]|$)/i);
    if (m && m[1]) return decodeURIComponent(m[1]);
    var parsed = W.parseHash();
    return (parsed && parsed.query && parsed.query.id) ? parsed.query.id : '';
  }

  /* ====== Rendus par route (délégations) ====== */
  function renderHome(){
    W.showView('home');
    updateSEO({ title:'Pirates Tools • Outillage pro (PWA)', desc: DEFAULT_DESC });
    withProducts(function(){
      try{
        if (PT && typeof PT.renderBrandGridFromProducts==='function'){
          // Éviter double rendu : ne ré-injecte que si brandGrid est vide
          var host = D.getElementById('brandGrid');
          if (host && !host.firstElementChild) PT.renderBrandGridFromProducts(W.MODELS||[]);
        }
      }catch(_){}
    });
    W.focusView('home');
  }

  function renderCatalogueRoute(){
    ensureCatalogueView(); W.showView('catalogue');
    updateSEO({ title:'Catalogue • Pirates Tools', desc: DEFAULT_DESC });
    // Laisser P2 gérer filtres/rendu
    if (typeof W.handleRouteCatalogue_Extended==='function'){
      try{ W.handleRouteCatalogue_Extended(); }catch(_){}
    } else if (PT && typeof PT.applyFilters==='function'){
      try{ PT.applyFilters(); }catch(_){}
    }
    W.focusView('catalogue');
  }

  function renderProduitRoute(){
    ensureProduitView(); W.showView('produit');
    // Ne pas forcer og:type=product ici; laisser P2 gérer JSON-LD Product + title
    updateSEO({ skipOgImage:false, type:'product' }); // met canonical/OG url/image sans toucher og:type=product
    withProducts(function(){
      var id = getProductIdFromHash(); var m = null;
      if (id && W.MODELS && W.MODELS.length){
        var lid = String(id).toLowerCase();
        for (var i=0;i<W.MODELS.length;i++){
          var x=W.MODELS[i]||{};
          var a=(x.id!=null?String(x.id).toLowerCase():'');
          var b=(x.sku!=null?String(x.sku).toLowerCase():'');
          var c=(x.title!=null?String(x.title).toLowerCase():'');
          if (lid===a || lid===b || lid===c){ m=x; break; }
        }
      }
      if (m && typeof W.renderPDP==='function'){
        try{
          W.renderPDP(m); // P2 place title/description + JSON-LD Product
          // P4 remet à jour og:url/canonical (déjà fait) et image si besoin
          updateSEO({ title: document.title, desc: (D.querySelector('meta[name="description"]')||{}).content || DEFAULT_DESC, type:'product' });
        }catch(_){}
      } else {
        var wrap = D.getElementById('pdp') || D.getElementById('view-produit');
        if (wrap){
          if (wrap.scrollIntoView) wrap.scrollIntoView({behavior:'smooth', block:'start'});
          var old = wrap.querySelector('.card[data-notfound]');
          if (old && old.parentNode){ try{ old.parentNode.removeChild(old); }catch(_){ } }
          var box = D.createElement('div'); box.className='card'; box.setAttribute('data-notfound','1');
          box.innerHTML = '<div class="head"><h3 class="title">Produit introuvable</h3></div>'+
                          '<div class="specs"><p style="margin:0">Référence inconnue. <a href="#/catalogue" class="chip chip--back">← Retour catalogue</a></p></div>';
          (wrap.querySelector('.container')||wrap).appendChild(box);
          var rel = D.getElementById('pdpRelated'); if (rel) rel.innerHTML='';
          var t   = D.getElementById('pdpTitle');   if (t)   t.textContent='—';
        }
        if (typeof W.clearProductJsonLD==='function') W.clearProductJsonLD();
        W.resetPageMeta();
      }
      W.focusView('produit');
    });
  }

  function renderDevisRoute(){
    ensureDevisView(); W.showView('devis');
    updateSEO({ title:'Mon devis • Pirates Tools', desc:'Préparez et envoyez votre devis via WhatsApp.' });
    if (typeof W.renderCartView==='function'){ try{ W.renderCartView(); }catch(_){ } }
    W.focusView('devis');
  }


function renderCompteRoute(){
  // Si l’auth locale existe et que l’utilisateur n’est pas connecté → redirige vers /login
  if (window.PT && window.PT.auth && typeof window.PT.auth.isLoggedIn === 'function' && !window.PT.auth.isLoggedIn()){
    location.hash = '#/login';
    return;
  }

  // Si la PARTIE 3 est présente, on lui délègue le rendu
  if (PT && typeof PT.handleRouteAccount === 'function'){
    try { PT.handleRouteAccount(); return; } catch(_){}
  }

  // Fallback minimal si P3 est absente
  W.showView('compte');
  updateSEO({ title:'Mon compte • Pirates Tools', desc:'Gérez vos informations et avantages fidélité.' });
  W.focusView('compte');
}

  /* ====== Router principal (unique) ====== */
  function route(){
    var p = W.parseHash(); var v = p.view || '';
    // Canonical mis à jour à chaque navigation
    setCanonical(canonicalFromHash());

    // Quitte la PDP → nettoie JSON-LD Product si P2 l'avait posé
    if (v!=='produit' && typeof W.clearProductJsonLD==='function'){ try{ W.clearProductJsonLD(); }catch(_){} }

    if (!v || v==='home') return renderHome();
    if (v==='catalogue')  return renderCatalogueRoute();
    if (v==='produit')    return renderProduitRoute();
    if (v==='devis')      return renderDevisRoute();
    if (v==='compte')     return renderCompteRoute();
    if (v==='login'){ W.showView('login'); updateSEO({ title:'Connexion • Pirates Tools', desc:DEFAULT_DESC }); W.focusView('login'); return; }
    if (v==='register'){ W.showView('register'); updateSEO({ title:'Créer un compte • Pirates Tools', desc:DEFAULT_DESC }); W.focusView('register'); return; }
    // Fallback
    renderHome();
  }

  /* ====== Écoutes ====== */
  if (!W.__ptP4Routed){
    W.__ptP4Routed = 1;
    W.addEventListener('hashchange', route, false);
    D.addEventListener('DOMContentLoaded', route, false);
    // Home : si les produits arrivent après, compléter la grille si vide
    W.addEventListener('pt:productsLoaded', function(){
      var p = W.parseHash(); if (!p.view || p.view==='home'){
        var host = D.getElementById('brandGrid');
        if (PT && typeof PT.renderBrandGridFromProducts==='function' && host && !host.firstElementChild){
          try{ PT.renderBrandGridFromProducts(W.MODELS||[]); }catch(_){}
        }
      }
    }, false);
  }

  /* ====== Bouton logo → home (#/) ====== */
  (function(){
    var logo = D.getElementById('homeLink') || D.querySelector('.topbar-logo-link');
    if (logo && !logo.__ptP4){
      logo.__ptP4 = 1;
      var go=function(e){ if(e&&e.preventDefault)e.preventDefault(); location.hash='#/'; if (W.scrollTo) W.scrollTo({top:0,behavior:'smooth'}); };
      logo.addEventListener('click', go, false);
      logo.addEventListener('pointerup', function(e){ if(e && e.pointerType==='touch') go(e); }, false);
    }
  })();

  /* ====== JSON-LD Site/Org : injecter une seule fois ====== */
  injectSiteJsonLD();

  /* ====== Options dev: Service Worker + Web Vitals (idle, non bloquant) ====== */
  (function idleExtras(){
    var ric = W.requestIdleCallback || function(fn){ return setTimeout(fn, 0); };
    ric(function(){
      try{
        // SW (idempotent, dev/prod opt-in)
        if ('serviceWorker' in navigator){
          var scopePath = '/';
          try{ scopePath = (typeof W.PUBLIC_BASE==='string') ? new URL('.', W.PUBLIC_BASE).pathname : '/'; }catch(_){}
          try{
            var swUrl = (typeof W.PUBLIC_BASE==='string') ? new URL('sw.js', W.PUBLIC_BASE).href : 'sw.js';
            navigator.serviceWorker.register(swUrl, { scope: scopePath });
          }catch(_){}
        }
      }catch(_){}
      try{
        // Web Vitals (dev): charge en paresseux
        var s = D.createElement('script');
        s.async = true;
        s.src = 'https://unpkg.com/web-vitals@3/dist/web-vitals.iife.js';
        s.onload = function(){
          try{
            if (W.webVitals){
              W.webVitals.getCLS(console.log);
              W.webVitals.getFID(console.log);
              W.webVitals.getLCP(console.log);
              if (W.webVitals.getINP) W.webVitals.getINP(console.log);
            }
          }catch(_){}
        };
        D.head.appendChild(s);
      }catch(_){}
    });
  })();

  /* ====== Expose API P4 ====== */
  PT.router = PT.router || {};
  PT.router.init = route;
  PT.router.route = route;
  PT.router.updateSEO = updateSEO;
  PT.router.setCanonical = setCanonical;
  PT.router.injectSiteJsonLD = injectSiteJsonLD;
  PT.router.clearSiteJsonLD = function(){ var s=D.getElementById('jsonld-site'); if (s && s.parentNode) s.parentNode.removeChild(s); }; // pas utilisée en prod

})();


/* ===== Auth (front-only) : #/login & #/register — ES5, non destructif ===== */

(function(){
  'use strict';
  if (window.__ptP4AuthBooted) return; window.__ptP4AuthBooted = 1;

  var D=document;
  function qs(s,r){return (r||D).querySelector(s);}
  function qsa(s,r){return Array.prototype.slice.call((r||D).querySelectorAll(s));}

  function showView(id){
    var views=qsa('.view'); for(var i=0;i<views.length;i++) views[i].classList.add('hidden');
    var v=qs(id); if(v){ v.classList.remove('hidden'); var h1=qs('h1',v); if(h1){ h1.setAttribute('tabindex','-1'); try{ h1.focus({preventScroll:true}); }catch(_){ } setTimeout(function(){ try{ h1.removeAttribute('tabindex'); }catch(_){ } },260);} }
  }

  function _fallbackSaveUser(u){ try{ localStorage.setItem('pt_user_v1', JSON.stringify(u)); }catch(_){ } }
  function _fallbackLoadUser(){ try{ var r=localStorage.getItem('pt_user_v1'); return r?JSON.parse(r):null; }catch(_){ return null; } }
  function saveUser(u){ return (typeof window.saveUser==='function') ? window.saveUser(u) : _fallbackSaveUser(u); }
  function loadUser(){ return (typeof window.loadUser==='function') ? window.loadUser() : (_fallbackLoadUser() || {}); }

  function onLoginSubmit(e){
    if (e && e.preventDefault) e.preventDefault();
    var email=(qs('#loginEmail')||{}).value||''; var pwd=(qs('#loginPwd')||{}).value||'';
    if (!email || email.indexOf('@')===-1 || !pwd){ if(window.toast) window.toast('Identifiants invalides','info'); return; }
    var u=loadUser()||{}; u.email=email; if(!u.name) u.name=email.split('@')[0]; saveUser(u);
    if(window.toast) window.toast('Connecté','success'); if(window.announce) window.announce('Connecté'); location.hash='#/compte';
  }
  function onRegisterSubmit(e){
    if (e && e.preventDefault) e.preventDefault();
    var name=(qs('#regName')||{}).value||''; var email=(qs('#regEmail')||{}).value||''; var pwd=(qs('#regPwd')||{}).value||'';
    if (!name || !email || email.indexOf('@')===-1 || !pwd || pwd.length<6){ if(window.toast) window.toast('Veuillez remplir tous les champs (MDP ≥ 6)','info'); return; }
    var u=loadUser()||{}; u.name=name; u.email=email; saveUser(u);
    if(window.toast) window.toast('Compte créé (mode démo)','success'); location.hash='#/compte';
  }

  function wire(){
    var lf=qs('#loginForm'); if(lf && !lf.__wired){ lf.__wired=1; lf.addEventListener('submit', onLoginSubmit, false); }
    var rf=qs('#registerForm'); if(rf && !rf.__wired){ rf.__wired=1; rf.addEventListener('submit', onRegisterSubmit, false); }
  }
  function onHash(){
    var h=(location.hash||'').toLowerCase();
    if (h.indexOf('#/login')===0){ wire(); showView('#view-login'); return; }
    if (h.indexOf('#/register')===0){ wire(); showView('#view-register'); return; }
  }
  window.addEventListener('hashchange', onHash, false);
  document.addEventListener('DOMContentLoaded', function(){ wire(); onHash(); }, false);
})();


<!-- --- Compat form id (#accForm | #accountForm) + save btn (ES5, non destructif) --- -->

(function () {
  'use strict';
  if (window.__ptP4AccCompat) return; window.__ptP4AccCompat = 1;

  var D=document;
  function qs(s,r){return (r||D).querySelector(s);}
  function on(el,ev,fn){ if(el && !el.__w){ el.__w=1; el.addEventListener(ev,fn,false);} }

  function _fallbackSaveUser(u){ try{ localStorage.setItem('pt_user_v1', JSON.stringify(u)); }catch(_){ } }
  function saveUser(u){ return (typeof window.saveUser==='function') ? window.saveUser(u) : _fallbackSaveUser(u); }

  var form = qs('#accForm') || qs('#accountForm');
  var btn  = qs('#accSave');

  function saveLocal(){
    var nameEl=qs('#accName'); var emailEl=qs('#accEmail');
    var u={ name:(nameEl&&nameEl.value?String(nameEl.value).trim():''), email:(emailEl&&emailEl.value?String(emailEl.value).trim():'') };
    saveUser(u);
  }
  if (form) on(form,'submit', function(e){ if(e&&e.preventDefault) e.preventDefault(); saveLocal(); });
  if (btn)  on(btn, 'click',  function(e){ if(e&&e.preventDefault) e.preventDefault(); saveLocal(); });
})();




/* =========================================================
   PARTIE 5 — Nav actif + Dock/FAB + Hero polish + Grille 3 colonnes
   - Périmètre strict UI/UX : pas de données ni SEO (P1/P2/P3/P4 gardent la main)
   - ES5-safe, idempotent (flags __ptP5*), aucun double listener
   - Nav : état actif + a11y, sans conflit avec P6B
   - Dock : pulse sur pt:cartChanged, safe-area, mapping routes
   - Hero : fade discret + rendu net, neutralisé si P6A actif
   - Home : #brandGrid → classe .brand-grid--3col (layout CSS)
========================================================= */

(function(){
  'use strict';
  if (window.__ptP5Booted) return; window.__ptP5Booted = 1;

  var W = window, D = document, PT = W.PT = (W.PT || {});
  var PHONE_E164 = W.PHONE_E164 || '+33774230195';

  /* --------- Helpers sûrs --------- */
  function qs(s, r){ return (r||D).querySelector(s); }
  function qsa(s, r){ return Array.prototype.slice.call((r||D).querySelectorAll(s)); }
  function hasClass(el, c){ return !!(el && el.classList && el.classList.contains(c)); }
  function addClass(el, c){ if (el && el.classList) el.classList.add(c); }
  function rmClass(el, c){ if (el && el.classList) el.classList.remove(c); }
  function onlyDigits(s){ return String(s||'').replace(/[^\d]/g,''); }
  function prefersReduced(){ try{ return W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(_){ return false; } }

  function getHashInfo(){
    var p = (PT.parseHash ? PT.parseHash() : (W.parseHash ? W.parseHash() : null));
    if (p && typeof p === 'object') return p;
    var h = location.hash || '#/'; var path = (h.split('?')[0]||'#/'); 
    return { view: path.replace('#/','').split('/')[0]||'', path:path, raw:h, query:{} };
  }

  /* --------- CSS non-destructif (layout & micro-anim) --------- */
  (function injectP5CSS(){
    if (D.getElementById('pt-p5-style')) return;
    var s = D.createElement('style'); s.id = 'pt-p5-style';
    s.textContent =
      /* Nav actif : neutre (laisser le thème styler .is-active) */
      '[aria-current="page"]{pointer-events:none}' +

      /* Dock safe-area + pulse (désactivé en reduced) */
      '#dock.dock--safe{padding-bottom:max(env(safe-area-inset-bottom,0px), var(--safe-bottom,0px))}' +
      '@media (prefers-reduced-motion:no-preference){' +
      '  #dock.dock--pulse{animation:pt-p5-pulse .42s ease}' +
      '  @keyframes pt-p5-pulse{0%{transform:translateY(0) scale(1)}30%{transform:translateY(-2px) scale(1.04)}100%{transform:translateY(0) scale(1)}}' +
      '}' +

      /* Hero : conteneur relatif + dégradé bas (pas si P6A prend la main) */
      '#hero,.hero{position:relative}' +
      '#hero .hero-fade{position:absolute;left:0;right:0;bottom:0;height:38vh;pointer-events:none;' +
      'background:linear-gradient(180deg, rgba(10,15,20,0), rgba(10,15,20,.90) 62%, var(--bg,#0a0f14) 100%);}' +
      '#heroLogo{image-rendering:-webkit-optimize-contrast;backface-visibility:hidden;-webkit-backface-visibility:hidden;will-change:transform,opacity;transform:translateZ(0)}' +

      /* Grille marques → classe ajoutée par P5 (pas de ciblage dur sur l’ID) */
      '.brand-grid--3col{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(10px,2vmin,18px);' +
      'padding:0 clamp(10px,2vmin,16px)}' +
      '@media (min-width:720px){.brand-grid--3col{grid-template-columns:repeat(3,minmax(0,1fr))}}' +

      /* Bulle logo (polish léger, pas d’anim si reduced) */
      '#view-home .brand{display:flex;flex-direction:column;align-items:center;gap:.55rem;background:transparent;border:0;cursor:pointer;transition:transform .18s ease}' +
      '#view-home .brand__bubble{position:relative;display:block;width:clamp(96px,22vmin,140px);aspect-ratio:1/1;border-radius:50%;overflow:hidden;padding:0;' +
      'background:rgba(255,255,255,.02);box-shadow:0 10px 24px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.06);' +
      'backdrop-filter:saturate(120%) blur(4px);-webkit-mask-image:-webkit-radial-gradient(white, black);mask-image:radial-gradient(white, white)}' +
      '#view-home .brand__logo{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover;object-position:center;image-rendering:-webkit-optimize-contrast}' +
      '#view-home .brand:active{transform:scale(.98)}';
    D.head.appendChild(s);
  })();

  /* --------- Menu (drawer) : toggle + auto-close (idempotent) --------- */
  function p5CloseDrawer(){
    try{
      var body   = D.body;
      var drawer = qs('#drawer') || qs('#sideMenu') || qs('#side-menu') || qs('.drawer') || qs('[data-drawer]');
      var overlay= qs('#drawerBackdrop') || qs('#menuBackdrop') || qs('#menu-overlay') || qs('.drawer__backdrop') || qs('.backdrop');
      var flags  = ['open','is-open','active','visible','shown','menu-open','drawer-open']; var i;
      if (body)   for (i=0;i<flags.length;i++) rmClass(body, flags[i]);
      if (drawer) for (i=0;i<flags.length;i++) rmClass(drawer, flags[i]);
      if (overlay){ addClass(overlay,'hidden'); overlay.style.display='none'; }
      var burger = qs('#menuBtn') || qs('#menu-toggle') || qs('.hamburger') || qs('.menu-toggle');
      if (burger) burger.setAttribute('aria-expanded','false');
    }catch(_){}
  }
  function p5OpenDrawer(){
    var body   = D.body;
    var drawer = qs('#drawer') || qs('#sideMenu') || qs('#side-menu') || qs('.drawer') || qs('[data-drawer]');
    var overlay= qs('#drawerBackdrop') || qs('#menuBackdrop') || qs('#menu-overlay') || qs('.drawer__backdrop') || qs('.backdrop');
    if (drawer) addClass(drawer,'open');
    if (body) addClass(body,'menu-open');
    if (overlay){ rmClass(overlay,'hidden'); overlay.style.display=''; }
    var burger = qs('#menuBtn') || qs('#menu-toggle') || qs('.hamburger') || qs('.menu-toggle');
    if (burger) burger.setAttribute('aria-expanded','true');
  }
  function wireDrawer(){
    var drawer   = qs('#drawer') || qs('#sideMenu') || qs('#side-menu') || qs('.drawer') || qs('[data-drawer]');
    var toggle   = qs('#menuBtn') || qs('#menu-toggle') || qs('.hamburger') || qs('.menu-toggle') || qs('[data-menu-toggle]');
    var backdrop = qs('#drawerBackdrop') || qs('#menuBackdrop') || qs('#menu-overlay') || qs('.drawer__backdrop') || qs('.backdrop');
    if (toggle && !toggle.__ptP5){
      toggle.__ptP5 = 1;
      var onclick = function(e){ if (e) e.preventDefault(); (hasClass(D.body,'menu-open')||hasClass(drawer,'open')) ? p5CloseDrawer() : p5OpenDrawer(); };
      toggle.addEventListener('click', onclick, false);
      toggle.addEventListener('pointerup', function(e){ if (e && e.pointerType==='touch'){ onclick(e); } }, false);
    }
    if (backdrop && !backdrop.__ptP5){ backdrop.__ptP5 = 1; backdrop.addEventListener('click', p5CloseDrawer, false); }
    if (drawer && !drawer.__ptP5){
      drawer.__ptP5 = 1;
      drawer.addEventListener('click', function(e){
        var a = e.target && e.target.closest ? e.target.closest('a,[data-nav],[data-route],[role="menuitem"]') : null;
        if (a){ setTimeout(p5CloseDrawer, 30); }
      }, false);
    }
    if (!W.__ptP5DrawerHash){ W.__ptP5DrawerHash = 1; W.addEventListener('hashchange', function(){ setTimeout(p5CloseDrawer,0); }, false); }
  }

  /* --------- Routing helpers / mapping --------- */
  function go(dest){
    if (!dest) return;
    if (dest.indexOf('#/')===0){ location.hash = dest; return; }
    if (dest==='phone'){ try{ location.href='tel:'+onlyDigits(PHONE_E164); }catch(_){ W.open('tel:'+onlyDigits(PHONE_E164),'_self'); } return; }
    if (dest==='wa' || dest==='whatsapp'){
      var text = (typeof W.cartToWhatsAppText==='function' && (W.CART||[]).length)
        ? W.cartToWhatsAppText()
        : ('Bonjour, je souhaite un devis.\n\nLien: '+location.origin+location.pathname+'#/devis\n\nMerci.');
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

  /* --------- Menu & Dock mapping (idempotent) --------- */
  function wireDrawerLinks(){
    var drawer = qs('#drawer') || qs('#sideMenu') || qs('#side-menu') || qs('.drawer') || qs('[data-drawer]');
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
    drawer.setAttribute('data-pt-nav-wired','1');
  }
  function wireDock(){
    var dock = qs('#dock'); if (!dock) return;
    addClass(dock,'dock--safe');
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
    // IDs connus → data-route
    var map = { dockToolsBtn:'#/catalogue', dockCartBtn:'#/devis', dockAccountBtn:'#/compte', homeLink:'#/' };
    for (var k in map){
      var el = D.getElementById(k);
      if (el && !el.getAttribute('data-route')) el.setAttribute('data-route', map[k]);
      attachNav(el);
    }
  }

  /* --------- Nav actif + a11y --------- */
  function findNavContainers(){
    var nodes = [];
    var sels = ['#topbar','nav[role="navigation"]','nav','.topbar','.nav','[data-pt-nav]'];
    for (var i=0;i<sels.length;i++){ var list = qsa(sels[i]); for (var j=0;j<list.length;j++) nodes.push(list[j]); }
    // Unicité
    var out = []; for (var k=0;k<nodes.length;k++) if (out.indexOf(nodes[k])<0) out.push(nodes[k]);
    return out;
  }
  function setNavActiveByRoute(route){
    // route attendu: '#/', '#/catalogue', '#/devis', '#/compte'
    var navs = findNavContainers(); if (!navs.length) return;
    for (var i=0;i<navs.length;i++){
      var nav = navs[i]; if (!nav) continue;
      var links = qsa('a[href^="#/"], [data-route^="#/"]', nav);
      // Reset
      for (var r=0;r<links.length;r++){
        rmClass(links[r], 'is-active');
        if (!W.__ptP6BNav) links[r].removeAttribute('aria-current');
      }
      // Find target
      var target = null;
      for (var t=0;t<links.length;t++){
        var href = links[t].getAttribute('href') || links[t].getAttribute('data-route') || '';
        if (href === route){ target = links[t]; break; }
      }
      // Fallback mapping (ex: PDP => Catalogue)
      if (!target && route.indexOf('#/produit')===0){
        for (var u=0;u<links.length;u++){
          var h2 = links[u].getAttribute('href') || links[u].getAttribute('data-route') || '';
          if (h2 === '#/catalogue'){ target = links[u]; break; }
        }
      }
      if (target){
        addClass(target,'is-active');
        if (!W.__ptP6BNav) target.setAttribute('aria-current','page');
      }
      nav.setAttribute('data-pt-nav-wired','1');
    }
  }
  function updateNavActiveFromHash(){
    var info = getHashInfo(); var v = (info.view||'').toLowerCase();
    var route = '#/';
    if (v==='catalogue') route = '#/catalogue';
    else if (v==='devis') route = '#/devis';
    else if (v==='compte') route = '#/compte';
    else if (v==='produit') route = '#/catalogue';
    setNavActiveByRoute(route);
  }

  /* --------- Dock pulse + a11y du compteur --------- */
  var __pulseTimer = 0;
  function triggerDockPulse(){
    var dock = qs('#dock'); if (!dock) return;
    if (prefersReduced()) return;
    rmClass(dock,'dock--pulse'); // reset
    // reflow trick
    try{ void dock.offsetWidth; }catch(_){}
    addClass(dock,'dock--pulse');
    clearTimeout(__pulseTimer);
    __pulseTimer = setTimeout(function(){ rmClass(dock,'dock--pulse'); }, 460);
  }
  function updateDockCountLabel(){
    var badge = qs('#dockCount'); if (!badge) return;
    var n = parseInt((badge.getAttribute('data-count') || badge.textContent || '0').replace(/[^\d]/g,''), 10);
    if (isNaN(n)) n = 0;
    badge.setAttribute('aria-label', (n===0 ? 'Panier vide' : (n+' article'+(n>1?'s':''))));
    // S'assurer d’une annonce correcte si un aria-live existe côté P1/P2
  }

  /* --------- Hero polish (no-op si P6A actif) --------- */
  function polishHero(){
    if (W.__ptHeroWired5 === 1 || W.__ptHeroAB === 1) return; // P6A/exp anim prend la main
    var hero = qs('#hero') || qs('.hero'); if (!hero) return;
    if (!qs('.hero-fade', hero)){
      var f = D.createElement('div'); f.className = 'hero-fade'; hero.appendChild(f);
    }
    var logo = qs('#heroLogo');
    if (logo){
      logo.style.imageRendering = '-webkit-optimize-contrast';
      logo.style.backfaceVisibility = 'hidden';
      logo.style.webkitBackfaceVisibility = 'hidden';
      logo.style.transform = 'translateZ(0)';
      if (PT.setSafeImg && logo.getAttribute('data-src')){
        try{ PT.setSafeImg(logo, logo.getAttribute('data-src'), logo.getAttribute('alt')||''); }catch(_){}
      }
    }
  }

  /* --------- Home: assure la classe de grille 3 colonnes --------- */
  function ensureBrandGridClass(){
    var grid = qs('#brandGrid'); if (!grid) return;
    addClass(grid, 'brand-grid--3col');
  }

  /* --------- Exposition minimale pour P6/diagnostic --------- */
  PT.nav = PT.nav || {};
  PT.nav.setActive = function(route){
    if (!route || typeof route !== 'string'){ updateNavActiveFromHash(); return; }
    setNavActiveByRoute(route);
  };
  PT.nav.pulseCart = function(){ triggerDockPulse(); };
  PT.nav.wire = function(){
    wireDrawerLinks();
    wireDock();
    updateNavActiveFromHash();
  };

 /* --------- Boot --------- */
function boot(){
  wireDrawer();
  wireDrawerLinks();
  wireDock();
  polishHero();
  ensureBrandGridClass();
  updateDockCountLabel();
  updateNavActiveFromHash();

  // Force l’affichage et la sécurité du dock (z-index, classes)
  if (typeof ensureDockVisible === 'function') {
    ensureDockVisible();
  } else {
    // Fallback si le patch ensureDockVisible n'est pas encore chargé
    var _d = D.getElementById('dock');
    if (_d){
      if (!_d.classList.contains('dock--visible')) _d.classList.add('dock--visible');
      if (!_d.classList.contains('dock--safe')) _d.classList.add('dock--safe');
      var zi = parseInt(_d.style.zIndex || '0', 10) || 0;
      if (zi < 1000) _d.style.zIndex = 1000;
    }
  }

  // Ajuste les variables de viewport/safe-area s’il est dispo (Partie 1)
  if (W.PT && typeof W.PT.refreshViewportSafe === 'function') {
    try { W.PT.refreshViewportSafe(); } catch(_){}
  }

  // Listeners (idempotents)
  if (!W.__ptP5NavHash){
    W.__ptP5NavHash = 1;
    W.addEventListener('hashchange', updateNavActiveFromHash, false);
  }
  if (!W.__ptP5CartEvt){
    W.__ptP5CartEvt = 1;
    W.addEventListener('pt:cartChanged', function(){
      try{ updateDockCountLabel(); triggerDockPulse(); }catch(_){}
    }, false);
  }
}

if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot, false);
else boot();

})();


/* =========================================================
   PARTIE 6 — A/B
   6A : Hero A/B (variant bucket + B = séquence par classes)
   6B : Menu A11y avancé (open/close, focus trap, état actif)
   - ES5-safe, idempotent, sans casser P1/P2/P3/P4/P5
   - Chemins assets via PUBLIC_BASE, aucun override de helpers
========================================================= */
(function () {
  'use strict';
  if (window.__ptP6Booted) return; window.__ptP6Booted = 1;

  /* --------------------------- Shared --------------------------- */
  var W = window, D = document, PT = (W.PT = W.PT || {});
  var DEV = !!PT.__dev;

  function log() { if (DEV && W.console && console.debug) try { console.debug.apply(console, arguments); } catch (_){ } }
  function noop() {}

  // Fallback helpers (sans override si déjà fournis)
  var $ = PT.$ || function (s, r) { return (r || D).querySelector(s); };
  var $$ = PT.$$ || function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };

  // Passive-safe addEventListener
  var _supportsPassive = false;
  try {
    var _opt = Object.defineProperty({}, 'passive', { get: function () { _supportsPassive = true; } });
    W.addEventListener('pt_passive_test', noop, _opt);
    W.removeEventListener('pt_passive_test', noop, _opt);
  } catch (_){}
  function on(t, ev, fn, passive) {
    try { t.addEventListener(ev, fn, (_supportsPassive && passive) ? { passive: true } : false); }
    catch (_){ try { t.addEventListener(ev, fn, false); } catch (__){ } }
  }

  // Prefers-reduced-motion
  function prefersReduced() {
    try { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_){ return false; }
  }

  // Safe asset URL
  function asset(rel) {
    try { return new URL(rel, W.PUBLIC_BASE || (W.location && W.location.origin) || '/').href; } catch (_){ return rel; }
  }

  // Announce (polite)
  var announce = (typeof W.announce === 'function') ? W.announce : noop;

  /* =========================================================
     6A — HERO A/B (idempotent + API PT.abHero)
  ========================================================== */
  (function heroAB() {
    if (W.__ptHeroWired6A) return; W.__ptHeroWired6A = 1;

    var LS_KEY = 'pt_ab_hero_v1';
    var variant = 'none';
    var hero = $('#hero') || $('.hero') || $('.hero-full');
    if (!hero) { exposeAPI(); return; }

    // Bucket déterministe
    try {
      variant = localStorage.getItem(LS_KEY) || '';
      if (!variant) {
        var seed = '';
        try { seed = (localStorage.getItem(W.USER_KEY || 'pt_user_v1') || '') + '|' + (navigator.userAgent || '') + '|' + (Intl.DateTimeFormat().resolvedOptions().timeZone || ''); } catch (_){}
        var h = 0, i, ch;
        for (i = 0; i < seed.length; i++) { ch = seed.charCodeAt(i); h = ((h << 5) - h) + ch; h |= 0; }
        variant = (Math.abs(h) % 100) < 50 ? 'A' : 'B';
        try { localStorage.setItem(LS_KEY, variant); } catch (_){}
      }
    } catch (_){ variant = 'A'; }

    // Visuels : passer via PT.setSafeImg si dispo
    (function secureHeroMedia(){
      var img = $('#heroLogo') || $('.hero-logo', hero);
      if (img && typeof PT.setSafeImg === 'function') {
        var src = img.getAttribute('src') || img.getAttribute('data-src') || img.currentSrc || img.src || '';
        var alt = img.getAttribute('alt') || 'Pirates Tools';
        PT.setSafeImg(img, src, alt);
      }
    })();

    // Variante B neutralise le polish P5
    if (variant === 'B') { W.__ptHeroAB = 1; }

    // CSS minimal pour la séquence B (ne fait rien si le thème override)
    (function inject6ACSS() {
      if (D.getElementById('pt-6a-style')) return;
      var s = D.createElement('style'); s.id = 'pt-6a-style';
      s.textContent =
        /* Séquence B par classes – aucune couleur, transitions neutres */
        '#hero.ab-start{opacity:0;transform:translateY(8px);will-change:transform,opacity}' +
        '#hero.ab-in{opacity:1;transform:translateY(0);transition:transform .28s ease-out,opacity .28s ease-out}' +
        '#hero .ab-img{opacity:0;transform:scale(.985)}#hero .ab-img.ab-in{opacity:1;transform:scale(1);transition:transform .26s ease-out,opacity .26s ease-out}' +
        '#hero .ab-title{opacity:0;transform:translateY(8px)}#hero .ab-title.ab-in{opacity:1;transform:none;transition:transform .28s ease-out,opacity .28s ease-out}' +
        '#hero .ab-sub{opacity:0}#hero .ab-sub.ab-in{opacity:1;transition:opacity .22s ease-out .06s}' +
        '#hero .ab-cta{opacity:0;transform:scale(.98)}#hero .ab-cta.ab-in{opacity:1;transform:scale(1);transition:transform .22s ease-out .08s,opacity .22s ease-out .08s}' +
        /* Overlay de lecture si contraste faible (activable par classe) */
        '#hero.hero--overlay::after{content:"";position:absolute;left:0;right:0;top:0;bottom:0;pointer-events:none;}' +
        /* Fallback fade bas (si pas déjà présent via P5) */ 
        '#hero .hero-fade{position:absolute;left:0;right:0;bottom:0;height:38vh;pointer-events:none;}';
      D.head.appendChild(s);
    })();

    // Wiring
    if (variant === 'B') wireVariantB(); else wireVariantA();
    exposeAPI();

    /* ---------- Implémentations A vs B ---------- */

    // A : baseline — laisse P5 agir ; on pose juste une classe ready quand l’image est chargée
    function wireVariantA() {
      log('[P6A] Variante A');
      var img = $('#heroLogo', hero) || $('.hero-logo', hero);
      if (!window.FORCE_ANIM && prefersReduced()) return;
      if (img) {
        var set = function () { try { img.classList.add('is-ready'); } catch (_){ } };
        if (img.complete) setTimeout(set, 0); else on(img, 'load', set, true);
      }
      // Overlay fade si absent (non intrusif)
      if (!$('.hero-fade', hero)) {
        var f = D.createElement('div'); f.className = 'hero-fade'; f.setAttribute('aria-hidden', 'true'); hero.appendChild(f);
      }
    }

    // B : séquence par classes ; CTA scroll doux si non reduced
    function wireVariantB() {
      log('[P6A] Variante B (AB classes + neutralise P5 polish)');
      if (prefersReduced()) { hero.classList.add('ab-in'); return; }

      // Ciblage éléments
      var img = $('#heroLogo', hero) || $('.hero-logo', hero);
      var title = $('.hero__title', hero) || $('h1', hero);
      var sub = $('.hero__subtitle', hero) || $('p', hero);
      var cta = $('[data-cta]', hero) || $('.btn.primary', hero) || $('a[href^="#/catalogue"]', hero) || $('a[href^="#/"]', hero);

      if (!$('.hero-fade', hero)) { var f = D.createElement('div'); f.className = 'hero-fade'; f.setAttribute('aria-hidden', 'true'); hero.appendChild(f); }

      if (img) img.classList.add('ab-img');
      if (title) title.classList.add('ab-title');
      if (sub) sub.classList.add('ab-sub');
      if (cta) cta.classList.add('ab-cta');

      hero.classList.add('ab-start');
      // Séquence
      setTimeout(function () { hero.classList.add('ab-in'); if (img) img.classList.add('ab-in'); }, 80);
      setTimeout(function () { if (title) title.classList.add('ab-in'); }, 220);
      setTimeout(function () { if (sub) sub.classList.add('ab-in'); }, 320);
      setTimeout(function () { if (cta) cta.classList.add('ab-in'); }, 420);

      // CTA → #brandGrid (smooth si autorisé)
      if (cta && !cta.__pt6A) {
        cta.__pt6A = 1;
        cta.addEventListener('click', function (e) {
          try {
            var target = D.getElementById('brandGrid'); if (!target) return;
            e.preventDefault();
            if (!prefersReduced() && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            else location.hash = '#/';
          } catch (_){ }
        }, false);
      }
    }

    function exposeAPI() {
      PT.abHero = PT.abHero || {};
      PT.abHero.getVariant = function () { return variant; };
    }
  })();

  /* =========================================================
     6B — MENU A11y avancé (open/close + focus trap + actif)
     Expose PT.menu { open, close, setActive, wire }
  ========================================================== */
  (function menuA11y() {
    if (W.__ptP6BNav === 1) return; W.__ptP6BNav = 1; // Informe P5 de ne pas écrire aria-current
    log('[P6B] boot');

    var drawer = $('#drawer') || $('#sideMenu') || $('#side-menu') || $('.drawer') || $('[data-drawer]');
    var topnav = $('#topbar') || $('.topbar') || $('nav[role="navigation"]') || $('nav');
    var toggle = $('#menuBtn') || $('#menu-toggle') || $('.hamburger') || $('.menu-toggle') || $('[data-menu-toggle]');
    var backdrop = $('#drawerBackdrop') || $('#menuBackdrop') || $('.drawer__backdrop') || $('.backdrop') || $('#menu-overlay');
    var body = D.body;

    // Focusables selector
    var FSEL = ['a[href]','button:not([disabled])','input:not([disabled])','select:not([disabled])','textarea:not([disabled])','[tabindex]:not([tabindex="-1"])'].join(',');

    function isOpen() {
      return (drawer && drawer.classList && (drawer.classList.contains('open') || drawer.classList.contains('is-open') || drawer.classList.contains('active')))
          || (body && body.classList && body.classList.contains('menu-open'));
    }

    function setAriaOpen(open) {
      try {
        if (toggle) {
          toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
          toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
          if (drawer && drawer.id) toggle.setAttribute('aria-controls', drawer.id);
        }
        if (drawer) {
          if (!drawer.getAttribute('role')) drawer.setAttribute('role', 'dialog');
          drawer.setAttribute('aria-modal', 'true');
          drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
        }
        if (backdrop) backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
      } catch (_){ }
    }

    function lockScroll(on) {
      try {
        if (!body) return;
        if (on) body.classList.add('menu-open'); else body.classList.remove('menu-open');
      } catch (_){ }
    }

    function open() {
      if (!drawer) return;
      drawer.classList.add('open');
      lockScroll(true);
      setAriaOpen(true);
      // Focus premier item
      try {
        var first = (drawer.querySelector(FSEL) || toggle);
        if (first) { first.focus && first.focus(); }
      } catch (_){ }
      announce('Menu ouvert');
      log('[P6B] menu open');
      wireTrap(); // s’assure que le trap est câblé
    }

    function close() {
      if (!drawer) return;
      drawer.classList.remove('open'); drawer.classList.remove('is-open'); drawer.classList.remove('active');
      lockScroll(false);
      setAriaOpen(false);
      // Retour focus sur le toggle
      try { if (toggle && toggle.focus) toggle.focus(); } catch (_){ }
      announce('Menu fermé');
      log('[P6B] menu close');
    }

    // Focus trap (idempotent)
    function wireTrap() {
      if (!drawer || drawer.__ptTrap) return;
      drawer.__ptTrap = 1;
      on(drawer, 'keydown', function (e) {
        if (!isOpen()) return;
        var k = e.key || e.keyCode;
        if (k === 'Escape' || k === 27) { e.preventDefault(); close(); return; }
        if (k !== 'Tab' && k !== 9) return;
        try {
          var focusables = $$(FSEL, drawer);
          if (!focusables.length) return;
          var first = focusables[0], last = focusables[focusables.length - 1];
          var active = D.activeElement;
          var shift = !!(e.shiftKey);
          if (shift && active === first) { e.preventDefault(); last.focus(); }
          else if (!shift && active === last) { e.preventDefault(); first.focus(); }
        } catch (_){ }
      }, false);
    }

    // Toggle listeners
    if (toggle && !toggle.__pt6B) {
      toggle.__pt6B = 1;
      toggle.setAttribute('role', 'button');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.addEventListener('click', function (e) { e.preventDefault(); isOpen() ? close() : open(); }, false);
      toggle.addEventListener('pointerup', function (e) { if (e && e.pointerType === 'touch') { e.preventDefault(); isOpen() ? close() : open(); } }, false);
    }

    // Backdrop click → ferme
    if (backdrop && !backdrop.__pt6B) { backdrop.__pt6B = 1; backdrop.addEventListener('click', function () { close(); }, false); }

    // Hashchange (navigation) → ferme
    on(W, 'hashchange', function () { setTimeout(close, 0); markActive(); toggleFabAccount(); }, false);

    // Liens du drawer : ferme après click
    if (drawer && !drawer.__pt6BLinks) {
      drawer.__pt6BLinks = 1;
      drawer.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a,[role="menuitem"],[data-route]') : null;
        if (a) setTimeout(close, 30);
      }, false);
    }

    // Roving focus horizontal (topbar desktop uniquement)
    (function wireRovingTopbar() {
      if (!topnav || topnav.__ptRoving) return;
      topnav.__ptRoving = 1;
      topnav.addEventListener('keydown', function (e) {
        var k = e.key || e.keyCode;
        if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'Home' && k !== 'End' && k !== 37 && k !== 39) return;
        var links = $$(FSEL, topnav).filter(function (el) { return el.tagName === 'A' || el.getAttribute('role') === 'menuitem' || el.getAttribute('tabindex') !== null; });
        if (!links.length) return;
        var idx = Math.max(0, links.indexOf(D.activeElement));
        if (k === 'ArrowRight' || k === 39) idx = (idx + 1) % links.length;
        else if (k === 'ArrowLeft' || k === 37) idx = (idx - 1 + links.length) % links.length;
        else if (k === 'Home') idx = 0; else if (k === 'End') idx = links.length - 1;
        try { links[idx].focus(); } catch (_){ }
      }, false);
    })();

    // État actif + aria-current (source d’autorité)
    function mapRouteToKey(href) {
      var h = href || (W.location && W.location.hash) || '#/';
      if (!h || h === '#') h = '#/';
      if (h.indexOf('#/produit/') === 0) return '#/catalogue';
      if (h.indexOf('#/home') === 0 || h === '#/') return '#/';
      if (h.indexOf('#/catalogue') === 0) return '#/catalogue';
      if (h.indexOf('#/devis') === 0) return '#/devis';
      if (h.indexOf('#/compte') === 0) return '#/compte';
      return ''; // rien d’actif
    }
    function markActive() {
      var cur = mapRouteToKey();
      var scopes = [drawer, topnav];
      for (var s = 0; s < scopes.length; s++) {
        var host = scopes[s]; if (!host) continue;
        var links = $$('a[href^="#/"]', host);
        for (var i = 0; i < links.length; i++) {
          var href = links[i].getAttribute('href') || '';
          var match = (mapRouteToKey(href) === cur && cur);
          if (match) { links[i].setAttribute('aria-current', 'page'); links[i].classList.add('is-active'); }
          else { links[i].removeAttribute('aria-current'); links[i].classList.remove('is-active'); }
        }
      }
      if (cur) announce('Lien actif mis à jour');
      log('[P6B] active →', cur);
    }

    // FAB Compte visible partout sauf #/compte
    function toggleFabAccount() {
      var fab = $('#fabAccount'); if (!fab) return;
      var cur = mapRouteToKey();
      fab.style.display = (cur === '#/compte') ? 'none' : '';
    }

    // Boot initial
    markActive(); toggleFabAccount();

    // Exposer API
    PT.menu = PT.menu || {};
    PT.menu.open = open;
    PT.menu.close = close;
    PT.menu.setActive = function (route) {
      try { W.location.hash = route; } catch (_){ }
      markActive();
    };
    PT.menu.wire = function () { // à appeler si DOM nav remplacé
      drawer = $('#drawer') || $('#sideMenu') || $('#side-menu') || $('.drawer') || $('[data-drawer]');
      topnav = $('#topbar') || $('.topbar') || $('nav[role="navigation"]') || $('nav');
      toggleFabAccount(); markActive(); wireTrap();
    };
  })();

  /* =========================================================
     FIN — petits utilitaires d’ergonomie non intrusifs
  ========================================================== */
  (function smoothBehaviorFallback() {
    try {
      var html = D.documentElement;
      if (html && !html.style.scrollBehavior) html.style.scrollBehavior = 'smooth';
    } catch (_){ }
  })();

})();
