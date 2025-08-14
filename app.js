/* ========= Utilities ========= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const fmtPrice = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: '2-digit' });

/* ========= Header: menu + logo + translucide ========= */
(() => {
  const topbar = $('.topbar');
  const btn = $('.menu-btn');
  const nav = $('#mainnav');
  const brand = $('.brand') || $('.brand__link');

  function setOpen(open) {
    if (!btn || !nav) return;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    nav.classList.toggle('is-open', open);
  }

  btn?.addEventListener('click', () => setOpen(!(btn.getAttribute('aria-expanded') === 'true')));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
  nav?.addEventListener('click', (e) => e.target.closest('a') && setOpen(false));
  window.matchMedia('(min-width: 901px)').addEventListener?.('change', () => setOpen(false));

  // Effet logo + état topbar selon scroll
  if (brand) {
    brand.classList.add('grow');
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      topbar?.classList.toggle('scrolled', y > 10);
      if (y < 10 && last >= 10) {
        brand.classList.remove('shrink'); brand.classList.add('grow');
      } else if (y >= 10 && last < 10) {
        brand.classList.remove('grow'); brand.classList.add('shrink');
      }
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();

/* ========= Smooth scroll vers data-scroll ========= */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-scroll]');
  if (!a) return;
  const sel = a.getAttribute('data-scroll');
  const el = document.querySelector(sel);
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* ========= IntersectionObserver: apparitions & lazy images ========= */
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('visible');
      const img = el.querySelector('img[data-src]');
      if (img) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
      io.unobserve(el);
    });
  },
  { threshold: 0.2 }
);

/* ========= Rendu catalogue + filtres + pagination ========= */
(async function renderCatalogue() {
  const mount = $('#product-list');
  if (!mount) return;

  const res = await fetch('/produits.json', { cache: 'no-store' });
  const all = await res.json();

  const params = new URLSearchParams(location.search);
  const q = params.get('q') || '';
  const tag = params.get('tag') || '';
  const sort = params.get('sort') || 'date_desc';
  let page = parseInt(params.get('page') || '1', 10);
  const per = parseInt(params.get('per') || '9', 10);

  // Filtres UI
  const form = $('#filters');
  if (form) {
    if (form.q) form.q.value = q;
    if (form.tag) form.tag.value = tag;
    if (form.sort) form.sort.value = sort;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const p = new URLSearchParams(location.search);
      p.set('q', (form.q?.value || '').trim());
      form.tag?.value ? p.set('tag', form.tag.value) : p.delete('tag');
      p.set('sort', form.sort?.value || 'date_desc');
      p.set('page', '1');
      history.replaceState(null, '', location.pathname + '?' + p.toString());
      location.reload();
    });
  }

  // Filtrage
  let items = all.filter((x) => {
    const hitQ = !q || (x.title + ' ' + x.excerpt).toLowerCase().includes(q.toLowerCase());
    const hitTag = !tag || x.tags.includes(tag);
    return hitQ && hitTag;
  });

  // Tri
  const sorts = {
    date_desc: (a, b) => (b.date || '').localeCompare(a.date || ''),
    date_asc: (a, b) => (a.date || '').localeCompare(b.date || ''),
    title_asc: (a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }),
    price_asc: (a, b) => (a.price || 0) - (b.price || 0),
    price_desc: (a, b) => (b.price || 0) - (a.price || 0),
  };
  items.sort(sorts[sort] || sorts.date_desc);

  // Pagination
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / per));
  page = Math.min(Math.max(1, page), pages);
  const slice = items.slice((page - 1) * per, (page - 1) * per + per);

  // Rendu cartes
  mount.innerHTML = slice
    .map(
      (p) => `
    <li class="card will-animate">
      <a href="${p.url || '#'}" ${p.url ? 'target="_blank" rel="noopener"' : ''} aria-label="${p.title}">
        <div class="card__media">
          <img data-src="${p.image}" alt="" width="640" height="400" loading="lazy" />
        </div>
        <div class="card__body">
          <div class="card__title">${p.title}</div>
          <div class="card__meta">
            ${p.date ? `<span>${fmtDate(p.date)}</span>` : ''}
            ${p.tags.map((t) => `<span class="chip">${t}</span>`).join('')}
            ${p.price ? `<span class="price">${fmtPrice(p.price)}</span>` : ''}
          </div>
          <p>${p.excerpt}</p>
        </div>
      </a>
    </li>`
    )
    .join('');

  // IO observe
  $$('.card.will-animate', mount).forEach((el) => io.observe(el));

  // Pager
  $('#pageinfo').textContent = `${page} / ${pages}`;
  const setParam = (k, v) => {
    const sp = new URLSearchParams(location.search);
    sp.set(k, String(v));
    history.replaceState(null, '', location.pathname + '?' + sp.toString());
  };
  const prev = $('#prev'),
    next = $('#next');
  prev.disabled = page <= 1;
  next.disabled = page >= pages;
  prev.onclick = () => {
    setParam('page', page - 1);
    location.reload();
  };
  next.onclick = () => {
    setParam('page', page + 1);
    location.reload();
  };

  // Préchargement léger des href externes (hover)
  $$('#product-list a[href]').forEach((a) =>
    a.addEventListener(
      'mouseenter',
      () => {
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#')) return;
        fetch(href, { mode: 'no-cors' }).catch(() => {});
      },
      { passive: true }
    )
  );
})();

/* ========= Enregistrement SW (si balise data-register présente) ========= */
(() => {
  if (!('serviceWorker' in navigator)) return;
  const has = document.querySelector('#sw-inline[data-register]');
  if (!has) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
})();
