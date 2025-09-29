# RAPPORT DIAGNOSTIC COMPLET - Pirates Tools App

## 1. STRUCTURE DU PROJET

```
📁 Racine du projet
  📄 404.html
  📄 CHANGELOG.md
  📄 README.txt
  📄 app.js
  📄 index.html
  📄 manifest.webmanifest
  📄 package.json
  📄 products.json
  📄 robots.txt
  📄 server.log
  📄 sitemap.xml
  📄 styles.css
  📄 sw.js
  📁 docs/
  📁 icons/
  📁 images/
  📁 models/
  📁 scripts/
```

### Fichiers principaux identifiés :

-   **HTML principal** : `index.html`
-   **JavaScript principal** : `app.js`
-   **CSS principal** : `styles.css`
-   **Fichiers JS/CSS secondaires** : Il y a des scripts et des styles inline dans `index.html`, ainsi que des scripts chargés depuis un CDN (Three.js).

## 2. CODE JAVASCRIPT

### 2.1 app.js - Lignes 1-50

```javascript
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
heroState: 'active' // active, transitioning, hidden
};
```

### 2.2 Système Panier actuel

-   **Ajout au panier** : La fonction `addToCart` dans `CartManager` ajoute des produits à `State.cart`.
-   **Sauvegarde** : La fonction `saveCartToStorage` sauvegarde le panier dans deux clés `localStorage` : `cart` et `pt_cart`.
-   **Affichage** : La fonction `updateCartList` génère le HTML du panier et l'insère dans `#devisList`.
-   **Fonctions principales** : `addToCart`, `removeFromCart`, `updateQuantity`, `clearCart`, `updateCartUI`, `saveCartToStorage`, `loadCartFromStorage`.

### 2.3 Événements et listeners

-   `window.addEventListener('hashchange', ...)`
-   `window.addEventListener('popstate', ...)`
-   `document.getElementById('dockCartBtn').addEventListener('click', ...)`
-   `document.getElementById('devisSend').addEventListener('click', ...)`
-   `document.getElementById('devisClear').addEventListener('click', ...)`
-   `document.getElementById('q').addEventListener('input', ...)`
-   `document.getElementById('tag').addEventListener('change', ...)`
-   `document.getElementById('pdpQuote').addEventListener('click', ...)`

### 2.4 Guillemets typographiques détectés

Des guillemets typographiques ont été trouvés dans `app.js` (maintenant corrigés), notamment dans les `console.log` et les chaînes de caractères.

## 3. STRUCTURE HTML

### 3.1 Section Hero

```html
<section id="hero" class="hero-full" aria-hidden="true">
  <div class="hero-logo-container initial" id="heroLogoContainer">
    <img
      id="heroLogo"
      class="hero-logo on"
      alt="Pirates Tools"
      src="icons/icon-512.png"
      srcset="icons/icon-256.png 256w, icons/icon-384.png 384w, icons/icon-512.png 512w"
      sizes="(max-width: 768px) 90vw, 60vw"
      width="600" height="600"
      decoding="async" loading="eager" fetchpriority="high" />
  </div>
</section>
```

### 3.2 Conteneur panier

-   Le conteneur principal du panier est `<div id="devisList" ...></div>` dans la section `#view-devis`.
-   Un mini-panier est également présent dans la section `#view-compte` : `<div id="accCartMini" ...></div>`.

### 3.3 Boutons “Ajouter au panier”

-   Dans le catalogue (`#list`), les boutons sont générés dynamiquement avec `onclick="CartManager.addToCart('${product.slug}')"`.
-   Sur la page produit (`#view-produit`), le bouton est `<button id="pdpQuote" ...>`.

### 3.4 Boutons navigation vers le panier

-   Menu latéral : `<a href="#/devis" ...>`
-   Dock en bas : `<button id="dockCartBtn" ... data-nav="/devis">`
-   Page compte : `<a class="btn" href="#/devis" data-nav="/devis">`

## 4. STYLES CSS

### 4.1 Animation hero

```css
#hero, .hero-full {
    position: sticky;
    top: 0;
    height: 100vh;
    display: grid;
    place-items: center;
    pointer-events: none;
    background: transparent;
    z-index: 10;
    overflow: visible;
}

#heroLogo, .hero-logo {
    position: relative;
    z-index: 11;
    display: block;
    margin: 0 auto;
    width: clamp(256px, 60vmin, 800px);
    max-width: min(90vw, 800px);
    height: auto;
    aspect-ratio: 1 / 1;
    object-fit: contain;
    transform-origin: 50% 50%;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease;
    will-change: transform, opacity;
    opacity: 0;
    transform: scale(0.95) translateY(20px);
}

#heroLogo.on, .hero-logo.on {
    opacity: 1;
    transform: scale(1) translateY(0);
}
```

### 4.2 Z-index hiérarchie

-   `.topbar`: `z-index: 1000`
-   `.drawer`: `z-index: 999`
-   `#hero`: `z-index: 10`
-   `#heroLogo`: `z-index: 11`
-   `.list`: `z-index: 10`

### 4.3 Overflow et hauteurs

-   `#hero`: `height: 100vh`, `overflow: visible`

### 4.4 Logo en fond d’écran

La règle `body::before` qui affichait le logo en arrière-plan a été identifiée et supprimée.

### 4.5 Styles du panier

```css
#devisList .card .btn { padding: .45rem .7rem; }
```

## 5. ERREURS CONSOLE

-   **Erreurs JavaScript** : `SyntaxError: Invalid or unexpected token` à cause des guillemets typographiques.
-   **Avertissements** : `Cart is undefined or not an array`, `Container devisList non trouvé`.

## 6. FONCTIONNALITÉS ATTENDUES VS RÉELLES

### A. Animation hero

-   **Attendu** : Logo centré, grossit, passe au-dessus des bulles, disparaît en fondu.
-   **Actuel** : Logo mal positionné, animation saccadée, disparaît brusquement.

### B. Système panier

-   **Attendu** : Panier persistant, centralisé, accessible depuis plusieurs boutons.
-   **Actuel** : Panier non persistant, données incohérentes, boutons "Ajouter au panier" non fonctionnels.

### C. Navigation

-   **Attendu** : Chaque nouvelle page s'affiche en haut.
-   **Actuel** : La position de défilement est conservée entre les pages.

## 7. DÉPENDANCES ET BIBLIOTHÈQUES

-   **Three.js** (r128)
-   **OrbitControls.js**
-   **GLTFLoader.js**

## 8. RECOMMANDATIONS PRIORITAIRES

1.  **Corriger les erreurs de syntaxe JavaScript** dans `app.js` pour rendre le script exécutable.
2.  **Unifier la gestion du panier** pour utiliser une seule clé `localStorage` et réparer les boutons.
3.  **Corriger l'animation du logo** en ajustant le CSS et en supprimant les scripts conflictuels.
4.  **Ajouter le `scrollToTop`** à la navigation.
5.  **Supprimer le logo d'arrière-plan** et l'espacement excessif.