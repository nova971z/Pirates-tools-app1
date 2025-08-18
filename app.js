/* =========================================================
   Pirates Tools — app.js (FULL, stable)
   - Hero fluide Android/iOS
   - Smooth scroll (depuis une vue → retour Home)
   - Panier persistant (localStorage) + dock (🛒/badge)
   - PDP riche : description + points clés + tableau specs
   - Devis (#/devis) : quantités + envoi WhatsApp
   - Compte & Fidélité (démo locale)
========================================================= */

/* ---------- Helpers ---------- */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const fallback = (v, alt='') => (v===undefined || v===null) ? alt : v;

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

/* ---------- CTA tel/wa homogènes ---------- */
(function syncCTA(){
  callBtn?.setAttribute('href', `tel:${PHONE_E164}`);
  if (callBtn) callBtn.innerHTML = `📞 <strong>${PHONE_HUMAN}</strong>`;
  waBtn?.setAttribute('href', `https://wa.me/${PHONE_E164.replace('+','')}`);
})();

/* ---------- Logo = retour accueil ---------- */
(function wireLogoHome(){
  const logo = homeLink || document.querySelector('.topbar-logo-link');
  logo?.addEventListener('click', (e)=>{
    e.preventDefault();
    location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* ---------- HERO : zoom + fondu + anti-chevauchement ---------- */
(function heroEffect(){
  if (!hero || !heroLogo) return;

  const mq = window.matchMedia('(max-width: 768px)');
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const getVH = () => (window.visualViewport ? window.visualViewport.height : window.innerHeight) || 1;

  let vh = getVH();
  let ticking = false;

  function compute(){
    const y   = window.scrollY || 0;
    const fin = vh * (mq.matches ? 0.70 : 0.85);
    const raw = clamp(y / fin, 0, 1);
    const p   = easeOutCubic(raw);

    const maxScale = mq.matches ? 3.1 : 2.0;
    const scale    = 1 + (maxScale - 1) * p;
    const tyVh     = (mq.matches ? 12 : 7) * p;
    const opacity  = clamp(1 - (mq.matches ? 1.75 : 1.25) * raw, 0, 1);

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

/* ---------- Smooth scroll (depuis une vue → retour home avant scroll) ---------- */
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

/* ---------- Exit animation au scroll (injectée) ---------- */
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
  .tool--exit-left,.tool--exit-right { animation: none; opacity: 0; }
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
   PANIER (persistant)
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
   PRODUITS : rendu liste / PDP
========================================================= */

/* Carte produit (liste) */
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

/* Binding “Ajouter au panier” dans la liste courante */
function bindAddToCart(scopeData){
  $$('[data-add]', listEl).forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const id = btn.getAttribute('data-add');
      const p  = scopeData.find(x => (x.id?.toString()===id) || (x.sku?.toString()===id) || (x.title===id));
      if (!p) return;
      CART.push(p);
      saveCart();
    });
  });
}

/* Trouve un produit par id/sku/titre (insensible à la casse) */
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

/* Rendu fiche produit (PDP) */
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
    // Fallback image si la source externe est KO
    elImg.onerror = ()=>{ elImg.onerror = null; elImg.src = './images/pirates-tools-logo.png?v=7'; };
  }

  /* 1) Points clés (features) */
  const features = Array.isArray(product.features) ? product.features : (Array.isArray(product.specs) ? product.specs : []);
  const featHtml = features.length ? features.map(s=>`<li>${s}</li>`).join('') : '';

  /* 2) Tableau “Caractéristiques techniques” (specs_kv + dérivation) */
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

  /* Boutons */
  btnQ.textContent = 'Ajouter au panier';
  btnQ.onclick = ()=>{
    CART.push(product);
    saveCart();
  };

  const sku = product.sku || product.id || title;
  const msg = encodeURIComponent(`Bonjour, je souhaite un devis pour:\n• ${sku} – ${title}\n\nMerci.`);
  const phone = PHONE_E164.replace('+','');
  btnWa.href = `https://wa.me/${phone}?text=${msg}`;

  /* Produits liés */
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

  // Ajout au panier depuis la section “Produits liés”
  elRel.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    const id = btn.getAttribute('data-add');
    const p  = MODELS.find(x => ((x.id||x.sku||x.title)+'') === id);
    if (p){ CART.push(p); saveCart(); }
    e.stopPropagation();
  });

  $$('.pdp__related .card').forEach(card=>{
    card.addEventListener('click', (e)=>{
      if (e.target.closest('[data-add]')) return; // déjà géré ci-dessus
      const id = card.getAttribute('data-id');
      if (!id) return;
      location.hash = `#/produit/${encodeURIComponent(id)}`;
    });
  });
}

/* Rendu de la liste */
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
   CATALOGUE (catégories auto)
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
   CHARGEMENT PRODUITS
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
   FILTRE (debounce)
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
   DEVIS (#/devis) — rendu dynamique
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

  // actions quantités
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

/* =========================================================
   DOCK (bas d’écran)
========================================================= */
dockQuoteBtn?.addEventListener('click', ()=>{
  if (!CART.length) return;
  const msg = encodeURIComponent(cartToWhatsAppText());
  window.open(`https://wa.me/${PHONE_E164.replace('+','')}?text=${msg}`, '_blank', 'noopener');
});
dockCartBtn?.addEventListener('click', ()=>{ location.hash = '#/devis'; });
dockCount?.addEventListener('click', ()=>{ location.hash = '#/devis'; });

/* ===== Dock: stabilisation position (iOS/Android, in-app & clavier) ===== */
(function stableDock(){
  const root = document.documentElement;
  const MIN_GAP = 14; // marge min en px

  function applyDockBottom(){
    // visualViewport donne la zone réellement visible (sans barres UI/clavier)
    const vv = window.visualViewport;
    let occluded = 0;
    if (vv) {
      // portion “masquée” en bas par la barre/clavier
      occluded = Math.max(0, (window.innerHeight - (vv.height + vv.offsetTop)));
    }
    const px = Math.round(MIN_GAP + occluded);
    root.style.setProperty('--dock-bottom', px + 'px');
  }

  applyDockBottom();
  window.addEventListener('resize', applyDockBottom, { passive:true });
  window.addEventListener('orientationchange', () => setTimeout(applyDockBottom, 60), { passive:true });
  window.visualViewport?.addEventListener('resize', applyDockBottom, { passive:true });
  window.visualViewport?.addEventListener('scroll', applyDockBottom, { passive:true });
})();

/* =========================================================
   PWA
========================================================= */
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

/* =========================================================
   COMPTE & FIDÉLITÉ (démo locale)
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
   ROUTER (#/…)
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

      // si produits pas encore chargés, on attend l’événement
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
