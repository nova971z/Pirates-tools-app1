/* =========================================================
   Pirates Tools — Account module (front-only, localStorage)
   - Safe to include on any page (self-contained)
   - Provides: loadUser, saveUser, clearUser (globals)
   - Ensures a #view-compte section exists
   - Handles route "#/compte" without interfering with other router code
========================================================= */

(function(){
  'use strict';

  var D = document;
  var USER_KEY = 'pt_user_v1';

  /* ---------- Storage helpers ---------- */
  function loadUser(){
    try{
      var raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(_){ return null; }
  }
  function saveUser(u){
    if (!u || typeof u !== 'object') return;
    try{ localStorage.setItem(USER_KEY, JSON.stringify(u)); }catch(_){}
  }
  function clearUser(){
    try{ localStorage.removeItem(USER_KEY); }catch(_){}
  }

  // Expose globally (utilisé par app.js: cartToWhatsAppText, etc.)
  window.loadUser = loadUser;
  window.saveUser = saveUser;
  window.clearUser = clearUser;

  /* ---------- View builder (#view-compte) ---------- */
  function ensureCompteView(){
    var view = D.getElementById('view-compte');
    if (view) return view;

    view = D.createElement('section');
    view.id = 'view-compte';
    view.className = 'view hidden';
    view.setAttribute('aria-label','Mon compte');

    view.innerHTML =
      '<div class="container">'+
        '<h1 tabindex="-1">Mon compte</h1>'+

        '<div class="card" style="margin:.6rem 0 1rem">'+
          '<div class="head"><h3 class="title">Informations</h3><span class="badge">Profil</span></div>'+
          '<div class="specs" style="display:block">'+
            '<form id="accForm" style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem">'+
              '<label style="display:grid;gap:.25rem">Nom complet<input id="accName" class="search" type="text" placeholder="Jean Dupont" autocomplete="name"></label>'+
              '<label style="display:grid;gap:.25rem">Email<input id="accEmail" class="search" type="email" placeholder="jean@example.com" autocomplete="email"></label>'+
              '<label style="display:grid;gap:.25rem">Téléphone<input id="accPhone" class="search" type="tel" placeholder="+33…" autocomplete="tel"></label>'+
              '<label style="display:grid;gap:.25rem">Société (optionnel)<input id="accCompany" class="search" type="text" placeholder="Entreprise"></label>'+
              '<div style="grid-column:1/-1;display:flex;gap:.6rem;flex-wrap:wrap">'+
                '<button id="accSave" class="btn primary" type="submit">Enregistrer</button>'+
                '<button id="accClear" class="btn" type="button">Se déconnecter</button>'+
                '<a id="accWa" class="btn btn-wa" target="_blank" rel="noopener">WhatsApp test</a>'+
              '</div>'+
            '</form>'+
          '</div>'+
        '</div>'+

        '<div class="card">'+
          '<div class="head"><h3 class="title">Fidélité</h3><span class="badge">Jauge</span></div>'+
          '<div class="specs" style="display:block">'+
            '<div class="meter">'+
              '<div class="meter__rail"><div id="accFill" class="meter__fill" style="width:0%"></div><div id="accCursor" class="meter__cursor" style="left:0%"></div></div>'+
              '<div class="meter__scale"><span>0</span><span>50</span><span>100</span></div>'+
              '<input id="accSlider" type="range" min="0" max="100" step="1" value="0" />'+
            '</div>'+
          '</div>'+
        '</div>'+

      '</div>';

    // Insérer après le hero si possible, sinon en fin de body
    var anchor = D.getElementById('pdp') || D.querySelector('main') || D.body;
    if (anchor && anchor.parentNode){
      anchor.parentNode.insertBefore(view, anchor.nextSibling);
    }else{
      D.body.appendChild(view);
    }
    return view;
  }

  function qs(sel, root){ return (root||D).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||D).querySelectorAll(sel)); }

  /* ---------- UI wiring ---------- */
  var view = ensureCompteView();

  function fillForm(u){
    qs('#accName', view).value    = (u && u.name)    || '';
    qs('#accEmail', view).value   = (u && u.email)   || '';
    qs('#accPhone', view).value   = (u && u.phone)   || '';
    qs('#accCompany', view).value = (u && u.company) || '';

    var pts = (u && typeof u.loyalty === 'number') ? Math.max(0, Math.min(100, u.loyalty)) : 0;
    var slider = qs('#accSlider', view);
    if (slider) slider.value = pts;
    updateGauge(pts);
  }

  function formToUser(){
    var u = {
      name:    qs('#accName', view).value.trim(),
      email:   qs('#accEmail', view).value.trim(),
      phone:   qs('#accPhone', view).value.trim(),
      company: qs('#accCompany', view).value.trim(),
      loyalty: Number(qs('#accSlider', view).value || 0) || 0
    };
    return u;
  }

  function updateGauge(val){
    val = Math.max(0, Math.min(100, Number(val)||0));
    var fill = qs('#accFill', view);
    var cur  = qs('#accCursor', view);
    if (fill) fill.style.width = val + '%';
    if (cur)  cur.style.left   = val + '%';
  }

  function openWA(u){
    var txt = 'Profil client — test WhatsApp:%0A' +
              'Nom: ' + (u.name||'') + '%0A' +
              'Email: ' + (u.email||'') + '%0A' +
              'Téléphone: ' + (u.phone||'') + '%0A' +
              (u.company ? ('Société: ' + u.company + '%0A') : '') +
              'Fidélité: ' + (u.loyalty||0) + '/100';
    var phoneE164 = (window.PHONE_E164 || '+33774230195').replace('+','');
    window.open('https://wa.me/' + phoneE164 + '?text=' + txt, '_blank', 'noopener');
  }

  function onSubmit(e){
    if (e && e.preventDefault) e.preventDefault();
    var u = formToUser();
    if (!u.name || !u.email || u.email.indexOf('@') === -1){
      try{ window.toast && window.toast('Nom et email valides requis.', 'info'); }catch(_){}
      return;
    }
    saveUser(u);
    try{ window.toast && window.toast('Compte enregistré', 'success'); window.announce && window.announce('Compte enregistré'); }catch(_){}
  }

  function onClear(){
    clearUser();
    fillForm(null);
    try{ window.toast && window.toast('Déconnecté', 'success'); window.announce && window.announce('Déconnecté'); }catch(_){}
  }

  function wire(){
    var form = qs('#accForm', view);
    if (form && !form.__wired){
      form.__wired = 1;
      form.addEventListener('submit', onSubmit);
    }
    var btnClear = qs('#accClear', view);
    if (btnClear && !btnClear.__wired){
      btnClear.__wired = 1;
      btnClear.addEventListener('click', onClear);
    }
    var btnWa = qs('#accWa', view);
    if (btnWa && !btnWa.__wired){
      btnWa.__wired = 1;
      btnWa.addEventListener('click', function(e){
        e.preventDefault();
        openWA(formToUser());
      });
    }
    var slider = qs('#accSlider', view);
    if (slider && !slider.__wired){
      slider.__wired = 1;
      slider.addEventListener('input', function(){ updateGauge(slider.value); });
      slider.addEventListener('change', function(){
        var u = loadUser() || {};
        u.loyalty = Number(slider.value||0)||0;
        saveUser(u);
      });
    }
  }

  /* ---------- Simple hash routing for #/compte ---------- */
  function showCompte(){
    ensureCompteView();
    wire();
    fillForm(loadUser());

    // masquer les autres vues .view, montrer #view-compte
    qsa('.view').forEach(function(v){ v.classList.add('hidden'); });
    view.classList.remove('hidden');

    // focus accessible
    var h1 = qs('h1', view);
    if (h1){ h1.setAttribute('tabindex','-1'); try{ h1.focus({preventScroll:true}); }catch(_){ h1.focus(); } }
  }

  function onHash(){
    var h = (location.hash || '').toLowerCase();
    if (h.indexOf('#/compte') === 0) showCompte();
  }

  window.addEventListener('hashchange', onHash);
  D.addEventListener('DOMContentLoaded', function(){
    wire();
    var u = loadUser();
    if (u) fillForm(u);
    onHash();
  });

})();
