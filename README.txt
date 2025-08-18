/************************************************************
 P I R A T E S   T O O L S  —  P W A   (HTML/CSS/JS pur)
 Boutique légère des visseuses à chocs DeWALT.
 - Liste + recherche + catégories auto
 - Fiche produit (PDP) avec descriptif + tableau “Caractéristiques”
 - Panier/Devis persistant (localStorage) + envoi WhatsApp
 - Router hash (#/produit/:id, #/catalogue, #/devis, #/compte)
 - PWA complète : manifest + service worker + offline cache
*************************************************************/


1) STRUCTURE DU PROJET
──────────────────────
/ (racine du site)
├─ index.html                   (vues + topbar + dock + sections router)
├─ styles.css                   (thème, hero, cartes, PDP, dock)
├─ app.js                       (logique : produits, filtres, panier, router)
├─ products.json                (données produits — voir §3 Schéma)
├─ sw.js                        (service worker : stratégies de cache)
├─ manifest.webmanifest         (manifest PWA)
├─ /images/
│   ├─ pirates-tools-logo.webp
│   ├─ pirates-tools-logo.png
│   └─ /products/               (optionnel si vous stockez localement)
│       ├─ DCF887.png
│       ├─ DCF887P2.png
│       ├─ DCF850.png
│       └─ … (une image par produit mini)
└─ /icons/
    ├─ icon-180.png             (iOS/Android “Add to Home Screen”)
    ├─ icon-192.png
    ├─ icon-256.png
    ├─ icon-384.png
    └─ icon-512.png


2) DÉPLOIEMENT (GitHub Pages)
─────────────────────────────
- Branche : main
- Settings → Pages → “Build from a branch” → main / root
- Attendre l’URL https://<user>.github.io/<repo>/
- Important : quand vous modifiez *sw.js*, incrémentez `VERSION`
  pour invalider l’ancien cache :  const VERSION = 'pt-v6' (par ex).


3) SCHEMA products.json (champ → type)
──────────────────────────────────────
Array<Produit>, avec :

id                : string  (slug lisible, ex: "dewalt-dcf887-n")
sku               : string  (référence constructeur)
title             : string
brand             : string  (ex: "DeWALT")
category          : string  (ex: "Visseuse à chocs")
platform          : string  (ex: "18V XR" / "12V Xtreme")
motor             : string  (ex: "Brushless")
tag               : string  (petit tag sur carte ; ex: "Promo" / "Brushless")
badge             : string  (label secondaire sur carte ; ex: "Pack")
new               : boolean
desc              : string  (description courte pour la carte + PDP)
tags              : string[] (mots-clés)
img               : string  (URL https absolue ou relative vers /images/products/*)
gallery           : string[] (optionnel – réservé aux futures vignettes)
image_bg          : "transparent" | "dark" | "light" (optionnel)
price             : number   (prix TTC indicatif)
price_old         : number   (ancien prix – optionnel)
currency          : "EUR"
stock_status      : "in_stock" | "low_stock" | "out_of_stock"
stock_qty         : number
torque_nm         : number
rpm               : string   (plages tr/min)
ipm               : string   (plages coups/min)
chuck             : string   (ex: '1/4" Hex')
weight_kg         : number
length_mm         : number
warranty_months   : number
specs             : string[] (points clés à puces affichés sous la description)
features          : string[] (alias de "specs", optionnel)
specs_kv          : { [label:string]: string }  (table technique, optionnel)
whatsapp_template : string   (message prêt à l’emploi)
rating            : number   (moyenne avis)
reviews           : number   (nb avis)
availability      : string[] (codes zones ex: ["GP","MQ","MF","BL"])

Notes d’affichage :
- La PDP construit automatiquement un tableau “⚙️ Caractéristiques techniques”
  à partir de `specs_kv` *puis* des champs connus (platform, motor, torque_nm, rpm,
  ipm, chuck, length_mm, weight_kg, warranty_months). Si `specs_kv` est absent,
  la table est générée depuis ces champs.
- Les “Produits liés” proviennent de la même `category` ou d’un tag/badge commun.


4) FLUX UTILISATEUR
───────────────────
- Accueil : hero animé (JS) + barre de recherche + filtre par tag → liste produits
- Carte produit : bouton “Ajouter au panier”
- PDP : visuel + titre + tag + description + (specs + tableau techniques)
        → “Ajouter au panier” + bouton WhatsApp pré-rempli
- Dock mobile (bas) :
    📞 appel / 💬 WhatsApp (envoi devis) / 🛒 ouvre #/devis / 🧰 scroll produits
- #/devis : quantités + supprimer + “Envoyer le devis via WhatsApp”
- #/catalogue : catégories auto (comptage par `category`/`badge`/`brand`)
- #/compte : profil + jauge fidélité (démo locale)
- Panier/devis persistant dans localStorage (`pt_cart_v1`).


5) PWA / CACHE (sw.js)
──────────────────────
- App shell précache : index.html, styles.css, app.js, manifest, icônes, logos
- Navigations : NetworkFirst (+ fallback index.html si offline)
- products.json : NetworkFirst (retombe sur cache hors-ligne)
- CSS/JS : Stale-While-Revalidate
- Images (même cross-origin https) : CacheFirst
- Ignorés : wa.me, analytics, extensions chrome
- Penser à incrémenter `VERSION` à chaque modification de sw.js.


6) ICONES & LOGO
────────────────
- Dossier /icons : 180 / 192 / 256 / 384 / 512 (PNG)
- Le manifest référence toutes ces tailles (maskable pour le 192+).
- Logo principal : /images/pirates-tools-logo.(webp|png)


7) AJOUTER UN PRODUIT (pas-à-pas)
─────────────────────────────────
1. Placer l’image (si locale) dans /images/products/  → ex: DCF899.png
   (ou fournir une URL https officielle/fiable ; le SW les mettra en cache).
2. Ouvrir products.json → ajouter l’objet conforme au §3.
3. Commit/Push → GitHub Pages se met à jour → rafraîchir (vider le cache si besoin).
4. Vérifier la PDP : description + puces + tableau auto + bouton WhatsApp.


8) RACCORDEMENTS IMPORTANTS
───────────────────────────
- Téléphone & WhatsApp centralisés : `PHONE_E164` et `PHONE_HUMAN` dans app.js
- Dock : boutons colorés par classes (.dock__btn--call / --wa / --cart / --tools)
- Accessibilité : contrastes, focus-visible, aria-labels sur boutons principaux
- SEO : balises OG + JSON-LD Organisation déjà présents dans index.html


9) DÉBOGAGE RAPIDE
──────────────────
- Panier ne s’affiche pas ? → ajouter un article, le dock apparaît (badge > 0)
- Fichiers offline pas à jour ? → changer `VERSION` dans sw.js puis recharger
- Image externe KO → la PDP retombe sur `images/pirates-tools-logo.png`


10) LICENCE
───────────
Projet vitrine interne Pirates Tools. Réutilisation des logos & visuels DeWALT :
droits appartenant à leurs titulaires respectifs. 
