/* =========================================================
   Pirates Tools — app.js (FULL, fusion)
   - HERO : zoom massif + fondu + bascule z-index
   - Smooth scroll
   - Chargement/filtre produits
   - Dock + compteur devis (WhatsApp)
   - PWA : beforeinstallprompt + Service Worker
========================================================= */

const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const hero     = $('#hero');
const heroLogo = $('#heroLogo');
const listEl   = $('#list');
const searchEl = $('#q');
const tagEl    = $('#tag');
const dock     = $('#dock');
const dockCount= $('#dockCount');
const dockQuoteBtn = $('#dockQuoteBtn');


/* ==== Effet HERO : zoom + fondu + anti-chevauchement ==== */
(() => {
  const hero = document.getElementById('hero');
  const logo = document.getElementById('heroLogo');
  if (!hero || !logo) return;

  const mq = window.matchMedia('(max-width: 768px)');
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  let vh = window.innerHeight || 1;

  function update() {
    const y = window.scrollY || 0;
    const finish = vh * (mq.matches ? 0.78 : 0.90);     // distance d’anim
    const raw = Math.min(Math.max(y / finish, 0), 1);   // 0..1
    const p = easeOutCubic(raw);

    // Zoom fort sur mobile
    const base = 1.0;
    const maxScale = mq.matches ? 2.8 : 1.9;
    const scale = base + (maxScale - base) * p;

    // Légère translation + fondu
    const ty = (mq.matches ? 9 : 5) * p;                // en vh
    const opacity = Math.max(0, 1 - (mq.matches ? 1.35 : 1.1) * raw);

    // Variables CSS pilotant le rendu GPU
    logo.style.setProperty('--heroScale', scale.toFixed(3));
    logo.style.setProperty('--heroY', `${ty.toFixed(2)}vh`);
    logo.style.setProperty('--heroAlpha', opacity.toFixed(3));

    // Réserve d’espace au-dessus de la liste pour éviter le chevauchement
    const gap = (1 - raw) * (mq.matches ? 18 : 22);     // en vh
    document.documentElement.style.setProperty('--listGap', `${gap.toFixed(2)}vh`);

    // Quand le hero est « fini », on le passe sous les cartes
    if (raw > 0.98) document.body.classList.add('after-hero'), hero.classList.add('hero-out');
    else document.body.classList.remove('after-hero'), hero.classList.remove('hero-out');
  }

  const onScroll = () => requestAnimationFrame(update);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { vh = window.innerHeight || 1; update(); }, { passive: true });

  update();
})();


/* ------------ Smooth scroll ------------- */
$$('[data-scroll]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = a.getAttribute('data-scroll') || a.getAttribute('href');
    const el = document.querySelector(target);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top: y, behavior: 'smooth' });
  });
});

/* ------------ Produits ------------- */
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
    const r = await fetch('products.json', {cache:'no-store'});
    const json = await r.json();
    MODELS = Array.isArray(json) ? json : (json.products || []);
    renderList(MODELS);
  }catch(e){
    console.error('Erreur chargement produits:', e);
    listEl.innerHTML = `
      <div class="card"><div class="head"><h3 class="title">Produits indisponibles</h3></div>
      <div class="specs"><p>Impossible de charger <code>products.json</code>.</p></div></div>`;
  }
}
loadProducts();

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

/* ------------ Dock WhatsApp (devis) ------------- */
dockQuoteBtn?.addEventListener('click', ()=>{
  if (!CART.length) return;
  const lines = CART.slice(0,40).map((p,i)=>{
    const sku = fallback(p.sku, fallback(p.id, i+1));
    const title = fallback(p.title, '').replace(/\s+/g,' ').trim();
    return `• ${sku} – ${title}`.trim();
  });
  const msg = encodeURIComponent(`Bonjour, je souhaite un devis pour:\n${lines.join('\n')}\n\nMerci.`);
  // ✅ nouveau numéro
  window.open(`https://wa.me/33774230195?text=${msg}`, '_blank', 'noopener');
});

/* ------------ PWA ------------- */
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
    navigator.serviceWorker.register('sw.js').catch(console.warn);
  });
}
