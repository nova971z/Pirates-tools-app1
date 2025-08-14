/************************************************************
 * PIRATES TOOLS — app.js (COMPLET, PRO & PERFORMANT)
 * ----------------------------------------------------------
 * 1) Détection des capacités (feature-flags)
 * 2) PWA : install + Service Worker
 * 3) Ancrages doux avec offset topbar (défilement fluide)
 * 4) Chargement produits (products.json) + fallback sûr
 * 5) Dock d’actions (mobile) + “devis WhatsApp” local
 * 6) HERO fallback JS (si CSS scroll-timeline indisponible)
 * 7) Micro-perf & accessibilité (réduction d’animations)
 *
 * Termes :
 * - rAF = requestAnimationFrame (horloge à 60 fps synchronisée)
 * - debounce = anti-rebond (retarde une action pendant la saisie)
 * - IntersectionObserver = détecte l’entrée/sortie d’un élément à l’écran
 * - z-index = ordre d’empilement (qui passe devant/derrière)
 ************************************************************/

(function () {
  "use strict";

  /* =========================================================
   * 1) Détection des capacités (feature-flags)
   * ========================================================= */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const supportsScrollTimeline = CSS?.supports?.("animation-timeline: view()") || false;
  const prefersReducedMotion    = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Coordonnées (numéro format international pour WhatsApp)
  const PHONE_LOCAL = "0774231095";
  const PHONE_INTL  = "33774231095";

  // Sélecteurs clés (assure-toi que ces IDs/classes existent dans ton HTML)
  const topbar   = $(".topbar");
  const hero     = $("#hero");          // <section class="hero-full" id="hero">
  const heroLogo = $("#heroLogo");      // <img id="heroLogo" class="hero-logo">
  const listRoot = $("#list");          // conteneur des cartes produits
  const installBtn = $("#installBtn");  // bouton d'installation PWA (optionnel)
  const dock       = $("#dock");        // nav flottante (optionnel)
  const dockQuote  = $("#dockQuoteBtn");// bouton devis WA (optionnel)
  const dockCount  = $("#dockCount");   // badge compteur (optionnel)

  /* =========================================================
   * 2) PWA : Install + Service Worker (offline)
   * ========================================================= */
  let deferredPrompt;
  if (installBtn) {
    installBtn.hidden = true;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      installBtn.hidden = false;
    }, { passive: true });

    installBtn.addEventListener("click", async () => {
      installBtn.hidden = true;
      try {
        await deferredPrompt?.prompt();
        deferredPrompt = null;
      } catch {}
    }, { passive: true });
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }, { once: true });
  }

  /* =========================================================
   * 3) Ancrages doux + offset topbar (défilement fluide)
   *    (offset = prend en compte la hauteur de la barre)
   * ========================================================= */
  function getTopbarOffset() {
    const h = topbar?.getBoundingClientRect().height || 0;
    // marge légère pour que l’ancre ne colle pas
    return h ? (h + 8) : 0;
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-scroll]");
    if (!a) return;
    const targetSel = a.getAttribute("data-scroll") || a.getAttribute("href");
    if (!targetSel || !targetSel.startsWith("#")) return;
    const el = document.querySelector(targetSel);
    if (!el) return;
    e.preventDefault();

    const y = el.getBoundingClientRect().top + window.scrollY - getTopbarOffset();
    window.scrollTo({ top: y, behavior: "smooth" });
  });

  /* =========================================================
   * 4) Chargement produits (products.json) + fallback
   *    (robuste, pas de page vide, garantit du scroll)
   * ========================================================= */
  async function loadProducts() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000); // timeout réseau
      const res = await fetch("products.json", { cache: "no-store", signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error("Bad status");
      return await res.json();
    } catch {
      // Fallback minimal : garantit des cartes pour le scroll/UX
      return [
        { sku: "DeWALT DCF887 (18V XR)", badge: "Nouveau", img: "./images/pirates-tools-logo.png", desc: "Visseuse à choc — 205 Nm, brushless." },
        { sku: "DeWALT DCD796 (18V XR)", badge: "Top",     img: "./images/pirates-tools-logo.png", desc: "Perceuse-visseuse 2 vitesses, LED." },
        { sku: "DeWALT DCS391 (18V XR)", badge: "Stock",   img: "./images/pirates-tools-logo.png", desc: "Scie circulaire 165mm, coupe nette." }
      ];
    }
  }

  function renderProducts(models) {
    if (!listRoot) return;
    const html = (models || []).map(m => {
      const title = m.title || m.sku || "Produit";
      const img   = m.img   || m.image || "";
      const badge = m.badge || (m.new ? "Nouveau" : "");
      const desc  = m.desc  || "";

      return `
<article class="card">
  <div class="head">
    <h2 class="title">${title}</h2>
    ${badge ? `<span class="chip">${badge}</span>` : ""}
  </div>
  ${img ? `<figure class="figure"><img src="${img}" alt="${title}" loading="lazy" decoding="async"></figure>` : ""}
  ${desc ? `<p>${desc}</p>` : ""}
  <div class="actions">
    <button class="btn add-quote" data-sku="${(m.sku || title).replace(/"/g, "&quot;")}">Ajouter au devis</button>
  </div>
</article>`;
    }).join("");
    listRoot.innerHTML = html || `<p style="opacity:.7">Aucun produit disponible.</p>`;
  }

  /* =========================================================
   * 5) Dock mobile + “Devis WhatsApp” (panier léger)
   *    (stock localStorage + badge + ouverture WA)
   * ========================================================= */
  (function initDockAndQuote() {
    const KEY = "ptools-quote";
    const state = new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));

    function syncBadge() {
      if (dockCount) dockCount.textContent = String(state.size);
      localStorage.setItem(KEY, JSON.stringify([...state]));
    }
    syncBadge();

    // Afficher le dock uniquement après le hero (si présent)
    if (dock && hero && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(([entry]) => {
        dock.style.display = entry.isIntersecting ? "none" : "grid";
      }, { threshold: 0.2 });
      io.observe(hero);
    }

    // Délégation de clic pour ajouter/retirer un article
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".add-quote");
      if (!btn) return;
      const sku = btn.dataset.sku || btn.closest(".card")?.querySelector(".title")?.textContent?.trim();
      if (!sku) return;

      if (state.has(sku)) {
        state.delete(sku);
        btn.textContent = "Ajouter au devis";
      } else {
        state.add(sku);
        btn.textContent = "Ajouté ✓";
      }
      syncBadge();
    });

    // Ouvre WhatsApp avec la liste
    dockQuote?.addEventListener("click", () => {
      if (state.size === 0) {
        alert("Ajoute au moins un article dans le devis.");
        return;
      }
      const items = [...state].map((s, i) => `${i + 1}. ${s}`).join("%0A");
      const msg = `Bonjour Pirates Tools,%0AJe souhaite un devis pour:%0A%0A${items}%0A%0AMerci.`;
      location.href = `https://wa.me/${PHONE_INTL}?text=${msg}`;
    });
  })();

 // === HERO (v2) : zoom conséquent + fondu très fluide avec lissage ===
(function () {
  const hero = document.getElementById('hero');
  const logo = document.getElementById('heroLogo');
  if (!hero || !logo) return;

  // Helpers
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp  = (a, b, t) => a + (b - a) * t;

  // Easing (douceur)
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeInCubic  = t => t * t * t;

  // Zoom cible (plus fort sur mobile)
  const getMaxScale = () =>
    (window.innerWidth <= 767) ? 3.1 : 2.4;  // tu peux ajuster ici

  const state = {
    target: 0,    // progression visée (0 → 1)
    current: 0,   // progression lissée
    raf: null
  };

  function computeTarget() {
    const vh = Math.max(window.innerHeight, 1);
    // 0 → 1 sur ~90% de la hauteur de l'écran
    state.target = clamp(window.scrollY / (vh * 0.9), 0, 1);
  }

  function render() {
    // Lissage façon inertie (plus la valeur est grande, plus c’est réactif)
    state.current = lerp(state.current, state.target, 0.16);

    const maxScale = getMaxScale();
    const easedOut = easeOutCubic(state.current);
    const easedIn  = easeInCubic(state.current);

    // Zoom conséquent et très progressif
    const scale   = 1 + (maxScale - 1) * easedOut;

    // Fondu plus doux (mais net à la fin)
    const opacity = clamp(1 - easedIn * 1.25, 0, 1);

    logo.style.transform = `translate3d(0,0,0) scale(${scale})`;
    logo.style.opacity   = opacity;

    // Quand on a quasi terminé, on passe le hero sous le contenu
    if (state.current >= 0.97) {
      hero.classList.add('is-hidden');
    } else {
      hero.classList.remove('is-hidden');
    }

    state.raf = requestAnimationFrame(render);
  }

  function onScroll() { computeTarget(); }
  function onResize() { computeTarget(); }

  // Init
  computeTarget();
  state.raf = requestAnimationFrame(render);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
})();
