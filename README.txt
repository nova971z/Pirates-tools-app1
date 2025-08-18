/ (racine du site)
├─ index.html                   (structure des vues + router anchors)
├─ styles.css                   (thème, hero, topbar, cartes, PDP, dock)
├─ app.js                       (logique : produits, panier, PDP, router, PWA)
├─ products.json                (données produits — voir schéma ci-dessous)
├─ sw.js                        (service worker : cache hors-ligne)
├─ manifest.webmanifest         (manifest PWA : nom/icônes)
├─ /images/
│   ├─ pirates-tools-logo.webp
│   ├─ pirates-tools-logo.png
│   └─ /products/               ← images produits (à créer si absent)
│       ├─ DCF887.png
│       ├─ DCF887P2.png
│       ├─ DCF850.png
│       └─ ... (voir §3)
└─ /icons/
    └─ icon-180.png             (icône iOS/Android)
