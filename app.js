/* Pirates Tools PWA - Application principale optimisée
- Version: 2.0
- Compatible avec HTML/CSS existant. */

(function() {
'use strict';

/* ===========================================
1. CONSTANTS & CONFIG
=========================================== */

const CONFIG = {
    API_BASE: window.location.origin + window.location.pathname.replace(/\/?$/, ''),
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
// 2. STATE MANAGEMENT
// ===========================================

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
    heroState: 'active' // active, transitioning, hidden
};

const State = window.State;

Object.assign(State, {
    get cartCount() {
        if (!this.cart || !Array.isArray(this.cart)) {
            console.warn('Cart is undefined or not an array, initializing empty cart');
            this.cart = [];
        }
        return this.cart.reduce((sum, item) => sum + (item.quantity || item.qty || 0), 0);
    },

    get cartTotal() {
        if (!this.cart || !Array.isArray(this.cart)) {
            console.warn('Cart is undefined or not an array, initializing empty cart');
            this.cart = [];
        }
        return this.cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || item.qty || 0)), 0);
    },

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
        if (!Array.isArray(cart)) {
            console.error('setCart: cart must be an array, received:', typeof cart, cart);
            cart = [];
        }
        this.cart = cart;
        this.saveCartToStorage();
        this.notifyStateChange('cart', cart);
    },

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

    saveCartToStorage() {
        try {
            if (!Array.isArray(this.cart)) {
                console.warn('saveCartToStorage: cart is not an array, skipping save');
                return;
            }
            const cartData = {
                version: CONFIG.CACHE_VERSION,
                timestamp: Date.now(),
                items: this.cart
            };
            localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cartData));
            localStorage.removeItem('cart');
        } catch (error) {
            console.error('Failed to save cart:', error);
        }
    },

    loadCartFromStorage() {
        try {
            let cartItems = [];
            const storedCart = localStorage.getItem(STORAGE_KEYS.CART);

            if (storedCart) {
                const parsed = JSON.parse(storedCart);
                if (Array.isArray(parsed)) {
                    cartItems = parsed;
                } else if (parsed && Array.isArray(parsed.items)) {
                    cartItems = parsed.items;
                }
            } else {
                const oldFormat = localStorage.getItem('cart');
                if (oldFormat) {
                    const parsed = JSON.parse(oldFormat);
                    if (Array.isArray(parsed)) {
                        cartItems = parsed.map(item => ({
                            slug: item.key || item.slug,
                            title: item.title,
                            brand: item.brand || '',
                            price: item.price || 0,
                            quantity: item.qty || item.quantity || 1,
                            image: item.image
                        }));
                        this.cart = cartItems;
                        this.saveCartToStorage();
                    }
                }
            }
            this.cart = cartItems.filter(item => item && typeof item === 'object');
        } catch (error) {
            console.error('Failed to load cart:', error);
            this.cart = [];
        }
    }
});

State.loadCartFromStorage();
window.PiratesToolsState = State;

// ===========================================
// 3. ROUTER SYSTEM
// ===========================================

const Router = {
    init() {
        if (window.__ptRouterActive) return;
        if (window.syncViews || window.matchRoute) {
            this.integrateWithExistingRouter();
            return;
        }
        window.addEventListener('hashchange', this.handleHashChange.bind(this));
        window.addEventListener('popstate', this.handlePopState.bind(this));
        this.navigateToCurrentHash();
        window.__ptRouterActive = true;
    },

    integrateWithExistingRouter() {
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1) || '/';
            State.setRoute(hash);
            this.updateHeroState(hash);
            if (hash === '/devis') {
                setTimeout(() => CartManager.updateCartUI(), 100);
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
        let route = path ? `/${path}` : '/';
        if (route === '/produit' && params.length > 0) {
            this.navigateToProduct(params[0]);
        } else {
            this.navigateTo(route);
        }
    },

    navigateTo(route) {
        window.scrollTo(0, 0);
        if (this.requiresAuth(route) && !State.isAuthenticated) {
            this.redirectToAuth();
            return;
        }
        State.setRoute(route);
        this.updateViews(route);
        this.updateBodyClass(route);
        this.updateHeroState(route);
        if (route === ROUTES.DEVIS) {
            setTimeout(() => CartManager.updateCartUI(), 100);
        }
        if (UI.Menu.isOpen()) {
            UI.Menu.close();
        }
    },

    navigateToProduct(slug) {
        window.scrollTo(0, 0);
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
        document.querySelectorAll('.view').forEach(view => {
            const viewRoute = view.dataset.route;
            if (viewRoute === route) {
                view.classList.remove('hidden');
                if (route === ROUTES.DEVIS) {
                    setTimeout(() => CartManager.updateCartUI(), 50);
                }
                const h1 = view.querySelector('h1');
                if (h1) h1.focus();
            } else {
                view.classList.add('hidden');
            }
        });
    },

    updateBodyClass(route) {
        document.body.className = document.body.className.replace(/page-\w+/g, '').trim();
        const pageClass = `page-${route.slice(1) || 'home'}`;
        document.body.classList.add(pageClass);
    },

    updateHeroState(route) {
        const hero = document.getElementById('hero');
        const heroLogo = document.getElementById('heroLogo');
        const isHomePage = route === ROUTES.HOME;

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

    requiresAuth: route => route === ROUTES.COMPTE,
    redirectToAuth: () => window.location.hash = '#/auth'
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
                return;
            }
            State.isLoading = true;
            const response = await fetch(`${CONFIG.PRODUCTS_URL}?v=${CONFIG.CACHE_VERSION}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const products = await response.json();
            const enrichedProducts = products.map(product => ({
                ...product,
                slug: this.createSlug(product.title),
                searchText: this.createSearchText(product)
            }));
            State.setProducts(enrichedProducts);
            this.cacheProducts(enrichedProducts);
        } catch (error) {
            console.error('Erreur chargement produits:', error);
            UI.showToast('Erreur de chargement des produits', 'error');
            const cached = this.getCachedProducts();
            if (cached) State.setProducts(cached.products);
        } finally {
            State.isLoading = false;
        }
    },

    bindSearchEvents() {
        const searchInput = document.getElementById('q');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(e => this.handleSearch(e.target.value), CONFIG.DEBOUNCE_DELAY));
        }
        const tagSelect = document.getElementById('tag');
        if (tagSelect) {
            tagSelect.addEventListener('change', e => this.handleTagFilter(e.target.value));
            this.populateTagOptions();
        }
    },

    handleSearch: query => {
        State.searchQuery = query.toLowerCase().trim();
        ProductManager.filterProducts();
    },

    handleTagFilter: tag => {
        State.selectedTag = tag;
        ProductManager.filterProducts();
    },

    filterProducts() {
        let filtered = State.products;
        if (State.searchQuery) {
            filtered = filtered.filter(p => p.searchText.includes(State.searchQuery));
        }
        if (State.selectedTag) {
            filtered = filtered.filter(p => p.tag === State.selectedTag);
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
        container.innerHTML = State.filteredProducts.map(p => `
            <article class="card" data-key="${p.slug}">
                <div class="head">
                    <h3 class="title">${Utils.escapeHtml(p.title)}</h3>
                    ${p.tag ? `<span class="chip">${Utils.escapeHtml(p.tag)}</span>` : ''}
                </div>
                ${p.image ? `<img src="${p.image}" alt="${Utils.escapeHtml(p.title)}" loading="lazy">` : ''}
                ${p.description ? `<p class="desc">${Utils.escapeHtml(p.description)}</p>` : ''}
                <div class="actions">
                    <a class="btn primary" href="#/produit/${p.slug}">Voir détails</a>
                    <button class="btn" onclick="CartManager.addToCart('${p.slug}')">Ajouter</button>
                </div>
            </article>`).join('');
    },

    populateTagOptions() {
        const tagSelect = document.getElementById('tag');
        if (!tagSelect) return;
        const tags = [...new Set(State.products.map(p => p.tag).filter(Boolean))];
        tagSelect.innerHTML = '<option value="">Tous</option>' + tags.map(tag => `<option value="${tag}">${Utils.escapeHtml(tag)}</option>`).join('');
    },

    findBySlug: slug => State.products.find(p => p.slug === slug),

    createSlug(title) {
        if (!title) return 'unknown';
        return String(title).toLowerCase().trim()
            .replace(/[\u00C0-\u00C5]/g, 'a').replace(/[\u00C6]/g, 'ae').replace(/[\u00C7]/g, 'c')
            .replace(/[\u00C8-\u00CB]/g, 'e').replace(/[\u00CC-\u00CF]/g, 'i').replace(/[\u00D1]/g, 'n')
            .replace(/[\u00D2-\u00D6]/g, 'o').replace(/[\u00D9-\u00DC]/g, 'u').replace(/[\u00DD]/g, 'y')
            .replace(/[\u00E0-\u00E5]/g, 'a').replace(/[\u00E6]/g, 'ae').replace(/[\u00E7]/g, 'c')
            .replace(/[\u00E8-\u00EB]/g, 'e').replace(/[\u00EC-\u00EF]/g, 'i').replace(/[\u00F1]/g, 'n')
            .replace(/[\u00F2-\u00F6]/g, 'o').replace(/[\u00F9-\u00FC]/g, 'u').replace(/[\u00FD\u00FF]/g, 'y')
            .replace(/[\u2013\u2014]/g, '-').replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
    },

    createSearchText(product) {
        return [product.title, product.description, product.tag, product.brand, ...(product.specifications || [])]
            .filter(Boolean).join(' ').toLowerCase()
            .replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
            .replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
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
            localStorage.setItem(STORAGE_KEYS.PRODUCTS_CACHE, JSON.stringify({
                version: CONFIG.CACHE_VERSION,
                timestamp: Date.now(),
                products
            }));
        } catch (error) {
            console.error('Cache write error:', error);
        }
    }
};

// ===========================================
// 5. CART SYSTEM
// ===========================================

const CartManager = {
    init() {
        State.loadCartFromStorage();
        this.bindCartEvents();
        this.updateCartUI();
        State.subscribe('cart', () => this.updateCartUI());
    },

    bindCartEvents() {
        const cartBtn = document.getElementById('dockCartBtn');
        if (cartBtn) {
            const newCartBtn = cartBtn.cloneNode(true);
            cartBtn.parentNode.replaceChild(newCartBtn, cartBtn);
            newCartBtn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                window.location.hash = '#/devis';
            });
        }

        const sendBtn = document.getElementById('devisSend');
        if (sendBtn) sendBtn.addEventListener('click', e => {
            e.preventDefault();
            this.sendQuoteToWhatsApp();
        });

        const clearBtn = document.getElementById('devisClear');
        if (clearBtn) clearBtn.addEventListener('click', e => {
            e.preventDefault();
            this.clearCart();
        });
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
                brand: product.brand || product.tag || '',
                price: product.price || 0,
                image: product.image,
                quantity
            });
        }
        State.setCart([...State.cart]);
        UI.showToast(`${product.title} ajouté au panier`, 'success');
        this.pulseCartButton();
        return true;
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
        if (State.cartCount > 0 && confirm('Vider le panier ?')) {
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
            countElement.textContent = count;
            countElement.style.display = count > 0 ? 'block' : 'none';
        }
        const cartBtn = document.getElementById('dockCartBtn');
        if (cartBtn) {
            cartBtn.classList.toggle('has-badge', count > 0);
            cartBtn.dataset.badge = count;
        }
    },

    updateCartList() {
        const container = document.getElementById('devisList');
        if (!container) return;

        if (State.cart.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px 20px; color: var(--muted);">
                    <h3 style="margin-bottom: 16px; color: var(--fg);">Votre panier est vide</h3>
                    <p style="margin-bottom: 24px;">Découvrez nos produits et ajoutez-les à votre panier</p>
                    <a href="#/catalogue" class="btn primary">Voir le catalogue</a>
                </div>`;
            return;
        }

        const cartItemsHTML = State.cart.map((item, index) => {
            const { slug, title, brand, price, image, quantity: qty } = {
                slug: item.slug || `item-${index}`,
                title: item.title || 'Article',
                brand: item.brand || '',
                price: item.price || 0,
                image: item.image || 'icons/icon-180.png',
                quantity: item.quantity || 1
            };
            return `
                <div class="line" data-i="${index}" style="display: grid; grid-template-columns: 56px 1fr auto; gap: 0.6rem; align-items: center; padding: 1rem; background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; margin-bottom: 0.5rem;">
                    <img alt="" src="${image}" width="56" height="56" style="object-fit: cover; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);"/>
                    <div>
                        <div style="font-weight: 600; color: #fff;">${Utils.escapeHtml(title)}</div>
                        ${brand ? `<div style="opacity: 0.8; color: #b8c5d1;">${Utils.escapeHtml(brand)}</div>` : ''}
                        <div style="opacity: 0.8; color: #b8c5d1;">Prix: ${price.toFixed(2)}€</div>
                    </div>
                    <div style="display: grid; gap: 0.35rem; justify-items: end;">
                        <div style="color: #fff; font-weight: 700;">${(price * qty).toFixed(2)}€</div>
                        <label class="chip" style="display: inline-flex; align-items: center; gap: 0.4rem;">
                            <span style="opacity: 0.85;">Qté</span>
                            <input type="number" min="1" value="${qty}" class="qty" style="width: 64px; text-align: center; background: var(--card); border: 1px solid var(--border); border-radius: 4px; color: var(--fg); padding: 4px;" />
                        </label>
                        <button class="btn" data-action="rm" style="font-size: 12px; padding: 0.3rem 0.5rem;">Retirer</button>
                    </div>
                </div>`;
        }).join('');

        const totalHT = State.cartTotal;
        const totalTTC = totalHT * 1.20;
        const totalHTML = `
            <div style="margin-top: 20px; padding: 20px; background: rgba(139, 92, 246, 0.15); border-radius: 12px; border: 2px solid rgba(139, 92, 246, 0.3);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #fff;">
                    <span>Total HT:</span>
                    <span style="font-size: 18px; font-weight: 600; color: var(--brand);">${totalHT.toFixed(2)}€</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid rgba(139, 92, 246, 0.3); color: #fff;">
                    <span>Total TTC (20% TVA):</span>
                    <span style="font-size: 20px; font-weight: 700; color: var(--brand);">${totalTTC.toFixed(2)}€</span>
                </div>
                <div style="margin-top: 12px; font-size: 12px; color: var(--muted);">${State.cartCount} article${State.cartCount > 1 ? 's' : ''} dans votre panier</div>
            </div>`;

        container.innerHTML = cartItemsHTML + totalHTML;

        container.querySelectorAll('.line').forEach(row => {
            const i = +row.dataset.i || 0;
            const qtyInp = row.querySelector('.qty');
            if (qtyInp) {
                qtyInp.addEventListener('change', () => {
                    const newQty = Math.max(1, +qtyInp.value || 1);
                    if (State.cart[i]) {
                        State.cart[i].quantity = newQty;
                        State.cart[i].qty = newQty;
                        State.setCart([...State.cart]);
                    }
                });
            }
            const rmBtn = row.querySelector('[data-action="rm"]');
            if (rmBtn) {
                rmBtn.addEventListener('click', () => {
                    State.cart.splice(i, 1);
                    State.setCart([...State.cart]);
                });
            }
        });
    },

    updateMiniCart() {
        const miniText = document.getElementById('accCartMiniTxt');
        if (miniText) {
            const { cartCount, cartTotal } = State;
            miniText.textContent = `${cartCount} article${cartCount > 1 ? 's' : ''} — total ${cartTotal.toFixed(2)} €`;
        }
    },

    sendQuoteToWhatsApp() {
        if (State.cart.length === 0) {
            UI.showToast('Panier vide', 'warning');
            return;
        }
        const message = this.generateQuoteMessage();
        window.open(`https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    },

    generateQuoteMessage() {
        let message = 'Demande de devis - Pirates Tools\n\n';
        State.cart.forEach((item, index) => {
            message += `${index + 1}. ${item.title}\n   Quantité: ${item.quantity}\n   Prix unitaire HT: ${item.price}€\n\n`;
        });
        message += `Total HT: ${State.cartTotal.toFixed(2)}€\nTotal TTC: ${(State.cartTotal * 1.20).toFixed(2)}€\n\nMerci de me confirmer la disponibilité et les délais de livraison.`;
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
        document.getElementById('authLoginTab')?.addEventListener('click', () => this.showLoginForm());
        document.getElementById('authRegisterTab')?.addEventListener('click', () => this.showRegisterForm());
        document.getElementById('loginForm')?.addEventListener('submit', e => this.handleLogin(e));
        document.getElementById('registerForm')?.addEventListener('submit', e => this.handleRegister(e));
        document.getElementById('accountForm')?.addEventListener('submit', e => this.handleAccountUpdate(e));
    },

    showLoginForm() {
        document.getElementById('authLoginTab')?.setAttribute('aria-selected', 'true');
        document.getElementById('authRegisterTab')?.setAttribute('aria-selected', 'false');
        document.getElementById('authLogin').hidden = false;
        document.getElementById('authRegister').hidden = true;
    },

    showRegisterForm() {
        document.getElementById('authLoginTab')?.setAttribute('aria-selected', 'false');
        document.getElementById('authRegisterTab')?.setAttribute('aria-selected', 'true');
        document.getElementById('authLogin').hidden = true;
        document.getElementById('authRegister').hidden = false;
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
                State.setUser(JSON.parse(stored));
                this.updateAccountForm();
            }
        } catch (error) {
            console.error('Failed to load user:', error);
        }
    },

    updateAccountForm() {
        if (!State.user) return;
        document.getElementById('accName').value = State.user.name || '';
        document.getElementById('accEmail').value = State.user.email || '';
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
        const data = new TextEncoder().encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
};

// ===========================================
// 7. UI COMPONENTS
// ===========================================

const UI = {
    Menu: {
        isOpen: () => !document.getElementById('side-menu')?.classList.contains('hidden'),
        open() {
            if (window.__ptMenuUnified) return;
            document.getElementById('side-menu')?.classList.remove('hidden');
            document.getElementById('menuBackdrop')?.classList.remove('hidden');
        },
        close() {
            if (window.__ptMenuUnified) return;
            document.getElementById('side-menu')?.classList.add('hidden');
            document.getElementById('menuBackdrop')?.classList.add('hidden');
        }
    },

    showToast(message, type = 'info') {
        if (typeof window.ptToast === 'function') {
            try {
                window.ptToast(message, type);
                return;
            } catch (error) {
                console.error('Error with ptToast:', error);
            }
        }
        const toast = document.createElement('div');
        toast.style.cssText = `position: fixed; top: 80px; right: 20px; z-index: 1000; padding: 12px 20px; border-radius: 8px; color: white; font-size: 14px; max-width: 300px; word-wrap: break-word; background: ${type === 'error' ? '#ff6b6b' : type === 'success' ? '#00e1b4' : type === 'warning' ? '#ffd93d' : '#19d3ff'}; box-shadow: 0 4px 12px rgba(0,0,0,0.3); opacity: 0; transform: translateX(100px); transition: all 0.3s ease;`;
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            setTimeout(() => toast.remove(), 300);
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
        if (!logo || logo.dataset.jsControlled === 'false') return;

        if (State.currentRoute !== ROUTES.HOME) {
            logo.style.display = 'none';
            logo.classList.remove('on');
            logo.classList.add('hero-out');
            return;
        }

        logo.style.display = 'block';
        switch (State.heroState) {
            case 'active':
                logo.classList.add('on');
                logo.classList.remove('hero-out');
                break;
            case 'transitioning':
            case 'hidden':
                logo.classList.remove('on');
                logo.classList.add('hero-out');
                break;
        }
    }
};

// ===========================================
// 9. PDP (Product Detail Page)
// ===========================================

const PDP = {
    render(product) {
        if (!product) return;
        this.updateProductImage(product);
        this.updateProductInfo(product);
        this.updateProductSpecs(product);
        this.bindProductActions(product);
        this.loadRelatedProducts(product);
        setTimeout(() => this.fixAddToCartButton(product), 100);
    },

    updateProductImage({ image, title }) {
        const img = document.getElementById('pdpImg');
        if (img && image) {
            img.src = image;
            img.alt = title;
        }
    },

    updateProductInfo({ title, tag, description, price }) {
        document.getElementById('pdpTitle').textContent = title;
        document.getElementById('pdpTag').textContent = tag || '';
        document.getElementById('pdpDesc').textContent = description || '';
        if (price) {
            document.getElementById('pdpPrice').innerHTML = `<span class="price-ht">${price}€ HT</span> <span class="price-ttc">${(price * 1.20).toFixed(2)}€ TTC</span>`;
        }
    },

    updateProductSpecs({ specifications }) {
        const specs = document.getElementById('pdpSpecs');
        if (!specs) return;
        specs.innerHTML = specifications?.length > 0
            ? specifications.map(spec => `<li>${Utils.escapeHtml(spec)}</li>`).join('')
            : '';
    },

    bindProductActions(product) {
        const waBtn = document.getElementById('pdpWa');
        if (waBtn) {
            waBtn.href = `https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(`Bonjour, je suis intéressé par ce produit :\n${product.title}`)}`;
        }
        document.getElementById('pdpShare')?.addEventListener('click', e => {
            e.preventDefault();
            this.shareProduct(product);
        });
    },

    fixAddToCartButton(product) {
        const button = document.getElementById('pdpQuote');
        if (!button) return;
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            if (CartManager.addToCart(product.slug)) {
                const originalText = newButton.textContent;
                newButton.textContent = 'Ajouté !';
                newButton.style.backgroundColor = '#00e1b4';
                setTimeout(() => {
                    newButton.textContent = originalText;
                    newButton.style.backgroundColor = '';
                }, 2000);
            }
        });
    },

    async shareProduct({ title, description, slug }) {
        const shareData = {
            title,
            text: description,
            url: `${window.location.origin}${window.location.pathname}#/produit/${slug}`
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

    loadRelatedProducts({ tag, slug }) {
        const container = document.getElementById('pdpRelated');
        if (!container) return;
        const related = State.products.filter(p => p.tag === tag && p.slug !== slug).slice(0, 3);
        container.innerHTML = related.length > 0
            ? `<h3>Produits similaires</h3><div class="related-grid">${related.map(p => `
                <article class="related-card">
                    <a href="#/produit/${p.slug}">
                        ${p.image ? `<img src="${p.image}" alt="${Utils.escapeHtml(p.title)}" loading="lazy">` : ''}
                        <h4>${Utils.escapeHtml(p.title)}</h4>
                    </a>
                </article>`).join('')}</div>`
            : '';
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
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    },

    bindInstallEvents() {
        window.addEventListener('beforeinstallprompt', e => {
            e.preventDefault();
            this.deferredPrompt = e;
            UI.updateInstallButton();
        });
        document.getElementById('installBtn')?.addEventListener('click', () => this.installApp());
    },

    async installApp() {
        if (!this.deferredPrompt) return;
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        if (outcome === 'accepted') UI.showToast('Application installée', 'success');
        this.deferredPrompt = null;
        UI.updateInstallButton();
    },

    canInstall: () => !!PWAManager.deferredPrompt,

    updateAppVh() {
        const update = () => document.documentElement.style.setProperty('--app-vh', `${window.innerHeight * 0.01}px`);
        update();
        window.addEventListener('resize', Utils.debounce(update, 150));
    }
};

// ===========================================
// UTILITIES
// ===========================================

const Utils = {
    debounce(func, wait) {
        let timeout;
        return function(...args) {
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
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, wait);
            }
        };
    },

    escapeHtml(unsafe) {
        return unsafe?.toString()
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;") || '';
    },

    formatPrice: price => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price),
    generateId: () => Math.random().toString(36).substr(2, 9),
    isOnline: () => navigator.onLine
};

// ===========================================
// INITIALIZATION
// ===========================================

const App = {
    async init() {
        try {
            PWAManager.init();
            Router.init();
            AuthManager.init();
            CartManager.init();
            Animation.init();
            await ProductManager.init();
            this.bindGlobalEvents();
        } catch (error) {
            console.error("Erreur d'initialisation:", error);
            UI.showToast("Erreur de chargement de l'application", 'error');
        }
    },

    bindGlobalEvents() {
        document.addEventListener('click', e => {
            if (e.target.closest('#pdpQuote')) return;
            const navEl = e.target.closest('[data-nav]');
            if (navEl) {
                e.preventDefault();
                window.location.hash = `#${navEl.dataset.nav}`;
            }
            const actionEl = e.target.closest('[data-action]');
            if (actionEl) {
                e.preventDefault();
                this.handleGlobalAction(actionEl.dataset.action, actionEl);
            }
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && UI.Menu.isOpen()) {
                UI.Menu.close();
            }
        });
        window.addEventListener('online', () => UI.showToast('Connexion rétablie', 'success'));
        window.addEventListener('offline', () => UI.showToast('Mode hors ligne', 'warning'));
    },

    handleGlobalAction(action, element) {
        const actions = {
            'add-to-cart': () => CartManager.addToCart(element.dataset.product || State.currentProduct?.slug),
            'send-quote': () => CartManager.sendQuoteToWhatsApp(),
            'clear-cart': () => CartManager.clearCart(),
            'login': () => element.type !== 'submit' && AuthManager.handleLogin(new Event('submit')),
            'register': () => element.type !== 'submit' && AuthManager.handleRegister(new Event('submit')),
            'account-save': () => element.type !== 'submit' && AuthManager.handleAccountUpdate(new Event('submit')),
            'install': () => PWAManager.installApp(),
            'share': () => State.currentProduct && PDP.shareProduct(State.currentProduct)
        };
        actions[action] ? actions[action]() : console.warn('Action inconnue:', action);
    }
};

// ===========================================
// EXPORT & START
// ===========================================

window.PiratesTools = {
    _initialized: false,
    _initPromise: null,
    getState: () => State,
    navigateTo: route => Router.navigateTo ? Router.navigateTo(route) : (window.location.hash = `#${route}`),
    addToCart: (slug, quantity) => CartManager.addToCart ? CartManager.addToCart(slug, quantity) : false,
    updateCartQuantity: (slug, quantity) => CartManager.updateQuantity && CartManager.updateQuantity(slug, quantity),
    removeFromCart: slug => CartManager.removeFromCart && CartManager.removeFromCart(slug),
    showToast: (message, type) => UI.showToast(message, type),
    async init() {
        if (this._initialized) return this._initPromise;
        if (this._initPromise) return this._initPromise;
        this._initPromise = App.init().then(() => {
            this._initialized = true;
            Object.assign(this, App);
        }).catch(error => {
            console.error('PiratesTools initialization failed:', error);
            throw error;
        });
        return this._initPromise;
    }
};

function startApp() {
    window.PiratesTools.init().catch(() => setTimeout(startApp, 2000));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}

// ========== 3D TOOLS BANNER ==========
let toolsData = [];
let scene, camera, renderer, controls, toolModel;

async function loadToolsData() {
    try {
        const response = await fetch('models/tools.json');
        toolsData = (await response.json()).tools;
        renderToolsBanner();
    } catch (error) {
        console.error('Erreur chargement tools.json:', error);
        showFallbackBanner();
    }
}

function renderToolsBanner() {
    const bannerContainer = document.getElementById('tools-banner');
    const toolsGrid = bannerContainer?.querySelector('.tools-grid');
    if (!toolsGrid) return;
    toolsGrid.innerHTML = toolsData.map(tool => createToolCard(tool).outerHTML).join('');
    toolsGrid.querySelectorAll('.tool-card[data-tool-id]').forEach(card =>
        card.addEventListener('click', () => openTool3DViewer(toolsData.find(t => t.id === card.dataset.toolId)))
    );
    initScrollControls();
}

function createToolCard({ id, name, description, thumbnail, category, available }) {
    const card = document.createElement('div');
    card.className = `tool-card ${!available ? 'unavailable' : ''}`;
    card.dataset.toolId = id;
    card.innerHTML = `
        <div class="tool-preview">
            <img src="${thumbnail}" alt="${name}" loading="lazy">
            <div class="tool-3d-icon">3D</div>
        </div>
        <div class="tool-info">
            <h3>${name}</h3>
            <p>${description}</p>
            <span class="tool-category">${category}</span>
        </div>`;
    return card;
}

function initScrollControls() {
    const grid = document.querySelector('.tools-grid');
    const leftBtn = document.querySelector('.scroll-left');
    const rightBtn = document.querySelector('.scroll-right');
    if (!grid || !leftBtn || !rightBtn) return;
    const scrollAmount = 300;
    leftBtn.addEventListener('click', () => grid.scrollBy({ left: -scrollAmount, behavior: 'smooth' }));
    rightBtn.addEventListener('click', () => grid.scrollBy({ left: scrollAmount, behavior: 'smooth' }));
    const updateButtons = () => {
        const atStart = grid.scrollLeft <= 0;
        const atEnd = grid.scrollLeft >= grid.scrollWidth - grid.clientWidth;
        leftBtn.style.opacity = atStart ? '0.5' : '1';
        rightBtn.style.opacity = atEnd ? '0.5' : '1';
        leftBtn.style.pointerEvents = atStart ? 'none' : 'auto';
        rightBtn.style.pointerEvents = atEnd ? 'none' : 'auto';
    };
    grid.addEventListener('scroll', updateButtons);
    updateButtons();
}

function openTool3DViewer(tool) {
    createTool3DModal(tool);
    setTimeout(() => initThreeJS(tool), 100);
}

function createTool3DModal(tool) {
    document.getElementById('tool-3d-modal')?.remove();
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
                <div class="loading-spinner"><div class="spinner"></div><p>Chargement du modèle 3D...</p></div>
            </div>
            <div class="tool-3d-controls">
                <div class="tool-info-details">
                    <p><strong>Catégorie:</strong> ${tool.category}</p>
                    <p><strong>Description:</strong> ${tool.description}</p>
                    <p><strong>Disponibilité:</strong> ${tool.available ? 'Disponible' : 'Non disponible'}</p>
                </div>
                <div class="tool-3d-actions">
                    <button class="btn btn-primary">Réserver cet outil</button>
                    <button class="btn" id="reset-camera-btn">Réinitialiser vue</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    modal.querySelector('.tool-3d-close').addEventListener('click', closeTool3DModal);
    modal.querySelector('.tool-3d-backdrop').addEventListener('click', closeTool3DModal);
    document.getElementById('reset-camera-btn').addEventListener('click', resetCamera);
    document.addEventListener('keydown', handleModalKeydown);
    requestAnimationFrame(() => modal.classList.add('open'));
}

function closeTool3DModal() {
    const modal = document.getElementById('tool-3d-modal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleModalKeydown);
    renderer?.dispose();
    scene?.clear();
    renderer = scene = null;
    setTimeout(() => modal.remove(), 300);
}

const handleModalKeydown = e => e.key === 'Escape' && closeTool3DModal();

async function initThreeJS(tool) {
    const viewport = document.getElementById('tool-3d-viewport');
    if (!viewport) return;
    try {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0f14);
        camera = new THREE.PerspectiveCamera(75, viewport.clientWidth / viewport.clientHeight, 0.1, 1000);
        camera.position.set(0, 0, 5);
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(viewport.clientWidth, viewport.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        if (typeof THREE.OrbitControls !== 'undefined') {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
        }
        scene.add(new THREE.AmbientLight(0x404040, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 10, 5);
        dirLight.castShadow = true;
        scene.add(dirLight, new THREE.PointLight(0x8B5CF6, 0.5, 100));
        viewport.innerHTML = '';
        viewport.appendChild(renderer.domElement);
        await loadTool3DModel(tool);
        animate();
    } catch (error) {
        console.error('Erreur initialisation Three.js:', error);
        showModelError(viewport);
    }
}

async function loadTool3DModel(tool) {
    return new Promise((resolve, reject) => {
        new THREE.GLTFLoader().load(tool.model, gltf => {
            toolModel = gltf.scene;
            const box = new THREE.Box3().setFromObject(toolModel);
            const center = box.getCenter(new THREE.Vector3());
            toolModel.position.sub(center);
            const scale = 2 / box.getSize(new THREE.Vector3()).length();
            toolModel.scale.setScalar(scale);
            toolModel.traverse(child => { if (child.isMesh) child.castShadow = child.receiveShadow = true; });
            scene.add(toolModel);
            resolve();
        }, undefined, reject);
    });
}

function animate() {
    if (!renderer || !scene || !camera) return;
    requestAnimationFrame(animate);
    controls?.update();
    if (toolModel) toolModel.rotation.y += 0.005;
    renderer.render(scene, camera);
}

function resetCamera() {
    if (camera && controls) {
        camera.position.set(0, 0, 5);
        controls.reset();
    }
}

const handleResize = () => {
    const viewport = document.getElementById('tool-3d-viewport');
    if (viewport && camera && renderer) {
        camera.aspect = viewport.clientWidth / viewport.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    }
};

const showModelError = viewport => viewport.innerHTML = `<div class="model-error"><p>❌ Erreur de chargement du modèle 3D</p><p>Vérifiez que le fichier existe et est au bon format</p></div>`;
const showFallbackBanner = () => {
    const banner = document.getElementById('tools-banner');
    if(banner) banner.innerHTML = `<h2>Nos Outils Professionnels</h2><div class="tools-scroll-container"><p class="empty">Chargement des outils 3D...</p></div>`;
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.classList.contains('page-home')) loadToolsData();
});

window.addEventListener('resize', handleResize);

})();
