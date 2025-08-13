// --- Effet HERO : zoom + fade + inclinaison (mobile plus fort), overlay au-dessus ---
(function () {
  const hero = document.getElementById('hero');
  const logo = document.getElementById('heroLogo');
  if (!hero || !logo) return;

  const isMobile = matchMedia('(max-width: 768px)').matches;

  // Plus d'effet sur mobile
  const tiltMax   = isMobile ? 18 : 12;    // inclinaison max (degrés)
  const zoomGain  = isMobile ? 0.45 : 0.25; // zoom en descendant
  const fadeGain  = isMobile ? 2.0  : 1.4;  // vitesse de disparition
  const liftGain  = isMobile ? 0.36 : 0.24; // remontée (vh)

  const clamp = (v,min,max)=>Math.max(min, Math.min(max, v));
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const vh = innerHeight || 1;
      const p = clamp(scrollY / (vh * 0.9), 0, 1);

      const tilt      = tiltMax * p;
      const scale     = 1 + (zoomGain * p);
      const translate = -(vh * liftGain * p);
      const opacity   = clamp(1 - (fadeGain * p), 0, 1);

      logo.style.transform = `translate3d(0, ${translate}px, 0) rotateX(${tilt}deg) scale(${scale})`;
      logo.style.opacity   = opacity;

      // Quand invisible, on cache pour laisser cliquer
      hero.style.visibility = (opacity <= 0.01) ? 'hidden' : 'visible';

      ticking = false;
    });
  }

  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
