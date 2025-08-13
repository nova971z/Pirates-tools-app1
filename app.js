// ================================================================
// Pirates Tools — HERO Zoom Fix (app.js)
// - Zoom très fort du logo pendant le scroll (mobile ++)
// - Inclinaison + remontée + fondu (mêmes sensations visuelles)
// - Boucle requestAnimationFrame (fluide, précis sur iPad/iPhone)
// - Ne dépend QUE de #hero et #heroLogo (aucune autre feature touchée)
//   (scroll = défilement ; rAF = requestAnimationFrame = horloge graphique)
// ================================================================

(() => {
  'use strict';

  // 1) Récupère les éléments
  const hero = document.getElementById('hero');
  const logo = document.getElementById('heroLogo');

  // Sécurité : si l'id n'existe pas, on ne fait rien
  if (!hero || !logo) return;

  // 2) Petits utilitaires
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const isMobile = () => window.innerWidth <= 820; // (mobile/tablette)

  // 3) Réglages de l'effet (tu peux ajuster les chiffres si besoin)
  //    (zoomGain = quantité de grossissement ; fadeGain = vitesse de disparition ;
  //     liftGain = remontée verticale en % d'écran ; tiltMax = inclinaison max en degrés)
  const cfgDesktop = { zoomGain: 0.65, fadeGain: 1.30, liftGain: 0.26, tiltMax: 12 };
  const cfgMobile  = { zoomGain: 1.25, fadeGain: 1.60, liftGain: 0.34, tiltMax: 18 }; // <<< ÉNORME

  // 4) rAF loop : on lit la position de scroll et on applique la transformation
  let lastY = -1;

  function frame() {
    const vh = window.innerHeight || 1;
    // Position de scroll robuste (iOS/Safari inclus)
    const y  = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

    // Même si le scroll ne change pas, on continue la boucle (coût très faible)
    lastY = y;

    // Progression 0→1 sur ~70% d'un écran (plus réactif = zoom visible plus tôt)
    const p = clamp(y / (vh * 0.7), 0, 1);

    // Choix des gains selon l'appareil
    const C = isMobile() ? cfgMobile : cfgDesktop;

    // Calculs de l'effet
    const scale     = 1 + C.zoomGain * p;         // <<< GROSSIT fort en descendant
    const translate = -(vh * C.liftGain * p);     // logo remonte
    const tilt      = C.tiltMax * p;              // légère inclinaison
    const opacity   = clamp(1 - C.fadeGain * p, 0, 1); // fondu identique

    // Application des styles (transform = transformation ; opacity = transparence)
    logo.style.transform = `translate3d(0, ${translate}px, 0) rotateX(${tilt}deg) scale(${scale})`;
    logo.style.opacity   = opacity;

    // Masque l'overlay quand il est invisible (meilleure lisibilité/clics)
    // (visibility = visibilité ; 0.01 ≈ quasi invisible)
    hero.style.visibility = (opacity <= 0.01) ? 'hidden' : 'visible';

    // Boucle continue (horloge graphique)
    requestAnimationFrame(frame);
  }

  // 5) Démarrage : une frame pour initialiser, puis la boucle
  requestAnimationFrame(frame);

  // 6) Recalcule automatiquement si on change d'orientation/taille
  addEventListener('resize', () => { lastY = -1; }, { passive: true });
})();
