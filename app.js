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

/* ---- Charge produits (fallback local) ---- */
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
   HERO — Zoom PAR-DESSUS + voile + séparation courte
   (compatible avec <section class="hero-full" id="hero">)
=========================================================== */
(function(){
  const stage = document.getElementById('hero');            // .hero-full
  const logo  = document.getElementById('heroLogo');        // img
  const fade  = document.querySelector('.hero-fade');       // dégradé bas
  if(!stage || !logo || !fade) return;

  const isMobile = matchMedia('(max-width: 740px)').matches;

  // Réglages fins du zoom
  const BASE_SCALE = isMobile ? 1.25 : 1.10;    // taille au repos (haut de page)
  const MAX_SCALE  = isMobile ? 3.9  : 2.9;     // zoom massif pendant le scroll
  const LIFT_END   = isMobile ? -28  : -14;     // légère remontée (px)

  const clamp = (v,min,max)=>Math.max(min, Math.min(max,v));
  const lerp  = (a,b,t)=>a + (b-a)*t;
  const ease  = t => 1 - Math.pow(1 - t, 1.12); // easing doux

  // Progression de 0 (haut) à 1 (logo complètement disparu)
  function getProgress(){
    const vh  = window.innerHeight || 1;
    const box = stage.getBoundingClientRect();
    const topAbs = box.top + window.scrollY;
    const y   = window.scrollY - topAbs;
    // 0.9 * vh -> l’anim se termine un peu avant la fin du viewport
    return clamp(y / (vh * 0.9), 0, 1);
  }

  function render(p){
    const t = ease(p);
    const scale = lerp(BASE_SCALE, MAX_SCALE, t);
    const lift  = lerp(0, LIFT_END, t);

    // Zoom + légère remontée + fondu
    logo.style.transform = `translate3d(0, ${lift}px, 0) scale(${scale})`;
    logo.style.opacity   = (1 - t).toFixed(4);

    // Voile (utilise la variable CSS --veil via pseudo-élément ::before)
    const veilStart = 0.30; // commence quand ~30% du scroll est fait
    const veilT = clamp((p - veilStart) / (1 - veilStart), 0, 1);
    stage.style.setProperty('--veil', Math.pow(veilT, 1.08).toFixed(4));

    // Toujours AU-DESSUS jusqu’à la fin de l’anim
    stage.style.zIndex = 6000;

    // On libère les clics une fois le logo totalement parti
    stage.style.pointerEvents = (p >= 0.999) ? 'none' : 'auto';
  }

  let ticking=false;
  function onScroll(){
    if(ticking) return; ticking = true;
    requestAnimationFrame(()=>{ render(getProgress()); ticking = false; });
  }

  // Init (pose une base centré/zoomé dès le chargement)
  render(getProgress());
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', onScroll);
})();
