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
   HERO — Zoom “par-dessus” + disparition dans un voile.
   - Héros réduit (38svh) => écart fortement diminué
   - Le stage reste AU-DESSUS (z-index élevé)
   - On coupe pointer-events en fin d’anim pour cliquer la liste
=========================================================== */
(function(){
  const hero  = document.getElementById('hero');
  const logo  = document.getElementById('heroLogo');
  const stage = document.querySelector('.hero-stage');
  const veil  = document.querySelector('.hero-veil');
  if(!hero || !logo || !stage || !veil) return;

  const isMobile = matchMedia('(max-width: 740px)').matches;

  // Réglages : zoom fort, par-dessus
  const ZOOM_START = 1.0;
  const ZOOM_END   = isMobile ? 3.6 : 2.8;   // énorme sur mobile
  const LIFT_END   = isMobile ? -24 : -12;   // légère remontée

  const clamp  = (v,min,max)=>Math.max(min, Math.min(max,v));
  const lerp   = (a,b,t)=>a+(b-a)*t;
  const easeOut = t => 1 - Math.pow(1 - t, 1.12);

  // progression basée sur la position de la section,
  // mais normalisée sur ~1 viewport pour garder le feeling
  function progress(){
    const vh = window.innerHeight || 1;
    const top = hero.getBoundingClientRect().top + window.scrollY;
    const y   = window.scrollY - top;
    return clamp(y / (vh * 0.9), 0, 1);
  }

  function render(p){
    const t = easeOut(p);
    const scale = lerp(ZOOM_START, ZOOM_END, t);
    const lift  = lerp(0, LIFT_END,   t);

    logo.style.transform = `translate3d(0, ${lift}px, 0) scale(${scale})`;
    logo.style.opacity   = 1 - t;

    // voile qui se renforce (le logo disparaît “dans le fond”)
    const veilStart = 0.30;
    const veilT = clamp((p - veilStart) / (1 - veilStart), 0, 1);
    veil.style.opacity = Math.pow(veilT, 1.08);

    // Toujours AU-DESSUS pour le zoom
    stage.style.zIndex = 30;
    // Mais on libère les clics à la fin
    stage.style.pointerEvents = (p >= 0.98) ? 'none' : 'auto';
  }

  let ticking=false;
  function onScroll(){
    if(ticking) return;
    ticking=true;
    requestAnimationFrame(()=>{ render(progress()); ticking=false; });
  }

  render(progress());
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', onScroll);
})();
