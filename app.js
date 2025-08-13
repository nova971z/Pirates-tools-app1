/* ---------- PWA : bouton "installer" (caché sur iOS) ---------- */
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});
/* ---------- Service Worker ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}

/* ---------- Menu : scroll fluide & lien actif ---------- */
const menuLinks = [...document.querySelectorAll('[data-scroll]')];
const mapLinks  = menuLinks.map(a => [a, document.querySelector(a.getAttribute('data-scroll'))]);

menuLinks.forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const sel = a.getAttribute('data-scroll');
    const el  = document.querySelector(sel);
    if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
  });
});

window.addEventListener('scroll', () => {
  const top = window.scrollY, h = innerHeight;
  let current = menuLinks[0];
  for (const [a, sec] of mapLinks) {
    if (!sec) continue;
    const start = sec.offsetTop - h * 0.35;
    if (top >= start) current = a;
  }
  menuLinks.forEach(a => a.classList.toggle('active', a === current));
});

/* ---------- HERO : inclinaison + réduction + fondu au scroll ---------- */
(function(){
  const hero = document.getElementById('hero');
  const logo = document.getElementById('heroLogo');
  if (!hero || !logo) return;

  let ticking = false;
  const clamp = (v,min,max)=>Math.max(min, Math.min(max, v));

  function onScroll(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const vh = window.innerHeight || 1;
      const progress = clamp(window.scrollY / (vh * .9), 0, 1);

      const tilt = 12 * progress;
      const scale = 1 - 0.15 * progress;
      const translate = -vh * 0.25 * progress;
      const opacity = clamp(1 - 1.1 * progress, 0, 1);

      logo.style.transform = `translate3d(0, ${translate}px, 0) rotateX(${tilt}deg) scale(${scale})`;
      logo.style.opacity = opacity;
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, {passive:true});
  onScroll();
})();

/* ---------- Rendu produits depuis products.json ---------- */
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
    const list = document.getElementById('list');
    list.innerHTML = `<p style="opacity:.7">Aucun produit (vérifie <code>products.json</code>).</p>`;
  });
