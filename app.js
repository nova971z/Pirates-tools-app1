/* =========================================================
   Pirates Tools — app.js (FULL, Android smooth + fixes)
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
const callBtn     = $('#callBtn');
const waBtn       = $('#waBtn');
const homeLink    = $('#homeLink'); // (optionnel si présent dans le HTML)

/* Harmonise les CTA */
(function syncCTA(){
  callBtn?.setAttribute('href', `tel:${PHONE_E164}`);
  if (callBtn) callBtn.innerHTML = `📞 <strong>${PHONE_HUMAN}</strong>`;
  waBtn?.setAttribute('href', `https://wa.me/${PHONE_E164.replace('+','')}`);
})();

/* Logo = retour accueil partout (supporte id #homeLink OU .topbar-logo-link) */
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

    /* distance d’animation plus courte => disparition plus tôt */
    const finish = vh * (mq.matches ? 0.70 : 0.85);
    const raw = clamp(y / finish, 0, 1);
    const p = easeOutCubic(raw);

    /* zoom fort côté mobile, un peu moins sur desktop */
    const maxScale = mq.matches ? 3.1 : 2.0;
    const scale = 1 + (maxScale - 1) * p;

    const tyVh = (mq.matches ? 12 : 7) * p;                           // translation
    const opacity = clamp(1 - (mq.matches ? 1.75 : 1.25) * raw, 0, 1); // fondu plus rapide

    heroLogo.style.setProperty('--heroScale', scale.toFixed(3));
    heroLogo.style.setProperty('--heroY', `${tyVh.toFixed(2)}vh`);
    heroLogo.style.setProperty('--heroAlpha', opacity.toFixed(3));

    /* espace élastique au-dessus de la liste ET de la toolbar */
    const gap = (1 - raw) * (mq.matches ? 18 : 22);  // en vh
    document.documentElement.style.setProperty('--listGap', `${gap.toFixed(2)}vh`);

    /* bascule d'empilement quand l’anim est terminée */
    if (raw > 0.985) {
      document.body.classList.add('after-hero');
      hero.classList.add('hero-out');
    } else {
      document.body.classList.remove('after-hero');
      hero.classList.remove('hero-out');
    }
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

  /* réduit l’anim si l’utilisateur préfère moins de mouvement */
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

/* ---------------- Smooth scroll ---------------- */
$$('[data-scroll]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = a.getAttribute('data-scroll') || a.getAttribute('href');
    const el = target ? document.querySelector(target) : null;
    if (!el) return;
    el.scrollIntoView({ behavior:'smooth', block:'start' });
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

  let flip = false; // alternance gauche/droite

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;

      if (entry.isIntersecting) {
        el.classList.remove('tool--exit-left', 'tool--exit-right');
        el.removeAttribute('data-exited');
        return;
      }

      if (el.dataset.exited === '1') return;

      const rect = entry.boundingClientRect;
      const exitingUp = rect.top < 0;
      if (!exitingUp) return;

      const cls = flip ? 'tool--exit-right' : 'tool--exit-left';
      flip = !flip;

      void el.offsetWidth; // reflow

      el.classList.add(cls);
      el.dataset.exited = '1';
    });
  }, {
    threshold: 0.01,
    rootMargin: '0px 0px -10% 0px'
  });

  function observeWithin(root=document){
    root.querySelectorAll('[data-tool]').forEach(el => io.observe(el));
  }

  return { observeWithin };
})();

/* ---------------- Produits : chargement + filtre ---------------- */
let MODELS = [];
let CART   = [];

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
    <div class="specs">
      <p style="margin:0">${desc || '—'}</p>
    </div>
    <div class="actions">
      <button class="btn primary" data-add="${id}">Ajouter au devis</button>
    </div>
  </article>`;
}

function bindAddToQuote(scopeData){
  $$('[data-add]', listEl).forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-add');
      const p  = scopeData.find(x => (x.id?.toString()===id) || (x.sku?.toString()===id) || (x.title===id));
      if (!p) return;
      CART.push(p);
      if (dock && dockCount){
        dockCount.textContent = CART.length;
        dock.classList.remove('hidden');
      }
    });
  });
}

// Trouve un produit par id/sku/titre
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

// Remplit la vue PDP
function renderPDP(product){
  const wrap   = document.getElementById('pdp');
  const elImg  = document.getElementById('pdpImg');
  const elT    = document.getElementById('pdpTitle');
  const elTag  = document.getElementById('pdpTag');
  const elDesc = document.getElementById('pdpDesc');
  const elSpecs= document.getElementById('pdpSpecs');
  const elRel  = document.getElementById('pdpRelated');
  const btnQ   = document.getElementById('pdpQuote');
  const btnWa  = document.getElementById('pdpWa');

  if (!wrap) return;

  const title = product.title || `${product.brand||''} ${product.sku||''}`.trim();
  const tag   = product.tag || '';
  const desc  = product.desc || product.description || '';
  const img   = product.img || './images/pirates-tools-logo.png?v=7';

  elT.textContent = title;
  elTag.textContent = tag ? `#${tag}` : '';
  elDesc.textContent = desc || 'Caractéristiques à venir.';
  elImg.src = img; elImg.alt = title;

  const specs = Array.isArray(product.specs) ? product.specs : [];
  elSpecs.innerHTML = specs.map(s=>`<li>${s}</li>`).join('');

  const sku = product.sku || product.id || title;
  const msg = encodeURIComponent(`Bonjour, je souhaite un devis pour:\n• ${sku} – ${title}\n\nMerci.`);
  const phone = (typeof PHONE_E164 === 'string' ? PHONE_E164.replace('+','') : '33774230195');
  btnWa.href = `https://wa.me/${phone}?text=${msg}`;

  btnQ.onclick = ()=>{
    CART.push(product);
    if (dock && dockCount){ dockCount.textContent = CART.length; dock.classList.remove('hidden'); }
  };

  const related = MODELS.filter(m => (m!==product) && tag && (m.tag===tag)).slice(0,3);
  elRel.innerHTML = related.map(m=>`
    <article class="card" data-id="${m.id || m.sku || m.title}">
      <div class="head">
        <h3 class="title">${m.title || (m.brand||'')+' '+(m.sku||'')}</h3>
        ${m.tag ? `<span class="badge">${m.tag}</span>` : ``}
      </div>
      <div class="specs"><p style="margin:0">${m.desc || m.description || ''}</p></div>
      <div class="actions">
        <button class="btn primary" data-add="${m.id || m.sku || m.title}">Ajouter au devis</button>
      </div>
    </article>
  `).join('');

  $$('.pdp__related .card').forEach(card=>{
    card.addEventListener('click', (e)=>{
      if (e.target.closest('[data-add]')) return;
      const id = card.getAttribute('data-id');
      if (!id) return;
      location.hash = `#/produit/${encodeURIComponent(id)}`;
    });
  });

  bindAddToQuote(related);
}

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

  // démarre l’observateur pour l’anim de sortie
  ScrollExit.observeWithin(listEl);
}

/* ========= [CATALOGUE DYNAMIQUE] ========= */
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
          <div class="head">
            <h3 class="title">${c.label}</h3>
            <span class="badge">Catégorie</span>
          </div>
          <div class="specs"><p style="margin:0">${c.count} produit${c.count>1?'s':''}</p></div>
          <div class="actions"><button class="btn primary" data-cat-go="${c.key}">Voir</button></div>
        </article>
      `).join('')
    : `<div class="card"><div class="specs"><p style="margin:0">Aucune catégorie détectée.</p></div></div>`;

  const go = (key)=>{
    if (tagEl) tagEl.value = key;
    if (typeof applyFilters === 'function') applyFilters();
    location.hash = '';  // accueil
    setTimeout(()=> document.getElementById('list')?.scrollIntoView({behavior:'smooth'}), 60);
  };

  root.addEventListener('click', e=>{
    const btn = e.target.closest('[data-cat-go]');
    const card= e.target.closest('.cat-card');
    if (btn) return go(btn.dataset.catGo);
    if (card) return go(card.dataset.cat);
  });
}
/* ========= /CATALOGUE DYNAMIQUE ========= */

async function loadProducts(){
  try{
    const r = await fetch('products.json', { cache:'no-store' });
    const json = await r.json();
    MODELS = Array.isArray(json) ? json : (json.products || []);
    renderList(MODELS);
    renderCatalogue(); // <-- remplit la vue Catalogue
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

/* Filtre avec debounce */
function debounce(fn, wait=140){
  let t=0; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), wait); };
}
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

/* ---------------- Dock WhatsApp (devis) ---------------- */
dockQuoteBtn?.addEventListener('click', ()=>{
  if (!CART.length) return;
  const lines = CART.slice(0,40).map((p,i)=>{
    const sku = fallback(p.sku, fallback(p.id, i+1));
    const title = fallback(p.title, '').replace(/\s+/g,' ').trim();
    return `• ${sku} – ${title}`.trim();
  });
  const msg = encodeURIComponent(`Bonjour, je souhaite un devis pour:\n${lines.join('\n')}\n\nMerci.`);
  window.open(`https://wa.me/${PHONE_E164.replace('+','')}?text=${msg}`, '_blank', 'noopener');
});

/* ---------------- PWA ---------------- */
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
  try{ await deferredPrompt.userChoice; }catch(_){}  // ignore
  deferredPrompt = null;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(console.warn);
  });
}


/* [ROUTER | #/…] — mini routeur hash (home, catalogue, devis, produit) */
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
    produit:   document.getElementById('view-produit')
  };

  const showHome      = (yes)=> HOME_PARTS.forEach(el => el?.classList.toggle('hidden', !yes));
  const hideAllViews  = ()=> Object.values(VIEWS).forEach(el => el?.classList.add('hidden'));
  const showView      = (key)=>{ hideAllViews(); VIEWS[key]?.classList.remove('hidden'); };

  let prevHash = '';                        // ← mémorise d’où on vient

  function wireBack(cameFrom){              // ← “Retour” intelligent
    const back = document.querySelector('#pdpBack, .chip--back'); // <-- compat avec ton HTML
    if (!back) return;
    back.onclick = (e)=>{
      e.preventDefault();
      if (cameFrom && cameFrom !== location.hash) {
        location.hash = cameFrom;
        return;
      }
      if (history.length > 1) {
        history.back();
        return;
      }
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

      showHome(false);
      showView('produit');

      if (p){
        renderPDP(p);
        document.title = `Pirates Tools • ${p.title || p.sku || 'Produit'}`;
      } else {
        const elT = document.getElementById('pdpTitle');
        const elD = document.getElementById('pdpDesc');
        if (elT) elT.textContent = 'Produit introuvable';
        if (elD) elD.textContent = 'Vérifiez la référence ou revenez au catalogue.';
      }

      wireBack(cameFrom);
      window.scrollTo({top:0, behavior:'auto'});
      prevHash = h;
      return;
    }

    // #/catalogue
    m = h.match(/^#\/catalogue\b/);
    if (m){
      showHome(false);
      showView('catalogue');
      renderCatalogue();                       // <-- AJOUT : (re)remplit la vue
      document.title = 'Pirates Tools • Catalogue';
      window.scrollTo({top:0, behavior:'auto'});
      prevHash = h;
      return;
    }

    // #/devis
    m = h.match(/^#\/devis\b/);
    if (m){
      showHome(false);
      showView('devis');
      document.title = 'Pirates Tools • Devis';
      window.scrollTo({top:0, behavior:'auto'});
      prevHash = h;
      return;
    }

    // Accueil
    if (h === '' || h === '#' || h === '#/' || h === '#/home'){
      showHome(true);
      hideAllViews();
      document.title = 'Pirates Tools • Outillage pro (PWA)';
      prevHash = h;
      return;
    }

    // fallback : accueil
    showHome(true);
    hideAllViews();
    document.title = 'Pirates Tools • Outillage pro (PWA)';
    prevHash = h;
  }

  window.addEventListener('hashchange', onRoute);
  onRoute();
})();
