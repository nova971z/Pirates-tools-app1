/* ---- Install prompt ---- */
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

/* ---- Smooth anchors via data-scroll ---- */
document.addEventListener('click', (e)=>{
  const a = e.target.closest('[data-scroll]');
  if(!a) return;
  const sel = a.getAttribute('data-scroll');
  const el = document.querySelector(sel);
  if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth', block:'start'}); }
});

/* ---- Charge produits (+ fallback pour éviter page vide) ---- */
async function loadProducts(){
  try{
    const r = await fetch('products.json', {cache:'no-store'});
    if(!r.ok) throw new Error('no json');
    return await r.json();
  }catch{
    // Fallback minimal pour garantir du scroll et donc l’animation
    return [
      { sku:'DCF887 (18V XR)', badge:'Nouveau', img:'./images/pirates-tools-logo.png', desc:'Viseuse à choc.' },
      { sku:'DCD796 (18V XR)', badge:'Promo',  img:'./images/pirates-tools-logo.png', desc:'Perceuse-visseuse.' },
      { sku:'DCS391 (18V XR)', badge:'Stock',  img:'./images/pirates-tools-logo.png', desc:'Scie circulaire.' }
    ];
  }
}
loadProducts().then(MODELS=>{
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

/* ===========================================================
   HERO — Zoom + fondu. Centre parfaitement stable.
   Le zoom ne dépend PAS du scroll total mais de la section hero.
=========================================================== */
(function(){
  const hero  = document.getElementById('hero');
  const logo  = document.getElementById('heroLogo');
  const stage = document.querySelector('.hero-stage');
  if(!hero || !logo || !stage) return;

  const isMobile = matchMedia('(max-width: 740px)').matches;
  const ZOOM_START = 1.0;
  const ZOOM_END   = isMobile ? 2.4 : 1.7;     // zoom plus fort sur mobile
  const LIFT_END   = isMobile ? -18  : -10;    // léger déplacement vers le haut
  const clamp = (v,min,max)=>Math.max(min, Math.min(max,v));
  const lerp  = (a,b,t)=>a+(b-a)*t;

  let ticking = false;

  function measureProgress(){
    // Progression DANS la section hero (0 → 1)
    const vh = window.innerHeight || 1;
    const heroTop = hero.offsetTop;
    const heroHeight = Math.max(hero.offsetHeight, vh); // sécurité
    const y = window.scrollY - heroTop;
    return clamp(y / (heroHeight * 0.85), 0, 1);
  }

  function apply(progress){
    const scale   = lerp(ZOOM_START, ZOOM_END, progress);
    const lift    = lerp(0, LIFT_END,   progress);
    const opacity = 1 - progress; // fondu doux

    logo.style.transform = `translate3d(0, ${lift}px, 0) scale(${scale})`;
    logo.style.opacity   = opacity;

    // Le stage passe sous les cartes vers la fin pour laisser la liste prendre le dessus
    stage.style.zIndex = progress < 0.98 ? 10 : 1;
  }

  function onScroll(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(()=>{ apply(measureProgress()); ticking = false; });
  }

  // init + écouteurs
  apply(measureProgress());
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', onScroll);
})();
