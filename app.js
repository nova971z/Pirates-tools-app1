/* =========================================================
   Pirates Tools — app.js (FULL, stable, clean) — PRE-BULLES
   - Android/iOS OK (sans ?. ni ??)
   - Pages : Accueil (Hero), Catalogue, Produit, Devis, Compte, Infos
   - Panier persistant (localStorage) + dock (badge)
   - Paiements : PayPal / Carte & Apple Pay / Crypto (+ fallback WhatsApp)
   - SEO dynamique PDP + JSON-LD Product
   - Smooth scroll + animations scroll
   - A2HS iOS/Android, SW update banner
========================================================= */

'use strict';

/* ---------- Helpers ---------- */
var $  = function(sel, root){ return (root || document).querySelector(sel); };
var $$ = function(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

function clamp(v, min, max){
  v = typeof v === 'number' ? v : parseFloat(v);
  if (!isFinite(v)) v = 0;
  return Math.max(min, Math.min(max, v));
}
function fallback(v, alt){ return (v===undefined || v===null) ? (alt||'') : v; }
function firstDefined(){ for (var i=0;i<arguments.length;i++){ if (arguments[i]!==undefined && arguments[i]!==null) return arguments[i]; } return undefined; }
function debounce(fn, wait){ if (wait===void 0) wait=140; var t=0; return function(){ var a=arguments; clearTimeout(t); t=setTimeout(function(){ fn.apply(null,a); }, wait); }; }

/* Polyfills min */
(function(){
  if (!Element.prototype.matches){
    Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector || function(s){
      var m = (this.document || this.ownerDocument).querySelectorAll(s), i = m.length;
      while (--i >= 0 && m.item(i) !== this) {}
      return i > -1;
    };
  }
  if (!Element.prototype.closest){
    Element.prototype.closest = function(s){
      var el = this;
      while (el && el.nodeType === 1){ if (el.matches && el.matches(s)) return el; el = el.parentElement || el.parentNode; }
      return null;
    };
  }
})();

/* Delegation */
function delegate(root, selector, type, handler){
  (root || document).addEventListener(type, function(e){
    var el = e.target && e.target.closest ? e.target.closest(selector) : null;
    if (el && (root ? (root.contains ? root.contains(el) : true) : true)){
      handler.call(el, e, el);
    }
  }, false);
}

/* ---------- Images sûres ---------- */
var IMG_FALLBACK = './images/pirates-tools-logo.png?v=7';
function sanitizeImgUrl(u){
  try{ var url = new URL(u, location.href); if (url.protocol==='http:') url.protocol='https:'; return url.toString(); }
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

/* ---------- SEO dyn ---------- */
var META_DESC_EL  = document.querySelector('meta[name="description"]');
var DEFAULT_TITLE = document.title || 'Pirates Tools • Outillage pro (PWA)';
var DEFAULT_DESC  = (META_DESC_EL ? META_DESC_EL.getAttribute('content') : null) ||
                    'Pirates Tools — Visseuses à chocs DeWALT, dispo Antilles. PWA rapide, contact immédiat.';
function setPageMeta(title, description){ try{ if (title) document.title = title; if (META_DESC_EL && description) META_DESC_EL.setAttribute('content', description); }catch(_){ } }
function resetPageMeta(){ try{ document.title=DEFAULT_TITLE; if (META_DESC_EL) META_DESC_EL.setAttribute('content', DEFAULT_DESC); }catch(_){ } }

/* ---------- UI basics : toasts + live + dock bump ---------- */
(function ensureBasics(){
  if (!document.getElementById('toasts')){
    var t = document.createElement('div'); t.id='toasts'; document.body.appendChild(t);
  }
  if (!document.getElementById('sr-live')){
    var l = document.createElement('div'); l.id='sr-live'; l.setAttribute('aria-live','polite'); l.style.position='absolute'; l.style.left='-9999px'; document.body.appendChild(l);
  }
  if (!document.getElementById('pt-ux-css')){
    var style = document.createElement('style'); style.id='pt-ux-css';
    style.textContent = ''
      + '@keyframes pt-bump{0%{transform:scale(1)}35%{transform:scale(1.15)}100%{transform:scale(1)}}'
      + '#dockCount.bump{animation:pt-bump .42s ease}'
      + '#toasts{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:130;display:grid;gap:.5rem}'
      + '.toast{display:grid;grid-template-columns:auto 1fr auto;gap:.6rem;padding:.6rem .75rem;border-radius:12px;background:rgba(10,15,20,.92);border:1px solid #22303b;color:#e6edf5;box-shadow:0 12px 24px rgba(0,0,0,.35);font:600 14px/1.25 system-ui,-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,Arial,sans-serif}'
      + '.toast__close{background:transparent;border:0;color:#9fb4c5;cursor:pointer;font-size:16px}'
      + '@keyframes toast-out{to{opacity:0;transform:translateY(6px)}}';
    document.head.appendChild(style);
  }
})();

var live = $('#sr-live');
var toastsC = $('#toasts');
var dock = $('#dock');
var dockBadge = $('#dockCount');

function announce(msg){ if (!live) return; live.textContent=''; setTimeout(function(){ live.textContent=msg; }, 20); }
function toast(msg, kind){ if (kind===void 0) kind='success'; if (!toastsC) return;
  var el = document.createElement('div'); el.className='toast toast--'+kind;
  el.innerHTML = '<div>'+ (kind==='success'?'✅':'ℹ️') +'</div><div>'+msg+'</div><button class="toast__close" aria-label="Fermer">✖</button>';
  var close=function(){ el.style.animation='toast-out .18s ease-in both'; setTimeout(function(){ el.remove(); },180); };
  var b = el.querySelector('.toast__close'); if (b) b.addEventListener('click', close);
  toastsC.appendChild(el); setTimeout(close, 3200);
}
function bumpBadge(){ if (!dockBadge) return; dockBadge.classList.remove('bump'); void dockBadge.offsetWidth; dockBadge.classList.add('bump'); }

/* ---------- Config globale ---------- */
var PHONE_HUMAN = '07 74 23 01 95';
var PHONE_E164  = '+33774230195';

var MODELS = [];
var CART   = [];
var STORE_KEY = 'pt_cart_v1';
var USER_KEY  = 'pt_user_v1';

/* Paiement : configuration */
var CURRENCY = 'EUR';
var PAYPAL_BUSINESS = 'ton-email-paypal-pro@exemple.com';                // ← à RENSEIGNER
var STRIPE_PAY_LINK = 'https://buy.stripe.com/XXXXXXXX?amount={AMOUNT}'; // ← à RENSEIGNER
var CRYPTO_PAY_LINK = 'https://commerce.coinbase.com/checkout/XXXXX?amount={AMOUNT}&currency=EUR'; // ← à RENSEIGNER

/* ---------- Références DOM ---------- */
var hero      = document.getElementById('hero');
var heroLogo  = document.getElementById('heroLogo');

var callBtn  = document.getElementById('callBtn');
var waBtn    = document.getElementById('waBtn');
var listEl   = document.getElementById('list');
var searchEl = document.getElementById('q');
var tagEl    = document.getElementById('tag');

var dockQuoteBtn  = document.getElementById('dockQuoteBtn');
var dockCartBtn   = document.getElementById('dockCartBtn');

/* ---------- Logos fallback ---------- */
(function(){
  var FALLBACK = IMG_FALLBACK;
  function ensureFallback(img){
    if (!img) return;
    img.addEventListener('error', function(){ if (!img.src || img.src.indexOf('pirates-tools-logo.png')===-1) img.src=FALLBACK; });
    if (img.complete && img.naturalWidth===0) img.src = FALLBACK;
  }
  ensureFallback(document.getElementById('heroLogo'));
  $$('.topbar-logo').forEach(ensureFallback);
})();

/* ---------- Anti-zoom Android ---------- */
(function(){
  var isAndroid = /android/i.test(navigator.userAgent);
  if (!isAndroid) return;
  var meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  var base = 'width=device-width, initial-scale=1, viewport-fit=cover';
  meta.setAttribute('content', base + ', maximum-scale=1, user-scalable=no');
})();

/* ---------- Dock shell ---------- */
(function(){
  var root = document.getElementById('dock'); if (!root) return;
  root.classList.remove('hidden');
  if (root.firstElementChild && root.firstElementChild.classList && root.firstElementChild.classList.contains('dock__shell')) return;
  var shell = document.createElement('div'); shell.className='dock__shell';
  while (root.firstChild) shell.appendChild(root.firstChild);
  root.appendChild(shell);
})();

/* ---------- CTA tel/wa ---------- */
(function(){
  if (callBtn){ callBtn.setAttribute('href', 'tel:'+PHONE_E164); callBtn.innerHTML='📞 <strong>'+PHONE_HUMAN+'</strong>'; }
  if (waBtn){ waBtn.setAttribute('href', 'https://wa.me/'+PHONE_E164.replace('+','')); }
})();

/* ---------- Bannière net ---------- */
(function(){
  var bar = document.createElement('div'); bar.id='netBanner'; bar.setAttribute('aria-live','polite');
  var style = {position:'fixed',left:'50%',transform:'translateX(-50%)',bottom:'calc(72px + env(safe-area-inset-bottom,0px))',
    background:'rgba(10,15,20,.88)',border:'1px solid #22303b',padding:'.5rem .8rem',borderRadius:'10px',zIndex:'120',
    boxShadow:'0 10px 24px rgba(0,0,0,.35)',font:'600 14px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,Arial,sans-serif',color:'#e6edf5',display:'none'};
  for (var k in style){ if (Object.prototype.hasOwnProperty.call(style,k)) bar.style[k]=style[k]; }
  document.body.appendChild(bar);
  var hideT=0, show=function(txt, ok){ bar.textContent=txt; bar.style.display='block'; bar.style.borderColor= ok?'#00e1b4':'#ff6b6b'; clearTimeout(hideT); hideT=setTimeout(function(){ bar.style.display='none'; }, 2400); };
  window.addEventListener('offline', function(){ show('Hors ligne — contenu en cache', false); });
  window.addEventListener('online',  function(){ show('De nouveau en ligne', true); });
})();

/* ---------- A2HS ---------- */
(function(){
  if (window.__pt_a2hs_done) return; window.__pt_a2hs_done = true;
  var ua = navigator.userAgent || '';
  var isiOSLike = /iphone|ipad|ipod/i.test(ua) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  var isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone===true;

  if (!document.getElementById('pt-a2hs-css')){
    var s = document.createElement('style'); s.id='pt-a2hs-css';
    s.textContent = '#a2hsTip{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(96px + env(safe-area-inset-bottom,0px));z-index:125;display:flex;gap:.6rem;align-items:center;background:rgba(10,15,20,.92);border:1px solid #22303b;color:#e6edf5;padding:.55rem .7rem;border-radius:10px;box-shadow:0 10px 24px rgba(0,0,0,.35);font:600 14px/1.25 system-ui,-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,Arial,sans-serif}.a2hs-tip__icon{display:inline-block;padding:.12rem .4rem;border-radius:6px;border:1px solid #22303b;background:rgba(255,255,255,.06)}#a2hsTip.out{animation:pt-a2hs-out .18s ease-in both}@keyframes pt-a2hs-out{to{opacity:0;transform:translateX(-50%) translateY(4px)}}';
    document.head.appendChild(s);
  }
  function showTip(){
    if (document.getElementById('a2hsTip') || (localStorage.getItem('pt_a2hs_tip_dismiss_v1')==='1')) return;
    var tip = document.createElement('div'); tip.id='a2hsTip'; tip.setAttribute('role','dialog'); tip.setAttribute('aria-live','polite');
    tip.innerHTML = '<div>Pour installer l’app : touchez <span class="a2hs-tip__icon">▵</span> puis <strong>« Sur l’écran d’accueil »</strong>.</div><button class="a2hs-tip__close" aria-label="Fermer">✖</button>';
    tip.querySelector('.a2hs-tip__close').addEventListener('click', function(){ tip.classList.add('out'); setTimeout(function(){ tip.remove(); },180); try{ localStorage.setItem('pt_a2hs_tip_dismiss_v1','1'); }catch(_){ } });
    document.body.appendChild(tip);
  }
  var isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
  if (isiOSLike && isSafari && !isStandalone) setTimeout(showTip, 1400);

  var deferredPrompt=null, installBtn=document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault(); deferredPrompt=e;
    if (installBtn){ installBtn.hidden=false;
      if (!installBtn.getAttribute('data-wired')){
        installBtn.setAttribute('data-wired','1');
        installBtn.addEventListener('click', function(){
          (async function(){
            try{ installBtn.disabled=true; await deferredPrompt.prompt(); var choice=await deferredPrompt.userChoice;
              toast(choice&&choice.outcome==='accepted'?'Installation en cours':'Installation annulée', (choice&&choice.outcome==='accepted')?'success':'info'); }catch(_){}
            installBtn.hidden=true; installBtn.disabled=false; deferredPrompt=null;
          })();
        });
      }
    }
  });
  try{
    if (installBtn && isStandalone) installBtn.hidden=true;
    if (window.matchMedia){
      var dm=window.matchMedia('(display-mode: standalone)');
      if (dm && typeof dm.addEventListener==='function'){
        dm.addEventListener('change', function(e){ if (installBtn && e.matches) installBtn.hidden=true; });
      }
    }
  }catch(_){}
})();

/* ---------- Logo → Accueil ---------- */
(function(){
  var logoLink = document.getElementById('homeLink') || document.querySelector('.topbar-logo-link');
  if (!logoLink) return;
  var goHome=function(e){ e.preventDefault(); location.hash=''; window.scrollTo({top:0,behavior:'smooth'}); };
  logoLink.addEventListener('click', goHome, false);
  logoLink.addEventListener('pointerup', function(e){ if (e.pointerType==='touch') goHome(e); }, false);
})();

/* ---------- HERO anim ---------- */
(function(){
  if (!hero || !heroLogo) return;
  var mq  = window.matchMedia('(max-width: 768px)');
  var mqr = window.matchMedia('(prefers-reduced-motion: reduce)');
  var getVH = function(){ return (window.visualViewport ? window.visualViewport.height : window.innerHeight) || 1; };
  var getScrollY = function(){
    return (typeof window.pageYOffset==='number'?window.pageYOffset:0) ||
      (document.scrollingElement && document.scrollingElement.scrollTop) ||
      document.documentElement.scrollTop || document.body.scrollTop || 0;
  };
  var vh=getVH(), prevY=-1, rafId=0;
  function render(y){
    var fin = vh * (mq.matches?0.70:0.85);
    var raw = Math.max(0, Math.min(1, y / (fin || 1)));
    var p   = 1 - Math.pow(1-raw, 3);
    var maxScale = mq.matches ? 3.1 : 2.0;
    var scale = 1 + (maxScale-1)*p;
    var tyPxBase = (mq.matches?12:7) * (vh/100);
    var tyPx = tyPxBase*p;
    var opacity = Math.max(0, Math.min(1, 1 - (mq.matches?1.75:1.25)*raw));
    var t='translate3d(0,'+tyPx.toFixed(2)+'px,0) scale('+scale.toFixed(3)+')';
    heroLogo.style.transform=t; heroLogo.style.webkitTransform=t; heroLogo.style.opacity=opacity.toFixed(3);
    var gap=(1-raw)*(mq.matches?18:22); document.documentElement.style.setProperty('--listGap', gap.toFixed(2)+'vh');
    var done = raw>0.985; document.body.classList.toggle('after-hero', done); hero.classList.toggle('hero-out', done);
    if (dock){ if (raw>0.97) dock.classList.add('dock--visible'); else dock.classList.remove('dock--visible'); }
  }
  function tick(){ var y=getScrollY(); if (y!==prevY){ render(y); prevY=y; } rafId=requestAnimationFrame(tick); }
  if (mqr.matches){
    var t0='translate3d(0,0,0) scale(1)'; heroLogo.style.transform=t0; heroLogo.style.webkitTransform=t0; heroLogo.style.opacity='1';
    document.documentElement.style.setProperty('--listGap','18vh'); document.body.classList.remove('after-hero'); hero.classList.remove('hero-out'); if (dock) dock.classList.add('dock--visible'); return;
  }
  rafId=requestAnimationFrame(tick);
  var recalc=function(){ vh=getVH(); render(((typeof window.pageYOffset==='number')?window.pageYOffset:0)); };
  window.addEventListener('resize', recalc, true);
  if (window.visualViewport && typeof window.visualViewport.addEventListener==='function'){ window.visualViewport.addEventListener('resize', recalc, true); }
  window.addEventListener('orientationchange', recalc, true);
  document.addEventListener('visibilitychange', function(){ if (!document.hidden) recalc(); }, true);
  window.addEventListener('pageshow', function(e){ if (e.persisted) recalc(); }, true);
  window.addEventListener('pagehide', function(){ cancelAnimationFrame(rafId); }, true);
  render(((typeof window.pageYOffset==='number')?window.pageYOffset:0));
})();

/* ---------- Smooth scroll ---------- */
(function(){
  function smoothScrollTo(selector){
    var el = selector ? document.querySelector(selector) : null; if (!el) return;
    try{ el.scrollIntoView({behavior:'smooth', block:'start'}); }catch(_){ el.scrollIntoView(true); }
  }
  $$('[data-scroll]').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      var targetSel = a.getAttribute('data-scroll') || a.getAttribute('href') || '';
      var targetIsList = (targetSel+'').toLowerCase()==='#list';
      var h = (location.hash||'').toLowerCase();
      if ((!h || h==='#' || h==='#/' || h==='#/home') && targetIsList){
        var fired=false, once=function(){ if (fired) return; fired=true; window.removeEventListener('hashchange', once); requestAnimationFrame(function(){ smoothScrollTo('#list'); }); };
        window.addEventListener('hashchange', once, false); location.hash='#/catalogue'; setTimeout(function(){ if (!fired) once(); },150); return;
      }
      var inView = (/^#\//i).test(h);
      if (inView){
        var done=false, once2=function(){ if (done) return; done=true; window.removeEventListener('hashchange', once2); requestAnimationFrame(function(){ smoothScrollTo(targetSel); }); };
        window.addEventListener('hashchange', once2, false); location.hash = targetIsList ? '#/catalogue' : ''; setTimeout(function(){ if (!done) once2(); },150);
      }else smoothScrollTo(targetSel);
    }, false);
  });
})();

/* ---------- Anim exit list ---------- */
var ScrollExit = (function () {
  function injectExitCSS(){
    if (document.getElementById('exit-anim-css')) return;
    var style = document.createElement('style'); style.id='exit-anim-css';
    style.textContent='@keyframes exitLeft{to{transform:translateX(-60px);opacity:0;filter:blur(2px)}}@keyframes exitRight{to{transform:translateX(60px);opacity:0;filter:blur(2px)}}.tool--exit-left{animation:exitLeft 420ms cubic-bezier(.22,.61,.36,1) forwards;will-change:transform,opacity}.tool--exit-right{animation:exitRight 420ms cubic-bezier(.22,.61,.36,1) forwards;will-change:transform,opacity}@media(prefers-reduced-motion:reduce){.tool--exit-left,.tool--exit-right{animation:none;opacity:0}}';
    document.head.appendChild(style);
  }
  injectExitCSS();
  if (typeof window.IntersectionObserver!=='function'){ return { observeWithin:function(){} }; }
  var flip=false;
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      var el = entry.target;
      if (entry.isIntersecting){ el.classList.remove('tool--exit-left','tool--exit-right'); el.removeAttribute('data-exited'); return; }
      if (el.getAttribute('data-exited')==='1') return;
      if (entry.boundingClientRect.top>=0) return;
      var cls = flip ? 'tool--exit-right' : 'tool--exit-left'; flip=!flip; void el.offsetWidth; el.classList.add(cls); el.setAttribute('data-exited','1');
    });
  }, { threshold:0.01, rootMargin:'0px 0px -10% 0px' });
  function observeWithin(root){ (root||document).querySelectorAll('[data-tool]').forEach(function(el){ io.observe(el); }); }
  return { observeWithin: observeWithin };
})();

/* ---------- Panier ---------- */
function updateDock(){
  var n = CART.length;
  if (dockBadge){ dockBadge.textContent=n; dockBadge.style.display = n ? '' : 'none'; }
  if (dock){ var cartBtn = document.getElementById('dockCartBtn') || dock.querySelector('.dock__btn--cart'); if (cartBtn){ cartBtn.style.animationPlayState = n ? 'running':'paused'; } }
}
function saveCart(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(CART)); }catch(_){}
  updateDock();
  var h=(location.hash||'').toLowerCase();
  if (h.indexOf('#/devis')===0 && typeof renderCartView==='function'){ try{ renderCartView(); }catch(_){} }
  try{ window.dispatchEvent(new CustomEvent('pt:cartChanged')); }catch(_){}
}
function loadCart(){
  try{ var raw=localStorage.getItem(STORE_KEY); CART = raw?JSON.parse(raw):[]; }catch(_){ CART=[]; }
  updateDock();
}
loadCart();
function keyOf(p){ var v = firstDefined(p && p.id, p && p.sku, p && p.title, ''); return (v==null ? '' : String(v)); }
function groupCart(){
  var map={}, out=[], i, p, k;
  for (i=0;i<CART.length;i++){ p=CART[i]; k=keyOf(p); if (!map[k]) map[k]={ item:p, qty:0 }; map[k].qty+=1; }
  for (k in map) if (Object.prototype.hasOwnProperty.call(map,k)) out.push(map[k]);
  return out;
}
function notifyCartAdded(title){ toast('« '+(title||'Article')+' » ajouté au devis'); announce((title||'Article')+' ajouté au devis'); bumpBadge(); }

/* ---------- WhatsApp Texte devis ---------- */
function cartToWhatsAppText(){
  var grouped = groupCart(); if (!grouped.length) return '';
  var lines = grouped.map(function(g){
    var item=g.item, qty=g.qty, sku=item.sku||item.id||'', title=item.title || ((item.brand||'')+' '+(item.sku||'')).trim();
    return '• '+sku+' – '+title + (qty>1 ? (' ×'+qty) : '');
  });
  var contact=''; try{ var u=loadUser(); var arr=[]; if (u && u.name) arr.push('Nom: '+u.name); if (u && u.email) arr.push('Email: '+u.email); contact = arr.length ? '\n\nMes coordonnées:\n'+arr.join('\n') : ''; }catch(_){}
  var link = location.origin + location.pathname + '#/devis';
  return 'Bonjour, je souhaite un devis pour:\n' + lines.join('\n') + '\n\nLien: ' + link + contact + '\n\nMerci.';
}

/* ---------- JSON-LD Product ---------- */
function absoluteUrl(u){ try{ return new URL(u, location.href).href; }catch(_){ return u; } }
function schemaAvailability(p){
  var s=(p.stock_status||'').toLowerCase();
  if (s==='in_stock') return 'http://schema.org/InStock';
  if (s==='low_stock') return 'http://schema.org/LimitedAvailability';
  if (s==='out_of_stock') return 'http://schema.org/OutOfStock';
  return (p.stock_qty>0) ? 'http://schema.org/InStock' : 'http://schema.org/OutOfStock';
}
function buildProductJsonLD(p){
  var images=[]; if (p.img) images.push(absoluteUrl(p.img)); if (Array.isArray(p.gallery)) p.gallery.forEach(function(g){ images.push(absoluteUrl(g)); });
  var price = (typeof p.price==='number') ? p.price : (typeof p.price_cents==='number' ? p.price_cents/100 : undefined);
  var url = location.origin + location.pathname + '#/produit/' + encodeURIComponent(p.id || p.sku || (p.title||''));
  var data = {"@context":"https://schema.org","@type":"Product","name":p.title || ((p.brand||'')+' '+(p.sku||'')),
    "sku":p.sku||p.id||undefined,"mpn":p.sku||undefined,"brand":p.brand?{"@type":"Brand","name":p.brand}:undefined,
    "category":p.category||undefined,"description":(p.seo && p.seo.description) || p.desc || p.description || undefined,
    "image":images.length?images:undefined,"url":url,
    "offers":{"@type":"Offer","priceCurrency":(p.currency||"EUR"),"price":price!=null?String(price):undefined,"availability":schemaAvailability(p),"itemCondition":p.new?"https://schema.org/NewCondition":"https://schema.org/UsedCondition","url":url}};
  if (typeof p.rating==='number' && typeof p.reviews==='number' && p.reviews>0){
    data.aggregateRating={"@type":"AggregateRating","ratingValue":String(p.rating),"ratingCount":String(p.reviews)};
  }
  function prune(o){
    if (Array.isArray(o)) return o.map(prune).filter(function(v){ return v!=null; });
    if (o && typeof o==='object'){ var r={}; Object.keys(o).forEach(function(k){ var pv=prune(o[k]); if (pv!=null && !(Array.isArray(pv)&&pv.length===0)) r[k]=pv; }); return Object.keys(r).length?r:null; }
    return (o===undefined||o===null)?null:o;
  }
  return prune(data);
}
function injectProductJsonLD(p){ try{ var id='jsonld-product', old=document.getElementById(id); if (old) old.remove(); var json=buildProductJsonLD(p); if (!json) return; var s=document.createElement('script'); s.type='application/ld+json'; s.id=id; s.textContent=JSON.stringify(json); document.head.appendChild(s);}catch(_){} }
function clearProductJsonLD(){ var s=document.getElementById('jsonld-product'); if (s) s.remove(); }

/* ---------- Rendering produits ---------- */
function productToHTML(m){
  var title = fallback(m.title, (fallback(m.brand,'') + (m.brand?' ':'') + fallback(m.sku,''))).trim();
  var tag   = fallback(m.badge, (Array.isArray(m.tags)&&m.tags[0]) || fallback(m.tag,'')).trim();
  var desc  = fallback(m.desc, fallback(m.description,''));
  var id    = String(fallback(m.id, fallback(m.sku, title)));
  var currency   = m && m.currency ? m.currency : 'EUR';
  var pc = (typeof m.price_cents==='number' && isFinite(m.price_cents)) ? Math.round(m.price_cents)
          : (typeof m.price==='number' && isFinite(m.price)) ? Math.round(m.price*100) : null;
  var priceHtml='';
  if (pc!=null){
    var txt=''; try{ txt=(pc/100).toLocaleString('fr-FR',{style:'currency',currency:currency}); }catch(_){ txt=(pc/100).toFixed(2)+' '+currency; }
    priceHtml = '<div class="price" aria-label="Prix" style="margin-top:.35rem;font-weight:700">'+txt+'</div>';
  }
  return ''
    + '<article class="card" data-tool data-id="'+id+'" data-tag="'+tag+'">'
    + '  <div class="head"><h3 class="title">'+title+'</h3>' + (tag?'<span class="badge">'+tag+'</span>':'') + '</div>'
    + '  <div class="specs"><p style="margin:0">'+(desc||'—')+'</p>'+priceHtml+'</div>'
    + '  <div class="actions"><button class="btn primary" data-add="'+id+'">Ajouter au panier</button></div>'
    + '</article>';
}
function bindAddToCart(scopeData){
  $$('[data-add]', listEl).forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var id = btn.getAttribute('data-add');
      var p = scopeData.find ? scopeData.find(function(x){ return (x.id&&String(x.id)===id)||(x.sku&&String(x.sku)===id)||(x.title===id); }) : null;
      if (!p) return;
      CART.push(p); saveCart(); notifyCartAdded(p.title||p.sku||'Article');
    });
  });
}
function findProductByKey(key){
  if (!key) return null; var k=String(key).toLowerCase();
  for (var i=0;i<MODELS.length;i++){
    var m=MODELS[i];
    var id  = String(m && m.id  !=null ? m.id  : '').toLowerCase();
    var sku = String(m && m.sku !=null ? m.sku : '').toLowerCase();
    var ttl = String(m && m.title!=null ? m.title: '').toLowerCase();
    if (id===k || sku===k || ttl===k) return m;
  }
  return null;
}
function renderPDP(product){
  var wrap=$('#pdp'); if (!wrap) return;
  var elImg=$('#pdpImg'), elT=$('#pdpTitle'), elTag=$('#pdpTag'), elDesc=$('#pdpDesc'), elSpecs=$('#pdpSpecs');
  var btnQ=$('#pdpQuote'), btnWa=$('#pdpWa'), btnShare=$('#pdpShare');
  var title = product.title || ((product.brand||'')+' '+(product.sku||'')).trim();
  var tag   = product.badge || (Array.isArray(product.tags)&&product.tags[0]) || product.tag || '';
  var desc  = product.desc || product.description || '';
  var img   = product.img  || IMG_FALLBACK;

  if (elT) elT.textContent = title;
  if (elTag) elTag.textContent = tag ? '#'+tag : '';
  if (elDesc) elDesc.textContent = desc || 'Caractéristiques à venir.';
  if (elImg) setSafeImg(elImg, img, product.images_alt || title || '');

  var currency = product.currency || 'EUR';
  var pc = (typeof product.price_cents==='number' && isFinite(product.price_cents)) ? Math.round(product.price_cents)
          : (typeof product.price==='number' && isFinite(product.price)) ? Math.round(product.price*100) : null;
  var priceEl = document.getElementById('pdpPrice');
  if (!priceEl){ priceEl=document.createElement('p'); priceEl.id='pdpPrice'; priceEl.className='pdp__price'; priceEl.style.margin='.35rem 0'; priceEl.style.fontWeight='700'; if (elDesc&&elDesc.parentNode) elDesc.parentNode.insertBefore(priceEl, elDesc.nextSibling); }
  if (pc!=null){ try{ priceEl.textContent=(pc/100).toLocaleString('fr-FR',{style:'currency',currency:currency}); }catch(_){ priceEl.textContent=(pc/100).toFixed(2)+' '+currency; } } else { priceEl.textContent=''; }

  var features = Array.isArray(product.features)?product.features:(Array.isArray(product.specs)?product.specs:[]);
  var featHtml = features.length ? features.map(function(s){ return '<li>'+s+'</li>'; }).join('') : '';
  var kvFromJson = (product.specs_kv && typeof product.specs_kv==='object') ? product.specs_kv : null;
  var kvDerived = {'Plateforme':product.platform||undefined,'Moteur':product.motor||undefined,'Couple max':(product.torque_nm!=null)?(product.torque_nm+' Nm'):undefined,'Vitesses':product.rpm||undefined,'Cadence de chocs':product.ipm||undefined,'Mandrin':product.chuck||undefined,'Longueur':(product.length_mm!=null)?(product.length_mm+' mm'):undefined,'Poids':(product.weight_kg!=null)?(product.weight_kg+' kg'):undefined,'Garantie':(product.warranty_months!=null)?(product.warranty_months+' mois'):undefined};
  var merged={}, k;
  if (kvFromJson) for (k in kvFromJson) if (kvFromJson[k]!=null && kvFromJson[k]!=='') merged[k]=kvFromJson[k];
  for (k in kvDerived){ if (kvDerived[k]!=null && kvDerived[k]!=='') merged[k]=kvDerived[k]; }
  var tableHtml='';
  if (Object.keys(merged).length){
    var rows = Object.keys(merged).map(function(k){ return '<tr><th>'+k+'</th><td>'+merged[k]+'</td></tr>'; }).join('');
    tableHtml = '<li style="list-style:none;padding:0;margin:.6rem 0 0"><div class="badge" style="margin:0 0 .4rem;display:inline-flex;align-items:center;gap:.4rem">⚙️ Caractéristiques techniques</div><div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:.95rem"><tbody>'+rows+'</tbody></table></div></li>';
  }
  if (elSpecs) elSpecs.innerHTML = (featHtml || tableHtml) ? (featHtml + tableHtml) : '';

  if (btnQ){ btnQ.textContent='Ajouter au panier'; btnQ.onclick=function(){ CART.push(product); saveCart(); notifyCartAdded(product.title||product.sku||'Article'); }; }
  var sku = product.sku || product.id || title;
  var productLink = location.origin + location.pathname + '#/produit/' + encodeURIComponent(product.id || product.sku || title);
  var contactSuffix=''; try{ var u=loadUser(), arr=[]; if (u && u.name) arr.push('Nom: '+u.name); if (u && u.email) arr.push('Email: '+u.email); contactSuffix = arr.length ? '\n\nMes coordonnées:\n'+arr.join('\n') : ''; }catch(_){}
  var textPDP = 'Bonjour, je souhaite un devis pour:\n• ' + sku + ' – ' + title + '\n\nLien: ' + productLink + contactSuffix + '\n\nMerci.';
  var phone = PHONE_E164.replace('+',''); if (btnWa) btnWa.href = 'https://wa.me/'+phone+'?text='+encodeURIComponent(textPDP);
  if (btnShare){ btnShare.onclick=function(){ (async function(){ try{ var shareData={title:title+' • Pirates Tools',text:title,url:productLink}; if (navigator.share) await navigator.share(shareData); else if (navigator.clipboard && navigator.clipboard.writeText){ await navigator.clipboard.writeText(productLink); toast('Lien copié', 'success'); } }catch(_){ } })(); }; }

  var related = MODELS.filter(function(m){
    return (m!==product) && ((product.category && m.category===product.category) || (tag && ((m.badge===tag) || (Array.isArray(m.tags) && m.tags.indexOf(tag)!==-1))));
  }).slice(0,3);
  var elRelWrap = document.getElementById('pdpRelated');
  if (elRelWrap){
    var relHTML='';
    for (var i=0;i<related.length;i++){
      var m=related[i], cur=m.currency||'EUR';
      var pc2=(typeof m.price_cents==='number'&&isFinite(m.price_cents))?Math.round(m.price_cents):(typeof m.price==='number'&&isFinite(m.price))?Math.round(m.price*100):null;
      var priceLine=''; if (pc2!=null){ var ptxt=''; try{ ptxt=(pc2/100).toLocaleString('fr-FR',{style:'currency',currency:cur}); }catch(_){ ptxt=(pc2/100).toFixed(2)+' '+cur; } priceLine='<div class="specs" style="justify-content:flex-end"><strong>'+ptxt+'</strong></div>'; }
      relHTML += '<article class="card" data-id="'+(m.id||m.sku||m.title)+'"><div class="head"><h3 class="title">'+(m.title||((m.brand||'')+' '+(m.sku||'')))+'</h3>' + ((m.badge||'')?'<span class="badge">'+m.badge+'</span>':'') + '</div><div class="specs"><p style="margin:0)">'+(m.desc || m.description || '')+'</p></div>'+priceLine+'<div class="actions"><button class="btn primary" data-add="'+(m.id||m.sku||m.title)+'">Ajouter au panier</button></div></article>';
    }
    elRelWrap.innerHTML=relHTML;
    elRelWrap.addEventListener('click', function(e){
      var btn=e.target.closest?e.target.closest('[data-add]'):null; if (!btn) return;
      var id=btn.getAttribute('data-add'); var p=MODELS.find?MODELS.find(function(x){ return ((x.id||x.sku||x.title)+'')===id; }):null;
      if (p){ CART.push(p); saveCart(); notifyCartAdded(p.title||p.sku||'Article'); } e.stopPropagation();
    });
    $$('.pdp__related .card').forEach(function(card){
      card.addEventListener('click', function(e){ if (e.target.closest && e.target.closest('[data-add]')) return; var id=card.getAttribute('data-id'); if (!id) return; location.hash = '#/produit/'+encodeURIComponent(id); });
    });
  }

  injectProductJsonLD(product);
}
function renderList(data){
  if (!Array.isArray(data)) return;
  if (listEl) listEl.innerHTML = data.map(productToHTML).join('\n');
  bindAddToCart(data);
  $$('.card', listEl).forEach(function(card){
    card.addEventListener('click', function(e){ if (e.target.closest && e.target.closest('[data-add]')) return; var id=card.getAttribute('data-id'); if (!id) return; location.hash='#/produit/'+encodeURIComponent(id); });
  });
  ScrollExit.observeWithin(listEl);
}

/* ---------- Catalogue ---------- */
function buildCategories(){
  var bucket={}, i, m, raw, key;
  for (i=0;i<MODELS.length;i++){
    m=MODELS[i]; raw=(m.category||m.badge||m.brand||'').toString().trim(); if (!raw) continue;
    key=raw.toLowerCase(); if (!Object.prototype.hasOwnProperty.call(bucket,key)) bucket[key]={key:key,label:raw,count:0};
    bucket[key].count+=1;
  }
  var out=[]; for (key in bucket) if (Object.prototype.hasOwnProperty.call(bucket,key)) out.push(bucket[key]);
  out.sort(function(a,b){ return b.count - a.count; });
  return out;
}
function findSelectMatch(select, keyLower){
  if (!select) return null; var opts=Array.prototype.slice.call(select.options||[]), i;
  for (i=0;i<opts.length;i++){ var t=(opts[i].value||opts[i].textContent||'').toLowerCase(); if (t===keyLower) return (opts[i].value||opts[i].textContent); }
  return null;
}
function renderCatalogue(){
  var root = document.getElementById('catList'); if (!root) return;
  var cats = buildCategories();
  root.innerHTML = cats.length ? cats.map(function(c){
    return '<article class="card cat-card" data-cat="'+c.key+'"><div class="head"><h3 class="title">'+c.label+'</h3><span class="badge">Catégorie</span></div><div class="specs"><p style="margin:0">'+c.count+' produit'+(c.count>1?'s':'')+'</p></div><div class="actions"><button class="btn primary" data-cat-go="'+c.key+'">Voir</button></div></article>';
  }).join('') : '<div class="card"><div class="specs"><p style="margin:0">Aucune catégorie détectée.</p></div></div>';

  var go = function(keyLower){
    var matchVal = findSelectMatch(tagEl, keyLower);
    if (tagEl) tagEl.value = matchVal || '';
    if (searchEl) searchEl.value = matchVal ? '' : keyLower;
    if (typeof applyFilters==='function') applyFilters();
    location.hash='#/catalogue';
    setTimeout(function(){ var listNode=document.getElementById('list'); if (listNode && listNode.scrollIntoView) listNode.scrollIntoView({behavior:'smooth'}); }, 80);
  };
  if (!root.__wired){
    root.__wired=1;
    root.addEventListener('click', function(e){
      var btn=e.target.closest?e.target.closest('[data-cat-go]'):null;
      var card=e.target.closest?e.target.closest('.cat-card'):null;
      if (btn) return go(btn.getAttribute('data-cat-go'));
      if (card) return go(card.getAttribute('data-cat'));
    });
  }
}

/* ---------- Chargement produits ---------- */
async function loadProducts(){
  try{
    var r = await fetch('products.json', { cache:'no-store' });
    var json = await r.json();
    MODELS = Array.isArray(json) ? json : (json.products || []);
    renderList(MODELS); renderCatalogue();
    window.dispatchEvent(new CustomEvent('pt:productsLoaded'));
  }catch(e){
    console.error('Erreur chargement produits:', e);
    if (listEl) listEl.innerHTML = '<div class="card"><div class="head"><h3 class="title">Produits indisponibles</h3></div><div class="specs"><p>Impossible de charger <code>products.json</code>.</p></div></div>';
  }
}
loadProducts();

/* ---------- Filtres ---------- */
var applyFilters = debounce(function(){
  var q = ((searchEl && searchEl.value) || '').trim().toLowerCase();
  var t = ((tagEl && tagEl.value) || '').trim().toLowerCase();
  var filtered = MODELS.filter(function(m){
    var hay = [fallback(m.title,''),fallback(m.sku,''),fallback(m.brand,''),fallback(m.category,''),fallback(m.desc,fallback(m.description,'')),(Array.isArray(m.tags)?m.tags.join(' '):''),fallback(m.badge,'')].join(' ').toLowerCase();
    var okQ = !q || hay.indexOf(q)!==-1; var okT=!t || hay.indexOf(t)!==-1; return okQ && okT;
  });
  renderList(filtered);
}, 120);
if (searchEl) searchEl.addEventListener('input', applyFilters, true);
if (tagEl) tagEl.addEventListener('change', applyFilters);

/* ---------- Devis & Paiements ---------- */
function getUnitCents(p){
  if (!p) return null;
  if (typeof p.price_cents==='number' && isFinite(p.price_cents)) return Math.round(p.price_cents);
  if (typeof p.price==='number' && isFinite(p.price)) return Math.round(p.price*100);
  if (typeof p.price==='string'){
    var s=p.price.replace(/\s/g,'').replace(',','.'); var v=parseFloat(s); if (isFinite(v)) return Math.round(v*100);
  }
  return null;
}
function formatMoneyFromCents(cents){ var v=(cents||0)/100; try{ return v.toLocaleString('fr-FR',{style:'currency',currency:CURRENCY}); }catch(_){ return (Math.round(v*100)/100).toFixed(2)+' '+CURRENCY; } }
function computeCartTotal(){
  var grouped=groupCart(), totalCents=0, counted=0, i, u;
  for (i=0;i<grouped.length;i++){ u=getUnitCents(grouped[i].item); if (u!=null){ totalCents+=u*grouped[i].qty; counted++; } }
  return { totalCents: totalCents, total: totalCents/100, hasPrices: counted>0 };
}
function fillAmount(url, totalCents){ if (!url) return ''; var euros=(totalCents/100).toFixed(2); var cents=Math.round(totalCents); return url.replace(/\{AMOUNT\}/g, euros).replace(/\{AMOUNT_CENTS\}/g, String(cents)); }
function buildPayPalCartUrl(){
  if (!PAYPAL_BUSINESS || PAYPAL_BUSINESS.indexOf('@')===-1) return '';
  var base='https://www.paypal.com/cgi-bin/webscr?cmd=_cart&upload=1';
  base+='&business='+encodeURIComponent(PAYPAL_BUSINESS);
  base+='&currency_code='+encodeURIComponent(CURRENCY);
  var grouped=groupCart(), idx=1, i, g, uc, name, amount;
  for (i=0;i<grouped.length;i++){
    g=grouped[i]; uc=getUnitCents(g.item); if (uc==null) continue;
    name = g.item.title || ((g.item.brand||'')+' '+(g.item.sku||'')).trim() || 'Article';
    amount=(uc/100).toFixed(2);
    base+='&item_name_'+idx+'='+encodeURIComponent(name);
    base+='&amount_'   +idx+'='+encodeURIComponent(amount);
    base+='&quantity_' +idx+'='+encodeURIComponent(g.qty);
    idx++;
  }
  return base;
}
function fallbackWhatsAppForPayment(extraLine){
  var msg = cartToWhatsAppText() || 'Bonjour, je souhaite régler ma commande. Pouvez-vous m’envoyer un lien de paiement ?';
  if (extraLine) msg+='\n\n'+extraLine;
  window.open('https://wa.me/'+PHONE_E164.replace('+','')+'?text='+encodeURIComponent(msg), '_blank', 'noopener');
}
function payWithPayPal(){
  if (!CART.length){ toast('Votre panier est vide','info'); return; }
  var info=computeCartTotal(); if (!info.hasPrices){ toast('Prix manquants — redirection WhatsApp.','info'); fallbackWhatsAppForPayment('Montant inconnu.'); return; }
  var url=buildPayPalCartUrl(); if (!url){ toast('PayPal non configuré (email manquant).','info'); return; }
  window.open(url,'_blank','noopener'); announce('Redirection vers PayPal');
}
function payWithStripe(){
  if (!CART.length){ toast('Votre panier est vide','info'); return; }
  var info=computeCartTotal(); if (!info.hasPrices){ toast('Prix manquants — redirection WhatsApp.','info'); fallbackWhatsAppForPayment('Montant inconnu.'); return; }
  if (!STRIPE_PAY_LINK){ toast('Lien Carte/Apple Pay non configuré.','info'); return; }
  var url=fillAmount(STRIPE_PAY_LINK, info.totalCents);
  try{ if (navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText((info.totalCents/100).toFixed(2)); toast('Montant copié : '+formatMoneyFromCents(info.totalCents),'success'); } }catch(_){}
  window.open(url,'_blank','noopener'); announce('Redirection vers Carte / Apple Pay');
}
function payWithCrypto(){
  if (!CART.length){ toast('Votre panier est vide','info'); return; }
  var info=computeCartTotal(); if (!info.hasPrices){ toast('Prix manquants — redirection WhatsApp.','info'); fallbackWhatsAppForPayment('Montant inconnu.'); return; }
  if (!CRYPTO_PAY_LINK){ toast('Lien Crypto non configuré.','info'); return; }
  var url=fillAmount(CRYPTO_PAY_LINK, info.totalCents);
  try{ if (navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText((info.totalCents/100).toFixed(2)); toast('Montant copié : '+formatMoneyFromCents(info.totalCents),'success'); } }catch(_){}
  window.open(url,'_blank','noopener'); announce('Redirection vers Paiement Crypto');
}
function renderCartView(){
  var root = $('#devisList'); if (!root) return;
  var grouped = groupCart();
  if (!grouped.length){ root.innerHTML='<p style="margin:0">Aucun article pour le moment.</p>'; }
  else{
    root.innerHTML = grouped.map(function(g){
      var item=g.item||{}, qty=Number(g.qty||0), sku=item.sku||item.id||'', title=item.title||((item.brand||'')+' '+(item.sku||'')).trim(), key=keyOf(item);
      var uc=getUnitCents(item), priceHtml='';
      if (uc!=null){
        priceHtml = '<div class="specs" style="justify-content:flex-end"><span style="margin-left:auto">'+formatMoneyFromCents(uc)+' × '+qty+' = <strong>'+formatMoneyFromCents(uc*qty)+'</strong></span></div>';
      }
      return '<div class="card" style="width:100%"><div class="head"><h3 class="title">'+title+'</h3><span class="badge">'+sku+'</span></div><div class="specs" style="display:flex;gap:.6rem;align-items:center"><button class="btn" data-dec="'+key+'" aria-label="Diminuer">−</button><strong>'+qty+'</strong><button class="btn" data-inc="'+key+'" aria-label="Augmenter">+</button><button class="btn" data-del="'+key+'" style="margin-left:auto;background:rgba(255,255,255,.06);color:#d9e3ec" aria-label="Supprimer">Supprimer</button></div>'+priceHtml+'</div>';
    }).join('');
  }
  var info=computeCartTotal();
  var totalBlock = '<div class="specs" id="devisTotal" style="display:flex;justify-content:flex-end"><div>Total estimé : <strong>'+ (info.hasPrices?formatMoneyFromCents(Math.round(info.totalCents||0)):'—') +'</strong></div></div>';
  root.insertAdjacentHTML('beforeend', totalBlock);

  if (!root.__wired){
    root.__wired=1;
    delegate(root,'[data-inc]','click',function(_e,el){ var key=el.getAttribute('data-inc'); var p=MODELS.find?MODELS.find(function(m){return keyOf(m)===key;}):null; if (p) CART.push(p); saveCart(); renderCartView(); });
    delegate(root,'[data-dec]','click',function(_e,el){ var key=el.getAttribute('data-dec'); var i=CART.findIndex?CART.findIndex(function(p){return keyOf(p)===key;}):-1; if (i>=0) CART.splice(i,1); saveCart(); renderCartView(); });
    delegate(root,'[data-del]','click',function(_e,el){ var key=el.getAttribute('data-del'); for (var j=CART.length-1;j>=0;j--) if (keyOf(CART[j])===key) CART.splice(j,1); saveCart(); renderCartView(); });
  }

  var sendBtn=$('#devisSend'); if (sendBtn && !sendBtn.__wired){ sendBtn.__wired=1; sendBtn.addEventListener('click', function(){ var msg=encodeURIComponent(cartToWhatsAppText()); if (!msg) return; window.open('https://wa.me/'+PHONE_E164.replace('+','')+'?text='+msg,'_blank','noopener'); toast('Devis ouvert dans WhatsApp','success'); announce('Devis ouvert dans WhatsApp'); }); }
  var clearBtn=$('#devisClear'); if (clearBtn && !clearBtn.__wired){ clearBtn.__wired=1; clearBtn.addEventListener('click', function(){ CART=[]; saveCart(); renderCartView(); toast('Devis vidé','success'); announce('Devis vidé'); }); }

  var cardEl = $('#view-devis .card');
  if (cardEl){
    var payRow=document.getElementById('devisPayRow');
    if (!payRow){ payRow=document.createElement('div'); payRow.className='actions'; payRow.id='devisPayRow'; cardEl.appendChild(payRow); }
    function ensureBtn(id, cls, label, onClick){ var b=document.getElementById(id); if (!b){ b=document.createElement('button'); b.id=id; b.className=cls; b.textContent=label; payRow.appendChild(b); } if (!b.__wired){ b.__wired=1; b.addEventListener('click', onClick); } }
    ensureBtn('devisPayStripe','btn primary','Carte / Apple Pay',  payWithStripe);
    ensureBtn('devisPayPayPal','btn','PayPal',                       payWithPayPal);
    ensureBtn('devisPayCrypto','btn','Crypto',                       payWithCrypto);
  }
}

/* ---------- Dock actions ---------- */
if (dockQuoteBtn){ dockQuoteBtn.addEventListener('click', function(){ var text=cartToWhatsAppText()||'Bonjour, je souhaite des informations.'; var msg=encodeURIComponent(text); window.open('https://wa.me/'+PHONE_E164.replace('+','')+'?text='+msg,'_blank','noopener'); }); }
if (dockCartBtn){  dockCartBtn.addEventListener('click', function(){ location.hash='#/devis'; }); }
if (dockBadge){    dockBadge.addEventListener('click',    function(){ location.hash='#/devis'; }); }

/* ---------- PWA SW ---------- */
function showUpdateBanner(waitingSW){
  var bar=document.createElement('div'); bar.id='updateBanner';
  bar.innerHTML='<div style="display:flex;gap:.6rem;align-items:center"><span>Nouvelle version disponible.</span><button class="btn primary" id="btnReload">Mettre à jour</button></div>';
  var css={position:'fixed',left:'50%',transform:'translateX(-50%)',bottom:'calc(96px + env(safe-area-inset-bottom,0px))',background:'rgba(10,