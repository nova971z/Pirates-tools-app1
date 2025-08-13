/* Effet HERO : overlay au-dessus, légère séparation au départ,
   zoom + disparition (mobile un peu plus fort), topbar reste devant */
(function () {
  const hero = document.getElementById('hero');
  const logo = document.getElementById('heroLogo');
  if (!hero || !logo) return;

  const isMobile  = matchMedia('(max-width: 768px)').matches;

  // Réglages (zoomGain = grossissement ; fadeGain = vitesse de disparition ; tiltMax = inclinaison ; liftGain = remontée)
  const tiltMax   = isMobile ? 16 : 12;
  const zoomGain  = isMobile ? 0.42 : 0.28;
  const fadeGain  = isMobile ? 1.65 : 1.30;
  const liftGain  = isMobile ? 0.28 : 0.22;

  // Décalage initial vers le haut pour laisser un "liseré" de cartes visible
  // (vh = % de la hauteur d’écran)
  const startOffsetVH = isMobile ? -10 : -8;

  const clamp = (v,min,max)=>Math.max(min, Math.min(max, v));
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const vh = innerHeight || 1;
      const p  = clamp(scrollY / (vh * 0.9), 0, 1);

      const tilt      = tiltMax * p;
      const scale     = 1 + zoomGain * p;                          // grossit progressivement
      const translate = (startOffsetVH * vh / 100) - (vh * liftGain * p); // démarre un peu plus haut, puis remonte encore
      const opacity   = clamp(1 - fadeGain * p, 0, 1);             // disparaît

      logo.style.transform = `translate3d(0, ${translate}px, 0) rotateX(${tilt}deg) scale(${scale})`;
      logo.style.opacity   = opacity;

      // Quand le logo est quasi invisible, on masque l’overlay (libère la vue et les clics)
      hero.style.visibility = (opacity <= 0.01) ? 'hidden' : 'visible';

      ticking = false;
    });
  }

  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* Apparition douce des cartes (IntersectionObserver) */
(function(){
  const cards = document.querySelectorAll('.card');
  if(!cards.length) return;

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, {root:null, rootMargin:'0px 0px -10% 0px', threshold:0.1});

  cards.forEach(c => io.observe(c));
})();
