// --- Effet HERO : zoom + fade + inclinaison ---
(function () {
  const hero = document.getElementById('hero');
  const logo = document.getElementById('heroLogo');
  if (!hero || !logo) return;

  const isMobile = matchMedia('(max-width: 768px)').matches;

  const tiltMax   = isMobile ? 18 : 12;
  const zoomGain  = isMobile ? 0.5  : 0.3;
  const fadeGain  = isMobile ? 2.0  : 1.4;
  const liftGain  = isMobile ? 0.36 : 0.24;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
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

      hero.style.visibility = (opacity <= 0.01) ? 'hidden' : 'visible';

      ticking = false;
    });
  }

  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// --- Skeletons + révélation des cartes ---
(function(){
  const list = document.getElementById('list');
  if(!list) return;

  // Skeletons initiaux
  const skeleton = ()=>`
    <article class="card" aria-hidden="true">
      <div class="sk sk-title"></div>
      <div class="sk sk-media"></div>
      <div class="sk sk-chip"></div>
      <div class="sk sk-text"></div>
    </article>`;
  list.innerHTML = skeleton()+skeleton()+skeleton();

  // Révélation des cartes
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, {threshold: 0.1});

  const tryHook = ()=>document.querySelectorAll('.card').forEach(c=>io.observe(c));
  setTimeout(tryHook, 80);
  document.addEventListener('DOMContentLoaded', tryHook);
})();
