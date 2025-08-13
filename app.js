/* ---------- PWA : SW ---------- */
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}

/* ---------- Menu : scroll fluide + lien actif ---------- */
const links = [...document.querySelectorAll('[data-scroll]')];
const map   = links.map(a => [a, document.querySelector(a.getAttribute('data-scroll'))]);

links.forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const sel = a.getAttribute('data-scroll');
    const el  = document.querySelector(sel);
    if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
  });
});

addEventListener('scroll', () => {
  const top = scrollY, h = innerHeight;
  let current = links[0];
  for (const [a, sec] of map) {
    if (!sec) continue;
    const start = sec.offsetTop - h * 0.35;
    if (top >= start) current = a;
  }
  links.forEach(a => a.classList.toggle('active', a === current));
});

/* ---------- HERO : zoom + fade + légère inclinaison (mobile plus marqué) ---------- */
(function () {
  const hero = document.getElementById('hero');
  const logo = document.getElementById('heroLogo');
  if (!hero || !logo) return;

  const isMobile = matchMedia('(max-width: 768px)').matches;
  const tiltMax   = isMobile ? 16 : 10;     // degrés
  const zoomGain  = isMobile ? 0.32 : 0.20; // grossit plus sur mobile
  const fadeGain  = isMobile ? 1.6  : 1.2;  // disparaît plus vite sur mobile
  const liftGain  = isMobile ? 0.32 : 0.24; // remonte un peu plus sur mobile

  const clamp = (v,min,max)=>Math.max(min, Math.min(max, v));
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const vh = innerHeight || 1;
      const p = clamp(scrollY / (vh * 0.9), 0, 1);

      const tilt      = tiltMax * p;
      const scale     = 1 + (zoomGain * p);          // <<< zoom en descendant
      const translate = -(vh * liftGain * p);        // <<< remonte
      const opacity   = clamp(1 - (fadeGain * p), 0, 1);

      logo.style.transform = `translate3d(0, ${translate}px, 0) rotateX(${tilt}deg) scale(${scale})`;
      logo.style.opacity   = opacity;

      // Quand le logo est quasi invisible, on masque l'overlay
      hero.style.visibility = (opacity <= 0.01) ? 'hidden' : 'visible';

      ticking = false;
    });
  }

  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ---------- Rendu produits (exemple) ---------- */
fetch('products.json')
  .then(r => r.json())
  .then(MODELS => {
    const list = document.getElementById('list');
    list.innerHTML = MODELS.map(m => `
      <article class="card" tabindex="0" aria-label="${m.sku}">
        <div class="head">
          <h2 class="title">${m.sku}</h2>
          <a class="btn" href="${m.link || '#'}" target="${m.link ? '_blank' : '_self'}" rel="noopener">Fiche</a>
        </div>

        <div class="body">
          <figure class="figure"><img src="${m.img}" alt="${m.sku}"></figure>
          <div class="specs">${m.specs.map(s => `<span class="spec">${s}</span>`).join('')}</div>
          ${m.desc ? `<p class="desc">${m.desc}</p>` : ''}
          ${m.price ? `<div class="actions"><span class="btn">~ ${m.price}</span><a class="btn primary" href="${m.cta || '#'}">Commander</a></div>` : ''}
        </div>
      </article>
    `).join('');
  })
  .catch(() => {
    document.getElementById('list').innerHTML =
      `<p style="opacity:.7">Aucun produit (vérifie <code>products.json</code>).</p>`;
  });
