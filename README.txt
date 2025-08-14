# Pirates Tools — Site produits (PWA)

Ce dépôt contient un site statique ultra‑léger :
- Barre de tâche FUTURISTE translucide (glassmorphism + flou)
- Logo animé (grossit en haut, se réduit au scroll)
- Menu mobile accessible (aria-expanded + clavier)
- Liste produits pilotée par JSON + filtres + pagination
- Images lazy‑load + animations IntersectionObserver
- Smooth scroll natif vers les ancres
- Préchargement léger des pages (hover) pour une nav instantanée
- PWA (Service Worker + Manifest)

## Fichiers
- index.html               → Page d’accueil (liste + filtres)
- styles.css               → Thème complet (topbar translucide)
- app.js                   → Scripts avancés (UI + rendu produits)
- produits.json            → Données produits (à éditer)
- manifeste.webmanifest    → Manifest PWA
- sw.js                    → Service Worker (cache auto)
- images/                  → Place ici tes visuels (jpg/png/svg)

## Utilisation locale
Ouvre index.html directement, ou lance un petit serveur statique :
- Python : `python -m http.server 8080`
- Node : `npx serve .`

## Déploiement GitHub Pages
1) Push sur la branche `main`.
2) Settings → Pages → **Deploy from a branch** → Branche: `main`, dossier: `/ (root)` → Save.
3) Attends l’URL Pages.

## Données
Édite `produits.json` (champ `slug`, `title`, `price`, `tags`, `image`, `excerpt`).
