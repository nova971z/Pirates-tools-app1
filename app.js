/************************************************************
 * Pirates Tools — app.js (COMPLET)
 * - PWA install (bouton #installBtn)
 * - Enregistrement du Service Worker
 * - Rendu des produits depuis products.json dans #list
 * - Menu défilant (liens [data-scroll]) avec offset topbar
 * - Affichage du “quick menu” après le hero
 * - Effet HERO de secours (si CSS scroll-timeline non supporté) :
 *     zoom + fade du #heroLogo pendant le scroll, au-dessus des cartes,
 *     puis libération des clics quand disparu.
 ************************************************************/

(function () {
  "use strict";

  /**********************
   * 0) Helpers généraux
   **********************/
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // Détecte support des Scroll-Driven Animations (CSS view-timeline)
  const hasScrollTimeline = CSS && CSS.supports && CSS.supports('animation-timeline: view()');

  // Numéros / liens
  const PHONE_NUMBER   = "0774231095"; // ⚠️ ton numéro
  const WHATSAPP_PHONE = "33774231095"; // intl pour wa.me (07 -> 337… par ex.)

  /***************************************
   * 1) PWA : bouton “Installer l’app”
   ***************************************/
  let deferredPrompt;
  const installBtn = $('#installBtn');
  if (installBtn) {
    installBtn.hidden = true;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      installBtn.hidden = false;
    });

    installBtn.addEventListener('click', async () => {
      installBtn.hidden = true;
      try {
        if (deferredPrompt) {
          await deferredPrompt.prompt();
          deferredPrompt = null;
        }
      } catch (err) {
        // silencieux
      }
    });
  }

  /********************************************
   * 2) Service Worker (offline / PWA)
   ********************************************/
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  /****************************************************
   * 3) Rendu des produits depuis products.json -> #list
   ****************************************************/
  async function renderProducts() {
    const list = $('#list');
    if (!list) return;

    try {
      const res = await fetch('products.json', { cache: 'no-store' });
      const MODELS = await res.json();

      const html = (MODELS || []).map(m => {
        const title = m.title || m.sku || 'Produit';
        const img   = m.img   || m.image || '';
        const isNew = !!m.new;
        const price = (m.price != null) ? `<div class="price">${m.price}€</div>` : '';

        return `
<article class="card" tabindex="0" aria-label="${title}">
  <div class="head">
    <h2 class="title">${title}</h2>
    ${isNew ? '<span class="badge">Nouveau</span>' : ''}
  </div>
  ${img ? `
  <figure class="figure">
    <img src="${img}" alt="${title}" loading="lazy" decoding="async">
  </figure>` : ''}
  <div class="specs">
    ${price}
  </div>
</article>`;
      }).join('');

      list.innerHTML = html || `<p style="opacity:.7">Aucun produit pour le moment.</p>`;
    } catch (err) {
      list.innerHTML = `<p style="opacity:.7">Impossible de charger les produits.</p>`;
    }
  }

  /******************************************************
   * 4) Liens de menu avec défilement doux + offset topbar
   ******************************************************/
  function initSmoothMenu() {
    const topbar = $('.topbar');
    const offset = () => (topbar ? topbar.getBoundingClientRect().height : 0);

    $$('[data-scroll]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const id = a.getAttribute('data-scroll') || a.getAttribute('href');
        if (!id) return;
        const target = document.querySelector(id);
        if (!target) return;

        const y = target.getBoundingClientRect().top + window.scrollY - offset() - 8;
        window.scrollTo({ top: y, behavior: 'smooth' });
      });
    });
  }

  /***************************************************
   * 5) Quick menu : apparaît après le bloc “hero”
   ***************************************************/
  function initQuickMenuToggle() {
    const quick = $('#quickMenu');
    const hero  = $('#hero');
    if (!quick || !hero) return;

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([entry]) => {
        // cache le quick menu tant que le hero occupe encore l’écran
        quick.hidden = entry.isIntersecting;
      }, { threshold: 0.2 });
      io.observe(hero);
    } else {
      // fallback simple
      const onScroll = () => {
        const rect = hero.getBoundingClientRect();
        quick.hidden = rect.bottom > (window.innerHeight * 0.2);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  /*******************************************************************
   * 6) Effet HERO de secours (si pas de CSS view-timeline supportée)
   *    - Zoom + Fade du #heroLogo pendant le scroll
   *    - Le hero reste au-dessus jusqu’à disparition
   *    - Puis libère les clics (pointer-events: none)
   *******************************************************************/
  function initHeroFallback() {
    if (hasScrollTimeline) return; // l’effet est géré entièrement en CSS

    const hero = $('#hero');
    const logo = $('#heroLogo');
    if (!hero || !logo) return;

    const isMobile = () => window.matchMedia('(max-width: 740px)').matches;
    let ticking = false;
    const heroTop = hero.getBoundingClientRect().top + window.scrollY;

    function step() {
      ticking = false;

      const vh = window.innerHeight || 1;
      // Progression : 0 (en haut) -> 1 (logo disparu)
      const p = clamp((window.scrollY - heroTop) / (vh * 0.9), 0, 1);

      // Paramètres de zoom (desktop / mobile)
      const startScale = isMobile() ? 1.25 : 1.20;
      const endScale   = isMobile() ? 3.9  : 3.2;
      const startY     = 0;
      const endY       = isMobile() ? -28 : -22;

      const scale = startScale + (endScale - startScale) * p;
      const y     = startY + (endY - startY) * p;
      const opacity = 1 - p;

      logo.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`;
      logo.style.opacity   = opacity.toFixed(3);

      // Tant que le logo est visible, le hero reste au-dessus et bloque les clics
      if (p < 0.995) {
        hero.style.zIndex = '6000';
        hero.style.pointerEvents = 'auto';
      } else {
        // Logo disparu -> on redonne la main aux cartes
        hero.style.zIndex = 'auto';
        hero.style.pointerEvents = 'none';
      }
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(step);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    step(); // état initial
  }

  /***************************************************
   * 7) Liens téléphone & WhatsApp (si présents)
   ***************************************************/
  function initContactShortcuts() {
    const telBtn = $('#callBtn');
    if (telBtn && !telBtn.hasAttribute('href')) {
      telBtn.setAttribute('href', `tel:${PHONE_NUMBER}`);
    }

    const waBtn = $('#waBtn');
    if (waBtn && !waBtn.hasAttribute('href')) {
      // wa.me nécessite un numéro au format international, sans + ni espaces
      waBtn.setAttribute('href', `https://wa.me/${WHATSAPP_PHONE}`);
      waBtn.setAttribute('target', '_blank');
      waBtn.setAttribute('rel', 'noopener');
    }

    // Bulle flottante “WA” éventuelle (#waFloat)
    const waFloat = $('#waFloat');
    if (waFloat && !waFloat.hasAttribute('href')) {
      waFloat.setAttribute('href', `https://wa.me/${WHATSAPP_PHONE}`);
      waFloat.setAttribute('target', '_blank');
      waFloat.setAttribute('rel', 'noopener');
    }
  }

  /***********************
   * Boot de l’application
   ***********************/
  document.addEventListener('DOMContentLoaded', () => {
    initContactShortcuts();
    initSmoothMenu();
    initQuickMenuToggle();
    initHeroFallback();   // n’agit que si CSS view-timeline est absente
    renderProducts();
  });

})();
