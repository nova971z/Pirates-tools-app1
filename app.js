/* =========================================================
   Pirates Tools — app.js (FULL + Debug Overlay)
   - HERO : zoom massif + fondu + bascule z-index
   - Smooth scroll
   - Chargement/filtre produits
   - Dock + compteur devis (WhatsApp)
   - PWA : beforeinstallprompt + Service Worker
   - DEBUG overlay : auto-vérifications + purge cache
========================================================= */

/* ------------ Utilitaires ------------- */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/* ------------ Sélecteurs ------------- */
const hero     = $('#hero');
const heroLogo = $('#heroLogo');
const listEl   = $('#list');
const searchEl = $('#q');
const tagEl    = $('#tag');
const dock     = $('#dock');
const dockCount= $('#dockCount');
const dockQuoteBtn = $('#dockQuoteBtn');

/* =========================================================
   1) HERO : zoom + fondu + passage derrière
========================================================= */
(() => {
  if (!hero || !heroLogo) return;

  let vh = window.innerHeight || 1;
  let ticking = false;

  const update = () => {
    const isMobile  = matchMedia('(max-width: 768px)').matches;
    const y         = window.scrollY || 0;
    const progress  = clamp(y / (vh * 0.90), 0, 1);       // 0→1 sur ~90% d’écran
    const maxScale  = isMobile ? 2.35 : 1.75;             // zoom massif (ajuste si besoin)
    const scale     = 1 + (maxScale - 1) * progress;
    const translateY= -vh * 0.22 * progress;              // lift léger vers le haut
    const opacity   = clamp(1 - progress * 1.25, 0, 1);   // fondu rapide pour libérer la liste

    heroLogo.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
    heroLogo.style.opacity   = opacity.toFixed(3);

    // Quand il est vraiment invisible → passe derrière (CSS .is-hidden)
    if (opacity <= 0.02) hero.classList.add('is-hidden');
    else                 hero.classList.remove('is-hidden');
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  };

  window.addEventListener('scroll', onScroll, { passive:true });
  window.addEventListener('resize', () => { vh = window.innerHeight || 1; update(); }, { passive:true });
  update(); // init
})();

/* =========================================================
   2) Smooth scroll (liens data-scroll)
========================================================= */
$$('[data-scroll]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = a.getAttribute('data-scroll') || a.getAttribute('href');
    const el = document.querySelector(target);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 72; // marge sous topbar
    window.scrollTo({ top: y, behavior: 'smooth' });
  });
});

/* =========================================================
   3) PRODUITS : chargement + rendu + filtres
========================================================= */
let MODELS = [];
let CART   = [];

const fallback = (v, alt='') => (v===undefined || v===null) ? alt : v;

function productToHTML(m){
  const title = fallback(m.title, `${fallback(m.brand,'')}${m.brand?' ':''}${fallback(m.sku,'')}`).trim();
  const tag   = fallback(m.tag,'').trim();
  const desc  = fallback(m.desc, fallback(m.description,''));
  const id    = fallback(m.id, fallback(m.sku, title)).toString();

  return `
  <article class="card" data-id="${id}" data-tag="${tag}">
    <div class="head">
      <h3 class="title">${title}</h3>
      ${tag ? `<span class="badge">${tag}</span>` : ``}
    </div>
    <div class="specs">
      <p style="margin:0">${desc || '—'}</p>
    </div>
    <div class="actions">
      <button class="btn primary" data-add="${id}">Ajouter au devis</button>
    </div>
  </article>`;
}

function renderList(data){
  if (!Array.isArray(data)) return;
  listEl.innerHTML = data.map(productToHTML).join('\n');

  // actions "Ajouter au devis"
  $$('[data-add]', listEl).forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-add');
      const p  = data.find(x => (x.id?.toString()===id) || (x.sku?.toString()===id) || (x.title===id));
      if (!p) return;
      CART.push(p);
      if (dock && dockCount) {
        dockCount.textContent = CART.length;
        dock.classList.remove('hidden');
      }
    });
  });
}

async function loadProducts(){
  try{
    const r = await fetch('products.json', { cache:'no-store' });
    const json = await r.json();
    MODELS = Array.isArray(json) ? json : (json.products || []);
    renderList(MODELS);
    window.__PT_DEBUG?.set('Produits', MODELS.length > 0 ? '✅' : '❌');
  }catch(e){
    console.error('Erreur chargement produits:', e);
    listEl.innerHTML = `
      <div class="card"><div class="head"><h3 class="title">Produits indisponibles</h3></div>
      <div class="specs"><p>Impossible de charger <code>products.json</code>.</p></div></div>`;
    window.__PT_DEBUG?.set('Produits', '❌');
  }
}

function applyFilters(){
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
}

searchEl?.addEventListener('input', applyFilters);
tagEl?.addEventListener('change', applyFilters);

/* boot produits */
loadProducts();

/* =========================================================
   4) Dock WhatsApp (devis)
========================================================= */
dockQuoteBtn?.addEventListener('click', ()=>{
  if (!CART.length) return;
  const lines = CART.slice(0,40).map((p,i)=>{
    const sku = fallback(p.sku, fallback(p.id, i+1));
    const title = fallback(p.title, '').replace(/\s+/g,' ').trim();
    return `• ${sku} – ${title}`.trim();
  });
  const msg = encodeURIComponent(`Bonjour, je souhaite un devis pour:\n${lines.join('\n')}\n\nMerci.`);
  window.open(`https://wa.me/33774231095?text=${msg}`, '_blank', 'noopener');
});

/* =========================================================
   5) PWA : installation + Service Worker
========================================================= */
let deferredPrompt;
const installBtn = $('#installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.hidden = false;
});

installBtn?.addEventListener('click', async () => {
  installBtn.hidden = true;
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        window.__PT_DEBUG?.set('Service Worker', reg && navigator.serviceWorker.controller ? '✅' : '⏳');
      })
      .catch(() => window.__PT_DEBUG?.set('Service Worker', '❌'));
  });
}

/* =========================================================
   6) DEBUG OVERLAY (auto-vérifications)
   - Statuts : Logo, Effet scroll, Z-index, Produits, SW
   - Bouton Purge cache (désinstalle SW + vide caches)
========================================================= */
(function PTDebugOverlay(){
  const ENABLED = true; // ← mettre false pour masquer définitivement

  if (!ENABLED) return;

  // Injecte style overlay (pas besoin de modifier styles.css)
  const css = `
  #pt-debug{position:fixed;z-index:9999;left:12px;bottom:12px;max-width:92vw;
    background:rgba(5,10,14,.85);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
    color:#e6f3f8;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:.6rem .7rem;
    font:600 13px/1.45 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial}
  #pt-debug h4{margin:.1rem 0 .4rem 0;font-size:12px;opacity:.85}
  #pt-debug .row{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
  #pt-debug .tag{border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:.25rem .55rem}
  #pt-debug .btn{margin-top:.5rem;border:0;border-radius:9px;padding:.35rem .6rem;font-weight:800;color:#001018;
    background:linear-gradient(90deg,#19d3ff,#7cf4ff)}
  #pt-debug .btn:active{transform:translateY(1px)}
  #pt-debug .muted{opacity:.75}
  #pt-debug .right{float:right;margin-left:.6rem}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.id = 'pt-debug';
  box.innerHTML = `
    <h4>Diagnostic Pirates Tools</h4>
    <div class="row">
      <span class="tag" id="ptd-logo">Logo: ⏳</span>
      <span class="tag" id="ptd-effect">Effet scroll: ⏳</span>
      <span class="tag" id="ptd-z">Z-index: ⏳</span>
      <span class="tag" id="ptd-products">Produits: ⏳</span>
      <span class="tag" id="ptd-sw">Service Worker: ⏳</span>
      <button class="btn right" id="ptd-purge">Purger cache SW</button>
    </div>
    <div class="muted" style="margin-top:.4rem">Astuce: scrolle un peu pour finaliser les tests.</div>
  `;
  document.body.appendChild(box);

  const set = (name, val) => {
    const id = {
      'Logo':'ptd-logo',
      'Effet':'ptd-effect',
      'Z':'ptd-z',
      'Produits':'ptd-products',
      'Service Worker':'ptd-sw'
    }[name];
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.textContent = el.textContent.split(':')[0] + ': ' + val;
  };
  window.__PT_DEBUG = { set };

  /* Test 1 : Logo présent et charge correctement */
  (function checkLogo(){
    if (!heroLogo) { set('Logo','❌'); return; }
    const img = new Image();
    img.onload = () => set('Logo','✅');
    img.onerror = () => set('Logo','❌');
    // on force une URL absolue pour éviter les confusions de base
    try {
      const u = new URL(heroLogo.getAttribute('src'), location.href);
      img.src = u.href + (u.search ? '' : '?v=' + Date.now().toString().slice(0,7));
    } catch { img.src = heroLogo.src; }
  })();

  /* Test 2 : Effet scroll modifie transform/opacity */
  (function checkEffect(){
    if (!heroLogo) { set('Effet','❌'); return; }
    let changed = false;
    const t0 = heroLogo.style.transform;
    const o0 = heroLogo.style.opacity;
    let tries = 0;
    const tick = () => {
      tries++;
      const t1 = heroLogo.style.transform;
      const o1 = heroLogo.style.opacity;
      if (t0 !== t1 || o0 !== o1) changed = true;
      if (changed) set('Effet','✅');
      else if (tries > 30) set('Effet','❌');  // ~3s
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })();

  /* Test 3 : Z-index (par-dessus puis derrière quand fondu) */
  (function checkZ(){
    if (!hero) { set('Z','❌'); return; }
    // on observe le passage de la classe .is-hidden
    const obs = new MutationObserver(() => {
      const hidden = hero.classList.contains('is-hidden');
      set('Z', hidden ? '✅' : '⏳');
    });
    obs.observe(hero, { attributes:true, attributeFilter:['class'] });
    // état initial
    set('Z', hero.classList.contains('is-hidden') ? '✅' : '⏳');
  })();

  /* Bouton : Purger caches + SW */
  $('#ptd-purge').addEventListener('click', async ()=>{
    try{
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      alert('Caches & Service Worker supprimés.\nRecharge la page.');
    }catch(e){
      alert('Impossible de purger : ' + e.message);
    }
  });
})();
