/* =========================================================
   Pirates Tools — app.js (FULL, stable, clean)
   - Compat Android/iOS (sans ?. et ??)
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

/* ---------- Helpers (ES5-safe) ---------- */
var $  = function(sel, root){ return (root || document).querySelector(sel); };
var $$ = function(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

var clamp = function(v, min, max){
  v = typeof v === 'number' ? v : parseFloat(v);
  if (!isFinite(v)) v = 0;
  return Math.max(min, Math.min(max, v));
};

// ES5-safe Array.find
function arrFind(arr, pred){
  if (!arr || !arr.length) return null;
  for (var i=0;i<arr.length;i++){
    if (pred(arr[i], i, arr)) return arr[i];
  }
  return null;
}

var fallback = function(v, alt){
  return (v === undefined || v === null) ? (alt || '') : v;
};

function firstDefined(){
  for (var i = 0; i < arguments.length; i++){
    var v = arguments[i];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

/* Nombres & monnaie sûrs (utiles un peu partout) */
function toNumberSafe(v){
  var n = (typeof v === 'number') ? v : parseFloat(v);
  return isFinite(n) ? n : null;
}

function moneyFR(v, currency){
  currency = currency || 'EUR';
  try{
    return Number(v).toLocaleString('fr-FR', { style:'currency', currency: currency });
  }catch(_){
    var n = Math.round(Number(v) * 100) / 100;
    if (!isFinite(n)) n = 0;
    return n.toFixed(2) + ' ' + currency;
  }
}

/* Délégation d’événements (pratique pour les listes dynamiques) */
function delegate(root, selector, type, handler){
  (root || document).addEventListener(type, function(e){
    var el = e.target && e.target.closest ? e.target.closest(selector) : null;
    if (el && (root ? (root.contains ? root.contains(el) : true) : true)){
      handler.call(el, e, el);
    }
  }, false);
}

/* Polyfills minimalistes pour très anciens navigateurs */
(function(){
  if (!Element.prototype.matches){
    Element.prototype.matches =
      Element.prototype.msMatchesSelector ||
      Element.prototype.webkitMatchesSelector ||
      function(s){
        var m = (this.document || this.ownerDocument).querySelectorAll(s);
        var i = m.length;
        while (--i >= 0 && m.item(i) !== this) {}
        return i > -1;
      };
  }
  if (!Element.prototype.closest){
    Element.prototype.closest = function(s){
      var el = this;
      while (el && el.nodeType === 1){
        if (el.matches && el.matches(s)) return el;
        el = el.parentElement || el.parentNode;
      }
      return null;
    };
  }
})();

/* === (NOUVEAU) Images sûres + fallback === */
var IMG_FALLBACK = './images/pirates-tools-logo.png?v=7';

function sanitizeImgUrl(u){
  try{
    var url = new URL(u, location.href);
    if (url.protocol === 'http:') url.protocol = 'https:';
    return url.toString();
  }catch(_){ return IMG_FALLBACK; }
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

/* === SEO defaults (titre + meta description) === */
var META_DESC_EL  = document.querySelector('meta[name="description"]');
var DEFAULT_TITLE = document.title || 'Pirates Tools • Outillage pro (PWA)';
var DEFAULT_DESC  = (META_DESC_EL ? META_DESC_EL.getAttribute('content') : null) ||
                    'Pirates Tools — Visseuses à chocs DeWALT, dispo Antilles. PWA rapide, contact immédiat (téléphone & WhatsApp).';

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
  var css = '\n  @keyframes pt-bump { 0%{transform:scale(1)} 35%{transform:scale(1.15)} 100%{transform:scale(1)} }\n  #dockCount.bump{ animation: pt-bump .42s ease }\n\n  #toasts{ position:fixed; left:50%; bottom:calc(84px + env(safe-area-inset-bottom,0px)); transform:translateX(-50%); z-index:130; display:grid; gap:.5rem; }\n  .toast{ display:grid; grid-template-columns:auto 1fr auto; gap:.6rem; padding:.6rem .75rem; border-radius:12px;\n          background:rgba(10,15,20,.92); border:1px solid #22303b; color:#e6edf5; box-shadow:0 12px 24px rgba(0,0,0,.35);\n          font:600 14px/1.25 system-ui,-apple-system,BlinkMacSystemFont,\"Inter\",\"Segoe UI\",Roboto,Arial,sans-serif; }\n  .toast__icon{ align-self:center }\n  .toast__body{ align-self:center }\n  .toast__close{ background:transparent; border:0; color:#9fb4c5; cursor:pointer; font-size:16px; }\n  @keyframes toast-out { to { opacity:0; transform:translateY(6px) } }\n  ';
  var style = document.createElement('style');
  style.id = 'pt-ux-css';
  style.textContent = css;
  document.head.appendChild(style);

  // ——— Assure les conteneurs nécessaires (toasts + a11y live) ———
  (function ensureBasics(){
    if (!document.getElementById('toasts')){
      var t = document.createElement('div');
      t.id = 'toasts';
      document.body.appendChild(t);
    }
    if (!document.getElementById('sr-live')){
      var l = document.createElement('div');
      l.id = 'sr-live';
      l.setAttribute('aria-live','polite');
      l.style.position = 'absolute';
      l.style.left = '-9999px';
      document.body.appendChild(l);
    }
  })();
})();

// Dock: visibilité contrôlée par le scroll du hero (et via le router)
function showDock(visible){
  if (!dock) return;
  if (visible) dock.classList.add('dock--visible');
  else dock.classList.remove('dock--visible');
}

/* ---------- A11y helpers ---------- */
var live    = document.getElementById('sr-live') || document.getElementById('srLive');
var toastsC = $('#toasts');
var dockBadge = $('#dockCount');

function announce(msg){
  if (!live) return;
  live.textContent = '';
  setTimeout(function(){ live.textContent = msg; }, 20);
}

function toast(msg, kind){
  if (kind === void 0) kind = 'success';
  if (!toastsC) return;
  var el = document.createElement('div');
  el.className = 'toast toast--' + kind;
  el.innerHTML = '\n    <div class="toast__icon">'+(kind==='success'?'✅':'ℹ️')+'</div>\n    <div class="toast__body">'+msg+'</div>\n    <button class="toast__close" aria-label="Fermer">✖</button>\n  ';
  var close = function(){
    el.style.animation = 'toast-out .18s ease-in both';
    setTimeout(function(){ el.remove(); }, 180);
  };
  var btn = el.querySelector('.toast__close');
  if (btn) btn.addEventListener('click', close);
  toastsC.appendChild(el);
  setTimeout(close, 3200);
}

function bumpBadge(){
  if (!dockBadge) return;
  dockBadge.classList.remove('bump');
  void dockBadge.offsetWidth; // reflow
  dockBadge.classList.add('bump');
}

function notifyCartAdded(title){
  if (title === void 0) title = 'Article';
  toast('« ' + title + ' » ajouté au devis');
  announce(title + ' ajouté au devis');
  bumpBadge();
}

/* ---------- Focus helper après navigation ---------- */
function focusView(key){
  var target = null;
  if (key === 'produit')        target = $('#pdpTitle');
  else if (key === 'catalogue') target = $('#view-catalogue h1');
  else if (key === 'devis')     target = $('#view-devis h1');
  else if (key === 'compte')    target = $('#view-compte h1');
  else if (key === 'home')      target = $('#view-home h1');
  else                          target = $('#list'); // fallback

  if (target){
    target.setAttribute('tabindex','-1');
    if (typeof target.focus === 'function') target.focus({ preventScroll: true });
    setTimeout(function(){ target.removeAttribute('tabindex'); }, 300);
  }
}

/* ---------- Globals ---------- */
var PHONE_HUMAN = '07 74 23 01 95';
var PHONE_E164  = '+33774230195';

var MODELS = [];                 // produits
var CART   = [];                 // panier (tableau d’objets produit)
var STORE_KEY = 'pt_cart_v1';    // clé localStorage
var USER_KEY  = 'pt_user_v1';    // compte (démo)

// === DOM refs (NÉCESSAIRES à l'anim du logo & au dock) ===
var hero      = document.getElementById('hero');
var heroLogo  = document.getElementById('heroLogo');

var dock          = document.getElementById('dock');
var dockCount     = document.getElementById('dockCount');    // optionnel
var dockQuoteBtn  = document.getElementById('dockQuoteBtn'); // optionnel
var dockCartBtn   = document.getElementById('dockCartBtn');  // optionnel

// === DOM refs (CTA + toolbar + liste) ===
var callBtn  = document.getElementById('callBtn');
var waBtn    = document.getElementById('waBtn');
var listEl   = document.getElementById('list');
var searchEl = document.getElementById('q');
var tagEl    = document.getElementById('tag');

/* ============== [CATALOGUE] Grille de marques ============== */

// 1) Ancrage DOM (id ajouté dans index.html)
const elBrandGrid = document.getElementById('brandGrid');

// 2) Marques (clé, libellé, logo local) — casse EXACTE des fichiers
// Dossier: /images/brands/
const BRANDS = [
  { key: 'dewalt',    name: 'DeWALT',    logo: './images/brands/Logo.dewalt.png' },
  { key: 'milwaukee', name: 'Milwaukee', logo: './images/brands/logo.milwaukee.png' },
  { key: 'makita',    name: 'Makita',    logo: './images/brands/logo.makita.png' },
  { key: 'festool',   name: 'Festool',   logo: './images/brands/Logo.festool.png' },
  { key: 'flex',      name: 'FLEX',      logo: './images/brands/Logo.flex.png' },
  { key: 'wera',      name: 'Wera',      logo: './images/brands/logo.wera.png' },
  { key: 'stanley',   name: 'Stanley',   logo: './images/brands/Logo.stanley.png' },
  { key: 'facom',     name: 'Facom',     logo: './images/brands/Logo.facom.png' },
];


/* 3) Rendu + interactions des bulles de marques
   (à coller juste après la déclaration de `const BRANDS = [...]`) */
function renderBrandGrid () {
  if (!elBrandGrid) return;

  const frag = document.createDocumentFragment();

  for (const b of BRANDS) {
    const a = document.createElement('a');
    a.className = 'brand';
    a.href = `#/catalogue?brand=${encodeURIComponent(b.key)}`;
    a.setAttribute('role', 'listitem');
    a.setAttribute('aria-label', b.name);
    a.dataset.brand = b.key;

    const bubble = document.createElement('span');
    bubble.className = 'brand__bubble';

    const img = document.createElement('img');
    img.className = 'brand__logo';
    img.src = b.logo;                 // ex: ./images/brands/Logo.dewalt.png
    img.alt = b.name;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => { img.src = './images/pirates-tools-logo.png'; };

    bubble.appendChild(img);

    const label = document.createElement('span');
    label.className = 'brand__label';
    label.textContent = b.name;

    a.appendChild(bubble);
    a.appendChild(label);
    frag.appendChild(a);
  }

  elBrandGrid.innerHTML = '';
  elBrandGrid.appendChild(frag);
}

// ===== [app.js] Catalogue — SOUS-CATÉGORIES PAR MARQUE (types) =====
const elCatList = document.getElementById('catList');

// Parse `#/xxx?brand=...&type=...`
function parseHashQuery(){
  const q = {};
  const i = location.hash.indexOf('?');
  if (i === -1) return q;
  const usp = new URLSearchParams(location.hash.slice(i + 1));
  usp.forEach((v, k) => q[k] = v);
  return q;
}

// Rendu des "types d’outils" pour une marque donnée
function renderTypesForBrand(brandKey){
  if (!elCatList) return;

  const PRODUCTS =
    window.PRODUCTS ||
    window._products ||
    (window.state && state.products) ||
    [];

  elCatList.textContent = '';
  if (!brandKey) return;

  // Collecter les catégories uniques de cette marque
  const types = new Map();
  for (const p of PRODUCTS){
    if (!p || !p.brand_key) continue;
    if (p.brand_key.toLowerCase() !== String(brandKey).toLowerCase()) continue;

    const key  = (p.category_key || (p.category || '').toLowerCase().replace(/\s+/g,'-'));
    const name = p.category || key.replace(/-/g,' ');
    if (!types.has(key)) types.set(key, name);
  }

  // Rien trouvé ?
  if (types.size === 0){
    const empty = document.createElement('p');
    empty.textContent = 'Aucun type trouvé pour cette marque.';
    elCatList.appendChild(empty);
    return;
  }

  // Cartes cliquables
  const frag = document.createDocumentFragment();
  types.forEach((name, key) => {
    const a = document.createElement('a');
    a.href = `#/catalogue?brand=${encodeURIComponent(brandKey)}&type=${encodeURIComponent(key)}`;
    a.className = 'cat-card';
    a.setAttribute('role','listitem');
    a.innerHTML = `<strong>${name}</strong><br><span style="color:#9fb4c5;font-size:.95rem">Voir les produits</span>`;
    frag.appendChild(a);
  });
  elCatList.appendChild(frag);
}

// Boot au chargement + navigation
function bootTypesFromHash(){
  const q = parseHashQuery();
  if (q.brand) renderTypesForBrand(q.brand);
}
window.addEventListener('hashchange', bootTypesFromHash);
bootTypesFromHash();


// petit feedback visuel (optionnel) sans bloquer la navigation hash
elBrandGrid?.addEventListener('pointerdown', (e) => {
  const a = e.target.closest('a.brand');
  if (!a) return;
  a.style.transform = 'scale(0.98)';
  setTimeout(() => { a.style.transform = ''; }, 180);
});

renderBrandGrid();


// 3) Rendu des bulles (anchor + image + label)
function renderBrandGrid() {
  if (!elBrandGrid) return;

  elBrandGrid.innerHTML = BRANDS.map((b) => `
    <a class="brand" data-brand="${b.key}"
       href="#/catalogue?brand=${encodeURIComponent(b.key)}"
       role="listitem" aria-label="Voir ${b.name}">
      <span class="brand__bubble" aria-hidden="true">
        <img class="brand__img" src="${b.logo}" alt="${b.name}"
             onerror="this.onerror=null;this.src='./images/pirates-tools-logo.png';">
      </span>
      <span class="brand__label">${b.name}</span>
    </a>
  `).join('');

  // Confort: après un 1er clic sur une bulle, on descend vers la liste
  elBrandGrid.addEventListener('click', (e) => {
    const a = e.target.closest('a.brand');
    if (!a) return;
    // Laisse le router changer le hash, puis scroll vers la liste filtrée
    setTimeout(() => {
      const list = document.getElementById('list') || document.getElementById('catList');
      if (list) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  });
}

// 4) Init au chargement (app.js est déjà chargé en bas du HTML)
document.addEventListener('DOMContentLoaded', renderBrandGrid);
/* ---------- Paiement : configuration ---------- */
/* Provider PayPal (cart upload) */
var PAYPAL_BUSINESS = 'votre-email-paypal@example.com'; // ← remplace par ton email PayPal PRO
var CURRENCY = 'EUR';

/* Carte + Apple Pay (Stripe Payment Link ou équivalent) */
var STRIPE_PAY_LINK = ''; // ← colle ici ton lien Stripe une fois créé

/* Crypto (Coinbase Commerce / NOWPayments / CoinGate …) */
var CRYPTO_PAY_LINK = ''; // ← colle ici ton lien crypto si tu en as un

/* ===== Fallback robuste pour le(s) logo(s) ===== */
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



/* =======================  SOUS-CATÉGORIES PAR MARQUE  ======================= */

/** Parse le hash courant → { view, query:Object }  (ex: #/catalogue?brand=dewalt) */
function parseHash () {
  const h = location.hash || '#/';
  const [path, queryStr] = h.split('?');
  const view = path.replace('#/', '').split('/')[0] || '';
  const query = {};
  if (queryStr) {
    for (const part of queryStr.split('&')) {
      const [k, v] = part.split('=');
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || '');
    }
  }
  return { view, query };
}

/** Charge les produits (utilise le cache global si déjà présent) */
async function loadProducts () {
  if (window.__PT_PRODUCTS?.length) return window.__PT_PRODUCTS;
  const fallback = window.PRODUCTS || window.products || [];
  if (fallback.length) { window.__PT_PRODUCTS = fallback; return fallback; }
  try {
    const res = await fetch('./products.json', { cache: 'no-store' });
    const data = await res.json();
    window.__PT_PRODUCTS = Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('loadProducts:', e);
    window.__PT_PRODUCTS = [];
  }
  return window.__PT_PRODUCTS;
}

/** Rend les cartes “type d’outil” pour une marque donnée (dans #catList) */
async function renderTypesForBrand (brandKey) {
  const elCatList = document.getElementById('catList');
  if (!elCatList) return;

  const all = await loadProducts();
  const list = all.filter(p => (p.brand_key || '').toLowerCase() === String(brandKey).toLowerCase());

  // Ensemble des types (category / category_key) avec comptage
  const map = new Map();
  for (const p of list) {
    const key = (p.category_key || p.category || 'autres').toLowerCase();
    const name = p.category || p.category_key || 'Autres';
    const rec = map.get(key) || { key, name, count: 0 };
    rec.count++;
    map.set(key, rec);
  }

  // Rendu
  const frag = document.createDocumentFragment();
  for (const rec of map.values()) {
    const card = document.createElement('div');
    card.className = 'cat-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${rec.name} (${rec.count})`);
    card.dataset.type = rec.key;

    card.innerHTML = `
      <strong>${rec.name}</strong><br>
      <span style="opacity:.75;font-size:.95rem">${rec.count} modèle${rec.count>1?'s':''}</span>
    `;

    // Clic → route #/catalogue?brand=...&type=...
    card.addEventListener('click', () => {
      const q = new URLSearchParams({ brand: brandKey, type: rec.key });
      location.hash = `#/catalogue?${q.toString()}`;
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
    });

    frag.appendChild(card);
  }

  elCatList.innerHTML = '';
  if (map.size) {
    elCatList.appendChild(frag);
  } else {
    elCatList.innerHTML = `<div class="cat-card">Aucun type trouvé pour cette marque.</div>`;
  }

  // Fais défiler la zone des types sous la grille
  elCatList.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Router minimal : quand on est sur #/catalogue et qu’un brand est présent → afficher les types */
async function handleRouteCatalogue () {
  const { view, query } = parseHash();
  if (view !== 'catalogue') return;

  // Met à jour la sélection visuelle dans la grille (optionnel)
  const sel = String(query.brand || '').toLowerCase();
  document.querySelectorAll('#brandGrid a.brand').forEach(a => {
    a.classList.toggle('is-active', (a.dataset.brand || '').toLowerCase() === sel);
  });

  if (query.brand) {
    await renderTypesForBrand(query.brand);
  } else {
    // Pas de marque → on vide simplement la zone des types
    const elCatList = document.getElementById('catList');
    if (elCatList) elCatList.innerHTML = '';
  }
}

// Écoute le changement de hash + appelle une fois au chargement
window.addEventListener('hashchange', handleRouteCatalogue);
handleRouteCatalogue();


/* =======================  LISTE PRODUITS (brand + type)  ======================= */

/** Format prix FR */
function fmtPrice(n, c = 'EUR') {
  try { return new Intl.NumberFormat('fr-FR', { style:'currency', currency:c }).format(n); }
  catch { return (typeof n === 'number' ? n.toFixed(2) : String(n || '')) + ' ' + c; }
}

/** Rendu des cartes produit dans #list (sans dépendre d’un autre renderer) */
function renderBrandTypeList(items) {
  const listEl = document.getElementById('list');
  if (!listEl) return;

  if (!items.length) {
    listEl.innerHTML = `<div class="card" style="padding:1rem">Aucun produit pour ce filtre.</div>`;
    listEl.scrollIntoView({ behavior:'smooth', block:'start' });
    return;
  }

  const html = items.map(p => {
    const price = p.price != null ? fmtPrice(p.price, p.currency || 'EUR') : '';
    const old   = p.price_old != null ? fmtPrice(p.price_old, p.currency || 'EUR') : '';
    const img   = (p.img || '/images/pirates-tools-logo.png');

    return `
      <div class="card">
        <div class="head">
          <h3 class="title">${p.title}</h3>
          ${p.badge ? `<span class="badge">${p.badge}</span>` : ``}
        </div>
        <div style="display:grid;grid-template-columns:120px 1fr;gap:12px;padding:1rem 1.1rem;border-bottom:1px solid rgba(255,255,255,.06)">
          <img src="${img}" alt="${p.images_alt || p.title}" onerror="this.src='/images/pirates-tools-logo.png'">
          <div>
            <div style="margin:.2rem 0 .4rem;color:#cfeaf8;font-weight:700;">
              ${price} ${old ? `<span style="opacity:.7;text-decoration:line-through;margin-left:.35rem">${old}</span>` : ``}
            </div>
            <div class="specs">
              ${p.desc ? `<span>${p.desc}</span>` : ``}
              ${p.torque_nm ? `<span>⚙️ ${p.torque_nm} Nm</span>` : ``}
              ${p.weight_kg ? `<span>⚖️ ${p.weight_kg} kg</span>` : ``}
              ${p.length_mm ? `<span>📏 ${p.length_mm} mm</span>` : ``}
            </div>
          </div>
        </div>
        <div class="actions">
          <a class="btn primary" href="#/produit/${p.id}">Détails</a>
          <button class="btn" type="button"
            onclick="try{ (window.addToCart||window.cartAdd||function(){console.log('addToCart mock')})('${p.id}'); }catch(e){}">
            Ajouter au panier
          </button>
          <a class="btn btn-wa" href="https://wa.me/33774230195?text=${encodeURIComponent('Bonjour, je souhaite un devis pour ' + p.sku + ' / ' + p.title)}" target="_blank" rel="noopener">WhatsApp</a>
        </div>
      </div>
    `;
  }).join('');

  listEl.innerHTML = html;
  listEl.scrollIntoView({ behavior:'smooth', block:'start' });
}

/** Filtre utilitaire */
function filterByBrandType(all, brandKey, typeKey) {
  const b = String(brandKey || '').toLowerCase();
  const t = String(typeKey  || '').toLowerCase();
  return all.filter(p =>
    (!b || (p.brand_key||'').toLowerCase() === b) &&
    (!t || (p.category_key||p.category||'').toLowerCase() === t)
  );
}

/** ➜ Étend le routeur catalogue pour gérer brand+type et afficher la liste */
async function handleRouteCatalogue_Extended() {
  const { view, query } = parseHash();
  if (view !== 'catalogue') return;

  // Sélection visuelle de la marque dans la grille
  const selBrand = String(query.brand || '').toLowerCase();
  document.querySelectorAll('#brandGrid a.brand').forEach(a => {
    a.classList.toggle('is-active', (a.dataset.brand || '').toLowerCase() === selBrand);
  });

  // Si on a une marque : afficher les types
  if (query.brand) { await renderTypesForBrand(query.brand); }

  // Si en plus un type est présent : rendre la liste des produits filtrés
  if (query.brand && query.type) {
    const all = await loadProducts();
    const items = filterByBrandType(all, query.brand, query.type);
    renderBrandTypeList(items);
  } else {
    // Pas de type → on vide juste la zone liste (mais on garde la grille + types)
    const listEl = document.getElementById('list');
    if (listEl) listEl.innerHTML = '';
  }
}

/* Remplace l’écouteur précédent par l’étendu */
window.removeEventListener?.('hashchange', handleRouteCatalogue); // au cas où
window.addEventListener('hashchange', handleRouteCatalogue_Extended);
handleRouteCatalogue_Extended();




/* =======================  LISTE PRODUITS (brand + type)  ======================= */

/** Format prix FR */
function fmtPrice(n, c = 'EUR') {
  try { return new Intl.NumberFormat('fr-FR', { style:'currency', currency:c }).format(n); }
  catch { return (typeof n === 'number' ? n.toFixed(2) : String(n || '')) + ' ' + c; }
}

/** Rendu des cartes produit dans #list (sans dépendre d’un autre renderer) */
function renderBrandTypeList(items) {
  const listEl = document.getElementById('list');
  if (!listEl) return;

  if (!items.length) {
    listEl.innerHTML = `<div class="card" style="padding:1rem">Aucun produit pour ce filtre.</div>`;
    listEl.scrollIntoView({ behavior:'smooth', block:'start' });
    return;
  }

  const html = items.map(p => {
    const price = p.price != null ? fmtPrice(p.price, p.currency || 'EUR') : '';
    const old   = p.price_old != null ? fmtPrice(p.price_old, p.currency || 'EUR') : '';
    const img   = (p.img || '/images/pirates-tools-logo.png');

    return `
      <div class="card">
        <div class="head">
          <h3 class="title">${p.title}</h3>
          ${p.badge ? `<span class="badge">${p.badge}</span>` : ``}
        </div>
        <div style="display:grid;grid-template-columns:120px 1fr;gap:12px;padding:1rem 1.1rem;border-bottom:1px solid rgba(255,255,255,.06)">
          <img src="${img}" alt="${p.images_alt || p.title}" onerror="this.src='/images/pirates-tools-logo.png'">
          <div>
            <div style="margin:.2rem 0 .4rem;color:#cfeaf8;font-weight:700;">
              ${price} ${old ? `<span style="opacity:.7;text-decoration:line-through;margin-left:.35rem">${old}</span>` : ``}
            </div>
            <div class="specs">
              ${p.desc ? `<span>${p.desc}</span>` : ``}
              ${p.torque_nm ? `<span>⚙️ ${p.torque_nm} Nm</span>` : ``}
              ${p.weight_kg ? `<span>⚖️ ${p.weight_kg} kg</span>` : ``}
              ${p.length_mm ? `<span>📏 ${p.length_mm} mm</span>` : ``}
            </div>
          </div>
        </div>
        <div class="actions">
          <a class="btn primary" href="#/produit/${p.id}">Détails</a>
          <button class="btn" type="button"
            onclick="try{ (window.addToCart||window.cartAdd||function(){console.log('addToCart mock')})('${p.id}'); }catch(e){}">
            Ajouter au panier
          </button>
          <a class="btn btn-wa" href="https://wa.me/33774230195?text=${encodeURIComponent('Bonjour, je souhaite un devis pour ' + p.sku + ' / ' + p.title)}" target="_blank" rel="noopener">WhatsApp</a>
        </div>
      </div>
    `;
  }).join('');

  listEl.innerHTML = html;
  listEl.scrollIntoView({ behavior:'smooth', block:'start' });
}

/** Filtre utilitaire */
function filterByBrandType(all, brandKey, typeKey) {
  const b = String(brandKey || '').toLowerCase();
  const t = String(typeKey  || '').toLowerCase();
  return all.filter(p =>
    (!b || (p.brand_key||'').toLowerCase() === b) &&
    (!t || (p.category_key||p.category||'').toLowerCase() === t)
  );
}

/** ➜ Étend le routeur catalogue pour gérer brand+type et afficher la liste */
async function handleRouteCatalogue_Extended() {
  const { view, query } = parseHash();
  if (view !== 'catalogue') return;

  // Sélection visuelle de la marque dans la grille
  const selBrand = String(query.brand || '').toLowerCase();
  document.querySelectorAll('#brandGrid a.brand').forEach(a => {
    a.classList.toggle('is-active', (a.dataset.brand || '').toLowerCase() === selBrand);
  });

  // Si on a une marque : afficher les types
  if (query.brand) { await renderTypesForBrand(query.brand); }

  // Si en plus un type est présent : rendre la liste des produits filtrés
  if (query.brand && query.type) {
    const all = await loadProducts();
    const items = filterByBrandType(all, query.brand, query.type);
    renderBrandTypeList(items);
  } else {
    // Pas de type → on vide juste la zone liste (mais on garde la grille + types)
    const listEl = document.getElementById('list');
    if (listEl) listEl.innerHTML = '';
  }
}

/* Remplace l’écouteur précédent par l’étendu */
window.removeEventListener?.('hashchange', handleRouteCatalogue); // au cas où
window.addEventListener('hashchange', handleRouteCatalogue_Extended);
handleRouteCatalogue_Extended();



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
   1) Dock : garantit la structure (CSS-only)
========================================================= */
(function ensureDockShell(){
  var root = document.getElementById('dock');
  if (!root) return;
  root.classList.remove('hidden');
  if (root.firstElementChild && root.firstElementChild.classList && root.firstElementChild.classList.contains('dock__shell')) return;
  var shell = document.createElement('div');
  shell.className = 'dock__shell';
  while (root.firstChild) shell.appendChild(root.firstChild);
  root.appendChild(shell);
})();

/* =========================================================
   2) CTA tel/wa homogènes
========================================================= */
(function syncCTA(){
  if (callBtn) {
    callBtn.setAttribute('href', 'tel:' + PHONE_E164);
    callBtn.innerHTML = '📞 <strong>' + PHONE_HUMAN + '</strong>';
  }
  if (waBtn) {
    waBtn.setAttribute('href', 'https://wa.me/' + PHONE_E164.replace('+',''));
  }
})();

/* =========================================================
   3) Bannière Offline / Online
========================================================= */
(function netBanner(){
  var bar = document.createElement('div');
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

  var hideT = 0;
  var show = function(txt, ok){
    bar.textContent = txt;
    bar.style.display = 'block';
    bar.style.borderColor = ok ? '#00e1b4' : '#ff6b6b';
    clearTimeout(hideT);
    hideT = setTimeout(function(){ bar.style.display='none'; }, 2400);
  };
  window.addEventListener('offline', function(){ show('Hors ligne — contenu en cache', false); });
  window.addEventListener('online',  function(){ show('De nouveau en ligne', true); });
})();

/* =========================================================
   3-bis) A2HS (Add To Home Screen) — iOS tip + Android prompt
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
    s.textContent = '\n      #a2hsTip{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(96px + env(safe-area-inset-bottom,0px));z-index:125;\n        display:flex;gap:.6rem;align-items:center;background:rgba(10,15,20,.92);border:1px solid #22303b;color:#e6edf5;\n        padding:.55rem .7rem;border-radius:10px;box-shadow:0 10px 24px rgba(0,0,0,.35);font:600 14px/1.25 system-ui,-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,Arial,sans-serif}\n      #a2hsTip .a2hs-tip__icon{display:inline-block;padding:.12rem .4rem;border-radius:6px;border:1px solid #22303b;background:rgba(255,255,255,.06)}\n      #a2hsTip .a2hs-tip__close{background:transparent;border:0;color:#9fb4c5;cursor:pointer;font-size:16px}\n      #a2hsTip.out{animation:pt-a2hs-out .18s ease-in both}\n      @keyframes pt-a2hs-out{to{opacity:0;transform:translateX(-50%) translateY(4px)}}\n    ';
    document.head.appendChild(s);
  }

  var DISMISS_KEY = 'pt_a2hs_tip_dismiss_v1';
  var dismissed = false;
  try{ dismissed = localStorage.getItem(DISMISS_KEY) === '1'; }catch(_){}

  function showTip(){
    if (document.getElementById('a2hsTip') || dismissed) return;
    var tip = document.createElement('div');
    tip.id = 'a2hsTip';
    tip.setAttribute('role','dialog');
    tip.setAttribute('aria-live','polite');
    tip.innerHTML = '\n      <div class="a2hs-tip__text">\n        Pour installer l’app&nbsp;: touchez\n        <span class="a2hs-tip__icon">▵</span>\n        puis <strong>«&nbsp;Sur l’écran d’accueil&nbsp;»</strong>.\n      </div>\n      <button class="a2hs-tip__close" aria-label="Fermer">✖</button>\n    ';
    var closeBtn = tip.querySelector('.a2hs-tip__close');
    if (closeBtn) closeBtn.addEventListener('click', function(){
      tip.classList.add('out');
      setTimeout(function(){ tip.remove(); }, 180);
      try{ localStorage.setItem(DISMISS_KEY, '1'); }catch(_){}
    });
    document.body.appendChild(tip);
  }

  var isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
  if (isiOSLike && isSafari && !isStandalone) {
    setTimeout(showTip, 1400);
  }

  var deferredPrompt = null;
  var installBtn = document.getElementById('installBtn');

  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn){
      installBtn.hidden = false;
      if (!installBtn.getAttribute('data-wired')){
        installBtn.setAttribute('data-wired','1');
        installBtn.addEventListener('click', function(){
          (async function(){
            try{
              installBtn.disabled = true;
              await deferredPrompt.prompt();
              var choice = await deferredPrompt.userChoice;
              if (typeof toast === 'function'){
                toast(choice && choice.outcome === 'accepted' ? 'Installation en cours' : 'Installation annulée', (choice && choice.outcome === 'accepted')?'success':'info');
              }
            }catch(_){}
            installBtn.hidden = true;
            installBtn.disabled = false;
            deferredPrompt = null;
          })();
        });
      }
    }
  });

  try{
    if (installBtn && isStandalone) installBtn.hidden = true;
    if (window.matchMedia) {
      var dm = window.matchMedia('(display-mode: standalone)');
      if (dm && typeof dm.addEventListener === 'function'){
        dm.addEventListener('change', function(e){ if (installBtn && e.matches) installBtn.hidden = true; });
      }
    }
  }catch(_){}
})();

/* =========================================================
   4) Logo = retour accueil (SPA, iOS-safe)
========================================================= */
(function wireLogoHome(){
  var logoLink = document.getElementById('homeLink') || document.querySelector('.topbar-logo-link');
  if (!logoLink) return;

  var goHome = function(e){
    e.preventDefault();
    location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  logoLink.addEventListener('click', goHome, false);
  logoLink.addEventListener('pointerup', function(e){
    if (e.pointerType === 'touch') goHome(e);
  }, false);
})();

/* =========================================================
   5) HERO : zoom + fondu (robuste iOS/Android)
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
           document.documentElement.scrollTop ||
           document.body.scrollTop ||
           0;
  };

  var vh = getVH();
  var prevY = -1;
  var rafId = 0;

  function render(y){
    var fin = vh * (mq.matches ? 0.70 : 0.85);
    var raw = Math.max(0, Math.min(1, y / (fin || 1)));
    var p   = easeOutCubic(raw);

    var maxScale = mq.matches ? 3.1 : 2.0;
    var scale    = 1 + (maxScale - 1) * p;

    var tyPxBase = (mq.matches ? 12 : 7) * (vh / 100);
    var tyPx     = tyPxBase * p;

    var opacity  = Math.max(0, Math.min(1, 1 - (mq.matches ? 1.75 : 1.25) * raw));

    var t = 'translate3d(0, '+tyPx.toFixed(2)+'px, 0) scale('+scale.toFixed(3)+')';
    heroLogo.style.transform = t;
    heroLogo.style.webkitTransform = t;
    heroLogo.style.opacity = opacity.toFixed(3);

    var gap = (1 - raw) * (mq.matches ? 18 : 22);
    document.documentElement.style.setProperty('--listGap', gap.toFixed(2)+'vh');

    var done = raw > 0.985;
    document.body.classList.toggle('after-hero', done);
    hero.classList.toggle('hero-out', done);

    if (dock){
      if (raw > 0.97) dock.classList.add('dock--visible');
      else dock.classList.remove('dock--visible');
    }
  }

  function tick(){
    var y = getScrollY();
    if (y !== prevY) {
      render(y);
      prevY = y;
    }
    rafId = requestAnimationFrame(tick);
  }

  if (mqr.matches){
    var t0 = 'translate3d(0,0,0) scale(1)';
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

  var recalc = function(){ vh = getVH(); render(getScrollY()); };
  window.addEventListener('resize', recalc, true);
  if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function'){
    window.visualViewport.addEventListener('resize', recalc, true);
  }
  window.addEventListener('orientationchange', recalc, true);
  document.addEventListener('visibilitychange', function(){ if (!document.hidden) recalc(); }, true);
  window.addEventListener('pageshow', function(e){ if (e.persisted) recalc(); }, true);
  window.addEventListener('pagehide', function(){ cancelAnimationFrame(rafId); }, true);

  render(getScrollY());
})();

/* =========================================================
   5-bis) Accueil — bulles marques (vue dédiée)
========================================================= */
function slugify(str){
  try{
    return String(str||'')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'')
      .toLowerCase();
  }catch(_){
    return String(str||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }
}

var PT_BRANDS = [
  'DeWalt','Milwaukee','Maffle','Makita','feston','flex','stanley','wera','facom'
].map(function(name){ return { name: name, slug: slugify(name) }; });

function ensureHomeView(){
  var home = document.getElementById('view-home');
  if (home) return home;
  home = document.createElement('section');
  home.id = 'view-home';
  home.className = 'view home';
  home.setAttribute('aria-label', 'Accueil');
  home.innerHTML =
    '<div class="container">' +
      '<h1 style="margin:1rem 0 .5rem" tabindex="-1">Bienvenue</h1>' +
      '<p style="margin:0 0 1rem;color:#9fb4c5">Choisissez une marque pour afficher les produits associés.</p>' +
      '<div id="brandGrid" class="brand-grid" role="list"></div>' +
    '</div>';
  if (hero && hero.parentNode) hero.parentNode.insertBefore(home, hero.nextSibling);
  return home;
}

function renderHomeBrands(){
  var home = ensureHomeView();
  var grid = $('#brandGrid', home);
  if (!grid) return;
  grid.innerHTML = PT_BRANDS.map(function(b){
    return '' +
      '<a class="brand" role="listitem" href="#/catalogue" data-brand="'+b.slug+'" data-brand-name="'+b.name+'">' +
        '<span class="brand__bubble">' +
          '<img src="./images/brands/'+b.slug+'.png" alt="'+b.name+'" loading="lazy" decoding="async" />' +
          '<span class="brand__glass" aria-hidden="true"></span>' +
        '</span>' +
        '<span class="brand__label">'+b.name+'</span>' +
      '</a>';
  }).join('');
}

/* Clic bulles → filtre & route catalogue */
(function bindBrandBubbles(){
  document.addEventListener('click', function(e){
    var el = e.target && e.target.closest ? e.target.closest('[data-brand][data-brand-name]') : null;
    if (!el) return;
    e.preventDefault();
    var label = el.getAttribute('data-brand-name') || '';
    if (tagEl) tagEl.value = '';
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
   6) Smooth scroll (depuis une vue → retour home avant scroll)
========================================================= */
(function smoothScrollLinks(){
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function smoothScrollTo(selector){
    var el = selector ? document.querySelector(selector) : null;
    if (!el) return;
    try{ el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    catch(_){ el.scrollIntoView(true); }
  }

  qsa('[data-scroll]').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      var targetSel = a.getAttribute('data-scroll') || a.getAttribute('href') || '';
      var targetIsList = (targetSel && targetSel.toLowerCase) ? (targetSel.toLowerCase() === '#list') : (targetSel === '#list');
      var h = (location.hash || '').toLowerCase();

      if ((!h || h === '#' || h === '#/' || h === '#/home') && targetIsList){
        var fired = false;
        var once = function(){
          if (fired) return; fired = true;
          window.removeEventListener('hashchange', once);
          requestAnimationFrame(function(){ smoothScrollTo('#list'); });
        };
        window.addEventListener('hashchange', once, false);
        location.hash = '#/catalogue';
        setTimeout(function(){ if (!fired) once(); }, 150);
        return;
      }

      var inView = (/^#\//i).test(h);
      if (inView){
        var done = false;
        var once2 = function(){
          if (done) return; done = true;
          window.removeEventListener('hashchange', once2);
          requestAnimationFrame(function(){ smoothScrollTo(targetSel); });
        };
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
   7) Anim “exit” (injection CSS + IntersectionObserver)
========================================================= */
var ScrollExit = (function () {
  function injectExitCSS(){
    if (document.getElementById('exit-anim-css')) return;
    var style = document.createElement('style');
    style.id = 'exit-anim-css';
    style.textContent = '\n@keyframes exitLeft { to { transform: translateX(-60px); opacity: 0; filter: blur(2px); } }\n@keyframes exitRight{ to { transform: translateX(60px);  opacity: 0; filter: blur(2px); } }\n.tool--exit-left  { animation: exitLeft 420ms cubic-bezier(.22,.61,.36,1) forwards; will-change: transform, opacity; }\n.tool--exit-right { animation: exitRight 420ms cubic-bezier(.22,.61,.36,1) forwards; will-change: transform, opacity; }\n@media (prefers-reduced-motion: reduce) { .tool--exit-left,.tool--exit-right { animation: none; opacity: 0; } }';
    document.head.appendChild(style);
  }
  injectExitCSS();

  if (typeof window.IntersectionObserver !== 'function'){
    return { observeWithin: function(){} };
  }

  var flip = false;
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      var el = entry.target;
      if (entry.isIntersecting) { el.classList.remove('tool--exit-left','tool--exit-right'); el.removeAttribute('data-exited'); return; }
      if (el.getAttribute('data-exited') === '1') return;
      if (entry.boundingClientRect.top >= 0) return;
      var cls = flip ? 'tool--exit-right' : 'tool--exit-left';
      flip = !flip;
      void el.offsetWidth;
      el.classList.add(cls);
      el.setAttribute('data-exited','1');
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -10% 0px' });

  function observeWithin(root){ (root||document).querySelectorAll('[data-tool]').forEach(function(el){ io.observe(el); }); }
  return { observeWithin: observeWithin };
})();


/* =========================================================
   8) PANIER (persistant)
========================================================= */
function updateDock(){
  // Compteur (même s’il est masqué en CSS, on garde la logique)
  var n = CART.length;
  if (dockCount){
    dockCount.textContent = n;
    dockCount.style.display = n ? '' : 'none';
  }

  // Vibration douce du caddie UNIQUEMENT si n > 0
  if (dock){
    var cartBtn = document.getElementById('dockCartBtn') || dock.querySelector('.dock__btn--cart');
    if (cartBtn){
      cartBtn.style.animationPlayState = n ? 'running' : 'paused';
    }
  }
}

function saveCart(){
  try { localStorage.setItem(STORE_KEY, JSON.stringify(CART)); } catch(_){}
  updateDock();

  var h = (location.hash || '').toLowerCase();
  if (h.indexOf('#/devis') === 0 && typeof renderCartView === 'function'){
    try { renderCartView(); } catch(_){}
  }

  try { window.dispatchEvent(new CustomEvent('pt:cartChanged')); } catch(_){}
}

function loadCart(){
  try{
    var raw = localStorage.getItem(STORE_KEY);
    CART = raw ? JSON.parse(raw) : [];
  }catch(_){ CART = []; }
  updateDock();
}
loadCart();

function keyOf(p){
  var v = firstDefined(p && p.id, p && p.sku, p && p.title, '');
  return (v==null ? '' : String(v));
}

function groupCart(){
  var map = {};
  for (var i=0;i<CART.length;i++){
    var p = CART[i];
    var k = keyOf(p);
    if (!map[k]) map[k] = { item: p, qty: 0 };
    map[k].qty += 1;
  }
  var out = [];
  for (var k in map){
    if (Object.prototype.hasOwnProperty.call(map, k)) out.push(map[k]);
  }
  return out;
}

/* ===== WhatsApp (Devis + PDP) ===== */
function cartToWhatsAppText(){
  var grouped = groupCart();
  if (!grouped.length) return '';
  var lines = grouped.map(function(g){
    var item = g.item, qty = g.qty;
    var sku = item.sku || item.id || '';
    var title = item.title || (item.brand||'')+' '+(item.sku||'');
    title = title.trim();
    return '• ' + sku + ' – ' + title + (qty>1 ? (' ×'+qty) : '');
  });

  var contact = '';
  try{
    var u = (typeof loadUser === 'function') ? loadUser() : null;
    var arr = [];
    if (u && u.name)  arr.push('Nom: ' + u.name);
    if (u && u.email) arr.push('Email: ' + u.email);
    contact = arr.length ? '\n\nMes coordonnées:\n' + arr.join('\n') : '';
  }catch(_){}

  var link = location.origin + location.pathname + '#/devis';
  return 'Bonjour, je souhaite un devis pour:\n' + lines.join('\n') + '\n\nLien: ' + link + contact + '\n\nMerci.';
}

/* ===== JSON-LD Product (SEO) ===== */
function absoluteUrl(u){
  try { return new URL(u, location.href).href; } catch(_){ return u; }
}
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
  if (Array.isArray(p.gallery)) p.gallery.forEach(function(g){ images.push(absoluteUrl(g)); });

  var price = (typeof p.price === 'number')
    ? p.price
    : (typeof p.price_cents === 'number' ? p.price_cents/100 : undefined);

  var url = location.origin + location.pathname + '#/produit/' + encodeURIComponent(p.id || p.sku || (p.title || ''));

  var data = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": p.title || (p.brand||'')+' '+(p.sku||''),
    "sku":  p.sku || p.id || undefined,
    "mpn":  p.sku || undefined,
    "brand": p.brand ? { "@type": "Brand", "name": p.brand } : undefined,
    "category": p.category || undefined,
    "description": (p.seo && p.seo.description) || p.desc || p.description || undefined,
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

  var prune = function(o){
    if (Array.isArray(o)) return o.map(prune).filter(function(v){ return v != null; });
    if (o && typeof o === 'object'){
      var r = {};
      Object.keys(o).forEach(function(k){
        var pv = prune(o[k]);
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
    var id = 'jsonld-product';
    var old = document.getElementById(id); if (old) old.remove();
    var json = buildProductJsonLD(p);
    if (!json) return;
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = id;
    s.textContent = JSON.stringify(json);
    document.head.appendChild(s);
  }catch(_){}
}
function clearProductJsonLD(){
  var s = document.getElementById('jsonld-product'); if (s) s.remove();
}

/* =========================================================
   9) PRODUITS : rendu liste / PDP
========================================================= */
function productToHTML(m){
  var title = fallback(m.title, (fallback(m.brand,'') + (m.brand?' ':'') + fallback(m.sku,''))).trim();
  var tag   = fallback(m.badge, (Array.isArray(m.tags)&&m.tags[0]) || fallback(m.tag,'')).trim();
  var desc  = fallback(m.desc, fallback(m.description,''));
  var id    = String(fallback(m.id, fallback(m.sku, title)));

  var currency   = m && m.currency ? m.currency : 'EUR';
  var priceCents = (m && typeof m.price_cents === 'number' && isFinite(m.price_cents))
      ? Math.round(m.price_cents)
      : (m && typeof m.price === 'number' && isFinite(m.price)) ? Math.round(m.price*100) : null;
  var priceHtml  = '';
  if (priceCents != null){
    var priceText = '';
    try { priceText = (priceCents/100).toLocaleString('fr-FR', { style:'currency', currency: currency }); }
    catch(_){ priceText = (priceCents/100).toFixed(2)+' '+currency; }
    priceHtml = '<div class="price" aria-label="Prix" style="margin-top:.35rem;font-weight:700">'+priceText+'</div>';
  }

  return '\n  <article class="card" data-tool data-id="'+id+'" data-tag="'+tag+'">\n    <div class="head">\n      <h3 class="title">'+title+'</h3>\n      '+(tag ? '<span class="badge">'+tag+'</span>' : '')+'\n    </div>\n    <div class="specs"><p style="margin:0">'+(desc || '—')+'</p>'+priceHtml+'</div>\n    <div class="actions"><button class="btn primary" data-add="'+id+'">Ajouter au panier</button></div>\n  </article>';
}

function bindAddToCart(scopeData){
  $$('[data-add]', listEl).forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var id = btn.getAttribute('data-add');
      var p  = scopeData.find(function(x){
        return (x.id && String(x.id)===id) || (x.sku && String(x.sku)===id) || (x.title===id);
      });
      if (!p) return;
      CART.push(p);
      saveCart();
      notifyCartAdded(p.title || p.sku || 'Article');
    });
  });
}

function findProductByKey(key){
  if (!key) return null;
  var k = String(key).toLowerCase();
  for (var i=0;i<MODELS.length;i++){
    var m = MODELS[i];
    var id  = String(m && m.id  != null ? m.id  : '').toLowerCase();
    var sku = String(m && m.sku != null ? m.sku : '').toLowerCase();
    var ttl = String(m && m.title!= null ? m.title: '').toLowerCase();
    if (id===k || sku===k || ttl===k) return m;
  }
  return null;
}

function renderPDP(product){
  var wrap   = document.getElementById('pdp');
  if (!wrap) return;

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

  if (elImg){ setSafeImg(elImg, img, product.images_alt || title || ''); }

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
    try { priceEl.textContent = (priceCents/100).toLocaleString('fr-FR',{style:'currency',currency:currency}); }
    catch(_){ priceEl.textContent = (priceCents/100).toFixed(2)+' '+currency; }
  } else {
    priceEl.textContent = '';
  }

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
  var merged = {};
  if (kvFromJson) Object.keys(kvFromJson).forEach(function(k){ if (kvFromJson[k]!=null && kvFromJson[k]!=='') merged[k]=kvFromJson[k]; });
  Object.keys(kvDerived).forEach(function(k){ var v = kvDerived[k]; if (v!=null && v!=='') merged[k]=v; });

  var tableHtml = '';
  if (Object.keys(merged).length){
    var rows = Object.keys(merged).map(function(k){ return '<tr><th>'+k+'</th><td>'+merged[k]+'</td></tr>'; }).join('');
    tableHtml = '\n      <li style="list-style:none; padding:0; margin:.6rem 0 0">\n        <div class="badge" style="margin:0 0 .4rem; display:inline-flex; align-items:center; gap:.4rem">⚙️ Caractéristiques techniques</div>\n        <div style="overflow:auto">\n          <table style="width:100%; border-collapse:collapse; font-size:.95rem">\n            <tbody>'+rows+'</tbody>\n          </table>\n        </div>\n      </li>';
  }

  if (elSpecs) elSpecs.innerHTML = (featHtml || tableHtml) ? (featHtml + tableHtml) : '';

  if (btnQ){
    btnQ.textContent = 'Ajouter au panier';
    btnQ.onclick = function(){
      CART.push(product);
      saveCart();
      notifyCartAdded(product.title || product.sku || 'Article');
    };
  }

  var sku = product.sku || product.id || title;
  var productLink = location.origin + location.pathname + '#/produit/' + encodeURIComponent(product.id || product.sku || title);
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

  if (btnShare){
    btnShare.onclick = function(){
      (async function(){
        try{
          var shareData = { title: title+' • Pirates Tools', text: title, url: productLink };
          if (navigator.share) {
            await navigator.share(shareData);
          } else if (navigator.clipboard && navigator.clipboard.writeText){
            await navigator.clipboard.writeText(productLink);
            toast('Lien copié dans le presse-papiers', 'success');
          }
        }catch(_){}
      })();
    };
  }

  var related = MODELS.filter(function(m){
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
      var cur = (m && m.currency) ? m.currency : 'EUR';
      var pc  = (m && typeof m.price_cents==='number' && isFinite(m.price_cents)) ? Math.round(m.price_cents)
              : (m && typeof m.price==='number' && isFinite(m.price)) ? Math.round(m.price*100) : null;
      var priceLine = '';
      if (pc!=null){
        var ptxt='';
        try { ptxt = (pc/100).toLocaleString('fr-FR',{style:'currency',currency:cur}); }
        catch(_){ ptxt = (pc/100).toFixed(2)+' '+cur; }
        priceLine = '<div class="specs" style="justify-content:flex-end"><strong>'+ptxt+'</strong></div>';
      }
      relHTML += '\n    <article class="card" data-id="'+(m.id || m.sku || m.title)+'">\n      <div class="head">\n        <h3 class="title">'+(m.title || (m.brand||'')+' '+(m.sku||''))+'</h3>\n        '+((m.badge||'') ? '<span class="badge">'+m.badge+'</span>' : '')+'\n      </div>\n      <div class="specs"><p style="margin:0">'+(m.desc || m.description || '')+'</p></div>\n      '+priceLine+'\n      <div class="actions">\n        <button class="btn primary" data-add="'+(m.id || m.sku || m.title)+'">Ajouter au panier</button>\n      </div>\n    </article>\n  ';
    }
    elRelWrap.innerHTML = relHTML;
  }

  if (elRelWrap){
    elRelWrap.addEventListener('click', function(e){
      var btn = e.target.closest ? e.target.closest('[data-add]') : null;
      if (!btn) return;
      var id = btn.getAttribute('data-add');
      var p  = MODELS.find(function(x){ return ((x.id||x.sku||x.title)+'') === id; });
      if (p){
        CART.push(p);
        saveCart();
        notifyCartAdded(p.title || p.sku || 'Article');
      }
      e.stopPropagation();
    });
  }

  $$('.pdp__related .card').forEach(function(card){
    card.addEventListener('click', function(e){
      if (e.target.closest && e.target.closest('[data-add]')) return;
      var id = card.getAttribute('data-id');
      if (!id) return;
      location.hash = '#/produit/' + encodeURIComponent(id);
    });
  });

  injectProductJsonLD(product);
}

function renderList(data){
  if (!Array.isArray(data)) return;
  if (listEl) listEl.innerHTML = data.map(productToHTML).join('\n');

  bindAddToCart(data);

  $$('.card', listEl).forEach(function(card){
    card.addEventListener('click', function(e){
      if (e.target.closest && e.target.closest('[data-add]')) return;
      var id = card.getAttribute('data-id');
      if (!id) return;
      location.hash = '#/produit/' + encodeURIComponent(id);
    });
  });

  ScrollExit.observeWithin(listEl);
}

/* =========================================================
   10) CATALOGUE (catégories auto)
========================================================= */
function buildCategories(){
  var map = new Map();
  for (var i=0;i<MODELS.length;i++){
    var m = MODELS[i];
    var raw = (m.category || m.badge || m.brand || '').toString().trim();
    if (!raw) continue;
    var key = raw.toLowerCase();
    var prev = map.get(key);
    map.set(key, { key: key, label: raw, count: (prev ? prev.count : 0) + 1 });
  }
  return Array.from(map.values()).sort(function(a,b){ return b.count - a.count; });
}

function findSelectMatch(select, keyLower){
  if (!select) return null;
  var opts = Array.prototype.slice.call(select.options || []);
  var m = opts.find(function(o){ return ((o.value||o.textContent||'').toLowerCase() === keyLower); });
  return m ? (m.value || m.textContent) : null;
}

function renderCatalogue(){
  var root = document.getElementById('catList');
  if (!root) return;

  var cats = buildCategories();
  root.innerHTML = cats.length
    ? cats.map(function(c){
        return '\n        <article class="card cat-card" data-cat="'+c.key+'">\n          <div class="head"><h3 class="title">'+c.label+'</h3><span class="badge">Catégorie</span></div>\n          <div class="specs"><p style="margin:0">'+c.count+' produit'+(c.count>1?'s':'')+'</p></div>\n          <div class="actions"><button class="btn primary" data-cat-go="'+c.key+'">Voir</button></div>\n        </article>\n      ';
      }).join('')
    : '<div class="card"><div class="specs"><p style="margin:0">Aucune catégorie détectée.</p></div></div>';

  var go = function(keyLower){
    var matchVal = findSelectMatch(tagEl, keyLower);
    if (tagEl){ tagEl.value = matchVal || ''; }
    if (searchEl){ searchEl.value = matchVal ? '' : keyLower; }
    if (typeof applyFilters === 'function') applyFilters();
    // IMPORTANT : aller vers la vue Produits (et plus l’accueil)
    location.hash = '#/catalogue';
    setTimeout(function(){
      var listNode = document.getElementById('list');
      if (listNode && listNode.scrollIntoView) listNode.scrollIntoView({behavior:'smooth'});
    }, 80);
  };

  root.addEventListener('click', function(e){
    var btn = e.target.closest ? e.target.closest('[data-cat-go]') : null;
    var card = e.target.closest ? e.target.closest('.cat-card') : null;
    if (btn) return go(btn.getAttribute('data-cat-go'));
    if (card) return go(card.getAttribute('data-cat'));
  });
}

/* =========================================================
   11) CHARGEMENT PRODUITS
========================================================= */
async function loadProducts(){
  try{
    var r = await fetch('products.json', { cache:'no-store' });
    var json = await r.json();
    MODELS = Array.isArray(json) ? json : (json.products || []);
    renderList(MODELS);
    renderCatalogue();
    // Rendu home (bulles) à chaud
    renderHomeBrands();
    window.dispatchEvent(new CustomEvent('pt:productsLoaded'));
  }catch(e){
    console.error('Erreur chargement produits:', e);
    if (listEl) listEl.innerHTML = '\n      <div class="card">\n        <div class="head"><h3 class="title">Produits indisponibles</h3></div>\n        <div class="specs"><p>Impossible de charger <code>products.json</code>.</p></div>\n      </div>';
  }
}
loadProducts();

/* =========================================================
   12) FILTRE (debounce)
========================================================= */
function debounce(fn, wait){ if (wait === void 0) wait = 140; var t=0; return function(){ var args=arguments; clearTimeout(t); t=setTimeout(function(){ fn.apply(null,args); }, wait); }; }
var applyFilters = debounce(function(){
  var q = ((searchEl && searchEl.value) || '').trim().toLowerCase();
  var t = ((tagEl && tagEl.value) || '').trim().toLowerCase();

  var filtered = MODELS.filter(function(m){
    var hay = [
      fallback(m.title,''), fallback(m.sku,''), fallback(m.brand,''),
      fallback(m.category,''), fallback(m.desc,fallback(m.description,'')),
      (Array.isArray(m.tags) ? m.tags.join(' ') : ''), fallback(m.badge,'')
    ].join(' ').toLowerCase();

    var okQ  = !q || hay.indexOf(q) !== -1;
    var okT  = !t || hay.indexOf(t) !== -1;
    return okQ && okT;
  });

  renderList(filtered);
}, 120);

if (searchEl) searchEl.addEventListener('input', applyFilters, true);
if (tagEl) tagEl.addEventListener('change', applyFilters);



/* =========================================================
   13) DEVIS (#/devis) — rendu dynamique (centimes + rangée paiement dédiée)
========================================================= */
function renderCartView(){
  var root = $('#devisList');
  if (!root) return;

  var grouped = groupCart();
  if (!grouped.length){
    root.innerHTML = '<p style="margin:0">Aucun article pour le moment.</p>';
  } else {
    root.innerHTML = grouped.map(function(g){
      var item  = g.item || {};
      var qty   = Number(g.qty || 0);
      var sku   = item.sku || item.id || '';
      var title = item.title || ((item.brand||'') + ' ' + (item.sku||'')).trim();
      var key   = keyOf(item);

      var uc = (typeof getUnitCents === 'function') ? getUnitCents(item) : null;
      var priceHtml = '';
      if (uc != null){
        priceHtml =
          '<div class="specs" style="justify-content:flex-end">' +
            '<span style="margin-left:auto">' +
              formatMoneyFromCents(uc) + ' × ' + qty + ' = ' +
              '<strong>' + formatMoneyFromCents(uc * qty) + '</strong>' +
            '</span>' +
          '</div>';
      }

      return '' +
        '<div class="card" style="width:100%">' +
        '  <div class="head">' +
        '    <h3 class="title">' + title + '</h3>' +
        '    <span class="badge">' + sku + '</span>' +
        '  </div>' +
        '  <div class="specs" style="display:flex;gap:.6rem;align-items:center">' +
        '    <button class="btn" data-dec="' + key + '" aria-label="Diminuer">−</button>' +
        '    <strong>' + qty + '</strong>' +
        '    <button class="btn" data-inc="' + key + '" aria-label="Augmenter">+</button>' +
        '    <button class="btn" data-del="' + key + '" style="margin-left:auto;background:rgba(255,255,255,.06);color:#d9e3ec" aria-label="Supprimer">Supprimer</button>' +
        '  </div>' +
           (priceHtml || '') +
        '</div>';
    }).join('');
  }

  var info = computeCartTotal();
  var totalBlock =
    '<div class="specs" id="devisTotal" style="display:flex;justify-content:flex-end">' +
    '  <div>Total estimé : <strong>' +
         (info.hasPrices ? formatMoneyFromCents(Math.round(info.totalCents || 0)) : '—') +
    '  </strong></div>' +
    '</div>';
  root.insertAdjacentHTML('beforeend', totalBlock);

  if (!root.__wired){
    root.__wired = 1;

    delegate(root, '[data-inc]', 'click', function(_e, el){
      var key = el.getAttribute('data-inc');
      var p = MODELS.find(function(m){ return keyOf(m) === key; });
      if (p) CART.push(p);
      saveCart(); renderCartView();
    });

    delegate(root, '[data-dec]', 'click', function(_e, el){
      var key = el.getAttribute('data-dec');
      var i = CART.findIndex(function(p){ return keyOf(p) === key; });
      if (i >= 0) CART.splice(i, 1);
      saveCart(); renderCartView();
    });

    delegate(root, '[data-del]', 'click', function(_e, el){
      var key = el.getAttribute('data-del');
      for (var j = CART.length - 1; j >= 0; j--) if (keyOf(CART[j]) === key) CART.splice(j, 1);
      saveCart(); renderCartView();
    });
  }

  var sendBtn = $('#devisSend');
  if (sendBtn && !sendBtn.__wired){
    sendBtn.__wired = 1;
    sendBtn.addEventListener('click', function(){
      var msg = encodeURIComponent(cartToWhatsAppText());
      if (!msg) return;
      window.open('https://wa.me/' + PHONE_E164.replace('+','') + '?text=' + msg, '_blank', 'noopener');
      toast('Devis ouvert dans WhatsApp', 'success'); announce('Devis ouvert dans WhatsApp');
    });
  }

  var clearBtn = $('#devisClear');
  if (clearBtn && !clearBtn.__wired){
    clearBtn.__wired = 1;
    clearBtn.addEventListener('click', function(){
      CART = [];
      saveCart();
      renderCartView();
      toast('Devis vidé', 'success'); announce('Devis vidé');
    });
  }

  var cardEl = $('#view-devis .card');
  if (cardEl){
    var payRow = document.getElementById('devisPayRow');
    if (!payRow){
      payRow = document.createElement('div');
      payRow.className = 'actions';
      payRow.id = 'devisPayRow';
      cardEl.appendChild(payRow);
    }
    function ensureBtn(id, cls, label, onClick){
      var b = document.getElementById(id);
      if (!b){
        b = document.createElement('button');
        b.id = id; b.className = cls; b.textContent = label;
        payRow.appendChild(b);
      }
      if (!b.__wired){ b.__wired = 1; b.addEventListener('click', onClick); }
    }
    ensureBtn('devisPayStripe','btn primary','Carte / Apple Pay',  payWithStripe);
    ensureBtn('devisPayPayPal','btn',        'PayPal',             payWithPayPal);
    ensureBtn('devisPayCrypto','btn',        'Crypto',             payWithCrypto);
  }
}




/* =========================================================
   13-bis) Paiement multi-moyens (Carte/ApplePay, PayPal, Crypto)
   — calculs 100% en centimes (fiables)
========================================================= */

/* Devise (ne redéfinit pas si déjà présente) */
if (typeof CURRENCY === 'undefined') { var CURRENCY = 'EUR'; }

/* Prix unitaire → centimes (int) */
function getUnitCents(p){
  if (!p) return null;
  if (typeof p.price_cents === 'number' && isFinite(p.price_cents)) return Math.round(p.price_cents);
  if (typeof p.price === 'number' && isFinite(p.price)) return Math.round(p.price * 100);
  if (typeof p.price === 'string'){
    var s = p.price.replace(/\s/g,'').replace(',', '.');
    var v = parseFloat(s);
    if (isFinite(v)) return Math.round(v*100);
  }
  return null;
}

/* Formatage depuis centimes */
function formatMoneyFromCents(cents){
  var v = (cents||0)/100;
  try { return v.toLocaleString('fr-FR', { style:'currency', currency:CURRENCY }); }
  catch(_){ return (Math.round(v*100)/100).toFixed(2) + ' ' + CURRENCY; }
}

/* Compat: anciens appels en euros */
function formatMoney(euros){
  var c = Math.round((euros||0)*100);
  return formatMoneyFromCents(c);
}

/* Total panier en centimes */
function computeCartTotal(){
  var grouped = groupCart();
  var totalCents = 0;
  var counted = 0;
  for (var i=0;i<grouped.length;i++){
    var u = getUnitCents(grouped[i].item);
    if (u != null){ totalCents += u * grouped[i].qty; counted++; }
  }
  return { totalCents: totalCents, total: totalCents/100, hasPrices: counted>0 };
}

/* Remplacement tokens {AMOUNT}/{AMOUNT_CENTS} */
function fillAmount(url, totalCents){
  if (!url) return '';
  var euros = (totalCents/100).toFixed(2);
  var cents = Math.round(totalCents);
  return url.replace(/\{AMOUNT\}/g, euros).replace(/\{AMOUNT_CENTS\}/g, String(cents));
}

/* ===== PayPal : "cart upload" ===== */
function buildPayPalCartUrl(){
  if (!PAYPAL_BUSINESS || PAYPAL_BUSINESS.indexOf('@') === -1) return '';
  var base = 'https://www.paypal.com/cgi-bin/webscr?cmd=_cart&upload=1';
  base += '&business=' + encodeURIComponent(PAYPAL_BUSINESS);
  base += '&currency_code=' + encodeURIComponent(CURRENCY);

  var grouped = groupCart();
  var idx = 1;
  for (var i=0;i<grouped.length;i++){
    var g = grouped[i];
    var uc = getUnitCents(g.item);
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

/* Fallback WhatsApp si pas de prix/config */
function fallbackWhatsAppForPayment(extraLine){
  var msg = cartToWhatsAppText();
  if (!msg) msg = 'Bonjour, je souhaite régler ma commande. Pouvez-vous m’envoyer un lien de paiement ?';
  if (extraLine) msg += '\n\n' + extraLine;
  window.open('https://wa.me/' + PHONE_E164.replace('+','') + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
}

/* --- Ouvertures paiements --- */
function payWithPayPal(){
  if (!CART.length){ toast('Votre panier est vide', 'info'); return; }
  var info = computeCartTotal();
  if (!info.hasPrices){ toast('Prix manquants — redirection WhatsApp.', 'info'); fallbackWhatsAppForPayment('Montant inconnu.'); return; }
  var url = buildPayPalCartUrl();
  if (!url){ toast('PayPal non configuré (email manquant).', 'info'); return; }
  window.open(url, '_blank', 'noopener'); announce('Redirection vers PayPal');
}

function payWithStripe(){
  if (!CART.length){ toast('Votre panier est vide', 'info'); return; }
  var info = computeCartTotal();
  if (!info.hasPrices){ toast('Prix manquants — redirection WhatsApp.', 'info'); fallbackWhatsAppForPayment('Montant inconnu.'); return; }
  if (!STRIPE_PAY_LINK){ toast('Lien Carte/Apple Pay non configuré.', 'info'); return; }
  var url = fillAmount(STRIPE_PAY_LINK, info.totalCents);
  try{ if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText((info.totalCents/100).toFixed(2)); toast('Montant copié : ' + formatMoneyFromCents(info.totalCents), 'success'); } }catch(_){}
  window.open(url, '_blank', 'noopener'); announce('Redirection vers Carte / Apple Pay');
}

function payWithCrypto(){
  if (!CART.length){ toast('Votre panier est vide', 'info'); return; }
  var info = computeCartTotal();
  if (!info.hasPrices){ toast('Prix manquants — redirection WhatsApp.', 'info'); fallbackWhatsAppForPayment('Montant inconnu.'); return; }
  if (!CRYPTO_PAY_LINK){ toast('Lien Crypto non configuré.', 'info'); return; }
  var url = fillAmount(CRYPTO_PAY_LINK, info.totalCents);
  try{ if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText((info.totalCents/100).toFixed(2)); toast('Montant copié : ' + formatMoneyFromCents(info.totalCents), 'success'); } }catch(_){}
  window.open(url, '_blank', 'noopener'); announce('Redirection vers Paiement Crypto');
}



/* =========================================================
   14) DOCK (bas d’écran) — actions
========================================================= */
if (dockQuoteBtn){
  dockQuoteBtn.addEventListener('click', function(){
    var text = cartToWhatsAppText() || 'Bonjour, je souhaite des informations.';
    var msg  = encodeURIComponent(text);
    window.open('https://wa.me/' + PHONE_E164.replace('+','') + '?text=' + msg, '_blank', 'noopener');
  });
}
if (dockCartBtn)  dockCartBtn.addEventListener('click', function(){ location.hash = '#/devis'; });
if (dockCount)     dockCount.addEventListener('click',    function(){ location.hash = '#/devis'; });

/* =========================================================
   15) PWA (SW + update banner) — A2HS géré plus haut
   -> FIX: no reload loop, banner unique, message structuré
========================================================= */
function showUpdateBanner(waitingSW){
  if (document.getElementById('updateBanner')) return; // évite doublons

  var bar = document.createElement('div');
  bar.id = 'updateBanner';
  bar.innerHTML =
    '<div style="display:flex;gap:.6rem;align-items:center">' +
      '<span>Nouvelle version disponible.</span>' +
      '<button class="btn primary" id="btnReload">Mettre à jour</button>' +
    '</div>';
  Object.assign(bar.style, {
    position:'fixed', left:'50%', transform:'translateX(-50%)',
    bottom:'calc(96px + env(safe-area-inset-bottom,0px))',
    background:'rgba(10,15,20,.92)',
    border:'1px solid #22303b',
    padding:'.5rem .7rem', borderRadius:'10px',
    zIndex:'130', boxShadow:'0 10px 24px rgba(0,0,0,.35)',
    color:'#e6edf5',
    font:'600 14px/1.2 system-ui,-apple-system,Inter,Segoe UI,Roboto,Arial,sans-serif'
  });
  document.body.appendChild(bar);

  var btn = bar.querySelector('#btnReload');
  if (btn){
    btn.addEventListener('click', function(){
      try { waitingSW.postMessage({ type:'SKIP_WAITING' }); } catch(_){}
    });
  }
}

(function registerSWOnce(){
  if (!('serviceWorker' in navigator)) return;

  // Garde: on ne recharge qu’UNE SEULE FOIS par session
  var reloadedOnce = false;

  window.addEventListener('load', function(){
    (async function(){
      try {
        var reg = await navigator.serviceWorker.register('sw.js');

        if (reg.waiting) showUpdateBanner(reg.waiting);

        reg.addEventListener('updatefound', function () {
          var sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', function () {
            if (sw.state === 'installed' && reg.waiting) {
              showUpdateBanner(reg.waiting);
            }
          });
        });

        navigator.serviceWorker.addEventListener('controllerchange', function(){
          if (reloadedOnce) return;
          reloadedOnce = true;
          // petit délai pour laisser le nouveau SW prendre le contrôle
          setTimeout(function(){ location.reload(); }, 50);
        });
      } catch (err) {
        console.warn('SW register error:', err);
      }
    })();
  });
})();

window.addEventListener('online',  function(){ toast('Connexion rétablie', 'success'); });
window.addEventListener('offline', function(){ toast('Vous êtes hors ligne', 'info'); });


/* =========================================================
   16) COMPTE & FIDÉLITÉ (démo locale)
========================================================= */
function loadUser(){
  try{
    var v = JSON.parse(localStorage.getItem(USER_KEY));
    return v || { name:'', email:'', spent:0 };
  } catch(_){ return { name:'', email:'', spent:0 }; }
}
function saveUser(u){ try{ localStorage.setItem(USER_KEY, JSON.stringify(u)); }catch(_){} }
function gradeFromSpent(spent){
  if (spent >= 5000) return { label:'Excellent acheteur', color:'#00e1b4' };
  if (spent >= 1000) return { label:'Bon acheteur',       color:'#19d3ff' };
  return { label:'Moussaillon', color:'#9fb4c5' };
}
function renderAccount(){
  var u = loadUser();
  var nameEl = $('#accName'); if (nameEl) nameEl.setAttribute('value', u.name || '');
  var mailEl = $('#accEmail'); if (mailEl) mailEl.setAttribute('value', u.email || '');
  var spentEl= $('#accSpent'); if (spentEl) spentEl.textContent = (u.spent.toLocaleString('fr-FR') + ' €');

  var g = gradeFromSpent(u.spent);
  var gradeEl = $('#accGrade'); if (gradeEl){ gradeEl.textContent = g.label; gradeEl.style.borderColor = g.color; }

  var pct = clamp((u.spent/5000)*100, 0, 100);
  var fill = $('#accFill');   if (fill)   fill.style.width = pct + '%';
  var cur  = $('#accCursor'); if (cur)    cur.style.left  = pct + '%';
  var slider = $('#accSlider'); if (slider) slider.value = Math.min(u.spent, 5000);

  var saveBtn = $('#accSave');
  if (saveBtn) saveBtn.addEventListener('click', function(){
    var nu = { name: ($('#accName') && $('#accName').value) || '', email: ($('#accEmail') && $('#accEmail').value) || '', spent: u.spent };
    saveUser(nu);
  }, { once:true });

  var resetBtn = $('#accReset');
  if (resetBtn) resetBtn.addEventListener('click', function(){
    saveUser({ name:u.name, email:u.email, spent:0 });
    renderAccount();
  }, { once:true });

  var sliderEl = $('#accSlider');
  if (sliderEl) sliderEl.addEventListener('input', function(e){
    var spent = Number(e.target.value || 0);
    var nu = { name: u.name, email: u.email, spent: spent };
    saveUser(nu);
    renderAccount();
  });
}



/* =========================================================
   17) ROUTER (#/…)
   - Accueil = hero + #view-home (bulles)
   - Autres vues = sections dédiées
   - Toolbar + main (#list) + ratings MASQUÉS en accueil
========================================================= */
(function(){
  // Utilise les fonctions globales définies plus haut :
  // ensureHomeView() et renderHomeBrands()
  ensureHomeView();
  renderHomeBrands();

  var elToolbar  = document.querySelector('.toolbar');
  var elMain     = document.querySelector('main.container');
  var elRatings  = document.querySelector('.ratings');

  var HOME_PARTS = [
    document.getElementById('hero')
  ].filter(function(x){ return !!x; });

  var VIEWS = {
    home:      document.getElementById('view-home'),
    catalogue: document.getElementById('view-catalogue'),
    devis:     document.getElementById('view-devis'),
    produit:   document.getElementById('view-produit'),
    compte:    document.getElementById('view-compte')
  };

  var showHero     = function(yes){ HOME_PARTS.forEach(function(el){ el.classList.toggle('hidden', !yes); }); };
  var hideAllViews = function(){ Object.keys(VIEWS).forEach(function(k){ var el=VIEWS[k]; if (el) el.classList.add('hidden'); }); };
  var showView     = function(key){ if (VIEWS[key]) VIEWS[key].classList.remove('hidden'); };

  function toggleIndexParts(visible){
    if (elToolbar) elToolbar.classList.toggle('hidden', !visible);
    if (elMain)    elMain.classList.toggle('hidden', !visible);
    if (elRatings) elRatings.classList.toggle('hidden', !visible);
  }

  var prevHash = '';

  function ensureDockVisibleOnViews(isHome){
    if (!dock) return;
    if (isHome){
      // visibilité gérée par l’animation du hero
    }else{
      dock.classList.add('dock--visible');
    }
  }

  function wireBack(cameFrom){
    var back = document.querySelector('#pdpBack, .chip--back');
    if (!back) return;
    back.onclick = function(e){
      e.preventDefault();
      if (cameFrom && cameFrom !== location.hash) { location.hash = cameFrom; return; }
      if (history.length > 1) { history.back(); return; }
      location.hash = '';
    };
  }

  function onRoute(){
    var h = (location.hash || '').toLowerCase();
    var cameFrom = prevHash;

    // #/produit/:id
    var m = h.match(/^#\/produit\/([^/?#]+)/);
    if (m){
      var key = decodeURIComponent(m[1]);
      var tryRender = function(){
        var p = findProductByKey(key);
        showHero(false); hideAllViews(); showView('produit'); toggleIndexParts(true); ensureDockVisibleOnViews(false);
        if (p){
          renderPDP(p);
          injectProductJsonLD(p);
          setPageMeta('Pirates Tools • ' + (p.title || p.sku || 'Produit'), (p.seo && p.seo.description) || p.desc || p.description || DEFAULT_DESC);
        }else{
          if ($('#pdpTitle')) $('#pdpTitle').textContent = 'Produit introuvable';
          if ($('#pdpDesc'))  $('#pdpDesc').textContent  = 'Vérifiez la référence ou revenez au catalogue.';
          clearProductJsonLD();
          resetPageMeta();
        }
        wireBack(cameFrom);
        window.scrollTo({top:0, behavior:'auto'});
        focusView('produit');
        prevHash = h;
      };
      if (!MODELS.length){
        var once = function(){ window.removeEventListener('pt:productsLoaded', once); tryRender(); };
        window.addEventListener('pt:productsLoaded', once, { once:true });
      }else{
        tryRender();
      }
      return;
    }

    // #/catalogue
    m = h.match(/^#\/catalogue\b/);
    if (m){
      showHero(false); hideAllViews(); showView('catalogue'); toggleIndexParts(true); ensureDockVisibleOnViews(false); renderCatalogue();
      clearProductJsonLD(); resetPageMeta();
      window.scrollTo({top:0,behavior:'auto'});
      focusView('catalogue');
      prevHash=h; return;
    }

    // #/devis
    m = h.match(/^#\/devis\b/);
    if (m){
      showHero(false); hideAllViews(); showView('devis'); toggleIndexParts(false); ensureDockVisibleOnViews(false); renderCartView();
      clearProductJsonLD(); resetPageMeta();
      window.scrollTo({top:0,behavior:'auto'});
      focusView('devis');
      prevHash=h; return;
    }

    // #/compte
    m = h.match(/^#\/compte\b/);
    if (m){
      showHero(false); hideAllViews(); showView('compte'); toggleIndexParts(false); ensureDockVisibleOnViews(false); renderAccount();
      clearProductJsonLD(); resetPageMeta();
      window.scrollTo({top:0,behavior:'auto'});
      focusView('compte');
      prevHash=h; return;
    }

    // Accueil
    if (h === '' || h === '#' || h === '#/' || h === '#/home'){
      showHero(true); hideAllViews(); showView('home'); toggleIndexParts(false); ensureDockVisibleOnViews(true);
      clearProductJsonLD(); resetPageMeta();
      window.scrollTo({top:0,behavior:'auto'});
      focusView('home');
      prevHash = h; return;
    }

    // fallback : accueil
    showHero(true); hideAllViews(); showView('home'); toggleIndexParts(false); ensureDockVisibleOnViews(true);
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
  var PT = (window.PT = window.PT || {});

  PT.getSWVersion = async function getSWVersion(timeoutMs){
    if (timeoutMs === void 0) timeoutMs = 1500;
    if (!('serviceWorker' in navigator)) return null;
    var reg = await navigator.serviceWorker.getRegistration();
    if (!reg || !navigator.serviceWorker.controller) return null;
    return await new Promise(function(resolve){
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
  };

  PT.clearCaches = async function clearCaches(timeoutMs){
    if (timeoutMs === void 0) timeoutMs = 1500;
    if (!('serviceWorker' in navigator)) return false;
    var reg = await navigator.serviceWorker.getRegistration();
    if (!reg || !navigator.serviceWorker.controller) return false;
    return await new Promise(function(resolve){
      var t = setTimeout(function(){ resolve(false); }, timeoutMs);
      var onMsg = function(e){
        var d = e.data;
        if (d && d.type === 'CACHES_CLEARED') {
          clearTimeout(t);
          navigator.serviceWorker.removeEventListener('message', onMsg);
          toast('Caches vidés', 'success');
          resolve(true);
        }
      };
      navigator.serviceWorker.addEventListener('message', onMsg);
      try{ reg.active && reg.active.postMessage && reg.active.postMessage('CLEAR_CACHES'); }catch(_){ clearTimeout(t); resolve(false); }
    });
  };

  function paramEnabled(){
    try{
      var p = new URL(location.href).searchParams;
      return p.get('selftest') === '1';
    }catch(_){ return false; }
  }

  function addStyleOnce(){
    if (document.getElementById('pt-selftest-css')) return;
    var s = document.createElement('style');
    s.id = 'pt-selftest-css';
    s.textContent = '\n      #ptSelfTest{position:fixed; right:12px; bottom: calc(12px + env(safe-area-inset-bottom,0px)); z-index:140;\n        background:rgba(10,15,20,.95); color:#e6edf5; border:1px solid #22303b; border-radius:12px;\n        min-width:260px; max-width:360px; box-shadow:0 16px 32px rgba(0,0,0,.4); font:600 14px/1.3 system-ui,-apple-system,Inter,Roboto,Arial,sans-serif}\n      #ptSelfTest .head{padding:.6rem .8rem; border-bottom:1px solid #22303b; display:flex; align-items:center; justify-content:space-between}\n      #ptSelfTest .list{max-height:50vh; overflow:auto; padding:.4rem .8rem}\n      #ptSelfTest .row{display:grid; grid-template-columns:18px 1fr; gap:.6rem; padding:.35rem 0; align-items:center}\n      #ptSelfTest .dot{width:10px; height:10px; border-radius:50%}\n      #ptSelfTest .ok{background:#00e1b4} .warn{background:#ffb020} .ko{background:#ff6b6b}\n      #ptSelfTest .foot{padding:.5rem .8rem; border-top:1px solid #22303b; display:flex; gap:.5rem; justify-content:flex-end}\n      #ptSelfTest button{border:1px solid #22303b; background:rgba(255,255,255,.06); color:#e6edf5; padding:.35rem .6rem; border-radius:8px; cursor:pointer}\n    ';
    document.head.appendChild(s);
  }

  function panel(){
    addStyleOnce();
    var wrap = document.createElement('div');
    wrap.id = 'ptSelfTest';
    wrap.innerHTML = '\n      <div class="head"><div>Auto-test Pirates Tools</div><button id="ptClose">✖</button></div>\n      <div class="list" id="ptList"></div>\n      <div class="foot">\n        <button id="ptReload">Recharger</button>\n        <button id="ptClearCaches">Vider caches SW</button>\n      </div>\n    ';
    document.body.appendChild(wrap);
    var c = $('#ptClose', wrap); if (c) c.addEventListener('click', function(){ wrap.remove(); });
    var r = $('#ptReload', wrap); if (r) r.addEventListener('click', function(){ location.reload(); });
    var cc= $('#ptClearCaches', wrap); if (cc) cc.addEventListener('click', function(){ PT.clearCaches(); });
    return { root: wrap, list: $('#ptList', wrap) };
  }

  function add(list, label, status){
    var row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = '<span class="dot '+status+'"></span><span>'+label+'</span>';
    list.appendChild(row);
  }

  async function runSelfTest(){
    var p = panel();
    var list = p.list;

    add(list, 'UX CSS injecté', document.getElementById('pt-ux-css') ? 'ok' : 'ko');
    add(list, 'A2HS CSS injecté', document.getElementById('pt-a2hs-css') ? 'ok' : 'warn');
    add(list, 'Dock présent', document.getElementById('dock') ? 'ok' : 'ko');
    add(list, 'Dock shell', document.querySelector('#dock .dock__shell') ? 'ok' : 'warn');
    add(list, 'Toasts prêts', document.getElementById('toasts') ? 'ok' : 'ko');
    add(list, 'Zone live (a11y)', (document.getElementById('sr-live') || document.getElementById('srLive')) ? 'ok' : 'ko');

    var telOk = !!(callBtn && callBtn.href && callBtn.href.indexOf('tel:+33774230195') !== -1);
    var waOk  = !!(waBtn && waBtn.href && /wa\.me\/33774230195/.test(waBtn.href));
    add(list, 'CTA téléphone', telOk ? 'ok' : 'ko');
    add(list, 'CTA WhatsApp',  waOk  ? 'ok' : 'ko');

    add(list, 'products.json chargé', MODELS.length ? 'ok' : 'warn');

    var viewsOk = ['view-home','view-catalogue','view-devis','view-produit','view-compte'].every(function(id){ return document.getElementById(id); });
    add(list, 'Vues présentes', viewsOk ? 'ok' : 'ko');

    try{
      injectProductJsonLD({ title:'Test', sku:'TEST-1', desc:'Desc test' });
      var jsonld = document.getElementById('jsonld-product');
      var ok = !!(jsonld && jsonld.textContent && jsonld.textContent.indexOf('"@type":"Product"') !== -1);
      add(list, 'JSON-LD injecté', ok ? 'ok' : 'ko');
      clearProductJsonLD();
      add(list, 'JSON-LD nettoyé', document.getElementById('jsonld-product') ? 'ko' : 'ok');
    }catch(_){ add(list, 'JSON-LD', 'warn'); }

    var swStatus = 'warn';
    try{
      if ('serviceWorker' in navigator){
        var reg = await navigator.serviceWorker.getRegistration();
        swStatus = reg ? 'ok' : 'warn';
      } else swStatus = 'warn';
    }catch(_){ swStatus = 'warn'; }
    add(list, 'Service Worker enregistré', swStatus);

    try{
      var ver = await PT.getSWVersion();
      add(list, 'SW version' + (ver?(' ('+ver+')'):'') , ver ? 'ok' : 'warn');
    }catch(_){ add(list, 'SW version', 'warn'); }

    try{
      var beforeTitle = document.title;
      var beforeDesc  = META_DESC_EL ? META_DESC_EL.getAttribute('content') : '';
      setPageMeta('PT • Test', 'Meta test');
      var okSet = (document.title==='PT • Test') && ((META_DESC_EL ? META_DESC_EL.getAttribute('content') : '')==='Meta test');
      resetPageMeta();
      var okReset = (document.title===DEFAULT_TITLE) && ((META_DESC_EL ? META_DESC_EL.getAttribute('content') : '')===DEFAULT_DESC);
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





/* ===================== Brand grid (bulles de marques) ===================== */
const BRAND_META = {
  dewalt:    { label: 'DeWALT',    logo: './images/brands/Logo.dewalt.png' },
  makita:    { label: 'Makita',    logo: './images/brands/Logo.makita.png' },
  milwaukee: { label: 'Milwaukee', logo: './images/brands/Logo.milwaukee.png' },
  festool:   { label: 'Festool',   logo: './images/brands/Logo.festool.png' },
  flex:      { label: 'FLEX',      logo: './images/brands/Logo.flex.png' },
  wera:      { label: 'Wera',      logo: './images/brands/Logo.wera.png' },
  facom:     { label: 'Facom',     logo: './images/brands/Logo.facom.png' },
  stanley:   { label: 'Stanley',   logo: './images/brands/Logo.stanley.png' },
};

/** Construit la liste des marques présentes dans les produits */
function computeBrands(products) {
  const counts = {};
  for (const p of products || []) {
    const k = (p.brand_key || '').toLowerCase();
    if (!BRAND_META[k]) continue;           // on ignore les marques inconnues
    counts[k] = (counts[k] || 0) + 1;
  }
  return Object.keys(counts)
    .sort((a, b) => BRAND_META[a].label.localeCompare(BRAND_META[b].label))
    .map(k => ({ key: k, count: counts[k], ...BRAND_META[k] }));
}

/** Rend la grille dans #brandGrid */
function renderBrandGrid(products) {
  const host = document.getElementById('brandGrid');
  if (!host) return;
  const brands = computeBrands(products);
  if (!brands.length) { host.innerHTML = ''; return; }

  host.innerHTML = brands.map(b => `
    <button class="brand" type="button" data-brand="${b.key}" aria-label="Voir ${b.label}">
      <span class="brand__bubble">
        <img class="brand__logo" src="${b.logo}" alt="${b.label}"
             onerror="this.src='./images/pirates-tools-logo.png'">
      </span>
      <span class="brand__label">${b.label}</span>
    </button>
  `).join('');
}

/* Navigation quand on clique une bulle */
(function attachBrandGridHandler(){
  const host = document.getElementById('brandGrid');
  if (!host) return;
  host.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-brand]');
    if (!btn) return;
    const key = btn.dataset.brand;
    window.location.hash = `#/catalogue?brand=${encodeURIComponent(key)}`;
  });
})();








