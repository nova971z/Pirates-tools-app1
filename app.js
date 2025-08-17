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

/* Harmonise les CTA */
(function syncCTA(){
  callBtn?.setAttribute('href', `tel:${PHONE_E164}`);
  if (callBtn) callBtn.innerHTML = `📞 <strong>${PHONE_HUMAN}</strong>`;
  waBtn?.setAttribute('href', `https://wa.me/${PHONE_E164.replace('+','')}`);
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

    const tyVh = (mq.matches ? 12 : 7) * p;                         // translation
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

/* ---------------- EXIT ANIMATION AU SCROLL (tools) ----------------
   ! Ajouté !
   Quand un élément [data-tool] sort par le haut du viewport, il glisse
   une fois à gauche, le suivant à droite, avec un fondu.
   (Injection CSS = on crée un <style> automatiquement dans <head>.)
------------------------------------------------------------------- */
const ScrollExit = (function () {
  /* Injecte le CSS d’animation une seule fois */
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
        // Réinitialise si l’élément re-rentre
        el.classList.remove('tool--exit-left', 'tool--exit-right');
        el.removeAttribute('data-exited');
        return;
      }

      // On déclenche une seule fois par élément
      if (el.dataset.exited === '1') return;

      // On n’anime que lorsqu’il sort par le HAUT (scroll descendant)
      const rect = entry.boundingClientRect;
      const exitingUp = rect.top < 0;
      if (!exitingUp) return;

      const cls = flip ? 'tool--exit-right' : 'tool--exit-left';
      flip = !flip;

      // Force reflow si besoin (pour rejouer proprement)
      void el.offsetWidth;

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

  /* Ajout: data-tool pour activer l’animation de sortie */
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

function renderList(data){
  if (!Array.isArray(data)) return;
  listEl.innerHTML = data.map(productToHTML).join('\n');

  /* Ajout: observer les nouveaux éléments pour l’anim de sortie */
  ScrollExit.observeWithin(listEl);

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

/* [ROUTER | #/…] — mini routeur hash pour afficher les vues sans recharger */
(()=>{

  // 1) Références : sections "home" existantes (à masquer quand on change de vue)
  const HOME_PARTS = [
    document.getElementById('hero'),
    document.querySelector('.toolbar'),
    document.querySelector('main.container'),
    document.querySelector('.ratings')
  ].filter(Boolean);

  // 2) Vues dynamiques (catalogue, devis, …)
  const VIEWS = {
    catalogue: document.getElementById('view-catalogue'),
    devis:     document.getElementById('view-devis')
  };

  // 3) Helpers d’affichage
  const showHome = (yes)=> HOME_PARTS.forEach(el => el?.classList.toggle('hidden', !yes));
  const hideAllViews = ()=> Object.values(VIEWS).forEach(el => el?.classList.add('hidden'));
  const showView = (key)=>{
    hideAllViews();
    VIEWS[key]?.classList.remove('hidden');
  };

  // 4) Logique de route
  function onRoute(){
    const h = (location.hash || '').toLowerCase();

    // Normalise: "#/xxx" -> "xxx"
    const m = h.match(/^#\/([^/?#]+)/);
    const route = m ? m[1] : '';

    switch(route){
      case 'catalogue':
        showHome(false);
        showView('catalogue');
        break;

      case 'devis':
        showHome(false);
        showView('devis');
        // petit récap du panier (CART) si dispo
        try{
          const wrap = document.getElementById('devisList');
          if (wrap){
            if (Array.isArray(window.CART) && window.CART.length){
              wrap.innerHTML = window.CART.map((p,i)=>`
                <p style="margin:0">• ${p.sku || p.id || (i+1)} — ${ (p.title||'').replace(/\s+/g,' ').trim() }</p>
              `).join('');
            } else {
              wrap.innerHTML = `<p style="margin:0">Aucun article pour le moment.</p>`;
            }
          }
          // bouton d’envoi (réutilise ta conf téléphone)
          const btn = document.getElementById('devisSend');
          btn?.addEventListener('click', ()=>{
            if (!Array.isArray(window.CART) || !window.CART.length) return;
            const lines = window.CART.slice(0,40).map((p,i)=>{
              const sku = p.sku || p.id || (i+1);
              const title = (p.title||'').replace(/\s+/g,' ').trim();
              return `• ${sku} – ${title}`;
            });
            const msg = encodeURIComponent(`Bonjour, je souhaite un devis pour:\n${lines.join('\n')}\n\nMerci.`);
            const phone = (typeof PHONE_E164 === 'string' ? PHONE_E164.replace('+','') : '33774230195');
            window.open(`https://wa.me/${phone}?text=${msg}`, '_blank', 'noopener');
          }, { once:true });
        }catch(_){}
        break;

      default:
        // HOME (par défaut)
        showHome(true);
        hideAllViews();
        // si on vient d’une vue -> remonte en haut pour revoir le HERO
        try{ window.scrollTo({ top: 0, behavior: 'instant' }); }catch(_){}
        break;
    }
  }

  // 5) Active sur clic des liens data-route (pratique sur iOS)
  document.querySelectorAll('[data-route]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      // laisse le hash se mettre tout seul; le routeur s’exécutera sur hashchange
      // (on n’empêche pas le comportement par défaut)
    });
  });

  // 6) Écoute les changements d’URL (#/…)
  window.addEventListener('hashchange', onRoute);
  // 7) Première route au chargement
  onRoute();

})();