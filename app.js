/* Pirates Tools PWA - Application principale optimisée CORRIGÉE
- Version: 2.1 FIXED
- Compatible avec HTML/CSS existant
- CORRECTIONS: Affichage panier, gestion données, binding événements */

(function() {
'use strict';

/* ===========================================
 1. CONSTANTS & CONFIG
 =========================================== */

const CONFIG = {
  API_BASE: window.location.origin + window.location.pathname.replace(/\/$/, ''),
  PRODUCTS_URL: 'data/products.json',
  CACHE_VERSION: window.__ASSET_VER || '35',
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 300,
  WA_NUMBER: '33774230195',
  PHONE_NUMBER: '+33774230195'
};

const ROUTES = {
  HOME: '/',
  CATALOGUE: '/catalogue',
  PRODUIT: '/produit',
  DEVIS: '/devis',
  COMPTE: '/compte',
  AUTH: '/auth'
};

const STORAGE_KEYS = {
  CART: 'pt_cart',
  USER: 'pt_user',
  AUTH: 'pt_auth',
  PRODUCTS_CACHE: 'pt_products_cache',
  SETTINGS: 'pt_settings'
};

// ===========================================
// 2. STATE MANAGEMENT - CORRIGÉ
// ===========================================

// Initialisation immédiate du State
window.State = window.State || {
  currentRoute: '/',
  user: null,
  isAuthenticated: false,
  products: [],
  filteredProducts: [],
  cart: [],
  currentProduct: null,
  searchQuery: '',
  selectedTag: '',
  isLoading: false,
  heroState: 'active'
};

const State = window.State;

// Ajouter les méthodes au State existant
Object.assign(State, {
  // Getters CORRIGÉS avec protection renforcée
  get cartCount() {
    if (!this.cart || !Array.isArray(this.cart)) {
      console.warn('Cart is undefined or not an array, initializing empty cart');
      this.cart = [];
      return 0;
    }
    const count = this.cart.reduce((sum, item) => {
      const qty = item.quantity || item.qty || 0;
      return sum + (typeof qty === 'number' && qty > 0 ? qty : 0);
    }, 0);
    console.log('Cart count calculated:', count, 'from cart:', this.cart);
    return count;
  },

  get cartTotal() {
    if (!this.cart || !Array.isArray(this.cart)) {
      console.warn('Cart is undefined or not an array, initializing empty cart');
      this.cart = [];
      return 0;
    }
    const total = this.cart.reduce((sum, item) => {
      const price = typeof item.price === 'number' ? item.price : 0;
      const qty = item.quantity || item.qty || 0;
      const itemTotal = price * (typeof qty === 'number' && qty > 0 ? qty : 0);
      return sum + itemTotal;
    }, 0);
    console.log('Cart total calculated:', total);
    return total;
  },

  // Mutations
  setRoute(route) {
    this.currentRoute = route;
    console.log('Route changed to:', route);
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
    // CORRECTION MAJEURE: Validation et normalisation stricte
    if (!Array.isArray(cart)) {
      console.error('setCart: cart must be an array, received:', typeof cart, cart);
      cart = [];
    }

    // Normaliser chaque élément du panier
    this.cart = cart.map((item, index) => {
      const normalizedItem = {
        slug: item.slug || item.key || `item-${index}`,
        title: item.title || 'Article inconnu',
        brand: item.brand || '',
        price: typeof item.price === 'number' ? item.price : 0,
        quantity: typeof item.quantity === 'number' ? item.quantity : (typeof item.qty === 'number' ? item.qty : 1),
        image: item.image || 'icons/icon-180.png'
      };
      
      // Assurer que quantity est > 0
      if (normalizedItem.quantity <= 0) {
        normalizedItem.quantity = 1;
      }
      
      console.log('Normalized cart item:', normalizedItem);
      return normalizedItem;
    });

    console.log('Cart set to:', this.cart);
    this.saveCartToStorage();
    this.notifyStateChange('cart', this.cart);
  },

  // Observers
  observers: new Map(),

  subscribe(event, callback) {
    if (!this.observers.has(event)) {
      this.observers.set(event, new Set());
    }
    this.observers.get(event).add(callback);

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

  // Persistence ULTRA-CORRIGÉE
  saveCartToStorage() {
    try {
      if (!Array.isArray(this.cart)) {
        console.warn('saveCartToStorage: cart is not an array, skipping save');
        return;
      }

      // Format simple pour HTML (compatibilité)
      const simpleCart = this.cart.map(item => ({
        key: item.slug,
        title: item.title,
        brand: item.brand,
        price: item.price,
        qty: item.quantity,
        image: item.image
      }));
      
      // Format avancé pour app.js
      const cartData = {
        version: CONFIG.CACHE_VERSION,
        timestamp: Date.now(),
        items: this.cart
      };

      // Sauvegarder dans les deux formats
      localStorage.setItem('cart', JSON.stringify(simpleCart));
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cartData));
      
      console.log('Cart saved successfully');
      console.log('Simple format:', simpleCart);
      console.log('Advanced format:', this.cart);
      
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  },

  loadCartFromStorage() {
    try {
      let cartData = null;

      // Essayer le format avancé en premier
      const advancedFormat = localStorage.getItem(STORAGE_KEYS.CART);
      if (advancedFormat) {
        try {
          const parsed = JSON.parse(advancedFormat);
          if (Array.isArray(parsed)) {
            cartData = parsed;
          } else if (parsed && parsed.items && Array.isArray(parsed.items)) {
            cartData = parsed.items;
          }
        } catch (parseError) {
          console.error('Error parsing advanced cart format:', parseError);
        }
      }
      
      // Fallback sur le format simple
      if (!cartData || cartData.length === 0) {
        const simpleFormat = localStorage.getItem('cart');
        if (simpleFormat) {
          try {
            const parsed = JSON.parse(simpleFormat);
            if (Array.isArray(parsed)) {
              cartData = parsed.map(item => ({
                slug: item.key || item.slug,
                title: item.title,
                brand: item.brand || '',
                price: item.price || 0,
                quantity: item.qty || item.quantity || 1,
                image: item.image
              }));
            }
          } catch (parseError) {
            console.error('Error parsing simple cart format:', parseError);
          }
        }
      }
      
      // Assurer que cartData est un array valide
      if (!Array.isArray(cartData)) {
        cartData = [];
      }
      
      this.cart = cartData;
      console.log('Cart loaded from storage:', this.cart);
      console.log('Cart items count:', this.cart.length);
      
    } catch (error) {
      console.error('Failed to load cart:', error);
      this.cart = [];
    }
  }
});

// Initialisation du cart au chargement
State.loadCartFromStorage();

// Rendre State disponible globalement
window.PiratesToolsState = State;

// ===========================================
// 3. ROUTER SYSTEM
// ===========================================

const Router = {
  init() {
    console.log('Router init...');

    if (window.__ptRouterActive) {
      console.log('Router already active');
      return;
    }
    
    if (window.syncViews || window.matchRoute) {
      console.log('HTML router detected, integrating...');
      this.integrateWithExistingRouter();
      return;
    }
    
    console.log('Initializing new router...');
    window.addEventListener('hashchange', this.handleHashChange.bind(this));
    window.addEventListener('popstate', this.handlePopState.bind(this));
    
    this.navigateToCurrentHash();
    window.__ptRouterActive = true;
  },

  integrateWithExistingRouter() {
    console.log('Integrating with existing HTML router...');
    
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1) || '/';
      console.log('Route changed via existing router:', hash);
      State.setRoute(hash);
      this.updateHeroState(hash);
      
      // CORRECTION: Forcer mise à jour panier avec délai plus long
      if (hash === '/devis') {
        setTimeout(() => {
          console.log('Cart update triggered by route change');
          CartManager.updateCartUI();
        }, 200);
      }
    });
    
    const currentHash = window.location.hash.slice(1) || '/';
    State.setRoute(currentHash);
    this.updateHeroState(currentHash);
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
    
    if (route === '/produit' && params.length > 0) {
      this.navigateToProduct(params[0]);
      return;
    }
    
    this.navigateTo(route);
  },

  navigateTo(route) {
    if (this.requiresAuth(route) && !State.isAuthenticated) {
      this.redirectToAuth();
      return;
    }
    
    State.setRoute(route);
    this.updateViews(route);
    this.updateBodyClass(route);
    this.updateHeroState(route);
    
    // CORRECTION: Délai plus long pour le panier
    if (route === ROUTES.DEVIS) {
      setTimeout(() => {
        console.log('Forcing cart UI update...');
        CartManager.updateCartUI();
      }, 300);
    }
    
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
    
    PDP.render(product);
  },

  updateViews(route) {
    const views = document.querySelectorAll('.view');
    views.forEach(view => {
      const viewRoute = view.dataset.route;
      if (viewRoute === route) {
        view.classList.remove('hidden');
        console.log('Showing view:', route);
        
        if (route === ROUTES.DEVIS) {
          console.log('Devis view shown, forcing cart update...');
          // CORRECTION: Délai plus long et retry si nécessaire
          setTimeout(() => {
            CartManager.updateCartUI();
            // Retry si le container est toujours vide
            setTimeout(() => {
              const container = document.getElementById('devisList');
              if (container && container.innerHTML.trim() === '') {
                console.log('Container still empty, retrying...');
                CartManager.updateCartUI();
              }
            }, 100);
          }, 100);
        }
        
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
    const heroLogo = document.getElementById('heroLogo');
    const isHomePage = route === ROUTES.HOME;
    
    console.log('Updating hero state for route:', route, 'isHomePage:', isHomePage);
    
    if (isHomePage) {
      State.heroState = 'active';
      if (hero) {
        hero.classList.remove('hero-out');
        hero.style.display = 'block';
      }
      if (heroLogo) {
        heroLogo.style.display = 'block';
      }
      document.body.classList.remove('after-hero');
    } else {
      State.heroState = 'hidden';
      if (hero) {
        hero.classList.add('hero-out');
        hero.style.display = 'none';
      }
      if (heroLogo) {
        heroLogo.style.display = 'none';
      }
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
};

// ===========================================
// 4. PRODUCT MANAGEMENT
// ===========================================

const ProductManager = {
  async init() {
    await this.loadProducts();
    this.bindSearchEvents();
  },

  async loadProducts() {
    try {
      const cached = this.getCachedProducts();
      if (cached && cached.version === CONFIG.CACHE_VERSION) {
        State.setProducts(cached.products);
        console.log('Products loaded from cache');
        return;
      }
      
      State.isLoading = true;
      const response = await fetch(`${CONFIG.PRODUCTS_URL}?v=${CONFIG.CACHE_VERSION}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const products = await response.json();
      
      const enrichedProducts = products.map(product => ({
        ...product,
        slug: this.createSlug(product.title),
        searchText: this.createSearchText(product)
      }));
      
      State.setProducts(enrichedProducts);
      this.cacheProducts(enrichedProducts);
      
      console.log(`${enrichedProducts.length} products loaded`);
      
    } catch (error) {
      console.error('Error loading products:', error);
      UI.showToast('Erreur de chargement des produits', 'error');
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
    
    if (State.searchQuery) {
      filtered = filtered.filter(product => 
        product.searchText.includes(State.searchQuery)
      );
    }
    
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
      .replace(/[\u00C0-\u00C5]/g, 'a')
      .replace(/[\u00C6]/g, 'ae')
      .replace(/[\u00C7]/g, 'c')
      .replace(/[\u00C8-\u00CB]/g, 'e')
      .replace(/[\u00CC-\u00CF]/g, 'i')
      .replace(/[\u00D1]/g, 'n')
      .replace(/[\u00D2-\u00D6]/g, 'o')
      .replace(/[\u00D9-\u00DC]/g, 'u')
      .replace(/[\u00DD]/g, 'y')
      .replace(/[\u00E0-\u00E5]/g, 'a')
      .replace(/[\u00E6]/g, 'ae')
      .replace(/[\u00E7]/g, 'c')
      .replace(/[\u00E8-\u00EB]/g, 'e')
      .replace(/[\u00EC-\u00EF]/g, 'i')
      .replace(/[\u00F1]/g, 'n')
      .replace(/[\u00F2-\u00F6]/g, 'o')
      .replace(/[\u00F9-\u00FC]/g, 'u')
      .replace(/[\u00FD\u00FF]/g, 'y')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
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
};

// ===========================================
// 5. CART SYSTEM - ULTRA-CORRIGÉ
// ===========================================

const CartManager = {
  init() {
    console.log('CartManager init...');
    State.loadCartFromStorage();
    console.log('Initial cart state:', State.cart);
    this.bindCartEvents();
    this.updateCartUI();

    State.subscribe('cart', () => {
      console.log('Cart state changed, updating UI...');
      this.updateCartUI();
    });
  },

  bindCartEvents() {
    console.log('Binding cart events...');
    
    // CORRECTION: Binding plus robuste du bouton panier
    const bindCartButton = () => {
      const cartBtn = document.getElementById('dockCartBtn');
      if (cartBtn) {
        // Nettoyer les anciens listeners
        const newCartBtn = cartBtn.cloneNode(true);
        cartBtn.parentNode.replaceChild(newCartBtn, cartBtn);
        
        document.getElementById('dockCartBtn').addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Dock cart button clicked, navigating to cart...');
          console.log('Current cart state:', State.cart);
          window.location.hash = '#/devis';
        });
        console.log('Cart button bound successfully');
      } else {
        console.warn('Cart button not found, retrying in 500ms...');
        setTimeout(bindCartButton, 500);
      }
    };
    
    bindCartButton();
    
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
    console.log('Adding to cart:', productSlug, 'quantity:', quantity);
    
    const product = ProductManager.findBySlug(productSlug);
    if (!product) {
      console.error('Product not found:', productSlug);
      UI.showToast('Produit non trouvé', 'error');
      return false;
    }
    
    // Assurer que le panier est un array
    if (!Array.isArray(State.cart)) {
      State.cart = [];
    }
    
    const existingItem = State.cart.find(item => item.slug === productSlug);
    
    if (existingItem) {
      existingItem.quantity += quantity;
      console.log('Updated existing item quantity:', existingItem.quantity);
    } else {
      const newItem = {
        slug: productSlug,
        title: product.title,
        brand: product.brand || product.tag || '',
        price: product.price || 0,
        image: product.image,
        quantity: quantity
      };
      State.cart.push(newItem);
      console.log('Added new item to cart:', newItem);
    }
    
    State.setCart([...State.cart]);
    UI.showToast(`${product.title} ajouté au panier`, 'success');
    this.pulseCartButton();
    
    return true;
  },

  removeFromCart(productSlug) {
    console.log('Removing from cart:', productSlug);
    State.setCart(State.cart.filter(item => item.slug !== productSlug));
    UI.showToast('Produit retiré du panier', 'info');
  },

  updateQuantity(productSlug, newQuantity) {
    console.log('Updating quantity:', productSlug, 'to:', newQuantity);
    
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
    console.log('Updating cart UI...');
    this.updateCartCount();
    this.updateCartList();
    this.updateMiniCart();
  },

  updateCartCount() {
    const count = State.cartCount;
    console.log('Updating cart count to:', count);
    
    const countElement = document.getElementById('dockCount');
    if (countElement) {
      if (count > 0) {
        countElement.textContent = count;
        countElement.style.display = 'block';
      } else {
        countElement.style.display = 'none';
      }
    }
    
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

  // FONCTION ULTRA-CORRIGÉE pour l'affichage du panier
  updateCartList() {
    const container = document.getElementById('devisList');
    if (!container) {
      console.error('Container devisList not found');
      return;
    }
    
    console.log('Updating cart list - items:', State.cart.length);
    console.log('Cart contents:', State.cart);
    
    // Vérifier que le container est visible
    const devisView = document.querySelector('[data-route="/devis"]');
    if (devisView && devisView.classList.contains('hidden')) {
      console.log('Devis view is hidden, skipping cart list update');
      return;
    }
    
    if (State.cart.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 40px 20px; color: var(--muted);">
          <h3 style="margin-bottom: 16px; color: var(--fg);">Votre panier est vide</h3>
          <p style="margin-bottom: 24px;">Découvrez nos produits et ajoutez-les à votre panier</p>
          <a href="#/catalogue" class="btn primary">Voir le catalogue</a>
        </div>
      `;
      console.log('Empty cart message displayed');
      return;
    }
    
    // CORRECTION MAJEURE: Générer le HTML de manière plus robuste
    const cartItemsHTML = State.cart.map((item, index) => {
      const slug = item.slug || `item-${index}`;
      const quantity = item.quantity || 1;
      const title = Utils.escapeHtml(item.title || 'Article');
      const price = typeof item.price === 'number' ? item.price : 0;
      const image = item.image || 'icons/icon-180.png';
      const brand = Utils.escapeHtml(item.brand || '');
      const lineTotal = (price * quantity).toFixed(2);
      
      return `
        <div class="cart-line" data-index="${index}" data-slug="${slug}" style="
          display: grid; 
          grid-template-columns: 56px 1fr auto; 
          gap: 0.6rem; 
          align-items: center;
          padding: 1rem;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 12px;
          margin-bottom: 0.5rem;
        ">
          <img alt="${title}" src="${image}" width="56" height="56" style="
            object-fit: cover; 
            border-radius: 8px; 
            border: 1px solid rgba(255,255,255,0.08);
          "/>
          <div>
            <div style="font-weight: 600; color: #fff;">${title}</div>
            ${brand ? `<div style="opacity: 0.8; color: #b8c5d1;">${brand}</div>` : ''}
            <div style="opacity: 0.8; color: #b8c5d1;">Prix: ${price.toFixed(2)}€</div>
          </div>
          <div style="display: grid; gap: 0.35rem; justify-items: end;">
            <div style="color: #fff; font-weight: 700;">${lineTotal}€</div>
            <label class="chip" style="display: inline-flex; align-items: center; gap: 0.4rem;">
              <span style="opacity: 0.85;">Qté</span>
              <input 
                type="number" 
                min="1" 
                value="${quantity}" 
                class="cart-qty-input" 
                data-slug="${slug}"
                style="
                  width: 64px; 
                  text-align: center; 
                  background: var(--card); 
                  border: 1px solid var(--border); 
                  border-radius: 4px; 
                  color: var(--fg); 
                  padding: 4px;
                " 
              />
            </label>
            <button 
              class="btn cart-remove-btn" 
              data-slug="${slug}"
              style="font-size: 12px; padding: 0.3rem 0.5rem;"
            >
              Retirer
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    // Calcul des totaux
    const totalHT = State.cartTotal;
    const totalTTC = totalHT * 1.20;
    
    const totalHTML = `
      <div style="
        margin-top: 20px; 
        padding: 20px; 
        background: rgba(139, 92, 246, 0.15); 
        border-radius: 12px; 
        border: 2px solid rgba(139, 92, 246, 0.3);
      ">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #fff;">
          <span>Total HT:</span>
          <span style="font-size: 18px; font-weight: 600; color: var(--brand);">${totalHT.toFixed(2)}€</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid rgba(139, 92, 246, 0.3); color: #fff;">
          <span>Total TTC (20% TVA):</span>
          <span style="font-size: 20px; font-weight: 700; color: var(--brand);">${totalTTC.toFixed(2)}€</span>
        </div>
        <div style="margin-top: 12px; font-size: 12px; color: var(--muted);">
          ${State.cartCount} article${State.cartCount > 1 ? 's' : ''} dans votre panier
        </div>
      </div>
    `;
    
    // CORRECTION: Injecter le HTML et binder les événements
    container.innerHTML = cartItemsHTML + totalHTML;
    
    // CORRECTION MAJEURE: Binding robuste des événements
    this.bindCartItemEvents(container);
    
    console.log('Cart list rendered successfully with', State.cart.length, 'items');
  },

  // NOUVELLE MÉTHODE: Binding séparé et robuste des événements
  bindCartItemEvents(container) {
    console.log('Binding cart item events...');
    
    // Événements pour les inputs de quantité
    const qtyInputs = container.querySelectorAll('.cart-qty-input');
    qtyInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const slug = e.target.dataset.slug;
        const newQty = Math.max(1, parseInt(e.target.value) || 1);
        console.log('Quantity changed for', slug, 'to', newQty);
        this.updateQuantity(slug, newQty);
      });
      
      input.addEventListener('blur', (e) => {
        // Corriger la valeur au cas où
        if (!e.target.value || parseInt(e.target.value) < 1) {
          e.target.value = 1;
        }
      });
    });
    
    // Événements pour les boutons de suppression
    const removeButtons = container.querySelectorAll('.cart-remove-btn');
    removeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const slug = e.target.dataset.slug;
        console.log('Remove button clicked for', slug);
        this.removeFromCart(slug);
      });
    });
    
    console.log('Cart item events bound:', qtyInputs.length, 'qty inputs,', removeButtons.length, 'remove buttons');
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
    let message = 'Demande de devis - Pirates Tools\n\n';
    
    State.cart.forEach((item, index) => {
      message += `${index + 1}. ${item.title}\n`;
      message += `   Quantité: ${item.quantity}\n`;
      message += `   Prix unitaire HT: ${item.price}€\n\n`;
    });
    
    message += `Total HT: ${State.cartTotal.toFixed(2)}€\n`;
    message += `Total TTC: ${(State.cartTotal * 1.20).toFixed(2)}€\n\n`;
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
};

// ===========================================
// 6. AUTH SYSTEM
// ===========================================

const AuthManager = {
  init() {
    this.loadUserFromStorage();
    this.bindAuthEvents();
  },

  bindAuthEvents() {
    const loginTab = document.getElementById('authLoginTab');
    const registerTab = document.getElementById('authRegisterTab');
    
    if (loginTab) {
      loginTab.addEventListener('click', () => this.showLoginForm());
    }
    
    if (registerTab) {
      registerTab.addEventListener('click', () => this.showRegisterForm());
    }
    
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }
    
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }
    
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
    delete userCopy.password;
    
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
};

// ===========================================
// 7. UI COMPONENTS
// ===========================================

const UI = {
  Menu: {
    isOpen() {
      return !document.getElementById('side-menu')?.classList.contains('hidden');
    },

    open() {
      if (window.__ptMenuUnified) return;
      
      const menu = document.getElementById('side-menu');
      const backdrop = document.getElementById('menuBackdrop');
      
      if (menu) menu.classList.remove('hidden');
      if (backdrop) backdrop.classList.remove('hidden');
    },
    
    close() {
      if (window.__ptMenuUnified) return;
      
      const menu = document.getElementById('side-menu');
      const backdrop = document.getElementById('menuBackdrop');
      
      if (menu) menu.classList.add('hidden');
      if (backdrop) backdrop.classList.add('hidden');
    }
  },

  showToast(message, type = 'info') {
    console.log('Toast:', message, type);
    
    if (typeof window.ptToast === 'function') {
      try {
        window.ptToast(message, type);
        return;
      } catch (error) {
        console.error('Error with ptToast:', error);
      }
    }
    
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
    
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100px)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  },

  updateInstallButton() {
    const installBtn = document.getElementById('installBtn');
    if (installBtn && PWAManager.canInstall()) {
      installBtn.classList.remove('hidden');
      installBtn.removeAttribute('hidden');
    }
  }
};

// ===========================================
// 8. ANIMATION CONTROLLER
// ===========================================

const Animation = {
  init() {
    this.bindScrollEvents();
    this.updateHeroLogo();
  },

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
    
    if (logo.dataset.jsControlled === 'false') return;
    
    if (State.currentRoute !== ROUTES.HOME) {
      logo.style.display = 'none';
      logo.classList.remove('on');
      logo.classList.add('hero-out');
      console.log('Logo hidden for route:', State.currentRoute);
      return;
    }
    
    logo.style.display = 'block';
    
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
};

// ===========================================
// 9. PDP (Product Detail Page) - CORRIGÉ
// ===========================================

const PDP = {
  render(product) {
    if (!product) return;

    this.updateProductImage(product);
    this.updateProductInfo(product);
    this.updateProductSpecs(product);
    this.bindProductActions(product);
    this.loadRelatedProducts(product);
    
    setTimeout(() => {
      this.fixAddToCartButton(product);
    }, 100);
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
    const waBtn = document.getElementById('pdpWa');
    const shareBtn = document.getElementById('pdpShare');
    
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

  fixAddToCartButton(product) {
    console.log('Fixing add to cart button for:', product.title);
    
    const button = document.getElementById('pdpQuote');
    
    if (!button) {
      console.log('Button not found, retrying...');
      setTimeout(() => this.fixAddToCartButton(product), 300);
      return;
    }
    
    console.log('Button found, applying fix...');
    
    // Neutraliser complètement
    button.removeAttribute('href');
    button.removeAttribute('data-nav');
    button.removeAttribute('data-action');
    button.removeAttribute('onclick');
    button.onclick = null;
    button.href = '';
    
    // Neutraliser parent si nécessaire
    let parentLink = button.closest('a');
    if (parentLink && parentLink !== button) {
      console.log('Parent link detected - neutralizing');
      parentLink.removeAttribute('href');
      parentLink.removeAttribute('data-nav');
      parentLink.onclick = null;
      parentLink.href = '#';
    }
    
    // Cloner pour supprimer tous les listeners
    const newButton = button.cloneNode(true);
    if (button.parentNode) {
      button.parentNode.replaceChild(newButton, button);
    }
    
    // Ajouter le listener unique
    setTimeout(() => {
      const finalButton = document.getElementById('pdpQuote');
      
      if (!finalButton) {
        console.error('Cannot get button after cloning');
        return;
      }
      
      finalButton.addEventListener('click', (e) => {
        console.log('Add to cart button clicked - blocking navigation');
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const currentRoute = State.currentRoute;
        const currentHash = window.location.hash;
        
        console.log('Adding product to cart:', product.slug);
        const success = CartManager.addToCart(product.slug);
        
        // Vérifier navigation
        setTimeout(() => {
          if (State.currentRoute !== currentRoute) {
            console.log('Navigation detected - correcting');
            State.setRoute(currentRoute);
            window.location.hash = currentHash;
          }
        }, 50);
        
        if (success) {
          const originalText = finalButton.textContent;
          finalButton.textContent = 'Ajouté au panier !';
          finalButton.style.cssText += 'background-color: #00e1b4 !important; color: white !important;';
          
          const dock = document.getElementById('dockCartBtn');
          if (dock) {
            dock.style.cssText += 'transform: scale(1.1); transition: transform 0.2s;';
            setTimeout(() => {
              dock.style.transform = '';
            }, 200);
          }
          
          setTimeout(() => {
            finalButton.textContent = originalText;
            finalButton.style.backgroundColor = '';
            finalButton.style.color = '';
          }, 2500);
          
          console.log('Product added - no navigation');
        }
        
        return false;
        
      }, { capture: true, passive: false });
      
      console.log('Fixed button ready');
      
    }, 100);
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
};

// ===========================================
// 10. PWA MANAGER
// ===========================================

const PWAManager = {
  deferredPrompt: null,

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
};

// ===========================================
// UTILITIES
// ===========================================

const Utils = {
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

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
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"');
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
};

// ===========================================
// INITIALIZATION
// ===========================================

const App = {
  async init() {
    try {
      console.log('Pirates Tools App v2.1 FIXED - Initialization...');
      console.log('DOM ready state:', document.readyState);

      const criticalElements = [
        'view-home', 'view-catalogue', 'view-produit', 'view-devis', 'view-compte', 'view-auth',
        'dockCartBtn', 'devisList'
      ];
      
      criticalElements.forEach(id => {
        const el = document.getElementById(id);
        console.log(`Element ${id}:`, el ? 'found' : 'NOT FOUND');
      });
      
      PWAManager.init();
      Router.init();
      AuthManager.init();
      CartManager.init();
      Animation.init();
      
      await ProductManager.init();
      
      this.bindGlobalEvents();
      
      console.log('Cart after init:', State.cart);
      console.log('Cart count after init:', State.cartCount);
      
      console.log('Application ready!');
      
    } catch (error) {
      console.error('Initialization error:', error);
      console.error('Error stack:', error.stack);
      UI.showToast('Erreur de chargement de l\'application', 'error');
    }
  },

  bindGlobalEvents() {
    console.log('Binding global events...');
    
    document.addEventListener('click', (e) => {
      if (e.target.id === 'pdpQuote' || e.target.closest('#pdpQuote')) {
        return;
      }
      
      const navEl = e.target.closest('[data-nav]');
      if (navEl && navEl.id !== 'pdpQuote') {
        console.log('Navigation via data-nav to:', navEl.dataset.nav);
        e.preventDefault();
        const route = navEl.dataset.nav;
        window.location.hash = '#' + route;
      }
    });
    
    document.addEventListener('click', (e) => {
      if (e.target.id === 'pdpQuote' || e.target.closest('#pdpQuote')) {
        return;
      }
      
      const actionEl = e.target.closest('[data-action]');
      if (actionEl && actionEl.id !== 'pdpQuote') {
        console.log('Global action triggered:', actionEl.dataset.action);
        e.preventDefault();
        this.handleGlobalAction(actionEl.dataset.action, actionEl);
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (UI.Menu && UI.Menu.isOpen()) {
          UI.Menu.close();
        }
      }
    });
    
    window.addEventListener('online', () => {
      UI.showToast('Connexion rétablie', 'success');
    });
    
    window.addEventListener('offline', () => {
      UI.showToast('Mode hors ligne', 'warning');
    });
  },

  handleGlobalAction(action, element) {
    console.log('Global action:', action);
    
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
        if (element.type !== 'submit') {
          AuthManager.handleLogin(new Event('submit'));
        }
        break;
        
      case 'register':
        if (element.type !== 'submit') {
          AuthManager.handleRegister(new Event('submit'));
        }
        break;
        
      case 'account-save':
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
        console.warn('Unknown action:', action);
    }
  }
};

// ===========================================
// EXPORT & START
// ===========================================

window.PiratesTools = {
  _initialized: false,
  _initPromise: null,

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
    
    const testProduct = {
      slug: 'test-product-' + Date.now(),
      title: 'Produit de Test',
      price: 99.99,
      image: null,
      tag: 'Test',
      description: 'Produit de test pour vérifier le panier'
    };
    
    if (State.products) {
      State.products.push(testProduct);
    } else {
      State.products = [testProduct];
    }
    
    console.log('Test product created:', testProduct);
    return this.addToCart(testProduct.slug);
  },

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
      Object.assign(this, App);
    }).catch(error => {
      console.error('PiratesTools initialization failed:', error);
      throw error;
    });
    
    return this._initPromise;
  }
};

window.debugPiratesTools = () => {
  console.log('=== PIRATES TOOLS DEBUG ===');
  console.log('Initialized:', window.PiratesTools._initialized);
  console.log('State:', State);
  console.log('Cart in localStorage:', localStorage.getItem('cart'));
  console.log('Cart in pt_cart:', localStorage.getItem('pt_cart'));
  console.log('Current route:', State.currentRoute);
  console.log('Products loaded:', State.products?.length || 0);
  console.log('Available methods:', Object.keys(window.PiratesTools));
  console.log('============================');
};

function startApp() {
  console.log('Starting Pirates Tools App...');
  console.log('Document ready state:', document.readyState);

  window.PiratesTools.init().catch(error => {
    console.error('App initialization failed:', error);
    
    setTimeout(() => {
      console.log('Retrying app initialization...');
      window.PiratesTools.init().catch(retryError => {
        console.error('App initialization retry failed:', retryError);
      });
    }, 2000);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else if (document.readyState === 'interactive') {
  setTimeout(startApp, 100);
} else {
  startApp();
}

// ========== BANNIÈRE OUTILS 3D ==========

let toolsData = [];
let currentTool = null;
let scene, camera, renderer, controls;
let toolModel = null;

async function loadToolsData() {
    try {
        const response = await fetch('models/tools.json');
        const data = await response.json();
        toolsData = data.tools;
        renderToolsBanner();
    } catch (error) {
        console.error('Error loading tools.json:', error);
        showFallbackBanner();
    }
}

function renderToolsBanner() {
    const bannerContainer = document.getElementById('tools-banner');
    if (!bannerContainer) return;

    const toolsGrid = bannerContainer.querySelector('.tools-grid');
    if (!toolsGrid) return;

    toolsGrid.innerHTML = '';

    toolsData.forEach(tool => {
        const toolCard = createToolCard(tool);
        toolsGrid.appendChild(toolCard);
    });

    initScrollControls();
}

function createToolCard(tool) {
    const card = document.createElement('div');
    card.className = `tool-card ${!tool.available ? 'unavailable' : ''}`;
    card.dataset.toolId = tool.id;

    card.innerHTML = `
        <div class="tool-preview">
            <img src="${tool.thumbnail}" alt="${tool.name}" loading="lazy">
            <div class="tool-3d-icon">3D</div>
        </div>
        <div class="tool-info">
            <h3>${tool.name}</h3>
            <p>${tool.description}</p>
            <span class="tool-category">${tool.category}</span>
        </div>
    `;

    if (tool.available) {
        card.addEventListener('click', () => {
            openTool3DViewer(tool);
        });
    }

    return card;
}

function initScrollControls() {
    const container = document.querySelector('.tools-scroll-container');
    const grid = document.querySelector('.tools-grid');
    const leftBtn = document.querySelector('.scroll-left');
    const rightBtn = document.querySelector('.scroll-right');

    if (!container || !grid || !leftBtn || !rightBtn) return;

    const scrollAmount = 300;

    leftBtn.addEventListener('click', () => {
        grid.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });

    rightBtn.addEventListener('click', () => {
        grid.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });

    function updateScrollButtons() {
        const isAtStart = grid.scrollLeft <= 0;
        const isAtEnd = grid.scrollLeft >= grid.scrollWidth - grid.clientWidth;
        
        leftBtn.style.opacity = isAtStart ? '0.5' : '1';
        rightBtn.style.opacity = isAtEnd ? '0.5' : '1';
        leftBtn.style.pointerEvents = isAtStart ? 'none' : 'auto';
        rightBtn.style.pointerEvents = isAtEnd ? 'none' : 'auto';
    }

    grid.addEventListener('scroll', updateScrollButtons);
    updateScrollButtons();
}

function openTool3DViewer(tool) {
    currentTool = tool;
    createTool3DModal(tool);
    setTimeout(() => {
        initThreeJS(tool);
    }, 100);
}

function createTool3DModal(tool) {
    const existingModal = document.getElementById('tool-3d-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'tool-3d-modal';
    modal.className = 'tool-3d-modal';
    
    modal.innerHTML = `
        <div class="tool-3d-backdrop"></div>
        <div class="tool-3d-container">
            <div class="tool-3d-header">
                <h2>${tool.name}</h2>
                <button class="tool-3d-close">&times;</button>
            </div>
            <div class="tool-3d-viewport" id="tool-3d-viewport">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Chargement du modèle 3D...</p>
                </div>
            </div>
            <div class="tool-3d-controls">
                <div class="tool-info-details">
                    <p><strong>Catégorie:</strong> ${tool.category}</p>
                    <p><strong>Description:</strong> ${tool.description}</p>
                    <p><strong>Disponibilité:</strong> ${tool.available ? 'Disponible' : 'Non disponible'}</p>
                </div>
                <div class="tool-3d-actions">
                    <button class="btn btn-primary">Réserver cet outil</button>
                    <button class="btn" onclick="resetCamera()">Réinitialiser vue</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    modal.querySelector('.tool-3d-close').addEventListener('click', closeTool3DModal);
    modal.querySelector('.tool-3d-backdrop').addEventListener('click', closeTool3DModal);
    
    document.addEventListener('keydown', handleModalKeydown);
    
    requestAnimationFrame(() => {
        modal.classList.add('open');
    });
}

function closeTool3DModal() {
    const modal = document.getElementById('tool-3d-modal');
    if (!modal) return;

    modal.classList.remove('open');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleModalKeydown);

    if (renderer) {
        renderer.dispose();
        renderer = null;
    }
    if (scene) {
        scene.clear();
        scene = null;
    }
    
    setTimeout(() => {
        modal.remove();
    }, 300);
}

function handleModalKeydown(e) {
    if (e.key === 'Escape') {
        closeTool3DModal();
    }
}

async function initThreeJS(tool) {
    const viewport = document.getElementById('tool-3d-viewport');
    if (!viewport) return;

    try {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0f14);

        camera = new THREE.PerspectiveCamera(
            75,
            viewport.clientWidth / viewport.clientHeight,
            0.1,
            1000
        );
        camera.position.set(0, 0, 5);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(viewport.clientWidth, viewport.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        if (typeof THREE.OrbitControls !== 'undefined') {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.1;
        }

        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        const pointLight = new THREE.PointLight(0x8B5CF6, 0.5, 100);
        pointLight.position.set(-10, -10, -10);
        scene.add(pointLight);

        viewport.innerHTML = '';
        viewport.appendChild(renderer.domElement);

        await loadTool3DModel(tool);
        animate();

    } catch (error) {
        console.error('Three.js initialization error:', error);
        showModelError(viewport);
    }
}

async function loadTool3DModel(tool) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.GLTFLoader();
        
        loader.load(
            tool.model,
            (gltf) => {
                toolModel = gltf.scene;
                
                const box = new THREE.Box3().setFromObject(toolModel);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                toolModel.position.x = -center.x;
                toolModel.position.y = -center.y;
                toolModel.position.z = -center.z;
                
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 2 / maxDim;
                toolModel.scale.setScalar(scale);
                
                toolModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                scene.add(toolModel);
                resolve();
            },
            (progress) => {
                console.log('Loading:', (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.error('Model loading error:', error);
                reject(error);
            }
        );
    });
}

function animate() {
    if (!renderer || !scene || !camera) return;
    
    requestAnimationFrame(animate);
    
    if (controls) {
        controls.update();
    }
    
    if (toolModel) {
        toolModel.rotation.y += 0.005;
    }
    
    renderer.render(scene, camera);
}

function resetCamera() {
    if (camera && controls) {
        camera.position.set(0, 0, 5);
        controls.reset();
    }
}

function handleResize() {
    const viewport = document.getElementById('tool-3d-viewport');
    if (!viewport || !camera || !renderer) return;
    
    camera.aspect = viewport.clientWidth / viewport.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
}

function showModelError(viewport) {
    viewport.innerHTML = `
        <div class="model-error">
            <p>❌ Erreur de chargement du modèle 3D</p>
            <p>Vérifiez que le fichier existe et est au bon format</p>
        </div>
    `;
}

function showFallbackBanner() {
    const bannerContainer = document.getElementById('tools-banner');
    if (!bannerContainer) return;
    
    bannerContainer.innerHTML = `
        <h2>Nos Outils Professionnels</h2>
        <div class="tools-scroll-container">
            <p class="empty">Chargement des outils 3D...</p>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.classList.contains('page-home')) {
        loadToolsData();
    }
});

window.addEventListener('resize', handleResize);

})();
