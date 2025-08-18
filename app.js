/* =========================================================
   Pirates Tools — app.js (FULL, Android smooth + fixes)
   + FIX data-scroll: retour à Home avant de scroller
   + Devis rendu dynamique + dock panier → #/devis
   + Compte & Fidélité (localStorage + curseur)
   + Mot de passe local (PBKDF2/SHA-256 + salt, 200k itérations)
========================================================= */

const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/* Numéro unique */
const PHONE_HUMAN = '07 74 23 01 95';
const PHONE_E164  = '+33774230195';

/* Sélecteurs */
const hero        = $('#hero');
const heroLogo    = $('#heroLogo');
const listEl      = $('#list');
const searchEl    = $('#q');
const tagEl       = $('#tag');
const dock        = $('#dock');
const dockCount   = $('#dockCount');
const dockQuoteBtn= $('#dockQuoteBtn');
const dockCartBtn = $('#dockCartBtn');       // ← bouton panier rouge (si présent)
const callBtn     = $('#callBtn');
const waBtn       = $('#waBtn');
const homeLink    = $('#homeLink'); // (optionnel)

/* Harmonise les CTA */
(function syncCTA(){
  callBtn?.setAttribute('href', `tel:${PHONE_E164}`);
  if (callBtn) callBtn.innerHTML = `📞 <strong>${PHONE_HUMAN}</strong>`;
  waBtn?.setAttribute('href', `https://wa.me/${PHONE_E164.replace('+','')}`);
})();

/* Logo = retour accueil partout */
(function wireLogoHome(){
  const logo = homeLink || document.querySelector('.topbar-logo-link');
  logo?.addEventListener('click', (e)=>{
    e.preventDefault();
    location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* ---------------- HERO : zoom + fondu + anti-chevauchement ---------------- */
(function heroEffect(){
  if (!hero || !heroLogo) return;

  const mq = window.matchMedia('(max-width: 768px)');
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  const getVH = () => (window.visualViewport ? window.visualViewport.height : window.innerHeight) || 1;
  let vh = getVH();
  let ticking = false;

  function compute(){
    const y = window.scrollY || 0;

    const finish = vh * (mq.matches ? 0.70 : 0.85);
    const raw = clamp(y / finish, 0, 1);
    const p = easeOutCubic(raw);

    const maxScale = mq.matches ? 3.1 : 2.0;
    const scale = 1 + (maxScale - 1) * p;

    const tyVh = (mq.matches ? 12 : 7) * p;
    const opacity = clamp(1 - (mq.matches ? 1.75 : 1.25) * raw, 0, 1);

    heroLogo.style.setProperty('--heroScale', scale.toFixed(3));
    heroLogo.style.setProperty('--heroY', `${tyVh.toFixed(2)}vh`);
    heroLogo.style.setProperty('--heroAlpha', opacity.toFixed(3));

    const gap = (1 - raw) * (mq.matches ? 18 : 22);
    document.documentElement.style.setProperty('--listGap', `${gap.toFixed(2)}vh`);

    if (raw > 0.985) { document.body.classList.add('after-hero'); hero.classList.add('hero-out'); }
    else { document.body.classList.remove('after-hero'); hero.classList.remove('hero-out'); }
  }

  function onScroll(){
    if (!ticking){
      ticking = true;
      requestAnimationFrame(() => { compute(); ticking = false; });
    }
  }

  window.addEventListener('scroll', onScroll, { passive:true });
  window.addEventListener('resize', () => { vh = getVH(); compute(); }, { passive:true });
  window.visualViewport?.addEventListener('resize', () => { vh = getVH(); compute(); }, { passive:true });
  window.addEventListener('orientationchange', () => { vh = getVH(); compute(); }, { passive:true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) compute(); });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    heroLogo.style.setProperty('--heroScale', '1');
    heroLogo.style.setProperty('--heroY', '0vh');
    heroLogo.style.setProperty('--heroAlpha', '1');
    document.documentElement.style.setProperty('--listGap', '0vh');
    hero.classList.add('hero-out');
    return;
  }

  compute();
})();

/* ---------------- Smooth scroll (FIX: depuis une vue → retour Home avant scroll) ---------------- */
$$('[data-scroll]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const targetSel = a.getAttribute('data-scroll') || a.getAttribute('href');
    const doScroll = () => {
      const el = targetSel ? document.querySelector(targetSel) : null;
      if (!el) return;
      el.scrollIntoView({ behavior:'smooth', block:'start' });
    };
    if (location.hash.startsWith('#/')) {
      const once = () => { requestAnimationFrame(doScroll); window.removeEventListener('hashchange', once); };
      window.addEventListener('hashchange', once, { once:true });
      location.hash = '';
    } else {
      doScroll();
    }
  });
});

/* ---------------- EXIT ANIMATION AU SCROLL (tools) ---------------- */
const ScrollExit = (function () {
  function injectExitCSS(){
    if (document.getElementById('exit-anim-css')) return;
    const style = document.createElement('style');
    style.id = 'exit-anim-css';
    style.textContent = `
@keyframes exitLeft { to { transform: translateX(-60px); opacity: 0; filter: blur(2px); } }
@keyframes exitRight{ to { transform: translateX(60px);  opacity: 0; filter: blur(2px); } }
.tool--exit-left  { animation: exitLeft 420ms cubic-bezier(.22,.61,.36,1) forwards; will-change: transform, opacity; }
.tool--exit-right { animation: exitRight 420ms cubic-bezier(.22,.61,.36,1) forwards; will-change: transform, opacity; }
@media (prefers-reduced-motion: reduce) {
  .tool--exit-left,
  .tool--exit-right { animation: none; opacity: 0; }
}`;
    document.head.appendChild(style);
  }
  injectExitCSS();

  let flip = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      if (entry.isIntersecting) { el.classList.remove('tool--exit-left','tool--exit-right'); el.removeAttribute('data-exited'); return; }
      if (el.dataset.exited === '1') return;
      const exitingUp = entry.boundingClientRect.top < 0;
      if (!exitingUp) return;
      const cls = flip ? 'tool--exit-right' : 'tool--exit-left';
      flip = !flip;
      void el.offsetWidth;
      el.classList.add(cls);
      el.dataset.exited = '1';
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -10% 0px' });

  function observeWithin(root=document){
    root.querySelectorAll('[data-tool]').forEach(el => io.observe(el));
  }
  return { observeWithin };
})();

/* ---------------- Produits / Devis ---------------- */
let MODELS = [];
let CART   = [];

/* ===== Panier (persistant) ===== */
const STORE_KEY = 'pt_cart_v1';

function updateDock(){
  if (!dock || !dockCount) return;
  dockCount.textContent = CART.length;
  if (CART.length) dock.classList.remove('hidden');
}

function saveCart(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(CART)); }catch(_){}
  updateDock();
}
function loadCart(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    CART = raw ? JSON.parse(raw) : [];
  }catch(_){ CART = []; }
  updateDock();
}
loadCart();

/* Groupage (même produit, quantité) */
const keyOf = p => (p?.id ?? p?.sku ?? p?.title ?? '').toString();
function groupCart(){
  const map = new Map();
  CART.forEach(p=>{
    const k = keyOf(p);
    const g = map.get(k) || { item:p, qty:0 };
    g.qty++;
    map.set(k, g);
  });
  return [...map.values()];
}

/* Message WhatsApp réutilisable */
function cartToWhatsAppText(){
  const grouped = groupCart();
  if (!grouped.length) return '';
  const lines = grouped.map(({item,qty})=>{
    const sku = item.sku || item.id || '';
    const title = item.title || `${item.brand||''} ${item.sku||''}`.trim();
    return `• ${sku} – ${title}${qty>1?` ×${qty}`:''}`;
  });
  return `Bonjour, je souhaite un devis pour:\n${lines.join('\n')}\n\nMerci.`;
}

const fallback = (v, alt='') => (v===undefined || v===null) ? alt : v;

function productToHTML(m){
  const title = fallback(m.title, `${fallback(m.brand,'')}${m.brand?' ':''}${fallback(m.sku,'')}`).trim();
  const tag   = fallback(m.tag,'').trim();
  const desc  = fallback(m.desc, fallback(m.description,''));
  const id    = fallback(m.id, fallback(m.sku, title)).toString();

  return `
  <article class="card" data-tool data-id="${id}" data-tag="${tag}">
    <div class="head">
      <h3 class="title">${title}</h3>
      ${tag ? `<span class="badge">${tag}</span>` : ``}
    </div>
    <div class="specs"><p style="margin:0">${desc || '—'}</p></div>
    <div class="actions"><button class="btn primary" data-add="${id}">Ajouter au devis</button></div>
  </article>`;
}

function bindAddToQuote(scopeData){
  $$('[data-add]', listEl).forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-add');
      const p  = scopeData.find(x => (x.id?.toString()===id) || (x.sku?.toString()===id) || (x.title===id));
      if (!p) return;
      CART.push(p);
      saveCart();
    });
  });
}

/* Trouve un produit par id/sku/titre */
function findProductByKey(key){
  if (!key) return null;
  const k = String(key).toLowerCase();
  return MODELS.find(m=>{
    const id  = (m.id ?? m.sku ?? '').toString().toLowerCase();
    const sku = (m.sku ?? '').toString().toLowerCase();
    const ttl = (m.title ?? '').toLowerCase();
    return id===k || sku===k || ttl===k;
  }) || null;
}

/* ===== Rendu de la vue Devis ===== */
function renderCartView(){
  const root = $('#devisList');
  if (!root) return;

  const grouped = groupCart();
  if (!grouped.length){
    root.innerHTML = `<p style="margin:0">Aucun article pour le moment.</p>`;
  }else{
    root.innerHTML = grouped.map(({item,qty})=>{
      const sku   = item.sku || item.id || '';
      const title = item.title || `${item.brand||''} ${item.sku||''}`.trim();
      const key   = keyOf(item);
      return `
        <div class="card" style="width:100%">
          <div class="head">
            <h3 class="title">${title}</h3>
            <span class="badge">${sku}</span>
          </div>
          <div class="specs" style="display:flex;gap:.6rem;align-items:center">
            <button class="btn" data-dec="${key}">−</button>
            <strong>${qty}</strong>
            <button class="btn" data-inc="${key}">+</button>
            <button class="btn" data-del="${key}" style="margin-left:auto;background:rgba(255,255,255,.06);color:#d9e3ec">Supprimer</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // actions
  root.onclick = (e)=>{
    const inc = e.target.closest('[data-inc]'); const dec = e.target.closest('[data-dec]'); const del = e.target.closest('[data-del]');
    const key = inc?.dataset.inc || dec?.dataset.dec || del?.dataset.del;
    if (!key) return;

    if (inc){
      const p = MODELS.find(m => keyOf(m)===key);
      if (p){ CART.push(p); }
    }else if (dec){
      const i = CART.findIndex(p => keyOf(p)===key);
      if (i>=0) CART.splice(i,1);
    }else if (del){
      for (let i=CART.length-1;i>=0;i--) if (keyOf(CART[i])===key) CART.splice(i,1);
    }
    saveCart();
    renderCartView();
  };

  $('#devisSend')?.addEventListener('click', ()=>{
    const msg = encodeURIComponent(cartToWhatsAppText());
    if (!msg) return;
    window.open(`https://wa.me/${PHONE_E164.replace('+','')}?text=${msg}`, '_blank', 'noopener');
  }, { once:true });

  $('#devisClear')?.addEventListener('click', ()=>{
    CART = [];
    saveCart();
    renderCartView();
  }, { once:true });
}

/* ===== Catalogue dynamique (catégories) ===== */
function buildCategories(){
  const map = new Map();
  for (const m of MODELS){
    const raw = (m.tag || m.brand || '').toString().trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    map.set(key, { key, label: raw, count: (map.get(key)?.count || 0) + 1 });
  }
  return [...map.values()].sort((a,b)=> b.count - a.count);
}
function renderCatalogue(){
  const root = document.getElementById('catList');
  if (!root) return;

  const cats = buildCategories();
  root.innerHTML = cats.length
    ? cats.map(c => `
        <article class="card cat-card" data-cat="${c.key}">
          <div class="head"><h3 class="title">${c.label}</h3><span class="badge">Catégorie</span></div>
          <div class="specs"><p style="margin:0">${c.count} produit${c.count>1?'s':''}</p></div>
          <div class="actions"><button class="btn primary" data-cat-go="${c.key}">Voir</button></div>
        </article>
      `).join('')
    : `<div class="card"><div class="specs"><p style="margin:0">Aucune catégorie détectée.</p></div></div>`;

  const go = (key)=>{
    if (tagEl) tagEl.value = key;
    if (typeof applyFilters === 'function') applyFilters();
    location.hash = '';
    setTimeout(()=> document.getElementById('list')?.scrollIntoView({behavior:'smooth'}), 60);
  };

  root.addEventListener('click', e=>{
    const btn = e.target.closest('[data-cat-go]');
    const card= e.target.closest('.cat-card');
    if (btn) return go(btn.dataset.catGo);
    if (card) return go(card.dataset.cat);
  });
}

/* ===== Produits : rendu liste ===== */
function renderList(data){
  if (!Array.isArray(data)) return;
  listEl.innerHTML = data.map(productToHTML).join('\n');
  bindAddToQuote(data);
  $$('.card', listEl).forEach(card=>{
    card.addEventListener('click', (e)=>{
      if (e.target.closest('[data-add]')) return;
      const id = card.getAttribute('data-id');
      if (!id) return;
      location.hash = `#/produit/${encodeURIComponent(id)}`;
    });
  });
  ScrollExit.observeWithin(listEl);
}

/* ===== Chargement produits ===== */
async function loadProducts(){
  try{
    const r = await fetch('products.json', { cache:'no-store' });
    const json = await r.json();
    MODELS = Array.isArray(json) ? json : (json.products || []);
    renderList(MODELS);
    renderCatalogue();
  }catch(e){
    console.error('Erreur chargement produits:', e);
    listEl.innerHTML = `
      <div class="card">
        <div class="head"><h3 class="title">Produits indisponibles</h3></div>
        <div class="specs"><p>Impossible de charger <code>products.json</code>.</p></div>
      </div>`;
  }
}
loadProducts();

/* ===== Filtre avec debounce ===== */
function debounce(fn, wait=140){ let t=0; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), wait); }; }
const applyFilters = debounce(()=>{
  const q = (searchEl?.value || '').trim().toLowerCase();
  const t = (tagEl?.value || '').trim().toLowerCase();
  const filtered = MODELS.filter(m => {
    const hay = `${fallback(m.title,'')} ${fallback(m.sku,'')} ${fallback(m.desc,fallback(m.description,''))}`.toLowerCase();
    const tag  = fallback(m.tag,'').toLowerCase();
    const okQ  = !q || hay.includes(q);
    const okT  = !t || tag === t || hay.includes(t);
    return okQ && okT;
  });
  renderList(filtered);
}, 120);
searchEl?.addEventListener('input', applyFilters, { passive:true });
tagEl?.addEventListener('change', applyFilters);

/* ===== Dock ===== */
dockQuoteBtn?.addEventListener('click', ()=>{
  if (!CART.length) return;
  const msg = encodeURIComponent(cartToWhatsAppText());
  window.open(`https://wa.me/${PHONE_E164.replace('+','')}?text=${msg}`, '_blank', 'noopener');
});
dockCartBtn?.addEventListener('click', ()=>{ location.hash = '#/devis'; });
dockCount?.addEventListener('click', ()=>{ location.hash = '#/devis'; });

/* ---------------- PWA ---------------- */
let deferredPrompt;
const installBtn = $('#installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferredPrompt = e; if (installBtn) installBtn.hidden = false;
});
installBtn?.addEventListener('click', async () => {
  installBtn.hidden = true; if (!deferredPrompt) return;
  deferredPrompt.prompt(); try{ await deferredPrompt.userChoice; }catch(_){} deferredPrompt = null;
});
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(console.warn); });
}

/* ===== Compte & Fidélité (avec mot de passe local) ===== */
const USER_KEY  = 'pt_user_v1';
const AUTH_KEY  = 'pt_auth_v1';
const SESSION_KEY = 'pt_session_login';

function loadUser(){
  try{ return JSON.parse(localStorage.getItem(USER_KEY)) || { name:'', email:'', spent:0 }; }
  catch(_){ return { name:'', email:'', spent:0 }; }
}
function saveUser(u){ try{ localStorage.setItem(USER_KEY, JSON.stringify(u)); }catch(_){} }

function gradeFromSpent(spent){
  if (spent >= 5000) return { label:'Excellent acheteur', color:'#00e1b4' };
  if (spent >= 1000) return { label:'Bon acheteur',       color:'#19d3ff' };
  return { label:'Moussaillon', color:'#9fb4c5' };
}

/* --- helpers auth (PBKDF2/SHA-256) --- */
const b64 = {
  enc: buf => btoa(String.fromCharCode(...new Uint8Array(buf))),
  dec: str => Uint8Array.from(atob(str), c => c.charCodeAt(0))
};
function getAuth(){ try{ return JSON.parse(localStorage.getItem(AUTH_KEY)) || null; }catch(_){ return null; } }
function setAuth(a){ try{ localStorage.setItem(AUTH_KEY, JSON.stringify(a)); }catch(_){} }
function isLoggedIn(){ return sessionStorage.getItem(SESSION_KEY)==='1'; }
function setLoggedIn(v){ sessionStorage.setItem(SESSION_KEY, v ? '1' : '0'); }

async function hashPassword(password, saltB64=null, iterations=200000){
  const enc = new TextEncoder();
  const salt = saltB64 ? b64.dec(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt, iterations }, keyMaterial, 256);
  return { saltB64: b64.enc(salt), hashB64: b64.enc(bits), iterations };
}
async function verifyPassword(password, auth){
  const h = await hashPassword(password, auth.saltB64, auth.iterations);
  return h.hashB64 === auth.hashB64;
}

/* UI bootstrap (injecte la section compte si manquante) */
function ensureAccountUI(){
  const view = $('#view-compte');
  if (!view) return;
  const box = view.querySelector('.container') || view;
  // Crée les conteneurs si absents
  if (!$('#accAuth', box) || !$('#accProfile', box)){
    box.innerHTML = `
      <h1 style="margin:1rem 0 .5rem">Mon compte</h1>
      <div id="accAuth" class="card" style="margin:.6rem 0; padding:1rem"></div>
      <div id="accProfile" class="card" style="margin:.6rem 0; padding:1rem; display:none">
        <div style="display:grid; gap:.6rem">
          <label>Nom <input id="accName" class="search" placeholder="Votre nom" /></label>
          <label>Email <input id="accEmail" class="search" type="email" placeholder="vous@exemple.com" /></label>
          <div>
            <strong>Fidélité</strong>
            <div class="meter">
              <div class="meter__fill" id="accFill"></div>
              <div class="meter__cursor" id="accCursor" title="Progression"></div>
            </div>
            <div style="display:flex;gap:.6rem;align-items:center;margin-top:.4rem">
              <span>Total dépensé : <strong id="accSpent">0 €</strong></span>
              <span id="accGrade" class="chip" style="margin-left:auto">Moussaillon</span>
            </div>
            <input id="accSlider" type="range" min="0" max="5000" step="50" style="width:100%; margin-top:.6rem"/>
          </div>
          <div style="display:flex; gap:.6rem; flex-wrap:wrap">
            <button class="btn primary" id="accSave">Enregistrer</button>
            <button class="btn" id="accReset" style="background:rgba(255,255,255,.06);color:#d9e3ec">Remettre la fidélité à 0</button>
            <button class="btn" id="accLogout" style="margin-left:auto;background:rgba(255,255,255,.06);color:#d9e3ec">Se déconnecter</button>
          </div>
        </div>
      </div>
    `;
  }
}

/* Rendu/logic du compte (inscription/connexion + profil) */
function renderAccount(){
  ensureAccountUI();

  const authRoot = $('#accAuth');
  const profRoot = $('#accProfile');
  if (!authRoot || !profRoot) return;

  const user = loadUser();
  const auth = getAuth();
  const logged = isLoggedIn();

  function showLogin(){
    authRoot.innerHTML = `
      <div style="display:grid;gap:.6rem">
        <p style="margin:0 0 .4rem;color:#9fb4c5">Connectez-vous pour accéder à votre profil et à la fidélité.</p>
        <label>Email <input id="loginEmail" class="search" type="email" placeholder="vous@exemple.com" value="${user.email||''}"/></label>
        <label>Mot de passe <input id="loginPass" class="search" type="password" autocomplete="current-password" /></label>
        <div style="display:flex;gap:.6rem;flex-wrap:wrap">
          <button class="btn primary" id="loginBtn">Se connecter</button>
          <button class="btn" id="gotoSignup" style="background:rgba(255,255,255,.06);color:#d9e3ec">Créer un compte</button>
        </div>
        <p id="authMsg" style="color:#ff8a8a;margin:.2rem 0 0"></p>
      </div>`;
    profRoot.style.display = 'none';
    $('#loginBtn')?.addEventListener('click', async ()=>{
      const pass = $('#loginPass')?.value || '';
      const ok = auth && pass ? await verifyPassword(pass, auth) : false;
      if (ok){ setLoggedIn(true); renderAccount(); }
      else { const m=$('#authMsg'); if (m) m.textContent='Identifiants incorrects.'; }
    });
    $('#gotoSignup')?.addEventListener('click', showSignup);
  }

  function showSignup(){
    authRoot.innerHTML = `
      <div style="display:grid;gap:.6rem">
        <p style="margin:0 0 .4rem;color:#9fb4c5">Créez un mot de passe pour protéger votre compte sur cet appareil.</p>
        <label>Nom <input id="suName" class="search" placeholder="Votre nom" value="${user.name||''}"/></label>
        <label>Email <input id="suEmail" class="search" type="email" placeholder="vous@exemple.com" value="${user.email||''}"/></label>
        <label>Mot de passe <input id="suPass1" class="search" type="password" autocomplete="new-password" placeholder="Au moins 8 caractères"/></label>
        <label>Confirmer <input id="suPass2" class="search" type="password" autocomplete="new-password"/></label>
        <div style="display:flex;gap:.6rem;flex-wrap:wrap">
          <button class="btn primary" id="signupBtn">Créer le compte</button>
          <button class="btn" id="gotoLogin" style="background:rgba(255,255,255,.06);color:#d9e3ec">J’ai déjà un compte</button>
        </div>
        <p id="authMsg" style="color:#ff8a8a;margin:.2rem 0 0"></p>
      </div>`;
    profRoot.style.display = 'none';
    $('#signupBtn')?.addEventListener('click', async ()=>{
      const name = $('#suName')?.value?.trim() || '';
      const email= $('#suEmail')?.value?.trim()||'';
      const p1   = $('#suPass1')?.value||'';
      const p2   = $('#suPass2')?.value||'';
      const msg  = $('#authMsg');
      if (p1.length<8){ if(msg) msg.textContent='Mot de passe trop court (min. 8).'; return; }
      if (p1!==p2){ if(msg) msg.textContent='Les mots de passe ne correspondent pas.'; return; }
      const h = await hashPassword(p1);
      setAuth({ ...h, createdAt: Date.now() });
      saveUser({ name, email, spent: user.spent||0 });
      setLoggedIn(true);
      renderAccount();
    });
    $('#gotoLogin')?.addEventListener('click', showLogin);
  }

  function showProfile(){
    authRoot.innerHTML = '';
    profRoot.style.display = '';

    // Préremplir (compat Safari iOS : passer par .value)
    const nameEl  = $('#accName');  if (nameEl)  nameEl.value  = user.name  || '';
    const emailEl = $('#accEmail'); if (emailEl) emailEl.value = user.email || '';
    const spentEl = $('#accSpent'); if (spentEl) spentEl.textContent = `${(user.spent||0).toLocaleString('fr-FR')} €`;

    const g = gradeFromSpent(user.spent||0);
    const gradeEl = $('#accGrade'); if (gradeEl){ gradeEl.textContent = g.label; gradeEl.style.borderColor = g.color; }
    const pct = clamp(((user.spent||0)/5000)*100, 0, 100);
    $('#accFill')  && ($('#accFill').style.width = `${pct}%`);
    $('#accCursor')&& ($('#accCursor').style.left = `${pct}%`);
    const slider = $('#accSlider'); if (slider){ slider.value = Math.min(user.spent||0, 5000); }

    $('#accSave')?.addEventListener('click', ()=>{
      const nu = { ...user, name: $('#accName')?.value || '', email: $('#accEmail')?.value || '' };
      saveUser(nu);
    }, { once:true });

    $('#accReset')?.addEventListener('click', ()=>{
      saveUser({ name:user.name, email:user.email, spent:0 });
      renderAccount();
    }, { once:true });

    $('#accSlider')?.addEventListener('input', (e)=>{
      const spent = Number(e.target.value || 0);
      saveUser({ ...user, spent });
      renderAccount();
    });

    $('#accLogout')?.addEventListener('click', ()=>{
      setLoggedIn(false);
      renderAccount();
    }, { once:true });
  }

  if (!auth){            // pas encore de mot de passe → inscription
    showSignup();
  }else if (!logged){    // mot de passe présent mais utilisateur non connecté → login
    showLogin();
  }else{                 // connecté → profil
    showProfile();
  }
}

/* [ROUTER | #/…] */
(()=>{
  const HOME_PARTS = [
    document.getElementById('hero'),
    document.querySelector('.toolbar'),
    document.querySelector('main.container'),
    document.querySelector('.ratings')
  ].filter(Boolean);

  const VIEWS = {
    catalogue: document.getElementById('view-catalogue'),
    devis:     document.getElementById('view-devis'),
    produit:   document.getElementById('view-produit'),
    compte:    document.getElementById('view-compte')
  };

  const showHome      = (yes)=> HOME_PARTS.forEach(el => el?.classList.toggle('hidden', !yes));
  const hideAllViews  = ()=> Object.values(VIEWS).forEach(el => el?.classList.add('hidden'));
  const showView      = (key)=>{ hideAllViews(); VIEWS[key]?.classList.remove('hidden'); };

  let prevHash = '';

  function wireBack(cameFrom){
    const back = document.querySelector('#pdpBack, .chip--back');
    if (!back) return;
    back.onclick = (e)=>{
      e.preventDefault();
      if (cameFrom && cameFrom !== location.hash) { location.hash = cameFrom; return; }
      if (history.length > 1) { history.back(); return; }
      location.hash = '';
    };
  }

  function onRoute(){
    const h = (location.hash || '').toLowerCase();
    const cameFrom = prevHash;

    // #/produit/:id
    let m = h.match(/^#\/produit\/([^/?#]+)/);
    if (m){
      const key = decodeURIComponent(m[1]);
      const p = typeof findProductByKey === 'function' ? findProductByKey(key) : null;
      showHome(false); showView('produit');
      if (p){ renderPDP(p); document.title = `Pirates Tools • ${p.title || p.sku || 'Produit'}`; }
      else {
        const elT = document.getElementById('pdpTitle'); const elD = document.getElementById('pdpDesc');
        if (elT) elT.textContent = 'Produit introuvable';
        if (elD) elD.textContent = 'Vérifiez la référence ou revenez au catalogue.';
      }
      wireBack(cameFrom);
      window.scrollTo({top:0, behavior:'auto'}); prevHash = h; return;
    }

    // #/catalogue
    m = h.match(/^#\/catalogue\b/);
    if (m){ showHome(false); showView('catalogue'); renderCatalogue(); document.title='Pirates Tools • Catalogue'; window.scrollTo({top:0,behavior:'auto'}); prevHash=h; return; }

    // #/devis
    m = h.match(/^#\/devis\b/);
    if (m){ showHome(false); showView('devis'); renderCartView(); document.title='Pirates Tools • Devis'; window.scrollTo({top:0,behavior:'auto'}); prevHash=h; return; }

    // #/compte
    m = h.match(/^#\/compte\b/);
    if (m){ showHome(false); showView('compte'); renderAccount(); document.title='Pirates Tools • Mon compte'; window.scrollTo({top:0,behavior:'auto'}); prevHash=h; return; }

    // Accueil
    if (h === '' || h === '#' || h === '#/' || h === '#/home'){
      showHome(true); hideAllViews(); document.title = 'Pirates Tools • Outillage pro (PWA)'; prevHash = h; return;
    }

    // fallback : accueil
    showHome(true); hideAllViews(); document.title = 'Pirates Tools • Outillage pro (PWA)'; prevHash = h;
  }

  window.addEventListener('hashchange', onRoute);
  onRoute();
})();
