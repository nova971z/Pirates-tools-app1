/* 1) Effet HERO (logo au-dessus, zoom + disparition ; mobile un peu plus fort) */
(function () {
  const hero = document.getElementById('hero');
  const logo = document.getElementById('heroLogo');
  if (!hero || !logo) return;

  const isMobile = matchMedia('(max-width: 768px)').matches;

  // réglages doux (zoomGain = grossissement ; fadeGain = vitesse de disparition)
  const tiltMax   = isMobile ? 16 : 12;   // degrés
  const zoomGain  = isMobile ? 0.40 : 0.28; // mobile grossit un peu plus
  const fadeGain  = isMobile ? 1.60 : 1.30; // disparition fluide
  const liftGain  = isMobile ? 0.30 : 0.22; // remonte légèrement

  const clamp = (v,min,max)=>Math.max(min, Math.min(max, v));
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const vh = innerHeight || 1;
      const p = clamp(scrollY / (vh * 0.9), 0, 1);  // progression 0→1

      const tilt      = tiltMax * p;
      const scale     = 1 + (zoomGain * p);           // zoom progressif
      const translate = -(vh * liftGain * p);         // remonte un peu
      const opacity   = clamp(1 - (fadeGain * p), 0, 1); // fade out

      logo.style.transform = `translate3d(0, ${translate}px, 0) rotateX(${tilt}deg) scale(${scale})`;
      logo.style.opacity   = opacity;

      // Quand il est quasi invisible, on masque l’overlay (meilleure lisibilité)
      hero.style.visibility = (opacity <= 0.01) ? 'hidden' : 'visible';

      ticking = false;
    });
  }

  addEventListener('scroll', onScroll, { passive:true });
  onScroll();
})();

/* 2) Apparition douce des cartes (IntersectionObserver) */
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
