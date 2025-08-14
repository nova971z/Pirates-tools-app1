/* ---- Install prompt (Android/desktop) ---- */
let deferredPrompt;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferredPrompt = e; installBtn.hidden = false;
});
installBtn?.addEventListener('click', async () => {
  installBtn.hidden = true; if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt = null; }
});

/* ---- Service worker ---- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js'); });
}

/* ---- Small helper: smooth jump to anchors via data-scroll ---- */
document.addEventListener('click', (e)=>{
  const a = e.target.closest('[data-scroll]');
  if(!a) return;
  const sel = a.getAttribute('data-scroll');
  const el = document.querySelector(sel);
  if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth', block:'start'}); }
});

/* ---- Load demo products (unchanged; adapt to your JSON) ---- */
fetch('products.json').then(r=>r.json()).then(MODELS=>{
  const list = document.getElementById('list');
  list.innerHTML = MODELS.map(m=>`
    <article class="card">
      <div class="head">
        <h2 class="title">${m.sku}</h2>
        ${m.badge ? `<span class="chip">${m.badge}</span>` : ``}
      </div>
      ${m.img ? `<img src="${m.img}" alt="${m.sku}">` : ``}
      ${m.desc ? `<p>${m.desc}</p>` : ``}
    </article>
  `).join('');
});

/* =================================================================
   HERO EFFECT — zoom + fondu + passage au-dessus des articles
   - centre totalement stable (pas de décalage)
   - zoom fort sur mobile, moyen sur desktop
   - disparaît avec un fondu en bas du hero
================================================================= */
(function(){
  const logo = document.getElementById('heroLogo');
  const stage = document.querySelector('.hero-stage');
  if(!logo || !stage) return;

  const isMobile = matchMedia('(max-width: 740px)').matches;

  // bornes d’animation
  const ZOOM_START = 1.0;
  const ZOOM_END   = isMobile ? 2.4 : 1.7; // zoom plus fort sur mobile
  const TRANSLATE_UP_END = isMobile ? -18 : -10; // en px par 1 de progrès (léger lift)
  const OPACITY_END = 0.0;

  // utilitaires
  const clamp = (v,min,max)=>Math.max(min, Math.min(max,v));
  const lerp  = (a,b,t)=>a+(b-a)*t;

  let ticking = false;

  function onScroll(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(()=>{
      const vh = window.innerHeight || 1;
      // on fait disparaître le logo d’ici ~85% d’un écran
      const progress = clamp(window.scrollY / (vh*0.85), 0, 1);

      const scale     = lerp(ZOOM_START, ZOOM_END, progress);
      const translate = lerp(0, TRANSLATE_UP_END, progress);  // vers le haut
      const opacity   = lerp(1, OPACITY_END, progress);

      // centre stable + lissage GPU
      logo.style.transform = `translate3d(0, ${translate}px, 0) scale(${scale})`;
      logo.style.opacity   = opacity;

      // le "stage" reste au-dessus au début, puis
      // laisse place aux cartes (z-index baisse très légèrement)
      stage.style.zIndex = progress < 0.98 ? 10 : 1;

      ticking = false;
    });
  }

  // démarrage
  onScroll();
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', onScroll);
})();
