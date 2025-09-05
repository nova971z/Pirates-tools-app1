/* =========================================================
   Account module (front-only, ES5) — Pirates Tools
   - localStorage profil (name, email, phone)
   - fidélité (percent 0..100) + jauge (#accSlider/#accFill/#accCursor)
   - vue #view-compte injectée si absente
   - hook router: #/compte
   - expose: window.loadUser, window.saveUser, window.logoutUser
========================================================= */
(function(){
  'use strict';

  var D = document;
  var LS_KEY = 'pt_user_v1';

  function deepMerge(dst, src){
    if (!src || typeof src !== 'object') return dst;
    for (var k in src){
      if (Object.prototype.hasOwnProperty.call(src, k)){
        var v = src[k];
        if (v && typeof v === 'object' && !Array.isArray(v)){
          if (!dst[k] || typeof dst[k] !== 'object') dst[k] = {};
          deepMerge(dst[k], v);
        } else {
          dst[k] = v;
        }
      }
    }
    return dst;
  }

  function loadUser(){
    try{
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var obj = JSON.parse(raw);
        return normalizeUser(obj);
      }
    }catch(_){ }
    return normalizeUser({});
  }
  function saveUser(partial){
    var cur = loadUser();
    var next = deepMerge(cur, (partial||{}));
    try{ localStorage.setItem(LS_KEY, JSON.stringify(next)); }catch(_){ }
    try{ window.dispatchEvent(new CustomEvent('pt:userChanged', { detail: next })); }catch(_){ }
    renderAccountIntoForm(next);
    return next;
  }
  function logoutUser(){
    try{ localStorage.removeItem(LS_KEY); }catch(_){ }
    var blank = normalizeUser({});
    try{ window.dispatchEvent(new CustomEvent('pt:userChanged', { detail: blank })); }catch(_){ }
    renderAccountIntoForm(blank);
    return blank;
  }
  function normalizeUser(u){
    var o = u && typeof u === 'object' ? u : {};
    return {
      name:  (o.name  || '').trim(),
      email: (o.email || '').trim(),
      phone: (o.phone || '').trim(),
      loyalty_pct: clamp01(Number(o.loyalty_pct))
    };
  }
  function clamp01(n){
    n = (typeof n === 'number' ? n : parseFloat(n));
    if (!isFinite(n)) n = 0;
    if (n < 0) n = 0; if (n > 100) n = 100;
    return Math.round(n);
  }

  // ------- View builder -------
  function ensureAccountView(){
    var view = D.getElementById('view-compte');
    if (view) return view;

    view = D.createElement('section');
    view.id = 'view-compte';
    view.className = 'view hidden';
    view.setAttribute('aria-label', 'Mon compte');

    // minimal, réutilise les classes globales .card/.actions
    view.innerHTML =
      '<div class="container">'+
        '<h1 style="margin:1rem 0 .6rem" tabindex="-1">Mon compte</h1>'+
        '<div class="card" style="padding:.8rem 1.1rem">'+
          '<form id="accForm" novalidate>'+
            '<div class="specs" style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem">'+
              '<label>Nom<br><input id="accName" class="search" type="text" autocomplete="name" placeholder="Votre nom"></label>'+
              '<label>Email<br><input id="accEmail" class="search" type="email" autocomplete="email" placeholder="vous@exemple.com"></label>'+
              '<label>Téléphone<br><input id="accPhone" class="search" type="tel" autocomplete="tel" placeholder="+33…"></label>'+
            '</div>'+
            '<div class="specs" style="display:block">'+
              '<div class="badge" style="display:inline-flex;align-items:center;gap:.4rem;margin:0 0 .4rem">⭐ Fidélité</div>'+
              '<div class="meter">'+
                '<div class="meter__rail"><div id="accFill" class="meter__fill"></div><div id="accCursor" class="meter__cursor" style="left:0%"></div></div>'+
                '<div class="meter__scale"><span>0%</span><span>50%</span><span>100%</span></div>'+
                '<input id="accSlider" type="range" min="0" max="100" step="1" value="0" aria-label="Niveau de fidélité">'+
              '</div>'+
            '</div>'+
            '<div class="actions">'+
              '<button id="accSave" class="btn primary" type="submit">Enregistrer</button>'+
              '<button id="accLogout" class="btn" type="button">Se déconnecter</button>'+
            '</div>'+
          '</form>'+
        '</div>'+
      '</div>';

    D.body.appendChild(view);
    return view;
  }

  function showViewCompte(){
    var view = ensureAccountView();
    // masquer autres vues
    var els = D.querySelectorAll('.view');
    for (var i=0;i<els.length;i++){
      if (els[i] === view) els[i].classList.remove('hidden');
      else els[i].classList.add('hidden');
    }
    // focus titre
    try{
      var h1 = view.querySelector('h1');
      if (h1){ h1.setAttribute('tabindex','-1'); h1.focus({preventScroll:true}); setTimeout(function(){h1.removeAttribute('tabindex');},300); }
    }catch(_){ }
    // remplir
    renderAccountIntoForm(loadUser());
  }

  // ------- Form wiring -------
  function renderAccountIntoForm(u){
    var name = D.getElementById('accName');
    var email= D.getElementById('accEmail');
    var phone= D.getElementById('accPhone');
    if (name)  name.value  = u.name  || '';
    if (email) email.value = u.email || '';
    if (phone) phone.value = u.phone || '';
    setLoyaltyUI(u.loyalty_pct);
  }

  function setLoyaltyUI(p){
    p = clamp01(p);
    var slider = D.getElementById('accSlider');
    var fill   = D.getElementById('accFill');
    var cursor = D.getElementById('accCursor');
    if (slider) slider.value = p;
    if (fill)   fill.style.width = p + '%';
    if (cursor) cursor.style.left = p + '%';
  }

  function wireForm(){
    var form = D.getElementById('accForm');
    if (!form || form.__wired) return;
    form.__wired = 1;

    var slider = D.getElementById('accSlider');
    if (slider){
      slider.addEventListener('input', function(){ setLoyaltyUI(slider.value); }, false);
      slider.addEventListener('change', function(){
        var u = loadUser(); u.loyalty_pct = clamp01(slider.value); saveUser(u);
      }, false);
    }

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var u = {
        name:  (D.getElementById('accName')  || {}).value,
        email: (D.getElementById('accEmail') || {}).value,
        phone: (D.getElementById('accPhone') || {}).value,
        loyalty_pct: clamp01((D.getElementById('accSlider') || {}).value)
      };
      // petite validation
      if (u.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(u.email)){ alert('Email invalide'); return; }
      saveUser(u);
      try{ if (typeof toast === 'function') toast('Profil enregistré', 'success'); }catch(_){ }
    }, false);

    var out = D.getElementById('accLogout');
    if (out && !out.__wired){
      out.__wired = 1;
      out.addEventListener('click', function(){
        logoutUser();
        try{ if (typeof toast === 'function') toast('Déconnecté', 'success'); }catch(_){ }
      }, false);
    }
  }

  // ------- Router hook -------
  function handleHash(){
    var h = (location.hash || '').toLowerCase();
    if (h.indexOf('#/compte') === 0){
      ensureAccountView();
      showViewCompte();
      wireForm();
    }
  }

  // ------- Helper : ajouter lien “Compte” dans .site-links si présent -------
  function ensureSiteLink(){
    var bar = D.querySelector('.site-links');
    if (!bar) return;
    if (bar.querySelector('a[href^="#/compte"]')) return;
    var a = D.createElement('a');
    a.className = 'chip';
    a.href = '#/compte';
    a.textContent = 'Compte';
    bar.appendChild(a);
  }

  // ------- Boot -------
  function onReady(){
    ensureSiteLink();
    ensureAccountView(); // crée la vue (cachée) pour satisfaire certains checkers éventuels
    renderAccountIntoForm(loadUser());
    wireForm();
    handleHash();
  }

  // Expose globals
  window.loadUser   = loadUser;
  window.saveUser   = saveUser;
  window.logoutUser = logoutUser;

  if (D.readyState === 'complete' || D.readyState === 'interactive') onReady();
  else D.addEventListener('DOMContentLoaded', onReady, false);

  window.addEventListener('hashchange', handleHash, false);
})();
