/* =========================================================
   Pirates Tools — app.js (FULL, stable, clean)
   - Dock fixe (CSS-only) : aucun JS de reposition
   - Hero fluide Android/iOS
   - Smooth scroll (depuis une vue → retour Home)
   - Panier persistant (localStorage) + dock (🛒/badge)
   - PDP riche : description + points clés + tableau specs
   - Devis (#/devis) : quantités + envoi WhatsApp
   - Compte & Fidélité (démo locale)
   - Anti-zoom Android + bannière offline
   - Focus après navigation + toasts (CSS injecté)
========================================================= */

'use strict';

/* === Service Worker ===
   Géré UNIQUEMENT en section 15 (update banner + skipWaiting).
   -> Pas d'enregistrement ici pour éviter les doubles handlers.
*/

/* ---------- Helpers ---------- */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const fallback = (v, alt='') => (v===undefined || v===null) ? alt : v;

/* ---------- UX CSS (toasts + badge bump) injecté ---------- */
(function injectUXCSS(){
  if (document.getElementById('pt-ux-css')) return;
  const css = `
  @keyframes pt-bump { 0%{transform:scale(1)} 35%{transform:scale(1.15)} 100%{transform:scale(1)} }
  #dockCount.bump{ animation: pt-bump .42s ease }

  #toasts{ position:fixed; left:50%; bottom:calc(84px + env(safe-area-inset-bottom,0px)); transform:translateX(-50%); z-index:130; display:grid; gap:.5rem; }
  .toast{ display:grid; grid-template-columns:auto 1fr auto; gap:.6rem; padding:.6rem .75rem; border-radius:12px;
          background:rgba(10,15,20,.92); border:1px solid #22303b; color:#e6edf5; box-shadow:0 12px 24px rgba(0,0,0,.35);
          font:600 14px/1.25 system-ui,-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,Arial,sans-serif; }
  .toast__icon{ align-self:center }
  .toast__body{ align-self:center }
  .toast__close{ background:transparent; border:0; color:#9fb4c5; cursor:pointer; font-size:16px; }
  @keyframes toast-out { to { opacity:0; transform:translateY(6px) } }
  `;
  const style = document.createElement('style');
  style.id = 'pt-ux-css';
  style.textContent = css;
  document.head.appendChild(style);
})();

/* ---------- A11y helpers ---------- */
const live    = document.getElementById('sr-live') || document.getElementById('srLive');
const toastsC = $('#toasts');
const dockBadge = $('#dockCount');

function announce(msg){
  if (!live) return;
  live.textContent = '';
  setTimeout(()=>{ live.textContent = msg; }, 20);
}

function toast(msg, kind='success'){
  if (!toastsC) return;
  const el = document.createElement('div');
  el.className = `toast toast--${kind}`;
  el.innerHTML = `
    <div class="toast__icon">${kind==='success'?'✅':'ℹ️'}</div>
    <div class="toast__body">${msg}</div>
    <button class="toast__close" aria-label="Fermer">✖</button>
  `;
  const close = ()=> {
    el.style.animation = 'toast-out .18s ease-in both';
    setTimeout(()=> el.remove(), 180);
  };
  el.querySelector('.toast__close')?.addEventListener('click', close);
  toastsC.appendChild(el);
  setTimeout(close, 3200);
}

function bumpBadge(){
  if (!dockBadge) return;
  dockBadge.classList.remove('bump');
  void dockBadge.offsetWidth; // reflow
  dockBadge.classList.add('bump');
}

function notifyCartAdded(title='Article'){
  toast(`« ${title} » ajouté au devis`);
  announce(`${title} ajouté au devis`);
  bumpBadge();
}

/* ---------- Focus helper après navigation ---------- */
function focusView(key){
  let target = null;
  if (key === 'produit')      target = $('#pdpTitle');
  else if (key === 'catalogue') target = $('#view-catalogue h1');
  else if (key === 'devis')     target = $('#view-devis h1');
  else if (key === 'compte')    target = $('#view-compte h1');
  else                          target = $('#list'); // accueil

  if (target){
    target.setAttribute('tabindex','-1');
    target.focus?.({ preventScroll: true });
    setTimeout(()=> target.removeAttribute('tabindex'), 300);
  }
}

/* ---------- Globals ---------- */
const PHONE_HUMAN = '07 74 23 01 95';
const PHONE_E164  = '+33774230195';

let MODELS = [];                 // produits
let CART   = [];                 // panier (tableau d’objets produit)
const STORE_KEY = 'pt_cart_v1';  // clé localStorage
const USER_KEY  = 'pt_user_v1';  // compte (démo)

/* ---------- DOM refs ---------- */
const hero        = $('#hero');
const heroLogo    = $('#heroLogo');
const listEl      = $('#list');
const searchEl    = $('#q');
const tagEl       = $('#tag');
const dock        = $('#dock');
const dockCount   = $('#dockCount');
const dockQuoteBtn= $('#dockQuoteBtn');
const dockCartBtn = $('#dockCartBtn');
const callBtn     = $('#callBtn');
const waBtn       = $('#waBtn');
const homeLink    = $('#homeLink');

/* ===== Fallback robuste pour le(s) logo(s) ===== */
(function logoFallbacks(){
  const FALLBACK = './images/pirates-tools-logo.png?v=7';

  function ensureFallback(img){
    if (!img) return;
    // si WebP échoue → bascule PNG
    img.addEventListener('error', () => {
      if (!img.src.includes('pirates-tools-logo.png')) img.src = FALLBACK;
    });
    // si déjà cassé quand le DOM est prêt
    if (img.complete && img.naturalWidth === 0) img.src = FALLBACK;
  }

  ensureFallback(document.getElementById('heroLogo'));
  document.querySelectorAll('img.topbar-logo').forEach(ensureFallback);
})();

/* =========================================================
   0) Anti-zoom Android (facultatif, évite les échelles cassant le dock)
========================================================= */
(function lockViewportZoomOnAndroid(){
  const isAndroid = /android/i.test(navigator.userAgent);
  if (!isAndroid) return;
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  const base = 'width=device-width, initial-scale=1, viewport-fit=cover';
  meta.setAttribute('content', `${base}, maximum-scale=1, user-scalable=no`);
})();

/* =========================================================
   1) Dock : garantit la structure (CSS-only, pas de reposition JS)
========================================================= */
(function ensureDockShell(){
  const root = document.getElementById('dock');
  if (!root) return;
  if (root.firstElementChild && root.firstElementChild.classList?.contains('dock__shell')) return;
  const shell = document.createElement('div');
  shell.className = 'dock__shell';
  while (root.firstChild) shell.appendChild(root.firstChild);
  root.appendChild(shell);
})();

/* =========================================================
   2) CTA tel/wa homogènes (topbar & PDP & dock)
========================================================= */
(function syncCTA(){
  callBtn?.setAttribute('href', `tel:${PHONE_E164}`);
  if (callBtn) callBtn.innerHTML = `📞 <strong>${PHONE_HUMAN}</strong>`;
  waBtn?.setAttribute('href', `https://wa.me/${PHONE_E164.replace('+','')}`);
})();

/* =========================================================
   3) Bannière Offline / Online
========================================================= */
(function netBanner(){
  const bar = document.createElement('div');
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

  let hideT = 0;
  const show = (txt, ok) => {
    bar.textContent = txt;
    bar.style.display = 'block';
    bar.style.borderColor = ok ? '#00e1b4' : '#ff6b6b';
    clearTimeout(hideT);
    hideT = setTimeout(()=> bar.style.display='none', 2400);
  };
  window.addEventListener('offline', ()=> show('Hors ligne — contenu en cache', false));
  window.addEventListener('online',  ()=> show('De nouveau en ligne', true));
})();

/* =========================================================
   4) Logo = retour accueil (SPA, iOS-safe)
========================================================= */
(function wireLogoHome(){
  const logoLink = document.getElementById('homeLink') || document.querySelector('.topbar-logo-link');
  if (!logoLink) return;

  const goHome = (e) => {
    e.preventDefault();
    location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Click standard
  logoLink.addEventListener('click', goHome, { passive:false });

  // iOS/webviews: parfois le "click" saute → fallback pointer/touch
  logoLink.addEventListener('pointerup', (e)=>{
    if (e.pointerType === 'touch') goHome(e);
  }, { passive:false });
})();


/* =========================================================
   5) HERO : zoom + fondu (robuste iOS/Android)
   - calcule le transform directement (pas via var() CSS)
   - garde --listGap pour l’espace liste
========================================================= */
(function heroEffect(){
  if (!hero || !heroLogo) return;

  const mq  = window.matchMedia('(max-width: 768px)');
  const mqr = window.matchMedia('(prefers-reduced-motion: reduce)');
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const getVH = () => (window.visualViewport ? window.visualViewport.height : window.innerHeight) || 1;

  let vh = getVH();
  let ticking = false;

  function render(y){
    const fin = vh * (mq.matches ? 0.70 : 0.85);
    const raw = Math.max(0, Math.min(1, y / fin));
    const p   = easeOutCubic(raw);

    const maxScale = mq.matches ? 3.1 : 2.0;
    const scale    = 1 + (maxScale - 1) * p;

    const tyPxBase = (mq.matches ? 12 : 7) * (vh / 100);
    const tyPx     = tyPxBase * p;

    const opacity  = Math.max(0, Math.min(1, 1 - (mq.matches ? 1.75 : 1.25) * raw));

    const t = `translate3d(0, ${tyPx.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
    heroLogo.style.transform = t;
    heroLogo.style.webkitTransform = t;
    heroLogo.style.opacity = opacity.toFixed(3);

    const gap = (1 - raw) * (mq.matches ? 18 : 22);
    document.documentElement.style.setProperty('--listGap', `${gap.toFixed(2)}vh`);

    if (raw > 0.985) { document.body.classList.add('after-hero'); hero.classList.add('hero-out'); }
    else { document.body.classList.remove('after-hero'); hero.classList.remove('hero-out'); }
  }

  function onScroll(){
    if (!ticking){
      ticking = true;
      requestAnimationFrame(() => { render(window.scrollY || 0); ticking = false; });
    }
  }

  if (mqr.matches){
    const t0 = 'translate3d(0,0,0) scale(1)';
    heroLogo.style.transform = t0;
    heroLogo.style.webkitTransform = t0;
    heroLogo.style.opacity = '1';
    document.documentElement.style.setProperty('--listGap', '18vh');
    document.body.classList.remove('after-hero'); hero.classList.remove('hero-out');
    return;
  }

  window.addEventListener('scroll', onScroll, { passive:true });
  window.addEventListener('resize', () => { vh = getVH(); render(window.scrollY || 0); }, { passive:true });
  window.visualViewport?.addEventListener('resize', () => { vh = getVH(); render(window.scrollY || 0); }, { passive:true });
  window.addEventListener('orientationchange', () => { vh = getVH(); render(window.scrollY || 0); }, { passive:true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(window.scrollY || 0); }, { passive:true });
  window.addEventListener('pageshow', (e) => { if (e.persisted) { vh = getVH(); render(window.scrollY || 0); } }, { passive:true });

  render(window.scrollY || 0);
})();

/* =========================================================
   6) Smooth scroll (depuis une vue → retour home avant scroll)
========================================================= */
$$('[data-scroll]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const targetSel = a.getAttribute('data-scroll') || a.getAttribute('href');
    const doScroll = () => {
      const el = targetSel ? document.querySelector(targetSel) : null;
      if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
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

/* =========================================================
   7) Anim “exit” (injection CSS + IntersectionObserver)
========================================================= */
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
@media (prefers-reduced-motion: reduce) { .tool--exit-left,.tool--exit-right { animation: none; opacity: 0; } }`;
    document.head.appendChild(style);
  }
  injectExitCSS();

  let flip = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      if (entry.isIntersecting) { el.classList.remove('tool--exit-left','tool--exit-right'); el.removeAttribute('data-exited'); return; }
      if (el.dataset.exited === '1') return;
      if (entry.boundingClientRect.top >= 0) return;
      const cls = flip ? 'tool--exit-right' : 'tool--exit-left';
      flip = !flip;
      void el.offsetWidth;
      el.classList.add(cls);
      el.dataset.exited = '1';
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -10% 0px' });

  function observeWithin(root=document){ root.querySelectorAll('[data-tool]').forEach(el => io.observe(el)); }
  return { observeWithin };
})();

/* =========================================================
   8) PANIER (persistant)
========================================================= */
function updateDock(){
  if (!dock || !dockCount) return;
  dockCount.textContent = CART.length;
  dock.classList.toggle('hidden', CART.length === 0);
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

/* =========================================================
   9) PRODUITS : rendu liste / PDP
========================================================= */
function productToHTML(m){
  const title = fallback(m.title, `${fallback(m.brand,'')}${m.brand?' ':''}${fallback(m.sku,'')}`).trim();
  const tag   = fallback(m.badge, (Array.isArray(m.tags)&&m.tags[0]) || fallback(m.tag,'')).trim();
  const desc  = fallback(m.desc, fallback(m.description,''));
  const id    = fallback(m.id, fallback(m.sku, title)).toString();

  return `
  <article class="card" data-tool data-id="${id}" data-tag="${tag}">
    <div class="head">
      <h3 class="title">${title}</h3>
      ${tag ? `<span class="badge">${tag}</span>` : ``}
    </div>
    <div class="specs"><p style="margin:0">${desc || '—'}</p></div>
    <div class="actions"><button class="btn primary" data-add="${id}">Ajouter au panier</button></div>
  </article>`;
}

function bindAddToCart(scopeData){
  $$('[data-add]', listEl).forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const id = btn.getAttribute('data-add');
      const p  = scopeData.find(x => (x.id?.toString()===id) || (x.sku?.toString()===id) || (x.title===id));
      if (!p) return;
      CART.push(p);
      saveCart();
      notifyCartAdded(p.title || p.sku || 'Article');
    });
  });
}

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

function renderPDP(product){
  const wrap   = document.getElementById('pdp');
  if (!wrap) return;

  const elImg  = document.getElementById('pdpImg');
  const elT    = document.getElementById('pdpTitle');
  const elTag  = document.getElementById('pdpTag');
  const elDesc = document.getElementById('pdpDesc');
  const elSpecs= document.getElementById('pdpSpecs');
  const elRel  = document.getElementById('pdpRelated');
  const btnQ   = document.getElementById('pdpQuote');
  const btnWa  = document.getElementById('pdpWa');

  const title = product.title || `${product.brand||''} ${product.sku||''}`.trim();
  const tag   = product.badge || (Array.isArray(product.tags)&&product.tags[0]) || product.tag || '';
  const desc  = product.desc || product.description || '';
  const img   = product.img  || './images/pirates-tools-logo.png?v=7';

  elT.textContent = title;
  elTag.textContent = tag ? `#${tag}` : '';
  elDesc.textContent = desc || 'Caractéristiques à venir.';
  if (elImg){
    elImg.src = img; elImg.alt = title;
    elImg.onerror = ()=>{ elImg.onerror = null; elImg.src = './images/pirates-tools-logo.png?v=7'; };
  }

  const features = Array.isArray(product.features) ? product.features : (Array.isArray(product.specs) ? product.specs : []);
  const featHtml = features.length ? features.map(s=>`<li>${s}</li>`).join('') : '';

  const kvFromJson = (product.specs_kv && typeof product.specs_kv==='object') ? product.specs_kv : null;
  const kvDerived = {
    'Plateforme': product.platform || undefined,
    'Moteur': product.motor || undefined,
    'Couple max': (product.torque_nm!=null) ? `${product.torque_nm} Nm` : undefined,
    'Vitesses': product.rpm || undefined,
    'Cadence de chocs': product.ipm || undefined,
    'Mandrin': product.chuck || undefined,
    'Longueur': (product.length_mm!=null) ? `${product.length_mm} mm` : undefined,
    'Poids': (product.weight_kg!=null) ? `${product.weight_kg} kg` : undefined,
    'Garantie': (product.warranty_months!=null) ? `${product.warranty_months} mois` : undefined
  };
  const kvFinal = Object.fromEntries(
    Object.entries({ ...(kvFromJson||{}), ...kvDerived }).filter(([,v])=> v!=null && v!=='')
  );

  let tableHtml = '';
  if (Object.keys(kvFinal).length){
    const rows = Object.entries(kvFinal).map(([k,v])=>`<tr><th>${k}</th><td>${v}</td></tr>`).join('');
    tableHtml = `
      <li style="list-style:none; padding:0; margin:.6rem 0 0">
        <div class="badge" style="margin:0 0 .4rem; display:inline-flex; align-items:center; gap:.4rem">⚙️ Caractéristiques techniques</div>
        <div style="overflow:auto">
          <table style="width:100%; border-collapse:collapse; font-size:.95rem">
            <tbody>${rows}</tbody>
          </table>
        </div>
      </li>`;
  }

  elSpecs.innerHTML = (featHtml || tableHtml) ? `${featHtml}${tableHtml}` : '';

  btnQ.textContent = 'Ajouter au panier';
  btnQ.onclick = ()=>{
    CART.push(product);
    saveCart();
    notifyCartAdded(product.title || product.sku || 'Article');
  };

  const sku = product.sku || product.id || title;
  const msg = encodeURIComponent(`Bonjour, je souhaite un devis pour:\n• ${sku} – ${title}\n\nMerci.`);
  const phone = PHONE_E164.replace('+','');
  btnWa.href = `https://wa.me/${phone}?text=${msg}`;

  const related = MODELS.filter(m => (m!==product) && (
    (product.category && m.category===product.category) ||
    (tag && ((m.badge===tag) || (Array.isArray(m.tags) && m.tags.includes(tag))))
  )).slice(0,3);

  elRel.innerHTML = related.map(m=>`
    <article class="card" data-id="${m.id || m.sku || m.title}">
      <div class="head">
        <h3 class="title">${m.title || (m.brand||'')+' '+(m.sku||'')}</h3>
        ${(m.badge||'') ? `<span class="badge">${m.badge}</span>` : ``}
      </div>
      <div class="specs"><p style="margin:0">${m.desc || m.description || ''}</p></div>
      <div class="actions">
        <button class="btn primary" data-add="${m.id || m.sku || m.title}">Ajouter au panier</button>
      </div>
    </article>
  `).join('');

  elRel.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    const id = btn.getAttribute('data-add');
    const p  = MODELS.find(x => ((x.id||x.sku||x.title)+'') === id);
    if (p){
      CART.push(p);
      saveCart();
      notifyCartAdded(p.title || p.sku || 'Article');
    }
    e.stopPropagation();
  });

  $$('.pdp__related .card').forEach(card=>{
    card.addEventListener('click', (e)=>{
      if (e.target.closest('[data-add]')) return;
      const id = card.getAttribute('data-id');
      if (!id) return;
      location.hash = `#/produit/${encodeURIComponent(id)}`;
    });
  });
}

function renderList(data){
  if (!Array.isArray(data)) return;
  listEl.innerHTML = data.map(productToHTML).join('\n');

  bindAddToCart(data);

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

/* =========================================================
   10) CATALOGUE (catégories auto)
========================================================= */
function buildCategories(){
  const map = new Map();
  for (const m of MODELS){
    const raw = (m.category || m.badge || m.brand || '').toString().trim();
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
    applyFilters();
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

/* =========================================================
   11) CHARGEMENT PRODUITS
========================================================= */
async function loadProducts(){
  try{
    const r = await fetch('products.json', { cache:'no-store' });
    const json = await r.json();
    MODELS = Array.isArray(json) ? json : (json.products || []);
    renderList(MODELS);
    renderCatalogue();
    window.dispatchEvent(new CustomEvent('pt:productsLoaded'));
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

/* =========================================================
   12) FILTRE (debounce)
========================================================= */
function debounce(fn, wait=140){ let t=0; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), wait); }; }
const applyFilters = debounce(()=>{
  const q = (searchEl?.value || '').trim().toLowerCase();
  const t = (tagEl?.value || '').trim().toLowerCase();

  const filtered = MODELS.filter(m => {
    const hay = [
      fallback(m.title,''), fallback(m.sku,''), fallback(m.brand,''),
      fallback(m.category,''), fallback(m.desc,fallback(m.description,'')),
      (Array.isArray(m.tags) ? m.tags.join(' ') : ''), fallback(m.badge,'')
    ].join(' ').toLowerCase();

    const okQ  = !q || hay.includes(q);
    const okT  = !t || hay.includes(t);
    return okQ && okT;
  });

  renderList(filtered);
}, 120);

searchEl?.addEventListener('input', applyFilters, { passive:true });
tagEl?.addEventListener('change', applyFilters);

/* =========================================================
   13) DEVIS (#/devis) — rendu dynamique
========================================================= */
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
            <button class="btn" data-dec="${key}" aria-label="Diminuer">−</button>
            <strong>${qty}</strong>
            <button class="btn" data-inc="${key}" aria-label="Augmenter">+</button>
            <button class="btn" data-del="${key}" style="margin-left:auto;background:rgba(255,255,255,.06);color:#d9e3ec" aria-label="Supprimer">Supprimer</button>
          </div>
        </div>
      `;
    }).join('');
  }

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
    toast('Devis ouvert dans WhatsApp'); announce('Devis ouvert dans WhatsApp');
  }, { once:true });

  $('#devisClear')?.addEventListener('click', ()=>{
    CART = [];
    saveCart();
    renderCartView();
    toast('Devis vidé'); announce('Devis vidé');
  }, { once:true });
}

/* =========================================================
   14) DOCK (bas d’écran) — actions
========================================================= */
dockQuoteBtn?.addEventListener('click', ()=>{
  if (!CART.length) return;
  const msg = encodeURIComponent(cartToWhatsAppText());
  window.open(`https://wa.me/${PHONE_E164.replace('+','')}?text=${msg}`, '_blank', 'noopener');
});
dockCartBtn?.addEventListener('click', ()=>{ location.hash = '#/devis'; });
dockCount?.addEventListener('click', ()=>{ location.hash = '#/devis'; });


/* =========================================================
   15) PWA (install + SW + update banner)
========================================================= */
let deferredPrompt;
const installBtn = $('#installBtn');

function showUpdateBanner(waitingSW){
  // mini-bannière fixe au-dessus du dock
  const bar = document.createElement('div');
  bar.id = 'updateBanner';
  bar.innerHTML = `
    <div style="display:flex;gap:.6rem;align-items:center">
      <span>Nouvelle version disponible.</span>
      <button class="btn primary" id="btnReload">Mettre à jour</button>
    </div>`;
  Object.assign(bar.style, {
    position:'fixed', left:'50%', transform:'translateX(-50%)',
    bottom:'calc(96px + env(safe-area-inset-bottom,0px))',
    background:'rgba(10,15,20,.92)', border:'1px solid var(--border)',
    padding:'.5rem .7rem', borderRadius:'10px', zIndex:'130', boxShadow:'var(--shadow)'
  });
  document.body.appendChild(bar);

  $('#btnReload', bar)?.addEventListener('click', ()=>{
    waitingSW.postMessage('SKIP_WAITING');
  });

  // Quand le nouveau SW devient contrôleur → on recharge
  navigator.serviceWorker.addEventListener('controllerchange', ()=> location.reload());
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferredPrompt = e; if (installBtn) installBtn.hidden = false;
});
installBtn?.addEventListener('click', async () => {
  installBtn.hidden = true; if (!deferredPrompt) return;
  deferredPrompt.prompt(); try{ await deferredPrompt.userChoice; }catch(_){} deferredPrompt = null;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');

      // SW déjà prêt à remplacer ?
      if (reg.waiting) showUpdateBanner(reg.waiting);

      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && reg.waiting) {
            showUpdateBanner(reg.waiting);
          }
        });
      });
    } catch (err) {
      console.warn(err);
    }
  });
}

// Petits toasts réseau (déjà visibles)
window.addEventListener('online',  ()=> toast('Connexion rétablie', 'success'));
window.addEventListener('offline', ()=> toast('Vous êtes hors ligne', 'info'));

/* =========================================================
   16) COMPTE & FIDÉLITÉ (démo locale)
========================================================= */
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
function renderAccount(){
  const u = loadUser();
  $('#accName')?.setAttribute('value', u.name || '');
  $('#accEmail')?.setAttribute('value', u.email || '');
  $('#accSpent') && ($('#accSpent').textContent = `${u.spent.toLocaleString('fr-FR')} €`);

  const g = gradeFromSpent(u.spent);
  const gradeEl = $('#accGrade'); if (gradeEl){ gradeEl.textContent = g.label; gradeEl.style.borderColor = g.color; }

  const pct = clamp((u.spent/5000)*100, 0, 100);
  $('#accFill')  && ($('#accFill').style.width = `${pct}%`);
  $('#accCursor')&& ($('#accCursor').style.left = `${pct}%`);
  const slider = $('#accSlider'); if (slider){ slider.value = Math.min(u.spent, 5000); }

  $('#accSave')?.addEventListener('click', ()=>{
    const nu = { ...u, name: $('#accName')?.value || '', email: $('#accEmail')?.value || '' };
    saveUser(nu);
  }, { once:true });

  $('#accReset')?.addEventListener('click', ()=>{
    saveUser({ name:u.name, email:u.email, spent:0 });
    renderAccount();
  }, { once:true });

  $('#accSlider')?.addEventListener('input', (e)=>{
    const spent = Number(e.target.value || 0);
    const nu = { ...u, spent };
    saveUser(nu);
    renderAccount();
  });
}

/* =========================================================
   17) ROUTER (#/…)
========================================================= */
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
      const tryRender = ()=>{
        const p = findProductByKey(key);
        showHome(false); showView('produit');
        if (p){
          renderPDP(p);
          document.title = `Pirates Tools • ${p.title || p.sku || 'Produit'}`;
        }else{
          $('#pdpTitle') && ($('#pdpTitle').textContent = 'Produit introuvable');
          $('#pdpDesc')  && ($('#pdpDesc').textContent  = 'Vérifiez la référence ou revenez au catalogue.');
        }
        wireBack(cameFrom);
        window.scrollTo({top:0, behavior:'auto'});
        focusView('produit');
        prevHash = h;
      };
      if (!MODELS.length){
        const once = ()=>{ window.removeEventListener('pt:productsLoaded', once); tryRender(); };
        window.addEventListener('pt:productsLoaded', once, { once:true });
      }else{
        tryRender();
      }
      return;
    }

    // #/catalogue
    m = h.match(/^#\/catalogue\b/);
    if (m){
      showHome(false); showView('catalogue'); renderCatalogue();
      document.title='Pirates Tools • Catalogue';
      window.scrollTo({top:0,behavior:'auto'});
      focusView('catalogue');
      prevHash=h; return;
    }

    // #/devis
    m = h.match(/^#\/devis\b/);
    if (m){
      showHome(false); showView('devis'); renderCartView();
      document.title='Pirates Tools • Devis';
      window.scrollTo({top:0,behavior:'auto'});
      focusView('devis');
      prevHash=h; return;
    }

    // #/compte
    m = h.match(/^#\/compte\b/);
    if (m){
      showHome(false); showView('compte'); renderAccount();
      document.title='Pirates Tools • Mon compte';
      window.scrollTo({top:0,behavior:'auto'});
      focusView('compte');
      prevHash=h; return;
    }

    // Accueil
    if (h === '' || h === '#' || h === '#/' || h === '#/home'){
      showHome(true); hideAllViews();
      document.title = 'Pirates Tools • Outillage pro (PWA)';
      window.scrollTo({top:0,behavior:'auto'});
      focusView('home');
      prevHash = h; return;
    }

    // fallback : accueil
    showHome(true); hideAllViews();
    document.title = 'Pirates Tools • Outillage pro (PWA)';
    window.scrollTo({top:0,behavior:'auto'});
    focusView('home');
    prevHash = h;
  }

  window.addEventListener('hashchange', onRoute);
  onRoute();
})();
