(() => {
  'use strict';

  const hero = document.getElementById('hero');
  const logo = document.getElementById('heroLogo');

  if (!hero || !logo) return;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const isMobile = () => window.innerWidth <= 820;

  const cfgDesktop = { zoomGain: 0.65, fadeGain: 1.30, liftGain: 0.26, tiltMax: 12 };
  const cfgMobile  = { zoomGain: 1.25, fadeGain: 1.60, liftGain: 0.34, tiltMax: 18 };

  function frame() {
    const vh = window.innerHeight || 1;
    const y  = window.pageYOffset || document.documentElement.scrollTop || 0;

    const p = clamp(y / (vh * 0.7), 0, 1);
    const C = isMobile() ? cfgMobile : cfgDesktop;

    const scale     = 1 + C.zoomGain * p;
    const translate = -(vh * C.liftGain * p);
    const tilt      = C.tiltMax * p;
    const opacity   = clamp(1 - C.fadeGain * p, 0, 1);

    logo.style.transform = `translate3d(0, ${translate}px, 0) rotateX(${tilt}deg) scale(${scale})`;
    logo.style.opacity   = opacity;

    hero.style.visibility = (opacity <= 0.01) ? 'hidden' : 'visible';

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
