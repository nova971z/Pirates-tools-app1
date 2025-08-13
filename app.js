
// beforeinstallprompt is not supported on iOS; this is fine (button stays hidden)
let deferredPrompt;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn?.addEventListener('click', async () => {
  installBtn.hidden = true;
  if(deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
});

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js'); });
}

// Load offline products
fetch('products.json').then(r=>r.json()).then(MODELS => {
  const list = document.getElementById('list');
  list.innerHTML = MODELS.map(m=>`
    <article class="card" tabindex="0" aria-label="${m.sku}">
      <div class="head">
        <h2 class="title">${m.sku}</h2>
        <button class="toggle" aria-expanded="false">Voir détails</button>
      </div>
      <div class="body">
        <figure class="figure"><img src="${m.img}" alt="${m.sku}"></figure>
        <p>${m.desc}</p>
        <div class="specs">${m.specs.map(s=>`<span class="spec">${s}</span>`).join('')}</div>
        <div class="actions">
          <a class="btn primary" href="#" onclick="event.preventDefault()">Fiche</a>
        </div>
      </div>
    </article>
  `).join('');
  Array.from(document.querySelectorAll('.card')).forEach(card=>{
    const btn = card.querySelector('.toggle');
    const toggle = ()=>{
      const on = !card.classList.contains('expanded');
      document.querySelectorAll('.card').forEach(c=>{ if(c!==card){ c.classList.remove('expanded'); c.querySelector('.toggle').setAttribute('aria-expanded','false'); } });
      card.classList.toggle('expanded', on);
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      btn.textContent = on ? 'Réduire' : 'Voir détails';
      if(on) card.scrollIntoView({behavior:'smooth', block:'center'});
    };
    btn.addEventListener('click', toggle);
    card.addEventListener('click', (e)=>{ if(e.target !== btn) toggle(); });
  });
});

// --- Effet HERO : inclinaison + réduction + fondu au scroll ---
(function(){
  const hero = document.getElementById('hero');
  const logo = document.getElementById('heroLogo');
  if(!hero || !logo) return;

  let ticking = false;
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

  function onScroll(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(()=>{
      const vh = window.innerHeight || 1;
      const progress = clamp(window.scrollY / (vh * 0.9), 0, 1);

      const tilt = 12 * progress;
      const scale = 1 - 0.15 * progress;
      const translate = -vh * 0.25 * progress;
      const opacity = clamp(1 - 1.1 * progress, 0, 1);

      logo.style.transform =
        `translate3d(0, ${translate}px, 0) rotateX(${tilt}deg) scale(${scale})`;
      logo.style.opacity = opacity.toFixed(3);

      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', onScroll, {passive:true});
  onScroll();
})();
