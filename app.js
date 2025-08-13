// Effet HERO : inclinaison + grossissement + fondu au scroll
(function(){
  const hero = document.getElementById('hero');
  const logo = document.getElementById('heroLogo');

  if(!hero || !logo) return;

  let ticking = false;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function onScroll(){
    if(ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const vh = window.innerHeight || 1;
      const progress = clamp(window.scrollY / (vh * 0.9), 0, 1);

      // Inclinaison légère
      const tilt = 12 * progress;

      // Grossissement ajusté selon appareil
      const isMobile = window.innerWidth <= 768;
      const maxScale = isMobile ? 1.25 : 1.15; // mobile + gros
      const scale = maxScale - (0.15 * progress);

      // Translation et fondu
      const translate = -vh * 0.25 * progress;
      const opacity = clamp(1 - 1.1 * progress, 0, 1);

      // Applique les transformations
      logo.style.transform = 
        `translate3d(0, ${translate}px, 0) rotateX(${tilt}deg) scale(${scale})`;
      logo.style.opacity = opacity;

      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
})();
