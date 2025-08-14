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

/* ---- Charge produits (+ fallback pour garantir le scroll) ---- */
async function loadProducts(){
  try{
    const r = await fetch('products.json', {cache:'no-store'});
    if(!r.ok) throw new Error('no json');
    return await r.json();
  }catch{
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
   HERO — Zoom ÉNORME + fondu dans un voile sombre.
   Calcul basé sur la progression DANS la section hero.
=========================================================== */
(function(){
  const hero  = document.getElementById('hero');
  const logo  = document.getElementById('heroLogo');
  const stage = document.querySelector('.hero-stage');
  const veil  = document.querySelector('.hero-veil');
  if(!hero || !logo || !stage || !veil) return;

  const isMobile = matchMedia('(max-width: 740px)').matches;

  // ---- Réglages du zoom “énorme”
  const ZOOM_START = 1.0;
  const ZOOM_END   = isMobile ? 3.6 : 2.6;   // plus fort sur mobile
  const LIFT_END   = isMobile ? -26 : -14;   // légère remontée

  const clamp = (v,min,max)=>Math.max(min, Math.min(max,v));
  const lerp  = (a,b,t)=>a+(b-a)*t;
  const easeOut = t => 1 - Math.pow(1 - t, 1.15); // sortie douce
  let ticking = false;

  function progressInHero(){
    const vh = window.innerHeight || 1;
    const heroTop = hero.offsetTop;
    const heroH   = Math.max(hero.offsetHeight, vh);
    const y = window.scrollY - heroTop;
    return clamp(y / (heroH * 0.85), 0, 1);
  }

  function apply(p){
    // courbe adoucie
    const t = easeOut(p);

    const scale   = lerp(ZOOM_START, ZOOM_END, t);
    const lift    = lerp(0, LIFT_END,   t);
    const opacity = 1 - t;                 // fondu du logo

    logo.style.transform = `translate3d(0, ${lift}px, 0) scale(${scale})`;
    logo.style.opacity   = opacity;

    // voile qui “avale” le logo (commence discret puis couvre)
    const veilStart = 0.35; // à partir de 35% du scroll hero
    const veilT = clamp((p - veilStart) / (1 - veilStart), 0, 1);
    veil.style.opacity = Math.pow(veilT, 1.1);

    // laisse les cartes passer au-dessus sur la toute fin
    stage.style.zIndex = p < 0.985 ? 10 : 1;
  }

  function onScroll(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(()=>{ apply(progressInHero()); ticking = false; });
  }

  // init + écouteurs
  apply(progressInHero());
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', onScroll);
})();
