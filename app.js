/* =========================================================
   Pirates Tools — app.js (FULL, Android smooth + fixes)
   + FIX data-scroll: retour à Home avant de scroller
   + Devis rendu dynamique + dock panier → #/devis
   + Compte & Fidélité (localStorage + curseur)
   + Slug produit robuste (résout #/produit/dewalt-dcf887-n)
   + Boutons "Ajouter au panier"
========================================================= */

const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const fallback = (v, alt='') => (v===undefined || v===null) ? alt : v;

/* --------- Helpers slug --------- */
function slugify(str){
  return String(str||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')   // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')                        // sep
    .replace(/^-+|-+$/g,'');                           // trim -
}
function productSlug(m){
  // priorité éventuelle à m.slug si présent
  if (m.slug) return slugify(m.slug);
  const base = (m.brand ? `${m.brand} ` : '') + (m.sku || m.title || '');
  return slugify(base || m.id || '');
}

/* --------- Téléphone / CTA --------- */
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
const dockCartBtn = $('#dockCartBtn');
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

/* ===== Rendu carte produit (liste) ===== */
function productToHTML(m){
  const title = fallback(m.title, `${fallback(m.brand,'')}${m.brand?' ':''}${fallback(m.sku,'')}`).trim();
  const tag   = fallback(m.tag,'').trim();
  const desc  = fallback(m.desc, fallback(m.description,''));
  const slug  = productSlug(m); // <<< identifiant de navigation unique

  return `
  <article class="card" data-tool data-id="${slug}" data-tag="${tag}">
    <div class="head">
      <h3 class="title">${title}</h3>
      ${tag ? `<span class="badge">${tag}</span>` : ``}
    </div>
    <div class="specs"><p style="margin:0">${desc || '—'}</p></div>
    <div class="actions"><button class="btn primary" data-add="${slug}">Ajouter au panier</button></div>
  </article>`;
}

function bindAddToQuote(scopeData){
  $$('[data-add]', listEl).forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const slug = btn.getAttribute('data-add');
      const p  = scopeData.find(x => productSlug(x) === slug);
      if (!p) return;
      CART.push(p);
      saveCart();
    });
  });
}

/* Trouve un produit par id/sku/titre/slug (+ tolérant) */
function plain(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''); }
function findProductByKey(key){
  if (!key) return null;
  const kSlug = slugify(key);
  const kFlat = plain(key);

  return MODELS.find(m=>{
    const id  = (m.id ?? m.sku ?? m.title ?? '').toString();
    const fields = [
      id,
      m.sku, m.title, m.brand && `${m.brand} ${m.sku||m.title||''}`,
      productSlug(m)
    ].filter(Boolean);

    // 1) égalité stricte sur slug
    if (fields.some(f => slugify(f) === kSlug)) return true;

    // 2) égalité stricte sur "flat" (sans tirets/espaces)
    if (fields.some(f => plain(f) === kFlat)) return true;

    // 3) inclusion (tolérant ex: "dewalt-dcf887-n" ≈ "DCF887N")
    if (fields.some(f => plain(f).includes(kFlat) || kFlat.includes(plain(f)))) return true;

    return false;
  }) || null;
}

/* ===== Rendu de la vue PDP ===== */
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

  // Label bouton
  if (btnQ) btnQ.textContent = 'Ajouter au panier';

  // specs (liste)
  const specs = Array.isArray(product.specs) ? product.specs : [];
  elSpecs.innerHTML = specs.map(s=>`<li>${s}</li>`).join('');

  // WhatsApp direct
  const sku = product.sku || product.id || title;
  const msg = encodeURIComponent(`Bonjour, je souhaite un devis pour:\n• ${sku} – ${title}\n\nMerci.`);
  const phone = (typeof PHONE_E164 === 'string' ? PHONE_E164.replace('+','') : '33774230195');
  btnWa && (btnWa.href = `https://wa.me/${phone}?text=${msg}`);

  // Ajouter au panier
  if (btnQ){
    btnQ.onclick = ()=>{
      CART.push(product);
      saveCart();
    };
  }

  // Produits liés (même tag)
  const related = MODELS.filter(m => (m!==product) && tag && (m.tag===tag)).slice(0,3);
  elRel.innerHTML = related.map(m=>`
    <article class="card" data-id="${productSlug(m)}">
      <div class="head">
        <h3 class="title">${m.title || (m.brand||'')+' '+(m.sku||'')}</h3>
        ${m.tag ? `<span class="badge">${m.tag}</span>` : ``}
      </div>
      <div class="specs"><p style="margin:0">${m.desc || m.description || ''}</p></div>
      <div class="actions">
        <button class="btn primary" data-add="${productSlug(m)}">Ajouter au panier</button>
      </div>
    </article>
  `).join('');

  // clic sur une carte liée → PDP
  $$('.pdp__related .card').forEach(card=>{
    card.addEventListener('click', (e)=>{
      if (e.target.closest('[data-add]')) return;
      const id = card.getAttribute('data-id');
      if (!id) return;
      location.hash = `#/produit/${encodeURIComponent(id)}`;
    });
  });

  // activer "Ajouter au panier" sur les liées
  $$('[data-add]', elRel).forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const slug = btn.getAttribute('data-add');
      const p  = MODELS.find(x => productSlug(x) === slug);
      if (!p) return;
      CART.push(p);
      saveCart();
    });
  });
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
      const slug = card.getAttribute('data-id');
      if (!slug) return;
      location.hash = `#/produit/${encodeURIComponent(slug)}`;
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

/* ===== Compte & Fidélité (démo locale) ===== */
const USER_KEY = 'pt_user_v1';
function loadUser(){
  try{
    return JSON.parse(localStorage.getItem(USER_KEY)) || { name:'', email:'', spent:0 };
  }catch(_){ return { name:'', email:'', spent:0 }; }
}
function saveUser(u){
  try{ localStorage.setItem(USER_KEY, JSON.stringify(u)); }catch(_){}
}
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

  // Progression 0 → 5000
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
