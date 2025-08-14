/* =========================================================
   Pirates Tools — app.js (FULL, fusion propre)
   - HERO : zoom massif + fondu + bascule z-index (anti-chevauchement)
   - Smooth scroll (ancrages data-scroll)
   - Chargement + filtre produits (debounce)
   - Dock + compteur devis (WhatsApp)
   - PWA : beforeinstallprompt + Service Worker
========================================================= */

/* ---------------- Utils ---------------- */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/* ---------------- Config (numéro unique) ---------------- */
const PHONE_HUMAN = '07 74 23 01 95';
const PHONE_E164  = '+33774230195'; // format international pour tel:/WhatsApp

/* ---------------- Sélecteurs ---------------- */
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

/* Harmonise les CTA au chargement */
(function syncCTA(){
  if (callBtn){
    callBtn.setAttribute('href', `tel:${PHONE_E164}`);
    // conserve l'icône si présente
    callBtn.innerHTML = `📞 <strong>${PHONE_HUMAN}</strong>`;
  }
  if (waBtn){
    waBtn.setAttribute('href', `https://wa.me/${PHONE_E164.replace('+','')}`);
  }
})();

/* ========================================================
   HERO : zoom + fondu + anti-chevauchement
   - Pilote les variables CSS : --heroScale, --heroY, --heroAlpha, --listGap
   - Passe le hero SOUS la liste en fin d’animation (classe .hero-out)
======================================================== */
(function heroEffect(){
  if (!hero || !heroLogo) return;

  const mq = window.matchMedia('(max-width: 768px)');
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  let vh = Math.max(window.innerHeight, 1);
  let ticking = false;

  function compute(){
    const y = window.scrollY || 0;
    const finish = vh * (mq.matches ? 0.78 : 0.90);  // distance d’anim (en px)
    const raw = clamp(y / finish, 0, 1);             // progression 0..1
    const p = easeOutCubic(raw);

    // Zoom fort (plus marqué sur mobile)
    const base = 1.0;
    const maxScale = mq.matches ? 2.8 : 1.9;
    const scale = base + (maxScale - base) * p;

    // Translation douce + fondu
    const tyVh = (mq.matches ? 9 : 5) * p;           // en vh
    const opacity = clamp(1 - (mq.matches ? 1.35 : 1.1) * raw, 0, 1);

    // Applique sur l'élément (variables CSS lues dans styles.css)
    heroLogo.style.setProperty('--heroScale', scale.toFixed(3));
    heroLogo.style.setProperty('--heroY', `${tyVh.toFixed(2)}vh`);
    heroLogo.style.setProperty('--heroAlpha', opacity.toFixed(3));

    // Réserve élastique au-dessus de la liste pour éviter le chevauchement
    const gap = (1 - raw) * (mq.matches ? 18 : 22);  // en vh
    document.documentElement.style.setProperty('--listGap', `${gap.toFixed(2)}vh`);

    // Bascule z-index quand l’anim est terminée
    if (raw > 0.98){
      document.body.classList.add('after-hero');
      hero.classList.add('hero-out');  // styles.css => z-index:-1
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
  window.addEventListener('resize', () => { vh = Math.max(window.innerHeight, 1); compute(); }, { passive:true });
  window.addEventListener('orientationchange', () => { vh = Math.max(window.innerHeight, 1); compute(); }, { passive:true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) compute(); });

  compute(); // état initial
})();

/* ========================================================
   Smooth scroll (utilise scroll-margin-top côté CSS)
======================================================== */
$$('[data-scroll]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = a.getAttribute('data-scroll') || a.getAttribute('href');
    const el = target ? document.querySelector(target) : null;
    if (!el) return;
    el.scrollIntoView({ behavior:'smooth', block:'start' });
  });
});

/* ========================================================
   Produits : chargement + rendu + filtre
======================================================== */
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

function renderList(data){
  if (!Array.isArray(data)) return;
  listEl.innerHTML = data.map(productToHTML).join('\n');
  bindAddToQuote(data);
}

async function loadProducts(){
  try{
    const r = await fetch('products.json', { cache:'no-store' });
    const json = await r.json();
    MODELS = Array.isArray(json) ? json : (json.products || []);
    renderList(MODELS);
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

/* ---- Filtre avec debounce ---- */
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

/* ========================================================
   Dock WhatsApp (devis)
======================================================== */
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

/* ========================================================
   PWA : Install prompt + SW
======================================================== */
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
