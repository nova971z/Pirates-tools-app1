/* =========================================================
   Pirates Tools — Account module (front-only, localStorage)
   - Safe: fonctionne même si certains champs/boutons manquent
   - Expose: loadUser, saveUser, clearUser (window.*)
   - Route: #/compte (sans gêner le routeur existant)
   - Compat HTML actuel: accountForm + #accSave (type="button")
========================================================= */
(function () {
  'use strict';

  var D = document;
  var USER_KEY = 'pt_user_v1';

  /* ---------- Storage helpers ---------- */
  function loadUser() {
    try {
      var raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }
  function saveUser(u) {
    if (!u || typeof u !== 'object') return;
    try { localStorage.setItem(USER_KEY, JSON.stringify(u)); } catch (_) {}
  }
  function clearUser() {
    try { localStorage.removeItem(USER_KEY); } catch (_) {}
  }

  // Expose global
  window.loadUser = loadUser;
  window.saveUser = saveUser;
  window.clearUser = clearUser;

  /* ---------- Helpers DOM ---------- */
  function qs(sel, root) { return (root || D).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || D).querySelectorAll(sel)); }
  function setVal(el, val) { if (el) el.value = val; }
  function getVal(el) { return el ? (el.value || '').trim() : ''; }

  /* ---------- View builder (#view-compte) ---------- */
  function ensureCompteView() {
    var view = D.getElementById('view-compte');
    if (view) return view;

    // fallback minimal si la section n’existe pas (rare)
    view = D.createElement('section');
    view.id = 'view-compte';
    view.className = 'view hidden';
    view.setAttribute('aria-label', 'Mon compte');
    view.innerHTML =
      '<div class="container">' +
        '<h1 tabindex="-1">Mon compte</h1>' +
        '<div class="card">' +
          '<div class="head"><h3 class="title">Créer / Mettre à jour</h3><span class="badge">Profil</span></div>' +
          '<div class="specs">' +
            '<form id="accountForm" style="display:grid;gap:.6rem;max-width:520px">' +
              '<label>Nom<input id="accName" type="text" class="search" placeholder="Votre nom" autocomplete="name" /></label>' +
              '<label>Email<input id="accEmail" type="email" class="search" placeholder="vous@exemple.com" autocomplete="email" /></label>' +
              '<div class="actions"><button id="accSave" class="btn primary" type="button">Enregistrer</button></div>' +
            '</form>' +
            '<div class="meter" style="max-width:520px;margin-top:1rem">' +
              '<div class="meter__rail"><div id="accFill" class="meter__fill"></div><div id="accCursor" class="meter__cursor" style="left:0%"></div></div>' +
              '<div class="meter__scale"><span>0%</span><span>100%</span></div>' +
              '<input id="accSlider" type="range" min="0" max="100" step="1" value="0" />' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var anchor = D.getElementById('pdp') || D.querySelector('main') || D.body;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(view, anchor.nextSibling);
    else D.body.appendChild(view);

    return view;
  }

  var view = ensureCompteView();

  /* ---------- UI: set / get / gauge ---------- */
  function updateGauge(val) {
    val = Math.max(0, Math.min(100, Number(val) || 0));
    var fill = qs('#accFill', view);
    var cur  = qs('#accCursor', view);
    if (fill) fill.style.width = val + '%';
    if (cur)  cur.style.left   = val + '%';
  }

  function fillForm(u) {
    u = u || {};
    setVal(qs('#accName',  view), u.name  || '');
    setVal(qs('#accEmail', view), u.email || '');
    var pts = (typeof u.loyalty === 'number') ? Math.max(0, Math.min(100, u.loyalty)) : 0;
    var slider = qs('#accSlider', view);
    if (slider) slider.value = pts;
    updateGauge(pts);
  }

  function formToUser() {
    return {
      name:    getVal(qs('#accName', view)),
      email:   getVal(qs('#accEmail', view)),
      loyalty: Number(getVal(qs('#accSlider', view)) || '0') || 0
    };
  }

  /* ---------- Actions ---------- */
  function onSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    var u = formToUser();
    if (!u.name || !u.email || u.email.indexOf('@') === -1) {
      try { window.toast && window.toast('Nom et email valides requis.', 'info'); } catch (_) {}
      return;
    }
    saveUser(u);
    try { window.toast && window.toast('Compte enregistré', 'success'); window.announce && window.announce('Compte enregistré'); } catch (_) {}
  }

  function wire() {
    // form: #accForm ou #accountForm
    var form = qs('#accForm', view) || qs('#accountForm', view);
    if (form && !form.__wired) {
      form.__wired = 1;
      form.addEventListener('submit', onSubmit);
    }
    // bouton Enregistrer (si pas de submit)
    var btnSave = qs('#accSave', view);
    if (btnSave && !btnSave.__wired) {
      btnSave.__wired = 1;
      btnSave.addEventListener('click', onSubmit);
    }
    // slider jauge
    var slider = qs('#accSlider', view);
    if (slider && !slider.__wired) {
      slider.__wired = 1;
      slider.addEventListener('input', function () { updateGauge(slider.value); });
      slider.addEventListener('change', function () {
        var u = loadUser() || {};
        u.loyalty = Number(slider.value || 0) || 0;
        saveUser(u);
      });
    }
  }

  /* ---------- Simple hash routing (#/compte) ---------- */
  function showCompte() {
    ensureCompteView();
    wire();
    fillForm(loadUser());

    // masquer autres vues .view / afficher #view-compte
    qsa('.view').forEach(function (v) { v.classList.add('hidden'); });
    view.classList.remove('hidden');

    // focus accessible
    var h1 = qs('h1', view);
    if (h1) { h1.setAttribute('tabindex', '-1'); try { h1.focus({ preventScroll: true }); } catch (_) { h1.focus(); } }
  }

  function onHash() {
    var h = (location.hash || '').toLowerCase();
    if (h.indexOf('#/compte') === 0) showCompte();
  }

  window.addEventListener('hashchange', onHash);
  D.addEventListener('DOMContentLoaded', function () {
    wire();
    var u = loadUser();
    if (u) fillForm(u);
    onHash();
  });
})();
