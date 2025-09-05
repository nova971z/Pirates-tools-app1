/* Pirates Tools — Account module (front-only, localStorage) */
(function(){
  'use strict';
  var D=document, W=window;
  var K_ACC='PT_ACCOUNT_V1', K_USER='PT_USER_V1';
  var ACC=null;

  // ------- tiny utils -------
  var $ = (s,r)=> (r||D).querySelector(s);
  var $$= (s,r)=> Array.prototype.slice.call((r||D).querySelectorAll(s));
  var on = (el,ev,fn)=> el && el.addEventListener(ev,fn);
  var v  = (s)=> { var el=$(s); return el? (el.value||''):''; };
  var esc= (t)=> String(t||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  function toastSafe(msg,type){ try{ if(typeof toast==='function') toast(msg,type||'info'); else console.log('[Toast]',type||'info',msg);}catch(_){} }
  function announceSafe(msg){ try{ if(typeof announce==='function') announce(msg);}catch(_){} }

  // ------- storage -------
  function loadAcc(){
    try{ ACC = JSON.parse(localStorage.getItem(K_ACC)||'null'); }catch(_){ ACC=null; }
    return ACC;
  }
  function saveAcc(obj){
    ACC = obj || ACC || {};
    try{ localStorage.setItem(K_ACC, JSON.stringify(ACC)); }catch(_){ }
    var u = { name:ACC.name||'', email:ACC.email||'', phone:ACC.phone||'' };
    try{ localStorage.setItem(K_USER, JSON.stringify(u)); }catch(_){ }
    try{ W.dispatchEvent(new CustomEvent('pt:accountChanged',{detail:u})); }catch(_){ }
    return ACC;
  }
  function clearAcc(){ try{localStorage.removeItem(K_ACC);}catch(_){ } try{localStorage.removeItem(K_USER);}catch(_){ } ACC=null; }

  // ------- public profile for other modules -------
  W.loadUser = function(){
    try{ return JSON.parse(localStorage.getItem(K_USER)||'{"name":"","email":"","phone":""}'); }
    catch(_){ return {name:'',email:'',phone:''}; }
  };

  // ------- light hash (demo) -------
  function hash(s){
    if (W.crypto && W.crypto.subtle && W.TextEncoder){
      var enc=new TextEncoder().encode(s);
      return W.crypto.subtle.digest('SHA-256',enc).then(buf=>{
        return Array.from(new Uint8Array(buf)).map(b=>('00'+b.toString(16)).slice(-2)).join('');
      });
    }
    try{ return Promise.resolve(btoa(unescape(encodeURIComponent(s)))); }catch(_){ return Promise.resolve(s); }
  }

  // ------- view / router -------
  function ensureCompteView(){
    var v = D.getElementById('view-compte'); if (v) return v;
    v = D.createElement('section'); v.id='view-compte'; v.className='view hidden';
    v.innerHTML =
      '<div class="container card" style="margin-top:1rem">'+
        '<div class="head"><h3 class="title" id="accTitle">Mon compte</h3><span class="badge">Espace client</span></div>'+
        '<div class="specs" id="accBody"><p class="empty">Chargement…</p></div>'+
        '<div class="actions" id="accActions"></div>'+
      '</div>';
    ( $('main') || D.body ).appendChild(v);
    return v;
  }
  function show(el){ el&&el.classList.remove('hidden'); }
  function hide(el){ el&&el.classList.add('hidden'); }
  function isRouteCompte(h){ return /^#\/compte(?:$|[\/?])/i.test(h||W.location.hash); }
  function routeHook(){
    var v=ensureCompteView();
    if (isRouteCompte()){
      ['view-home','view-catalogue','view-devis','view-produit'].forEach(id=> hide(D.getElementById(id)));
      renderView(); show(v);
      var t=$('#accTitle'); if (t) { t.setAttribute('tabindex','-1'); try{t.focus();}catch(_){} }
    } else hide(v);
  }
  on(W,'hashchange',routeHook); on(W,'pt:route',routeHook); on(D,'DOMContentLoaded',routeHook);

  // ------- renders -------
  function renderView(){
    ensureCompteView(); loadAcc();
    var body=$('#accBody'), act=$('#accActions'); if(!body||!act) return;

    // Non inscrit
    if (!ACC || !ACC.email || !ACC.pass){
      body.innerHTML =
        '<form id="accSignup" novalidate autocomplete="on">'+
          '<label>Nom complet<br><input id="accName" class="search" type="text" required placeholder="Jean Dupont"></label>'+
          '<label style="margin-top:.5rem">Email<br><input id="accEmail" class="search" type="email" required placeholder="jean@exemple.com"></label>'+
          '<label style="margin-top:.5rem">Téléphone<br><input id="accPhone" class="search" type="tel" inputmode="tel" placeholder="+33 6…"></label>'+
          '<label style="margin-top:.5rem">Mot de passe<br><input id="accPwd1" class="search" type="password" required placeholder="••••••••"></label>'+
          '<label style="margin-top:.5rem">Confirmer<br><input id="accPwd2" class="search" type="password" required placeholder="••••••••"></label>'+
          '<p class="muted" style="color:#9fb4c5;margin:.5rem 0 0">Stockage local pour démo.</p>'+
        '</form>';
      act.innerHTML =
        '<button id="btnDoSignup" class="btn primary" type="button">Créer mon compte</button>'+
        '<button id="btnGoLogin" class="btn" type="button">J’ai déjà un compte</button>';
      on($('#btnDoSignup'),'click',doSignup);
      on($('#btnGoLogin'),'click',()=>renderLogin());
      return;
    }

    // Inscrit mais déconnecté
    if (!ACC.logged){ renderLogin(); return; }

    // Profil
    body.innerHTML =
      '<form id="accProfile" autocomplete="on">'+
        '<label>Nom complet<br><input id="pName" class="search" type="text" value="'+esc(ACC.name||'')+'"></label>'+
        '<label style="margin-top:.5rem">Email<br><input id="pEmail" class="search" type="email" value="'+esc(ACC.email||'')+'"></label>'+
        '<label style="margin-top:.5rem">Téléphone<br><input id="pPhone" class="search" type="tel" value="'+esc(ACC.phone||'')+'"></label>'+
        '<details style="margin-top:.6rem"><summary>Changer le mot de passe</summary>'+
          '<div style="margin-top:.5rem;display:grid;gap:.5rem">'+
            '<input id="pPwdOld" class="search" type="password" placeholder="Ancien mot de passe">'+
            '<input id="pPwdNew1" class="search" type="password" placeholder="Nouveau mot de passe">'+
            '<input id="pPwdNew2" class="search" type="password" placeholder="Confirmer le nouveau">'+
          '</div>'+
        '</details>'+
        '<details style="margin-top:.6rem"><summary>Export / Import</summary>'+
          '<div style="margin-top:.5rem;display:grid;gap:.5rem">'+
            '<button id="btnExport" class="btn" type="button">Exporter (JSON)</button>'+
            '<label class="chip" style="cursor:pointer">Importer JSON<input id="fileImport" type="file" accept="application/json" style="display:none"></label>'+
          '</div>'+
        '</details>'+
      '</form>';
    act.innerHTML =
      '<button id="btnSave" class="btn primary" type="button">Enregistrer</button>'+
      '<button id="btnLogout" class="btn" type="button">Se déconnecter</button>'+
      '<button id="btnDelete" class="btn" type="button" style="margin-left:auto;background:rgba(255,255,255,.06);color:#d9e3ec">Supprimer mon compte</button>';
    on($('#btnSave'),'click',saveProfile);
    on($('#btnLogout'),'click',doLogout);
    on($('#btnDelete'),'click',doDelete);
    on($('#btnExport'),'click',doExport);
    on($('#fileImport'),'change',doImport);
  }

  function renderLogin(){
    var body=$('#accBody'), act=$('#accActions'); if(!body||!act) return;
    body.innerHTML =
      '<form id="accLogin" novalidate autocomplete="on">'+
        '<label>Email<br><input id="lEmail" class="search" type="email" required placeholder="jean@exemple.com" value="'+esc((ACC&&ACC.email)||'')+'"></label>'+
        '<label style="margin-top:.5rem">Mot de passe<br><input id="lPwd" class="search" type="password" required placeholder="••••••••"></label>'+
      '</form>';
    act.innerHTML =
      '<button id="btnDoLogin" class="btn primary" type="button">Se connecter</button>'+
      '<button id="btnBackSignup" class="btn" type="button">Créer un compte</button>'+
      '<button id="btnReset" class="btn" type="button" style="margin-left:auto">Réinitialiser local</button>';
    on($('#btnDoLogin'),'click',doLogin);
    on($('#btnBackSignup'),()=>{ ACC=null; saveAcc({}); renderView(); });
    on($('#btnReset'),()=>{ clearAcc(); toastSafe('Espace compte réinitialisé','success'); renderView(); });
  }

  // ------- actions -------
  function doSignup(){
    var name=v('#accName').trim(), email=v('#accEmail').trim(), phone=v('#accPhone').trim();
    var p1=v('#accPwd1'), p2=v('#accPwd2');
    if(!name||!email||!p1||!p2){ toastSafe('Champs requis manquants.','error'); return; }
    if(p1!==p2){ toastSafe('Les mots de passe ne correspondent pas.','error'); return; }
    hash(email+'::'+p1).then(h=>{
      saveAcc({name,email,phone,pass:h,logged:true,createdAt:Date.now()});
      toastSafe('Compte créé et connecté','success'); announceSafe('Compte créé et connecté'); renderView();
    });
  }
  function doLogin(){
    var email=v('#lEmail').trim(), p=v('#lPwd');
    if(!ACC||!ACC.email||!ACC.pass){ toastSafe('Aucun compte local. Créez un compte.','error'); return; }
    if(email!==ACC.email){ toastSafe('Email inconnu.','error'); return; }
    hash(email+'::'+p).then(h=>{
      if(h!==ACC.pass){ toastSafe('Mot de passe incorrect.','error'); return; }
      ACC.logged=true; saveAcc(ACC); toastSafe('Connecté','success'); announceSafe('Connecté'); renderView();
    });
  }
  function saveProfile(){
    if(!ACC||!ACC.logged) return;
    ACC.name=v('#pName').trim(); ACC.email=v('#pEmail').trim(); ACC.phone=v('#pPhone').trim();
    var old=v('#pPwdOld'), n1=v('#pPwdNew1'), n2=v('#pPwdNew2');
    if(n1||n2||old){
      if(!old||!n1||!n2){ toastSafe('Remplissez les 3 champs pour changer le mot de passe.','error'); return; }
      hash((ACC.email||'')+'::'+old).then(h=>{
        if(h!==ACC.pass){ toastSafe('Ancien mot de passe incorrect.','error'); return; }
        if(n1!==n2){ toastSafe('Confirmation invalide.','error'); return; }
        hash((ACC.email||'')+'::'+n1).then(h2=>{ ACC.pass=h2; saveAcc(ACC); toastSafe('Profil & mot de passe enregistrés','success'); renderView(); });
      });
      return;
    }
    saveAcc(ACC); toastSafe('Profil enregistré','success'); announceSafe('Profil enregistré'); renderView();
  }
  function doLogout(){ if(!ACC)return; ACC.logged=false; saveAcc(ACC); toastSafe('Déconnecté','success'); announceSafe('Déconnecté'); renderView(); }
  function doDelete(){ if(!confirm('Supprimer définitivement le compte local ?')) return; clearAcc(); toastSafe('Compte supprimé','success'); announceSafe('Compte supprimé'); renderView(); }
  function doExport(){
    loadAcc(); var data=JSON.stringify(ACC||{},null,2);
    var blob=new Blob([data],{type:'application/json'}), a=D.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='pirates-tools-account.json'; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  function doImport(e){
    var f=e&&e.target&&e.target.files&&e.target.files[0]; if(!f) return;
    var r=new FileReader(); r.onload=function(){
      try{ var obj=JSON.parse(r.result); if(!obj||!obj.email){ toastSafe('Fichier invalide.','error'); return; }
        saveAcc(obj); toastSafe('Compte importé','success'); announceSafe('Compte importé'); renderView();
      }catch(err){ toastSafe('Import impossible: '+err.message,'error'); }
    }; r.readAsText(f);
  }

  // bootstrap direct #/compte
  on(D,'DOMContentLoaded',function(){ ensureCompteView(); if(isRouteCompte()) renderView(); });
})();
