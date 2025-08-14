/* =======================================================================
   Pirates Tools — app.js (zoom “maître”, topbar fondu, scroll lissé)
   - Topbar qui devient plus opaque en scroll (fondu)
   - Effet HERO au millimètre (spring + rAF) : zoom ÉNORME, tilt, remontée, fade
   - Robuste iOS/iPadOS/desktop (lecture scroll + clamp + dt)
   ======================================================================= */

(function(){
  'use strict';

  /* 0) Petites utilitaires */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const isMobile = () => window.innerWidth <= 820;

  /* 1) Topbar : passe en “solid” après 8px (fondu lisible) */
  const topbar = document.querySelector('.topbar');
  const onTopbarScroll = () => {
    if (!topbar) return;
    const y = window.pageYOffset || document.documentElement.scrollTop || 0;
    topbar.classList.toggle('solid', y > 8);
  };
  addEventListener('scroll', onTopbarScroll, { passive:true });
  onTopbarScroll();

  /* 2) Scroll doux pour les liens [data-scroll] (menu) */
  document.querySelectorAll('[data-scroll]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      e.preventDefault();
      const sel = a.getAttribute('data-scroll') || a.getAttribute('href');
      const el = document.querySelector(sel);
      if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
    });
  });

  /* 3) Effet HERO “au millimètre” (spring amorti + rAF) */
  const hero = document.getElementById('hero');
  const logo = document.getElementById('heroLogo');
  if (!hero || !logo) return;

  // Gains “maître” (tu peux affiner)
  const desktop = { tiltMax:12, zoomBase:1.00, zoomGain:0.60, liftGain:0.26, fadeGain:1.30 };
  const mobile  = { tiltMax:18, zoomBase:1.06, zoomGain:1.10, liftGain:0.34, fadeGain:1.60 }; // ÉNORME mais propre

  let G = isMobile() ? {...mobile} : {...desktop};
  addEventListener('resize', ()=>{ G = isMobile() ? {...mobile} : {...desktop}; }, { passive:true });

  // Spring (ressort amorti) — (ζ : amortissement, ω0 : vitesse naturelle)
  const ZETA = 0.86;  // amortissement élevé (pas de pompage)
  const W0   = 7.5;   // réponse rapide sans à-coups
  let x = 0, v = 0;   // état (progression) & vitesse
  let lastT = performance.now();

  function targetFromScroll(){
    const vh = innerHeight || 1;
    const y  = window.pageYOffset || document.documentElement.scrollTop || 0;
    // 0→1 atteint en ~70% d’un écran (effet visible dès le début)
    return clamp(y / (vh * 0.70), 0, 1);
  }

  function stepSpring(x, v, xt, dt){
    const w = W0, z = ZETA;
    const a = -2*z*w*v - (w*w)*(x - xt);
    const v2 = v + a*dt;
    const x2 = x + v2*dt;
    return [x2, v2];
  }

  function tick(now){
    const dt = Math.min(0.05, (now - lastT) / 1000); // dt ≤ 50ms
    lastT = now;

    // Cible issue du scroll (robuste iOS/desktop)
    const xt = targetFromScroll();
    [x, v] = stepSpring(x, v, xt, dt);

    // Mapping → transform
    const vh  = innerHeight || 1;
    const scl = G.zoomBase + G.zoomGain * x;       // ÉNORME mais lissé
    const ty  = -(vh * G.liftGain * x);            // remonte en scroll
    const rx  = G.tiltMax * x;                     // inclinaison
    const op  = clamp(1 - G.fadeGain * x, 0, 1);   // fondu

    logo.style.transform = `translate3d(0, ${ty}px, 0) rotateX(${rx}deg) scale(${scl})`;
    logo.style.opacity   = op;

    // Masquer totalement l’overlay quand c’est invisible
    hero.style.visibility = (op <= 0.01) ? 'hidden' : 'visible';

    requestAnimationFrame(tick);
  }
  requestAnimationFrame((t)=>{ lastT = t; requestAnimationFrame(tick); });
})();
