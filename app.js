/* =========================================================
   Pirates Tools — app.js (FULL)
   + Panier persistant + vue devis
   + Fiche produit : bulle “Caractéristiques techniques” (tableau)
   + CTA “Ajouter au panier”
========================================================= */

const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/* Numéro unique */
const PHONE_HUMAN = '07 74 23 01 95';
const PHONE_E164  = '+33774230195';

/* Sélecteurs principaux */
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

/* Harmonise les CTA header */
(function syncCTA(){
  callBtn?.setAttribute('href', `tel:${PHONE_E164}`);
  if (callBtn) callBtn.innerHTML = `📞 <strong>${PHONE_HUMAN}</strong>`;
  waBtn?.setAttribute('href', `https://wa.me/${PHONE_E164.replace('+','')}`);
})();

/* Logo = retour accueil */
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
  let vh = getVH(), ticking = false;

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
  function onScroll(){ if (!ticking){ ticking = true; requestAnimationFrame(()=>{ compute(); ticking=false; }); } }

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

/* ---------------- Smooth scroll (depuis une vue → revenir Home) ---------------- */
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
    } else { doScroll(); }
  });
});

/* ---------------- Exit animation au scroll (injection rapide) ---------------- */
const ScrollExit = (function () {
  function injectExitCSS(){
    if (document.getElementById('exit-anim-css')) return;
    const style = document.createElement('style');
    style.id = 'exit-anim-css';
    style.textContent = `
@keyframes exitLeft { to { transform: translateX(-60px); opacity:0; filter:blur(2px);} }
@keyframes exitRight{ to { transform: translateX( 60px); opacity:0; filter:blur(2px);} }
.tool--exit-left  { animation: exitLeft 420ms cubic-bezier(.22,.61,.36,1) forwards; will-change: transform, opacity; }
.tool--exit-right { animation: exitRight 420ms cubic-bezier(.22,.61,.36,1) forwards; will-change: transform, opacity; }
@media (prefers-reduced-motion: reduce){ .tool--exit-left,.tool--exit-right{ animation:none; opacity:0; } }`;
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
      flip = !flip; void el.offsetWidth; el.classList.add(cls); el.dataset.exited = '1';
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -10% 0px' });

  return { observeWithin(root=document){ root.querySelectorAll('[data-tool]').forEach(el => io.observe(el)); } };
})();

/* ---------------- Produits / Panier ---------------- */
let MODELS = [];
let CART   = [];
const STORE_KEY = 'pt_cart_v1';

function updateDock(){
  if (!dock || !dockCount) return;
  dockCount.textContent = CART.length;
  if (CART.length) dock.classList.remove('hidden');
}
function saveCart(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(CART)); }catch(_){} updateDock(); }
function loadCart(){
  try{ CART = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }catch(_){ CART = []; }
  updateDock();
}
loadCart();

const keyOf = p => (p?.id ?? p?.sku ?? p?.title ?? '').toString();
function groupCart(){
  const map = new Map();
  CART.forEach(p=>{ const k=keyOf(p); const g = map.get(k) || { item:p, qty:0 }; g.qty++; map.set(k,g); });
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
const fallback = (v, alt='') => (v===undefined || v===null) ? alt : v;

/* Carte produit (liste) */
function productToHTML(m){
  const title = fallback(m.title, `${fallback(m.brand,'')}${m.brand?' ':''}${fallback(m.sku,'')}`).trim();
  const tag   = fallback(m.badge, fallback(m.tag,'')).trim();
  const desc  = fallback(m.desc, fallback(m.description,''));
  const id    = fallback(m.id, fallback(m.sku, title)).toString();
  return `
  <article class="card" data-tool data-id="${id}" data-tag="${tag}">
    <div class="head">
      <h3 class="title">${title}</h3>
      ${tag ? `<span class="badge">${tag}</span>` : ``}
    </div>
    <div class="specs"><p style="margin:0">${desc || '—'}</p></div>
    <div class="actions">
      <button class="btn primary" data-add="${id}">Ajouter au panier</button>
    </div>
  </article>`;
}
function bindAddToQuote(scopeData){
  $$('[data-add]', listEl).forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-add');
      const p  = scopeData.find(x => (x.id?.toString()===id) || (x.sku?.toString()===id) || (x.title===id));
      if (!p) return;
      CART.push(p); saveCart();
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

/* ===== FICHE PRODUIT ===== */
function renderPDP(product){
  const wrap   = $('#pdp');
  const elImg  = $('#pdpImg');
  const elT    = $('#pdpTitle');
  const elTag  = $('#pdpTag');
  const elDesc = $('#pdpDesc');
  const elSpecs= $('#pdpSpecs');
  const elRel  = $('#pdpRelated');
  const btnQ   = $('#pdpQuote');
  const btnWa  = $('#pdpWa');
  const techWrap= $('#pdpTech');
  const techBtn = $('#techToggle');

  if (!wrap) return;

  const title = product.title || `${product.brand||''} ${product.sku||''}`.trim();
  const tag   = product.badge || product.tag || '';
  const desc  = product.desc || product.description || '';
  const img   = product.img || './images/pirates-tools-logo.png?v=7';

  elT.textContent = title;
  elTag.textContent = tag ? `#${tag}` : '';
  elDesc.textContent = desc || 'Caractéristiques à venir.';
  elImg.src = img; elImg.alt = title;

  /* Puces “points clés” */
  const features = Array.isArray(product.features) ? product.features
                   : (Array.isArray(product.specs) ? product.specs : []);
  elSpecs.innerHTML = features.map(s=>`<li>${s}</li>`).join('');

  /* Tableau technique */
  const kv = product.specs_kv || {};
  const rows = Object.entries(kv).map(([k,v])=>`
    <tr><th scope="row">${k}</th><td>${v}</td></tr>
  `).join('');
  techWrap.innerHTML = rows
    ? `<table class="tech-table" role="table">
         <tbody>${rows}</tbody>
       </table>`
    : `<div class="tech-empty">Caractéristiques détaillées à venir.</div>`;

  /* Boutons */
  btnQ.textContent = 'Ajouter au panier';
  btnQ.onclick = ()=>{ CART.push(product); saveCart(); };
  const sku = product.sku || product.id || title;
  const msg = encodeURIComponent(product.whatsapp_template || `Bonjour, je souhaite un devis pour:\n• ${sku} – ${title}\n\nMerci.`);
  const phone = (typeof PHONE_E164 === 'string' ? PHONE_E164.replace('+','') : '33774230195');
  btnWa.href = `https://wa.me/${phone}?text=${msg}`;

  /* Toggle bulle caractéristiques */
  if (techBtn){
    techBtn.setAttribute('aria-expanded','false');
    techWrap.classList.add('hidden');
    techBtn.onclick = ()=>{
      const open = techBtn.getAttribute('aria-expanded') === 'true';
      techBtn.setAttribute('aria-expanded', String(!open));
      techWrap.classList.toggle('hidden', open);
    };
  }

  /* Produits liés (même catégorie ou tag) */
  const related = MODELS.filter(m => (m!==product) && (
                        (product.category && m.category===product.category) ||
                        (tag && (m.badge===tag || m.tag===tag))
                      )).slice(0,3);
  elRel.innerHTML = related.map(m=>`
    <article class="card" data-id="${m.id || m.sku || m.title}">
      <div class="head">
        <h3 class="title">${m.title || (m.brand||'')+' '+(m.sku||'')}</h3>
        ${m.badge||m.tag ? `<span class="badge">${m.badge||m.tag}</span>` : ``}
      </div>
      <div class="specs"><p style="margin:0">${m.desc || m.description || ''}</p></div>
      <div class="actions">
        <button class="btn primary" data-add="${m.id || m.sku || m.title}">Ajouter au panier</button>
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

/* ===== Catalogue dynamique ===== */
function buildCategories(){
  const map = new Map();
  for (const m of MODELS){
    const raw = (m.category || m.badge || m.tag || m.brand || '').toString().trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    map.set(key, { key, label: raw, count: (map.get(key)?.count || 0) + 1 });
  }
  return [...map.values()].sort((a,b)=> b.count - a.count);
}
function renderCatalogue(){
  const root = $('#catList'); if (!root) return;
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
    setTimeout(()=> $('#list')?.scrollIntoView({behavior:'smooth'}), 60);
  };
  root.addEventListener('click', e=>{
    const btn = e.target.closest('[data-cat-go]');
    const card= e.target.closest('.cat-card');
    if (btn) return go(btn.dataset.catGo);
    if (card) return go(card.dataset.cat);
  });
}

/* ===== Liste produits ===== */
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

/* ===== Filtre ===== */
function debounce(fn, wait=140){ let t=0; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), wait); }; }
const applyFilters = debounce(()=>{
  const q = (searchEl?.value || '').trim().toLowerCase();
  const t = (tagEl?.value || '').trim().toLowerCase();
  const filtered = MODELS.filter(m => {
    const hay = `${fallback(m.title,'')} ${fallback(m.sku,'')} ${fallback(m.desc,fallback(m.description,''))}`.toLowerCase();
    const tag  = (fallback(m.badge, fallback(m.tag,''))).toLowerCase();
    const okQ  = !q || hay.includes(q);
    const okT  = !t || tag === t || hay.includes(t) || (m.category||'').toLowerCase()===t;
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

/* ===== Compte (fidélité, déjà présent côté HTML/CSS) ===== */
const USER_KEY = 'pt_user_v1';
function loadUser(){ try{ return JSON.parse(localStorage.getItem(USER_KEY)) || { name:'', email:'', spent:0 }; }catch(_){ return { name:'', email:'', spent:0 }; } }
function saveUser(u){ try{ localStorage.setItem(USER_KEY, JSON.stringify(u)); }catch(_){} }
function gradeFromSpent(spent){ if (spent>=5000) return {label:'Excellent acheteur',color:'#00e1b4'}; if (spent>=1000) return {label:'Bon acheteur',color:'#19d3ff'}; return {label:'Moussaillon',color:'#9fb4c5'}; }
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
  $('#accSave')?.addEventListener('click', ()=>{ const nu={...u, name:$('#accName')?.value||'', email:$('#accEmail')?.value||''}; saveUser(nu); }, { once:true });
  $('#accReset')?.addEventListener('click', ()=>{ saveUser({ name:u.name, email:u.email, spent:0 }); renderAccount(); }, { once:true });
  $('#accSlider')?.addEventListener('input', (e)=>{ const spent=Number(e.target.value||0); saveUser({...u, spent}); renderAccount(); });
}

/* ===== Mini routeur ===== */
(()=>{
  const HOME_PARTS = [$('#hero'), $('.toolbar'), $('main.container'), $('.ratings')].filter(Boolean);
  const VIEWS = { catalogue: $('#view-catalogue'), devis: $('#view-devis'), produit: $('#view-produit'), compte: $('#view-compte') };
  const showHome = (yes)=> HOME_PARTS.forEach(el => el?.classList.toggle('hidden', !yes));
  const hideAllViews = ()=> Object.values(VIEWS).forEach(el => el?.classList.add('hidden'));
  const showView = (key)=>{ hideAllViews(); VIEWS[key]?.classList.remove('hidden'); };

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

    let m = h.match(/^#\/produit\/([^/?#]+)/);
    if (m){
      const key = decodeURIComponent(m[1]);
      const p = findProductByKey?.(key);
      showHome(false); showView('produit');
      if (p){ renderPDP(p); document.title = `Pirates Tools • ${p.title || p.sku || 'Produit'}`; }
      else {
        $('#pdpTitle') && ($('#pdpTitle').textContent='Produit introuvable');
        $('#pdpDesc')  && ($('#pdpDesc').textContent='Vérifiez la référence ou revenez au catalogue.');
      }
      wireBack(cameFrom); window.scrollTo({top:0,behavior:'auto'}); prevHash=h; return;
    }

    m = h.match(/^#\/catalogue\b/);
    if (m){ showHome(false); showView('catalogue'); renderCatalogue(); document.title='Pirates Tools • Catalogue'; window.scrollTo({top:0,behavior:'auto'}); prevHash=h; return; }

    m = h.match(/^#\/devis\b/);
    if (m){ showHome(false); showView('devis'); renderCartView(); document.title='Pirates Tools • Devis'; window.scrollTo({top:0,behavior:'auto'}); prevHash=h; return; }

    m = h.match(/^#\/compte\b/);
    if (m){ showHome(false); showView('compte'); renderAccount(); document.title='Pirates Tools • Mon compte'; window.scrollTo({top:0,behavior:'auto'}); prevHash=h; return; }

    if (h === '' || h === '#' || h === '#/' || h === '#/home'){
      showHome(true); hideAllViews(); document.title = 'Pirates Tools • Outillage pro (PWA)'; prevHash = h; return;
    }

    showHome(true); hideAllViews(); document.title = 'Pirates Tools • Outillage pro (PWA)'; prevHash = h;
  }
  window.addEventListener('hashchange', onRoute);
  onRoute();
})();

/* ===== Vue Devis ===== */
function renderCartView(){
  const root = $('#devisList'); if (!root) return;
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
        </div>`;
    }).join('');
  }

  root.onclick = (e)=>{
    const inc = e.target.closest('[data-inc]'); const dec = e.target.closest('[data-dec]'); const del = e.target.closest('[data-del]');
    const key = inc?.dataset.inc || dec?.dataset.dec || del?.dataset.del;
    if (!key) return;
    if (inc){
      const p = MODELS.find(m => keyOf(m)===key); if (p){ CART.push(p); }
    }else if (dec){
      const i = CART.findIndex(p => keyOf(p)===key); if (i>=0) CART.splice(i,1);
    }else if (del){
      for (let i=CART.length-1;i>=0;i--) if (keyOf(CART[i])===key) CART.splice(i,1);
    }
    saveCart(); renderCartView();
  };

  $('#devisSend')?.addEventListener('click', ()=>{
    const msg = encodeURIComponent(cartToWhatsAppText()); if (!msg) return;
    window.open(`https://wa.me/${PHONE_E164.replace('+','')}?text=${msg}`, '_blank', 'noopener');
  }, { once:true });

  $('#devisClear')?.addEventListener('click', ()=>{ CART=[]; saveCart(); renderCartView(); }, { once:true });
}
