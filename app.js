/**

- Pirates Tools PWA - Application principale optimisée
- Version: 2.0
- Compatible avec HTML/CSS existant
  */

(function() {
‘use strict’;

// ===========================================
// 1. CONSTANTS & CONFIG
// ===========================================

const CONFIG = {
API_BASE: window.location.origin + window.location.pathname.replace(//$/, ‘’),
PRODUCTS_URL: ‘data/products.json’,
CACHE_VERSION: window.__ASSET_VER || ‘35’,
DEBOUNCE_DELAY: 300,
ANIMATION_DURATION: 300,
WA_NUMBER: ‘33774230195’,
PHONE_NUMBER: ‘+33774230195’
};

const ROUTES = {
HOME: ‘/’,
CATALOGUE: ‘/catalogue’,
PRODUIT: ‘/produit’,
DEVIS: ‘/devis’,
COMPTE: ‘/compte’,
AUTH: ‘/auth’
};

const STORAGE_KEYS = {
CART: ‘pt_cart’,
USER: ‘pt_user’,
AUTH: ‘pt_auth’,
PRODUCTS_CACHE: ‘pt_products_cache’,
SETTINGS: ‘pt_settings’
};

// ===========================================
// 2. STATE MANAGEMENT
// ===========================================

// Initialisation immédiate du State
window.State = window.State || {
currentRoute: ‘/’,
user: null,
isAuthenticated: false,
products: [],
filteredProducts: [],
cart: [],
currentProduct: null,
searchQuery: ‘’,
selectedTag: ‘’,
isLoading: false,
heroState: ‘active’ // active, transitioning, hidden
};

const State = window.State;

// Ajouter les méthodes au State existant
Object.assign(State, {

// Ajouter les méthodes au State existant
Object.assign(State, {
// Getters
get cartCount() {
return this.cart.reduce((sum, item) => sum + item.quantity, 0);
},

```
get cartTotal() {
  return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
},

// Mutations
setRoute(route) {
  this.currentRoute = route;
  console.log('Route changed to:', route); // Debug
  this.notifyStateChange('route', route);
},

setUser(user) {
  this.user = user;
  this.isAuthenticated = !!user;
  this.notifyStateChange('user', user);
},

setProducts(products) {
  this.products = products;
  this.filteredProducts = products;
  this.notifyStateChange('products', products);
},

setCart(cart) {
  console.log('Setting cart to:', cart); // Debug
  this.cart = cart;
  this.saveCartToStorage();
  this.notifyStateChange('cart', cart);
},

// Observers
observers: new Map(),

subscribe(event, callback) {
  if (!this.observers.has(event)) {
    this.observers.set(event, new Set());
  }
  this.observers.get(event).add(callback);
  
  // Retourner fonction de désabonnement
  return () => {
    this.observers.get(event)?.delete(callback);
  };
},

notifyStateChange(event, data) {
  this.observers.get(event)?.forEach(callback => {
    try {
      callback(data);
    } catch (error) {
      console.error('State observer error:', error);
    }
  });
},

// Persistence
saveCartToStorage() {
  try {
    // Utiliser la même clé que votre système existant pour compatibilité
    const cartData = {
      version: CONFIG.CACHE_VERSION,
      timestamp: Date.now(),
      items: this.cart
    };
    
    // Sauvegarder avec les deux clés pour compatibilité
    localStorage.setItem('cart', JSON.stringify(this.cart)); // Clé simple pour compatibilité HTML
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cartData)); // Clé avec version
    
    console.log('Cart saved to storage with keys: cart, pt_cart'); // Debug
    console.log('Saved cart data:', this.cart); // Debug
  } catch (error) {
    console.error('Failed to save cart:', error);
  }
},

loadCartFromStorage() {
  try {
    // Essayer d'abord la nouvelle clé, puis l'ancienne pour compatibilité
    let cartData = null;
    
    const newFormat = localStorage.getItem(STORAGE_KEYS.CART);
    if (newFormat) {
      const parsed = JSON.parse(newFormat);
      if (Array.isArray(parsed)) {
        cartData = parsed; // Ancien format
      } else if (parsed.items) {
        cartData = parsed.items; // Nouveau format
      }
    }
    
    // Fallback sur l'ancienne clé
    if (!cartData) {
      const oldFormat = localStorage.getItem('cart');
      if (oldFormat) {
        cartData = JSON.parse(oldFormat);
      }
    }
    
    this.cart = cartData || [];
    console.log('Cart loaded from storage:', this.cart); // Debug
    console.log('Cart items count:', this.cart.length); // Debug
  } catch (error) {
    console.error('Failed to load cart:', error);
    this.cart = [];
  }
}
```

}); // Fermeture de Object.assign

// ===========================================
// 3. ROUTER SYSTEM
// ===========================================

const Router = {
init() {
console.log(‘Router init…’);

```
  // Éviter conflit avec router HTML existant
  if (window.__ptRouterActive) {
    console.log('Router deja actif, utilisation du systeme existant');
    return;
  }
  
  // Vérifier si des fonctions de routage existent déjà
  if (window.syncViews || window.matchRoute) {
    console.log('Router HTML detecte, integration...');
    // S'intégrer avec le router existant
    this.integrateWithExistingRouter();
    return;
  }
  
  console.log('Initializing new router...');
  window.addEventListener('hashchange', this.handleHashChange.bind(this));
  window.addEventListener('popstate', this.handlePopState.bind(this));
  
  // Route initiale
  this.navigateToCurrentHash();
  window.__ptRouterActive = true;
},

integrateWithExistingRouter() {
  console.log('Integrating with existing HTML router...');
  
  // Observer les changements de route via le système existant
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1) || '/';
    console.log('Route changed via existing router:', hash);
    State.setRoute(hash);
    
    // Actions spécifiques
    if (hash === '/devis') {
      setTimeout(() => {
        console.log('Cart update triggered by route change');
        CartManager.updateCartUI();
      }, 100);
    }
  });
  
  // Trigger initial
  const currentHash = window.location.hash.slice(1) || '/';
  State.setRoute(currentHash);
},

handleHashChange() {
  this.navigateToCurrentHash();
},

handlePopState() {
  this.navigateToCurrentHash();
},

navigateToCurrentHash() {
  const hash = window.location.hash.slice(1) || '/';
  const [path, ...params] = hash.split('/');
  
  let route = '/';
  if (path) route = '/' + path;
  
  // Routes avec paramètres
  if (route === '/produit' && params.length > 0) {
    this.navigateToProduct(params[0]);
    return;
  }
  
  this.navigateTo(route);
},

navigateTo(route) {
  // Protection auth si nécessaire
  if (this.requiresAuth(route) && !State.isAuthenticated) {
    this.redirectToAuth();
    return;
  }
  
  State.setRoute(route);
  this.updateViews(route);
  this.updateBodyClass(route);
  this.updateHeroState(route);
  
  // Actions spécifiques par route
  if (route === ROUTES.DEVIS) {
    // Forcer la mise à jour du panier
    setTimeout(() => {
      CartManager.updateCartUI();
    }, 100);
  }
  
  // Fermer le menu si ouvert
  if (UI.Menu.isOpen()) {
    UI.Menu.close();
  }
},

navigateToProduct(slug) {
  const product = ProductManager.findBySlug(slug);
  if (!product) {
    this.navigateTo(ROUTES.CATALOGUE);
    UI.showToast('Produit non trouvé', 'error');
    return;
  }
  
  State.currentProduct = product;
  State.setRoute(ROUTES.PRODUIT);
  this.updateViews(ROUTES.PRODUIT);
  this.updateBodyClass('produit');
  this.updateHeroState(ROUTES.PRODUIT);
  
  // Rendre la fiche produit
  PDP.render(product);
},

updateViews(route) {
  const views = document.querySelectorAll('.view');
  views.forEach(view => {
    const viewRoute = view.dataset.route;
    if (viewRoute === route) {
      view.classList.remove('hidden');
      console.log('Showing view:', route); // Debug
      
      // Si c'est la vue panier, forcer la mise à jour
      if (route === ROUTES.DEVIS) {
        console.log('Devis view shown, forcing cart update...'); // Debug
        setTimeout(() => {
          CartManager.updateCartUI();
        }, 50); // Délai court pour s'assurer que la vue est visible
      }
      
      // Focus pour a11y
      const h1 = view.querySelector('h1');
      if (h1) h1.focus();
    } else {
      view.classList.add('hidden');
    }
  });
},

updateBodyClass(route) {
  document.body.className = document.body.className
    .replace(/page-\w+/g, '')
    .trim();
  
  const pageClass = 'page-' + route.slice(1) || 'home';
  document.body.classList.add(pageClass);
},

updateHeroState(route) {
  const hero = document.getElementById('hero');
  const isHomePage = route === ROUTES.HOME;
  
  if (isHomePage) {
    State.heroState = 'active';
    hero?.classList.remove('hero-out');
    document.body.classList.remove('after-hero');
  } else {
    State.heroState = 'hidden';
    hero?.classList.add('hero-out');
    document.body.classList.add('after-hero');
  }
  
  Animation.updateHeroLogo();
},

requiresAuth(route) {
  return route === ROUTES.COMPTE;
},

redirectToAuth() {
  window.location.hash = '#/auth';
}
```

};

// ===========================================
// 4. PRODUCT MANAGEMENT
// ===========================================

const ProductManager = {
async init() {
await this.loadProducts();
this.bindSearchEvents();
},

```
async loadProducts() {
  try {
    // Vérifier cache
    const cached = this.getCachedProducts();
    if (cached && cached.version === CONFIG.CACHE_VERSION) {
      State.setProducts(cached.products);
      console.log('Produits chargés depuis le cache');
      return;
    }
    
    // Charger depuis le serveur
    State.isLoading = true;
    const response = await fetch(`${CONFIG.PRODUCTS_URL}?v=${CONFIG.CACHE_VERSION}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const products = await response.json();
    
    // Enrichir les produits
    const enrichedProducts = products.map(product => ({
      ...product,
      slug: this.createSlug(product.title),
      searchText: this.createSearchText(product)
    }));
    
    State.setProducts(enrichedProducts);
    this.cacheProducts(enrichedProducts);
    
    console.log(`${enrichedProducts.length} produits chargés`);
    
  } catch (error) {
    console.error('Erreur chargement produits:', error);
    UI.showToast('Erreur de chargement des produits', 'error');
    // Fallback sur cache même si obsolète
    const cached = this.getCachedProducts();
    if (cached) {
      State.setProducts(cached.products);
    }
  } finally {
    State.isLoading = false;
  }
},

bindSearchEvents() {
  const searchInput = document.getElementById('q');
  const tagSelect = document.getElementById('tag');
  
  if (searchInput) {
    searchInput.addEventListener('input', 
      Utils.debounce((e) => this.handleSearch(e.target.value), CONFIG.DEBOUNCE_DELAY)
    );
  }
  
  if (tagSelect) {
    tagSelect.addEventListener('change', (e) => this.handleTagFilter(e.target.value));
    this.populateTagOptions();
  }
},

handleSearch(query) {
  State.searchQuery = query.toLowerCase().trim();
  this.filterProducts();
},

handleTagFilter(tag) {
  State.selectedTag = tag;
  this.filterProducts();
},

filterProducts() {
  let filtered = State.products;
  
  // Filtrage par recherche
  if (State.searchQuery) {
    filtered = filtered.filter(product => 
      product.searchText.includes(State.searchQuery)
    );
  }
  
  // Filtrage par tag
  if (State.selectedTag) {
    filtered = filtered.filter(product => 
      product.tag === State.selectedTag
    );
  }
  
  State.filteredProducts = filtered;
  this.renderProductList();
},

renderProductList() {
  const container = document.getElementById('list');
  if (!container) return;
  
  if (State.filteredProducts.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucun produit trouvé</p>';
    return;
  }
  
  container.innerHTML = State.filteredProducts.map(product => `
    <article class="card" data-key="${product.slug}">
      <div class="head">
        <h3 class="title">${Utils.escapeHtml(product.title)}</h3>
        ${product.tag ? `<span class="chip">${Utils.escapeHtml(product.tag)}</span>` : ''}
      </div>
      ${product.image ? `<img src="${product.image}" alt="${Utils.escapeHtml(product.title)}" loading="lazy">` : ''}
      ${product.description ? `<p class="desc">${Utils.escapeHtml(product.description)}</p>` : ''}
      <div class="actions">
        <a class="btn primary" href="#/produit/${product.slug}">Voir détails</a>
        <button class="btn" onclick="CartManager.addToCart('${product.slug}')">Ajouter</button>
      </div>
    </article>
  `).join('');
},

populateTagOptions() {
  const tagSelect = document.getElementById('tag');
  if (!tagSelect) return;
  
  const tags = [...new Set(State.products.map(p => p.tag).filter(Boolean))];
  
  tagSelect.innerHTML = '<option value="">Tous</option>' + 
    tags.map(tag => `<option value="${tag}">${Utils.escapeHtml(tag)}</option>`).join('');
},

findBySlug(slug) {
  return State.products.find(p => p.slug === slug);
},

createSlug(title) {
  if (!title) return 'unknown';
  
  return String(title)
    .toLowerCase()
    .trim()
    // Remplacer les caractères spéciaux
    .replace(/[\u00C0-\u00C5]/g, 'a')
    .replace(/[\u00C6]/g, 'ae')
    .replace(/[\u00C7]/g, 'c')
    .replace(/[\u00C8-\u00CB]/g, 'e')
    .replace(/[\u00CC-\u00CF]/g, 'i')
    .replace(/[\u00D1]/g, 'n')
    .replace(/[\u00D2-\u00D6]/g, 'o')
    .replace(/[\u00D9-\u00DC]/g, 'u')
    .replace(/[\u00DD]/g, 'y')
    // Minuscules
    .replace(/[\u00E0-\u00E5]/g, 'a')
    .replace(/[\u00E6]/g, 'ae')
    .replace(/[\u00E7]/g, 'c')
    .replace(/[\u00E8-\u00EB]/g, 'e')
    .replace(/[\u00EC-\u00EF]/g, 'i')
    .replace(/[\u00F1]/g, 'n')
    .replace(/[\u00F2-\u00F6]/g, 'o')
    .replace(/[\u00F9-\u00FC]/g, 'u')
    .replace(/[\u00FD\u00FF]/g, 'y')
    // Autres caractères spéciaux
    .replace(/[\u2013\u2014]/g, '-') // em/en dash
    .replace(/[^\w\s-]/g, '') // Garder seulement mots, espaces, tirets
    .replace(/[\s_-]+/g, '-') // Espaces et underscores vers tirets
    .replace(/^-+|-+$/g, ''); // Supprimer tirets en début/fin
},

createSearchText(product) {
  const fields = [
    product.title,
    product.description,
    product.tag,
    product.brand,
    ...(product.specifications || [])
  ].filter(Boolean);
  
  return fields
    .join(' ')
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
},

getCachedProducts() {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.PRODUCTS_CACHE);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
},

cacheProducts(products) {
  try {
    const cacheData = {
      version: CONFIG.CACHE_VERSION,
      timestamp: Date.now(),
      products: products
    };
    localStorage.setItem(STORAGE_KEYS.PRODUCTS_CACHE, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Cache write error:', error);
  }
}
```

};

// ===========================================
// 5. CART SYSTEM
// ===========================================

const CartManager = {
init() {
console.log(‘CartManager init…’); // Debug
State.loadCartFromStorage();
console.log(‘Initial cart state:’, State.cart); // Debug
this.bindCartEvents();
this.updateCartUI();

```
  // Observer les changements de panier
  State.subscribe('cart', () => {
    console.log('Cart state changed, updating UI...'); // Debug
    this.updateCartUI();
  });
},

bindCartEvents() {
  console.log('Binding cart events...'); // Debug
  
  // Boutons dock - forcer la navigation correcte
  const cartBtn = document.getElementById('dockCartBtn');
  if (cartBtn) {
    // Supprimer les anciens listeners
    const newCartBtn = cartBtn.cloneNode(true);
    cartBtn.parentNode.replaceChild(newCartBtn, cartBtn);
    
    // Ajouter le nouveau listener
    document.getElementById('dockCartBtn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Dock cart button clicked, navigating to cart...'); // Debug
      console.log('Current cart state:', State.cart); // Debug
      window.location.hash = '#/devis';
    });
  }
  
  // Actions devis
  const sendBtn = document.getElementById('devisSend');
  const clearBtn = document.getElementById('devisClear');
  
  if (sendBtn) {
    sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.sendQuoteToWhatsApp();
    });
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.clearCart();
    });
  }
},

addToCart(productSlug, quantity = 1) {
  const product = ProductManager.findBySlug(productSlug);
  if (!product) {
    UI.showToast('Produit non trouvé', 'error');
    return false;
  }
  
  const existingItem = State.cart.find(item => item.slug === productSlug);
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    State.cart.push({
      slug: productSlug,
      title: product.title,
      price: product.price || 0,
      image: product.image,
      quantity: quantity
    });
  }
  
  State.setCart([...State.cart]);
  console.log('Cart updated:', State.cart); // Debug log
  UI.showToast(`${product.title} ajouté au panier`, 'success');
  this.pulseCartButton();
  
  return true; // Succès
},

removeFromCart(productSlug) {
  State.setCart(State.cart.filter(item => item.slug !== productSlug));
  UI.showToast('Produit retiré du panier', 'info');
},

updateQuantity(productSlug, newQuantity) {
  if (newQuantity <= 0) {
    this.removeFromCart(productSlug);
    return;
  }
  
  const item = State.cart.find(item => item.slug === productSlug);
  if (item) {
    item.quantity = newQuantity;
    State.setCart([...State.cart]);
  }
},

clearCart() {
  if (State.cartCount === 0) return;
  
  if (confirm('Vider le panier ?')) {
    State.setCart([]);
    UI.showToast('Panier vidé', 'info');
  }
},

updateCartUI() {
  this.updateCartCount();
  this.updateCartList();
  this.updateMiniCart();
},

updateCartCount() {
  const count = State.cartCount;
  const countElement = document.getElementById('dockCount');
  
  if (countElement) {
    if (count > 0) {
      countElement.textContent = count;
      countElement.style.display = 'block';
    } else {
      countElement.style.display = 'none';
    }
  }
  
  // Badge sur dock button
  const cartBtn = document.getElementById('dockCartBtn');
  if (cartBtn) {
    if (count > 0) {
      cartBtn.classList.add('has-badge');
      cartBtn.dataset.badge = count;
    } else {
      cartBtn.classList.remove('has-badge');
    }
  }
},

updateCartList() {
  const container = document.getElementById('devisList');
  if (!container) {
    console.warn('Container devisList non trouve');
    return;
  }
  
  console.log('Updating cart list, items:', State.cart.length);
  console.log('Cart content:', State.cart);
  
  if (State.cart.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 40px 20px;">
        <p style="color: var(--muted); margin-bottom: 20px;">Votre panier est vide</p>
        <a href="#/catalogue" class="btn primary" style="display: inline-block; padding: 12px 24px; text-decoration: none;">Decouvrir nos produits</a>
      </div>
    `;
    return;
  }
  
  const cartHTML = State.cart.map((item, index) => `
    <div class="cart-item" data-slug="${item.slug}" style="display: flex; justify-content: space-between; align-items: center; padding: 16px; margin-bottom: 12px; background: var(--card); border-radius: 8px;">
      <div class="cart-item__info" style="display: flex; align-items: center; gap: 12px;">
        ${item.image ? `<img src="${item.image}" alt="${Utils.escapeHtml(item.title)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">` : ''}
        <div>
          <h4 style="margin: 0; font-size: 14px; font-weight: 600;">${Utils.escapeHtml(item.title)}</h4>
          <p style="margin: 4px 0; color: var(--brand); font-weight: 500;">${item.price}€ HT</p>
        </div>
      </div>
      <div class="cart-item__controls" style="display: flex; align-items: center; gap: 8px;">
        <button onclick="window.PiratesTools.updateCartQuantity('${item.slug}', ${item.quantity - 1})" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border); background: var(--card); color: var(--fg); cursor: pointer; display: flex; align-items: center; justify-content: center;">-</button>
        <span style="min-width: 24px; text-align: center; font-weight: 600;">${item.quantity}</span>
        <button onclick="window.PiratesTools.updateCartQuantity('${item.slug}', ${item.quantity + 1})" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border); background: var(--card); color: var(--fg); cursor: pointer; display: flex; align-items: center; justify-content: center;">+</button>
        <button onclick="window.PiratesTools.removeFromCart('${item.slug}')" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border); background: var(--card); color: #ff6b6b; cursor: pointer; margin-left: 8px; display: flex; align-items: center; justify-content: center;">×</button>
      </div>
    </div>
  `).join('');
  
  // Total
  const totalHTML = `
    <div class="cart-total" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border); text-align: right;">
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">
        Total HT: <span style="color: var(--brand);">${State.cartTotal.toFixed(2)}€</span>
      </div>
      <div style="font-size: 14px; color: var(--muted);">
        TTC: ${(State.cartTotal * 1.20).toFixed(2)}€
      </div>
    </div>
  `;
  
  container.innerHTML = cartHTML + totalHTML;
},

updateMiniCart() {
  const miniText = document.getElementById('accCartMiniTxt');
  if (miniText) {
    const count = State.cartCount;
    const total = State.cartTotal;
    miniText.textContent = `${count} article${count > 1 ? 's' : ''} — total ${total.toFixed(2)} €`;
  }
},

sendQuoteToWhatsApp() {
  if (State.cart.length === 0) {
    UI.showToast('Panier vide', 'warning');
    return;
  }
  
  const message = this.generateQuoteMessage();
  const url = `https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
},

generateQuoteMessage() {
  let message = '🛠️ *Demande de devis - Pirates Tools*\n\n';
  
  State.cart.forEach((item, index) => {
    message += `${index + 1}. ${item.title}\n`;
    message += `   Quantité: ${item.quantity}\n`;
    message += `   Prix unitaire HT: ${item.price}€\n\n`;
  });
  
  message += `💰 *Total HT: ${State.cartTotal.toFixed(2)}€*\n`;
  message += `💰 *Total TTC: ${(State.cartTotal * 1.20).toFixed(2)}€*\n\n`;
  message += `Merci de me confirmer la disponibilité et les délais de livraison.`;
  
  return message;
},

pulseCartButton() {
  const cartBtn = document.getElementById('dockCartBtn');
  if (cartBtn) {
    cartBtn.classList.add('pulse');
    setTimeout(() => cartBtn.classList.remove('pulse'), 600);
  }
}
```

};

// ===========================================
// 6. AUTH SYSTEM
// ===========================================

const AuthManager = {
init() {
this.loadUserFromStorage();
this.bindAuthEvents();
},

```
bindAuthEvents() {
  // Tabs
  const loginTab = document.getElementById('authLoginTab');
  const registerTab = document.getElementById('authRegisterTab');
  
  if (loginTab) {
    loginTab.addEventListener('click', () => this.showLoginForm());
  }
  
  if (registerTab) {
    registerTab.addEventListener('click', () => this.showRegisterForm());
  }
  
  // Forms
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => this.handleLogin(e));
  }
  
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => this.handleRegister(e));
  }
  
  // Account form
  const accountForm = document.getElementById('accountForm');
  if (accountForm) {
    accountForm.addEventListener('submit', (e) => this.handleAccountUpdate(e));
  }
},

showLoginForm() {
  const loginTab = document.getElementById('authLoginTab');
  const registerTab = document.getElementById('authRegisterTab');
  const loginForm = document.getElementById('authLogin');
  const registerForm = document.getElementById('authRegister');
  
  if (loginTab) {
    loginTab.setAttribute('aria-selected', 'true');
    loginTab.classList.add('active');
  }
  if (registerTab) {
    registerTab.setAttribute('aria-selected', 'false');
    registerTab.classList.remove('active');
  }
  if (loginForm) loginForm.hidden = false;
  if (registerForm) registerForm.hidden = true;
},

showRegisterForm() {
  const loginTab = document.getElementById('authLoginTab');
  const registerTab = document.getElementById('authRegisterTab');
  const loginForm = document.getElementById('authLogin');
  const registerForm = document.getElementById('authRegister');
  
  if (loginTab) {
    loginTab.setAttribute('aria-selected', 'false');
    loginTab.classList.remove('active');
  }
  if (registerTab) {
    registerTab.setAttribute('aria-selected', 'true');
    registerTab.classList.add('active');
  }
  if (loginForm) loginForm.hidden = true;
  if (registerForm) registerForm.hidden = false;
},

async handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('loginEmail')?.value;
  const password = document.getElementById('loginPwd')?.value;
  
  if (!email || !password) {
    UI.showToast('Veuillez remplir tous les champs', 'error');
    return;
  }
  
  try {
    const users = this.getStoredUsers();
    const hashedPassword = await this.hashPassword(password);
    const user = users.find(u => u.email === email && u.password === hashedPassword);
    
    if (!user) {
      UI.showToast('Email ou mot de passe incorrect', 'error');
      return;
    }
    
    this.setCurrentUser(user);
    UI.showToast('Connexion réussie', 'success');
    Router.navigateTo(ROUTES.COMPTE);
    
  } catch (error) {
    console.error('Login error:', error);
    UI.showToast('Erreur de connexion', 'error');
  }
},

async handleRegister(event) {
  event.preventDefault();
  
  const name = document.getElementById('regName')?.value;
  const email = document.getElementById('regEmail')?.value;
  const password = document.getElementById('regPwd')?.value;
  
  if (!name || !email || !password) {
    UI.showToast('Veuillez remplir tous les champs', 'error');
    return;
  }
  
  if (password.length < 6) {
    UI.showToast('Le mot de passe doit contenir au moins 6 caractères', 'error');
    return;
  }
  
  try {
    const users = this.getStoredUsers();
    
    if (users.find(u => u.email === email)) {
      UI.showToast('Cet email est déjà utilisé', 'error');
      return;
    }
    
    const hashedPassword = await this.hashPassword(password);
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password: hashedPassword,
      avatar: null,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(users));
    
    this.setCurrentUser(newUser);
    UI.showToast('Compte créé avec succès', 'success');
    Router.navigateTo(ROUTES.COMPTE);
    
  } catch (error) {
    console.error('Register error:', error);
    UI.showToast('Erreur lors de la création du compte', 'error');
  }
},

async handleAccountUpdate(event) {
  event.preventDefault();
  
  if (!State.user) return;
  
  const name = document.getElementById('accName')?.value;
  const email = document.getElementById('accEmail')?.value;
  
  if (!name || !email) {
    UI.showToast('Veuillez remplir tous les champs', 'error');
    return;
  }
  
  try {
    const users = this.getStoredUsers();
    const userIndex = users.findIndex(u => u.id === State.user.id);
    
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], name, email };
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(users));
      
      this.setCurrentUser(users[userIndex]);
      UI.showToast('Profil mis à jour', 'success');
    }
    
  } catch (error) {
    console.error('Account update error:', error);
    UI.showToast('Erreur lors de la mise à jour', 'error');
  }
},

logout() {
  localStorage.removeItem(STORAGE_KEYS.USER);
  State.setUser(null);
  Router.navigateTo(ROUTES.AUTH);
  UI.showToast('Déconnecté', 'info');
},

setCurrentUser(user) {
  const userCopy = { ...user };
  delete userCopy.password; // Ne pas stocker le hash en mémoire
  
  State.setUser(userCopy);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userCopy));
  
  this.updateAccountForm();
},

loadUserFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    if (stored) {
      const user = JSON.parse(stored);
      State.setUser(user);
      this.updateAccountForm();
    }
  } catch (error) {
    console.error('Failed to load user:', error);
  }
},

updateAccountForm() {
  if (!State.user) return;
  
  const nameField = document.getElementById('accName');
  const emailField = document.getElementById('accEmail');
  
  if (nameField) nameField.value = State.user.name || '';
  if (emailField) emailField.value = State.user.email || '';
},

getStoredUsers() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AUTH);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load users:', error);
    return [];
  }
},

async hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

};

// ===========================================
// 7. UI COMPONENTS
// ===========================================

const UI = {
// Menu système unifié (éviter conflit avec HTML)
Menu: {
isOpen() {
return !document.getElementById(‘side-menu’)?.classList.contains(‘hidden’);
},

```
  open() {
    if (window.__ptMenuUnified) return; // Déléguer au système HTML
    
    const menu = document.getElementById('side-menu');
    const backdrop = document.getElementById('menuBackdrop');
    
    if (menu) menu.classList.remove('hidden');
    if (backdrop) backdrop.classList.remove('hidden');
  },
  
  close() {
    if (window.__ptMenuUnified) return; // Déléguer au système HTML
    
    const menu = document.getElementById('side-menu');
    const backdrop = document.getElementById('menuBackdrop');
    
    if (menu) menu.classList.add('hidden');
    if (backdrop) backdrop.classList.add('hidden');
  }
},

showToast(message, type = 'info') {
  console.log('Toast:', message, type);
  
  // Utiliser le système existant si disponible
  if (typeof window.ptToast === 'function') {
    try {
      window.ptToast(message, type);
      return;
    } catch (error) {
      console.error('Error with ptToast:', error);
    }
  }
  
  // Fallback simple et robuste
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 1000;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-size: 14px;
    max-width: 300px;
    word-wrap: break-word;
    background: ${type === 'error' ? '#ff6b6b' : type === 'success' ? '#00e1b4' : type === 'warning' ? '#ffd93d' : '#19d3ff'};
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    opacity: 0;
    transform: translateX(100px);
    transition: all 0.3s ease;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Animation d'entrée
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  });
  
  // Auto-remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

updateInstallButton() {
  const installBtn = document.getElementById('installBtn');
  if (installBtn && PWAManager.canInstall()) {
    installBtn.classList.remove('hidden');
    installBtn.removeAttribute('hidden');
  }
}
```

};

// ===========================================
// 8. ANIMATION CONTROLLER
// ===========================================

const Animation = {
init() {
this.bindScrollEvents();
this.updateHeroLogo();
},

```
bindScrollEvents() {
  let ticking = false;
  
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        this.handleScroll();
        ticking = false;
      });
      ticking = true;
    }
  });
},

handleScroll() {
  if (State.currentRoute !== ROUTES.HOME) return;
  
  const scrollY = window.scrollY;
  const threshold = window.innerHeight * 0.3;
  
  if (scrollY > threshold && State.heroState === 'active') {
    State.heroState = 'transitioning';
    this.updateHeroLogo();
  } else if (scrollY <= threshold && State.heroState === 'transitioning') {
    State.heroState = 'active';
    this.updateHeroLogo();
  }
},

updateHeroLogo() {
  const logo = document.getElementById('heroLogo');
  if (!logo) return;
  
  // Éviter conflit avec animations HTML existantes
  if (logo.dataset.jsControlled === 'false') return;
  
  switch (State.heroState) {
    case 'active':
      logo.classList.add('on');
      logo.classList.remove('hero-out');
      break;
    case 'transitioning':
      logo.classList.remove('on');
      logo.classList.add('hero-out');
      break;
    case 'hidden':
      logo.classList.remove('on');
      logo.classList.add('hero-out');
      break;
  }
}
```

};

// ===========================================
// 9. PDP (Product Detail Page)
// ===========================================

const PDP = {
render(product) {
if (!product) return;

```
  this.updateProductImage(product);
  this.updateProductInfo(product);
  this.updateProductSpecs(product);
  this.bindProductActions(product);
  this.loadRelatedProducts(product);
},

updateProductImage(product) {
  const img = document.getElementById('pdpImg');
  if (img && product.image) {
    img.src = product.image;
    img.alt = product.title;
  }
},

updateProductInfo(product) {
  const title = document.getElementById('pdpTitle');
  const tag = document.getElementById('pdpTag');
  const desc = document.getElementById('pdpDesc');
  const price = document.getElementById('pdpPrice');
  
  if (title) title.textContent = product.title;
  if (tag) tag.textContent = product.tag || '';
  if (desc) desc.textContent = product.description || '';
  if (price && product.price) {
    price.innerHTML = `
      <span class="price-ht">${product.price}€ HT</span>
      <span class="price-ttc">${(product.price * 1.20).toFixed(2)}€ TTC</span>
    `;
  }
},

updateProductSpecs(product) {
  const specs = document.getElementById('pdpSpecs');
  if (!specs) return;
  
  if (product.specifications && product.specifications.length > 0) {
    specs.innerHTML = product.specifications
      .map(spec => `<li>${Utils.escapeHtml(spec)}</li>`)
      .join('');
  } else {
    specs.innerHTML = '';
  }
},

bindProductActions(product) {
  console.log('Binding PDP actions for product:', product.slug);
  
  const quoteBtn = document.getElementById('pdpQuote');
  const waBtn = document.getElementById('pdpWa');
  const shareBtn = document.getElementById('pdpShare');
  
  if (quoteBtn) {
    console.log('Found pdpQuote button, setting up...');
    
    // SUPPRIMER COMPLÈTEMENT tous les attributs qui peuvent causer une navigation
    quoteBtn.removeAttribute('href');
    quoteBtn.removeAttribute('data-nav');
    quoteBtn.removeAttribute('data-action');
    quoteBtn.removeAttribute('onclick');
    
    // Supprimer tous les event listeners existants en clonant le nœud
    const newQuoteBtn = quoteBtn.cloneNode(true);
    quoteBtn.parentNode.replaceChild(newQuoteBtn, quoteBtn);
    
    // Récupérer la nouvelle référence
    const finalQuoteBtn = document.getElementById('pdpQuote');
    
    // Ajouter UNIQUEMENT notre event listener
    finalQuoteBtn.addEventListener('click', (e) => {
      console.log('PDP Quote button clicked!');
      
      // BLOQUER COMPLÈTEMENT la propagation
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Ajouter au panier
      console.log('Adding product to cart:', product.slug);
      const success = CartManager.addToCart(product.slug);
      
      if (success) {
        // Feedback visuel sur le bouton
        finalQuoteBtn.textContent = '✓ Ajouté !';
        finalQuoteBtn.style.backgroundColor = '#00e1b4';
        finalQuoteBtn.style.color = 'white';
        
        // Remettre le texte original après 2 secondes
        setTimeout(() => {
          finalQuoteBtn.textContent = 'Ajouter au panier';
          finalQuoteBtn.style.backgroundColor = '';
          finalQuoteBtn.style.color = '';
        }, 2000);
        
        console.log('Product added successfully, staying on PDP');
      } else {
        console.error('Failed to add product to cart');
      }
      
      // S'ASSURER qu'on ne navigue pas
      return false;
    }, { capture: true }); // Utiliser capture pour être le premier à traiter l'événement
    
    console.log('PDP Quote button setup complete');
  } else {
    console.warn('pdpQuote button not found');
  }
  
  if (waBtn) {
    const message = `Bonjour, je suis intéressé par ce produit :\n${product.title}`;
    waBtn.href = `https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(message)}`;
  }
  
  if (shareBtn) {
    shareBtn.onclick = (e) => {
      e.preventDefault();
      this.shareProduct(product);
    };
  }
},

async shareProduct(product) {
  const shareData = {
    title: product.title,
    text: product.description,
    url: `${window.location.origin}${window.location.pathname}#/produit/${product.slug}`
  };
  
  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      // Fallback
      await navigator.clipboard.writeText(shareData.url);
      UI.showToast('Lien copié dans le presse-papiers', 'success');
    }
  } catch (error) {
    console.error('Share error:', error);
  }
},

loadRelatedProducts(product) {
  const container = document.getElementById('pdpRelated');
  if (!container) return;
  
  // Produits de même catégorie
  const related = State.products
    .filter(p => p.tag === product.tag && p.slug !== product.slug)
    .slice(0, 3);
  
  if (related.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = `
    <h3>Produits similaires</h3>
    <div class="related-grid">
      ${related.map(p => `
        <article class="related-card">
          <a href="#/produit/${p.slug}">
            ${p.image ? `<img src="${p.image}" alt="${Utils.escapeHtml(p.title)}" loading="lazy">` : ''}
            <h4>${Utils.escapeHtml(p.title)}</h4>
          </a>
        </article>
      `).join('')}
    </div>
  `;
}
```

};

// ===========================================
// 10. PWA MANAGER
// ===========================================

const PWAManager = {
deferredPrompt: null,

```
init() {
  this.registerServiceWorker();
  this.bindInstallEvents();
  this.updateAppVh();
},

async registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
      console.log('Service Worker registered');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
},

bindInstallEvents() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    this.deferredPrompt = e;
    UI.updateInstallButton();
  });
  
  const installBtn = document.getElementById('installBtn');
  if (installBtn) {
    installBtn.addEventListener('click', () => this.installApp());
  }
},

async installApp() {
  if (!this.deferredPrompt) return;
  
  this.deferredPrompt.prompt();
  const { outcome } = await this.deferredPrompt.userChoice;
  
  if (outcome === 'accepted') {
    UI.showToast('Application installée', 'success');
  }
  
  this.deferredPrompt = null;
  UI.updateInstallButton();
},

canInstall() {
  return !!this.deferredPrompt;
},

updateAppVh() {
  const updateVh = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--app-vh', `${vh}px`);
  };
  
  updateVh();
  window.addEventListener('resize', Utils.debounce(updateVh, 150));
}
```

};

// ===========================================
// UTILITIES
// ===========================================

const Utils = {
debounce(func, wait) {
let timeout;
return function executedFunction(…args) {
const later = () => {
clearTimeout(timeout);
func(…args);
};
clearTimeout(timeout);
timeout = setTimeout(later, wait);
};
},

```
throttle(func, wait) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, wait);
    }
  };
},

escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/[\u2013\u2014]/g, "-") // em dash, en dash
    .replace(/[\u2018\u2019]/g, "'") // smart quotes
    .replace(/[\u201C\u201D]/g, '"'); // smart double quotes
},

formatPrice(price) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(price);
},

generateId() {
  return Math.random().toString(36).substr(2, 9);
},

isOnline() {
  return navigator.onLine;
}
```

};

// ===========================================
// INITIALIZATION
// ===========================================

const App = {
async init() {
try {
console.log(‘🏴‍☠️ Pirates Tools App v2.0 - Initialisation…’);
console.log(‘DOM ready state:’, document.readyState);

```
    // Vérifier les éléments critiques
    const criticalElements = [
      'view-home', 'view-catalogue', 'view-produit', 'view-devis', 'view-compte', 'view-auth',
      'dockCartBtn', 'devisList'
    ];
    
    criticalElements.forEach(id => {
      const el = document.getElementById(id);
      console.log(`Element ${id}:`, el ? 'found' : 'NOT FOUND');
    });
    
    // Ordre d'initialisation critique
    PWAManager.init();
    Router.init();
    AuthManager.init();
    CartManager.init();
    Animation.init();
    
    await ProductManager.init();
    
    // Bindings globaux
    this.bindGlobalEvents();
    
    // Test du panier après init
    console.log('Cart after init:', State.cart);
    console.log('Cart count after init:', State.cartCount);
    
    console.log('⚡ Application prete !');
    
  } catch (error) {
    console.error('💥 Erreur d\'initialisation:', error);
    console.error('Error stack:', error.stack);
    UI.showToast('Erreur de chargement de l\'application', 'error');
  }
},

bindGlobalEvents() {
  console.log('Binding global events...');
  
  // Navigation data-nav (avec exclusions strictes)
  document.addEventListener('click', (e) => {
    // IGNORER COMPLÈTEMENT si c'est le bouton d'ajout au panier PDP
    if (e.target.id === 'pdpQuote' || e.target.closest('#pdpQuote')) {
      console.log('Ignoring navigation for pdpQuote button');
      return; // Laisser le PDP gérer cet événement
    }
    
    const navEl = e.target.closest('[data-nav]');
    if (navEl) {
      // Double vérification pour éviter les boutons d'ajout au panier
      if (navEl.id === 'pdpQuote' || navEl.classList.contains('add-to-cart-btn')) {
        console.log('Skipping navigation for cart button');
        return;
      }
      
      console.log('Navigation via data-nav to:', navEl.dataset.nav);
      e.preventDefault();
      const route = navEl.dataset.nav;
      window.location.hash = '#' + route;
    }
  });
  
  // Actions data-action (avec exclusions strictes)
  document.addEventListener('click', (e) => {
    // IGNORER COMPLÈTEMENT si c'est le bouton PDP
    if (e.target.id === 'pdpQuote' || e.target.closest('#pdpQuote')) {
      console.log('Ignoring global action for pdpQuote button');
      return;
    }
    
    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
      // Double vérification
      if (actionEl.id === 'pdpQuote') {
        console.log('Skipping global action for pdpQuote');
        return;
      }
      
      console.log('Global action triggered:', actionEl.dataset.action);
      e.preventDefault();
      this.handleGlobalAction(actionEl.dataset.action, actionEl);
    }
  });
  
  // Échap pour fermer modales
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (UI.Menu.isOpen()) {
        UI.Menu.close();
      }
    }
  });
  
  // Status réseau
  window.addEventListener('online', () => {
    UI.showToast('Connexion rétablie', 'success');
  });
  
  window.addEventListener('offline', () => {
    UI.showToast('Mode hors ligne', 'warning');
  });
},

handleGlobalAction(action, element) {
  console.log('Global action:', action); // Debug
  
  switch (action) {
    case 'add-to-cart':
      const productSlug = element.dataset.product || State.currentProduct?.slug;
      if (productSlug) {
        CartManager.addToCart(productSlug);
      }
      break;
      
    case 'send-quote':
      CartManager.sendQuoteToWhatsApp();
      break;
      
    case 'clear-cart':
      CartManager.clearCart();
      break;
      
    case 'login':
      // Ne pas traiter si c'est un submit de form
      if (element.type !== 'submit') {
        AuthManager.handleLogin(new Event('submit'));
      }
      break;
      
    case 'register':
      // Ne pas traiter si c'est un submit de form
      if (element.type !== 'submit') {
        AuthManager.handleRegister(new Event('submit'));
      }
      break;
      
    case 'account-save':
      // Ne pas traiter si c'est un submit de form
      if (element.type !== 'submit') {
        AuthManager.handleAccountUpdate(new Event('submit'));
      }
      break;
      
    case 'install':
      PWAManager.installApp();
      break;
      
    case 'share':
      if (State.currentProduct) {
        PDP.shareProduct(State.currentProduct);
      }
      break;
      
    default:
      console.warn('Action inconnue:', action);
  }
}
```

};

// ===========================================
// EXPORT & START
// ===========================================

// Initialisation immédiate de l’API globale
window.PiratesTools = {
// État par défaut
_initialized: false,
_initPromise: null,

```
// API publique immédiate (même avant init complète)
getState() {
  return State;
},

navigateTo(route) {
  if (Router.navigateTo) {
    Router.navigateTo(route);
  } else {
    window.location.hash = '#' + route;
  }
},

addToCart(slug, quantity) {
  console.log('addToCart called:', slug, quantity);
  if (CartManager.addToCart) {
    return CartManager.addToCart(slug, quantity);
  } else {
    console.warn('CartManager not ready');
    return false;
  }
},

updateCartQuantity(slug, quantity) {
  console.log('updateCartQuantity called:', slug, quantity);
  if (CartManager.updateQuantity) {
    CartManager.updateQuantity(slug, quantity);
  } else {
    console.warn('CartManager not ready');
  }
},

removeFromCart(slug) {
  console.log('removeFromCart called:', slug);
  if (CartManager.removeFromCart) {
    CartManager.removeFromCart(slug);
  } else {
    console.warn('CartManager not ready');
  }
},

showToast(message, type) {
  if (UI.showToast) {
    UI.showToast(message, type);
  } else {
    console.log('Toast:', message, type);
  }
},

// Debug methods
debugCart() {
  console.log('=== CART DEBUG ===');
  console.log('State.cart:', State.cart);
  console.log('State.cartCount:', State.cartCount);
  console.log('State.cartTotal:', State.cartTotal);
  console.log('localStorage cart:', localStorage.getItem('cart'));
  console.log('localStorage pt_cart:', localStorage.getItem(STORAGE_KEYS.CART));
  console.log('CartManager exists:', !!CartManager);
  console.log('==================');
},

forceCartUpdate() {
  console.log('Forcing cart update...');
  if (CartManager.updateCartUI) {
    CartManager.updateCartUI();
  } else {
    console.warn('CartManager.updateCartUI not available');
  }
},

testAddToCart() {
  console.log('Testing add to cart...');
  
  // Créer un produit de test
  const testProduct = {
    slug: 'test-product-' + Date.now(),
    title: 'Produit de Test',
    price: 99.99,
    image: null,
    tag: 'Test',
    description: 'Produit de test pour vérifier le panier'
  };
  
  // L'ajouter aux produits disponibles
  if (State.products) {
    State.products.push(testProduct);
  } else {
    State.products = [testProduct];
  }
  
  console.log('Test product created:', testProduct);
  
  // L'ajouter au panier
  return this.addToCart(testProduct.slug);
},

// Diagnostic du bouton PDP
diagnoseAddToCartButton() {
  console.log('=== ADD TO CART BUTTON DIAGNOSIS ===');
  
  const btn = document.getElementById('pdpQuote');
  console.log('Button found:', !!btn);
  
  if (btn) {
    console.log('Button attributes:');
    for (let attr of btn.attributes) {
      console.log(`  ${attr.name}: ${attr.value}`);
    }
    
    console.log('Button event listeners:');
    console.log('  onclick:', btn.onclick);
    console.log('  href:', btn.href);
    console.log('  data-nav:', btn.dataset.nav);
    console.log('  data-action:', btn.dataset.action);
    
    console.log('Button classes:', btn.className);
    console.log('Button parent:', btn.parentElement?.tagName);
    
    // Test click sans navigation
    console.log('Testing click handler...');
    const testEvent = new MouseEvent('click', {
      bubbles: false,
      cancelable: true
    });
    
    btn.dispatchEvent(testEvent);
    console.log('Test click completed');
  }
  
  console.log('=====================================');
},

// Méthode d'initialisation
async init() {
  if (this._initialized) {
    console.log('PiratesTools already initialized');
    return this._initPromise;
  }
  
  if (this._initPromise) {
    console.log('PiratesTools initialization in progress...');
    return this._initPromise;
  }
  
  console.log('Starting PiratesTools initialization...');
  
  this._initPromise = App.init().then(() => {
    this._initialized = true;
    console.log('PiratesTools fully initialized');
    
    // Remplacer les méthodes par les vraies
    Object.assign(this, App);
  }).catch(error => {
    console.error('PiratesTools initialization failed:', error);
    throw error;
  });
  
  return this._initPromise;
}
```

};

// Debug global pour les tests
window.debugPiratesTools = () => {
console.log(’=== PIRATES TOOLS DEBUG ===’);
console.log(‘Initialized:’, window.PiratesTools._initialized);
console.log(‘State:’, State);
console.log(‘Cart in localStorage:’, localStorage.getItem(‘cart’));
console.log(‘Cart in pt_cart:’, localStorage.getItem(‘pt_cart’));
console.log(‘Current route:’, State.currentRoute);
console.log(‘Products loaded:’, State.products?.length || 0);
console.log(‘Available methods:’, Object.keys(window.PiratesTools));
console.log(’============================’);
};

// Auto-start robuste
function startApp() {
console.log(‘Starting Pirates Tools App…’);
console.log(‘Document ready state:’, document.readyState);

```
// Démarrer l'initialisation
window.PiratesTools.init().catch(error => {
  console.error('App initialization failed:', error);
  
  // Retry après un délai
  setTimeout(() => {
    console.log('Retrying app initialization...');
    window.PiratesTools.init().catch(retryError => {
      console.error('App initialization retry failed:', retryError);
    });
  }, 2000);
});
```

}

// Démarrage selon état du DOM
if (document.readyState === ‘loading’) {
document.addEventListener(‘DOMContentLoaded’, startApp);
} else if (document.readyState === ‘interactive’) {
// DOM prêt mais ressources en cours de chargement
setTimeout(startApp, 100);
} else {
// DOM et ressources prêts
startApp();
}

})();
