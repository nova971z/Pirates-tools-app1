/* =========================================================
   Pirates Tools — app.js (SPA hash routing)
   Pages: Home, Catalog, Product, Account, About/Payments
   Data: products.json (structure fournie)
   Optimisations: délégation globale, lazy images, transitions
   ========================================================= */

(() => {
  "use strict";

  /* ---------- CONFIG ---------- */
  const APP_NAME = "Pirates Tools";
  const STORE_PHONE_DISPLAY = "07 74 23 01 95";
  const STORE_PHONE_E164 = "+33774230195";
  const STORE_WHATS_DEFAULT =
    "Bonjour Pirates Tools, j’ai une question à propos d’un produit.";
  const DATA_URL = "products.json";
  const LS_KEYS = {
    FAVORITES: "pt_favorites",
    ACCOUNT: "pt_account"
  };
  const PLACEHOLDER_IMG = "images/placeholder.png";

  /* ---------- HELPERS ---------- */
  const qs = (sel, el = document) => el.querySelector(sel);
  const qsa = (sel, el = document) => [...el.querySelectorAll(sel)];
  const encode = encodeURIComponent;

  const fmtPrice = (n, currency = "EUR", locale = "fr-FR") =>
    typeof n === "number"
      ? new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          maximumFractionDigits: 2
        }).format(n)
      : "";

  const phoneLink = `tel:${STORE_PHONE_E164}`;
  const smsLink = `sms:${STORE_PHONE_E164}`;
  const waLink = (text = STORE_WHATS_DEFAULT) =>
    `https://wa.me/${STORE_PHONE_E164.replace("+", "")}?text=${encode(text)}`;

  const readLS = (k, fb) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : fb;
    } catch {
      return fb;
    }
  };
  const writeLS = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  };

  const getFavorites = () => new Set(readLS(LS_KEYS.FAVORITES, []));
  const toggleFavorite = (id) => {
    const favs = getFavorites();
    favs.has(id) ? favs.delete(id) : favs.add(id);
    writeLS(LS_KEYS.FAVORITES, [...favs]);
    return favs.has(id);
  };

  const ratingStars = (r = 0) => {
    const full = Math.floor(r);
    const half = r - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return `<span class="stars">${"★".repeat(full)}${half ? "☆" : ""}${"·".repeat(
      empty
    )}</span>`;
  };

  const imgTag = (src, alt = "", cls = "") =>
    `<img loading="lazy" src="${src || PLACEHOLDER_IMG}" alt="${alt || ""}" class="${cls}">`;

  const badge = (text, cls = "") =>
    text ? `<span class="badge ${cls}">${text}</span>` : "";

  const chip = (text, attrs = "") =>
    text ? `<button class="chip" ${attrs}>${text}</button>` : "";

  const routerPush = (hash) => {
    if (location.hash !== hash) location.hash = hash;
    else window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copié ✨");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast("Copié ✨");
    }
  }

  function toast(msg = "OK") {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => t.classList.remove("show"), 1800);
    setTimeout(() => t.remove(), 2200);
  }

  /* ---------- STATE ---------- */
  const state = {
    products: [],
    productsBySlug: new Map(),
    productsById: new Map(),
    ready: false
  };

  /* ---------- DATA LOADING ---------- */
  async function loadProducts() {
    if (state.ready) return state.products;
    try {
      const resp = await fetch(DATA_URL, { cache: "no-cache" });
      const data = await resp.json();
      state.products = Array.isArray(data) ? data : [];
      state.productsBySlug.clear();
      state.productsById.clear();
      for (const p of state.products) {
        if (p.slug) state.productsBySlug.set(p.slug, p);
        if (p.id) state.productsById.set(p.id, p);
      }
      state.ready = true;
    } catch (e) {
      console.warn("products.json introuvable", e);
      state.ready = true;
      state.products = [];
    }
    return state.products;
  }

  /* ---------- LAYOUT ---------- */
  function topBar() {
    return `
      <div class="topbar">
        <a class="brand" href="#/">
          <img src="images/logo.png" alt="Logo" class="logo" onerror="this.style.display='none'">
          <span>${APP_NAME}</span>
        </a>
        <div class="contact-actions">
          <a class="btn icon" href="${phoneLink}" aria-label="Appeler">📞</a>
          <a class="btn icon" href="${smsLink}" aria-label="SMS">💬</a>
          <a class="btn" href="${waLink()}" target="_blank" rel="noopener">WhatsApp</a>
        </div>
      </div>
      <nav class="nav">
        <a href="#/" data-link>Accueil</a>
        <a href="#/catalog" data-link>Catalogue</a>
        <a href="#/account" data-link>Espace compte</a>
        <a href="#/about" data-link>À propos & Paiements</a>
      </nav>
    `;
  }
  function footer() {
    return `
      <footer class="footer">
        <div class="footer-col">
          <h4>Contact</h4>
          <p>Tél : <a href="${phoneLink}">${STORE_PHONE_DISPLAY}</a></p>
          <p><a href="${waLink()}" target="_blank" rel="noopener">WhatsApp</a> · <a href="${smsLink}">SMS</a></p>
        </div>
        <div class="footer-col">
          <h4>Liens</h4>
          <p><a href="#/catalog">Catalogue</a></p>
          <p><a href="#/account">Espace compte</a></p>
          <p><a href="#/about">À propos</a></p>
        </div>
        <div class="footer-col">
          <h4>Mentions</h4>
          <p>© ${new Date().getFullYear()} ${APP_NAME}.</p>
        </div>
      </footer>
    `;
  }
  function pageShell(content, options = {}) {
    const { title, subtitle } = options;
    return `
      <header class="header">
        ${topBar()}
        ${title ? `<div class="page-head"><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ""}</div>` : ""}
      </header>
      <main class="main">${content || ""}</main>
      ${footer()}
    `;
  }

  /* ---------- UI HELPERS ---------- */
  function gotoCatalog(filters) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.category) params.set("cat", filters.category);
    if (filters.platform) params.set("pf", filters.platform);
    if (filters.sort && filters.sort !== "popular") params.set("sort", filters.sort);
    const query = params.toString();
    routerPush(query ? `#/catalog?${query}` : "#/catalog");
  }

  function productCard(p) {
    const discount =
      typeof p.price === "number" &&
      typeof p.price_old === "number" &&
      p.price_old > p.price
        ? Math.round(100 - (p.price / p.price_old) * 100)
        : p.discount_percent || null;

    const isFav = getFavorites().has(p.id);

    return `
      <article class="card product-card" data-id="${p.id}">
        <a class="thumb" href="#/product/${p.slug}" aria-label="${p.title}">
          ${imgTag(p.img, p.images_alt || p.title)}
          ${p.badge ? badge(p.badge) : ""}
          ${discount ? badge(`-${discount}%`, "discount") : ""}
        </a>
        <div class="card-body">
          <h3 class="product-title"><a href="#/product/${p.slug}">${p.title}</a></h3>
          <div class="meta">
            ${p.brand ? `<button class="brand-bubble" data-brand="${p.brand}" title="Voir ${p.brand}">${p.brand}</button>` : ""}
            ${p.tag ? chip(p.tag, 'data-filter-key="tag" data-filter-val="'+p.tag+'"') : ""}
          </div>
          <div class="price-line">
            <span class="price">${fmtPrice(p.price, p.currency || "EUR")}</span>
            ${p.price_old ? `<span class="price-old">${fmtPrice(p.price_old, p.currency || "EUR")}</span>` : ""}
          </div>
          <div class="rating">${p.rating ? ratingStars(p.rating) + ` <small>${p.reviews || 0} avis</small>` : ""}</div>
          <div class="stock ${p.stock_status || ""}">${p.stock_label || ""}</div>
          <div class="actions">
            <button class="btn outline fav-btn" data-fav="${p.id}" aria-pressed="${isFav}">${isFav ? "★ Favori" : "☆ Favori"}</button>
            <a class="btn primary" href="#/product/${p.slug}">Voir</a>
          </div>
        </div>
      </article>
    `;
  }
  const productGrid = (list) =>
    list?.length ? `<section class="grid">${list.map(productCard).join("")}</section>` : `<p class="empty">Aucun produit.</p>`;

  function hero() {
    return `
      <section class="hero">
        <div class="hero-text">
          <h2>Outils pro, prix pirates ⚓</h2>
          <p>DeWALT XR 12V / 18V, kits & accessoires. Expédition rapide.</p>
          <div class="hero-cta">
            <a class="btn primary" href="#/catalog">Voir le catalogue</a>
            <a class="btn" href="${waLink("Bonjour, je souhaite un conseil pour choisir un produit.")}" target="_blank" rel="noopener">Conseil WhatsApp</a>
          </div>
        </div>
        <div class="hero-media">
          <img src="images/hero.jpg" alt="Pirates Tools" onerror="this.style.display='none'">
        </div>
      </section>
    `;
  }

  /* ---------- PAGES ---------- */
  async function renderHome() {
    const products = await loadProducts();
    const top = products.filter((p) => ["Top", "Pack"].includes(p.badge)).slice(0, 6);
    const promo = products
      .filter((p) => (p.discount_percent || 0) >= 10 || (p.price_old && p.price_old > p.price))
      .slice(0, 6);
    const compact = products
      .filter((p) => /compact/i.test(p.badge || "") || /Ultra-compact/.test(p.desc || ""))
      .slice(0, 6);

    const content = `
      ${hero()}
      <section class="section"><h2>En vedette</h2>${productGrid(top)}</section>
      <section class="section"><h2>Promos</h2>${productGrid(promo)}</section>
      <section class="section"><h2>Ultra-compacts</h2>${productGrid(compact)}</section>
    `;
    mount(pageShell(content, { title: "Accueil" }), "Accueil");
  }

  function readSearchParams() {
    const hash = location.hash || "#/catalog";
    const qIndex = hash.indexOf("?");
    const params = new URLSearchParams(qIndex >= 0 ? hash.slice(qIndex + 1) : "");
    return {
      q: params.get("q") || "",
      brand: params.get("brand") || "",
      category: params.get("cat") || "",
      platform: params.get("pf") || "",
      sort: params.get("sort") || "popular"
    };
  }
  function writeSearchParams(obj) {
    const params = new URLSearchParams();
    if (obj.q) params.set("q", obj.q);
    if (obj.brand) params.set("brand", obj.brand);
    if (obj.category) params.set("cat", obj.category);
    if (obj.platform) params.set("pf", obj.platform);
    if (obj.sort && obj.sort !== "popular") params.set("sort", obj.sort);
    const query = params.toString();
    routerPush(query ? `#/catalog?${query}` : "#/catalog");
  }

  async function renderCatalog() {
    const products = await loadProducts();
    const params = readSearchParams();

    const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))].sort();
    const cats = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
    const platforms = [...new Set(products.map((p) => p.platform).filter(Boolean))].sort();

    let list = products.slice();
    if (params.q) {
      const q = params.q.toLowerCase();
      list = list.filter((p) =>
        [p.title, p.desc, p.description, p.sku, p.tags?.join(" "), p.brand, p.category]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (params.brand) list = list.filter((p) => p.brand === params.brand);
    if (params.category) list = list.filter((p) => p.category === params.category);
    if (params.platform) list = list.filter((p) => p.platform === params.platform);

    const sorters = {
      price_asc: (a, b) => (a.price ?? 0) - (b.price ?? 0),
      price_desc: (a, b) => (b.price ?? 0) - (a.price ?? 0),
      newest: (a, b) => (b.new === true) - (a.new === true),
      popular: (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
    };
    list.sort(sorters[params.sort] || sorters.popular);

    const filters = `
      <form class="filters" id="filters">
        <input type="search" name="q" placeholder="Rechercher…" value="${params.q}">
        <select name="brand"><option value="">Marque</option>${brands
          .map((b) => `<option ${b === params.brand ? "selected" : ""}>${b}</option>`)
          .join("")}</select>
        <select name="category"><option value="">Catégorie</option>${cats
          .map((c) => `<option ${c === params.category ? "selected" : ""}>${c}</option>`)
          .join("")}</select>
        <select name="pf"><option value="">Plateforme</option>${platforms
          .map((p) => `<option value="${p}" ${p === params.platform ? "selected" : ""}>${p}</option>`)
          .join("")}</select>
        <select name="sort">
          <option value="popular" ${params.sort === "popular" ? "selected" : ""}>Populaire</option>
          <option value="price_asc" ${params.sort === "price_asc" ? "selected" : ""}>Prix ↑</option>
          <option value="price_desc" ${params.sort === "price_desc" ? "selected" : ""}>Prix ↓</option>
          <option value="newest" ${params.sort === "newest" ? "selected" : ""}>Nouveaux</option>
        </select>
        <button class="btn" type="submit">Appliquer</button>
        <button class="btn outline" type="button" id="resetFilters">Réinitialiser</button>
      </form>
    `;

    const content = `
      <section class="section">
        <h2>Catalogue</h2>
        ${filters}
        ${productGrid(list)}
      </section>
    `;
    mount(pageShell(content, { title: "Catalogue" }), "Catalogue");

    qs("#filters")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      writeSearchParams({
        q: fd.get("q") || "",
        brand: fd.get("brand") || "",
        category: fd.get("category") || "",
        platform: fd.get("pf") || "",
        sort: fd.get("sort") || "popular"
      });
    });
    qs("#resetFilters")?.addEventListener("click", () => writeSearchParams({}));
  }

  function galleryHTML(p) {
    const imgs = [p.img, ...(Array.isArray(p.gallery) ? p.gallery : [])].filter(Boolean);
    return `
      <div class="gallery">
        <div class="gallery-main">${imgTag(imgs[0], p.images_alt || p.title, "main")}</div>
        ${
          imgs.length > 1
            ? `<div class="thumbs">
                ${imgs
                  .map(
                    (u, i) =>
                      `<button class="thumb-btn ${i === 0 ? "active" : ""}" data-src="${u}">${imgTag(
                        u,
                        p.title
                      )}</button>`
                  )
                  .join("")}
              </div>`
            : ""
        }
      </div>
    `;
  }

  async function renderProduct(slug) {
    await loadProducts();
    const p = state.productsBySlug.get(slug);
    if (!p) return renderNotFound();

    const discount =
      typeof p.price === "number" &&
      typeof p.price_old === "number" &&
      p.price_old > p.price
        ? Math.round(100 - (p.price / p.price_old) * 100)
        : p.discount_percent || null;
    const isFav = getFavorites().has(p.id);

    const details = `
      <section class="product">
        <div class="product-media">${galleryHTML(p)}</div>
        <div class="product-info">
          <h2>${p.title}</h2>
          <div class="meta-line">
            ${p.brand ? `<button class="brand-bubble" data-brand="${p.brand}" title="Voir ${p.brand}">${p.brand}</button>` : ""}
            ${p.platform ? chip(p.platform, 'data-filter-key="pf" data-filter-val="'+p.platform+'"') : ""}
            ${p.category ? chip(p.category, 'data-filter-key="cat" data-filter-val="'+p.category+'"') : ""}
            ${p.tag ? chip(p.tag, 'data-filter-key="tag" data-filter-val="'+p.tag+'"') : ""}
            ${p.badge ? badge(p.badge) : ""}
          </div>

          <div class="price-block">
            <span class="price">${fmtPrice(p.price, p.currency || "EUR")}</span>
            ${p.price_old ? `<span class="price-old">${fmtPrice(p.price_old, p.currency || "EUR")}</span>` : ""}
            ${discount ? `<span class="discount">-${discount}%</span>` : ""}
          </div>

          <div class="stock ${p.stock_status || ""}">${p.stock_label || ""}</div>
          <p class="desc">${p.description || p.desc || ""}</p>

          ${p.features?.length ? `<ul class="features">${p.features.map((f) => `<li>${f}</li>`).join("")}</ul>` : ""}

          ${
            p.specs_kv
              ? `<table class="specs"><tbody>${Object.entries(p.specs_kv)
                  .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`)
                  .join("")}</tbody></table>`
              : ""
          }

          <div class="actions">
            <button class="btn outline fav-btn" data-fav="${p.id}" aria-pressed="${isFav}">${isFav ? "★ Favori" : "☆ Favori"}</button>
            <a class="btn" href="${phoneLink}">Appeler</a>
            <a class="btn" href="${smsLink}">SMS</a>
            <a class="btn primary" href="${waLink(p.whatsapp_template || `Bonjour, je souhaite un devis pour ${p.title} (${p.sku || ""}).`)}" target="_blank" rel="noopener">Devis WhatsApp</a>
            <button class="btn" id="shareBtn">Partager</button>
          </div>

          <div class="backlinks"><a href="#/catalog">← Retour au catalogue</a></div>
        </div>
      </section>
    `;

    const related =
      (p.related_ids || [])
        .map((id) => state.productsById.get(id))
        .filter(Boolean)
        .slice(0, 6) || [];
    const relatedHTML = related.length
      ? `<section class="section"><h3>Produits liés</h3>${productGrid(related)}</section>`
      : "";

    mount(pageShell(details + relatedHTML, { title: "Fiche produit" }), p.title);

    // galerie
    const mainImg = qs(".gallery-main img");
    qsa(".thumb-btn").forEach((b) =>
      b.addEventListener("click", () => {
        qsa(".thumb-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        const src = b.getAttribute("data-src");
        if (src && mainImg) mainImg.src = src;
      })
    );

    // share
    qs("#shareBtn")?.addEventListener("click", async () => {
      const url = location.href;
      try {
        if (navigator.share) {
          await navigator.share({ title: p.title, text: p.desc || "", url });
        } else {
          await navigator.clipboard.writeText(url);
          toast("Lien copié ✨");
        }
      } catch {}
    });
  }

  function accountFormHTML() {
    const acc = readLS(LS_KEYS.ACCOUNT, { name: "", email: "" });
    return `
      <form id="accountForm" class="account-form">
        <label>Nom / Pseudo<input name="name" value="${acc.name || ""}" placeholder="Votre nom"></label>
        <label>Email<input type="email" name="email" value="${acc.email || ""}" placeholder="vous@exemple.com"></label>
        <button class="btn primary" type="submit">Enregistrer</button>
        <button class="btn outline" type="button" id="logoutBtn">Se déconnecter</button>
      </form>
    `;
  }
  async function renderAccount() {
    const favs = [...getFavorites()].map((id) => state.productsById.get(id)).filter(Boolean);
    const content = `
      <section class="section"><h2>Mon compte</h2>${accountFormHTML()}</section>
      <section class="section"><h3>Mes favoris</h3>${productGrid(favs)}</section>
    `;
    mount(pageShell(content, { title: "Espace compte" }), "Espace compte");

    qs("#accountForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      writeLS(LS_KEYS.ACCOUNT, {
        name: (fd.get("name") || "").toString().trim(),
        email: (fd.get("email") || "").toString().trim()
      });
      toast("Profil enregistré");
    });
    qs("#logoutBtn")?.addEventListener("click", () => {
      localStorage.removeItem(LS_KEYS.ACCOUNT);
      toast("Déconnecté");
      routerPush("#/account");
    });
  }

  function paymentsHTML() {
    // IBAN fictif d’exemple — remplace par le tien si besoin
    const IBAN = "FR76 3000 3000 0000 0000 0000 000";
    const BIC = "PSSTFRPPXXX";
    return `
      <div class="payments">
        <h3>Moyens de paiement acceptés</h3>
        <div class="pay-grid">
          <article class="pay-card">
            <div class="pay-ico" aria-hidden="true">💳</div>
            <h4>Carte bancaire</h4>
            <p>Visa / Mastercard via lien sécurisé.</p>
            <a class="btn" href="${waLink("Bonjour, envoyez-moi un lien de paiement CB sécurisé, merci.")}" target="_blank" rel="noopener">Demander le lien</a>
          </article>

          <article class="pay-card">
            <div class="pay-ico" aria-hidden="true">🏦</div>
            <h4>Virement SEPA</h4>
            <p><strong>IBAN :</strong> <span class="mono">${IBAN}</span><br><strong>BIC :</strong> <span class="mono">${BIC}</span></p>
            <div class="row">
              <button class="btn outline" data-copy="${IBAN}">Copier l’IBAN</button>
              <button class="btn outline" data-copy="${BIC}">Copier le BIC</button>
            </div>
          </article>

          <article class="pay-card">
            <div class="pay-ico" aria-hidden="true">💶</div>
            <h4>Espèces / Contre-remboursement</h4>
            <p>Disponible selon zone et montant.</p>
            <a class="btn" href="${waLink("Bonjour, puis-je payer en espèces / à la livraison ?")}" target="_blank" rel="noopener">Vérifier ma zone</a>
          </article>

          <article class="pay-card">
            <div class="pay-ico" aria-hidden="true">🟢</div>
            <h4>WhatsApp Pay / Lien</h4>
            <p>Paiement par lien envoyé sur WhatsApp.</p>
            <a class="btn" href="${waLink("Bonjour, je souhaite payer via WhatsApp / lien sécurisé.")}" target="_blank" rel="noopener">Ouvrir WhatsApp</a>
          </article>
        </div>
        <p class="note">Certaines méthodes varient selon votre territoire. Contact direct : <a href="${phoneLink}">${STORE_PHONE_DISPLAY}</a></p>
      </div>
    `;
  }

  async function renderAbout() {
    const content = `
      <section class="section about">
        <h2>À propos de ${APP_NAME}</h2>
        <p>Distribution d’outils électroportatifs pro (DeWALT XR 12V / 18V). Service rapide, conseils, et packs avantageux.</p>
        <p><strong>Contact :</strong> <a href="${phoneLink}">${STORE_PHONE_DISPLAY}</a> · <a href="${waLink()}" target="_blank" rel="noopener">WhatsApp</a></p>
      </section>
      <section class="section">${paymentsHTML()}</section>
    `;
    mount(pageShell(content, { title: "À propos & Paiements" }), "À propos");
  }

  function renderNotFound() {
    const content = `
      <section class="section">
        <h2>Page introuvable</h2>
        <p>La page demandée n’existe pas.</p>
        <p><a class="btn" href="#/">Retour à l’accueil</a></p>
      </section>
    `;
    mount(pageShell(content, { title: "404" }), "404");
  }

  /* ---------- MOUNT & ROUTER ---------- */
  function mount(html, title = APP_NAME) {
    const app = qs("#app");
    if (app) app.innerHTML = html;
    document.title = `${title} · ${APP_NAME}`;
    window.scrollTo({ top: 0, behavior: "instant" });
    highlightNav();
    bindGlobalDelegates(); // une seule fois
  }
  function highlightNav() {
    const h = location.hash || "#/";
    qsa("nav.nav a").forEach((a) => {
      const href = a.getAttribute("href");
      a.classList.toggle("active", h.startsWith(href));
    });
  }

  async function router() {
    const hash = location.hash || "#/";
    const [path, ...rest] = hash.replace(/^#/, "").split("?")[0].split("/").filter(Boolean);
    if (!state.ready) await loadProducts();

    if (!path) return renderHome();
    if (path === "catalog") return renderCatalog();
    if (path === "product") return rest[0] ? renderProduct(rest[0]) : renderNotFound();
    if (path === "account") return renderAccount();
    if (path === "about") return renderAbout();
    return renderNotFound();
  }

  /* ---------- GLOBAL DELEGATION (fluidité) ---------- */
  function bindGlobalDelegates() {
    if (bindGlobalDelegates.bound) return;
    bindGlobalDelegates.bound = true;

    document.addEventListener(
      "click",
      (e) => {
        // liens SPA
        const a = e.target.closest("a[data-link]");
        if (a) {
          e.preventDefault();
          routerPush(a.getAttribute("href"));
          return;
        }

        // bulle de marque
        const bb = e.target.closest(".brand-bubble");
        if (bb) {
          e.preventDefault();
          gotoCatalog({ brand: bb.dataset.brand, q: "", category: "", platform: "" });
          return;
        }

        // chips de filtre (catégorie / plateforme / tag -> redirige sur catalogue)
        const chipBtn = e.target.closest('.chip[data-filter-key]');
        if (chipBtn) {
          e.preventDefault();
          const key = chipBtn.getAttribute("data-filter-key");
          const val = chipBtn.getAttribute("data-filter-val");
          if (key === "pf") gotoCatalog({ platform: val });
          else if (key === "cat") gotoCatalog({ category: val });
          else if (key === "tag") gotoCatalog({ q: val });
          return;
        }

        // favoris (n’importe quelle page)
        const favBtn = e.target.closest(".fav-btn");
        if (favBtn) {
          e.preventDefault();
          const id = favBtn.getAttribute("data-fav");
          const on = toggleFavorite(id);
          favBtn.setAttribute("aria-pressed", on ? "true" : "false");
          favBtn.textContent = on ? "★ Favori" : "☆ Favori";
          return;
        }

        // copier (paiements)
        const copyBtn = e.target.closest("[data-copy]");
        if (copyBtn) {
          e.preventDefault();
          copyToClipboard(copyBtn.getAttribute("data-copy"));
          return;
        }
      },
      { passive: true }
    );
  }

  /* ---------- SW ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  /* ---------- BOOT ---------- */
  window.addEventListener("hashchange", router);
  router();
})();