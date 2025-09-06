/* =========================================================
   Pirates Tools — Account module (front-only, localStorage)
   - Safe: fonctionne même si certains champs/boutons manquent
   - Expose prudemment: window.loadUser / saveUser / clearUser
   - Route: #/compte (sans gêner le routeur existant)
   - Compat HTML actuel: #accountForm | #accForm + #accSave (type="button")
   - Compat jauge: #accSlider (0..100 par défaut), #accFill, #accCursor
========================================================= */
(function () {
  'use strict';

  /* ---------- Guards de compat ---------- */
  var D = document;
  var W = window;
  var USER_KEY = W.USER_KEY || 'pt_user_v1';

  if (typeof W.toast    !== 'function') W.toast    = function(){};
  if (typeof W.announce !== 'function') W.announce = function(){};
  if (typeof W.showView !== 'function') {
    W.showView = function(key){
      var ids = ['view-home','view-catalogue','view-produit','view-devis','view-compte','view-login','view-register'];
      for (var i=0;i<ids.length;i++){ var el = D.getElementById(ids[i]); if (el) el.classList.add('hidden'); }
      var want = D.getElementById('view-'+key); if (want) want.classList.remove('hidden');
    };
  }

  /* =========================================================
     A) Modèle / persistance
  ========================================================== */
  function defaultUser(){
    return {
      name: '',
      email: '',
      phone: '',
      addr: '',
      newsletter: false,
      // points fidé par défaut (0..1000). On garde aussi "loyalty" (0..100) pour compat héritée.
      points: 0,
      loyalty: 0,   // alias (0..100) si ta jauge actuelle est /100
      tier: 'Bronze'
    };
  }

  function computeTier(points){
    points = +points || 0;
    if (points >= 600) return 'Gold';
    if (points >= 250) return 'Silver';
    return 'Bronze';
  }

  function normalizeUser(u){
    u = u && typeof u === 'object' ? u : defaultUser();
    // compat ancienne clé "loyalty" (0..100) -> "points" (0..1000)
    if (typeof u.points !== 'number' || !isFinite(u.points)){
      if (typeof u.loyalty === 'number' && isFinite(u.loyalty)){
        u.points = Math.max(0, Math.round(u.loyalty * 10));
      } else {
        u.points = 0;
      }
    }
    if (typeof u.loyalty !== 'number' || !isFinite(u.loyalty)){
      // déduire l’alias depuis points si absent
      u.loyalty = Math.max(0, Math.min(100, Math.round((u.points || 0) / 10)));
    }
    u.tier = computeTier(u.points);
    return u;
  }

  function loadUser(){
    try{
      var raw = localStorage.getItem(USER_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return normalizeUser(parsed);
    }catch(_){
      return defaultUser();
    }
  }
  function saveUser(u){
    var nu = normalizeUser(u);
    try{
      localStorage.setItem(USER_KEY, JSON.stringify(nu));
      try{ W.dispatchEvent(new CustomEvent('pt:userChanged', { detail: nu })); }catch(_){}
      W.toast('Compte enregistré', 'success'); W.announce('Compte enregistré');
    }catch(_){}
    return nu;
  }
  function clearUser(){
    try{ localStorage.removeItem(USER_KEY); }catch(_){}
    try{ W.dispatchEvent(new CustomEvent('pt:userChanged', { detail: defaultUser() })); }catch(_){}
  }

  // Expose sans écraser s’il existe déjà
  if (typeof W.loadUser !== 'function')  W.loadUser  = loadUser;
  if (typeof W.saveUser !== 'function')  W.saveUser  = saveUser;
  if (typeof W.clearUser !== 'function') W.clearUser = clearUser;

  /* =========================================================
     B) Vue & helpers DOM
  ========================================================== */
  function qs(s, r){ return (r||D).querySelector(s); }
  function qsa(s, r){ return Array.prototype.slice.call((r||D).querySelectorAll(s)); }
  function setVal(el, v){ if (el){ el.value = v; } }
  function getVal(el){ return el ? String(el.value||'').trim() : ''; }

  function ensureCompteView(){
    var view = D.getElementById('view-compte');
    if (view) return view;

    // fallback minimal si la section n’existe pas
    view = D.createElement('section');
    view.id = 'view-compte';
    view.className = 'view hidden';
    view.innerHTML =
      '<div class="container">'
      + '  <h1 tabindex="-1">Mon compte</h1>'
      + '  <div class="card">'
      + '    <div class="head"><h3 class="title">Créer / Mettre à jour</h3><span class="badge">Profil</span></div>'
      + '    <div class="specs">'
      + '      <form id="accountForm" style="display:grid;gap:.6rem;max-width:520px">'
      + '        <label>Nom<input id="accName" type="text" class="search" placeholder="Votre nom" autocomplete="name"></label>'
      + '        <label>Email<input id="accEmail" type="email" class="search" placeholder="vous@exemple.com" autocomplete="email"></label>'
      + '        <div class="actions"><button id="accSave" class="btn primary" type="button">Enregistrer</button></div>'
      + '      </form>'
      + '      <div class="meter" style="max-width:520px;margin-top:1rem">'
      + '        <div class="meter__rail"><div id="accFill" class="meter__fill"></div><div id="accCursor" class="meter__cursor" style="left:0%"></div></div>'
      + '        <div class="meter__scale"><span>0%</span><span>100%</span></div>'
      + '        <input id="accSlider" type="range" min="0" max="100" step="1" value="0">'
      + '      </div>'
      + '    </div>'
      + '  </div>'
      + '</div>';
    D.body.appendChild(view);
    return view;
  }

  var view = ensureCompteView();

  /* =========================================================
     C) UI: jauge + remplissage
  ========================================================== */
  function updateGaugeFromPoints(points){
    // convertir points (0..1000) -> pct (0..100)
    var pct = Math.max(0, Math.min(100, Math.round((+points||0)/10)));
    var fill   = qs('#accFill', view);
    var cursor = qs('#accCursor', view);
    var slider = qs('#accSlider', view);

    if (fill)   fill.style.width = pct + '%';
    if (cursor) cursor.style.left = pct + '%';
    if (slider) slider.value = pct;
  }

  function fillForm(u){
    u = normalizeUser(u);
    setVal(qs('#accName', view),  u.name || '');
    setVal(qs('#accEmail', view), u.email || '');
    updateGaugeFromPoints(u.points);

    // facultatif: si #accTier / #accPoints existent (autre UI), on les alimente
    var tier = qs('#accTier', view);
    var pts  = qs('#accPoints', view);
    if (tier) tier.textContent = u.tier;
    if (pts)  pts.textContent  = String(u.points);
  }

  function formToUser(){
    var slider = qs('#accSlider', view);
    var pct = slider ? Math.max(0, Math.min(100, parseInt(slider.value,10)||0)) : 0;
    return normalizeUser({
      name:  getVal(qs('#accName', view)),
      email: getVal(qs('#accEmail', view)),
      // stocke les deux formats (compat)
      loyalty: pct,
      points: pct * 10
    });
  }

  /* =========================================================
     D) Actions & wiring
  ========================================================== */
  function validEmail(s){ s = String(s||''); return !!(s && s.indexOf('@')>0 && s.indexOf('.')>0); }

  function onSubmit(e){
    if (e && e.preventDefault) e.preventDefault();
    var u = formToUser();
    if (u.email && !validEmail(u.email)){
      W.toast('Email invalide', 'info');
      try{ qs('#accEmail', view).focus(); }catch(_){}
      return;
    }
    saveUser(u);
  }

  function wire(){
    var form = qs('#accForm', view) || qs('#accountForm', view);
    if (form && !form.__wired){ form.__wired = 1; form.addEventListener('submit', onSubmit, false); }

    var btn = qs('#accSave', view);
    if (btn && !btn.__wired){ btn.__wired = 1; btn.addEventListener('click', onSubmit, false); }

    var clearBtn = qs('#accClear', view);
    if (clearBtn && !clearBtn.__wired){
      clearBtn.__wired = 1;
      clearBtn.addEventListener('click', function(){
        clearUser(); var fresh = defaultUser(); fillForm(fresh); saveUser(fresh);
        W.toast('Compte réinitialisé', 'success');
      }, false);
    }

    var slider = qs('#accSlider', view);
    if (slider && !slider.__wired){
      slider.__wired = 1;
      slider.addEventListener('input', function(){
        updateGaugeFromPoints((parseInt(slider.value,10)||0)*10);
      }, false);
      slider.addEventListener('change', function(){
        var u = loadUser(); u.points = (parseInt(slider.value,10)||0)*10; u.loyalty = Math.max(0, Math.min(100, parseInt(slider.value,10)||0));
        u.tier = computeTier(u.points); saveUser(u);
      }, false);
    }
  }

  /* =========================================================
     E) Mini-route #/compte (non destructif)
  ========================================================== */
  function showCompte(){
    ensureCompteView();
    wire();
    fillForm(loadUser());

    // si un routeur global existe, on l’utilise; sinon on masque/affiche
    if (typeof W.showView === 'function'){ try{ W.showView('compte'); }catch(_){ } }
    else {
      qsa('.view').forEach(function(v){ v.classList.add('hidden'); });
      view.classList.remove('hidden');
    }

    var h1 = qs('h1', view); if (h1){ h1.setAttribute('tabindex','-1'); try{ h1.focus({preventScroll:true}); }catch(_){ h1.focus(); } }
    if (typeof W.focusView === 'function'){ try{ W.focusView('compte'); }catch(_){} }
  }

  function onHash(){
    var h = (location.hash||'').toLowerCase();
    if (h.indexOf('#/compte') === 0) showCompte();
  }

  W.addEventListener('hashchange', onHash, false);
  D.addEventListener('DOMContentLoaded', function(){
    ensureCompteView();
    wire();
    fillForm(loadUser());
    onHash(); // si on arrive direct sur #/compte
  }, false);
})();
