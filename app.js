/* =========================================================
   Pirates Tools — app.js (SPA hash routing)
   Pages: Home, Catalog, Product, Account, About/Payments
   Data: products.json (même structure que fourni)
   ========================================================= */

(() => {
  "use strict";

  /* ---------- CONFIG ---------- */
  const APP_NAME = "Pirates Tools";
  const STORE_PHONE_DISPLAY = "07 74 23 01 95";
  const STORE_PHONE_E164 = "+33774230195"; // pour tel: & WhatsApp
  const STORE_WHATS_DEFAULT =
    "Bonjour Pirates Tools, j’ai une question à propos d’un produit.";
  const DATA_URL = "products.json";
  const LS_KEYS = {
    FAVORITES: "pt_favorites",
    ACCOUNT: "pt_account",
    CART: "pt_cart" // (placeholder si tu veux l’activer plus tard)
  };
  const PLACEHOLDER_IMG =
    "images/placeholder.png"; // mets une image ici; sinon JS gardera l'attribut vide

  /* ---------- HELPERS ---------- */
  const qs = (sel, el = document) => el.querySelector(sel);
  const qsa = (sel, el = document) => [...el.querySelectorAll(sel)];
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const fmtPrice = (n, currency = "EUR", locale = "fr-FR") => {
    if (typeof n !== "number") return "";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2
    }).format(n);
  };

  const encode = encodeURIComponent;

  const phoneLink = `tel:${STORE_PHONE_E164}`;
  const smsLink = `sms:${STORE_PHONE_E164}`;
  const waLink = (text = STORE_WHATS_DEFAULT) =>
    `https://wa.me/${STORE_PHONE_E164.replace("+", "")}?text=${encode(text)}`;

  const readLS = (key, fallback) => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  };
  const writeLS = (key, val) => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  };

  const getFavorites = () => new Set(readLS(LS_KEYS.FAVORITES, []));
  const toggleFavorite = (id) => {
    const favs = getFavorites();
    favs.has(id) ? favs.delete(id) : favs.add(id);
    writeLS(LS_KEYS.FAVORITES, [...favs]);
    return favs.has(id);
  };

  const starSVG = (fill = true) =>
    `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" class="star">
       <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.402 8.168L12 18.896l-7.336 3.869 1.402-8.168L.132 9.21l8.2-1.192z" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor"'} />
     </svg>`;

  const ratingStars = (rating = 0) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return (
      "<span class='stars'>" +
      "★".repeat(full) +
      (half ? "☆" : "") +
      "</span>"
    );
  };

  const imgTag = (src, alt = "", cls = "") =>
    `<img loading="lazy" src="${src || PLACEHOLDER_IMG}" alt="${alt || ""}" class="${cls}">`;

  const badge = (text, cls = "") =>
    text ? `<span class="badge ${cls}">${text}</span>` : "";

  const chip = (text) => `<span class="chip">${text}</span>`;

  const routerPush = (hash) => {
    if (location.hash !== hash) location.hash = hash;
    else window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

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
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const data = await resp.json();
      state.products = Array.isArray(data) ? data : [];
      state.productsBySlug.clear();
      state.productsById.clear();
      for (const p of state.products) {
        if (p.slug) state.productsBySlug.set(p.slug, p);
        if (p.id) state.productsById.set(p.id, p);
      }
      state.ready = true;
      return state.products;
    } catch (err) {
      console.error("Erreur de chargement products.json :", err);
      state.ready = true;
      state.products = [];
      return [];
    }
  }

  /* ---------- LAYOUT (header/footer/nav) ---------- */
  function topBar() {
    return `
      <div class="topbar">
        <a class="brand" href="#/">
          <img src="images/logo.png" alt="Logo" class="logo" onerror="this.style.display='none'">
          <span>${APP_NAME}</span>
        </a>
        <div class="contact-actions">
          <a class="btn icon" href="${phoneLink}" aria-label="Appeler"><span>📞</span></a>
          <a class="btn icon" href="${smsLink}" aria-label="SMS"><span>💬</span></a>
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
          <p><a href="${waLink()}" target="_blank" rel="noopener">WhatsApp</a></p>
          <p><a href="${smsLink}">SMS</a></p>
        </div>
        <div class="footer-col">
          <h4>Liens</h4>
          <p><a href="#/catalog">Catalogue</a></p>
          <p><a href="#/account">Espace compte</a></p>
          <p><a href="#/about">À propos</a></p>
        </div>
        <div class="footer-col">
          <h4>Mentions</h4>
          <p>© ${new Date().getFullYear()} ${APP_NAME}. Tous droits réservés.</p>
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

  /* ---------- UI BUILDERS ---------- */

  function productCard(p) {
    const discount =
      typeof p.price === "number" &&
      typeof p.price_old === "number" &&
      p.price_old > p.price
        ? Math.round(100 - (p.price / p.price_old) * 100)
        : p.discount_percent || null;

    const favs = getFavorites();
    const isFav = favs.has(p.id);

    return `
      <article class="card product-card" data-id="${p.id}">
        <a class="thumb" href="#/product/${p.slug}" aria-label="${p.title}">
          ${imgTag(p.img, p.images_alt || p.title)}
          ${p.badge ? badge(p.badge) : ""}
          ${discount ? badge(`-${discount}%`, "discount") : ""}
        </a>
        <div class="card-body">
          <h3 class="product-title">
            <a href="#/product/${p.slug}">${p.title}</a>
          </h3>
          <div class="meta">
            <span class="brand">${p.brand || ""}</span>
            ${p.tag ? chip(p.tag) : ""}
          </div>
          <div class="price-line">
            <span class="price">${fmtPrice(p.price, p.currency || "EUR")}</span>
            ${
              p.price_old
                ? `<span class="price-old">${fmtPrice(
                    p.price_old,
                    p.currency || "EUR"
                  )}</span>`
                : ""
            }
          </div>
          <div class="rating">${p.rating ? ratingStars(p.rating) + ` <small>${p.reviews || 0} avis</small>` : ""}</div>
          <div class="stock ${p.stock_status || ""}">${p.stock_label || ""}</div>
          <div class="actions">
            <button class="btn outline fav-btn" data-fav="${p.id}" aria-pressed="${isFav}">
              ${isFav ? "★ Favori" : "☆ Favori"}
            </button>
            <a class="btn primary" href="#/product/${p.slug}">Voir</a>
          </div>
        </div>
      </article>
    `;
  }

  function productGrid(list) {
    if (!list?.length)
      return `<p class="empty">Aucun produit ne correspond à votre recherche.</p>`;
    return `<section class="grid">${list.map(productCard).join("")}</section>`;
  }

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
    // sélections
    const top = products.filter((p) => p.badge === "Top" || p.badge === "Pack").slice(0, 6);
    const promo = products
      .filter((p) => (p.discount_percent || 0) >= 10 || (p.price_old && p.price_old > p.price))
      .slice(0, 6);
    const compact = products.filter((p) => /compact/i.test(p.badge || "") || /Ultra-compact/.test(p.desc || "")).slice(0, 6);

    const content = `
      ${hero()}
      <section class="section">
        <h2>En vedette</h2>
        ${productGrid(top)}
      </section>
      <section class="section">
        <h2>Promos</h2>
        ${productGrid(promo)}
      </section>
      <section class="section">
        <h2>Ultra-compacts</h2>
        ${productGrid(compact)}
      </section>
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
    const base = "#/catalog";
    const query = params.toString();
    routerPush(query ? `${base}?${query}` : base);
  }

  async function renderCatalog() {
    const products = await loadProducts();
    const params = readSearchParams();

    // options filtres
    const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))].sort();
    const cats = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
    const platforms = [...new Set(products.map((p) => p.platform).filter(Boolean))].sort();

    // filtrage
    let list = products.slice();
    if (params.q) {
      const q = params.q.toLowerCase();
      list = list.filter((p) =>
        [p.title, p.desc, p.description, p.sku, p.tags?.join(" ")].join(" ").toLowerCase().includes(q)
      );
    }
    if (params.brand) list = list.filter((p) => p.brand === params.brand);
    if (params.category) list = list.filter((p) => p.category === params.category);
    if (params.platform) list = list.filter((p) => p.platform === params.platform);

    // tri
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
        <select name="brand">
          <option value="">Marque</option>
          ${brands.map((b) => `<option ${b === params.brand ? "selected" : ""}>${b}</option>`).join("")}
        </select>
        <select name="category">
          <option value="">Catégorie</option>
          ${cats.map((c) => `<option ${c === params.category ? "selected" : ""}>${c}</option>`).join("")}
        </select>
        <select name="pf">
          <option value="">Plateforme</option>
          ${platforms.map((p) => `<option value="${p}" ${p === params.platform ? "selected" : ""}>${p}</option>`).join("")}
        </select>
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

    // events filtres
    const form = qs("#filters");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      writeSearchParams({
        q: fd.get("q") || "",
        brand: fd.get("brand") || "",
        category: fd.get("category") || "",
        platform: fd.get("pf") || "",
        sort: fd.get("sort") || "popular"
      });
    });
    qs("#resetFilters")?.addEventListener("click", () => writeSearchParams({}));

    // favoris (délégation)
    qs(".main")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".fav-btn");
      if (!btn) return;
      const id = btn.getAttribute("data-fav");
      const on = toggleFavorite(id);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = on ? "★ Favori" : "☆ Favori";
    });
  }

  function galleryHTML(p) {
    const imgs = [p.img, ...(Array.isArray(p.gallery) ? p.gallery : [])].filter(Boolean);
    if (!imgs.length)
      return `<div class="gallery">${imgTag(p.img, p.images_alt || p.title, "main")}</div>`;
    return `
      <div class="gallery">
        <div class="gallery-main">
          ${imgTag(imgs[0], p.images_alt || p.title, "main")}
        </div>
        <div class="thumbs">
          ${imgs
            .map(
              (u, i) =>
                `<button class="thumb-btn ${i === 0 ? "active" : ""}" data-src="${u}">${imgTag(
                  u,
                  p.title
                )}</button>`
            )
            .join("")}
        </div>
      </div>
    `;
  }

  async function renderProduct(slug) {
    const products = await loadProducts();
    const p = state.productsBySlug.get(slug);
    if (!p) return renderNotFound();

    const discount =
      typeof p.price === "number" &&
      typeof p.price_old === "number" &&
      p.price_old > p.price
        ? Math.round(100 - (p.price / p.price_old) * 100)
        : p.discount_percent || null;

    const favs = getFavorites();
    const isFav = favs.has(p.id);

    const details = `
      <section class="product">
        <div class="product-media">
          ${galleryHTML(p)}
        </div>
        <div class="product-info">
          <h2>${p.title}</h2>
          <div class="meta-line">
            <span class="brand">${p.brand || ""}</span>
            ${p.tag ? chip(p.tag) : ""}
            ${p.badge ? badge(p.badge) : ""}
          </div>
          <div class="price-block">
            <span class="price">${fmtPrice(p.price, p.currency || "EUR")}</span>
            ${
              p.price_old
                ? `<span class="price-old">${fmtPrice(
                    p.price_old,
                    p.currency || "EUR"
                  )}</span>`
                : ""
            }
            ${discount ? `<span class="discount">-${discount}%</span>` : ""}
          </div>
          <div class="stock ${p.stock_status || ""}">${p.stock_label || ""}</div>
          <p class="desc">${p.description || p.desc || ""}</p>

          ${
            p.features?.length
              ? `<ul class="features">${p.features.map((f) => `<li>${f}</li>`).join("")}</ul>`
              : ""
          }

          ${
            p.specs_kv
              ? `<table class="specs">
                  <tbody>
                    ${Object.entries(p.specs_kv)
                      .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`)
                      .join("")}
                  </tbody>
                 </table>`
              : ""
          }

          <div class="actions">
            <button class="btn outline fav-btn" data-fav="${p.id}" aria-pressed="${isFav}">
              ${isFav ? "★ Favori" : "☆ Favori"}
            </button>

            <a class="btn" href="${phoneLink}">Appeler</a>
            <a class="btn" href="${smsLink}">SMS</a>
            <a class="btn primary" href="${waLink(p.whatsapp_template || `Bonjour, je souhaite un devis pour ${p.title} (${p.sku || ""}).`)}" target="_blank" rel="noopener">
              Demander un devis
            </a>
            <button class="btn" id="shareBtn">Partager</button>
          </div>

          <div class="mini-badges">
            ${p.tags?.map(chip).join("") || ""}
          </div>

          <div class="backlinks">
            <a href="#/catalog">← Retour au catalogue</a>
          </div>
        </div>
      </section>
    `;

    // produits liés
    const related =
      (p.related_ids || [])
        .map((id) => state.productsById.get(id))
        .filter(Boolean)
        .slice(0, 6) || [];
    const relatedHTML = related.length
      ? `<section class="section">
           <h3>Produits liés</h3>
           ${productGrid(related)}
         </section>`
      : "";

    const content = `${details}${relatedHTML}`;
    mount(pageShell(content, { title: "Fiche produit" }), p.title);

    // galerie miniature
    const mainImg = qs(".gallery-main img");
    qsa(".thumb-btn").forEach((b) =>
      b.addEventListener("click", (e) => {
        qsa(".thumb-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        const src = b.getAttribute("data-src");
        if (src && mainImg) mainImg.src = src;
      })
    );

    // fav & share
    qs(".main")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".fav-btn");
      if (btn) {
        const id = btn.getAttribute("data-fav");
        const on = toggleFavorite(id);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.textContent = on ? "★ Favori" : "☆ Favori";
      }
    });

    qs("#shareBtn")?.addEventListener("click", async () => {
      const url = location.href;
      try {
        if (navigator.share) {
          await navigator.share({ title: p.title, text: p.desc || "", url });
        } else {
          await navigator.clipboard.writeText(url);
          alert("Lien copié !");
        }
      } catch {}
    });
  }

  function accountFormHTML() {
    const acc = readLS(LS_KEYS.ACCOUNT, { name: "", email: "" });
    return `
      <form id="accountForm" class="account-form">
        <label>Nom / Pseudo
          <input name="name" value="${acc.name || ""}" placeholder="Votre nom">
        </label>
        <label>Email
          <input type="email" name="email" value="${acc.email || ""}" placeholder="vous@exemple.com">
        </label>
        <button class="btn primary" type="submit">Enregistrer</button>
        <button class="btn outline" type="button" id="logoutBtn">Se déconnecter</button>
      </form>
    `;
  }

  async function renderAccount() {
    const favs = getFavorites();
    const favList = [...favs]
      .map((id) => state.productsById.get(id))
      .filter(Boolean);

    const content = `
      <section class="section">
        <h2>Mon compte</h2>
        ${accountFormHTML()}
      </section>

      <section class="section">
        <h3>Mes favoris</h3>
        ${productGrid(favList)}
      </section>
    `;

    mount(pageShell(content, { title: "Espace compte" }), "Espace compte");

    qs("#accountForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const data = { name: (fd.get("name") || "").toString().trim(), email: (fd.get("email") || "").toString().trim() };
      writeLS(LS_KEYS.ACCOUNT, data);
      alert("Profil enregistré !");
    });
    qs("#logoutBtn")?.addEventListener("click", () => {
      localStorage.removeItem(LS_KEYS.ACCOUNT);
      alert("Déconnecté. Les favoris restent enregistrés sur cet appareil.");
      routerPush("#/account");
    });

    // délégation fav dans la grille
    qs(".main")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".fav-btn");
      if (!btn) return;
      const id = btn.getAttribute("data-fav");
      const on = toggleFavorite(id);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = on ? "★ Favori" : "☆ Favori";
    });
  }

  function paymentsHTML() {
    return `
      <div class="payments">
        <h3>Moyens de paiement acceptés</h3>
        <ul class="ticks">
          <li>💳 Carte bancaire (Visa / Mastercard)</li>
          <li>🏦 Virement bancaire (SEPA)</li>
          <li>💶 Espèces (retrait en point relais / selon disponibilité)</li>
          <li>📦 Paiement à la livraison (selon zone)</li>
          <li>🟢 <a href="${waLink("Bonjour, je souhaite payer par WhatsApp Pay / lien de paiement.")}" target="_blank" rel="noopener">Lien de paiement sécurisé</a> sur demande</li>
        </ul>
        <p class="note">Certaines méthodes peuvent dépendre de votre zone de livraison et du montant de commande.</p>
      </div>
    `;
  }

  async function renderAbout() {
    const content = `
      <section class="section about">
        <h2>À propos de ${APP_NAME}</h2>
        <p>Distribution d’outils électroportatifs pro (DeWALT XR 12V / 18V). Service rapide, conseils, et packs avantageux.</p>
        <p><strong>Contact direct :</strong> <a href="${phoneLink}">${STORE_PHONE_DISPLAY}</a> · <a href="${waLink()}" target="_blank" rel="noopener">WhatsApp</a></p>
      </section>
      <section class="section">${paymentsHTML()}</section>
      <section class="section">
        <h3>Informations légales</h3>
        <ul class="ticks">
          <li>Garantie constructeur : 24 mois (sauf mention contraire sur la fiche produit)</li>
          <li>Retours sous 14 jours (état neuf / complet)</li>
          <li>Facturation EU (TVA selon statut / territoire)</li>
        </ul>
      </section>
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
    window.scrollTo({ top: 0, behavior: "smooth" });
    highlightNav();
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
    // routes: "#/", "#/catalog", "#/product/<slug>", "#/account", "#/about"
    const [path, ...rest] = hash.replace(/^#/, "").split("?")[0].split("/").filter(Boolean);

    // Ensure products loaded for routes that need data
    if (!state.ready) await loadProducts();

    if (!path) return renderHome();

    if (path === "catalog") return renderCatalog();

    if (path === "product") {
      const slug = rest[0];
      if (slug) return renderProduct(slug);
      return renderNotFound();
    }

    if (path === "account") return renderAccount();

    if (path === "about") return renderAbout();

    return renderNotFound();
  }

  /* ---------- EVENTS ---------- */
  window.addEventListener("hashchange", router);
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-link]");
    if (a) {
      e.preventDefault();
      routerPush(a.getAttribute("href"));
    }
  });

  /* ---------- SW REGISTER ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("sw.js")
        .catch((err) => console.warn("SW register failed", err));
    });
  }

  /* ---------- BOOT ---------- */
  router();
})();