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

const State = {
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
heroState: ‘active’, // active, transitioning, hidden

```
// Getters
get cartCount() {
  return this.cart.reduce((sum, item) => sum + item.quantity, 0);
},

get cartTotal() {
  return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
},

// Mutations
setRoute(route) {
  this.currentRoute = route;
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
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(this.cart));
  } catch (error) {
    console.error('Failed to save cart:', error);
  }
},

loadCartFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CART);
    this.cart = saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Failed to load cart:', error);
    this.cart = [];
  }
}
```

};

// ===========================================
// 3. ROUTER SYSTEM
// ===========================================

const Router = {
init() {
// Éviter conflit avec router HTML existant
if (window.__ptRouterActive) {
console.log(‘Router déjà actif, utilisation du système existant’);
return;
}

```
  window.addEventListener('hashchange', this.handleHashChange.bind(this));
  window.addEventListener('popstate', this.handlePopState.bind(this));
  
  // Route initiale
  this.navigateToCurrentHash();
  window.__ptRouterActive = true;
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
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
},

createSearchText(product) {
  return [
    product.title,
    product.description,
    product.tag,
    product.brand,
    ...(product.specifications || [])
  ].filter(Boolean).join(' ').toLowerCase();
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
State.loadCartFromStorage();
this.bindCartEvents();
this.updateCartUI();

```
  // Observer les changements de panier
  State.subscribe('cart', () => this.updateCartUI());
},

bindCartEvents() {
  // Boutons dock
  const cartBtn = document.getElementById('dockCartBtn');
  if (cartBtn) {
    cartBtn.addEventListener('click', () => Router.navigateTo(ROUTES.DEVIS));
  }
  
  // Actions devis
  const sendBtn = document.getElementById('devisSend');
  const clearBtn = document.getElementById('devisClear');
  
  if (sendBtn) {
    sendBtn.addEventListener('click', () => this.sendQuoteToWhatsApp());
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => this.clearCart());
  }
},

addToCart(productSlug, quantity = 1) {
  const product = ProductManager.findBySlug(productSlug);
  if (!product) {
    UI.showToast('Produit non trouvé', 'error');
    return;
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
  UI.showToast('Produit ajouté au panier', 'success');
  this.pulseCartButton();
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
  if (!container) return;
  
  if (State.cart.length === 0) {
    container.innerHTML = '<p class="empty-state">Votre panier est vide</p>';
    return;
  }
  
  container.innerHTML = State.cart.map(item => `
    <div class="cart-item" data-slug="${item.slug}">
      <div class="cart-item__info">
        ${item.image ? `<img src="${item.image}" alt="${Utils.escapeHtml(item.title)}">` : ''}
        <div>
          <h4>${Utils.escapeHtml(item.title)}</h4>
          <p class="price">${item.price}€ HT</p>
        </div>
      </div>
      <div class="cart-item__controls">
        <button onclick="CartManager.updateQuantity('${item.slug}', ${item.quantity - 1})">-</button>
        <span class="quantity">${item.quantity}</span>
        <button onclick="CartManager.updateQuantity('${item.slug}', ${item.quantity + 1})">+</button>
        <button class="remove" onclick="CartManager.removeFromCart('${item.slug}')">✕</button>
      </div>
    </div>
  `).join('');
  
  // Total
  const total = document.createElement('div');
  total.className = 'cart-total';
  total.innerHTML = `
    <strong>Total HT: ${State.cartTotal.toFixed(2)}€</strong>
    <span>TTC: ${(State.cartTotal * 1.20).toFixed(2)}€</span>
  `;
  container.appendChild(total);
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
  // Utiliser le système existant si disponible
  if (typeof window.ptToast === 'function') {
    window.ptToast(message, type);
    return;
  }
  
  // Fallback
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  
  const container = document.getElementById('toasts') || document.body;
  container.appendChild(toast);
  
  // Auto-remove
  setTimeout(() => {
    toast.remove();
  }, 4000);
},

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
  const quoteBtn = document.getElementById('pdpQuote');
  const waBtn = document.getElementById('pdpWa');
  const shareBtn = document.getElementById('pdpShare');
  
  if (quoteBtn) {
    quoteBtn.onclick = () => {
      CartManager.addToCart(product.slug);
    };
  }
  
  if (waBtn) {
    const message = `Bonjour, je suis intéressé par ce produit :\n${product.title}`;
    waBtn.href = `https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(message)}`;
  }
  
  if (shareBtn) {
    shareBtn.onclick = () => this.shareProduct(product);
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
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

```
    // Ordre d'initialisation critique
    PWAManager.init();
    Router.init();
    AuthManager.init();
    CartManager.init();
    Animation.init();
    
    await ProductManager.init();
    
    // Bindings globaux
    this.bindGlobalEvents();
    
    console.log('⚡ Application prête !');
    
  } catch (error) {
    console.error('💥 Erreur d\'initialisation:', error);
    UI.showToast('Erreur de chargement de l\'application', 'error');
  }
},

bindGlobalEvents() {
  // Navigation data-nav
  document.addEventListener('click', (e) => {
    const navEl = e.target.closest('[data-nav]');
    if (navEl) {
      e.preventDefault();
      const route = navEl.dataset.nav;
      window.location.hash = '#' + route;
    }
  });
  
  // Actions data-action
  document.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
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
      AuthManager.handleLogin(new Event('submit'));
      break;
      
    case 'register':
      AuthManager.handleRegister(new Event('submit'));
      break;
      
    case 'account-save':
      AuthManager.handleAccountUpdate(new Event('submit'));
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
},

// API publique
getState() {
  return State;
},

navigateTo(route) {
  Router.navigateTo(route);
},

addToCart(slug, quantity) {
  CartManager.addToCart(slug, quantity);
},

showToast(message, type) {
  UI.showToast(message, type);
}
```

};

// ===========================================
// EXPORT & START
// ===========================================

// API globale
window.PiratesTools = App;

// Auto-start quand DOM prêt
if (document.readyState === ‘loading’) {
document.addEventListener(‘DOMContentLoaded’, () => App.init());
} else {
App.init();
}

})();