/**
 * Pirates Tools – Application front
 *
 * Ce fichier a été entièrement réécrit pour fournir une base
 * simple mais fonctionnelle. Il implémente :
 *   - Chargement des produits (products.json)
 *   - Grille des marques sur la page d’accueil
 *   - Catalogue filtrable par marque
 *   - Fiche produit avec ajout au panier
 *   - Panier persistant via localStorage
 *   - Navigation de type SPA (hash router)
 *
 * Le code reste volontairement concis afin de faciliter la
 * maintenance. Aucun framework externe n’est requis.
 */

'use strict';

/* ------------------------------------------------------------------
   Helpers DOM
------------------------------------------------------------------ */
function $(sel, root){ return (root || document).querySelector(sel); }
function $$(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

function createEl(tag, cls){
  var el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
}

/* ------------------------------------------------------------------
   Chargement des produits
------------------------------------------------------------------ */
var PRODUCTS = [];

function loadProducts(){
  if (PRODUCTS.length) return Promise.resolve(PRODUCTS);
  return fetch('products.json', { cache: 'no-store' })
    .then(function(res){ return res.json(); })
    .then(function(data){
      PRODUCTS = Array.isArray(data) ? data : [];
      return PRODUCTS;
    })
    .catch(function(){
      PRODUCTS = [];
      return PRODUCTS;
    });
}

/* ------------------------------------------------------------------
   Marque → grille sur la page d’accueil
------------------------------------------------------------------ */
function getBrands(list){
  var map = {};
  (list || []).forEach(function(p){
    var key = (p.brand_key || '').toLowerCase();
    if (!key) return;
    if (!map[key]) map[key] = {
      key: key,
      label: p.brand || key,
      count: 0,
      logo: './images/brands/Logo.' + key + '.png'
    };
    map[key].count++;
  });
  return Object.keys(map).sort().map(function(k){ return map[k]; });
}

function renderBrandGrid(list){
  var host = $('#brandGrid');
  if (!host) return;
  var brands = getBrands(list);
  if (!brands.length){
    host.innerHTML = '<p class="empty">Vide</p>';
    return;
  }
  host.innerHTML = '';
  brands.forEach(function(b){
    var a = createEl('a', 'brand');
    a.href = '#/catalogue?brand=' + encodeURIComponent(b.key);
    a.setAttribute('data-brand', b.key);
    a.innerHTML = '' +
      '<span class="brand__bubble">' +
        '<img class="brand__img" src="' + b.logo + '" alt="' + b.label +
        '" loading="lazy" decoding="async" onerror="this.src=\'./images/pirates-tools-logo.png\'">' +
      '</span>' +
      '<span class="brand__label">' + b.label + '</span>';
    host.appendChild(a);
  });
}

/* ------------------------------------------------------------------
   Catalogue & filtres
------------------------------------------------------------------ */
function renderCatalogue(all, brand){
  var listEl = $('#list');
  var catList = $('#catList');
  if (!listEl) return;

  var items = (all || []).filter(function(p){
    if (brand && (p.brand_key || '').toLowerCase() !== String(brand).toLowerCase()) return false;
    return true;
  });

  if (!items.length){
    listEl.innerHTML = '<p class="empty">Vide</p>';
    return;
  }

  listEl.innerHTML = items.map(function(p){
    var price = (p.price != null) ? p.price.toFixed(2) + ' ' + (p.currency || 'EUR') : '';
    var img = p.img || './images/pirates-tools-logo.png';
    return '' +
      '<div class="card">' +
        '<div class="head"><h3 class="title">' + (p.title || '') + '</h3></div>' +
        '<div style="display:grid;grid-template-columns:120px 1fr;gap:12px;padding:1rem 1.1rem;border-bottom:1px solid rgba(255,255,255,.06)">' +
          '<img src="' + img + '" alt="' + (p.images_alt || p.title || '') + '" onerror="this.src=\'./images/pirates-tools-logo.png\'">' +
          '<div>' +
            '<div style="margin:.2rem 0 .4rem;color:#cfeaf8;font-weight:700;">' + price + '</div>' +
            '<div class="specs">' + (p.desc ? '<span>' + p.desc + '</span>' : '') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="actions">' +
          '<a class="btn primary" href="#/produit/' + encodeURIComponent(p.id) + '">Détails</a>' +
          '<button class="btn" data-add="' + p.id + '">Ajouter au panier</button>' +
        '</div>' +
      '</div>';
  }).join('');

  // petite grille des types (catégories) si besoin
  if (catList){
    var map = {};
    items.forEach(function(p){
      var key = (p.category_key || p.category || 'autres').toLowerCase();
      var name = p.category || p.category_key || 'Autres';
      if (!map[key]) map[key] = { name: name, count: 0 };
      map[key].count++;
    });
    var html = Object.keys(map).map(function(k){
      return '<div class="cat-card" data-type="' + k + '"><strong>' + map[k].name + '</strong><br><span style="opacity:.75;font-size:.95rem">' + map[k].count + ' modèle' + (map[k].count>1?'s':'') + '</span></div>';
    }).join('');
    catList.innerHTML = html;
  }
}

/* ------------------------------------------------------------------
   Produit (PDP)
------------------------------------------------------------------ */
function renderProduct(p){
  var t = $('#pdpTitle');
  var d = $('#pdpDesc');
  var img = $('#pdpImg');
  var btn = $('#pdpAddBtn');
  if (!p){
    if (t) t.textContent = 'Produit introuvable';
    if (d) d.textContent = '';
    if (img) img.src = './images/pirates-tools-logo.png';
    return;
  }
  if (t) t.textContent = p.title || '';
  if (d) d.textContent = p.description || p.desc || '';
  if (img){
    img.src = p.img || './images/pirates-tools-logo.png';
    img.alt = p.images_alt || p.title || '';
  }
  if (btn){
    btn.onclick = function(){ addToCart(p.id); };
  }
}

/* ------------------------------------------------------------------
   Panier persistant
------------------------------------------------------------------ */
var STORE_KEY = 'pt_cart_v2';
var CART = [];

function loadCart(){
  try{ CART = JSON.parse(localStorage.getItem(STORE_KEY) || '[]') || []; }
  catch(_){ CART = []; }
}
function saveCart(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(CART)); }catch(_){ }
  updateDock();
}
function updateDock(){
  var count = CART.reduce(function(sum, it){ return sum + (it.qty || 1); }, 0);
  var badge = $('#dockCount');
  if (badge){
    badge.textContent = count;
    badge.style.display = count ? '' : 'none';
  }
}
function addToCart(id){
  var it = CART.find(function(x){ return x.id === id; });
  if (it) it.qty = (it.qty || 1) + 1;
  else CART.push({ id: id, qty: 1 });
  saveCart();
}
function removeFromCart(id){
  CART = CART.filter(function(x){ return x.id !== id; });
  saveCart();
  renderCartView();
}
function renderCartView(){
  var host = $('#devisList');
  if (!host) return;
  if (!CART.length){ host.innerHTML = '<p class="empty">Vide</p>'; return; }
  loadProducts().then(function(all){
    host.innerHTML = '';
    CART.forEach(function(it){
      var p = all.find(function(pr){ return pr.id === it.id; });
      var card = createEl('div', 'card');
      card.innerHTML = '<strong>' + (p ? p.title : it.id) + '</strong> × ' + it.qty +
        ' <button class="btn" data-del="' + it.id + '">Supprimer</button>';
      host.appendChild(card);
    });
  });
}

loadCart();
updateDock();

/* ------------------------------------------------------------------
   Router (hash-based)
------------------------------------------------------------------ */
var VIEWS = {
  home:      $('#view-home'),
  catalogue: $('#view-catalogue'),
  devis:     $('#view-devis'),
  produit:   $('#view-produit'),
  compte:    $('#view-compte'),
  contact:   $('#view-contact')
};
var HERO = $('#hero');

function showView(name){
  Object.keys(VIEWS).forEach(function(k){
    if (VIEWS[k]) VIEWS[k].classList.toggle('hidden', k !== name);
  });
  if (HERO) HERO.classList.toggle('hidden', name !== 'home');
}

function parseHash(){
  var h = location.hash || '#/';
  if (h.indexOf('#/produit/') === 0){
    return { view: 'produit', id: decodeURIComponent(h.slice(10)) };
  }
  var q = {};
  var parts = h.split('?');
  var path = parts[0].replace('#/', '');
  if (parts[1]){
    parts[1].split('&').forEach(function(p){
      var s = p.split('=');
      q[decodeURIComponent(s[0]||'')] = decodeURIComponent(s[1]||'');
    });
  }
  return { view: path || 'home', query: q };
}

function handleRoute(){
  var r = parseHash();
  if (r.view === 'catalogue'){
    showView('catalogue');
    loadProducts().then(function(all){ renderCatalogue(all, r.query.brand); });
  }
  else if (r.view === 'produit'){
    showView('produit');
    loadProducts().then(function(all){
      var p = all.find(function(pr){ return pr.id === r.id || pr.slug === r.id; });
      renderProduct(p);
    });
  }
  else if (r.view === 'devis'){
    showView('devis');
    renderCartView();
  }
  else if (r.view === 'compte'){
    showView('compte');
  }
  else if (r.view === 'contact'){
    showView('contact');
  }
  else {
    showView('home');
    loadProducts().then(renderBrandGrid);
  }
}

window.addEventListener('hashchange', handleRoute);
document.addEventListener('DOMContentLoaded', function(){
  handleRoute();
  var hl = $('#heroLogo');
  if (hl) hl.classList.add('on');
});

/* ------------------------------------------------------------------
   Interactions globales
------------------------------------------------------------------ */
// Ajout / suppression panier via délégation
addEventListener('click', function(e){
  var add = e.target && e.target.getAttribute('data-add');
  if (add){ e.preventDefault(); addToCart(add); }
  var del = e.target && e.target.getAttribute('data-del');
  if (del){ e.preventDefault(); removeFromCart(del); }
});

// Navigation via clic sur les cartes de catégories
addEventListener('click', function(e){
  var cat = e.target && e.target.closest && e.target.closest('.cat-card');
  if (cat && cat.getAttribute('data-type')){
    var h = parseHash();
    var q = new URLSearchParams({ brand: h.query.brand || '', type: cat.getAttribute('data-type') });
    location.hash = '#/catalogue?' + q.toString();
  }
});

var dockCartBtn = $('#dockCartBtn');
if (dockCartBtn) dockCartBtn.addEventListener('click', function(){
  location.hash = '#/devis';
});
var dockQuoteBtn = $('#dockQuoteBtn');
if (dockQuoteBtn) dockQuoteBtn.addEventListener('click', function(){
  window.open('https://wa.me/33774230195', '_blank');
});

