/* =========================================================================
   Pirates Tools — APP.JS (complet)
   - Bouton d'installation (PWA)
   - Enregistrement Service Worker
   - Chargement des produits (products.json)
   - Cartes cliquables (expand)
   - Menu de défilement (data-scroll)
   - Effet HERO : inclinaison + grossissement + fondu (mobile boost)
   ========================================================================= */

/* -----------------------------
   1) Bouton d’installation PWA
--------------------------------*/
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.hidden = false;
});

installBtn?.addEventListener('click', async () => {
  installBtn.hidden = true;
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt = null;
  }
});

/* -----------------------------
   2) Service Worker
--------------------------------*/
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(console.error);
  });
}

/* -----------------------------
   3) Chargement des produits
--------------------------------*/
const list = document.getElementById('list');

function renderProducts(models) {
  if (!list) return;

  list.innerHTML = models.map((m) => `
    <article class="card" tabindex="0" aria-label="${m.sku || ''}">
      <div class="head">
        <h2 class="title">${m.title || ''}</h2>
        ${m.badge ? `<span class="badge">${m.badge}</span>` : ''}
      </div>

      ${m.image ? `
      <figure class="figure">
        <img src="${m.image}" alt="${m.title || 'Produit'}">
      </figure>` : ''}

      <div class="specs">
        ${m.specs ? m.specs.map(s => `
          <div class="spec">
            <div class="k">${s.k}</div>
            <div class="v">${s.v}</div>
          </div>`).join('') : ''}
      </div>

      <div class="actions">
        ${m.price ? `<div class="price">${m.price}</div>` : ''}
        ${m.cta ? `<a class="btn btn-primary" href="${m.cta.href}" target="_blank" rel="noopener">${m.cta.label}</a>` : ''}
      </div>
    </article>
  `).join('');

  // ouverture/fermeture des cartes
  list.querySelectorAll('.card').forEach(card => {
    const toggle = () => card.classList.toggle('expanded');
    card.addEventListener('click', (e) => {
      // éviter que le clic sur un bouton déclenche l’expansion
      if (e.target.closest('a,button')) return;
      toggle();
    });
    card.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') toggle();
    });
  });
}

async function loadProducts() {
  try {
    const r = await fetch('products.json', { cache: 'no-store' });
    const models = await r.json();
    renderProducts(models);
  } catch (err) {
    console.error('Erreur chargement produits:', err);
    if (list) list.innerHTML = `<p style="opacity:.7">Impossible de charger les produits pour le moment.</p>`;
  }
}

/* -----------------------------
   4) Menu défilant (data-scroll)
--------------------------------*/
function initScrollMenu() {
  // afficher le menu “rapide” s’il existe
  const quickMenu = document.getElementById('quickMenu');
  if (quickMenu) quickMenu.hidden = false;

  // liens avec data-scroll="#id"
  document.querySelectorAll('[data-scroll]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('data-scroll'));
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* -----------------------------
   5) Effet HERO (inclinaison + zoom + fondu)
   - Le logo passe AU-DESSUS des cartes au début
   - Séparation nette gérée par #hero-spacer (HTML) et z-index (CSS)
--------------------------------*/
function initHeroEffect() {
  const hero  = document.getElementById('hero');
  const logo  = document.getElementById('heroLogo');

  if (!hero || !logo) return;

  let ticking = false;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function onScroll() {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const vh = window.innerHeight || 1;
      // progression jusqu’à ~90% de l’écran
      const progress = clamp(window.scrollY / (vh * 0.9), 0, 1);

      // Inclinaison légère
      const tilt = 12 * progress;

      // Zoom : un peu plus fort sur mobile
      const isMobile = window.innerWidth <= 768;
      const maxScale = isMobile ? 1.28 : 1.16;    // boost léger
      const scale = maxScale - (0.16 * progress);

      // Translation vers le haut + fondu
      const translate = -vh * 0.25 * progress;
      const opacity   = clamp(1 - 1.1 * progress, 0, 1);

      logo.style.transform =
        `translate3d(0, ${translate}px, 0) rotateX(${tilt}deg) scale(${scale})`;
      logo.style.opacity = opacity;

      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  // appli initiale (au cas où on arrive déjà scrollé)
  onScroll();
}

/* -----------------------------
   6) Lancement
--------------------------------*/
document.addEventListener('DOMContentLoaded', () => {
  initScrollMenu();
  initHeroEffect();
  loadProducts();
});
